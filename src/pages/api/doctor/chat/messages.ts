import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';
import { prisma } from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session || !session.user) {
      return res.status(401).json({ error: 'Non autorisé' });
    }

    if (session.user.role !== 'DOCTOR') {
      return res.status(403).json({ error: 'Accès refusé' });
    }

    const { conversationId, content, messageType } = req.body;

    if (!conversationId || !content) {
      return res.status(400).json({ error: 'Données manquantes' });
    }

    // For now, return a mock message since we don't have a chat system in the DB yet
    // This is a placeholder implementation
    const mockMessage = {
      id: `msg_${Date.now()}`,
      content,
      senderId: session.user.id,
      receiverId: 'admin_user_id',
      createdAt: new Date().toISOString(),
      isRead: false,
      messageType: messageType || 'text'
    };

    return res.status(200).json({
      message: mockMessage,
      success: true
    });

  } catch (error) {
    console.error('Error sending message:', error);
    return res.status(500).json({ 
      error: 'Erreur lors de l\'envoi du message' 
    });
  }
}