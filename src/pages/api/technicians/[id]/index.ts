import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid technician ID' });
  }

  if (req.method === 'GET') {
    try {
      const technician = await prisma.technician.findUnique({
        where: { id },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              isActive: true,
              telephone: true,
              speciality: true
            }
          }
        }
      });

      if (!technician) {
        return res.status(404).json({ error: 'Technician not found' });
      }

      return res.status(200).json(technician);
    } catch (error) {
      console.error('Error fetching technician:', error);
      return res.status(500).json({ error: 'Error fetching technician' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
