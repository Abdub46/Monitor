import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Application, { IApplication } from "@/models/Application";
import HealthCheck from "@/models/HealthCheck";
import { checkApplicationAndRecord } from "@/lib/monitoring/healthCheck";

// Each app check can take up to ~27s in the worst case (3 attempts x
// 8s timeout + retry delays) if it's genuinely unreachable. This
// raises the allowed function duration so retries aren't cut off
// mid-check. Vercel Hobby plans cap at 10s regardless of this value —
// retries are still an improvement there (each individual attempt is
// well under 10s), but the full 3-attempt sequence for a truly-down
// app may not complete before the platform kills the function. Pro
// plans and above respect this value up to their plan's ceiling.
export const maxDuration = 30;

/**
 * Triggered on whatever cadence you've wired up (see vercel.json and
 * the README's cron section — Vercel Hobby's built-in cron can't go
 * more often than once a day, so most setups will want an external
 * scheduler hitting this route every few minutes instead).
 *
 * This route can safely be invoked far more often than any single
 * app's configured interval: each application is only actually
 * re-checked once monitoringIntervalSeconds has genuinely elapsed
 * since its last recorded check. That's what makes a 3600s interval
 * meaningful even if the trigger itself fires every 5 minutes.
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectToDatabase();

  const activeApps = await Application.find({ isActive: true }).lean<IApplication[]>();

  // For each active app, find out when it was last checked so we can
  // skip anything whose interval hasn't elapsed yet.
  const dueApps: IApplication[] = [];
  const now = Date.now();

  await Promise.all(
    activeApps.map(async (app) => {
      const lastCheck = await HealthCheck.findOne({ applicationId: app._id })
        .sort({ checkedAt: -1 })
        .select("checkedAt")
        .lean<{ checkedAt: Date }>();

      const dueAt = lastCheck
        ? new Date(lastCheck.checkedAt).getTime() + app.monitoringIntervalSeconds * 1000
        : 0; // never checked before — always due immediately

      if (now >= dueAt) {
        dueApps.push(app);
      }
    })
  );

  const results = await Promise.allSettled(
    dueApps.map((app) => checkApplicationAndRecord(app))
  );

  const summary = results.map((r, i) => ({
    applicationId: dueApps[i]._id.toString(),
    name: dueApps[i].name,
    success: r.status === "fulfilled",
    result: r.status === "fulfilled" ? r.value : (r.reason as Error).message,
  }));

  return NextResponse.json({
    triggered: activeApps.length,
    checked: summary.length,
    skipped: activeApps.length - summary.length,
    summary,
  });
}