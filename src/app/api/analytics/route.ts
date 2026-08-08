import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import Application from "@/models/Application";
import { calculateApplicationMetrics } from "@/lib/analytics/metrics";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectToDatabase();
  const userId = (session.user as { id: string }).id;

  const applications = await Application.find({ userId }).lean();

  const metrics = await Promise.all(
    applications.map(async (app) => ({
      applicationName: app.name,
      ...(await calculateApplicationMetrics(app._id)),
    }))
  );

  return NextResponse.json(metrics);
}
