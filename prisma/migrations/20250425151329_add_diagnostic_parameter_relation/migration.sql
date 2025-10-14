-- AlterTable
ALTER TABLE "Diagnostic" ADD COLUMN     "parameterId" TEXT;

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "diagnosticId" TEXT;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_diagnosticId_fkey" FOREIGN KEY ("diagnosticId") REFERENCES "Diagnostic"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Diagnostic" ADD CONSTRAINT "Diagnostic_parameterId_fkey" FOREIGN KEY ("parameterId") REFERENCES "DiagnosticParameter"("id") ON DELETE SET NULL ON UPDATE CASCADE;
