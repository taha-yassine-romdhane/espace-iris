import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    if (req.method === 'GET') {
      // Fetch diagnostic devices (medical devices with type DIAGNOSTIC_DEVICE)
      const diagnosticDevices = await prisma.medicalDevice.findMany({
        where: {
          type: 'DIAGNOSTIC_DEVICE',
          status: 'ACTIVE'
        },
        include: {
          stockLocation: true,
        }
      });

      // Transform diagnostic devices
      const transformedDiagnostics = diagnosticDevices.map(device => ({
        id: device.id,
        deviceCode: device.deviceCode,
        name: device.name,
        type: device.type,
        brand: device.brand,
        model: device.model,
        serialNumber: device.serialNumber,
        rentalPrice: device.rentalPrice,
        purchasePrice: device.purchasePrice,
        sellingPrice: device.sellingPrice,
        technicalSpecs: device.technicalSpecs,
        description: device.description,
        destination: device.destination,
        stockLocation: device.stockLocation,
        stockLocationId: device.stockLocationId,
        stockQuantity: device.stockQuantity || 1,
        status: device.status,
        configuration: device.configuration,
        location: device.location
      }));

      return res.status(200).json(transformedDiagnostics);
    }

    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  } catch (error: any) {
    console.error('API Error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
