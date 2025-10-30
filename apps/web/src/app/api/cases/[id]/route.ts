import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@legalflow/db';

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const role = (session.user as any)?.role;
  if (role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const id = params.id;
  try {
    await prisma.$transaction(async (tx) => {
      // Delete invoice lines via relation filter
      await tx.invoiceLine.deleteMany({ where: { invoice: { caseId: id } } as any });
      // Delete invoices
      await tx.invoice.deleteMany({ where: { caseId: id } });
      // Delete documents
      await tx.document.deleteMany({ where: { caseId: id } });
      // Delete raw notes linked to this case
      await (tx as any).rawNote?.deleteMany?.({ where: { caseId: id } });
      // Attendance child tables (use any due to missing types)
      const attendanceIds = await tx.attendance.findMany({ where: { caseId: id }, select: { id: true } });
      const aIds = attendanceIds.map(a => a.id);
      if (aIds.length) {
        await (tx as any).appropriateAdult?.deleteMany?.({ where: { attendanceId: { in: aIds } } });
        await (tx as any).interpreterUse?.deleteMany?.({ where: { attendanceId: { in: aIds } } });
        await (tx as any).disclosure?.deleteMany?.({ where: { attendanceId: { in: aIds } } });
        await (tx as any).advice?.deleteMany?.({ where: { attendanceId: { in: aIds } } });
        await (tx as any).interview?.deleteMany?.({ where: { attendanceId: { in: aIds } } });
        await (tx as any).timeEntry?.deleteMany?.({ where: { attendanceId: { in: aIds } } });
        await (tx as any).attendanceOutcome?.deleteMany?.({ where: { attendanceId: { in: aIds } } });
      }
      // Delete attendances
      await tx.attendance.deleteMany({ where: { caseId: id } });
      // Finally delete the case
      await tx.case.delete({ where: { id } });
    });
    return new NextResponse(null, { status: 204 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Delete failed' }, { status: 500 });
  }
}
