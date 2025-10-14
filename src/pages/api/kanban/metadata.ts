import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { prisma } from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  
  if (!session) {
    return res.status(401).json({ message: 'Non autorisé' });
  }

  try {
    if (req.method === 'GET') {
      const users = await prisma.user.findMany({
        where: { isActive: true },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true,
          speciality: true
        },
        orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }]
      });

      const stockLocations = await prisma.stockLocation.findMany({
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          description: true
        },
        orderBy: { name: 'asc' }
      });

      const products = await prisma.product.findMany({
        where: { status: 'ACTIVE' },
        select: {
          id: true,
          name: true,
          type: true,
          brand: true
        },
        orderBy: { name: 'asc' }
      });

      const medicalDevices = await prisma.medicalDevice.findMany({
        where: { status: 'ACTIVE' },
        select: {
          id: true,
          name: true,
          type: true,
          brand: true
        },
        orderBy: { name: 'asc' }
      });

      res.status(200).json({
        users,
        stockLocations,
        products,
        medicalDevices
      });
    } else {
      res.setHeader('Allow', ['GET']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    console.error('Kanban Metadata API Error:', error);
    res.status(500).json({ message: 'Erreur interne du serveur' });
  }
}