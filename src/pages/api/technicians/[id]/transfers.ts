import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid technician ID' });
  }

  if (req.method === 'GET') {
    try {
      // First get the technician to find the associated user
      const technician = await prisma.technician.findUnique({
        where: { id },
        include: { user: true }
      });

      if (!technician) {
        return res.status(404).json({ error: 'Technician not found' });
      }

      // Get all stock transfers where this technician is involved
      const transfers = await prisma.stockTransfer.findMany({
        where: {
          OR: [
            { transferredById: technician.userId },
            { sentById: technician.userId },
            { receivedById: technician.userId }
          ]
        },
        include: {
          fromLocation: true,
          toLocation: true,
          product: true,
          transferredBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          }
        },
        orderBy: {
          transferDate: 'desc'
        }
      });

      return res.status(200).json(transfers);
    } catch (error) {
      console.error('Error fetching technician transfers:', error);
      return res.status(500).json({ error: 'Error fetching technician transfers' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
