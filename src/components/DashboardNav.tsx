"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import SignOutButton from "@/components/SignOutButton";
import ThemeToggle from "@/components/ThemeToggle";

const LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/incidents", label: "Incidents" },
  { href: "/assistant", label: "Assistant" },
  { href: "/logs", label: "Logs" },
  { href: "/analytics", label: "Analytics" },
  { href: "/security", label: "Security" },
  { href: "/settings", label: "Settings" },
];

export default function DashboardNav({ userEmail }: { userEmail: string }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const navRef = useRef<HTMLElement>(null);

  // Close the mobile menu on a tap/click anywhere outside it, or on Escape.
  useEffect(() => {
    if (!open) return;

    function handlePointerDown(e: MouseEvent | TouchEvent) {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <header ref={navRef} className="border-b border-gray-200 dark:border-gray-800">
      <div className="px-4 sm:px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-6 min-w-0">
          <span className="font-semibold whitespace-nowrap">Monitoring Platform</span>

          {/* Desktop nav: hidden below lg, full link row above it */}
          <nav className="hidden lg:flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
            {LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-2 py-1 border-b-2 transition-colors ${
                  pathname === link.href
                    ? "border-blue-600 text-blue-600 dark:text-blue-400 font-medium"
                    : "border-transparent hover:text-gray-900 dark:hover:text-gray-100"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-3 sm:gap-4 text-sm text-gray-600 dark:text-gray-400">
          <span className="hidden sm:inline truncate max-w-[180px]">{userEmail}</span>
          <div className="hidden lg:flex items-center gap-3">
            <ThemeToggle />
            <SignOutButton />
          </div>

          {/* Hamburger: shown below lg, toggles the dropdown nav */}
          <button
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            className="lg:hidden flex items-center justify-center h-9 w-9 rounded-md border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100"
          >
            {open ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile dropdown nav */}
      {open && (
        <nav className="lg:hidden border-t border-gray-200 dark:border-gray-800 px-4 py-3 flex flex-col gap-1 text-sm">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className={`rounded-md px-3 py-2 border-l-2 ${
                pathname === link.href
                  ? "border-blue-600 bg-gray-100 dark:bg-gray-900 text-blue-600 dark:text-blue-400 font-medium"
                  : "border-transparent text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-900 hover:text-gray-900 dark:hover:text-gray-100"
              }`}
            >
              {link.label}
            </Link>
          ))}
          <div className="border-t border-gray-200 dark:border-gray-800 mt-2 pt-3 px-3 flex items-center justify-between">
            <span className="text-xs text-gray-500 truncate">{userEmail}</span>
            <div className="flex items-center gap-3">
              <ThemeToggle />
              <SignOutButton />
            </div>
          </div>
        </nav>
      )}
    </header>
  );
}