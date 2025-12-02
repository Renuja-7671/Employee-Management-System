/*
  Warnings:

  - A unique constraint covering the columns `[deviceEmployeeNo]` on the table `BiometricMapping` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "BiometricMapping_deviceEmployeeNo_idx";

-- CreateIndex
CREATE UNIQUE INDEX "BiometricMapping_deviceEmployeeNo_key" ON "BiometricMapping"("deviceEmployeeNo");
