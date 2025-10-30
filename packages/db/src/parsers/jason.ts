import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export type JasonParsed = {
  client?: { firstName?: string | null; lastName?: string | null; dob?: Date | null; gender?: string | null; phone?: string | null; ni?: string | null; income?: string | null; address?: string | null; health?: string[] };
  aa?: { required: boolean; reason?: string | null; name?: string | null; relation?: string | null; phone?: string | null } | null;
  interpreter?: { required: boolean; language?: string | null } | null;
  disclosure?: { providedAt?: Date | null; source?: string | null; summary?: string | null };
  advice?: { crmEligible?: boolean; crm2Signed?: boolean; adverse1?: boolean; adverse2?: boolean; adverse3?: boolean; notes?: string | null };
  interview?: { startAt?: Date | null; endAt?: Date | null; cautionExplained?: boolean; replyType?: string | null; summary?: string | null; participants?: Array<{ role?: string; name?: string }>; };
  timeEntries?: Array<{ from?: Date | null; to?: Date | null; category: "TRAVEL" | "WAITING" | "ATTENDANCE"; details?: string | null; units?: number }>
  outcome?: { code?: string | null; decidedAt?: Date | null; notes?: string | null };
};

export function parseJasonText(text: string): JasonParsed {
  const lines = text.split(/\r?\n/);
  const valAfter = (label: RegExp) => {
    const i = lines.findIndex((l) => label.test(l));
    if (i < 0) return undefined;
    const line = lines[i] ?? "";
    return line.replace(label, "").trim() || undefined;
  };
  const nextNonEmpty = (startIdx: number, maxLook = 5) => {
    for (let i = startIdx + 1; i < Math.min(lines.length, startIdx + 1 + maxLook); i++) {
      const v = lines[i]?.trim();
      if (v) return v;
    }
    return undefined;
  };

  const parsed: JasonParsed = {};

  // Client block
  const firstName = valAfter(/^(First Name|Forename|First):\s*/i);
  const surname = valAfter(/^(Surname|Last Name|Family):\s*/i);
  const dobStr = valAfter(/^(DOB|Date of Birth):\s*/i);
  const gender = valAfter(/^(Gender|Sex):\s*/i);
  // Address: lines after "Address:-" until a blank line
  const addrIdx = lines.findIndex((l) => /^Address[:-]/i.test(l));
  let address: string | undefined;
  if (addrIdx >= 0) {
    const acc: string[] = [];
    for (let i = addrIdx + 1; i < lines.length; i++) {
      const l = lines[i];
      if (!l) break;
      if (/^Date and time of arrest:/i.test(l)) break;
      acc.push(l.trim());
    }
    if (acc.length) address = acc.join("\n");
  }
  // Phones and NI:
  const telIdx = lines.findIndex((l) => /(Telephone Number\(s\)|Telephone|Phone)/i.test(l));
  let phone: string | undefined;
  if (telIdx >= 0) {
    const acc: string[] = [];
    for (let i = telIdx + 1; i < lines.length; i++) {
      const t = lines[i]?.trim();
      if (!t) break;
      if (/^(National Insurance Number|Income|Date and time of arrest|Health)/i.test(t)) break;
      acc.push(t);
      if (acc.join(' ').length > 200) break;
    }
    const next = acc.join(' ');
    if (next) phone = next;
  }
  const niIdx = lines.findIndex((l) => /National Insurance Number/i.test(l));
  const niLine = niIdx >= 0 ? nextNonEmpty(niIdx, 3) : undefined;
  const incomeIdx = lines.findIndex((l) => /^(Income\/?Source|Income Source|Employment)/i.test(l));
  const incomeLine = incomeIdx >= 0 ? nextNonEmpty(incomeIdx, 3) : undefined;

  // Health list between "Health Problems" and next blank
  const hpIdx = lines.findIndex((l) => /^Health Problems/i.test(l));
  const health: string[] = [];
  if (hpIdx >= 0) {
    for (let i = hpIdx + 1; i < lines.length; i++) {
      const l = (lines[i] ?? "").trim();
      if (!l) break;
      if (/^Was specific advice/i.test(l)) break;
      if (!/\bYes\b|\bNo\b|diagnosed/i.test(l) || /ADVISED|ALL DIAGNOSED/i.test(l)) {
        if (l) health.push(l.replace(/^[\-−•\s]+/, ""));
      }
    }
  }

  parsed.client = {
    firstName: firstName || undefined,
    lastName: surname || undefined,
    dob: dobStr ? new Date(dobStr) : undefined,
    gender: gender || undefined,
    address: address || undefined,
    phone: phone || undefined,
    ni: niLine || undefined,
    income: incomeLine || undefined,
    health: health.length ? health : undefined,
  };

  // AA / Interpreter
  const aaYes = /Appropriate\s*Adult.*\[\s*X\s*\]\s*Yes/i.test(text) || /AA\s*–/i.test(text);
  const aaDetails = valAfter(/^Name\/Address\/Contact Number:\s*/i);
  const aaRel = valAfter(/^Relationship to Client:\s*/i);
  parsed.aa = aaYes ? { required: true, name: aaDetails, relation: aaRel, phone: (aaDetails||'').match(/(\+?\d[\d\s-]{7,})/)?.[1] || null, reason: null } : { required: false };
  const intNo = /(INTERPRETER|Interpreter)\s*[–-]?\s*NO/i.test(text);
  const intYes = /(INTERPRETER|Interpreter)\s*[–-]?\s*YES/i.test(text);
  parsed.interpreter = intYes ? { required: true, language: null } : { required: false };

  // Disclosure
  const discIdx = lines.findIndex((l) => /^DISCLOSURE/i.test(l) || /Disclosure\s*(Received|Given)?/i.test(l));
  if (discIdx >= 0) {
    const blk = lines.slice(discIdx, discIdx + 30).join(" \n");
    const timeM = blk.match(/(\d{3,4})\s*HRS/i) || blk.match(/(\d{1,2}\/\d{1,2}\/\d{2,4})\s+(\d{1,2}:\d{2})/);
    let providedAt: Date | null = null;
    if (timeM) {
      if (timeM.length === 2) {
        const hhmmRaw = (timeM[1] ?? '0000').toString();
        const hhmm = hhmmRaw.padStart(4,'0');
        providedAt = new Date(`1970-01-01T${hhmm.slice(0,2)}:${hhmm.slice(2)}:00`);
      } else if (timeM.length >= 3) {
        const dmy = (timeM[1] ?? '').toString();
        const hm = (timeM[2] ?? '').toString();
        const [dS,mS,yS] = dmy.split('/');
        const d = Number(dS || '1');
        const m = Number(mS || '1');
        const y = Number(yS || '1970');
        const yyyy = y < 100 ? 2000 + y : y;
        const [hhS,mmS] = hm.split(':');
        const hh = Number(hhS || '0');
        const mm = Number(mmS || '0');
        providedAt = new Date(Date.UTC(yyyy, Math.max(0, (m||1)-1), Math.max(1, d||1), hh, mm));
      }
    }
    parsed.disclosure = { providedAt, source: /FROM OIC/i.test(blk) ? 'OIC' : null, summary: blk.slice(0, 1000) };
  }

  // Advice flags
  const adviceBlkIdx = lines.findIndex((l) => /^Was specific advice given/i.test(l));
  parsed.advice = {
    crmEligible: /eligible.*Yes/i.test(text) || /CRM1.*Yes/i.test(text) || /CRM2.*Yes/i.test(text),
    crm2Signed: /CRM2.*Yes/i.test(text) && !/No forms/i.test(text),
    adverse1: /Failure to raise any fact/i.test(text) || /adverse inference.*raise/i.test(text),
    adverse2: /Failure to account for the purpose/i.test(text),
    adverse3: /Failure to account for the presence/i.test(text),
    notes: adviceBlkIdx >= 0 ? lines.slice(adviceBlkIdx, adviceBlkIdx + 10).join(" \n").slice(0, 800) : null,
  };

  // Interview
  const ivIdx = lines.findIndex((l) => /^POLICE INTERVIEW/i.test(l) || /Interview\s*(Start|End)?/i.test(l));
  if (ivIdx >= 0) {
    const blk = lines.slice(ivIdx, ivIdx + 80).join(" \n");
    const sf = blk.match(/(\d{3,4})\s*HRS?\s*[–-]\s*(\d{3,4})/i) || blk.match(/Start\s*:?\s*(\d{1,2}:\d{2}).*?End\s*:?\s*(\d{1,2}:\d{2})/i);
    const toDate = (hhmm?: string) => hhmm ? new Date(`1970-01-01T${hhmm.padStart(4,'0').slice(0,2)}:${hhmm.slice(-2)}:00`) : null;
    const reply = blk.match(/(NO COMMENT|PREPARED|MIXED|SOME)/i)?.[1]?.toUpperCase() || null;
    parsed.interview = {
      startAt: sf && sf[1] ? (sf[1].includes(':') ? toDate(sf[1].replace(':','')) : toDate(sf[1])) : null,
      endAt: sf && sf[2] ? (sf[2].includes(':') ? toDate(sf[2].replace(':','')) : toDate(sf[2])) : null,
      cautionExplained: /caution\s*\[\s*x\s*\]\s*Yes/i.test(blk) || /Satisfactory explanation.*Yes/i.test(blk),
      replyType: reply,
      summary: lines.slice(ivIdx + 30, ivIdx + 120).join(" \n").slice(0, 1500),
      participants: undefined,
    };
  }

  // Outcome
  const nfa = /\bNFA\b/i.test(text);
  const outcomeAt = text.match(/outcome\s*[–-]\s*(\d{1,2}\/\d{1,2}\/\d{2,4})/i)?.[1] || null;
  parsed.outcome = { code: nfa ? 'NFA' : null, decidedAt: outcomeAt ? new Date(outcomeAt) : null, notes: null };

  // Time log entries (Summary of times)
  const entries: JasonParsed["timeEntries"] = [];
  for (const l of lines) {
    const m = l.match(/^(\d{3,4})\s*$|^(\d{3,4})\s*[–-]\s*(\d{3,4})/);
    if (m) continue; // header lines
    const row = l.match(/^(\d{3,4})\s*\n?$/);
    // Use the explicit three blocks we saw
  }
  // Parse known rows
  const block = lines.join("\n");
  const rows = block.match(/(\d{3,4})\s*[\r\n]+(\d{3,4})[\s\S]*?(Travel|Waiting|Attendance)[\s\S]*?([\s\S]*?)(?=\n\d{3,4}|$)/gi) || [];
  const toD = (hhmm?: string) => hhmm ? new Date(`1970-01-01T${hhmm.padStart(4,'0').slice(0,2)}:${hhmm.slice(-2)}:00`) : null;
  for (const r of rows) {
    const hm = r.match(/(\d{3,4}).*?(\d{3,4})/);
    const cat = /Travel/i.test(r) ? 'TRAVEL' : /Waiting/i.test(r) ? 'WAITING' : /Attendance/i.test(r) ? 'ATTENDANCE' : null;
    const details = r.split(/BRIEF DETAILS/i)[1]?.trim() || r.split(/\n/).slice(0,5).join(' ').slice(0,120) || null;
    if (hm && hm[1] && hm[2] && cat) entries!.push({ from: toD(hm[1]), to: toD(hm[2]), category: cat as any, details });
  }
  if (entries!.length) parsed.timeEntries = entries;

  return parsed;
}

export async function upsertJasonDetails(opts: { caseId: string; attendanceId: string; parsed: JasonParsed }) {
  const { caseId, attendanceId, parsed } = opts;

  // Client augment
  if (parsed.client) {
    // Attach health as conditions
    if (parsed.client.health?.length) {
      for (const h of parsed.client.health) {
        const cond = await (prisma as any).healthCondition.upsert({ where: { name: h }, update: {}, create: { name: h } });
        // find client by case
        const c = await prisma.case.findUnique({ where: { id: caseId }, select: { clientId: true } });
        if (c?.clientId) {
          await (prisma as any).clientHealth.upsert({
            where: { clientId_healthConditionId: { clientId: c.clientId, healthConditionId: cond.id } },
            update: {},
            create: { clientId: c.clientId, healthConditionId: cond.id },
          });
        }
      }
    }
  }

  if (parsed.aa) {
    await (prisma as any).appropriateAdult.create({
      data: {
        attendanceId,
        required: !!parsed.aa.required,
        name: parsed.aa.name || null,
        relation: parsed.aa.relation || null,
        phone: parsed.aa.phone || null,
        reason: parsed.aa.reason || null,
      }
    });
  }
  if (parsed.interpreter) {
    await (prisma as any).interpreterUse.create({
      data: { attendanceId, required: !!parsed.interpreter.required, language: parsed.interpreter.language || null }
    });
  }
  if (parsed.disclosure) {
    await (prisma as any).disclosure.create({
      data: { attendanceId, providedAt: parsed.disclosure.providedAt || null, source: parsed.disclosure.source || null, summary: parsed.disclosure.summary || null }
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
    await (prisma as any).interview.create({
      data: {
        attendanceId,
        startAt: parsed.interview.startAt || null,
        endAt: parsed.interview.endAt || null,
        cautionExplained: !!parsed.interview.cautionExplained,
        replyType: parsed.interview.replyType ? parsed.interview.replyType.replace(/\s+/g, '_') : null,
        summary: parsed.interview.summary || null,
      }
    });
  }
  if (parsed.timeEntries?.length) {
    for (const t of parsed.timeEntries) {
      await (prisma as any).timeEntry.create({
        data: { attendanceId, fromTime: t.from || null, toTime: t.to || null, category: t.category as any, details: t.details || null, units: t.units ?? 0 }
      });
    }
  }
  if (parsed.outcome?.code) {
    await (prisma as any).attendanceOutcome.create({ data: { attendanceId, outcomeCode: parsed.outcome.code as any, decidedAt: parsed.outcome.decidedAt || null, notes: parsed.outcome.notes || null } });
  }
}
