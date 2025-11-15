import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { id } = req.query;

  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid rental ID' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user?.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    // Fetch rental with all related data counts
    const rental = await prisma.rental.findUnique({
      where: { id },
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        medicalDevice: {
          select: {
            id: true,
            name: true,
            serialNumber: true,
            stockLocation: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        assignedTo: {
          select: {
            stockLocation: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        _count: {
          select: {
            payments: true,
            cnamBons: true,
            accessories: true,
            gaps: true,
          },
        },
      },
    });

    if (!rental) {
      return res.status(404).json({ error: 'Rental not found' });
    }

    // Get current user's stock location for device return
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        role: true,
        stockLocation: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Determine where device will be returned
    let returnLocationName: string | undefined;

    if (currentUser?.role === 'EMPLOYEE' && currentUser.stockLocation) {
      returnLocationName = currentUser.stockLocation.name;
    } else if (rental.assignedTo?.stockLocation) {
      returnLocationName = rental.assignedTo.stockLocation.name;
    } else if (rental.medicalDevice.stockLocation) {
      returnLocationName = rental.medicalDevice.stockLocation.name;
    } else if (currentUser?.stockLocation) {
      returnLocationName = currentUser.stockLocation.name;
    }

    const deletionData = {
      rentalCode: rental.rentalCode || 'N/A',
      patientName: `${rental.patient.firstName} ${rental.patient.lastName}`,
      deviceName: rental.medicalDevice.name,
      deviceSerialNumber: rental.medicalDevice.serialNumber,
      stockLocationName: returnLocationName,
      paymentsCount: rental._count.payments,
      cnamBonsCount: rental._count.cnamBons,
      accessoriesCount: rental._count.accessories,
      gapsCount: rental._count.gaps,
    };

    return res.status(200).json(deletionData);
  } catch (error) {
    console.error('Error in deletion preview API:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
