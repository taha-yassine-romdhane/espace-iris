import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import prisma from '@/lib/db';

/**
 * API endpoint that returns users in a format optimized for dropdown menus and selects
 * Includes name formatting and active filtering
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Check authentication
  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get query parameters
    const { role, active = 'true' } = req.query;
    const isActive = active === 'true';

    // Build where clause
    const where: any = {};
    
    // Filter by active status
    if (active !== 'all') {
      where.isActive = isActive;
    }
    
    // Filter by role if specified
    if (role && typeof role === 'string') {
      where.role = role.toUpperCase();
    }

    // Fetch users
    const users = await prisma.user.findMany({
      where,
      orderBy: [
        { firstName: 'asc' },
        { lastName: 'asc' }
      ],
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        telephone: true,
        role: true,
        isActive: true,
        speciality: true,
        address: true,
      },
    });

    // Transform users to include formatted name
    const formattedUsers = users.map(user => ({
      id: user.id,
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
      email: user.email,
      telephone: user.telephone || '',
      role: user.role,
      isActive: user.isActive,
      speciality: user.speciality || '',
      address: user.address || '',
    }));

    return res.status(200).json(formattedUsers);
  } catch (error) {
    console.error('Error fetching formatted users:', error);
    return res.status(500).json({ error: 'Failed to fetch users' });
  }
}
