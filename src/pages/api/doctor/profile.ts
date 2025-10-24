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

    if (!session?.user || session.user.role !== 'DOCTOR') {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    if (req.method === 'GET') {
      const user = await prisma.user.findUnique({
        where: {
          id: session.user.id
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          telephone: true,
          speciality: true,
          address: true,
          role: true,
          createdAt: true,
          isActive: true
        }
      });

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      return res.status(200).json(user);
    }

    if (req.method === 'PUT') {
      const { firstName, lastName, telephone, speciality, address } = req.body;

      // Validate required fields
      if (!firstName || !lastName) {
        return res.status(400).json({ message: 'First name and last name are required' });
      }

      // Update user profile (excluding email and password)
      const updatedUser = await prisma.user.update({
        where: {
          id: session.user.id
        },
        data: {
          firstName,
          lastName,
          telephone: telephone || null,
          speciality: speciality || null,
          address: address || null
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          telephone: true,
          speciality: true,
          address: true,
          role: true,
          createdAt: true,
          isActive: true
        }
      });

      return res.status(200).json(updatedUser);
    }

    return res.status(405).json({ message: 'Method not allowed' });
  } catch (error) {
    console.error('Error handling doctor profile:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}