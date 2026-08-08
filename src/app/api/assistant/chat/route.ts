import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import ChatMessage from "@/models/ChatMessage";
import { answerAssistantQuestion } from "@/lib/ai/assistant";
import { checkRateLimit } from "@/lib/security/rateLimiter";

const chatSchema = z.object({
  message: z.string().min(1).max(2000),
});

const MAX_MESSAGES_PER_WINDOW = 20;
const WINDOW_MS = 5 * 60 * 1000; // 5 minutes — chat calls OpenAI, so this is cost protection as much as abuse protection

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;

  const { allowed } = checkRateLimit(`assistant:${userId}`, MAX_MESSAGES_PER_WINDOW, WINDOW_MS);
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many messages. Please wait a few minutes." },
      { status: 429 }
    );
  }

  try {
    const body = await req.json();
    const parsed = chatSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    await connectToDatabase();

    const priorMessages = await ChatMessage.find({ userId })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();
    const history = priorMessages
      .reverse()
      .map((m) => ({ role: m.role, content: m.content }));

    const answer = await answerAssistantQuestion(userId, parsed.data.message, history);

    await ChatMessage.create({ userId, role: "user", content: parsed.data.message });
    const assistantMessage = await ChatMessage.create({
      userId,
      role: "assistant",
      content: answer,
    });

    return NextResponse.json({
      id: assistantMessage._id.toString(),
      content: answer,
      createdAt: assistantMessage.createdAt,
    });
  } catch (err) {
    console.error("Assistant chat error:", err);
    const message =
      err instanceof Error && err.message.includes("OPENAI_API_KEY")
        ? "AI assistant isn't configured yet — add OPENAI_API_KEY to enable it."
        : "Something went wrong generating a response.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
