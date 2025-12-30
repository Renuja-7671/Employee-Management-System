-- AlterTable
ALTER TABLE "User" ADD COLUMN     "callingName" TEXT,
ADD COLUMN     "fullName" TEXT,
ALTER COLUMN "firstName" DROP NOT NULL,
ALTER COLUMN "lastName" DROP NOT NULL;
