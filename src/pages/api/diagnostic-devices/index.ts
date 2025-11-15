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
      const { assignedToMe = 'false' } = req.query;

      // Build query for diagnostic devices only
      const whereClause: any = {
        type: 'DIAGNOSTIC_DEVICE' // Only fetch diagnostic devices
      };

      // If employee wants only assigned devices, filter by their stock location
      if (assignedToMe === 'true') {
        // Get the user's stock location first
        const user = await prisma.user.findUnique({
          where: { id: session.user.id },
          include: { stockLocation: true }
        });

        console.log('Employee diagnostic devices filter - User:', {
          userId: session.user.id,
          hasStockLocation: !!user?.stockLocation,
          stockLocationId: user?.stockLocation?.id,
          stockLocationName: user?.stockLocation?.name
        });

        if (user?.stockLocation) {
          whereClause.stockLocationId = user.stockLocation.id;
          console.log('Filtering diagnostic devices by stockLocationId:', user.stockLocation.id);
        } else {
          // If user has no stock location, return empty array
          whereClause.id = 'non-existent-id'; // This will return no results
          console.log('User has no stock location, returning empty results');
        }
      }

      // Fetch only diagnostic devices from MedicalDevice table
      const diagnosticDevices = await prisma.medicalDevice.findMany({
        where: whereClause,
        include: {
          stockLocation: true,
        },
        orderBy: {
          name: 'asc'
        }
      });

      console.log(`Found ${diagnosticDevices.length} diagnostic devices`);

      // Transform diagnostic devices
      const transformedDevices = diagnosticDevices.map(device => {
        // Check if device is currently reserved
        const now = new Date();
        const isReserved = device.patientId &&
                          device.reservedUntil &&
                          new Date(device.reservedUntil) >= now;

        return {
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
          destination: device.destination,
          stockLocation: (device as any).stockLocation,
          stockLocationId: device.stockLocationId,
          stockQuantity: device.stockQuantity || 1,
          status: device.status,
          warranty: device.warranty,
          description: device.description,
          maintenanceInterval: device.maintenanceInterval,
          configuration: device.configuration,
          installationDate: device.installationDate,
          patientId: device.patientId,
          reservedUntil: device.reservedUntil,
          location: device.location,
          isReserved: isReserved,
        };
      });

      return res.status(200).json(transformedDevices);
    } else {
      res.setHeader('Allow', ['GET']);
      return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }
  } catch (error: any) {
    console.error('API Error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
