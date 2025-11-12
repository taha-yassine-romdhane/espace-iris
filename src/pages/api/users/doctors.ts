import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/db';
import { Role } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const doctors = await prisma.user.findMany({
      where: {
        role: Role.DOCTOR,
        isActive: true
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        speciality: true
      },
      orderBy: {
        firstName: 'asc'
      }
    });

    const transformedDoctors = doctors.map(doctor => ({
      id: doctor.id,
      name: `${doctor.firstName} ${doctor.lastName}`.trim(),
      speciality: doctor.speciality
    }));

    return res.status(200).json(transformedDoctors);
  } catch (error) {
    console.error('Error fetching doctors:', error);
    return res.status(500).json({ error: 'Failed to fetch doctors' });
  }
}
