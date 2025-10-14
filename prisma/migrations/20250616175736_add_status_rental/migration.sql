-- CreateEnum
CREATE TYPE "RentalStatus" AS ENUM ('PENDING', 'COMPLETED', 'CANCELLED', 'EXPIRED');

-- AlterTable
ALTER TABLE "Rental" ADD COLUMN     "invoiceNumber" TEXT,
ADD COLUMN     "status" "RentalStatus" NOT NULL DEFAULT 'PENDING';
