import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import Application from "@/models/Application";
import HealthCheck from "@/models/HealthCheck";

function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "timestamp,application,status,responseTimeMs,httpStatusCode,error\n";
  const header = Object.keys(rows[0]).join(",");
  const lines = rows.map((row) =>
    Object.values(row)
      .map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`)
      .join(",")
  );
  return [header, ...lines].join("\n");
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectToDatabase();
  const userId = (session.user as { id: string }).id;

  const params = req.nextUrl.searchParams;
  const applicationIdFilter = params.get("applicationId");
  const statusFilter = params.get("status"); // online | slow | offline
  const search = params.get("search"); // free-text match against error message
  const format = params.get("format"); // "csv" to download

  const userApplications = await Application.find({ userId }).select("name").lean();
  const appMap = new Map(userApplications.map((a) => [a._id.toString(), a.name]));
  let applicationIds = Array.from(appMap.keys());

  if (applicationIdFilter) {
    if (!appMap.has(applicationIdFilter)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    applicationIds = [applicationIdFilter];
  }

  const query: Record<string, unknown> = { applicationId: { $in: applicationIds } };
  if (statusFilter && ["online", "slow", "offline"].includes(statusFilter)) {
    query.status = statusFilter;
  }
  if (search) {
    query.error = { $regex: search, $options: "i" };
  }

  const logs = await HealthCheck.find(query)
    .sort({ checkedAt: -1 })
    .limit(500)
    .lean();

  const rows = logs.map((log) => ({
    timestamp: log.checkedAt.toISOString(),
    application: appMap.get(log.applicationId.toString()) ?? "Unknown",
    status: log.status,
    responseTimeMs: log.responseTimeMs,
    httpStatusCode: log.httpStatusCode ?? "",
    error: log.error ?? "",
  }));

  if (format === "csv") {
    return new NextResponse(toCsv(rows), {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="logs-${Date.now()}.csv"`,
      },
    });
  }

  return NextResponse.json(rows);
}
