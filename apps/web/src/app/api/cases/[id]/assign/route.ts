import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@legalflow/db';
import { signAssignToken } from '../../../../../server/tokens';

export async function POST(req: Request, { params }: any) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const role = (session.user as any)?.role as string | undefined;
  if (role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const caseId = params.id;
  const body = await req.json().catch(() => ({}));
  const email: string | undefined = body?.email?.toLowerCase?.();
  if (!email) return NextResponse.json({ error: 'Missing email' }, { status: 400 });

  const kase = await prisma.case.findUnique({ where: { id: caseId }, select: { id: true } });
  if (!kase) return NextResponse.json({ error: 'Case not found' }, { status: 404 });

  const rep = await prisma.user.findUnique({ where: { email } });
  if (!rep) return NextResponse.json({ error: 'Rep not found' }, { status: 404 });

  const token = await signAssignToken({ caseId, repId: rep.id, action: 'accept' }, '24h');

  // Assign immediately (pending acceptance) for MVP
  await prisma.case.update({
    where: { id: caseId },
    data: { assignedTo: { connect: { id: rep.id } }, status: 'ASSIGNED' as any },
  });

  // TODO: enqueue email job to send link
  const acceptUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/rep/accept/${encodeURIComponent(token)}`;

  return NextResponse.json({ ok: true, acceptUrl });
}
