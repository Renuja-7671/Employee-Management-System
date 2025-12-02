-- CreateEnum
CREATE TYPE "DeviceType" AS ENUM ('HIKVISION', 'ZK_TECO', 'OTHER');

-- CreateEnum
CREATE TYPE "AttendanceSource" AS ENUM ('MANUAL', 'BIOMETRIC', 'MOBILE', 'WEB');

-- AlterTable
ALTER TABLE "Attendance" ADD COLUMN     "deviceId" TEXT,
ADD COLUMN     "source" "AttendanceSource" NOT NULL DEFAULT 'MANUAL',
ADD COLUMN     "verifyMode" INTEGER;

-- CreateTable
CREATE TABLE "BiometricDevice" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "deviceType" "DeviceType" NOT NULL,
    "ipAddress" TEXT NOT NULL,
    "port" INTEGER NOT NULL DEFAULT 80,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "serialNumber" TEXT,
    "model" TEXT,
    "firmwareVersion" TEXT,
    "macAddress" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastSyncAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BiometricDevice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BiometricMapping" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "deviceEmployeeNo" TEXT NOT NULL,
    "cardNo" TEXT,
    "fingerprintEnrolled" BOOLEAN NOT NULL DEFAULT false,
    "faceEnrolled" BOOLEAN NOT NULL DEFAULT false,
    "syncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BiometricMapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendanceLog" (
    "id" TEXT NOT NULL,
    "deviceEmployeeNo" TEXT NOT NULL,
    "employeeId" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "verifyMode" INTEGER NOT NULL,
    "inOutType" INTEGER NOT NULL,
    "deviceId" TEXT,
    "deviceName" TEXT,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "processedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AttendanceLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BiometricDevice_serialNumber_key" ON "BiometricDevice"("serialNumber");

-- CreateIndex
CREATE INDEX "BiometricDevice_serialNumber_idx" ON "BiometricDevice"("serialNumber");

-- CreateIndex
CREATE INDEX "BiometricDevice_isActive_idx" ON "BiometricDevice"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "BiometricMapping_employeeId_key" ON "BiometricMapping"("employeeId");

-- CreateIndex
CREATE INDEX "BiometricMapping_deviceEmployeeNo_idx" ON "BiometricMapping"("deviceEmployeeNo");

-- CreateIndex
CREATE INDEX "AttendanceLog_deviceEmployeeNo_idx" ON "AttendanceLog"("deviceEmployeeNo");

-- CreateIndex
CREATE INDEX "AttendanceLog_employeeId_idx" ON "AttendanceLog"("employeeId");

-- CreateIndex
CREATE INDEX "AttendanceLog_timestamp_idx" ON "AttendanceLog"("timestamp");

-- CreateIndex
CREATE INDEX "AttendanceLog_processed_idx" ON "AttendanceLog"("processed");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_token_key" ON "PasswordResetToken"("token");

-- CreateIndex
CREATE INDEX "PasswordResetToken_userId_idx" ON "PasswordResetToken"("userId");

-- CreateIndex
CREATE INDEX "PasswordResetToken_token_idx" ON "PasswordResetToken"("token");

-- CreateIndex
CREATE INDEX "PasswordResetToken_expiresAt_idx" ON "PasswordResetToken"("expiresAt");

-- CreateIndex
CREATE INDEX "Attendance_deviceId_idx" ON "Attendance"("deviceId");

-- AddForeignKey
ALTER TABLE "BiometricMapping" ADD CONSTRAINT "BiometricMapping_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
