import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const employees = await prisma.user.findMany({
      where: {
        role: {
          in: ['EMPLOYEE', 'MANAGER']
        }
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        _count: {
          select: {
            assignedPatients: true,
            technicianPatients: true,
            performedDiagnostics: true,
            processedSales: true,
            assignedAppointments: true,
            userActions: true
          }
        }
      },
      orderBy: [
        { isActive: 'desc' },
        { firstName: 'asc' }
      ]
    });

    res.status(200).json(employees);
  } catch (error) {
    console.error('Error fetching employee stats:', error);
    res.status(500).json({ message: 'Internal server error' });
  } finally {
    await prisma.$disconnect();
  }
}