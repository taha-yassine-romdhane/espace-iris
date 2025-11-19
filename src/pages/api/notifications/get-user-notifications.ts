import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import prisma from '@/lib/db';

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

    // Find the user ID from the email
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true }
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get notifications for this user with related data
    const notifications = await prisma.notification.findMany({
      where: {
        userId: user.id,
      },
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            patientCode: true,
          }
        },
        company: {
          select: {
            id: true,
            companyName: true,
          }
        }
      },
      orderBy: [
        { isRead: 'asc' },  // Unread first
        { priority: 'desc' }, // Then by priority
        { createdAt: 'desc' } // Then by date
      ],
      take: 10, // Limit to 10 most recent notifications
    });

    // Count unread notifications
    const unreadCount = await prisma.notification.count({
      where: {
        userId: user.id,
        isRead: false,
      }
    });

    // Transform notifications to ensure actionUrl is always present
    const transformedNotifications = notifications.map(notification => {
      let actionUrl = notification.actionUrl;

      // Generate fallback actionUrl if missing (for old notifications)
      if (!actionUrl) {
        // Generate based on notification type and available IDs
        if (notification.patientId) {
          actionUrl = `/roles/admin/renseignement/patient/${notification.patientId}`;
        } else if (notification.companyId) {
          actionUrl = `/roles/admin/renseignement/company/${notification.companyId}`;
        } else {
          actionUrl = '/roles/admin/dashboard';
        }
      }

      return {
        ...notification,
        actionUrl,
      };
    });

    return res.status(200).json({
      notifications: transformedNotifications,
      unreadCount
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
