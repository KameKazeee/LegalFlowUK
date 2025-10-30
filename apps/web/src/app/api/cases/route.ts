import { NextResponse } from 'next/server';
import { prisma } from '@legalflow/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const role = (session.user as any)?.role as string | undefined;
  const userId = (session.user as any)?.id as string;
  const where: any = { deletedAt: null };
  if (role !== 'ADMIN') {
    where.assignedToId = userId;
  }

  const cases = await prisma.case.findMany({
    where,
    include: { client: true },
    orderBy: { createdAt: 'desc' },
  });

  const data = cases.map((c) => ({
    id: c.id,
    dsccRef: c.dsccRef,
    status: c.status,
    station: c.station,
    createdAt: c.createdAt,
    client: c.client ? { firstName: c.client.firstName, lastName: c.client.lastName } : null,
  }));

  return NextResponse.json(data);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const role = (session.user as any)?.role as string | undefined;
  if (role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json().catch(() => ({} as any));
  const {
    dsccRef,
    station,
    dsccReceivedAt,
    dsccDeployedAt,
    clientFirstName,
    clientLastName,
  } = body || {};

  try {
    const created = await prisma.case.create({
      data: {
        dsccRef: dsccRef ?? null,
        station: station ?? null,
        dsccReceivedAt: dsccReceivedAt ? new Date(dsccReceivedAt) : null,
        dsccDeployedAt: dsccDeployedAt ? new Date(dsccDeployedAt) : null,
        createdBy: {
          connect: { id: (session.user as any).id as string },
        },
        client: clientFirstName || clientLastName ? {
          create: {
            firstName: clientFirstName ?? null,
            lastName: clientLastName ?? null,
          },
        } : undefined,
      },
      select: { id: true, dsccRef: true, status: true },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Failed to create case' }, { status: 400 });
  }
}
