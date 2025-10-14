import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Get total employees
    const totalEmployees = await prisma.user.count({
      where: {
        role: {
          in: ['EMPLOYEE', 'MANAGER']
        }
      }
    });

    // Get active employees
    const activeEmployees = await prisma.user.count({
      where: {
        role: {
          in: ['EMPLOYEE', 'MANAGER']
        },
        isActive: true
      }
    });

    // Get total actions
    const totalActions = await prisma.userActionHistory.count();

    // Get today's actions
    const todayActions = await prisma.userActionHistory.count({
      where: {
        performedAt: {
          gte: startOfDay
        }
      }
    });

    // Get this week's actions
    const thisWeekActions = await prisma.userActionHistory.count({
      where: {
        performedAt: {
          gte: startOfWeek
        }
      }
    });

    // Get this month's actions
    const thisMonthActions = await prisma.userActionHistory.count({
      where: {
        performedAt: {
          gte: startOfMonth
        }
      }
    });

    const stats = {
      totalEmployees,
      activeEmployees,
      totalActions,
      todayActions,
      thisWeekActions,
      thisMonthActions
    };

    res.status(200).json(stats);
  } catch (error) {
    console.error('Error fetching employee stats:', error);
    res.status(500).json({ message: 'Internal server error' });
  } finally {
    await prisma.$disconnect();
  }
}