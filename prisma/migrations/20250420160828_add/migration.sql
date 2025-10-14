-- AlterTable
ALTER TABLE "DiagnosticParameter" ADD COLUMN     "parameterType" TEXT NOT NULL DEFAULT 'PARAMETER',
ADD COLUMN     "resultDueDate" TEXT;
