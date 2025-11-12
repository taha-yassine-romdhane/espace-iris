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

  switch (req.method) {
    case 'GET':
      try {
        const { locationId, productId } = req.query;

        // If both locationId and productId are provided, get specific stock
        if (locationId && productId && typeof locationId === 'string' && typeof productId === 'string') {
          const stock = await prisma.stock.findUnique({
            where: {
              locationId_productId: {
                locationId,
                productId,
              },
            },
            include: {
              location: true,
              product: true,
            },
          });

          return res.status(200).json({ stock });
        }

        // If only locationId is provided, get all stocks for that location
        if (locationId && typeof locationId === 'string') {
          const stocks = await prisma.stock.findMany({
            where: { locationId },
            include: {
              location: true,
              product: true,
            },
          });

          return res.status(200).json({ stocks });
        }

        // If only productId is provided, get all stocks for that product
        if (productId && typeof productId === 'string') {
          const stocks = await prisma.stock.findMany({
            where: { productId },
            include: {
              location: true,
              product: true,
            },
          });

          return res.status(200).json({ stocks });
        }

        // If no query params, return all stocks
        const stocks = await prisma.stock.findMany({
          include: {
            location: true,
            product: true,
          },
        });

        return res.status(200).json({ stocks });
      } catch (error) {
        console.error('Error fetching stocks:', error);
        return res.status(500).json({ error: 'Failed to fetch stocks' });
      }

    default:
      res.setHeader('Allow', ['GET']);
      return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
}
