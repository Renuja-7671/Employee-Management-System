-- Add new notification types
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'COVERING_DUTY_CONFLICT';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'DUTY_REASSIGNMENT_REQUIRED';

-- Create CoverDutyReassignment table
CREATE TABLE "CoverDutyReassignment" (
    "id" TEXT NOT NULL,
    "originalLeaveId" TEXT NOT NULL,
    "coverEmployeeLeaveId" TEXT NOT NULL,
    "originalCoverEmployeeId" TEXT NOT NULL,
    "newCoverEmployeeId" TEXT,
    "reassignedBy" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CoverDutyReassignment_pkey" PRIMARY KEY ("id")
);

-- Create indexes
CREATE INDEX "CoverDutyReassignment_originalLeaveId_idx" ON "CoverDutyReassignment"("originalLeaveId");
CREATE INDEX "CoverDutyReassignment_coverEmployeeLeaveId_idx" ON "CoverDutyReassignment"("coverEmployeeLeaveId");
CREATE INDEX "CoverDutyReassignment_status_idx" ON "CoverDutyReassignment"("status");
