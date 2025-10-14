import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/db';
import type { ProductType } from '@prisma/client';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // CREATE product
    if (req.method === 'POST') {
      const { name, model, brand, serialNumber, type, purchasePrice, sellingPrice, stockLocationId, quantity = 1 } = req.body;

      if (!name || !model || !brand || !type) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const product = await prisma.product.create({
        data: {
          name,
          model,
          brand,
          serialNumber,
          type,
          purchasePrice: purchasePrice ? Number(purchasePrice) : null,
          sellingPrice: sellingPrice ? Number(sellingPrice) : null,
          // Create the initial stock entry if stockLocationId is provided
          stocks: stockLocationId ? {
            create: {
              quantity,
              location: {
                connect: {
                  id: stockLocationId
                }
              }
            }
          } : undefined
        },
        include: {
          stocks: {
            include: {
              location: true
            }
          }
        }
      });

      return res.status(201).json(product);
    }

    // GET products
    if (req.method === 'GET') {
      const type = req.query.type as string;
      
      const products = await prisma.product.findMany({
        where: type ? {
          type: { equals: type as ProductType }
        } : {},
        include: {
          stocks: {
            where: {
              status: 'FOR_SALE'
            },
            include: {
              location: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      const transformedProducts = products.map(product => {
        const primaryStock = product.stocks?.[0];
        
        return {
          id: product.id,
          name: product.name,
          brand: product.brand,
          model: product.model,
          serialNumber: product.serialNumber,
          type: product.type,
          purchasePrice: product.purchasePrice,
          sellingPrice: product.sellingPrice,
          warrantyExpiration: product.warrantyExpiration,
          createdAt: product.createdAt,
          stockLocation: primaryStock?.location || null,
          stockLocationId: primaryStock?.locationId || null,
          stockQuantity: product.stocks?.reduce((total, stock) => total + stock.quantity, 0) || 0,
          stocks: product.stocks, // Include full stocks array for export
          status: product.status || 'ACTIVE' // Use the product's status field directly
        };
      });

      return res.status(200).json(transformedProducts);
    }

    // UPDATE product
    if (req.method === 'PUT') {
      const { id, name, model, brand, serialNumber, purchasePrice, sellingPrice, stockLocationId, quantity = 1 } = req.body;

      if (!id || !name || !model || !brand) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      // First update the product

      // Then handle stock location update if provided
      if (stockLocationId) {
        // Get existing stock for this location
        const existingStock = await prisma.stock.findFirst({
          where: {
            productId: id,
            locationId: stockLocationId
          }
        });

        if (existingStock) {
          // Update existing stock
          await prisma.stock.update({
            where: { id: existingStock.id },
            data: { quantity }
          });
        } else {
          // Create new stock entry
          await prisma.stock.create({
            data: {
              quantity,
              product: {
                connect: { id }
              },
              location: {
                connect: { id: stockLocationId }
              }
            }
          });
        }
      }

      // Fetch the updated product with its stocks
      const finalProduct = await prisma.product.findUnique({
        where: { id },
        include: {
          stocks: {
            include: {
              location: true
            }
          }
        }
      });

      return res.status(200).json(finalProduct);
    }

    // DELETE product
    if (req.method === 'DELETE') {
      const { id } = req.query;

      if (!id) {
        return res.status(400).json({ error: 'Missing product ID' });
      }

      // Delete associated stocks first
      await prisma.stock.deleteMany({
        where: { productId: id as string }
      });

      // Then delete the product
      await prisma.product.delete({
        where: { id: id as string }
      });

      return res.status(200).json({ message: 'Product deleted successfully' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Error in products API:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
