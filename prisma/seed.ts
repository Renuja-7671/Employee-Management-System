import { PrismaClient, Role, Department } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 10)
  
  const admin = await prisma.user.upsert({
    where: { email: 'admin@uniqueindustrial.com' },
    update: {},
    create: {
      email: 'admin@uniqueindustrial.com',
      password: adminPassword,
      role: Role.ADMIN,
      employeeId: 'EMP001',
      firstName: 'System',
      lastName: 'Administrator',
      department: Department.ADMINISTRATION,
      position: 'Managing Director',
      phoneNumber: '+94771234567',
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
      business: 0,
    },
  })

  console.log('Seed data created successfully')
  console.log('Admin credentials:')
  console.log('Email: admin@uniqueindustrial.com')
  console.log('Password: admin123')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })