import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/models/User";

const settingsSchema = z.object({
  emailEnabled: z.boolean().optional(),
  telegramEnabled: z.boolean().optional(),
  pushEnabled: z.boolean().optional(),
  telegramChatId: z.string().max(64).optional().or(z.literal("")),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectToDatabase();
  const userId = (session.user as { id: string }).id;
  const user = await User.findById(userId).select(
    "notificationPreferences telegramChatId fcmTokens"
  );

  if (!user) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    notificationPreferences: user.notificationPreferences,
    telegramChatId: user.telegramChatId ?? "",
    pushTokenCount: user.fcmTokens?.length ?? 0,
  });
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = settingsSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    await connectToDatabase();
    const userId = (session.user as { id: string }).id;
    const user = await User.findById(userId);

    if (!user) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const { emailEnabled, telegramEnabled, pushEnabled, telegramChatId } = parsed.data;

    if (emailEnabled !== undefined) user.notificationPreferences.emailEnabled = emailEnabled;
    if (telegramEnabled !== undefined) user.notificationPreferences.telegramEnabled = telegramEnabled;
    if (pushEnabled !== undefined) user.notificationPreferences.pushEnabled = pushEnabled;
    if (telegramChatId !== undefined) user.telegramChatId = telegramChatId || undefined;

    await user.save();

    return NextResponse.json({
      notificationPreferences: user.notificationPreferences,
      telegramChatId: user.telegramChatId ?? "",
    });
  } catch (err) {
    console.error("Update settings error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
