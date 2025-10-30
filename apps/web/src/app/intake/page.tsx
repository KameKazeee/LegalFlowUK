"use client";

import { useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";

type Parsed = {
  dsccReceivedAt: string | null;
  dsccDeployedAt: string | null;
  clientName: string | null;
  locationText: string | null;
  dsccRef: string | null;
};

export default function IntakePage() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [parsed, setParsed] = useState<Parsed | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const fmt = new Intl.DateTimeFormat('en-GB', { dateStyle: 'short', timeStyle: 'medium', hour12: false });

  const parse = async () => {
    setError(null);
    setParsed(null);
    try {
      const res = await fetch("/api/intake/parse-dscc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Parse failed");
      // Convert Date objects from server to ISO strings for display
      const mapped: Parsed = {
        dsccReceivedAt: data.dsccReceivedAt ? new Date(data.dsccReceivedAt).toISOString() : null,
        dsccDeployedAt: data.dsccDeployedAt ? new Date(data.dsccDeployedAt).toISOString() : null,
        clientName: data.clientName ?? null,
        locationText: data.locationText ?? null,
        dsccRef: data.dsccRef ?? null,
      };
      setParsed(mapped);
    } catch (e: any) {
      setError(e?.message ?? "Parse error");
    }
  };

  const createCase = async () => {
    if (!parsed) return;
    setError(null);
    setCreating(true);
    try {
      // naive split of client name into first/last for MVP
      const [first, ...rest] = (parsed.clientName || "").split(" ");
      const last = rest.join(" ") || null;
      const station = parsed.locationText || null;

      const res = await fetch("/api/cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dsccRef: parsed.dsccRef,
          station,
          dsccReceivedAt: parsed.dsccReceivedAt,
          dsccDeployedAt: parsed.dsccDeployedAt,
          clientFirstName: first || null,
          clientLastName: last,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Create failed");
      setCreatedId(data.id);
      router.push('/cases');
    } catch (e: any) {
      setError(e?.message ?? "Create error");
    } finally {
      setCreating(false);
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
              <h1 className="text-2xl font-semibold text-gray-900">DSCC Intake</h1>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/dashboard" className="text-blue-700 underline">Back to dashboard</Link>
              <Link href="/cases" className="text-blue-700 underline">Cases</Link>
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

      <div className="max-w-2xl mx-auto p-6 space-y-4">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Paste DSCC SMS here"
        rows={6}
        className="w-full border rounded p-2"
      />
      <div className="flex gap-2">
        <button onClick={parse} className="rounded bg-black text-white px-4 py-2">Parse</button>
        <a href="/login" className="rounded border px-4 py-2">Login</a>
      </div>
      {error && <p className="text-red-600 text-sm">{error}</p>}
      {parsed && (
        <div className="border rounded p-3 space-y-1">
          <div className="font-medium">Preview</div>
          <div><span className="text-gray-500">Ref:</span> {parsed.dsccRef || "-"}</div>
          <div><span className="text-gray-500">Client:</span> {parsed.clientName || "-"}</div>
          <div><span className="text-gray-500">Location:</span> {parsed.locationText || "-"}</div>
          <div><span className="text-gray-500">Received:</span> {parsed.dsccReceivedAt ? fmt.format(new Date(parsed.dsccReceivedAt)) : "-"}</div>
          <div><span className="text-gray-500">Deployed:</span> {parsed.dsccDeployedAt ? fmt.format(new Date(parsed.dsccDeployedAt)) : "-"}</div>
          <button onClick={createCase} disabled={creating} className="mt-2 rounded bg-blue-600 text-white px-4 py-2 disabled:opacity-50">
            {creating ? "Creating..." : "Create Case"}
          </button>
          {createdId && (
            <div className="text-green-700 text-sm mt-2">Created case ID: {createdId}</div>
          )}
        </div>
      )}
      </div>
    </main>
  );
}
