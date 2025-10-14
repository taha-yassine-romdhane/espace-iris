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

  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  try {
    const { locationId } = req.query;

    if (!locationId || typeof locationId !== 'string') {
      return res.status(400).json({ error: 'Location ID is required' });
    }

    // Fetch medical devices for the specified location
    const medicalDevices = await prisma.medicalDevice.findMany({
      where: {
        stockLocationId: locationId,
      },
      include: {
        stockLocation: {
          select: {
            id: true,
            name: true,
          }
        }
      }
    });

    // Fetch diagnostic devices for the specified location
    const diagnosticDevices = await prisma.medicalDevice.findMany({
      where: {
        stockLocationId: locationId,
        type: 'DIAGNOSTIC_DEVICE',
      },
      include: {
        stockLocation: {
          select: {
            id: true,
            name: true,
          }
        }
      }
    });

    return res.status(200).json({
      medicalDevices,
      diagnosticDevices
    });
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
