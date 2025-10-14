/*
  Warnings:

  - The `status` column on the `MedicalDevice` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `status` column on the `Product` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "ProductStatus" AS ENUM ('ACTIVE', 'MAINTENANCE', 'RETIRED', 'SOLD');

-- AlterEnum
ALTER TYPE "DeviceStatus" ADD VALUE 'SOLD';

-- AlterTable
ALTER TABLE "MedicalDevice" DROP COLUMN "status",
ADD COLUMN     "status" "DeviceStatus" NOT NULL DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE "Product" DROP COLUMN "status",
ADD COLUMN     "status" "ProductStatus" NOT NULL DEFAULT 'ACTIVE';
