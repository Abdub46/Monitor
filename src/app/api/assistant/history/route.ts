import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import ChatMessage from "@/models/ChatMessage";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectToDatabase();
  const userId = (session.user as { id: string }).id;

  const messages = await ChatMessage.find({ userId })
    .sort({ createdAt: 1 })
    .limit(50)
    .lean();

  return NextResponse.json(
    messages.map((m) => ({
      id: m._id.toString(),
      role: m.role,
      content: m.content,
      createdAt: m.createdAt,
    }))
  );
}
