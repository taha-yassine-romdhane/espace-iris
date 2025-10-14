import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import prisma from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Check authentication
  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ error: 'Vous devez être connecté pour accéder à cette ressource' });
  }

  // Only allow POST method
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'ID de tâche invalide' });
  }

  try {
    // Find the task
    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        diagnostic: true,
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        completedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (!task) {
      return res.status(404).json({ error: 'Tâche non trouvée' });
    }

    // Update the task status to COMPLETED
    const updatedTask = await prisma.task.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        completedBy: {
          connect: { id: session.user.id },
        },
      },
    });

    // If this task is related to a diagnostic, update the notification as well
    if (task.diagnostic) {
      await prisma.notification.updateMany({
        where: {
          type: 'FOLLOW_UP',
          relatedId: task.id,
        },
        data: {
          status: 'READ',
          readAt: new Date(),
        },
      });
    }

    // Return the updated task
    return res.status(200).json(updatedTask);
  } catch (error) {
    console.error('Error completing task:', error);
    return res.status(500).json({ error: 'Une erreur est survenue lors de la complétion de la tâche' });
  }
}