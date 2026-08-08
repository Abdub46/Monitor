"use client";

import { signOut } from "next-auth/react";

export default function SignOutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="text-gray-400 hover:text-gray-100"
    >
      Sign out
    </button>
  );
}
