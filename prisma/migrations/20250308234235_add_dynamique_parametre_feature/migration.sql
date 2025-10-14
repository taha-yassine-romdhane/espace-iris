/*
  Warnings:

  - You are about to drop the column `deviceType` on the `DiagnosticParameter` table. All the data in the column will be lost.
  - Added the required column `deviceId` to the `DiagnosticParameter` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "DiagnosticParameter" DROP COLUMN "deviceType",
ADD COLUMN     "deviceId" TEXT NOT NULL,
ADD COLUMN     "value" TEXT;

-- AddForeignKey
ALTER TABLE "DiagnosticParameter" ADD CONSTRAINT "DiagnosticParameter_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "MedicalDevice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
