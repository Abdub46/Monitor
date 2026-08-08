import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import Application from "@/models/Application";
import Incident from "@/models/Incident";
import Diagnosis from "@/models/Diagnosis";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectToDatabase();
  const userId = (session.user as { id: string }).id;

  // Scope to the user's own applications only.
  const applicationIds = await Application.find({ userId }).distinct("_id");

  const applicationIdFilter = req.nextUrl.searchParams.get("applicationId");
  const query: Record<string, unknown> = { applicationId: { $in: applicationIds } };
  if (applicationIdFilter) {
    if (!applicationIds.some((id) => id.toString() === applicationIdFilter)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    query.applicationId = applicationIdFilter;
  }

  const incidents = await Incident.find(query).sort({ startedAt: -1 }).limit(100).lean();

  const applications = await Application.find({ _id: { $in: applicationIds } })
    .select("name environment")
    .lean();
  const appMap = new Map(applications.map((a) => [a._id.toString(), a]));

  const diagnosisIds = incidents.map((i) => i.diagnosisId).filter(Boolean);
  const diagnoses = await Diagnosis.find({ _id: { $in: diagnosisIds } }).lean();
  const diagnosisMap = new Map(diagnoses.map((d) => [d._id.toString(), d]));

  const result = incidents.map((incident) => ({
    id: incident._id.toString(),
    applicationId: incident.applicationId.toString(),
    applicationName: appMap.get(incident.applicationId.toString())?.name ?? "Unknown",
    startedAt: incident.startedAt,
    resolvedAt: incident.resolvedAt,
    status: incident.status,
    reason: incident.reason,
    diagnosis: incident.diagnosisId
      ? diagnosisMap.get(incident.diagnosisId.toString()) ?? null
      : null,
  }));

  return NextResponse.json(result);
}
