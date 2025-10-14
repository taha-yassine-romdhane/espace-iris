/*
  Warnings:

  - A unique constraint covering the columns `[serialNumber]` on the table `MedicalDevice` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "MedicalDevice" ADD COLUMN     "brand" TEXT,
ADD COLUMN     "purchasePrice" DECIMAL(10,2),
ADD COLUMN     "sellingPrice" DECIMAL(10,2),
ADD COLUMN     "serialNumber" TEXT,
ADD COLUMN     "technicalSpecs" TEXT,
ADD COLUMN     "warranty" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "MedicalDevice_serialNumber_key" ON "MedicalDevice"("serialNumber");
