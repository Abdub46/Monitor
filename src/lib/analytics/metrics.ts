import HealthCheck from "@/models/HealthCheck";
import Incident from "@/models/Incident";
import mongoose from "mongoose";

export interface ApplicationMetrics {
  applicationId: string;
  uptimePercentDaily: number;
  uptimePercentWeekly: number;
  uptimePercentMonthly: number;
  averageResponseTimeMs: number;
  incidentCount: number;
  mttrMinutes: number | null; // Mean Time To Recovery
  mtbfHours: number | null; // Mean Time Between Failures
  mostCommonErrors: { error: string; count: number }[];
}

function uptimePercent(onlineOrSlow: number, total: number): number {
  if (total === 0) return 100; // no data yet — nothing has failed
  return Math.round((onlineOrSlow / total) * 10000) / 100;
}

async function calculateUptimeForWindow(
  applicationId: mongoose.Types.ObjectId,
  since: Date
): Promise<number> {
  const total = await HealthCheck.countDocuments({ applicationId, checkedAt: { $gte: since } });
  const up = await HealthCheck.countDocuments({
    applicationId,
    checkedAt: { $gte: since },
    status: { $in: ["online", "slow"] },
  });
  return uptimePercent(up, total);
}

/**
 * Computes the full analytics summary for one application. Windows
 * are relative to now: daily = last 24h, weekly = last 7d, monthly =
 * last 30d.
 */
export async function calculateApplicationMetrics(
  applicationId: mongoose.Types.ObjectId
): Promise<ApplicationMetrics> {
  const now = Date.now();
  const dayAgo = new Date(now - 24 * 60 * 60 * 1000);
  const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);

  const [uptimeDaily, uptimeWeekly, uptimeMonthly] = await Promise.all([
    calculateUptimeForWindow(applicationId, dayAgo),
    calculateUptimeForWindow(applicationId, weekAgo),
    calculateUptimeForWindow(applicationId, monthAgo),
  ]);

  const responseTimeAgg = await HealthCheck.aggregate([
    { $match: { applicationId, checkedAt: { $gte: monthAgo } } },
    { $group: { _id: null, avg: { $avg: "$responseTimeMs" } } },
  ]);
  const averageResponseTimeMs = Math.round(responseTimeAgg[0]?.avg ?? 0);

  const incidents = await Incident.find({
    applicationId,
    startedAt: { $gte: monthAgo },
  })
    .sort({ startedAt: 1 })
    .lean();

  const incidentCount = incidents.length;

  // MTTR: average duration of resolved incidents in this window.
  const resolvedIncidents = incidents.filter((i) => i.resolvedAt);
  const mttrMinutes =
    resolvedIncidents.length > 0
      ? Math.round(
          resolvedIncidents.reduce(
            (sum, i) => sum + (new Date(i.resolvedAt!).getTime() - new Date(i.startedAt).getTime()),
            0
          ) /
            resolvedIncidents.length /
            60000
        )
      : null;

  // MTBF: average time between the start of consecutive incidents.
  let mtbfHours: number | null = null;
  if (incidents.length >= 2) {
    let totalGapMs = 0;
    for (let i = 1; i < incidents.length; i++) {
      totalGapMs += new Date(incidents[i].startedAt).getTime() - new Date(incidents[i - 1].startedAt).getTime();
    }
    mtbfHours = Math.round((totalGapMs / (incidents.length - 1) / 3600000) * 10) / 10;
  }

  const errorAgg = await HealthCheck.aggregate([
    {
      $match: {
        applicationId,
        checkedAt: { $gte: monthAgo },
        error: { $exists: true, $ne: null },
      },
    },
    { $group: { _id: "$error", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 5 },
  ]);

  const mostCommonErrors = errorAgg.map((e) => ({ error: e._id as string, count: e.count }));

  return {
    applicationId: applicationId.toString(),
    uptimePercentDaily: uptimeDaily,
    uptimePercentWeekly: uptimeWeekly,
    uptimePercentMonthly: uptimeMonthly,
    averageResponseTimeMs,
    incidentCount,
    mttrMinutes,
    mtbfHours,
    mostCommonErrors,
  };
}
