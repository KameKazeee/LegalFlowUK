"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { signOut } from "next-auth/react";

export default function NewCasePage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [dsccRef, setDsccRef] = useState("");
  const [clientFirstName, setClientFirstName] = useState("");
  const [clientLastName, setClientLastName] = useState("");
  const [station, setStation] = useState("");
  const [dsccReceivedAt, setReceived] = useState("");
  const [dsccDeployedAt, setDeployed] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [rawText, setRawText] = useState("");
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'loading') return;
    const role = (session?.user as any)?.role;
    if (!session || role !== 'ADMIN') {
      router.replace('/dashboard');
    }
  }, [session, status, router]);

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center gap-3">
              <Link href="/dashboard" className="inline-block">
                <img src="/LFUlogo.png" alt="Legal Flow UK" className="h-8 w-auto" />
              </Link>
              <div>
                <h1 className="text-2xl font-semibold text-gray-900">Create New Case</h1>
                <p className="text-sm text-gray-600 mt-1">Paste DSCC text to auto-fill or type fields manually.</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/dashboard" className="text-blue-700 underline">Dashboard</Link>
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

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-6">
          <label className="text-sm block">
            <div className="font-medium">DSCC Text</div>
            <textarea className="mt-1 w-full border rounded px-2 py-2" rows={5} value={rawText} onChange={(e)=>setRawText(e.target.value)} placeholder="Paste the raw DSCC SMS text here" />
          </label>
          <div className="mt-2 flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={async ()=>{
                setError(null);
                if (!rawText.trim()) return;
                setParsing(true);
                try {
                  const res = await fetch('/api/intake/parse-dscc', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: rawText }) });
                  const j = await res.json();
                  if (!res.ok) throw new Error(j?.error || 'Failed to parse');
                  const p = j as any;
                  if (p.clientName) {
                    const parts = String(p.clientName).trim().split(/\s+/);
                    setClientFirstName(parts[0] || '');
                    setClientLastName(parts.slice(1).join(' ') || '');
                  }
                  if (p.dsccRef) setDsccRef(p.dsccRef);
                  if (p.locationText) setStation(p.locationText);
                  if (p.dsccReceivedAt) setReceived(p.dsccReceivedAt.slice(0,16));
                  if (p.dsccDeployedAt) setDeployed(p.dsccDeployedAt.slice(0,16));
                } catch (e: any) {
                  setError(e?.message || 'Parse failed');
                } finally {
                  setParsing(false);
                }
              }}
              className="px-3 py-1.5 rounded bg-blue-600 text-white disabled:opacity-60"
              disabled={parsing}
            >
              {parsing ? 'Parsing…' : 'Parse DSCC Text'}
            </button>
            {error && <span className="text-sm text-red-600">{error}</span>}
          </div>
          <div className="mt-3 text-sm text-gray-600">
            <div className="font-medium">Example DSCC Text:</div>
            <div>DSCC case 03/05/2025 11:34.00. Name: JESSICA DEAN. Location: KIDDERMINSTER Ref No: 250568983A. Deployed: 03/05/2025 11:39.00</div>
          </div>
        </div>
        <form className="space-y-4" onSubmit={async (e) => {
          e.preventDefault();
          setSubmitting(true);
          const res = await fetch("/api/cases", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              dsccRef: dsccRef || null,
              station: station || null,
              dsccReceivedAt: dsccReceivedAt || null,
              dsccDeployedAt: dsccDeployedAt || null,
              clientFirstName: clientFirstName || null,
              clientLastName: clientLastName || null,
            }),
          });
          const json = await res.json();
          setSubmitting(false);
          if (res.ok) {
            router.push(`/cases/${json.id}`);
          } else {
            alert(json.error || "Failed to create case");
          }
        }}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="text-sm">
              <div className="font-medium">DSCC Reference</div>
              <input className="border rounded w-full px-2 py-1" value={dsccRef} onChange={(e)=>setDsccRef(e.target.value)} placeholder="250568983A" />
            </label>
            <div />
            <label className="text-sm">
              <div className="font-medium">Client First Name</div>
              <input className="border rounded w-full px-2 py-1" value={clientFirstName} onChange={(e)=>setClientFirstName(e.target.value)} placeholder="JESSICA" />
            </label>
            <label className="text-sm">
              <div className="font-medium">Client Last Name</div>
              <input className="border rounded w-full px-2 py-1" value={clientLastName} onChange={(e)=>setClientLastName(e.target.value)} placeholder="DEAN" />
            </label>
            <label className="text-sm md:col-span-2">
              <div className="font-medium">Station</div>
              <input className="border rounded w-full px-2 py-1" value={station} onChange={(e)=>setStation(e.target.value)} placeholder="KIDDERMINSTER" />
            </label>
            {/* Area removed */}
            <label className="text-sm">
              <div className="font-medium">DSCC Received At</div>
              <input type="datetime-local" className="border rounded w-full px-2 py-1" value={dsccReceivedAt} onChange={(e)=>setReceived(e.target.value)} />
            </label>
            <label className="text-sm">
              <div className="font-medium">DSCC Deployed At</div>
              <input type="datetime-local" className="border rounded w-full px-2 py-1" value={dsccDeployedAt} onChange={(e)=>setDeployed(e.target.value)} />
            </label>
          </div>
          <div className="pt-4 flex justify-center">
            <button type="submit" disabled={submitting} className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-60">
              {submitting ? "Creating..." : "Create Case"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
