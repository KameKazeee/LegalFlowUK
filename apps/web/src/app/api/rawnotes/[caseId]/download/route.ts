import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@legalflow/db";
import fs from "fs";
import path from "path";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: any) {
  const caseId = params.caseId;
  if (!caseId) return NextResponse.json({ error: "Missing caseId" }, { status: 400 });

  const url = new URL(_req.url);
  const qFile = url.searchParams.get('file');

  let sourceFile: string | null = null;
  if (qFile) {
    // Sanitize to filename only
    sourceFile = path.basename(qFile);
  } else {
    const rn = await (prisma as any).rawNote.findFirst({ where: { caseId } });
    if (rn?.sourceFile) {
      sourceFile = rn.sourceFile as string;
    } else {
      const atts = await prisma.attendance.findMany({ where: { caseId }, select: { notes: true } });
      const note = atts.find(a => (a.notes || "").includes("Imported from "))?.notes || "";
      const m = note.match(/Imported from\s+(.+)$/i);
      if (m && m[1]) sourceFile = path.basename(m[1].trim());
    }
  }
  if (!sourceFile) return NextResponse.json({ error: "Original note not found" }, { status: 404 });

  // Try multiple plausible bases (monorepo cwd differences)
  const bases = [
    path.resolve(process.cwd(), "../../convert/_extracted"),
    path.resolve(process.cwd(), "../../../convert/_extracted"),
    path.resolve(process.cwd(), "convert/_extracted"),
    path.resolve(process.cwd(), "../convert/_extracted"),
  ];
  let filePath = "";
  for (const base of bases) {
    const candidate = path.join(base, sourceFile);
    if (candidate.startsWith(base) && fs.existsSync(candidate)) {
      filePath = candidate;
      break;
    }
  }
  if (!filePath) {
    return NextResponse.json({ error: "File not found on server" }, { status: 404 });
  }

  const stat = fs.statSync(filePath);
  const stream = fs.createReadStream(filePath);
  const headers = new Headers();
  const ext = path.extname(filePath).toLowerCase();
  const contentType = ext === ".txt" ? "text/plain; charset=utf-8" : "application/octet-stream";
  headers.set("Content-Type", contentType);
  headers.set("Content-Length", String(stat.size));
  headers.set("Content-Disposition", `attachment; filename="${path.basename(filePath)}"`);

  // @ts-ignore
  return new Response(stream as any, { headers });
}
