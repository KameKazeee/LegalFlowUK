import { PrismaClient, Role } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

const reps = [
  { name: "Jason Patel", email: "jason@legalflow.uk", role: "STAFF" as Role },
  { name: "Balvinder Dhanda", email: "balvinder@legalflow.uk", role: "FREELANCER" as Role },
  { name: "Debbie Stevens", email: "debbie@legalflow.uk", role: "FREELANCER" as Role },
  { name: "Ian Robinson", email: "ian@legalflow.uk", role: "FREELANCER" as Role },
  { name: "Mark Turnbull", email: "mark@legalflow.uk", role: "FREELANCER" as Role },
  { name: "Maurice Malcolr", email: "maurice@legalflow.uk", role: "FREELANCER" as Role },
  { name: "Patrick Duffy", email: "patrick@legalflow.uk", role: "FREELANCER" as Role },
  { name: "Riaz Law", email: "riaz@legalflow.uk", role: "FREELANCER" as Role },
  { name: "Laura Richards", email: "laura@legalflow.uk", role: "FREELANCER" as Role },
  { name: "Tom Khattak", email: "tom@legalflow.uk", role: "FREELANCER" as Role },
  { name: "Alum Khan", email: "alum@legalflow.uk", role: "FREELANCER" as Role },
  { name: "Amrit Tanda", email: "amrit@legalflow.uk", role: "FREELANCER" as Role },
  { name: "Debbie Alexander", email: "debbie.alexander@legalflow.uk", role: "FREELANCER" as Role },
  { name: "Tim Rose", email: "tim@legalflow.uk", role: "FREELANCER" as Role },
];

async function main() {
  const password = "password123";
  const pwHash = await hash(password, 10);

  for (const r of reps) {
    const user = await prisma.user.upsert({
      where: { email: r.email },
      create: { email: r.email, name: r.name, password: pwHash, role: r.role },
      update: { name: r.name, password: pwHash, role: r.role },
      select: { id: true, email: true, role: true },
    });
    console.log("Upserted:", user);
  }
}

main().catch((e) => { console.error(e); process.exit(1); }).then(() => process.exit(0));
