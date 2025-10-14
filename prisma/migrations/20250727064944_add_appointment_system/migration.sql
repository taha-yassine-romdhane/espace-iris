-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('SCHEDULED', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'RESCHEDULED');

-- CreateEnum
CREATE TYPE "AppointmentPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- First, let's backup any existing appointment data
CREATE TABLE IF NOT EXISTS "AppointmentBackup" AS 
SELECT * FROM "Appointment";

-- Drop existing foreign key constraints
ALTER TABLE "Appointment" DROP CONSTRAINT IF EXISTS "Appointment_doctorId_fkey";
ALTER TABLE "Appointment" DROP CONSTRAINT IF EXISTS "Appointment_patientId_fkey";
ALTER TABLE "Appointment" DROP CONSTRAINT IF EXISTS "Appointment_companyId_fkey";

-- Add new columns with default values
ALTER TABLE "Appointment" 
ADD COLUMN IF NOT EXISTS "appointmentType" TEXT DEFAULT 'CONSULTATION',
ADD COLUMN IF NOT EXISTS "scheduledDate" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "duration" INTEGER DEFAULT 60,
ADD COLUMN IF NOT EXISTS "location" TEXT DEFAULT 'Clinique',
ADD COLUMN IF NOT EXISTS "priority" "AppointmentPriority" DEFAULT 'NORMAL',
ADD COLUMN IF NOT EXISTS "status" "AppointmentStatus" DEFAULT 'SCHEDULED',
ADD COLUMN IF NOT EXISTS "assignedToId" TEXT,
ADD COLUMN IF NOT EXISTS "createdById" TEXT;

-- Migrate existing data if any exists
UPDATE "Appointment" 
SET 
    "scheduledDate" = "date",
    "appointmentType" = 'CONSULTATION',
    "location" = 'Clinique',
    "duration" = 60,
    "priority" = 'NORMAL',
    "status" = 'SCHEDULED'
WHERE "scheduledDate" IS NULL AND "date" IS NOT NULL;

-- Update createdById to use a default admin user (you may need to adjust this)
UPDATE "Appointment" 
SET "createdById" = (
    SELECT id FROM "User" WHERE role = 'ADMIN' LIMIT 1
)
WHERE "createdById" IS NULL;

-- Drop old columns
ALTER TABLE "Appointment" DROP COLUMN IF EXISTS "date";
ALTER TABLE "Appointment" DROP COLUMN IF EXISTS "doctorId";

-- Make required columns NOT NULL after migration
ALTER TABLE "Appointment" 
ALTER COLUMN "appointmentType" SET NOT NULL,
ALTER COLUMN "scheduledDate" SET NOT NULL,
ALTER COLUMN "location" SET NOT NULL,
ALTER COLUMN "patientId" DROP NOT NULL;

-- Update createdById to NOT NULL if we have valid data
ALTER TABLE "Appointment" 
ALTER COLUMN "createdById" SET NOT NULL;

-- Create indexes
CREATE INDEX IF NOT EXISTS "Appointment_scheduledDate_idx" ON "Appointment"("scheduledDate");
CREATE INDEX IF NOT EXISTS "Appointment_status_idx" ON "Appointment"("status");
CREATE INDEX IF NOT EXISTS "Appointment_patientId_idx" ON "Appointment"("patientId");
CREATE INDEX IF NOT EXISTS "Appointment_companyId_idx" ON "Appointment"("companyId");
CREATE INDEX IF NOT EXISTS "Appointment_assignedToId_idx" ON "Appointment"("assignedToId");

-- Add new foreign key constraints
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_patientId_fkey" 
FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_assignedToId_fkey" 
FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_createdById_fkey" 
FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Re-add company constraint if it exists
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_companyId_fkey" 
FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Clean up backup table (uncomment if you want to keep the backup)
-- DROP TABLE IF EXISTS "AppointmentBackup";