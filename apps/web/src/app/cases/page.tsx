import Link from 'next/link';
import { prisma } from '@legalflow/db';
import { StatusBadge } from '../../components/StatusBadge';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function buildWhere(q: string | undefined) {
  if (!q) return {} as any;
  return {
    OR: [
      { dsccRef: { contains: q, mode: 'insensitive' } },
      { station: { contains: q, mode: 'insensitive' } },
      { assignedTo: { name: { contains: q, mode: 'insensitive' } } },
      { client: { firstName: { contains: q, mode: 'insensitive' } } },
      { client: { lastName: { contains: q, mode: 'insensitive' } } },
    ],
  } as any;
}

export default async function CasesPage({ searchParams }: { searchParams: { q?: string } }) {
  const q = searchParams?.q || '';
  const cases = await prisma.case.findMany({
    where: buildWhere(q),
    orderBy: { createdAt: 'desc' },
    take: 50,
    select: {
      id: true,
      dsccRef: true,
      station: true,
      status: true,
      createdAt: true,
      assignedTo: { select: { name: true } },
      client: { select: { firstName: true, lastName: true } },
    },
  });

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <h1 className="text-2xl font-semibold text-gray-900">Cases</h1>
            <div className="flex items-center gap-3">
              <Link href="/dashboard" className="text-blue-700 underline">Back to dashboard</Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <form>
              <input
                name="q"
                defaultValue={q}
                placeholder="Search by ref/station/rep"
                className="border rounded px-3 py-2 w-full max-w-sm"
              />
            </form>
          </div>
          <div className="flex gap-2">
            <Link href="/cases/new" className="rounded bg-blue-600 text-white px-3 py-2 hover:bg-blue-700">Create New Case</Link>
          </div>
        </div>

        <div className="overflow-x-auto bg-white rounded shadow">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left bg-gray-50">
                <th className="p-3">Ref</th>
                <th className="p-3">Client</th>
                <th className="p-3">Station</th>
                <th className="p-3">Status</th>
                <th className="p-3">Rep</th>
                <th className="p-3">Created</th>
              </tr>
            </thead>
            <tbody>
              {cases.map((c) => (
                <tr key={c.id} className="border-b last:border-b-0 hover:bg-gray-50">
                  <td className="p-3">
                    <Link href={`/cases/${c.id}` as any} className="text-blue-700 underline">
                      {c.dsccRef || c.id.slice(0, 8)}
                    </Link>
                  </td>
                  <td className="p-3">{(c.client?.firstName || c.client?.lastName) ? `${c.client?.firstName ?? ''} ${c.client?.lastName ?? ''}`.trim() : '-'}</td>
                  <td className="p-3">{c.station || '-'}</td>
                  <td className="p-3"><StatusBadge status={c.status} /></td>
                  <td className="p-3">
                    {c.assignedTo?.name ? (
                      c.assignedTo.name
                    ) : (
                      <Link href={`/cases/${c.id}/assign`} className="px-2 py-1 text-xs rounded-md bg-blue-600 text-white hover:bg-blue-700">Assign</Link>
                    )}
                  </td>
                  <td className="p-3">{new Date(c.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
