import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import prisma from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Get the current user session
    const session = await getServerSession(req, res, authOptions);

    if (!session || !session.user?.email) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    // Get the notification ID from the request body
    const { notificationId } = req.body;

    if (!notificationId) {
      return res.status(400).json({ message: 'Notification ID is required' });
    }

    // Find the user ID from the email
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true }
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update the notification as read
    const notification = await prisma.notification.update({
      where: {
        id: notificationId,
        userId: user.id // Ensure the notification belongs to this user
      },
      data: {
        isRead: true,
        readAt: new Date()
      }
    });

    return res.status(200).json({ success: true, notification });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
