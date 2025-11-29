import { PrismaClient, Role, Department } from '@prisma/client'
import bcrypt from 'bcryptjs'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const prisma = new PrismaClient()

async function main() {
  // Create admin user
  const adminPassword = await bcrypt.hash('123456', 10)
  
  const admin = await prisma.user.upsert({
    where: { email: 'saman@gmail.com' },
    update: {},
    create: {
      email: 'saman@gmail.com',
      password: adminPassword,
      role: Role.ADMIN,
      employeeId: 'ADM001',
      firstName: 'Saman',
      lastName: 'Perera',
      department: Department.MANAGEMENT,
      position: 'Managing Director',
      phoneNumber: '+94771234567',
      adminType: 'MANAGING_DIRECTOR',
    },
  })

  // Create leave balance for admin
  await prisma.leaveBalance.upsert({
    where: { employeeId: admin.id },
    update: {},
    create: {
      employeeId: admin.id,
      year: new Date().getFullYear(),
      annual: 14,
      casual: 7,
      medical: 0,
      official: 0,
    },
  })

  console.log('Seed data created successfully')
  console.log('Admin credentials:')
  console.log('Email: saman@gmail.com')
  console.log('Password: 123456')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })