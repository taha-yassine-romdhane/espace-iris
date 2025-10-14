-- CreateEnum
CREATE TYPE "DiagnosticStatus" AS ENUM ('PENDING', 'COMPLETED', 'CANCELLED');

-- AlterTable
ALTER TABLE "Diagnostic" ADD COLUMN     "status" "DiagnosticStatus" NOT NULL DEFAULT 'PENDING';
