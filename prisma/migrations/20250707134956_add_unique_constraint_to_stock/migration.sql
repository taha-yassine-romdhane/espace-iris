/*
  Warnings:

  - A unique constraint covering the columns `[locationId,productId]` on the table `Stock` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Stock_locationId_productId_key" ON "Stock"("locationId", "productId");
