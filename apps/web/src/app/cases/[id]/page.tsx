import { prisma } from '@legalflow/db';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { StatusBadge } from '../../../components/StatusBadge';
import CaseTabs from './CaseTabs';
import CaseHeaderActions from './CaseHeaderActions';
import AssignedInfo from './AssignedInfo';
import DeleteCase from './DeleteCase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function CaseDetailPage({ params }: { params: { id: string } }) {
  const id = params.id;

  const c = await (prisma as any).case.findUnique({
    where: { id },
    include: {
      client: true,
      assignedTo: true,
      Attendances: { orderBy: { createdAt: 'asc' }, include: { rep: true, AppropriateAdults: true, InterpreterUses: true, Disclosures: true, Advices: true, Interviews: true, TimeEntries: true, Outcomes: true } },
      Documents: { orderBy: { createdAt: 'asc' } },
      Invoices: { orderBy: { createdAt: 'asc' } },
      Offences: { include: { offence: true } },
    },
  }) as any;

  if (!c) return notFound();

  // Serialize to client-safe structure for CaseTabs
  const data = {
    ...c,
    createdAt: c.createdAt.toISOString(),
    dsccReceivedAt: c.dsccReceivedAt ? c.dsccReceivedAt.toISOString() : null,
    dsccDeployedAt: c.dsccDeployedAt ? c.dsccDeployedAt.toISOString() : null,
    Attendances: (c.Attendances || []).map((a: any) => ({
      ...a,
      arrivalAt: a.arrivalAt ? a.arrivalAt.toISOString() : null,
      departAt: a.departAt ? a.departAt.toISOString() : null,
      mileageKm: a.mileageKm != null ? Number(a.mileageKm) : null,
      AppropriateAdult: (a.AppropriateAdults || []).map((x: any) => ({ ...x })),
      InterpreterUse: (a.InterpreterUses || []).map((x: any) => ({ ...x })),
      Disclosure: (a.Disclosures || []).map((x: any) => ({ ...x, providedAt: x.providedAt ? new Date(x.providedAt).toISOString() : null })),
      Advice: (a.Advices || []).map((x: any) => ({ ...x })),
      Interview: (a.Interviews || []).map((x: any) => ({ ...x, startAt: x.startAt ? new Date(x.startAt).toISOString() : null, endAt: x.endAt ? new Date(x.endAt).toISOString() : null })),
      TimeEntry: (a.TimeEntries || []).map((x: any) => ({ ...x, fromTime: x.fromTime ? new Date(x.fromTime).toISOString() : null, toTime: x.toTime ? new Date(x.toTime).toISOString() : null })),
      AttendanceOutcome: (a.Outcomes || []).map((x: any) => ({ ...x, decidedAt: x.decidedAt ? new Date(x.decidedAt).toISOString() : null })),
    })),
    Documents: (c.Documents || []).map((d: any) => ({ ...d, createdAt: d.createdAt.toISOString() })),
    Invoices: (c.Invoices || []).map((i: any) => ({ ...i, createdAt: i.createdAt.toISOString() })),
  } as any;

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center gap-3">
              <Link href="/dashboard" className="inline-block">
                <img src="/LFUlogo.png" alt="Legal Flow UK" className="h-8 w-auto" />
              </Link>
              <h1 className="text-2xl font-semibold text-gray-900">Case Detail (view)</h1>
            </div>
            <CaseHeaderActions />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold">Case {c.dsccRef || c.id.slice(0,8)}</h1>
              <StatusBadge status={c.status} />
            </div>
            <div className="text-sm text-gray-600 mt-1">
              <span className="mr-3">Station: {c.station || '-'}</span>
              <span className="mr-3">Area: {c.area || '-'}</span>
              <span>Created: {new Date(c.createdAt).toLocaleString()}</span>
            </div>
            <div className="text-sm text-gray-600 mt-1">
              <span className="mr-3">Received: {c.dsccReceivedAt ? new Date(c.dsccReceivedAt).toLocaleString() : '-'}</span>
              <span>Deployed: {c.dsccDeployedAt ? new Date(c.dsccDeployedAt).toLocaleString() : '-'}</span>
            </div>
          </div>
          <div className="text-right text-sm text-gray-700">
            <div>Client: {[c.client?.firstName, c.client?.lastName].filter(Boolean).join(' ') || '-'}</div>
            <AssignedInfo caseId={c.id} assignedName={c.assignedTo?.name || null} />
            <div>
              <DeleteCase caseId={c.id} />
              <span className="mx-2"> </span>
              <Link href="/dashboard" className="text-blue-700 underline">Back to dashboard</Link>
              <span className="mx-2"> </span>
              <Link href="/cases" className="text-blue-700 underline">Back to cases</Link>
            </div>
          </div>
        </div>

        <CaseTabs data={data} />
      </div>
    </main>
  );
}
