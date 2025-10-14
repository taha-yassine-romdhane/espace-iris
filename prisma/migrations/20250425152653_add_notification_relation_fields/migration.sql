-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "parameterId" TEXT,
ADD COLUMN     "relatedId" TEXT;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_parameterId_fkey" FOREIGN KEY ("parameterId") REFERENCES "DiagnosticParameter"("id") ON DELETE SET NULL ON UPDATE CASCADE;
