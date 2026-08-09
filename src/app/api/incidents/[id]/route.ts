import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import mongoose from "mongoose";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import Application, { IApplication } from "@/models/Application";
import Incident, { IIncident } from "@/models/Incident";
import Diagnosis from "@/models/Diagnosis";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!mongoose.Types.ObjectId.isValid(params.id)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await connectToDatabase();
  const userId = (session.user as { id: string }).id;

  const incident = await Incident.findById(params.id).lean<IIncident>();
  if (!incident) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Ownership check: the incident's application must belong to this user.
  const app = await Application.findOne({
  _id: incident.applicationId,
  userId,
}).lean<IApplication>();
  if (!app) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

 const diagnosis = incident.diagnosisId
  ? await Diagnosis.findById(incident.diagnosisId.toString()).lean()
  : null;

  return NextResponse.json({
    id: incident._id.toString(),
    applicationId: incident.applicationId.toString(),
    applicationName: app.name,
    startedAt: incident.startedAt,
    resolvedAt: incident.resolvedAt,
    status: incident.status,
    reason: incident.reason,
    diagnosis,
  });
}
