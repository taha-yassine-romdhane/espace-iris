import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
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

    if (!session?.user?.id) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { conversationId, receiverId, isTyping } = req.body;

    if (!conversationId || !receiverId) {
      return res.status(400).json({ message: 'conversationId and receiverId are required' });
    }

    // Broadcast typing indicator to receiver
    try {
      const eventType = isTyping ? PUSHER_EVENTS.TYPING : PUSHER_EVENTS.STOP_TYPING;

      await pusherServer.trigger(
        getPrivateUserChannel(receiverId),
        eventType,
        {
          userId: session.user.id,
          conversationId,
          userName: session.user.name
        }
      );
    } catch (pusherError) {
      console.error('Pusher broadcast error:', pusherError);
      // Don't fail the request if Pusher fails
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Typing indicator API error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
