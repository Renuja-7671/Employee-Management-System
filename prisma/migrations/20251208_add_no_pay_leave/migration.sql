-- Add isNoPay field to Leave table to track No Pay leaves
-- This allows employees to apply for leaves even when their balance is 0
-- The leave will be marked as No Pay if approved

ALTER TABLE "Leave" ADD COLUMN "isNoPay" BOOLEAN NOT NULL DEFAULT false;

-- Add index for querying No Pay leaves
CREATE INDEX "Leave_isNoPay_idx" ON "Leave"("isNoPay");

-- Add comment
COMMENT ON COLUMN "Leave"."isNoPay" IS 'Indicates if this leave is a No Pay leave due to insufficient balance';
