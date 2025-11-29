/*
  Warnings:

  - You are about to drop the column `business` on the `LeaveBalance` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "LeaveBalance" DROP COLUMN "business",
ADD COLUMN     "official" INTEGER NOT NULL DEFAULT 0;
