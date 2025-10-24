import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { prisma } from '@/lib/prisma';
import { pusherServer, PUSHER_EVENTS, getPrivateUserChannel } from '@/lib/pusher';

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

    let updatedMessages: any[] = [];

    if (messageIds && Array.isArray(messageIds)) {
      // Get messages before updating to know senders
      const messages = await prisma.message.findMany({
        where: {
          id: { in: messageIds },
          receiverId: session.user.id,
          isRead: false
        },
        select: {
          id: true,
          senderId: true,
          conversationId: true
        }
      });

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

      updatedMessages = messages;
    } else if (conversationId) {
      // Get messages before updating to know senders
      const messages = await prisma.message.findMany({
        where: {
          conversationId,
          receiverId: session.user.id,
          isRead: false
        },
        select: {
          id: true,
          senderId: true,
          conversationId: true
        }
      });

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

      updatedMessages = messages;
    } else {
      return res.status(400).json({ message: 'messageIds or conversationId is required' });
    }

    // Broadcast read receipts to senders
    if (updatedMessages.length > 0) {
      const uniqueSenders = [...new Set(updatedMessages.map(m => m.senderId))];

      for (const senderId of uniqueSenders) {
        try {
          await pusherServer.trigger(
            getPrivateUserChannel(senderId),
            PUSHER_EVENTS.MESSAGE_READ,
            {
              readerId: session.user.id,
              messageIds: updatedMessages.filter(m => m.senderId === senderId).map(m => m.id),
              conversationId: updatedMessages[0].conversationId
            }
          );
        } catch (pusherError) {
          console.error('Pusher broadcast error:', pusherError);
        }
      }
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Mark read API error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}