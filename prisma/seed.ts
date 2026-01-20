// prisma/seed.ts

import { PrismaClient, Role, AdminType, Department } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seeding...');

  // Hash password for admin user
  const adminPassword = await bcrypt.hash('admin123', 10);

  // Create or update admin user
  await prisma.user.upsert({
    where: { email: 'saman@gmail.com' },
    update: {},
    create: {
      id: randomUUID(),
      email: 'saman@gmail.com',
      password: adminPassword,
      role: Role.ADMIN,
      employeeId: 'ADMIN001',
      firstName: 'Saman',
      lastName: 'Perera',
      department: Department.MANAGEMENT,
      position: 'Managing Director',
      phoneNumber: '0771234567',
      adminType: AdminType.MANAGING_DIRECTOR,
      isActive: true,
      updatedAt: new Date(),
    },
  });

  console.log('Admin user seeded successfully');
  console.log('Email: saman@gmail.com');
  console.log('Password: admin123');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('Error during seeding:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
