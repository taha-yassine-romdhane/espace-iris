import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { pusherServer } from '@/lib/pusher';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);

    if (!session?.user?.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const socketId = req.body.socket_id;
    const channel = req.body.channel_name;

    if (!socketId || !channel) {
      return res.status(400).json({ error: 'socket_id and channel_name are required' });
    }

    // Validate that user has access to the channel
    if (channel.startsWith('private-user-')) {
      const userId = channel.replace('private-user-', '');
      if (userId !== session.user.id) {
        return res.status(403).json({ error: 'Forbidden' });
      }
    }

    if (channel.startsWith('private-conversation-')) {
      const conversationId = channel.replace('private-conversation-', '');
      // Verify user is part of this conversation
      const userIds = conversationId.replace('conv_', '').split('_');
      if (!userIds.includes(session.user.id)) {
        return res.status(403).json({ error: 'Forbidden' });
      }
    }

    // For presence channels
    if (channel.startsWith('presence-')) {
      const presenceData = {
        user_id: session.user.id,
        user_info: {
          id: session.user.id,
          name: session.user.name,
          email: session.user.email,
          role: session.user.role,
        },
      };

      const authResponse = pusherServer.authorizeChannel(socketId, channel, presenceData);
      return res.status(200).json(authResponse);
    }

    // For private channels
    const authResponse = pusherServer.authorizeChannel(socketId, channel);
    return res.status(200).json(authResponse);
  } catch (error) {
    console.error('Pusher auth error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
