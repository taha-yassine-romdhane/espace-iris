import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { prisma } from '@/lib/prisma';

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
    return res.status(400).json({ error: 'Invalid stock ID' });
  }

  switch (req.method) {
    case 'GET':
      try {
        const stock = await prisma.stock.findUnique({
          where: { id },
          include: {
            product: true,
            location: true,
          },
        });

        if (!stock) {
          return res.status(404).json({ error: 'Stock not found' });
        }

        return res.status(200).json(stock);
      } catch (error) {
        console.error('Error fetching stock:', error);
        return res.status(500).json({ error: 'Failed to fetch stock' });
      }

    case 'PUT':
      try {
        const { quantity, status, locationId } = req.body;

        // Build update data
        const updateData: any = {};

        if (quantity !== undefined) {
          updateData.quantity = parseInt(quantity.toString());
        }

        if (status) {
          updateData.status = status;
        }

        if (locationId) {
          updateData.locationId = locationId;
        }

        // Check if stock exists
        const existingStock = await prisma.stock.findUnique({
          where: { id },
        });

        if (!existingStock) {
          return res.status(404).json({ error: 'Stock not found' });
        }

        // Update stock
        const updatedStock = await prisma.stock.update({
          where: { id },
          data: updateData,
          include: {
            product: true,
            location: true,
          },
        });

        console.log('Stock updated successfully:', updatedStock.id);

        return res.status(200).json(updatedStock);
      } catch (error) {
        console.error('Error updating stock:', error);
        return res.status(500).json({ error: 'Failed to update stock' });
      }

    case 'DELETE':
      try {
        // Check if stock exists
        const existingStock = await prisma.stock.findUnique({
          where: { id },
        });

        if (!existingStock) {
          return res.status(404).json({ error: 'Stock not found' });
        }

        // Delete stock
        await prisma.stock.delete({
          where: { id },
        });

        return res.status(200).json({ message: 'Stock deleted successfully' });
      } catch (error) {
        console.error('Error deleting stock:', error);
        return res.status(500).json({ error: 'Failed to delete stock' });
      }

    default:
      res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
      return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
}
