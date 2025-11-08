import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    if (req.method === 'GET') {
      // Fetch accessories (products with type ACCESSORY)
      const accessories = await prisma.product.findMany({
        where: {
          type: 'ACCESSORY',
          status: 'ACTIVE'
        },
        include: {
          stocks: {
            include: {
              location: true
            }
          }
        }
      });

      // Transform to include total stock quantity
      const transformedAccessories = accessories.map(accessory => ({
        id: accessory.id,
        productCode: accessory.productCode,
        name: accessory.name,
        type: accessory.type,
        brand: accessory.brand,
        model: accessory.model,
        description: accessory.description,
        serialNumber: accessory.serialNumber,
        purchasePrice: accessory.purchasePrice,
        sellingPrice: accessory.sellingPrice,
        minQuantity: accessory.minQuantity,
        partNumber: accessory.partNumber,
        compatibleWith: accessory.compatibleWith,
        status: accessory.status,
        stockQuantity: accessory.stocks.reduce((total, stock) => total + (stock.quantity || 0), 0),
        stocks: accessory.stocks
      }));

      return res.status(200).json(transformedAccessories);
    }

    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  } catch (error: any) {
    console.error('API Error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
