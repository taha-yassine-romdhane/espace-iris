/*
  Warnings:

  - The `status` column on the `MedicalDevice` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- DropForeignKey
ALTER TABLE "MedicalDevice" DROP CONSTRAINT "MedicalDevice_stockLocationId_fkey";

-- AlterTable
ALTER TABLE "MedicalDevice" ADD COLUMN     "description" TEXT,
ADD COLUMN     "maintenanceInterval" TEXT,
ADD COLUMN     "rentalPrice" DECIMAL(10,2),
DROP COLUMN "status",
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'ACTIVE',
ALTER COLUMN "stockQuantity" SET DEFAULT 1,
ALTER COLUMN "stockLocationId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "availableForRent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "rentalPrice" DECIMAL(10,2),
ADD COLUMN     "requiresMaintenance" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sellingPrice" DECIMAL(10,2),
ADD COLUMN     "specifications" TEXT,
ADD COLUMN     "warranty" TEXT;

-- DropEnum
DROP TYPE "ProductStatus";

-- AddForeignKey
ALTER TABLE "MedicalDevice" ADD CONSTRAINT "MedicalDevice_stockLocationId_fkey" FOREIGN KEY ("stockLocationId") REFERENCES "StockLocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
