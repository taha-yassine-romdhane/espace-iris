/*
  Warnings:

  - The values [FOR_RENT,FOR_SALE] on the enum `DeviceStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `addressDescription` on the `Company` table. All the data in the column will be lost.
  - You are about to drop the column `nameDescription` on the `Company` table. All the data in the column will be lost.
  - You are about to drop the column `phoneDescription` on the `Company` table. All the data in the column will be lost.
  - You are about to drop the column `availableForRent` on the `MedicalDevice` table. All the data in the column will be lost.
  - You are about to drop the column `descriptionNumOne` on the `Patient` table. All the data in the column will be lost.
  - You are about to drop the column `descriptionNumTwo` on the `Patient` table. All the data in the column will be lost.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "DeviceStatus_new" AS ENUM ('ACTIVE', 'MAINTENANCE', 'RETIRED', 'RESERVED', 'SOLD');
ALTER TABLE "MedicalDevice" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "MedicalDevice" ALTER COLUMN "status" TYPE "DeviceStatus_new" USING ("status"::text::"DeviceStatus_new");
ALTER TYPE "DeviceStatus" RENAME TO "DeviceStatus_old";
ALTER TYPE "DeviceStatus_new" RENAME TO "DeviceStatus";
DROP TYPE "DeviceStatus_old";
ALTER TABLE "MedicalDevice" ALTER COLUMN "status" SET DEFAULT 'ACTIVE';
COMMIT;

-- AlterTable
ALTER TABLE "Company" DROP COLUMN "addressDescription",
DROP COLUMN "nameDescription",
DROP COLUMN "phoneDescription",
ADD COLUMN     "generalNote" TEXT;

-- AlterTable
ALTER TABLE "MedicalDevice" DROP COLUMN "availableForRent",
ADD COLUMN     "destination" "StockStatus" NOT NULL DEFAULT 'FOR_SALE';

-- AlterTable
ALTER TABLE "Patient" DROP COLUMN "descriptionNumOne",
DROP COLUMN "descriptionNumTwo",
ADD COLUMN     "generalNote" TEXT;
