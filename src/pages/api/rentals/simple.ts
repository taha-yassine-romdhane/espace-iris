import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import prisma from '@/lib/db';
import { generateRentalCode } from '@/utils/idGenerator';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    try {
      // Build where clause based on user role
      const where: any = {};

      // If user is EMPLOYEE, only show rentals they created or are assigned to
      if (session.user.role === 'EMPLOYEE') {
        where.OR = [
          { createdById: session.user.id },
          { assignedToId: session.user.id }
        ];
      }

      const rentals = await prisma.rental.findMany({
        where,
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
              deviceCode: true,
              rentalPrice: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      // Map to match frontend expectations
      const formattedRentals = rentals.map(rental => ({
        id: rental.id,
        patientId: rental.patientId,
        deviceId: rental.medicalDeviceId,
        startDate: rental.startDate.toISOString().split('T')[0],
        endDate: rental.endDate ? rental.endDate.toISOString().split('T')[0] : null,
        monthlyRate: Number(rental.medicalDevice.rentalPrice || 0),
        status: rental.endDate && new Date() > rental.endDate ? 'ENDED' : 'ACTIVE',
        patient: rental.patient,
        device: rental.medicalDevice,
      }));

      return res.status(200).json(formattedRentals);
    } catch (error) {
      console.error('Error fetching rentals:', error);
      return res.status(500).json({ error: 'Failed to fetch rentals' });
    }
  }

  if (req.method === 'POST') {
    try {
      const { patientId, deviceId, startDate, endDate, monthlyRate, status } = req.body;

      if (!patientId || !deviceId || !startDate) {
        return res.status(400).json({ error: 'Missing required fields: patientId, deviceId, startDate' });
      }

      const rentalCode = await generateRentalCode(prisma as any);

      const rental = await prisma.rental.create({
        data: {
          rentalCode,
          medicalDeviceId: deviceId,
          patientId,
          startDate: new Date(startDate),
          endDate: endDate ? new Date(endDate) : null,
          createdById: session.user?.id || null,
        },
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
              deviceCode: true,
              rentalPrice: true,
            },
          },
        },
      });

      return res.status(201).json({
        id: rental.id,
        patientId: rental.patientId,
        deviceId: rental.medicalDeviceId,
        startDate: rental.startDate.toISOString().split('T')[0],
        endDate: rental.endDate ? rental.endDate.toISOString().split('T')[0] : null,
        monthlyRate: Number(rental.medicalDevice.rentalPrice || 0),
        status: 'ACTIVE',
        patient: rental.patient,
        device: rental.medicalDevice,
      });
    } catch (error) {
      console.error('Error creating rental:', error);
      return res.status(500).json({ error: 'Failed to create rental' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
