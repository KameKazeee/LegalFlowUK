"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function AssignPage({ params }: { params: { id: string } }) {
  const caseId = params.id;
  const router = useRouter();
  const [reps, setReps] = useState<Array<{ id: string; name: string | null; email: string; role: string }>>([]);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [acceptUrl, setAcceptUrl] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/reps', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          setReps(data);
        }
      } catch {}
    };
    load();
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setAcceptUrl(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/cases/${caseId}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Assign failed");
      // Navigate back to cases after successful assignment and force refresh
      router.push('/cases');
      router.refresh();
    } catch (e: any) {
      setError(e?.message ?? "Assign error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center gap-3">
              <Link href="/dashboard" className="inline-block">
                <img src="/LFUlogo.png" alt="Legal Flow UK" className="h-8 w-auto" />
              </Link>
              <h1 className="text-2xl font-semibold text-gray-900">Assign Case</h1>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/dashboard" className="text-blue-700 underline">Back to dashboard</Link>
              <Link href="/cases" className="text-blue-700 underline">Back to cases</Link>
              <button
                onClick={() => { try { localStorage.clear(); } catch {}; signOut({ callbackUrl: "/auth/signin" }); }}
                className="bg-blue-600 text-white px-3 py-2 rounded-md hover:bg-blue-700"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto p-6 space-y-4">
      <form onSubmit={onSubmit} className="space-y-3">
        <label className="block text-sm text-gray-700">Select Court Rep (Fee Earner)</label>
        <select className="w-full border rounded px-3 py-2" value={email} onChange={(e)=>setEmail(e.target.value)} required>
          <option value="" disabled>Select a rep…</option>
          {reps.map(r => (
            <option key={r.id} value={r.email}>{r.name || r.email} ({r.role})</option>
          ))}
        </select>
        <button className="rounded bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 disabled:opacity-50" disabled={loading}>
          {loading ? "Assigning..." : "Assign"}
        </button>
      </form>
      {error && <p className="text-red-600 text-sm">{error}</p>}
      {/* accept link display removed */}
      </div>
    </main>
  );
}
