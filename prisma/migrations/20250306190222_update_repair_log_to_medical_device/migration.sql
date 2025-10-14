/*
  Warnings:

  - You are about to drop the column `alertThreshold` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `availableForRent` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `maxStock` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `minStock` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `purchasePrice` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `rentalPrice` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `requiresMaintenance` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `sellingPrice` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `specifications` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `totalCost` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `warranty` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `productId` on the `RepairLog` table. All the data in the column will be lost.
  - Added the required column `medicalDeviceId` to the `RepairLog` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "RepairLog" DROP CONSTRAINT "RepairLog_productId_fkey";

-- AlterTable
ALTER TABLE "Product" DROP COLUMN "alertThreshold",
DROP COLUMN "availableForRent",
DROP COLUMN "description",
DROP COLUMN "maxStock",
DROP COLUMN "minStock",
DROP COLUMN "purchasePrice",
DROP COLUMN "rentalPrice",
DROP COLUMN "requiresMaintenance",
DROP COLUMN "sellingPrice",
DROP COLUMN "specifications",
DROP COLUMN "totalCost",
DROP COLUMN "warranty",
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "purchaseDate" TIMESTAMP(3),
ADD COLUMN     "status" "DeviceStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "stockLocationId" TEXT,
ADD COLUMN     "warrantyExpiration" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "RepairLog" DROP COLUMN "productId",
ADD COLUMN     "medicalDeviceId" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_stockLocationId_fkey" FOREIGN KEY ("stockLocationId") REFERENCES "StockLocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepairLog" ADD CONSTRAINT "RepairLog_medicalDeviceId_fkey" FOREIGN KEY ("medicalDeviceId") REFERENCES "MedicalDevice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
