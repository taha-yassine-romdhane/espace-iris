import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { prisma } from '@/lib/prisma';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const session = await getServerSession(req, res, authOptions);

    if (!session?.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    if (req.method === 'GET') {
      // Count unread messages for the current user
      const unreadCount = await prisma.message.count({
        where: {
          receiverId: session.user.id,
          isRead: false
        }
      });

      return res.status(200).json({ unreadCount });
    }

    return res.status(405).json({ message: 'Method not allowed' });
  } catch (error) {
    console.error('Unread count API error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
