/*
  Warnings:

  - You are about to drop the column `parameterId` on the `Diagnostic` table. All the data in the column will be lost.
  - You are about to drop the column `result` on the `Diagnostic` table. All the data in the column will be lost.
  - You are about to drop the column `parameterId` on the `Notification` table. All the data in the column will be lost.
  - You are about to drop the `DiagnosticParameter` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ParameterValue` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Diagnostic" DROP CONSTRAINT "Diagnostic_parameterId_fkey";

-- DropForeignKey
ALTER TABLE "DiagnosticParameter" DROP CONSTRAINT "DiagnosticParameter_deviceId_fkey";

-- DropForeignKey
ALTER TABLE "Notification" DROP CONSTRAINT "Notification_parameterId_fkey";

-- DropForeignKey
ALTER TABLE "ParameterValue" DROP CONSTRAINT "ParameterValue_diagnosticId_fkey";

-- DropForeignKey
ALTER TABLE "ParameterValue" DROP CONSTRAINT "ParameterValue_medicalDeviceId_fkey";

-- DropForeignKey
ALTER TABLE "ParameterValue" DROP CONSTRAINT "ParameterValue_parameterId_fkey";

-- AlterTable
ALTER TABLE "Diagnostic" DROP COLUMN "parameterId",
DROP COLUMN "result";

-- AlterTable
ALTER TABLE "Notification" DROP COLUMN "parameterId";

-- DropTable
DROP TABLE "DiagnosticParameter";

-- DropTable
DROP TABLE "ParameterValue";

-- CreateTable
CREATE TABLE "DiagnosticResult" (
    "id" TEXT NOT NULL,
    "iah" DOUBLE PRECISION,
    "idValue" DOUBLE PRECISION,
    "remarque" TEXT,
    "status" TEXT NOT NULL,
    "diagnosticId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiagnosticResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DiagnosticResult_diagnosticId_key" ON "DiagnosticResult"("diagnosticId");

-- AddForeignKey
ALTER TABLE "DiagnosticResult" ADD CONSTRAINT "DiagnosticResult_diagnosticId_fkey" FOREIGN KEY ("diagnosticId") REFERENCES "Diagnostic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
