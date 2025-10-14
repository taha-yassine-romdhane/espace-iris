-- AlterTable
ALTER TABLE "DatabaseBackup" ADD COLUMN     "format" TEXT NOT NULL DEFAULT 'json',
ADD COLUMN     "source" TEXT NOT NULL DEFAULT 'remote';
