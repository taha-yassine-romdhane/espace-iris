import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import type { Doctor } from '@prisma/client';

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
      const doctors = await prisma.doctor.findMany({
        include: {
          user: {
            select: {
              email: true,
              firstName: true,
              lastName: true,
              telephone: true,
              isActive: true,
            },
          },
        },
      });
      return res.status(200).json(doctors);
    }

    if (req.method === 'POST') {
      try {
        const { email, firstName, lastName, telephone, speciality, password } = req.body;

        // First create the user
        const user = await prisma.user.create({
          data: {
            email,
            password,
            firstName,
            lastName,
            telephone,
            role: 'DOCTOR',
          },
        });

        // Then create the doctor profile
        const doctor = await prisma.doctor.create({
          data: {
            userId: user.id,
          },
          include: {
            user: {
              select: {
                email: true,
                firstName: true,
                lastName: true,
                telephone: true,
                isActive: true,
                speciality: true,
              },
            },
          },
        });

        return res.status(201).json(doctor);
      } catch  {
        return res.status(500).json({ error: 'Error creating doctor' });
      }
    }

    if (req.method === 'PUT') {
      try {
        const { id, email, firstName, lastName, telephone, speciality, isActive } = req.body;

        const doctor = await prisma.doctor.update({
          where: { id },
          data: {
            user: {
              update: {
                email,
                firstName,
                lastName,
                telephone,
                isActive,
                speciality,
              },
            },
          },
          include: {
            user: {
              select: {
                email: true,
                firstName: true,
                lastName: true,
                telephone: true,
                isActive: true,
                speciality: true,
              },
            },
          },
        });

        return res.status(200).json(doctor);
      } catch  {
        return res.status(500).json({ error: 'Error updating doctor' });
      }
    }

    if (req.method === 'DELETE') {
      try {
        const { id } = req.query;

        // First get the doctor to get the userId
        const doctor = await prisma.doctor.findUnique({
          where: { id: String(id) },
        });

        if (!doctor) {
          return res.status(404).json({ error: 'Doctor not found' });
        }

        // Delete the doctor first (due to foreign key constraints)
        await prisma.doctor.delete({
          where: { id: String(id) },
        });

        // Then delete the user
        await prisma.user.delete({
          where: { id: doctor.userId },
        });

        return res.status(200).json({ message: 'Doctor deleted successfully' });
      } catch  {
        return res.status(500).json({ error: 'Error deleting doctor' });
      }
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
