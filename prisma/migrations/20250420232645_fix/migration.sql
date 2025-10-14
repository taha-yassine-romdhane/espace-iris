/*
  Warnings:

  - The values [CONJOINT_ENFANT] on the enum `BeneficiaryType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "BeneficiaryType_new" AS ENUM ('ASSURE_SOCIAL', 'CONJOINT', 'ENFANT', 'ASSANDANT');
ALTER TABLE "Patient" ALTER COLUMN "beneficiaryType" TYPE "BeneficiaryType_new" USING ("beneficiaryType"::text::"BeneficiaryType_new");
ALTER TYPE "BeneficiaryType" RENAME TO "BeneficiaryType_old";
ALTER TYPE "BeneficiaryType_new" RENAME TO "BeneficiaryType";
DROP TYPE "BeneficiaryType_old";
COMMIT;
