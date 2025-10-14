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
    switch (req.method) {
      case 'GET':
        const locations = await prisma.stockLocation.findMany({
          where: {
            isActive: true,
          },
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
          orderBy: {
            name: 'asc',
          },
        });
        return res.status(200).json(locations);

      case 'POST':
        const { name, description, userId } = req.body;

        // Check if location with this name already exists
        const existingLocation = await prisma.stockLocation.findUnique({
          where: {
            name,
          },
        });

        if (existingLocation) {
          return res.status(400).json({ error: 'A location with this name already exists' });
        }

        // Create new stock location
        const newLocation = await prisma.stockLocation.create({
          data: {
            name,
            description,
            userId: userId || undefined,
            isActive: true,
          },
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        });

        return res.status(201).json(newLocation);

      default:
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }
  } catch (error) {
    console.error('Request error:', error);
    res.status(500).json({ error: 'Error processing your request' });
  }
}
