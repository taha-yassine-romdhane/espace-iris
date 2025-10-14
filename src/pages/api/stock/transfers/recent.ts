import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Optional: limit and user filtering can be added
    // For now, fetch the 10 most recent transfers
    const transfers = await prisma.stockTransfer.findMany({
      orderBy: { transferDate: 'desc' },
      take: 10,
      include: {
        fromLocation: { select: { name: true } },
        toLocation: { select: { name: true } },
        product: { select: { name: true, type: true } },
        transferredBy: { select: { firstName: true, lastName: true, role: true } },
      },
    });
    return res.status(200).json(transfers);
  } catch (error) {
    console.error('Error fetching recent transfers:', error);
    return res.status(500).json({ message: 'Erreur lors de la récupération des transferts récents' });
  }
}
