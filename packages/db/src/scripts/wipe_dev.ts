import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// DEVELOPMENT-ONLY: Wipes app data in dependency order. Keeps Users, Freelancers, Offences.
async function main() {
  console.log("Wiping development data (keeping users, freelancers, offences)...");

  // Child tables first
  await prisma.attendanceOutcome.deleteMany({});
  await prisma.timeEntry.deleteMany({});
  await prisma.interviewParticipant.deleteMany({});
  await prisma.interview.deleteMany({});
  await prisma.sampleCollection.deleteMany({});
  await prisma.searchAction.deleteMany({});
  await prisma.identificationProcedure.deleteMany({});
  await prisma.advice.deleteMany({});
  await prisma.disclosure.deleteMany({});
  await prisma.interpreterUse.deleteMany({});
  await prisma.appropriateAdult.deleteMany({});

  await prisma.document.deleteMany({});
  await prisma.invoiceLine.deleteMany({});
  await prisma.invoice.deleteMany({});
  await prisma.caseOffence.deleteMany({});
  await prisma.rawNote.deleteMany({});

  await prisma.attendance.deleteMany({});
  await prisma.case.deleteMany({});
  await prisma.clientHealth.deleteMany({});
  await prisma.client.deleteMany({});

  console.log("Done.");
}

main().catch((e) => { console.error(e); process.exit(1); }).then(() => process.exit(0));
