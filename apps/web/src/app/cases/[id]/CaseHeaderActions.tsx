"use client";

import { useSession, signOut } from "next-auth/react";

export default function CaseHeaderActions() {
  const { data: session } = useSession();
  const role = (session?.user as any)?.role || "";
  return (
    <div className="flex items-center space-x-4">
      <span className="text-sm text-gray-500">Role: {role}</span>
      <button
        onClick={() => {
          try { localStorage.clear(); } catch {}
          signOut({ callbackUrl: "/auth/signin" });
        }}
        className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
      >
        Sign Out
      </button>
    </div>
  );
}
