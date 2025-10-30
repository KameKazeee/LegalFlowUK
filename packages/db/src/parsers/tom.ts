import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export type TomParsed = {
  disclosure?: { providedAt?: Date | null; source?: string | null; summary?: string | null };
  interview?: { startAt?: Date | null; endAt?: Date | null; cautionExplained?: boolean; replyType?: string | null; summary?: string | null };
  advice?: { crmEligible?: boolean; crm2Signed?: boolean; adverse1?: boolean; adverse2?: boolean; adverse3?: boolean; notes?: string | null };
  aa?: { required: boolean; reason?: string | null; name?: string | null; relation?: string | null; phone?: string | null } | null;
  interpreter?: { required: boolean; language?: string | null; notes?: string | null } | null;
  timeEntries?: Array<{ from?: Date | null; to?: Date | null; category: "TRAVEL" | "WAITING" | "ATTENDANCE"; details?: string | null; units?: number }>
}

export function parseTomText(text: string): TomParsed {
  const lines = text.split(/\r?\n/);
  const getBlock = (title: RegExp, until: RegExp) => {
    const s = lines.findIndex(l => title.test(l));
    if (s < 0) return "";
    let end = lines.length;
    for (let i = s + 1; i < lines.length; i++) {
      if (until.test(lines[i])) { end = i; break; }
    }
    return lines.slice(s + 1, end).join("\n");
  };

  const parsed: TomParsed = {};

  // Disclosure section
  const disclosureBlock = getBlock(/DISCLOSURE/i, /^(ADVICE|INTERVIEW|OVERVIEW|TIME\s*LOG)/i);
  if (disclosureBlock) {
    const providedAt = disclosureBlock.match(/(\d{1,2}[\/:]\d{1,2}[\/:]\d{2,4})\s+(\d{1,2}:\d{2})/);
    const source = disclosureBlock.match(/(DSCC|OIC|CUSTODY|CLIENT)/i);
    parsed.disclosure = {
      providedAt: providedAt ? new Date(providedAt[0]) : null,
      source: source ? source[1].toUpperCase() : null,
      summary: disclosureBlock.trim().slice(0, 2000) || null,
    };
  }

  // Advice
  const adviceBlock = getBlock(/ADVICE/i, /^(INTERVIEW|TIME\s*LOG|OVERVIEW)/i);
  if (adviceBlock) {
    parsed.advice = {
      crmEligible: /CRM1|CRM2|LEGAL\s*AID|BENEFIT\s*TEST.*YES/i.test(adviceBlock) || /eligible.*yes/i.test(adviceBlock),
      crm2Signed: /CRM2.*(SIGNED|YES)/i.test(adviceBlock),
      adverse1: /fail to mention/i.test(adviceBlock),
      adverse2: /object.*presence/i.test(adviceBlock),
      adverse3: /presence.*place/i.test(adviceBlock),
      notes: adviceBlock.trim().slice(0, 1000) || null,
    };
  }

  // Interview
  const interviewBlock = getBlock(/INTERVIEW/i, /^(TIME\s*LOG|OVERVIEW)/i);
  if (interviewBlock) {
    const start = interviewBlock.match(/start\s*(\d{1,2}:\d{2})/i);
    const end = interviewBlock.match(/finish|end\s*(\d{1,2}:\d{2})/i);
    const reply = interviewBlock.match(/(NO COMMENT|PREPARED|MIXED|SOME)/i);
    parsed.interview = {
      startAt: start ? new Date(`1970-01-01T${start[1]}:00`) : null,
      endAt: end ? new Date(`1970-01-01T${end[1]}:00`) : null,
      cautionExplained: /caution.*(explained|given).*satisf/i.test(interviewBlock),
      replyType: reply ? reply[1].toUpperCase() : null,
      summary: interviewBlock.trim().slice(0, 2000) || null,
    };
  }

  // Appropriate Adult & Interpreter hints
  parsed.aa = /appropriate\s*adult\s*:\s*yes/i.test(text)
    ? { required: true, reason: (text.match(/AA reason\s*:\s*(.*)/i)?.[1] || null) }
    : (/appropriate\s*adult\s*:\s*no/i.test(text) ? { required: false } : null);

  parsed.interpreter = /interpreter\s*:\s*yes/i.test(text)
    ? { required: true, language: (text.match(/language\s*:\s*(.*)/i)?.[1] || null) }
    : (/interpreter\s*:\s*no/i.test(text) ? { required: false } : null);

  // Time log simple parser: lines like "08:30-09:00 Travel - to station"
  const timeEntries: TomParsed["timeEntries"] = [];
  for (const l of lines) {
    const m = l.match(/(\d{1,2}:\d{2})\s*[-–]\s*(\d{1,2}:\d{2})\s*(Travel|Waiting|Attendance)\b\s*-?\s*(.*)$/i);
    if (m) {
      const cat = m[3].toUpperCase() as any;
      const from = new Date(`1970-01-01T${m[1]}:00`);
      const to = new Date(`1970-01-01T${m[2]}:00`);
      const details = (m[4] || '').trim();
      timeEntries!.push({ from, to, category: cat, details, units: undefined });
    }
  }
  if (timeEntries!.length) parsed.timeEntries = timeEntries;

  return parsed;
}

export async function upsertTomDetails(opts: { caseId: string; attendanceId: string; parsed: TomParsed }) {
  const { caseId, attendanceId, parsed } = opts;

  if (parsed.disclosure) {
    await (prisma as any).disclosure.create({
      data: { attendanceId, providedAt: parsed.disclosure.providedAt, source: parsed.disclosure.source, summary: parsed.disclosure.summary }
    });
  }
  if (parsed.advice) {
    await (prisma as any).advice.create({
      data: {
        attendanceId,
        crmEligible: !!parsed.advice.crmEligible,
        crm2Signed: !!parsed.advice.crm2Signed,
        adverseInferenceFailToMention: !!parsed.advice.adverse1,
        adverseInferenceObject: !!parsed.advice.adverse2,
        adverseInferencePresence: !!parsed.advice.adverse3,
        notes: parsed.advice.notes || null,
      }
    });
  }
  if (parsed.interview) {
    const iv = await (prisma as any).interview.create({
      data: {
        attendanceId,
        startAt: parsed.interview.startAt,
        endAt: parsed.interview.endAt,
        cautionExplained: !!parsed.interview.cautionExplained,
        replyType: parsed.interview.replyType ? parsed.interview.replyType.replace(/\s+/g, '_') : null,
        summary: parsed.interview.summary || null,
      }
    });
    // No participants parsing yet
  }
  if (parsed.aa) {
    await (prisma as any).appropriateAdult.create({
      data: {
        attendanceId,
        required: !!parsed.aa.required,
        reason: parsed.aa.reason || null,
        name: parsed.aa.name || null,
        relation: parsed.aa.relation || null,
        phone: parsed.aa.phone || null,
      }
    });
  }
  if (parsed.interpreter) {
    await (prisma as any).interpreterUse.create({
      data: {
        attendanceId,
        required: !!parsed.interpreter.required,
        language: parsed.interpreter.language || null,
        notes: parsed.interpreter.notes || null,
      }
    });
  }
  if (parsed.timeEntries?.length) {
    for (const t of parsed.timeEntries) {
      await (prisma as any).timeEntry.create({
        data: {
          attendanceId,
          fromTime: t.from || null,
          toTime: t.to || null,
          category: t.category as any,
          details: t.details || null,
          units: t.units ?? 0,
        }
      });
    }
  }
}
