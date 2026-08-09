import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import SecurityEvent, { ISecurityEvent } from "@/models/SecurityEvent";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectToDatabase();

  // Security events are scoped to the account's own email — this
  // platform doesn't have visibility into other users' auth activity,
  // by design.
  const email = session.user.email;

  const events = await SecurityEvent.find({ email })
    .sort({ createdAt: -1 })
    .limit(100)
    .lean<ISecurityEvent[]>();

  return NextResponse.json(
    events.map((e) => ({
      id: e._id.toString(),
      type: e.type,
      severity: e.severity,
      ipAddress: e.ipAddress,
      details: e.details,
      createdAt: e.createdAt,
    }))
  );
}
