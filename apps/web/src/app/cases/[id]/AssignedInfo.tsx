"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function AssignedInfo({ caseId, assignedName }: { caseId: string; assignedName: string | null }) {
  const { data: session } = useSession();
  const router = useRouter();
  const role = (session?.user as any)?.role as string | undefined;

  const unassign = async () => {
    try {
      const res = await fetch(`/api/cases/${caseId}/unassign`, { method: "POST" });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || "Unassign failed");
      }
      router.refresh();
    } catch (e) {
      console.error(e);
      alert((e as any)?.message || "Unassign failed");
    }
  };

  if (assignedName) {
    return (
      <div>
        Assigned: {assignedName}
        {role === "ADMIN" && (
          <button onClick={unassign} className="ml-2 text-blue-700 underline">Unassign</button>
        )}
      </div>
    );
  }
  return (
    <div>
      Assigned: -
      {role === "ADMIN" && (
        <Link href={`/cases/${caseId}/assign`} className="ml-2 text-blue-700 underline">Assign Case</Link>
      )}
    </div>
  );
}
