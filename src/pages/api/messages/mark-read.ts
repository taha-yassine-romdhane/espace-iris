import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { prisma } from '@/lib/prisma';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);

    if (!session?.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { messageIds, conversationId } = req.body;

    if (messageIds && Array.isArray(messageIds)) {
      // Mark specific messages as read
      await prisma.message.updateMany({
        where: {
          id: { in: messageIds },
          receiverId: session.user.id,
          isRead: false
        },
        data: {
          isRead: true,
          readAt: new Date()
        }
      });
    } else if (conversationId) {
      // Mark all messages in conversation as read
      await prisma.message.updateMany({
        where: {
          conversationId,
          receiverId: session.user.id,
          isRead: false
        },
        data: {
          isRead: true,
          readAt: new Date()
        }
      });
    } else {
      return res.status(400).json({ message: 'messageIds or conversationId is required' });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Mark read API error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}