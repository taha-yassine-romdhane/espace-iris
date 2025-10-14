-- CreateTable
CREATE TABLE "RepairSparePart" (
    "id" TEXT NOT NULL,
    "repairId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RepairSparePart_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RepairSparePart_repairId_productId_key" ON "RepairSparePart"("repairId", "productId");

-- AddForeignKey
ALTER TABLE "RepairSparePart" ADD CONSTRAINT "RepairSparePart_repairId_fkey" FOREIGN KEY ("repairId") REFERENCES "RepairLog"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepairSparePart" ADD CONSTRAINT "RepairSparePart_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
