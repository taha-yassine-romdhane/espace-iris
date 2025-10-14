import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import prisma from '@/lib/db';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const session = await getServerSession(req, res, authOptions);

  if (!session || !session.user || !session.user.id) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const userId = session.user.id;

    // Get current date ranges for statistics
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfWeek = new Date(now.getTime() - (now.getDay() * 24 * 60 * 60 * 1000));

    // Fetch activity statistics
    const [
      totalPatients,
      totalCompanies,
      recentDiagnostics,
      activeRentals,
      thisMonthSales,
      thisWeekDiagnostics,
      userPatients,
      userCompanies
    ] = await Promise.all([
      // System-wide stats (for admin overview)
      prisma.patient.count(),
      prisma.company.count(),
      prisma.diagnostic.count({
        where: {
          diagnosticDate: {
            gte: startOfWeek
          }
        }
      }),
      prisma.rental.count({
        where: {
          status: 'PENDING' // Active rentals
        }
      }),
      prisma.sale.count({
        where: {
          saleDate: {
            gte: startOfMonth
          }
        }
      }),
      prisma.diagnostic.count({
        where: {
          diagnosticDate: {
            gte: startOfWeek
          }
        }
      }),
      // User-specific stats
      prisma.patient.count({
        where: {
          userId: userId
        }
      }),
      prisma.company.count({
        where: {
          userId: userId
        }
      })
    ]);

    // Get user's last login (this would need to be tracked in your auth system)
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { updatedAt: true }
    });

    const activityStats = {
      // System overview (what admin can see)
      totalPatients,
      totalCompanies,
      recentDiagnostics,
      activeRentals,
      thisMonthSales,
      
      // User-specific data
      myPatients: userPatients,
      myCompanies: userCompanies,
      thisWeekDiagnostics,
      
      // Metadata
      lastLogin: user?.updatedAt?.toISOString() || new Date().toISOString(),
      refreshedAt: new Date().toISOString()
    };

    return res.status(200).json(activityStats);
  } catch (error) {
    console.error('Error fetching activity stats:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
}