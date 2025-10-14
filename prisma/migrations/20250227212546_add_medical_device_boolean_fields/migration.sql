-- AlterTable
ALTER TABLE "MedicalDevice" ADD COLUMN     "availableForRent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "requiresMaintenance" BOOLEAN NOT NULL DEFAULT false;
