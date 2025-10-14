import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import prisma from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method === 'POST') {
    try {
      const { fromLocationId, productId, quantity } = req.body;

      if (!fromLocationId || !productId || !quantity) {
        return res.status(400).json({ 
          error: 'Missing required fields',
          message: 'fromLocationId, productId, and quantity are required'
        });
      }

      // First check if it's a regular product in Stock table
      const stock = await prisma.stock.findFirst({
        where: {
          locationId: fromLocationId,
          productId,
        },
        include: {
          product: {
            select: {
              name: true,
              type: true
            }
          },
          location: {
            select: {
              name: true
            }
          }
        }
      });

      if (stock) {
        // It's a regular product (accessory or spare part)
        const isAvailable = stock.quantity >= quantity;
        return res.status(200).json({
          available: isAvailable,
          reason: isAvailable ? 'Stock available' : 'Insufficient quantity',
          details: {
            hasStock: true,
            availableQuantity: stock.quantity,
            requestedQuantity: quantity,
            productName: stock.product.name,
            locationName: stock.location.name,
            productType: stock.product.type,
            isDevice: false
          }
        });
      }

      // Check if it's a medical device
      const medicalDevice = await prisma.medicalDevice.findFirst({
        where: {
          id: productId,
          stockLocationId: fromLocationId,
          status: { notIn: ['SOLD', 'RETIRED'] } // Can't transfer sold or retired devices
        },
        include: {
          stockLocation: {
            select: {
              name: true
            }
          }
        }
      });

      if (medicalDevice) {
        // Medical devices have quantity of 1
        const isAvailable = quantity === 1;
        return res.status(200).json({
          available: isAvailable,
          reason: isAvailable ? 'Device available' : 'Medical devices can only be transferred one at a time',
          details: {
            hasStock: true,
            availableQuantity: 1,
            requestedQuantity: quantity,
            productName: medicalDevice.name,
            locationName: medicalDevice.stockLocation?.name || 'Non assigné',
            productType: medicalDevice.type,
            isDevice: true
          }
        });
      }

      // Product/device not found
      return res.status(200).json({
        available: false,
        reason: 'Product not found in source location',
        details: {
          hasStock: false,
          availableQuantity: 0,
          requestedQuantity: quantity
        }
      });

    } catch (error) {
      console.error('Error checking stock availability:', error);
      return res.status(500).json({ 
        error: 'Failed to check stock availability',
        message: 'Internal server error'
      });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}