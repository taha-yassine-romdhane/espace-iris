import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import prisma from '@/lib/db';
import { NotificationType, NotificationStatus } from '@/types/enums';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Get the current user session
    const session = await getServerSession(req, res, authOptions);

    if (!session || !session.user?.email) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    // Find the user and verify they have employee role
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { 
        id: true, 
        role: true,
        firstName: true,
        lastName: true 
      }
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.role !== 'EMPLOYEE' && user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Get query parameters
    const { timeRange = '30', filter = 'all' } = req.query;
    const daysBack = parseInt(timeRange as string);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);

    // Build where clause
    const whereClause: any = {
      userId: user.id,
      createdAt: {
        gte: startDate
      }
    };

    if (filter !== 'all') {
      whereClause.type = filter;
    }

    // Get notifications for this employee
    const notifications = await prisma.notification.findMany({
      where: whereClause,
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        },
        company: {
          select: {
            id: true,
            companyName: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 100
    });

    // Transform notifications to include client information
    const transformedNotifications = notifications.map(notification => {
      let clientName = '';
      let clientType: 'patient' | 'company' | undefined = undefined;
      let clientId = '';

      if (notification.patient) {
        clientName = `${notification.patient.firstName} ${notification.patient.lastName}`;
        clientType = 'patient';
        clientId = notification.patient.id;
      } else if (notification.company) {
        clientName = notification.company.companyName;
        clientType = 'company';
        clientId = notification.company.id;
      }

      // Generate action URL based on notification type
      let actionUrl = '';
      let actionLabel = 'Voir';

      switch (notification.type) {
        case NotificationType.APPOINTMENT:
          actionUrl = '/roles/employee/appointments';
          actionLabel = 'Voir le RDV';
          break;
        case NotificationType.MAINTENANCE:
          actionUrl = '/roles/employee/tasks';
          actionLabel = 'Voir la tâche';
          break;
        case NotificationType.FOLLOW_UP:
          actionUrl = notification.patientId 
            ? `/roles/employee/patients/${notification.patientId}`
            : '/roles/employee/patients';
          actionLabel = 'Voir le patient';
          break;
        default:
          actionUrl = '/roles/employee/dashboard';
          break;
      }

      return {
        id: notification.id,
        type: notification.type,
        priority: notification.status === NotificationStatus.PENDING ? 'HIGH' : 'MEDIUM',
        title: notification.title,
        message: notification.message,
        clientName: clientName || undefined,
        clientType,
        clientId: clientId || undefined,
        actionUrl,
        actionLabel,
        dueDate: notification.dueDate?.toISOString(),
        metadata: notification.metadata,
        isRead: notification.isRead,
        createdAt: notification.createdAt.toISOString(),
        relatedId: notification.relatedId
      };
    });

    // Group notifications by type
    const groupedNotifications = transformedNotifications.reduce((acc, notification) => {
      if (!acc[notification.type]) {
        acc[notification.type] = [];
      }
      acc[notification.type].push(notification);
      return acc;
    }, {} as Record<string, any[]>);

    // Calculate stats
    const stats = {
      total: transformedNotifications.length,
      unread: transformedNotifications.filter(n => !n.isRead).length,
      high: transformedNotifications.filter(n => n.priority === 'HIGH').length,
      medium: transformedNotifications.filter(n => n.priority === 'MEDIUM').length,
      low: transformedNotifications.filter(n => n.priority === 'LOW').length,
      byType: {
        [NotificationType.APPOINTMENT]: groupedNotifications[NotificationType.APPOINTMENT]?.length || 0,
        [NotificationType.MAINTENANCE]: groupedNotifications[NotificationType.MAINTENANCE]?.length || 0,
        [NotificationType.FOLLOW_UP]: groupedNotifications[NotificationType.FOLLOW_UP]?.length || 0,
        [NotificationType.PAYMENT_DUE]: groupedNotifications[NotificationType.PAYMENT_DUE]?.length || 0,
        [NotificationType.OTHER]: groupedNotifications[NotificationType.OTHER]?.length || 0
      }
    };

    return res.status(200).json({
      notifications: transformedNotifications,
      grouped: groupedNotifications,
      stats,
      user: {
        id: user.id,
        name: `${user.firstName} ${user.lastName}`,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Error fetching employee notifications:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}