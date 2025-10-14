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
      // Fetch messages for the current user
      const { conversationId, receiverId } = req.query;

      let whereClause: any = {
        OR: [
          { senderId: session.user.id },
          { receiverId: session.user.id }
        ]
      };

      // If conversationId is provided, filter by it
      if (conversationId) {
        whereClause.conversationId = conversationId as string;
      }

      // If receiverId is provided, get messages between current user and receiver
      if (receiverId) {
        whereClause = {
          OR: [
            { senderId: session.user.id, receiverId: receiverId as string },
            { senderId: receiverId as string, receiverId: session.user.id }
          ]
        };
      }

      const messages = await prisma.message.findMany({
        where: whereClause,
        include: {
          sender: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              role: true,
              telephone: true
            }
          },
          receiver: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              role: true,
              telephone: true
            }
          },
          replyTo: {
            select: {
              id: true,
              content: true,
              sender: {
                select: {
                  firstName: true,
                  lastName: true
                }
              }
            }
          }
        },
        orderBy: {
          createdAt: 'asc'
        }
      });

      return res.status(200).json({ messages });
    }

    if (req.method === 'POST') {
      // Send a new message
      const { content, receiverId, conversationId, messageType = 'DIRECT', replyToId, attachments } = req.body;

      if (!content || content.trim().length === 0) {
        return res.status(400).json({ message: 'Message content is required' });
      }

      // Generate conversationId if not provided
      let finalConversationId = conversationId;
      if (!finalConversationId && receiverId) {
        // Create a deterministic conversationId based on user IDs
        const sortedIds = [session.user.id, receiverId].sort();
        finalConversationId = `conv_${sortedIds[0]}_${sortedIds[1]}`;
      }

      const message = await prisma.message.create({
        data: {
          content: content.trim(),
          senderId: session.user.id,
          receiverId: receiverId || null,
          conversationId: finalConversationId,
          messageType,
          replyToId: replyToId || null,
          attachments: attachments || null
        },
        include: {
          sender: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              role: true,
              telephone: true
            }
          },
          receiver: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              role: true,
              telephone: true
            }
          },
          replyTo: {
            select: {
              id: true,
              content: true,
              sender: {
                select: {
                  firstName: true,
                  lastName: true
                }
              }
            }
          }
        }
      });

      return res.status(201).json({ message });
    }

    return res.status(405).json({ message: 'Method not allowed' });
  } catch (error) {
    console.error('Messages API error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}