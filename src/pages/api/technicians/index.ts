import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    try {
      // First, ensure all EMPLOYEE users have technician records
      const employeeUsers = await prisma.user.findMany({
        where: {
          role: 'EMPLOYEE',
          isActive: true,
          technician: {
            none: {} // Only get users who don't have a technician record yet
          }
        }
      });

      // Create technician records for employees who don't have one
      if (employeeUsers.length > 0) {
        await prisma.$transaction(
          employeeUsers.map((user) =>
            prisma.technician.create({
              data: {
                user: {
                  connect: {
                    id: user.id
                  }
                }
              }
            })
          )
        );
      }

      // Now fetch all technicians
      const technicians = await prisma.technician.findMany({
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              isActive: true
            }
          }
        },
        where: {
          user: {
            isActive: true
          }
        }
      });
      
      return res.status(200).json(technicians);
    } catch (error) {
      console.error('Error managing technicians:', error);
      return res.status(500).json({ error: 'Error managing technicians' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
