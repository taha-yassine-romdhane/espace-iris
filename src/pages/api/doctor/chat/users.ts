import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';
import { prisma } from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
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

    // Fetch admin and employee users for the doctor to chat with
    const users = await prisma.user.findMany({
      where: {
        role: {
          in: ['ADMIN', 'EMPLOYEE', 'MANAGER']
        },
        isActive: true,
        id: {
          not: session.user.id // Exclude the current doctor
        }
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        isActive: true,
        updatedAt: true
      },
      orderBy: [
        { role: 'asc' }, // ADMIN first, then EMPLOYEE, then MANAGER
        { firstName: 'asc' }
      ]
    });

    // Transform the data
    const transformedUsers = users.map(user => ({
      id: user.id,
      name: `${user.firstName} ${user.lastName}`,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      lastSeen: user.updatedAt.toISOString()
    }));

    return res.status(200).json({
      users: transformedUsers,
      total: transformedUsers.length
    });

  } catch (error) {
    console.error('Error fetching users:', error);
    return res.status(500).json({ 
      error: 'Erreur lors du chargement des utilisateurs' 
    });
  }
}