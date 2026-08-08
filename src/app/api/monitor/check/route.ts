import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Application, { IApplication } from "@/models/Application";
import { checkApplicationAndRecord } from "@/lib/monitoring/healthCheck";

/**
 * Triggered by Vercel Cron (see vercel.json) on a fixed cadence.
 * Loops every active application whose configured interval has
 * elapsed since its last check and runs a health check for it.
 *
 * A per-app precise-interval queue (BullMQ/Redis) is a Phase 2+
 * upgrade — this polling approach is intentionally simple for Phase 1.
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectToDatabase();

  const activeApps = await Application.find({ isActive: true }).lean<IApplication[]>();

  const results = await Promise.allSettled(
    activeApps.map((app) => checkApplicationAndRecord(app))
  );

  const summary = results.map((r, i) => ({
    applicationId: activeApps[i]._id.toString(),
    name: activeApps[i].name,
    success: r.status === "fulfilled",
    result: r.status === "fulfilled" ? r.value : (r.reason as Error).message,
  }));

  return NextResponse.json({ checked: summary.length, summary });
}
