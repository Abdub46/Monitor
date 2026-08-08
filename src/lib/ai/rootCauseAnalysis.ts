import OpenAI from "openai";
import { IApplication } from "@/models/Application";
import { IHealthCheck } from "@/models/HealthCheck";
import Diagnosis, { Severity } from "@/models/Diagnosis";
import mongoose from "mongoose";

let client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!client) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("Missing OPENAI_API_KEY environment variable");
    }
    client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return client;
}

interface DiagnosisInput {
  application: IApplication;
  failedCheck: IHealthCheck;
  recentChecks: IHealthCheck[]; // most recent first, includes failedCheck
  recentIncidentCount: number; // how many incidents this app has had recently
}

interface ParsedDiagnosis {
  rootCause: string;
  confidence: number;
  severity: Severity;
  recommendedFix: string;
  repairSteps: string[];
  preventionTips: string[];
}

const SYSTEM_PROMPT = `You are an expert Site Reliability Engineer performing root cause analysis on an application outage. You will be given metrics, error messages, and recent check history for a failing application. Respond with ONLY a JSON object (no markdown fences, no preamble) matching this exact shape:

{
  "rootCause": string,          // one or two sentences, plain language
  "confidence": number,          // 0-100, how confident you are in this diagnosis given the available data
  "severity": "low" | "medium" | "high" | "critical",
  "recommendedFix": string,      // one or two sentences, the single best next action
  "repairSteps": string[],       // 3-6 concrete, ordered steps an engineer would follow
  "preventionTips": string[]     // 2-4 concrete suggestions to prevent recurrence
}

Base your diagnosis strictly on the data provided. If the data is ambiguous, say so in rootCause and lower your confidence score accordingly rather than inventing a specific cause.`;

function buildUserPrompt(input: DiagnosisInput): string {
  const { application, failedCheck, recentChecks, recentIncidentCount } = input;

  const history = recentChecks
    .slice(0, 10)
    .map(
      (c) =>
        `- ${c.checkedAt.toISOString()} | status=${c.status} | responseTime=${c.responseTimeMs}ms | httpStatus=${c.httpStatusCode ?? "none"}${c.error ? ` | error="${c.error}"` : ""}`
    )
    .join("\n");

  return `Application: ${application.name} (${application.environment})
URL: ${application.url}
Health endpoint: ${application.healthEndpoint}
Expected status code: ${application.expectedStatusCode}

Failing check:
- Time: ${failedCheck.checkedAt.toISOString()}
- Status: ${failedCheck.status}
- Response time: ${failedCheck.responseTimeMs}ms
- HTTP status returned: ${failedCheck.httpStatusCode ?? "none (request failed)"}
- Error: ${failedCheck.error ?? "none"}

Recent check history (most recent first):
${history}

This application has had ${recentIncidentCount} incident(s) in recent history (including this one).`;
}

function coerceSeverity(value: unknown): Severity {
  const allowed: Severity[] = ["low", "medium", "high", "critical"];
  return allowed.includes(value as Severity) ? (value as Severity) : "medium";
}

function parseModelResponse(raw: string): ParsedDiagnosis {
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(raw);
  } catch {
    // Model didn't return clean JSON - fall back to a conservative,
    // clearly-labeled diagnosis rather than throwing and losing the incident.
    return {
      rootCause: "AI diagnosis could not be parsed. Manual investigation required.",
      confidence: 0,
      severity: "medium",
      recommendedFix: "Review the raw error and recent check history manually.",
      repairSteps: ["Check application logs", "Verify the health endpoint responds directly"],
      preventionTips: [],
    };
  }

  return {
    rootCause: String(parsed.rootCause ?? "Unknown"),
    confidence: Math.max(0, Math.min(100, Number(parsed.confidence) || 0)),
    severity: coerceSeverity(parsed.severity),
    recommendedFix: String(parsed.recommendedFix ?? "Investigate manually."),
    repairSteps: Array.isArray(parsed.repairSteps) ? parsed.repairSteps.map(String) : [],
    preventionTips: Array.isArray(parsed.preventionTips) ? parsed.preventionTips.map(String) : [],
  };
}

/**
 * Runs AI root cause analysis for a failed health check and persists
 * the result as a Diagnosis document linked to the incident.
 */
export async function runRootCauseAnalysis(
  incidentId: mongoose.Types.ObjectId,
  input: DiagnosisInput
) {
  const openai = getClient();
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

  const completion = await openai.chat.completions.create({
    model,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: buildUserPrompt(input) },
    ],
    temperature: 0.2,
    response_format: { type: "json_object" },
  });

  const rawContent = completion.choices[0]?.message?.content ?? "{}";
  const parsed = parseModelResponse(rawContent);

  const diagnosis = await Diagnosis.create({
    incidentId,
    applicationId: input.application._id,
    rootCause: parsed.rootCause,
    confidence: parsed.confidence,
    severity: parsed.severity,
    recommendedFix: parsed.recommendedFix,
    repairSteps: parsed.repairSteps,
    preventionTips: parsed.preventionTips,
    rawModelResponse: rawContent,
  });

  return diagnosis;
}
