-- Add missing enum values for CNAM bond types
ALTER TYPE "CNAMBondType" ADD VALUE 'VNI';
ALTER TYPE "CNAMBondType" ADD VALUE 'CONCENTRATEUR_OXYGENE';

-- Add missing payment method
ALTER TYPE "PaymentMethod" ADD VALUE 'BANK_TRANSFER';

-- Create enhanced CNAM Bond table for rental bonds
CREATE TABLE "CNAMBondRental" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bondNumber" TEXT,
    "bondType" "CNAMBondType" NOT NULL,
    "status" "CNAMStatus" NOT NULL DEFAULT 'EN_ATTENTE_APPROBATION',
    "dossierNumber" TEXT,
    "submissionDate" TIMESTAMP(3),
    "approvalDate" TIMESTAMP(3),
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "monthlyAmount" DECIMAL(10,2) NOT NULL,
    "coveredMonths" INTEGER NOT NULL,
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "renewalReminderDays" INTEGER NOT NULL DEFAULT 30,
    "notes" TEXT,
    "rentalId" TEXT,
    "patientId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "CNAMBondRental_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CNAMBondRental_rentalId_fkey" FOREIGN KEY ("rentalId") REFERENCES "Rental"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- Create rental periods table for tracking payment periods
CREATE TABLE "RentalPeriod" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "rentalId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "paymentMethod" "PaymentMethod" NOT NULL,
    "isGapPeriod" BOOLEAN NOT NULL DEFAULT false,
    "gapReason" TEXT,
    "notes" TEXT,
    "paymentId" TEXT,
    "cnamBondId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "RentalPeriod_rentalId_fkey" FOREIGN KEY ("rentalId") REFERENCES "Rental"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RentalPeriod_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "RentalPeriod_cnamBondId_fkey" FOREIGN KEY ("cnamBondId") REFERENCES "CNAMBondRental"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- Add metadata field to Rental table for enhanced rental data
ALTER TABLE "Rental" ADD COLUMN "metadata" JSONB;

-- Add rental status enum values
ALTER TYPE "RentalStatus" ADD VALUE 'ACTIVE';
ALTER TYPE "RentalStatus" ADD VALUE 'PAUSED';

-- Add indexes for performance
CREATE INDEX "CNAMBondRental_patientId_idx" ON "CNAMBondRental"("patientId");
CREATE INDEX "CNAMBondRental_rentalId_idx" ON "CNAMBondRental"("rentalId");
CREATE INDEX "CNAMBondRental_status_idx" ON "CNAMBondRental"("status");
CREATE INDEX "CNAMBondRental_endDate_idx" ON "CNAMBondRental"("endDate");

CREATE INDEX "RentalPeriod_rentalId_idx" ON "RentalPeriod"("rentalId");
CREATE INDEX "RentalPeriod_startDate_idx" ON "RentalPeriod"("startDate");
CREATE INDEX "RentalPeriod_endDate_idx" ON "RentalPeriod"("endDate");
CREATE INDEX "RentalPeriod_isGapPeriod_idx" ON "RentalPeriod"("isGapPeriod");