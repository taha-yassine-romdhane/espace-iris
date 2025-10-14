import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id: saleId, itemId } = req.query;
    
    if (!saleId || typeof saleId !== 'string' || !itemId || typeof itemId !== 'string') {
      return res.status(400).json({ error: 'Invalid sale or item ID' });
    }

    switch (req.method) {
      case 'PATCH':
        // Update sale item configuration
        const { deviceConfiguration } = req.body;
        
        // First check if the item exists and belongs to this sale
        const existingItem = await prisma.saleItem.findFirst({
          where: {
            id: itemId,
            saleId: saleId
          }
        });

        if (!existingItem) {
          return res.status(404).json({ error: 'Sale item not found' });
        }

        // For now, we'll store the configuration in the sale item's serialNumber field as JSON
        // In a production system, you'd want to add a proper JSON field to the schema
        const updatedItem = await prisma.saleItem.update({
          where: { id: itemId },
          data: {
            // Store configuration as stringified JSON in warranty field temporarily
            // This is a workaround - in production, add a proper JSON field
            warranty: JSON.stringify({ deviceConfiguration })
          }
        });

        return res.status(200).json({ 
          message: 'Product configuration updated successfully',
          item: updatedItem 
        });

      default:
        res.setHeader('Allow', ['PATCH']);
        return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}