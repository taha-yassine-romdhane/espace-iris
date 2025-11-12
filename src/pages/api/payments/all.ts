import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import prisma from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    try {
      const { source } = req.query;

      // Build where clause
      const where: any = {};

      // Filter by source if provided
      if (source && typeof source === 'string') {
        where.source = source;
      }

      // Get all payments matching criteria
      const payments = await prisma.payment.findMany({
        where,
        include: {
          sale: {
            select: {
              id: true,
              saleCode: true,
              invoiceNumber: true,
              patient: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                },
              },
              company: {
                select: {
                  id: true,
                  companyCode: true,
                  companyName: true,
                },
              },
            },
          },
          rental: {
            select: {
              id: true,
              rentalCode: true,
              patient: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
          paymentDetails: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return res.status(200).json(payments);
    } catch (error) {
      console.error('Error fetching payments:', error);
      return res.status(500).json({ error: 'Failed to fetch payments' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
