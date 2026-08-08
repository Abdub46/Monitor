import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/models/User";
import { recordFailedLogin, isLoginLocked } from "@/lib/security/loginGuard";

function extractIp(req: { headers?: Record<string, unknown> } | undefined): string {
  const forwarded = req?.headers?.["x-forwarded-for"];
  if (typeof forwarded === "string") return forwarded.split(",")[0].trim();
  return "unknown";
}

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password are required");
        }

        const email = credentials.email.toLowerCase();
        const ipAddress = extractIp(req);

        await connectToDatabase();

        // Check lockout before touching the password at all, so a
        // lucky guess during an active brute-force window still fails.
        if (await isLoginLocked(email)) {
          throw new Error("Too many failed attempts. Try again in a few minutes.");
        }

        const user = await User.findOne({ email });
        if (!user) {
          // Deliberately vague — don't reveal whether the email exists.
          await recordFailedLogin(email, ipAddress);
          throw new Error("Invalid email or password");
        }

        const isValid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!isValid) {
          await recordFailedLogin(email, ipAddress);
          throw new Error("Invalid email or password");
        }

        return {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id?: string }).id = token.id as string;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
