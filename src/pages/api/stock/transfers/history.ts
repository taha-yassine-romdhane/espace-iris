import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]';
import prisma from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    try {
      const { startDate, endDate, locationId, search } = req.query;

      const transfers = await prisma.stockTransfer.findMany({
        where: {
          ...(startDate && endDate ? {
            transferDate: {
              gte: new Date(startDate as string),
              lte: new Date(endDate as string)
            }
          } : {}),
          ...(locationId ? {
            OR: [
              { fromLocationId: locationId as string },
              { toLocationId: locationId as string }
            ]
          } : {}),
          ...(search ? {
            OR: [
              { product: { name: { contains: search as string, mode: 'insensitive' } } },
              { product: { brand: { contains: search as string, mode: 'insensitive' } } },
              { product: { model: { contains: search as string, mode: 'insensitive' } } },
              { fromLocation: { name: { contains: search as string, mode: 'insensitive' } } },
              { toLocation: { name: { contains: search as string, mode: 'insensitive' } } }
            ]
          } : {})
        },
        include: {
          fromLocation: {
            select: {
              name: true,
            }
          },
          toLocation: {
            select: {
              name: true,
            }
          },
          product: {
            select: {
              name: true,
              id: true,
              type: true,
              brand: true,
              model: true,
            }
          },
          transferredBy: {
            select: {
              firstName: true,
              lastName: true,
            }
          },
          sentBy: {
            select: {
              firstName: true,
              lastName: true,
            }
          },
          receivedBy: {
            select: {
              firstName: true,
              lastName: true,
            }
          }
        },
        orderBy: {
          transferDate: 'desc'
        }
      });

      return res.status(200).json(transfers);
    } catch (error) {
      console.error('Error fetching transfers:', error);
      return res.status(500).json({ error: 'Failed to fetch transfers' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
