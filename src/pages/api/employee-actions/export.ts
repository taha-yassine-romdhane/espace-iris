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
      format = 'csv' 
    } = req.query;

    // Build date filter (same logic as employee-actions.ts)
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
            role: true,
            email: true
          }
        }
      },
      orderBy: {
        performedAt: 'desc'
      }
    });

    if (format === 'csv') {
      // Generate CSV
      const headers = [
        'Date/Heure',
        'Employé',
        'Email',
        'Rôle',
        'Type d\'Action',
        'Type d\'Élément',
        'ID Élément',
        'Détails'
      ];

      const csvRows = [
        headers.join(','),
        ...actions.map(action => [
          `"${new Date(action.performedAt).toLocaleString('fr-FR')}"`,
          `"${action.user.firstName} ${action.user.lastName}"`,
          `"${action.user.email}"`,
          `"${action.user.role}"`,
          `"${action.actionType}"`,
          `"${action.relatedItemType || ''}"`,
          `"${action.relatedItemId || ''}"`,
          `"${JSON.stringify(action.details).replace(/"/g, '""')}"`
        ].join(','))
      ];

      const csvContent = csvRows.join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="employee-actions-${new Date().toISOString().split('T')[0]}.csv"`);
      res.status(200).send(csvContent);
    } else {
      // Return JSON by default
      res.status(200).json(actions);
    }
  } catch (error) {
    console.error('Error exporting employee actions:', error);
    res.status(500).json({ message: 'Internal server error' });
  } finally {
    await prisma.$disconnect();
  }
}