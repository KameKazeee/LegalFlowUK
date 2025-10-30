"use client";

import { useSession, signOut } from "next-auth/react";
import { redirect, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const [cases, setCases] = useState<any[]>([]);
  const [loadingCases, setLoadingCases] = useState<boolean>(false);
  const router = useRouter();

  useEffect(() => {
    if (status === "loading") return;
    if (!session) {
      redirect("/auth/signin");
    }
  }, [session, status]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoadingCases(true);
        const res = await fetch("/api/cases", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          setCases(data);
        }
      } catch {}
      finally { setLoadingCases(false); }
    };
    if (session) load();
  }, [session]);

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center gap-3">
              <Link href="/dashboard" className="inline-block">
                <img src="/LFUlogo.png" alt="Legal Flow UK" className="h-8 w-auto" />
              </Link>
              <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-gray-600">Welcome back, {session.user?.name || session.user?.email}</p>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-500">
                Role: {(session.user as any)?.role || "STAFF"}
              </span>
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
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">My Cases</h3>
              <div className="space-y-3">
                {loadingCases && (
                  <div className="text-sm text-gray-500">Loading cases…</div>
                )}
                {!loadingCases && cases.length === 0 && (
                  <div className="text-sm text-gray-500">No cases found.</div>
                )}
                {!loadingCases && cases.map((c) => {
                  const caseNo = c.dsccRef || `CASE-${String(c.id).slice(0,8)}`;
                  const clientName = c.client ? `${c.client.firstName ?? ""} ${c.client.lastName ?? ""}`.trim() : "Unknown client";
                  const station = c.station || "Unknown station";
                  const status = String(c.status || "");
                  const badge = (() => {
                    switch (status) {
                      case "ASSIGNED": return { bg: "bg-blue-100", fg: "text-blue-800", label: "Assigned" };
                      case "ATTENDED": return { bg: "bg-green-100", fg: "text-green-800", label: "Attended" };
                      case "REVIEW": return { bg: "bg-yellow-100", fg: "text-yellow-800", label: "Review" };
                      case "READY_FOR_BILLING": return { bg: "bg-purple-100", fg: "text-purple-800", label: "Ready" };
                      case "INVOICE_APPROVED": return { bg: "bg-emerald-100", fg: "text-emerald-800", label: "Approved" };
                      case "CLOSED": return { bg: "bg-gray-200", fg: "text-gray-800", label: "Closed" };
                      case "NEW":
                      default: return { bg: "bg-gray-100", fg: "text-gray-800", label: "New" };
                    }
                  })();
                  return (
                    <a key={c.id} href={`/cases/${c.id}`} className="flex items-center justify-between p-3 bg-gray-50 rounded-md hover:bg-gray-100 transition">
                      <div>
                        <p className="text-sm font-medium text-gray-900">Case #{caseNo}{clientName ? ` — ${clientName}` : ""}</p>
                        <p className="text-sm text-gray-500">{station}</p>
                      </div>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badge.bg} ${badge.fg}`}>
                        {badge.label}
                      </span>
                    </a>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Quick Actions</h3>
              <div className="space-y-3">
                {(session && (session.user as any)?.role === 'ADMIN') && (
                  <button onClick={() => router.push('/cases/new')} className="w-full flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Create New Case
                  </button>
                )}
                <button className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  Generate Invoice
                </button>
                {(session && (session.user as any)?.role === 'ADMIN') && (
                  <button className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    Manage Freelancers
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


