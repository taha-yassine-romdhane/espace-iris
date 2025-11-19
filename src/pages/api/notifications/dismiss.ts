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

    const { notificationId } = req.body;

    if (!notificationId) {
      return res.status(400).json({ message: 'Notification ID is required' });
    }

    // Update the notification to dismissed status
    const updatedNotification = await prisma.notification.update({
      where: {
        id: notificationId,
        userId: user.id, // Ensure user owns this notification
      },
      data: {
        status: NOTIFICATION_STATUS.DISMISSED,
        isRead: true,
        readAt: new Date(),
      },
    });

    return res.status(200).json({
      message: 'Notification dismissed successfully',
      notification: updatedNotification,
    });
  } catch (error) {
    console.error('Error dismissing notification:', error);

    if ((error as any).code === 'P2025') {
      return res.status(404).json({ message: 'Notification not found or access denied' });
    }

    return res.status(500).json({ message: 'Internal server error' });
  }
}
