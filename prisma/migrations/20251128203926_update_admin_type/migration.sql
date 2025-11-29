-- CreateEnum
CREATE TYPE "AdminType" AS ENUM ('MANAGING_DIRECTOR', 'HR_HEAD', 'RESERVED');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "adminType" "AdminType";
