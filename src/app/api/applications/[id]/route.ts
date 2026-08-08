import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import mongoose from "mongoose";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import Application from "@/models/Application";

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  url: z.string().url().optional(),
  healthEndpoint: z.string().url().optional(),
  apiBaseUrl: z.string().url().optional().or(z.literal("")),
  expectedStatusCode: z.number().int().min(100).max(599).optional(),
  monitoringIntervalSeconds: z.number().int().min(30).max(86400).optional(),
  environment: z.enum(["production", "staging", "development"]).optional(),
  tags: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
});

async function getOwnedApplication(id: string, userId: string) {
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  // Scope every lookup by userId — never trust a client-supplied id alone.
  return Application.findOne({ _id: id, userId });
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectToDatabase();
  const userId = (session.user as { id: string }).id;
  const app = await getOwnedApplication(params.id, userId);

  if (!app) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(app);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = updateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    await connectToDatabase();
    const userId = (session.user as { id: string }).id;
    const app = await getOwnedApplication(params.id, userId);

    if (!app) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    Object.assign(app, parsed.data);
    await app.save();

    return NextResponse.json(app);
  } catch (err) {
    console.error("Update application error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectToDatabase();
  const userId = (session.user as { id: string }).id;
  const app = await getOwnedApplication(params.id, userId);

  if (!app) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await app.deleteOne();

  return NextResponse.json({ success: true });
}
