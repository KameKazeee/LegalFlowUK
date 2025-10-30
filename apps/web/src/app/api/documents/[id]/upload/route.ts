import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma, parseJasonText, upsertJasonDetails } from "@legalflow/db";
import fs from "fs";
import path from "path";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: any) {
  const session: any = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const caseId = params?.id as string;
  if (!caseId) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  // Ensure case exists and user can act (creator or assigned)
  const kase = await prisma.case.findFirst({
    where: {
      id: caseId,
      OR: [
        { createdById: session.user.id },
        { assignedToId: session.user.id },
      ],
    },
    select: { id: true },
  });
  if (!kase) return NextResponse.json({ error: "Case not found or access denied" }, { status: 404 });

  const form = await req.formData();
  const file = form.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }

  const originalName = (file as any).name as string;
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const storageBase = path.resolve(process.cwd(), 'storage/documents');
  const folder = kase.id; // will switch to LF folder after migration
  const dir = path.join(storageBase, folder);
  try { fs.mkdirSync(dir, { recursive: true }); } catch {}
  const diskPath = path.join(dir, originalName);
  fs.writeFileSync(diskPath, buffer);

  const ext = path.extname(originalName).toLowerCase();
  const doc = await prisma.document.create({
    data: {
      caseId: kase.id,
      title: originalName,
      type: ext.replace('.', '') || 'file',
      storageKey: `${folder}/${originalName}`,
      createdById: session.user.id,
    },
    select: { id: true, title: true }
  });

  // Try to extract text for parsing
  let rawText: string | null = null;
  try {
    if (ext === '.txt') {
      rawText = buffer.toString('utf8');
    } else if (ext === '.docx') {
      // lazy import mammoth if present
      // @ts-ignore - optional dependency, may not be installed yet
      const mammoth = await import('mammoth').catch(() => null as any);
      if (mammoth) {
        const result = await mammoth.extractRawText({ path: diskPath });
        rawText = result.value as string;
      }
    }
  } catch {}

  if (rawText) {
    // Ensure an attendance exists (use most recent or create one for the uploader)
    let attendance = await prisma.attendance.findFirst({ where: { caseId: kase.id }, orderBy: { createdAt: 'desc' }, select: { id: true } });
    if (!attendance) {
      const created = await prisma.attendance.create({ data: { caseId: kase.id, repId: session.user.id } });
      attendance = { id: created.id };
    }
    // Stage raw note and parse Jason templates immediately
    const raw = await (prisma as any).rawNote.create({
      data: {
        caseId: kase.id,
        attendanceId: attendance.id,
        sourceFile: originalName,
        rawText,
        status: 'NEW',
      }
    });

    // Parse and upsert using Jason template parser (current supported template)
    try {
      const parsed = parseJasonText(rawText);
      await upsertJasonDetails({ caseId: kase.id, attendanceId: attendance.id, parsed });
      await (prisma as any).rawNote.update({ where: { id: raw.id }, data: { status: 'PARSED', parsed, parsedAt: new Date() } });
    } catch (e) {
      await (prisma as any).rawNote.update({ where: { id: raw.id }, data: { status: 'ERROR' } });
    }
  }

  return NextResponse.json({ ok: true, document: doc, parsed: !!rawText });
}
