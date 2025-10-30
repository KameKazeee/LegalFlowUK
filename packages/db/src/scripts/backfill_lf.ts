import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Backfill lfNumber for existing cases starting at 8399042 and advance the sequence
// NOTE: Run after the migration that adds Case.lfNumber autoincrement.
async function main() {
  const START = 8399042;
  let next = START;

  // Read ids and existing lfNumber values with raw SQL to avoid client type drift
  const rows = await prisma.$queryRawUnsafe<{ id: string; lfNumber: number | null; createdAt: Date }[]>(
    'SELECT "id", "lfNumber", "createdAt" FROM "Case" ORDER BY "createdAt" ASC'
  );

  for (const c of rows) {
    if (c.lfNumber == null) {
      await prisma.$executeRawUnsafe(`UPDATE "Case" SET "lfNumber" = ${next} WHERE "id" = $1`, c.id);
      next += 1;
    } else if (c.lfNumber >= next) {
      next = c.lfNumber + 1;
    }
  }

  // Ensure the underlying Postgres sequence is ahead of the max(lfNumber)
  try {
    const [{ max }]: any = await prisma.$queryRawUnsafe(
      'SELECT COALESCE(MAX("lfNumber"), 0) as max FROM "Case"'
    );
    const seqNext = Math.max(Number(max) + 1, next);
    // Advance sequence to seqNext; if sequence name unknown, derive it via pg_get_serial_sequence
    await prisma.$executeRawUnsafe(
      `SELECT setval(pg_get_serial_sequence('"Case"','lfNumber'), ${seqNext}, false)`
    );
  } catch (e) {
    console.warn("Could not adjust sequence; ensure DB supports pg_get_serial_sequence", e);
  }

  console.log(`Backfill complete. Next lfNumber would be LF${next}`);
}

main().then(() => process.exit(0)).catch((e) => {
  console.error(e);
  process.exit(1);
});
