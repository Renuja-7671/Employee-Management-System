-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "isPinned" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Notification_isPinned_idx" ON "Notification"("isPinned");
