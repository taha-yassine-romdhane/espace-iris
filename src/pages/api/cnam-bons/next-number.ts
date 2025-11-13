import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import prisma from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    return res.status(401).json({ error: 'Non autorisé' });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  try {
    const { category } = req.query;

    // Validate category
    if (!category || (category !== 'LOCATION' && category !== 'ACHAT')) {
      return res.status(400).json({ error: 'Catégorie invalide. Doit être LOCATION ou ACHAT' });
    }

    // Get current year
    const currentYear = new Date().getFullYear();

    // Define prefix based on category
    const prefix = category === 'LOCATION' ? 'BL' : 'BA';

    // Get the latest bond number for this category and year
    const latestBond = await prisma.cNAMBonRental.findFirst({
      where: {
        category: category as string,
        bonNumber: {
          startsWith: `${prefix}-${currentYear}-`,
        },
      },
      orderBy: {
        bonNumber: 'desc',
      },
    });

    let nextNumber = 1;

    if (latestBond && latestBond.bonNumber) {
      // Extract the number from the bond number (format: BL-2025-0001)
      const match = latestBond.bonNumber.match(/-(\d+)$/);
      if (match) {
        nextNumber = parseInt(match[1], 10) + 1;
      }
    }

    // Format the new bond number with leading zeros (4 digits)
    const bonNumber = `${prefix}-${currentYear}-${nextNumber.toString().padStart(4, '0')}`;

    return res.status(200).json({ bonNumber });
  } catch (error) {
    console.error('Error generating next bond number:', error);
    return res.status(500).json({ error: 'Erreur lors de la génération du numéro de bond' });
  }
}
