import { prisma } from "@legalflow/db";
import { hash } from "bcryptjs";

async function main() {
  const email = "jason@legalflow.uk";
  const password = "password123";
  const name = "Jason Patel";

  const pwHash = await hash(password, 10);

  const user = await prisma.user.upsert({
    where: { email },
    create: {
      email,
      name,
      password: pwHash,
      role: "STAFF",
    },
    update: {
      name,
      password: pwHash,
      role: "STAFF",
    },
    select: { id: true, email: true, name: true, role: true },
  });

  console.log("Upserted user:", user);
}

main().catch((e) => { console.error(e); process.exit(1); }).then(() => process.exit(0));
