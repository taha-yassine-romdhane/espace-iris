import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import prisma from '@/lib/db';
import { NOTIFICATION_STATUS } from '@/lib/notificationConstants';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);

    if (!session || !session.user?.email) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true }
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const { action, notificationIds } = req.body;

    if (!action) {
      return res.status(400).json({ message: 'Action is required' });
    }

    let result;

    switch (action) {
      case 'DISMISS_ALL':
        // Dismiss all unread notifications for the user
        result = await prisma.notification.updateMany({
          where: {
            userId: user.id,
            isRead: false,
          },
          data: {
            status: NOTIFICATION_STATUS.DISMISSED,
            isRead: true,
            readAt: new Date(),
          },
        });
        return res.status(200).json({
          message: `${result.count} notifications dismissed`,
          count: result.count,
        });

      case 'MARK_ALL_READ':
        // Mark all unread notifications as read
        result = await prisma.notification.updateMany({
          where: {
            userId: user.id,
            isRead: false,
          },
          data: {
            isRead: true,
            readAt: new Date(),
          },
        });
        return res.status(200).json({
          message: `${result.count} notifications marked as read`,
          count: result.count,
        });

      case 'DISMISS_SELECTED':
        // Dismiss specific notifications
        if (!notificationIds || !Array.isArray(notificationIds)) {
          return res.status(400).json({ message: 'Notification IDs array is required' });
        }

        result = await prisma.notification.updateMany({
          where: {
            id: { in: notificationIds },
            userId: user.id, // Ensure user owns these notifications
          },
          data: {
            status: NOTIFICATION_STATUS.DISMISSED,
            isRead: true,
            readAt: new Date(),
          },
        });
        return res.status(200).json({
          message: `${result.count} notifications dismissed`,
          count: result.count,
        });

      case 'MARK_SELECTED_READ':
        // Mark specific notifications as read
        if (!notificationIds || !Array.isArray(notificationIds)) {
          return res.status(400).json({ message: 'Notification IDs array is required' });
        }

        result = await prisma.notification.updateMany({
          where: {
            id: { in: notificationIds },
            userId: user.id,
          },
          data: {
            isRead: true,
            readAt: new Date(),
          },
        });
        return res.status(200).json({
          message: `${result.count} notifications marked as read`,
          count: result.count,
        });

      case 'DELETE_READ':
        // Delete all read notifications (optional - for cleanup)
        result = await prisma.notification.deleteMany({
          where: {
            userId: user.id,
            isRead: true,
          },
        });
        return res.status(200).json({
          message: `${result.count} read notifications deleted`,
          count: result.count,
        });

      default:
        return res.status(400).json({ message: 'Invalid action' });
    }
  } catch (error) {
    console.error('Error performing bulk action:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
