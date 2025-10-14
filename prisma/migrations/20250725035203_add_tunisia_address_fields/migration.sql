/*
  Warnings:

  - You are about to drop the column `address` on the `Company` table. All the data in the column will be lost.
  - You are about to drop the column `address` on the `Patient` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Company" DROP COLUMN "address",
ADD COLUMN     "delegation" TEXT,
ADD COLUMN     "detailedAddress" TEXT,
ADD COLUMN     "governorate" TEXT;

-- AlterTable
ALTER TABLE "Patient" DROP COLUMN "address",
ADD COLUMN     "delegation" TEXT,
ADD COLUMN     "detailedAddress" TEXT,
ADD COLUMN     "governorate" TEXT;
