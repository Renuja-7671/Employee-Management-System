-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'EMPLOYEE');

-- CreateEnum
CREATE TYPE "Department" AS ENUM ('MANAGEMENT', 'SALES_AND_MARKETING', 'FINANCE', 'STORES', 'PROCUREMENT', 'HR', 'IT');

-- CreateEnum
CREATE TYPE "LeaveType" AS ENUM ('ANNUAL', 'CASUAL', 'MEDICAL', 'OFFICIAL');

-- CreateEnum
CREATE TYPE "LeaveStatus" AS ENUM ('PENDING_COVER', 'PENDING_ADMIN', 'APPROVED', 'DECLINED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CoverStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'ABSENT', 'LATE', 'HALF_DAY', 'LEAVE', 'HOLIDAY');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('LEAVE_REQUEST', 'LEAVE_APPROVED', 'LEAVE_DECLINED', 'LEAVE_CANCELLED', 'COVER_REQUEST', 'COVER_ACCEPTED', 'COVER_DECLINED', 'ATTENDANCE_ALERT', 'LEAVE_BALANCE_LOW', 'SYSTEM_ALERT');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'EMPLOYEE',
    "employeeId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "nameWithInitials" TEXT,
    "department" "Department" NOT NULL,
    "position" TEXT NOT NULL,
    "phoneNumber" TEXT,
    "birthday" TIMESTAMP(3),
    "address" TEXT,
    "emergencyContact" TEXT,
    "profilePicture" TEXT,
    "dateOfJoining" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Leave" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "leaveType" "LeaveType" NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "totalDays" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "LeaveStatus" NOT NULL DEFAULT 'PENDING_COVER',
    "adminResponse" TEXT,
    "coverEmployeeId" TEXT,
    "medicalCertPath" TEXT,
    "isCancelled" BOOLEAN NOT NULL DEFAULT false,
    "cancellationReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Leave_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoverRequest" (
    "id" TEXT NOT NULL,
    "leaveId" TEXT NOT NULL,
    "coverEmployeeId" TEXT NOT NULL,
    "status" "CoverStatus" NOT NULL DEFAULT 'PENDING',
    "responseMessage" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CoverRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attendance" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "checkIn" TIMESTAMP(3),
    "checkOut" TIMESTAMP(3),
    "status" "AttendanceStatus" NOT NULL,
    "workHours" DOUBLE PRECISION,
    "isWeekend" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeaveBalance" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "annual" INTEGER NOT NULL DEFAULT 14,
    "casual" INTEGER NOT NULL DEFAULT 7,
    "medical" INTEGER NOT NULL DEFAULT 0,
    "business" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeaveBalance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "senderId" TEXT,
    "relatedId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PublicHoliday" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PublicHoliday_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_employeeId_key" ON "User"("employeeId");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_employeeId_idx" ON "User"("employeeId");

-- CreateIndex
CREATE INDEX "User_department_idx" ON "User"("department");

-- CreateIndex
CREATE INDEX "User_birthday_idx" ON "User"("birthday");

-- CreateIndex
CREATE INDEX "Leave_employeeId_idx" ON "Leave"("employeeId");

-- CreateIndex
CREATE INDEX "Leave_status_idx" ON "Leave"("status");

-- CreateIndex
CREATE INDEX "Leave_startDate_idx" ON "Leave"("startDate");

-- CreateIndex
CREATE UNIQUE INDEX "CoverRequest_leaveId_key" ON "CoverRequest"("leaveId");

-- CreateIndex
CREATE INDEX "CoverRequest_coverEmployeeId_idx" ON "CoverRequest"("coverEmployeeId");

-- CreateIndex
CREATE INDEX "CoverRequest_status_idx" ON "CoverRequest"("status");

-- CreateIndex
CREATE INDEX "Attendance_employeeId_idx" ON "Attendance"("employeeId");

-- CreateIndex
CREATE INDEX "Attendance_date_idx" ON "Attendance"("date");

-- CreateIndex
CREATE UNIQUE INDEX "Attendance_employeeId_date_key" ON "Attendance"("employeeId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "LeaveBalance_employeeId_key" ON "LeaveBalance"("employeeId");

-- CreateIndex
CREATE INDEX "LeaveBalance_year_idx" ON "LeaveBalance"("year");

-- CreateIndex
CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");

-- CreateIndex
CREATE INDEX "Notification_isRead_idx" ON "Notification"("isRead");

-- CreateIndex
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");

-- CreateIndex
CREATE INDEX "PublicHoliday_date_idx" ON "PublicHoliday"("date");

-- AddForeignKey
ALTER TABLE "Leave" ADD CONSTRAINT "Leave_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Leave" ADD CONSTRAINT "Leave_coverEmployeeId_fkey" FOREIGN KEY ("coverEmployeeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoverRequest" ADD CONSTRAINT "CoverRequest_leaveId_fkey" FOREIGN KEY ("leaveId") REFERENCES "Leave"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoverRequest" ADD CONSTRAINT "CoverRequest_coverEmployeeId_fkey" FOREIGN KEY ("coverEmployeeId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveBalance" ADD CONSTRAINT "LeaveBalance_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
