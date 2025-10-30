import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";
import { parseJasonText, upsertJasonDetails } from "./parsers/jason";

const prisma = new PrismaClient();

const EXTRACT_DIR = path.resolve(process.cwd(), "../../convert/_extracted");

type Parsed = {
  dsccRef?: string;
  station?: string;
  feeEarner?: string;
  date?: string;
  custodyRef?: string;
  clientFirstName?: string;
  clientLastName?: string;
  dob?: string;
  offences?: string[];
  outcome?: string;
  mileageMiles?: number;
};

function parseFile(text: string): Parsed {
  const lines = text.split(/\r?\n/).map(l => l.trim());
  const get = (re: RegExp) => {
    const m = lines.find(l => re.test(l));
    if (!m) return undefined;
    const x = m.replace(re, "").trim();
    return x.length ? x : undefined;
  };

  const out: Parsed = {};
  out.dsccRef = get(/^DSCC Ref:\s*/i);
  out.station = get(/^(Station|Station –|Station -)\s*[:–-]?\s*/i);
  out.feeEarner = get(/^Fee Earner:\s*/i);
  out.date = get(/^Date:\s*/i);
  out.custodyRef = get(/^Custody Ref:\s*/i);

  // Client block
  const fn = get(/^First Name:\s*/i);
  const sn = get(/^Surname:\s*/i);
  out.clientFirstName = fn;
  out.clientLastName = sn;
  out.dob = get(/^DOB:\s*/i);

  // Offences (may be multi-line). Capture from a line starting with Offence(s): until blank line.
  const offences: string[] = [];
  const offIdx = lines.findIndex(l => /^Offence\(s\)[:]/i.test(l));
  if (offIdx >= 0) {
    for (let i = offIdx + 1; i < lines.length; i++) {
      const l = lines[i];
      if (!l) break;
      if (/^Place of arrest/i.test(l)) break;
      offences.push(l.replace(/^[-•\s]+/, "").trim());
    }
  }
  if (offences.length) out.offences = offences.filter(Boolean);

  // Outcome
  const outcomeLineIdx = lines.findIndex(l => /^OUTCOME$/i.test(l));
  if (outcomeLineIdx >= 0) {
    const next = lines.slice(outcomeLineIdx, outcomeLineIdx + 10).join(" ");
    if (/NFA/i.test(next)) out.outcome = "NFA";
    else if (/CHARGE/i.test(next)) out.outcome = "CHARGE";
    else if (/RUI/i.test(next)) out.outcome = "RUI";
    else if (/BAIL/i.test(next)) out.outcome = "BAIL";
  }

  // Mileage
  const mile = lines.find(l => /Mileage/i.test(l));
  if (mile) {
    const m = mile.match(/([0-9]+)\s*MILE/i);
    if (m) out.mileageMiles = parseInt(m[1], 10);
  }

  return out;
}

async function upsertFromParsed(sourceFile: string, parsed: Parsed, rawText: string) {
  // Stage raw note
  const raw = await (prisma as any).rawNote.create({
    data: { sourceFile, rawText, status: "NEW" }
  });

  // Client
  let clientId: string | undefined = undefined;
  if (parsed.clientFirstName || parsed.clientLastName || parsed.dob) {
    const dobDate = parsed.dob ? new Date(parsed.dob) : undefined;
    const client = await prisma.client.create({
      data: {
        firstName: parsed.clientFirstName,
        lastName: parsed.clientLastName,
        dob: isNaN(dobDate?.getTime() || NaN) ? undefined : dobDate,
      }
    });
    clientId = client.id;
  }

  // Case
  const creator = await prisma.user.findFirst({ where: { role: "ADMIN" } });
  const createdById = creator?.id || (await prisma.user.findFirstOrThrow()).id;

  const caseRec = await prisma.case.create({
    data: {
      clientId: clientId || undefined,
      dsccRef: parsed.dsccRef,
      station: parsed.station,
      status: "NEW",
      createdById,
    }
  });

  // Offences
  if (parsed.offences?.length) {
    for (const desc of parsed.offences) {
      const off = await (prisma as any).offence.upsert({
        where: { description: desc },
        update: {},
        create: { description: desc }
      });
      await (prisma as any).caseOffence.create({
        data: { caseId: caseRec.id, offenceId: off.id }
      });
    }
  }

  // Attendance
  const rep = await prisma.user.findFirst({ where: { role: { in: ["FREELANCER", "STAFF", "ADMIN"] } } });
  const attendance = await prisma.attendance.create({
    data: {
      caseId: caseRec.id,
      repId: rep!.id,
      // No placeholder notes: original file is exposed in Documents tab
      mileageKm: parsed.mileageMiles ? Math.round(parsed.mileageMiles * 1.60934 * 10) / 10 : undefined,
    }
  });

  // Worker-specific enrichment: Jason template
  if (/Jason Patel/i.test(sourceFile)) {
    const tp = parseJasonText(rawText);
    await upsertJasonDetails({ caseId: caseRec.id, attendanceId: attendance.id, parsed: tp });
  }

  // Outcome
  if (parsed.outcome) {
    const code = (() => {
      switch (parsed.outcome) {
        case "NFA": return "NFA" as any;
        case "CHARGE": return "CHARGE" as any;
        case "BAIL": return "BAIL" as any;
        case "RUI": return "RUI" as any;
        default: return "OTHER" as any;
      }
    })();
    await (prisma as any).attendanceOutcome.create({
      data: { attendanceId: attendance.id, outcomeCode: code }
    });
  }

  // Update raw note to PARSED
  await (prisma as any).rawNote.update({
    where: { id: raw.id },
    data: { status: "PARSED", parsed: parsed as any, parsedAt: new Date(), caseId: caseRec.id, attendanceId: attendance.id }
  });
}

async function main() {
  if (!fs.existsSync(EXTRACT_DIR)) {
    console.error("Extract dir not found:", EXTRACT_DIR);
    process.exit(1);
  }
  const files = fs.readdirSync(EXTRACT_DIR).filter(f => f.toLowerCase().endsWith(".txt"));
  console.log(`Found ${files.length} extracted text files`);
  for (const f of files) {
    const full = path.join(EXTRACT_DIR, f);
    const rawText = fs.readFileSync(full, "utf8");
    const parsed = parseFile(rawText);
    await upsertFromParsed(f, parsed, rawText);
    console.log("Imported:", f);
  }
}

main().catch(e => {
  console.error(e);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
