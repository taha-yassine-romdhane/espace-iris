-- CreateEnum
DO $$ BEGIN
 CREATE TYPE "CNAMStatus" AS ENUM ('EN_ATTENTE_APPROBATION', 'APPROUVE', 'EN_COURS', 'TERMINE', 'REFUSE');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- CreateEnum  
DO $$ BEGIN
 CREATE TYPE "CNAMBondType" AS ENUM ('MASQUE', 'CPAP', 'AUTRE');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- CreateTable
CREATE TABLE "CNAMDossier" (
    "id" TEXT NOT NULL,
    "dossierNumber" TEXT NOT NULL,
    "bondType" "CNAMBondType" NOT NULL,
    "bondAmount" DECIMAL(10,2) NOT NULL,
    "devicePrice" DECIMAL(10,2) NOT NULL,
    "complementAmount" DECIMAL(10,2) DEFAULT 0,
    "currentStep" INTEGER NOT NULL DEFAULT 1,
    "totalSteps" INTEGER NOT NULL DEFAULT 10,
    "status" "CNAMStatus" NOT NULL DEFAULT 'EN_ATTENTE_APPROBATION',
    "notes" TEXT,
    
    -- Relations
    "saleId" TEXT NOT NULL,
    "paymentDetailId" TEXT,
    "patientId" TEXT NOT NULL, -- CNAM is only for patients
    
    -- Timestamps
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CNAMDossier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CNAMStepHistory" (
    "id" TEXT NOT NULL,
    "dossierId" TEXT NOT NULL,
    "fromStep" INTEGER,
    "toStep" INTEGER NOT NULL,
    "fromStatus" "CNAMStatus",
    "toStatus" "CNAMStatus" NOT NULL,
    "notes" TEXT,
    "changedById" TEXT,
    "changeDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CNAMStepHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CNAMDossier_dossierNumber_key" ON "CNAMDossier"("dossierNumber");

-- CreateIndex
CREATE UNIQUE INDEX "CNAMDossier_paymentDetailId_key" ON "CNAMDossier"("paymentDetailId");

-- CreateIndex
CREATE INDEX "CNAMDossier_saleId_idx" ON "CNAMDossier"("saleId");

-- CreateIndex
CREATE INDEX "CNAMDossier_patientId_idx" ON "CNAMDossier"("patientId");

-- CreateIndex
CREATE INDEX "CNAMDossier_status_idx" ON "CNAMDossier"("status");

-- CreateIndex
CREATE INDEX "CNAMStepHistory_dossierId_idx" ON "CNAMStepHistory"("dossierId");

-- AddForeignKey
ALTER TABLE "CNAMDossier" ADD CONSTRAINT "CNAMDossier_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CNAMDossier" ADD CONSTRAINT "CNAMDossier_paymentDetailId_fkey" FOREIGN KEY ("paymentDetailId") REFERENCES "PaymentDetail"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CNAMDossier" ADD CONSTRAINT "CNAMDossier_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- AddForeignKey
ALTER TABLE "CNAMStepHistory" ADD CONSTRAINT "CNAMStepHistory_dossierId_fkey" FOREIGN KEY ("dossierId") REFERENCES "CNAMDossier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CNAMStepHistory" ADD CONSTRAINT "CNAMStepHistory_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;