import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { id } = req.query;

  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid ID' });
  }

  try {
    if (req.method === 'PUT') {
      const { rentalId, productId, quantity, unitPrice } = req.body;

      // Build update data object, only including fields that are provided
      const updateData: any = {};

      if (rentalId !== undefined) updateData.rentalId = rentalId;
      if (productId !== undefined) updateData.productId = productId;
      if (quantity !== undefined) updateData.quantity = parseInt(quantity);
      if (unitPrice !== undefined) updateData.unitPrice = parseFloat(unitPrice);

      const accessory = await prisma.rentalAccessory.update({
        where: { id },
        data: updateData,
        include: {
          rental: true,
          product: true,
        },
      });

      return res.status(200).json(accessory);
    }

    if (req.method === 'DELETE') {
      await prisma.rentalAccessory.delete({
        where: { id },
      });

      return res.status(200).json({ message: 'Accessory deleted successfully' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Error in rental-accessories [id] API:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
