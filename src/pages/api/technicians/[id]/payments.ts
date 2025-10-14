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
      // First get the technician to find the associated user
      const technician = await prisma.technician.findUnique({
        where: { id },
        include: { user: true }
      });

      if (!technician) {
        return res.status(404).json({ error: 'Technician not found' });
      }

      // Get all payments associated with patients or companies that this technician is assigned to
      const payments = await prisma.payment.findMany({
        where: {
          OR: [
            {
              patient: {
                technicianId: technician.userId
              }
            },
            {
              company: {
                technicianId: technician.userId
              }
            }
          ]
        },
        include: {
          patient: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          },
          company: {
            select: {
              id: true,
              companyName: true
            }
          },
          rental: {
            include: {
              medicalDevice: {
                select: {
                  id: true,
                  name: true,
                  type: true
                }
              }
            }
          },
          sale: {
            include: {
              items: {
                include: {
                  medicalDevice: {
                    select: {
                      id: true,
                      name: true,
                      type: true
                    }
                  }
                }
              }
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      return res.status(200).json(payments);
    } catch (error) {
      console.error('Error fetching technician payments:', error);
      return res.status(500).json({ error: 'Error fetching technician payments' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}