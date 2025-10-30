import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const cases = await prisma.case.count();
  const clients = await prisma.client.count();
  const attends = await prisma.attendance.count();
  const outcomes = await (prisma as any).attendanceOutcome.count();
  const rawNotes = await (prisma as any).rawNote.count();
  const offences = await (prisma as any).offence.count();
  const caseOffences = await (prisma as any).caseOffence.count();

  console.log({ cases, clients, attends, outcomes, rawNotes, offences, caseOffences });

  const topOffences = await (prisma as any).offence.findMany({
    take: 10,
    orderBy: { description: 'asc' },
    select: { description: true }
  });
  console.log("Sample offences:", topOffences.map((o: any) => o.description));
}

main().catch(e => {
  console.error(e);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
