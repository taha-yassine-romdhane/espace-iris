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
      // Fetch spare parts (products with type SPARE_PART)
      const spareParts = await prisma.product.findMany({
        where: {
          type: 'SPARE_PART',
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
      const transformedSpareParts = spareParts.map(sparePart => ({
        id: sparePart.id,
        productCode: sparePart.productCode,
        name: sparePart.name,
        type: sparePart.type,
        brand: sparePart.brand,
        model: sparePart.model,
        description: sparePart.description,
        serialNumber: sparePart.serialNumber,
        purchasePrice: sparePart.purchasePrice,
        sellingPrice: sparePart.sellingPrice,
        minQuantity: sparePart.minQuantity,
        partNumber: sparePart.partNumber,
        compatibleWith: sparePart.compatibleWith,
        status: sparePart.status,
        stockQuantity: sparePart.stocks.reduce((total, stock) => total + (stock.quantity || 0), 0),
        stocks: sparePart.stocks
      }));

      return res.status(200).json(transformedSpareParts);
    }

    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  } catch (error: any) {
    console.error('API Error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
