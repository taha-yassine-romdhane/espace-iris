import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface ImportRentalData {
  'Nom Complet Patient': string;
  'Numéro de Série Appareil': string;
  'Date de Début (YYYY-MM-DD)': string;
  'Date de Fin (YYYY-MM-DD)'?: string;
  'Statut': string;
  'Prix par Jour (TND)': string;
  'Mode de Tarification'?: string;
  'Dépôt de Garantie (TND)'?: string;
  'Méthode de Dépôt'?: string;
  'Location Urgente'?: string;
  'Notes'?: string;
  rowNumber: number;
}

interface ImportResult {
  imported: number;
  failed: number;
  errors: Array<{
    row: number;
    message: string;
    data?: any;
  }>;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { rentals }: { rentals: ImportRentalData[] } = req.body;

    if (!rentals || !Array.isArray(rentals)) {
      return res.status(400).json({ message: 'Invalid rentals data' });
    }

    const result: ImportResult = {
      imported: 0,
      failed: 0,
      errors: []
    };

    // Process each rental in a transaction
    for (const rentalData of rentals) {
      try {
        await prisma.$transaction(async (tx) => {
          // 1. Find patient by full name
          const fullName = rentalData['Nom Complet Patient'].trim();
          const nameParts = fullName.split(' ');
          
          let patient = null;
          if (nameParts.length >= 2) {
            const firstName = nameParts[0];
            const lastName = nameParts.slice(1).join(' ');
            
            // Try exact match first
            patient = await tx.patient.findFirst({
              where: {
                firstName: { equals: firstName, mode: 'insensitive' },
                lastName: { equals: lastName, mode: 'insensitive' }
              }
            });
            
            // Try alternative matching if exact match fails
            if (!patient) {
              patient = await tx.patient.findFirst({
                where: {
                  OR: [
                    {
                      AND: [
                        { firstName: { contains: firstName, mode: 'insensitive' } },
                        { lastName: { contains: lastName, mode: 'insensitive' } }
                      ]
                    },
                    {
                      AND: [
                        { firstName: { contains: lastName, mode: 'insensitive' } },
                        { lastName: { contains: firstName, mode: 'insensitive' } }
                      ]
                    }
                  ]
                }
              });
            }
          }

          if (!patient) {
            throw new Error(`Patient non trouvé: "${fullName}". Vérifiez que le patient existe dans la base de données.`);
          }

          // 2. Find medical device by serial number
          const serialNumber = rentalData['Numéro de Série Appareil'].trim();
          const medicalDevice = await tx.medicalDevice.findFirst({
            where: {
              serialNumber: { equals: serialNumber, mode: 'insensitive' }
            }
          });

          if (!medicalDevice) {
            throw new Error(`Appareil médical non trouvé avec le numéro de série: "${serialNumber}". Vérifiez que l'appareil existe dans la base de données.`);
          }

          // 3. Check if device is already rented (active rental)
          const existingRental = await tx.rental.findFirst({
            where: {
              medicalDeviceId: medicalDevice.id,
              status: {
                in: ['ACTIVE', 'PENDING']
              }
            }
          });

          if (existingRental) {
            throw new Error(`L'appareil ${serialNumber} est déjà en location active (ID: ${existingRental.id})`);
          }

          // 4. Parse and validate data
          const startDate = new Date(rentalData['Date de Début (YYYY-MM-DD)']);
          const endDate = rentalData['Date de Fin (YYYY-MM-DD)'] 
            ? new Date(rentalData['Date de Fin (YYYY-MM-DD)']) 
            : null;
          
          const dailyPrice = parseFloat(rentalData['Prix par Jour (TND)']);
          const pricingMode = rentalData['Mode de Tarification'] || 'DAILY';
          const depositAmount = rentalData['Dépôt de Garantie (TND)'] 
            ? parseFloat(rentalData['Dépôt de Garantie (TND)']) 
            : 0;
          const depositMethod = rentalData['Méthode de Dépôt'] || 'CASH';
          const urgentRental = rentalData['Location Urgente'] === 'OUI';
          const notes = rentalData['Notes'] || '';

          // 5. Create rental configuration
          const configuration = {
            totalPaymentAmount: dailyPrice,
            depositAmount: depositAmount,
            depositMethod: depositMethod as any,
            urgentRental: urgentRental,
            pricingMode: pricingMode as any,
            dailyPrice: dailyPrice,
            monthlyPrice: pricingMode === 'MONTHLY' ? dailyPrice : dailyPrice * 30,
            notes: notes,
            importedAt: new Date().toISOString(),
            importedFromExcel: true
          };

          // 6. Create the rental
          const rental = await tx.rental.create({
            data: {
              patientId: patient.id,
              medicalDeviceId: medicalDevice.id,
              startDate: startDate,
              endDate: endDate,
              status: rentalData['Statut'] as any,
              configuration: {
                create: configuration
              },
              createdAt: startDate, // Use rental start date as creation date for historical imports
              updatedAt: new Date()
            }
          });

          // 7. Create rental period if dates are provided
          if (startDate && endDate) {
            const periodPrice = pricingMode === 'MONTHLY' 
              ? dailyPrice 
              : dailyPrice * Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

            await tx.rentalPeriod.create({
              data: {
                rentalId: rental.id,
                startDate: startDate,
                endDate: endDate,
                amount: periodPrice,
                paymentMethod: depositMethod as any,
                notes: `Période importée depuis Excel - ${notes}`,
                createdAt: startDate
              }
            });
          }

          console.log(`✅ Rental imported successfully for ${fullName} - ${serialNumber}`);
        });

        result.imported++;

      } catch (error: any) {
        console.error(`❌ Failed to import rental at row ${rentalData.rowNumber}:`, error.message);
        
        result.failed++;
        result.errors.push({
          row: rentalData.rowNumber,
          message: error.message,
          data: {
            patient: rentalData['Nom Complet Patient'],
            device: rentalData['Numéro de Série Appareil']
          }
        });
      }
    }

    console.log(`📊 Import completed: ${result.imported} imported, ${result.failed} failed`);

    if (result.imported === 0 && result.failed > 0) {
      return res.status(400).json({
        message: 'Aucune location n\'a pu être importée',
        ...result
      });
    }

    res.status(200).json({
      message: `Import terminé: ${result.imported} locations importées, ${result.failed} échecs`,
      ...result
    });

  } catch (error: any) {
    console.error('Import error:', error);
    res.status(500).json({ 
      message: 'Erreur lors de l\'importation',
      error: error.message 
    });
  } finally {
    await prisma.$disconnect();
  }
}