import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/models/User";

const subscribeSchema = z.object({
  token: z.string().min(10),
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = subscribeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    await connectToDatabase();
    const userId = (session.user as { id: string }).id;

    // $addToSet avoids storing duplicate tokens if the same
    // browser/device registers more than once.
    await User.updateOne(
      { _id: userId },
      { $addToSet: { fcmTokens: parsed.data.token } }
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Push subscribe error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
