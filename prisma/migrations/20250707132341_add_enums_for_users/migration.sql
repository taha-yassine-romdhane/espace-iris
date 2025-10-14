/*
  Warnings:

  - The values [TASK] on the enum `ActionType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "ActionType_new" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'DIAGNOSTIC', 'RENTAL', 'PAYMENT', 'MAINTENANCE', 'APPOINTMENT', 'TASK_CREATION', 'TASK_UPDATE', 'TASK_DELETION', 'SALE', 'TRANSFER');
ALTER TABLE "PatientHistory" ALTER COLUMN "actionType" TYPE "ActionType_new" USING ("actionType"::text::"ActionType_new");
ALTER TABLE "UserActionHistory" ALTER COLUMN "actionType" TYPE "ActionType_new" USING ("actionType"::text::"ActionType_new");
ALTER TYPE "ActionType" RENAME TO "ActionType_old";
ALTER TYPE "ActionType_new" RENAME TO "ActionType";
DROP TYPE "ActionType_old";
COMMIT;
