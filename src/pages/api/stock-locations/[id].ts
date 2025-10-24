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

  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid stock location ID' });
  }

  try {
    switch (req.method) {
      case 'PUT':
        const { name, description, userId } = req.body;

        // Check if another location with this name exists
        if (name) {
          const existingLocation = await prisma.stockLocation.findFirst({
            where: {
              name,
              id: {
                not: id,
              },
            },
          });

          if (existingLocation) {
            return res.status(400).json({ error: 'A location with this name already exists' });
          }
        }

        // Update stock location
        const updatedLocation = await prisma.stockLocation.update({
          where: {
            id,
          },
          data: {
            name,
            description,
            userId: userId || null,
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

        return res.status(200).json(updatedLocation);

      case 'DELETE':
        // Before deleting, check if this location has any associated items
        const locationWithItems = await prisma.stockLocation.findUnique({
          where: { id },
          include: {
            stocks: { take: 1 },
            medicalDevices: { take: 1 },
            outgoingTransfers: { take: 1 },
            incomingTransfers: { take: 1 }
          }
        });

        // Prevent deletion if location has associated items
        if (
          (locationWithItems?.stocks && locationWithItems.stocks.length > 0) ||
          (locationWithItems?.medicalDevices && locationWithItems.medicalDevices.length > 0) ||
          (locationWithItems?.outgoingTransfers && locationWithItems.outgoingTransfers.length > 0) ||
          (locationWithItems?.incomingTransfers && locationWithItems.incomingTransfers.length > 0)
        ) {
          return res.status(400).json({
            error: 'Cannot delete location that has associated items (stocks, devices, products, or transfers)'
          });
        }

        // Delete the stock location from the database
        await prisma.stockLocation.delete({
          where: { id }
        });

        return res.status(200).json({ message: 'Stock location deleted successfully', id });

      default:
        res.setHeader('Allow', ['PUT', 'DELETE']);
        return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }
  } catch (error) {
    console.error('Request error:', error);
    res.status(500).json({ error: 'Error processing your request' });
  }
}
