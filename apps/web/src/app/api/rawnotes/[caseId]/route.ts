import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@legalflow/db";

export async function GET(_req: NextRequest, { params }: any) {
  const caseId = params.caseId;
  if (!caseId) return NextResponse.json({ error: "Missing caseId" }, { status: 400 });

  let rn = await (prisma as any).rawNote.findFirst({ where: { caseId } });
  if (!rn) {
    const atts = await prisma.attendance.findMany({ where: { caseId }, select: { notes: true } });
    const note = atts.find(a => (a.notes || "").includes("Imported from "))?.notes || "";
    const m = note.match(/Imported from\s+(.+)$/i);
    if (m && m[1]) {
      const sourceFile = m[1].trim();
      // Try to confirm raw note exists with this sourceFile
      rn = await (prisma as any).rawNote.findFirst({ where: { sourceFile } });
      if (rn) return NextResponse.json({ exists: true, sourceFile });
      return NextResponse.json({ exists: true, sourceFile });
    }
    return NextResponse.json({ exists: false });
  }

  return NextResponse.json({ exists: true, sourceFile: rn.sourceFile });
}
