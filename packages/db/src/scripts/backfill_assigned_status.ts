import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const updated = await prisma.case.updateMany({
    where: { assignedToId: { not: null }, status: 'NEW' as any },
    data: { status: 'ASSIGNED' as any },
  });
  console.log(`Updated ${updated.count} case(s) from NEW to ASSIGNED where assignedToId IS NOT NULL.`);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
