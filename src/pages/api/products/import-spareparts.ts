import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { prisma } from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user?.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { spareParts } = req.body;

    if (!Array.isArray(spareParts) || spareParts.length === 0) {
      return res.status(400).json({ error: 'Invalid spare parts data' });
    }

    // Validate and import spare parts
    const results = [];
    let imported = 0;
    const errors = [];

    for (let i = 0; i < spareParts.length; i++) {
      const sparePart = spareParts[i];
      
      try {
        // Create the product first
        const product = await prisma.product.create({
          data: {
            name: sparePart.name,
            type: 'SPARE_PART',
            brand: sparePart.brand,
            model: sparePart.model,
            stockLocation: sparePart.stockLocationId ? {
              connect: { id: sparePart.stockLocationId }
            } : undefined,
            purchasePrice: sparePart.purchasePrice,
            sellingPrice: sparePart.sellingPrice,
            status: 'ACTIVE', // Products use ProductStatus enum
          },
        });

        // Create stock entry if stockLocationId is provided
        if (sparePart.stockLocationId && sparePart.stockQuantity > 0) {
          await prisma.stock.create({
            data: {
              productId: product.id,
              locationId: sparePart.stockLocationId,
              quantity: sparePart.stockQuantity,
              status: sparePart.status || 'FOR_SALE', // Stock uses StockStatus enum
            },
          });
        }

        imported++;
        results.push({ success: true, productId: product.id });
        
      } catch (error) {
        console.error(`Error importing spare part ${i + 1}:`, error);
        errors.push({
          row: i + 1,
          name: sparePart.name,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    res.status(200).json({
      imported,
      total: spareParts.length,
      errors: errors.length > 0 ? errors : undefined,
    });

  } catch (error) {
    console.error('Import spare parts error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}