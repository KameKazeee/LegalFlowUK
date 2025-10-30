import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@legalflow/db";
import fs from "fs";
import path from "path";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function guessContentType(filename: string) {
  const ext = path.extname(filename).toLowerCase();
  switch (ext) {
    case ".pdf": return "application/pdf";
    case ".docx": return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    case ".doc": return "application/msword";
    case ".txt": return "text/plain; charset=utf-8";
    default: return "application/octet-stream";
  }
}

export async function GET(_req: NextRequest, { params }: any) {
  const id = params?.id as string;
  if (!id) return NextResponse.json({ error: "Missing document id" }, { status: 400 });

  // Get document and its caseId (best-effort typing with any)
  const doc: any = await (prisma as any).document.findUnique({
    where: { id },
    include: { case: { select: { id: true, lfNumber: true } } }
  });
  if (!doc) return NextResponse.json({ error: "Document not found" }, { status: 404 });

  const caseId = doc.caseId || doc.case?.id;
  const lfFolder = doc.case?.lfNumber ? `LF${doc.case.lfNumber}` : null;
  const title = doc.title as string;
  if (!title) return NextResponse.json({ error: "Document has no title/filename" }, { status: 400 });

  const storageBase = path.resolve(process.cwd(), "storage/documents");
  const caseDirLf = lfFolder ? path.join(storageBase, lfFolder) : null;
  const caseDirId = caseId ? path.join(storageBase, caseId) : null;
  const preferDir = caseDirLf || caseDirId || storageBase;
  const storagePath = path.join(preferDir, title);

  // Ensure storage folder exists
  try { fs.mkdirSync(preferDir, { recursive: true }); } catch {}

  // If not already in storage, try to copy from known sources (e.g. convert/_extracted)
  if (!fs.existsSync(storagePath)) {
    const candidates = [
      path.resolve(process.cwd(), "../../convert/_extracted", title),
      path.resolve(process.cwd(), "../../../convert/_extracted", title),
      path.resolve(process.cwd(), "convert/_extracted", title),
      path.resolve(process.cwd(), "../convert/_extracted", title),
    ];
    for (const cand of candidates) {
      if (fs.existsSync(cand)) {
        try {
          fs.copyFileSync(cand, storagePath);
        } catch (e) {
          // ignore copy error; we'll try to stream from candidate directly
        }
        break;
      }
    }
  }

  let filePath = storagePath;
  if (!fs.existsSync(filePath)) {
    // If still missing, try to stream from the convert/_extracted fallback directly
    const fallbacks = [
      path.resolve(process.cwd(), "../../convert/_extracted", title),
      path.resolve(process.cwd(), "../../../convert/_extracted", title),
      path.resolve(process.cwd(), "convert/_extracted", title),
      path.resolve(process.cwd(), "../convert/_extracted", title),
    ];
    for (const f of fallbacks) {
      if (fs.existsSync(f)) { filePath = f; break; }
    }
  }

  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: "Original file not found on server" }, { status: 404 });
  }

  const stat = fs.statSync(filePath);
  const stream = fs.createReadStream(filePath);
  const headers = new Headers();
  headers.set("Content-Type", guessContentType(title));
  headers.set("Content-Length", String(stat.size));
  headers.set("Content-Disposition", `attachment; filename="${path.basename(title)}"`);
  // @ts-ignore
  return new Response(stream as any, { headers });
}
