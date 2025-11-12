import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Get active rentals count
    const activeRentals = await prisma.rental.count({
      where: {
        status: 'ACTIVE',
      },
    });

    // Get pending rentals count
    const pendingRentals = await prisma.rental.count({
      where: {
        status: 'PENDING',
      },
    });

    // Get CNAM rentals (rentals with CNAM bons)
    const cnamRentals = await prisma.rental.count({
      where: {
        cnamBons: {
          some: {},
        },
      },
    });

    // Calculate monthly revenue from rental periods
    const rentalPeriods = await prisma.rentalPeriod.findMany({
      where: {
        startDate: {
          gte: startOfMonth,
        },
        endDate: {
          lte: endOfMonth,
        },
      },
      select: {
        expectedAmount: true,
      },
    });

    const monthlyRevenue = rentalPeriods.reduce(
      (sum, period) => sum + Number(period.expectedAmount),
      0
    );

    // Get total rentals
    const totalRentals = await prisma.rental.count();

    // Get completed rentals
    const completedRentals = await prisma.rental.count({
      where: {
        status: 'COMPLETED',
      },
    });

    return res.status(200).json({
      activeRentals,
      pendingRentals,
      cnamRentals,
      monthlyRevenue,
      totalRentals,
      completedRentals,
    });
  } catch (error) {
    console.error('Error fetching rental statistics:', error);
    return res.status(500).json({ error: 'Failed to fetch statistics' });
  }
}
