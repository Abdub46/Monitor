import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import SignOutButton from "@/components/SignOutButton";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <span className="font-semibold">Monitoring Platform</span>
          <nav className="flex items-center gap-4 text-sm text-gray-400">
            <Link href="/dashboard" className="hover:text-gray-100">Dashboard</Link>
            <Link href="/incidents" className="hover:text-gray-100">Incidents</Link>
            <Link href="/assistant" className="hover:text-gray-100">Assistant</Link>
            <Link href="/logs" className="hover:text-gray-100">Logs</Link>
            <Link href="/analytics" className="hover:text-gray-100">Analytics</Link>
            <Link href="/security" className="hover:text-gray-100">Security</Link>
            <Link href="/settings" className="hover:text-gray-100">Settings</Link>
          </nav>
        </div>
        <div className="flex items-center gap-4 text-sm text-gray-400">
          <span>{session.user.email}</span>
          <SignOutButton />
        </div>
      </header>
      <main className="p-6">{children}</main>
    </div>
  );
}
