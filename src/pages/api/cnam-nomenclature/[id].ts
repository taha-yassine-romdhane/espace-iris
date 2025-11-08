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

    const { id } = req.query;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'Invalid ID' });
    }

    switch (req.method) {
      case 'GET':
        return await handleGet(id, req, res);
      case 'PUT':
        return await handlePut(id, req, res, session);
      case 'DELETE':
        return await handleDelete(id, req, res, session);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('CNAM Nomenclature API Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function handleGet(
  id: string,
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const nomenclature = await prisma.cNAMNomenclature.findUnique({
      where: { id }
    });

    if (!nomenclature) {
      return res.status(404).json({ error: 'Nomenclature not found' });
    }

    return res.status(200).json(nomenclature);
  } catch (error) {
    console.error('Error fetching nomenclature:', error);
    return res.status(500).json({ error: 'Failed to fetch nomenclature' });
  }
}

async function handlePut(
  id: string,
  req: NextApiRequest,
  res: NextApiResponse,
  session: any
) {
  try {
    const { bonType, category, amount, monthlyRate, description, isActive } = req.body;

    // Check if nomenclature exists
    const existing = await prisma.cNAMNomenclature.findUnique({
      where: { id }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Nomenclature not found' });
    }

    // If changing bonType, check if new bonType already exists
    if (bonType && bonType !== existing.bonType) {
      const duplicate = await prisma.cNAMNomenclature.findUnique({
        where: { bonType }
      });

      if (duplicate) {
        return res.status(400).json({ error: 'Un tarif existe déjà pour ce type de bon' });
      }
    }

    const nomenclature = await prisma.cNAMNomenclature.update({
      where: { id },
      data: {
        ...(bonType !== undefined && { bonType }),
        ...(category !== undefined && { category }),
        ...(amount !== undefined && { amount }),
        ...(monthlyRate !== undefined && { monthlyRate }),
        ...(description !== undefined && { description }),
        ...(isActive !== undefined && { isActive }),
      }
    });

    return res.status(200).json(nomenclature);
  } catch (error: any) {
    console.error('Error updating nomenclature:', error);

    // Handle unique constraint violation
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Un tarif existe déjà pour ce type de bon' });
    }

    return res.status(500).json({ error: 'Failed to update nomenclature' });
  }
}

async function handleDelete(
  id: string,
  req: NextApiRequest,
  res: NextApiResponse,
  session: any
) {
  try {
    // Check if nomenclature exists
    const existing = await prisma.cNAMNomenclature.findUnique({
      where: { id }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Nomenclature not found' });
    }

    await prisma.cNAMNomenclature.delete({
      where: { id }
    });

    return res.status(200).json({ message: 'Nomenclature deleted successfully' });
  } catch (error) {
    console.error('Error deleting nomenclature:', error);
    return res.status(500).json({ error: 'Failed to delete nomenclature' });
  }
}
