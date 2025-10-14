-- CreateTable
CREATE TABLE "MedicalDeviceParametre" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "deviceType" TEXT NOT NULL,
    "pressionRampe" TEXT,
    "dureeRampe" INTEGER,
    "autoRampe" BOOLEAN,
    "pression" TEXT,
    "autoPression" BOOLEAN,
    "dureeRampe2" INTEGER,
    "epr" TEXT,
    "ipap" TEXT,
    "epap" TEXT,
    "aid" TEXT,
    "frequenceRespiratoire" TEXT,
    "volumeCourant" TEXT,
    "mode" TEXT,
    "debit" TEXT,
    "patientId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MedicalDeviceParametre_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "MedicalDeviceParametre" ADD CONSTRAINT "MedicalDeviceParametre_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "MedicalDevice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicalDeviceParametre" ADD CONSTRAINT "MedicalDeviceParametre_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE SET NULL ON UPDATE CASCADE;
