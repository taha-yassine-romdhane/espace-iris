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

    const { accessories } = req.body;

    if (!Array.isArray(accessories) || accessories.length === 0) {
      return res.status(400).json({ error: 'Invalid accessories data' });
    }

    // Validate and import accessories
    const results = [];
    let imported = 0;
    const errors = [];

    for (let i = 0; i < accessories.length; i++) {
      const accessory = accessories[i];

      try {
        // Create the product first (without stockLocation)
        const product = await prisma.product.create({
          data: {
            name: accessory.name,
            type: 'ACCESSORY',
            brand: accessory.brand,
            model: accessory.model,
            purchasePrice: accessory.purchasePrice,
            sellingPrice: accessory.sellingPrice,
            warrantyExpiration: accessory.warrantyExpiration,
            status: 'ACTIVE', // Products use ProductStatus enum
          },
        });

        // Handle multi-location stock entries
        if (accessory.stockEntries && Array.isArray(accessory.stockEntries) && accessory.stockEntries.length > 0) {
          // Create multiple stock entries (one per location)
          await Promise.all(
            accessory.stockEntries.map((entry: any) =>
              prisma.stock.create({
                data: {
                  productId: product.id,
                  locationId: entry.locationId,
                  quantity: parseInt(entry.quantity.toString()),
                  status: entry.status || 'FOR_SALE',
                },
              })
            )
          );
        }
        // Backwards compatibility: single location format
        else if (accessory.stockLocationId && accessory.stockQuantity > 0) {
          await prisma.stock.create({
            data: {
              productId: product.id,
              locationId: accessory.stockLocationId,
              quantity: accessory.stockQuantity,
              status: accessory.status || 'FOR_SALE',
            },
          });
        }

        imported++;
        results.push({ success: true, productId: product.id });

      } catch (error) {
        console.error(`Error importing accessory ${i + 1}:`, error);
        errors.push({
          row: i + 1,
          name: accessory.name,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    res.status(200).json({
      imported,
      total: accessories.length,
      errors: errors.length > 0 ? errors : undefined,
    });

  } catch (error) {
    console.error('Import accessories error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}