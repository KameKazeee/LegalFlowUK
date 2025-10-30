"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function DeleteCase({ caseId }: { caseId: string }) {
  const { data: session } = useSession();
  const router = useRouter();
  const role = (session?.user as any)?.role as string | undefined;

  const onDelete = async () => {
    if (!confirm("Are you sure you want to permanently delete this case? This cannot be undone.")) return;
    try {
      const res = await fetch(`/api/cases/${caseId}`, { method: "DELETE" });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || "Delete failed");
      }
      router.push("/cases");
      router.refresh();
    } catch (e: any) {
      alert(e?.message || "Delete failed");
    }
  };

  if (role !== "ADMIN") return null;
  return (
    <button onClick={onDelete} className="text-blue-700 underline">Delete Case</button>
  );
}
