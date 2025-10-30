import { NextResponse } from 'next/server';
import { parseDsccSms, DsccParsedSchema } from '@legalflow/lib';

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const text: string | undefined = body?.text;
  if (!text || typeof text !== 'string') {
    return NextResponse.json({ error: 'Missing text' }, { status: 400 });
  }
  const parsed = parseDsccSms(text);
  const safe = DsccParsedSchema.safeParse(parsed);
  if (!safe.success) {
    return NextResponse.json({ error: 'Parse failed', issues: safe.error.format() }, { status: 422 });
  }
  // Fallback: robustly parse Received and Deployed times from text in UK format (dd/MM/yyyy HH:mm.ss)
  const parseUk = (s?: string | null) => {
    if (!s) return null;
    const match = s.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})\s+(\d{1,2}):(\d{2})(?:\.(\d{2}))?/);
    if (!match) return null;
    const [, d, mo, y, hh, mm] = match as RegExpMatchArray;
    const yearNum = Number((y as string).length === 2 ? `20${y}` : y);
    const monthIdx = Number(mo) - 1;
    const dayNum = Number(d);
    const hourNum = Number(hh);
    const minuteNum = Number(mm);
    // Construct as local time and return ISO string
    const dt = new Date(yearNum, monthIdx, dayNum, hourNum, minuteNum, 0, 0);
    return dt.toISOString();
  };

  const recFromText = (() => {
    const m = text.match(/DSCC\s*case\s*(\d{1,2}\/\d{1,2}\/\d{2,4}\s+\d{1,2}:\d{2}(?:\.\d{2})?)/i);
    return parseUk(m?.[1] || null);
  })();
  const depFromText = (() => {
    const m = text.match(/Deployed\s*:\s*(\d{1,2}\/\d{1,2}\/\d{2,4}\s+\d{1,2}:\d{2}(?:\.\d{2})?)/i);
    return parseUk(m?.[1] || null);
  })();

  const out = { ...safe.data } as any;
  if (recFromText) out.dsccReceivedAt = recFromText;
  if (depFromText) out.dsccDeployedAt = depFromText;
  return NextResponse.json(out);
}
