import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user?.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (req.method === 'GET') {
      const { page = '1', pageSize = '20', type } = req.query;

      const pageNum = parseInt(page as string);
      const pageSizeNum = parseInt(pageSize as string);
      const skip = (pageNum - 1) * pageSizeNum;

      // Build where clause for filtering
      const where: any = {};

      if (type && type !== 'all') {
        where.type = type;
      }

      // Get total count
      const total = await prisma.stockMovement.count({ where });

      // Get paginated movements
      const movements = await prisma.stockMovement.findMany({
        where,
        include: {
          product: {
            select: {
              id: true,
              name: true,
              productCode: true,
            },
          },
          location: {
            select: {
              id: true,
              name: true,
            },
          },
          createdBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: pageSizeNum,
      });

      const totalPages = Math.ceil(total / pageSizeNum);

      return res.status(200).json({
        movements,
        total,
        page: pageNum,
        pageSize: pageSizeNum,
        totalPages,
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Error in stock-movements API:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
