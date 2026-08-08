import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import Application from "@/models/Application";
import HealthCheck from "@/models/HealthCheck";

const applicationSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  url: z.string().url(),
  healthEndpoint: z.string().url(),
  apiBaseUrl: z.string().url().optional().or(z.literal("")),
  expectedStatusCode: z.number().int().min(100).max(599).default(200),
  monitoringIntervalSeconds: z.number().int().min(30).max(86400).default(60),
  environment: z.enum(["production", "staging", "development"]).default("production"),
  tags: z.array(z.string()).default([]),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectToDatabase();

  const userId = (session.user as { id: string }).id;
  const applications = await Application.find({ userId }).sort({ createdAt: -1 }).lean();

  // Attach the latest health check for each application so the
  // dashboard can render status without a second round trip per card.
  const withStatus = await Promise.all(
    applications.map(async (app) => {
      const latest = await HealthCheck.findOne({ applicationId: app._id })
        .sort({ checkedAt: -1 })
        .lean();

      return {
        id: app._id.toString(),
        name: app.name,
        description: app.description,
        url: app.url,
        healthEndpoint: app.healthEndpoint,
        apiBaseUrl: app.apiBaseUrl,
        expectedStatusCode: app.expectedStatusCode,
        monitoringIntervalSeconds: app.monitoringIntervalSeconds,
        environment: app.environment,
        tags: app.tags,
        isActive: app.isActive,
        latestStatus: latest?.status ?? null,
        latestResponseTimeMs: latest?.responseTimeMs ?? null,
        lastCheckedAt: latest?.checkedAt ?? null,
      };
    })
  );

  return NextResponse.json(withStatus);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = applicationSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const userId = (session.user as { id: string }).id;
    const app = await Application.create({
      ...parsed.data,
      userId,
    });

    return NextResponse.json(app, { status: 201 });
  } catch (err) {
    console.error("Create application error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
