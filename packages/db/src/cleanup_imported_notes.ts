import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const updated = await prisma.attendance.updateMany({
    where: { notes: { startsWith: "Imported from " } },
    data: { notes: null }
  });
  console.log(`Cleaned notes on ${updated.count} attendance records.`);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
