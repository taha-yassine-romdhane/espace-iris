import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { prisma } from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user?.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { medicalDevices } = req.body;

    if (!Array.isArray(medicalDevices) || medicalDevices.length === 0) {
      return res.status(400).json({ error: 'Invalid medical devices data' });
    }

    // Validate and import medical devices
    const results = [];
    let imported = 0;
    const errors = [];

    for (let i = 0; i < medicalDevices.length; i++) {
      const device = medicalDevices[i];
      
      try {
        // Check for duplicate serial numbers
        if (device.serialNumber) {
          const existingDevice = await prisma.medicalDevice.findFirst({
            where: {
              serialNumber: device.serialNumber
            }
          });

          if (existingDevice) {
            errors.push({
              row: i + 1,
              name: device.name,
              error: `Numéro de série "${device.serialNumber}" existe déjà`,
            });
            continue;
          }
        }

        // Create the medical device
        const newDevice = await prisma.medicalDevice.create({
          data: {
            deviceCode: device.deviceCode,
            name: device.name,
            type: device.type || 'MEDICAL_DEVICE',
            brand: device.brand,
            model: device.model,
            serialNumber: device.serialNumber,
            description: device.description,
            stockLocation: device.stockLocationId ? {
              connect: { id: device.stockLocationId }
            } : undefined,
            purchasePrice: device.purchasePrice,
            sellingPrice: device.sellingPrice,
            rentalPrice: device.rentalPrice,
            technicalSpecs: device.technicalSpecs,
            warranty: device.warranty,
            maintenanceInterval: device.maintenanceInterval,
            destination: device.destination || 'FOR_SALE',
            status: device.status || 'ACTIVE',
            stockQuantity: device.stockQuantity || 1,
            configuration: device.configuration,
          },
        });

        imported++;
        results.push({ success: true, deviceId: newDevice.id });
        
      } catch (error) {
        console.error(`Error importing medical device ${i + 1}:`, error);
        errors.push({
          row: i + 1,
          name: device.name,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    res.status(200).json({
      imported,
      total: medicalDevices.length,
      errors: errors.length > 0 ? errors : undefined,
    });

  } catch (error) {
    console.error('Import medical devices error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}