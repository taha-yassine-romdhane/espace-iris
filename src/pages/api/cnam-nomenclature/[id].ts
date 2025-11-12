import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid ID' });
  }

  try {
    if (req.method === 'GET') {
      const item = await prisma.cNAMNomenclature.findUnique({
        where: { id },
      });

      if (!item) {
        return res.status(404).json({ error: 'CNAM nomenclature not found' });
      }

      return res.status(200).json(item);
    }

    if (req.method === 'PUT') {
      const { bonType, category, amount, monthlyRate, description, isActive } = req.body;

      const item = await prisma.cNAMNomenclature.update({
        where: { id },
        data: {
          ...(bonType && { bonType }),
          ...(category && { category }),
          ...(amount !== undefined && { amount: parseFloat(amount) }),
          ...(monthlyRate !== undefined && { monthlyRate: parseFloat(monthlyRate) }),
          ...(description !== undefined && { description }),
          ...(isActive !== undefined && { isActive }),
        },
      });

      return res.status(200).json(item);
    }

    if (req.method === 'DELETE') {
      await prisma.cNAMNomenclature.delete({
        where: { id },
      });

      return res.status(200).json({ message: 'CNAM nomenclature deleted successfully' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Error in cnam-nomenclature/[id] API:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
