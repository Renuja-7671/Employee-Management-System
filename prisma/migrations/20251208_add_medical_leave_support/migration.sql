-- AlterTable: Change LeaveBalance columns from Int to Float and set medical default to 7
ALTER TABLE "LeaveBalance"
  ALTER COLUMN "annual" TYPE DOUBLE PRECISION,
  ALTER COLUMN "casual" TYPE DOUBLE PRECISION,
  ALTER COLUMN "medical" TYPE DOUBLE PRECISION,
  ALTER COLUMN "medical" SET DEFAULT 7,
  ALTER COLUMN "official" TYPE DOUBLE PRECISION;

-- AlterTable: Change Leave totalDays from Int to Float
ALTER TABLE "Leave"
  ALTER COLUMN "totalDays" TYPE DOUBLE PRECISION;
