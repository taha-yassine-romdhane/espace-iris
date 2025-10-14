import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { prisma } from '@/lib/prisma';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);

    if (!session?.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Get all conversations for the current user using Prisma queries instead of raw SQL
    const userMessages = await prisma.message.findMany({
      where: {
        OR: [
          { senderId: session.user.id },
          { receiverId: session.user.id }
        ],
        receiverId: { not: null }
      },
      select: {
        senderId: true,
        receiverId: true,
        conversationId: true,
        createdAt: true,
        isRead: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Group messages by conversation and get the other user
    const conversationMap = new Map();
    
    userMessages.forEach(message => {
      const otherUserId = message.senderId === session.user.id ? message.receiverId : message.senderId;
      const conversationKey = message.conversationId || `${[session.user.id, otherUserId].sort().join('-')}`;
      
      if (!conversationMap.has(conversationKey)) {
        conversationMap.set(conversationKey, {
          conversationId: conversationKey,
          otherUserId,
          lastMessageAt: message.createdAt,
          unreadCount: 0
        });
      }
      
      const conv = conversationMap.get(conversationKey);
      
      // Update last message time if this message is newer
      if (message.createdAt > conv.lastMessageAt) {
        conv.lastMessageAt = message.createdAt;
      }
      
      // Count unread messages for current user
      if (message.receiverId === session.user.id && !message.isRead) {
        conv.unreadCount++;
      }
    });

    const conversations = Array.from(conversationMap.values()).sort((a, b) => 
      new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
    );

    // Get user details for each conversation
    const conversationsWithUsers = await Promise.all(
      conversations.map(async (conv) => {
        const otherUser = await prisma.user.findUnique({
          where: { id: conv.otherUserId },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true,
            telephone: true
          }
        });

        // Get last message for this conversation
        const lastMessage = await prisma.message.findFirst({
          where: {
            OR: [
              {
                AND: [
                  { senderId: session.user.id },
                  { receiverId: conv.otherUserId }
                ]
              },
              {
                AND: [
                  { senderId: conv.otherUserId },
                  { receiverId: session.user.id }
                ]
              }
            ]
          },
          orderBy: {
            createdAt: 'desc'
          },
          select: {
            id: true,
            content: true,
            createdAt: true,
            senderId: true
          }
        });

        return {
          conversationId: conv.conversationId,
          otherUser,
          lastMessage,
          unreadCount: conv.unreadCount,
          lastMessageAt: conv.lastMessageAt
        };
      })
    );

    return res.status(200).json({ conversations: conversationsWithUsers });
  } catch (error) {
    console.error('Conversations API error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}