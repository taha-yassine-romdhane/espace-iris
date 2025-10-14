import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/db';
import { Role } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const users = await prisma.user.findMany({
      where: {
        role: {
          in: [Role.ADMIN, Role.EMPLOYEE, Role.MANAGER]
        },
        isActive: true
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        role: true
      },
      orderBy: {
        firstName: 'asc'
      }
    });

    const transformedUsers = users.map(user => ({
      id: user.id,
      name: `${user.firstName} ${user.lastName}`.trim(),
      role: user.role
    }));

    return res.status(200).json(transformedUsers);
  } catch (error) {
    console.error('Error fetching technicians:', error);
    return res.status(500).json({ error: 'Failed to fetch technicians' });
  }
}
