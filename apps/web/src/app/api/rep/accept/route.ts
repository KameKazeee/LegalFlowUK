import { NextResponse } from 'next/server';
import { verifyAssignToken } from '../../../../server/tokens';
import { prisma } from '@legalflow/db';

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({} as any));
  const token: string | undefined = body?.token;
  const decision: 'accept' | 'decline' = body?.decision === 'decline' ? 'decline' : 'accept';
  if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 });

  try {
    const payload = await verifyAssignToken(token);
    const { caseId, repId } = payload;

    const kase = await prisma.case.findUnique({ where: { id: caseId }, select: { id: true, assignedToId: true, status: true } });
    if (!kase) return NextResponse.json({ error: 'Case not found' }, { status: 404 });

    if (decision === 'decline') {
      // For MVP, simply clear assignment (if this rep was assigned)
      if (kase.assignedToId === repId) {
        await prisma.case.update({ where: { id: caseId }, data: { assignedToId: null } });
      }
      return NextResponse.json({ ok: true, status: 'DECLINED' });
    }

    // Accept: connect rep and set status ASSIGNED
    await prisma.case.update({
      where: { id: caseId },
      data: {
        assignedTo: { connect: { id: repId } },
        status: 'ASSIGNED',
      },
    });

    return NextResponse.json({ ok: true, status: 'ASSIGNED' });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Invalid token' }, { status: 400 });
  }
}
