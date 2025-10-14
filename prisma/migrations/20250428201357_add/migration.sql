-- AlterTable
ALTER TABLE "StockTransfer" ADD COLUMN     "isVerified" BOOLEAN,
ADD COLUMN     "verificationDate" TIMESTAMP(3),
ADD COLUMN     "verifiedById" TEXT;

-- AddForeignKey
ALTER TABLE "StockTransfer" ADD CONSTRAINT "StockTransfer_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
