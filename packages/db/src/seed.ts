import { PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const admin = await prisma.user.upsert({
    where: { email: 'admin@legalflow.uk' },
    update: {},
    create: { email: 'admin@legalflow.uk', role: Role.ADMIN, name: 'Admin' },
  });

  const staff1 = await prisma.user.upsert({
    where: { email: 'staff1@legalflow.uk' },
    update: {},
    create: { email: 'staff1@legalflow.uk', role: Role.STAFF, name: 'Staff One' },
  });

  const freelancerUser = await prisma.user.upsert({
    where: { email: 'ariaz@freelaw.uk' },
    update: {},
    create: { email: 'ariaz@freelaw.uk', role: Role.FREELANCER, name: 'Mr A. Riaz' },
  });

  await prisma.freelancer.upsert({
    where: { userId: freelancerUser.id },
    update: {},
    create: { userId: freelancerUser.id, firmName: 'FreeLaw', mileageRate: 0.45 },
  });

  console.log('Seed complete:', { admin: admin.email });
}

main().finally(async () => prisma.$disconnect());
