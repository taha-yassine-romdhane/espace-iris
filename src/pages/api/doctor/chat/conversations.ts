import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';
import { prisma } from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session || !session.user) {
      return res.status(401).json({ error: 'Non autorisé' });
    }

    if (session.user.role !== 'DOCTOR') {
      return res.status(403).json({ error: 'Accès refusé' });
    }

    if (req.method === 'GET') {
      // For now, return empty conversations array since we don't have a chat system in the DB yet
      // This is a placeholder implementation
      const conversations: any[] = [];

      return res.status(200).json({
        conversations,
        total: 0
      });
    }

    if (req.method === 'POST') {
      const { participantId } = req.body;

      if (!participantId) {
        return res.status(400).json({ error: 'ID du participant requis' });
      }

      // Verify the participant exists and is valid
      const participant = await prisma.user.findUnique({
        where: { 
          id: participantId,
          role: { in: ['ADMIN', 'EMPLOYEE', 'MANAGER'] },
          isActive: true
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true,
          isActive: true,
          updatedAt: true
        }
      });

      if (!participant) {
        return res.status(404).json({ error: 'Participant non trouvé' });
      }

      // Create a mock conversation since we don't have a real chat system in the DB yet
      const mockConversation = {
        id: `conv_${Date.now()}_${session.user.id}_${participantId}`,
        participants: [
          {
            id: session.user.id,
            name: (session.user as any).firstName && (session.user as any).lastName ? `${(session.user as any).firstName} ${(session.user as any).lastName}` : session.user.name || 'Utilisateur',
            email: session.user.email,
            role: session.user.role,
            isActive: true
          },
          {
            id: participant.id,
            name: `${participant.firstName} ${participant.lastName}`,
            email: participant.email,
            role: participant.role,
            isActive: participant.isActive
          }
        ],
        unreadCount: 0,
        updatedAt: new Date().toISOString()
      };

      return res.status(200).json({
        conversation: mockConversation
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('Error handling conversations:', error);
    return res.status(500).json({ 
      error: 'Erreur lors du traitement des conversations' 
    });
  }
}