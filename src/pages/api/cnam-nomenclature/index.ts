import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { prisma } from '@/lib/prisma';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const session = await getServerSession(req, res, authOptions);

    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    switch (req.method) {
      case 'GET':
        return await handleGet(req, res);
      case 'POST':
        return await handlePost(req, res, session);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('CNAM Nomenclature API Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function handleGet(req: NextApiRequest, res: NextApiResponse) {
  try {
    const nomenclature = await prisma.cNAMNomenclature.findMany({
      orderBy: [
        { category: 'asc' },
        { bonType: 'asc' }
      ]
    });

    return res.status(200).json(nomenclature);
  } catch (error) {
    console.error('Error fetching nomenclature:', error);
    return res.status(500).json({ error: 'Failed to fetch nomenclature' });
  }
}

async function handlePost(
  req: NextApiRequest,
  res: NextApiResponse,
  session: any
) {
  try {
    const { bonType, category, amount, monthlyRate, description, isActive } = req.body;

    if (!bonType) {
      return res.status(400).json({ error: 'Bond type is required' });
    }

    // Check if nomenclature with this bonType already exists
    const existing = await prisma.cNAMNomenclature.findUnique({
      where: { bonType }
    });

    if (existing) {
      return res.status(400).json({ error: 'Un tarif existe déjà pour ce type de bon' });
    }

    const nomenclature = await prisma.cNAMNomenclature.create({
      data: {
        bonType,
        category: category || 'LOCATION',
        amount: amount || 0,
        monthlyRate: monthlyRate || amount || 0,
        description: description || null,
        isActive: isActive !== false,
        effectiveDate: new Date(),
      }
    });

    return res.status(201).json(nomenclature);
  } catch (error: any) {
    console.error('Error creating nomenclature:', error);

    // Handle unique constraint violation
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Un tarif existe déjà pour ce type de bon' });
    }

    return res.status(500).json({ error: 'Failed to create nomenclature' });
  }
}
