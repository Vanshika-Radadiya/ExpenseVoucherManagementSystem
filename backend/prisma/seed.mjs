import { PrismaClient, UserRole } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();
const allowedRoles = new Set(Object.values(UserRole));

async function seed() {
  const rawUsers = process.env.SEED_USERS_JSON;
  if (!rawUsers) {
    throw new Error('SEED_USERS_JSON is required to provision accounts');
  }

  const users = JSON.parse(rawUsers);
  if (!Array.isArray(users) || users.length === 0) {
    throw new Error('SEED_USERS_JSON must be a non-empty JSON array');
  }

  for (const user of users) {
    if (
      typeof user.email !== 'string' ||
      typeof user.fullName !== 'string' ||
      typeof user.password !== 'string' ||
      user.password.length < 12 ||
      !allowedRoles.has(user.role)
    ) {
      throw new Error('Each user needs email, fullName, a 12+ character password, and a valid role');
    }

    const passwordHash = await hash(user.password, 12);
    await prisma.user.upsert({
      where: { email: user.email.toLowerCase() },
      create: {
        email: user.email.toLowerCase(),
        fullName: user.fullName,
        employeeId: typeof user.employeeId === 'string' ? user.employeeId : null,
        role: user.role,
        passwordHash,
      },
      update: {
        fullName: user.fullName,
        employeeId: typeof user.employeeId === 'string' ? user.employeeId : null,
        role: user.role,
        passwordHash,
        active: true,
      },
    });
  }
}

try {
  await seed();
} finally {
  await prisma.$disconnect();
}