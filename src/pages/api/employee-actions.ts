import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { 
      employeeId = 'all', 
      dateFilter = 'week', 
      actionType = 'all', 
      limit = '50' 
    } = req.query;

    // Build date filter
    const now = new Date();
    let dateGte: Date | undefined;

    switch (dateFilter) {
      case 'today':
        dateGte = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        startOfWeek.setHours(0, 0, 0, 0);
        dateGte = startOfWeek;
        break;
      case 'month':
        dateGte = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'quarter':
        const quarterStart = Math.floor(now.getMonth() / 3) * 3;
        dateGte = new Date(now.getFullYear(), quarterStart, 1);
        break;
      case 'year':
        dateGte = new Date(now.getFullYear(), 0, 1);
        break;
    }

    // Build where clause
    const whereClause: any = {};

    if (employeeId !== 'all') {
      whereClause.userId = employeeId as string;
    }

    if (actionType !== 'all') {
      whereClause.actionType = actionType as string;
    }

    if (dateGte) {
      whereClause.performedAt = {
        gte: dateGte
      };
    }

    // Only include employees and managers in the user filter (exclude doctors)
    whereClause.user = {
      role: {
        in: ['EMPLOYEE', 'MANAGER']
      }
    };

    const actions = await prisma.userActionHistory.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            role: true
          }
        }
      },
      orderBy: {
        performedAt: 'desc'
      },
      take: parseInt(limit as string)
    });

    res.status(200).json(actions);
  } catch (error) {
    console.error('Error fetching employee actions:', error);
    res.status(500).json({ message: 'Internal server error' });
  } finally {
    await prisma.$disconnect();
  }
}