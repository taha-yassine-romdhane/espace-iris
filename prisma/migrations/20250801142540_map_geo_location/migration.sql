/*
  Warnings:

  - The values [EN_VENTE,EN_LOCATION,EN_REPARATION,HORS_SERVICE] on the enum `StockStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `metadata` on the `Rental` table. All the data in the column will be lost.
  - You are about to drop the `AppointmentBackup` table. If the table is not empty, all the data it contains will be lost.
  - Made the column `duration` on table `Appointment` required. This step will fail if there are existing NULL values in that column.
  - Made the column `priority` on table `Appointment` required. This step will fail if there are existing NULL values in that column.
  - Made the column `status` on table `Appointment` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "TransferRequestUrgency" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "TransferRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'COMPLETED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "DeviceStatus" ADD VALUE 'FOR_RENT';
ALTER TYPE "DeviceStatus" ADD VALUE 'FOR_SALE';

-- AlterEnum
BEGIN;
CREATE TYPE "StockStatus_new" AS ENUM ('FOR_RENT', 'FOR_SALE', 'IN_REPAIR', 'OUT_OF_SERVICE');
ALTER TABLE "Stock" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Stock" ALTER COLUMN "status" TYPE "StockStatus_new" USING ("status"::text::"StockStatus_new");
ALTER TABLE "StockTransfer" ALTER COLUMN "newStatus" TYPE "StockStatus_new" USING ("newStatus"::text::"StockStatus_new");
ALTER TYPE "StockStatus" RENAME TO "StockStatus_old";
ALTER TYPE "StockStatus_new" RENAME TO "StockStatus";
DROP TYPE "StockStatus_old";
ALTER TABLE "Stock" ALTER COLUMN "status" SET DEFAULT 'FOR_SALE';
COMMIT;

-- DropForeignKey
ALTER TABLE "CNAMDossier" DROP CONSTRAINT "CNAMDossier_patientId_fkey";

-- AlterTable
ALTER TABLE "Appointment" ALTER COLUMN "appointmentType" DROP DEFAULT,
ALTER COLUMN "duration" SET NOT NULL,
ALTER COLUMN "location" DROP DEFAULT,
ALTER COLUMN "priority" SET NOT NULL,
ALTER COLUMN "status" SET NOT NULL;

-- AlterTable
ALTER TABLE "CNAMBondRental" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "cNAMDossierId" TEXT,
ADD COLUMN     "cnamApprovalDate" TIMESTAMP(3),
ADD COLUMN     "cnamBondNumber" TEXT,
ADD COLUMN     "cnamBondType" "CNAMBondType",
ADD COLUMN     "cnamEndDate" TIMESTAMP(3),
ADD COLUMN     "cnamStartDate" TIMESTAMP(3),
ADD COLUMN     "cnamStatus" "CNAMStatus",
ADD COLUMN     "gapReason" TEXT,
ADD COLUMN     "isDepositPayment" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isGapPeriod" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isRentalPayment" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "periodEndDate" TIMESTAMP(3),
ADD COLUMN     "periodId" TEXT,
ADD COLUMN     "periodStartDate" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Rental" DROP COLUMN "metadata",
ALTER COLUMN "endDate" DROP NOT NULL;

-- AlterTable
ALTER TABLE "RentalPeriod" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Stock" ALTER COLUMN "status" SET DEFAULT 'FOR_SALE';

-- DropTable
DROP TABLE "AppointmentBackup";

-- CreateTable
CREATE TABLE "StockTransferRequest" (
    "id" TEXT NOT NULL,
    "fromLocationId" TEXT NOT NULL,
    "toLocationId" TEXT NOT NULL,
    "productId" TEXT,
    "requestedQuantity" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "urgency" "TransferRequestUrgency" NOT NULL DEFAULT 'MEDIUM',
    "status" "TransferRequestStatus" NOT NULL DEFAULT 'PENDING',
    "requestedById" TEXT NOT NULL,
    "reviewedById" TEXT,
    "reviewNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "reviewedAt" TIMESTAMP(3),
    "medicalDeviceId" TEXT,

    CONSTRAINT "StockTransferRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RentalAccessory" (
    "id" TEXT NOT NULL,
    "rentalId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RentalAccessory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RentalConfiguration" (
    "id" TEXT NOT NULL,
    "rentalId" TEXT NOT NULL,
    "isGlobalOpenEnded" BOOLEAN NOT NULL DEFAULT false,
    "urgentRental" BOOLEAN NOT NULL DEFAULT false,
    "cnamEligible" BOOLEAN NOT NULL DEFAULT false,
    "depositAmount" DECIMAL(10,2),
    "depositMethod" "PaymentMethod",
    "totalPaymentAmount" DECIMAL(10,2),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RentalConfiguration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RentalGap" (
    "id" TEXT NOT NULL,
    "rentalId" TEXT NOT NULL,
    "gapType" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,
    "amount" DECIMAL(10,2),
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RentalGap_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RentalAccessory_rentalId_idx" ON "RentalAccessory"("rentalId");

-- CreateIndex
CREATE INDEX "RentalAccessory_productId_idx" ON "RentalAccessory"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "RentalAccessory_rentalId_productId_key" ON "RentalAccessory"("rentalId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "RentalConfiguration_rentalId_key" ON "RentalConfiguration"("rentalId");

-- CreateIndex
CREATE INDEX "RentalConfiguration_rentalId_idx" ON "RentalConfiguration"("rentalId");

-- CreateIndex
CREATE INDEX "RentalGap_rentalId_idx" ON "RentalGap"("rentalId");

-- CreateIndex
CREATE INDEX "RentalGap_gapType_idx" ON "RentalGap"("gapType");

-- CreateIndex
CREATE INDEX "RentalGap_status_idx" ON "RentalGap"("status");

-- AddForeignKey
ALTER TABLE "StockTransferRequest" ADD CONSTRAINT "StockTransferRequest_fromLocationId_fkey" FOREIGN KEY ("fromLocationId") REFERENCES "StockLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockTransferRequest" ADD CONSTRAINT "StockTransferRequest_medicalDeviceId_fkey" FOREIGN KEY ("medicalDeviceId") REFERENCES "MedicalDevice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockTransferRequest" ADD CONSTRAINT "StockTransferRequest_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockTransferRequest" ADD CONSTRAINT "StockTransferRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockTransferRequest" ADD CONSTRAINT "StockTransferRequest_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockTransferRequest" ADD CONSTRAINT "StockTransferRequest_toLocationId_fkey" FOREIGN KEY ("toLocationId") REFERENCES "StockLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_cNAMDossierId_fkey" FOREIGN KEY ("cNAMDossierId") REFERENCES "CNAMDossier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CNAMDossier" ADD CONSTRAINT "CNAMDossier_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RentalAccessory" ADD CONSTRAINT "RentalAccessory_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RentalAccessory" ADD CONSTRAINT "RentalAccessory_rentalId_fkey" FOREIGN KEY ("rentalId") REFERENCES "Rental"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RentalConfiguration" ADD CONSTRAINT "RentalConfiguration_rentalId_fkey" FOREIGN KEY ("rentalId") REFERENCES "Rental"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RentalGap" ADD CONSTRAINT "RentalGap_rentalId_fkey" FOREIGN KEY ("rentalId") REFERENCES "Rental"("id") ON DELETE CASCADE ON UPDATE CASCADE;
