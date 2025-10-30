import React from 'react';

type Props = { status: string };

const colors: Record<string, string> = {
  NEW: 'bg-gray-100 text-gray-800',
  ASSIGNED: 'bg-blue-100 text-blue-800',
  ATTENDED: 'bg-indigo-100 text-indigo-800',
  REVIEW: 'bg-yellow-100 text-yellow-800',
  READY_FOR_BILLING: 'bg-amber-100 text-amber-800',
  INVOICE_APPROVED: 'bg-green-100 text-green-800',
  CLOSED: 'bg-slate-200 text-slate-800',
};

export function StatusBadge({ status }: Props) {
  const cls = colors[status] || 'bg-gray-100 text-gray-800';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${cls}`}>
      {status.replaceAll('_', ' ')}
    </span>
  );
}
