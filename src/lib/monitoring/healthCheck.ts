import mongoose from "mongoose";
import { IApplication } from "@/models/Application";
import HealthCheck, { CheckStatus, IHealthCheck } from "@/models/HealthCheck";
import Incident from "@/models/Incident";
import User from "@/models/User";
import { runRootCauseAnalysis } from "@/lib/ai/rootCauseAnalysis";
import { dispatchIncidentNotifications } from "@/lib/notifications/dispatch";

const SLOW_THRESHOLD_MS = 2000;
const TIMEOUT_MS = 10000;

interface CheckResult {
  status: CheckStatus;
  responseTimeMs: number;
  httpStatusCode: number | null;
  error?: string;
}

/**
 * Performs a single HTTP health check against an application's health
 * endpoint, classifying the result as online / slow / offline.
 */
export async function performHealthCheck(app: IApplication): Promise<CheckResult> {
  const target = app.healthEndpoint || app.url;
  const startedAt = Date.now();

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(target, {
      method: "GET",
      signal: controller.signal,
      redirect: "follow",
    });

    const responseTimeMs = Date.now() - startedAt;
    const statusMatches = response.status === app.expectedStatusCode;

    if (!statusMatches) {
      return {
        status: "offline",
        responseTimeMs,
        httpStatusCode: response.status,
        error: `Expected status ${app.expectedStatusCode}, got ${response.status}`,
      };
    }

    return {
      status: responseTimeMs > SLOW_THRESHOLD_MS ? "slow" : "online",
      responseTimeMs,
      httpStatusCode: response.status,
    };
  } catch (err) {
    const responseTimeMs = Date.now() - startedAt;
    const message = err instanceof Error ? err.message : "Unknown error";
    return {
      status: "offline",
      responseTimeMs,
      httpStatusCode: null,
      error: message,
    };
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Runs a health check for one application, persists the result, and
 * opens/resolves incidents as needed. This is the single entry point
 * the cron route calls per application.
 */
export async function checkApplicationAndRecord(app: IApplication) {
  const result = await performHealthCheck(app);

  await HealthCheck.create({
    applicationId: app._id,
    status: result.status,
    responseTimeMs: result.responseTimeMs,
    httpStatusCode: result.httpStatusCode,
    checkedAt: new Date(),
    error: result.error,
  });

  const existingOpenIncident = await Incident.findOne({
    applicationId: app._id,
    status: "open",
  });

  if (result.status === "offline") {
    // Avoid duplicate alerts: only open a new incident if one isn't
    // already open for this application.
    if (!existingOpenIncident) {
      const incident = await Incident.create({
        applicationId: app._id,
        startedAt: new Date(),
        status: "open",
        reason: result.error ?? "Health check failed",
      });

      // Diagnosis + notifications run best-effort: a failure here
      // (e.g. missing API key, SMTP down) must never prevent the
      // health check itself from completing and being recorded.
      await runDiagnosisAndNotify(app, incident._id).catch((err) => {
        console.error(`Diagnosis/notification pipeline failed for ${app.name}:`, err);
      });
    }
  } else if (existingOpenIncident) {
    // Recovered — close out the open incident.
    existingOpenIncident.status = "resolved";
    existingOpenIncident.resolvedAt = new Date();
    await existingOpenIncident.save();
  }

  return result;
}

/**
 * Gathers context for the failing application, runs AI root cause
 * analysis, links the diagnosis to the incident, and notifies the
 * owning user on their enabled channels.
 */
async function runDiagnosisAndNotify(
  app: IApplication,
  incidentId: mongoose.Types.ObjectId
) {
  const recentChecks = await HealthCheck.find({ applicationId: app._id })
    .sort({ checkedAt: -1 })
    .limit(10)
    .lean<IHealthCheck[]>();

  const recentIncidentCount = await Incident.countDocuments({
    applicationId: app._id,
    startedAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
  });

  const failedCheck = recentChecks[0];
  if (!failedCheck) return;

  const diagnosis = await runRootCauseAnalysis(incidentId, {
    application: app,
    failedCheck,
    recentChecks,
    recentIncidentCount,
  });

  await Incident.findByIdAndUpdate(incidentId, { diagnosisId: diagnosis._id });

  const user = await User.findById(app.userId);
  if (!user) return;

  await dispatchIncidentNotifications(user, app, diagnosis);

  await Incident.findByIdAndUpdate(incidentId, { notifiedAt: new Date() });
}
