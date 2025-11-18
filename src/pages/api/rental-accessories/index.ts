import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user?.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (req.method === 'GET') {
      // Build where clause based on user role
      const where: any = {};

      // If user is EMPLOYEE, only show accessories for rentals they created or are assigned to
      if (session.user.role === 'EMPLOYEE') {
        where.rental = {
          OR: [
            { createdById: session.user.id },
            { assignedToId: session.user.id }
          ]
        };
      }

      const accessories = await prisma.rentalAccessory.findMany({
        where,
        include: {
          rental: {
            select: {
              rentalCode: true,
              patient: {
                select: {
                  id: true,
                  patientCode: true,
                  firstName: true,
                  lastName: true,
                },
              },
              medicalDevice: {
                select: {
                  name: true,
                  deviceCode: true,
                  serialNumber: true,
                },
              },
            },
          },
          product: {
            select: {
              id: true,
              name: true,
              brand: true,
              model: true,
              productCode: true,
              type: true,
            },
          },
          stockLocation: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return res.status(200).json(accessories);
    }

    if (req.method === 'POST') {
      const { rentalId, productId, stockLocationId, quantity, unitPrice } = req.body;

      console.log('[RENTAL-ACCESSORY-CREATE] Request:', { rentalId, productId, stockLocationId, quantity, unitPrice });

      if (!rentalId || !productId || !quantity) {
        return res.status(400).json({ error: 'Missing required fields: rentalId, productId, quantity' });
      }

      if (!stockLocationId) {
        return res.status(400).json({ error: 'Stock location is required (stockLocationId)' });
      }

      // Start a transaction to ensure data consistency
      const result = await prisma.$transaction(async (tx) => {
        // 1. Get the rental to fetch rentalCode
        const rental = await tx.rental.findUnique({
          where: { id: rentalId },
          select: { rentalCode: true },
        });

        if (!rental) {
          throw new Error('Rental not found');
        }

        // 2. Get the stock for this product at this location
        const stock = await tx.stock.findUnique({
          where: {
            locationId_productId: {
              locationId: stockLocationId,
              productId,
            },
          },
        });

        if (!stock) {
          throw new Error(`No stock found for this product at the selected location`);
        }

        if (stock.quantity < parseInt(quantity)) {
          throw new Error(`Insufficient stock. Available: ${stock.quantity}, Requested: ${quantity}`);
        }

        // 3. Create the rental accessory
        const accessory = await tx.rentalAccessory.create({
          data: {
            rentalId,
            productId,
            stockLocationId,
            quantity: parseInt(quantity),
            unitPrice: parseFloat(unitPrice) || 0,
          },
        });

        // 4. Decrease stock quantity
        await tx.stock.update({
          where: {
            id: stock.id,
          },
          data: {
            quantity: {
              decrement: parseInt(quantity),
            },
          },
        });

        // 5. Create stock movement record (sortie de stock)
        await tx.stockMovement.create({
          data: {
            productId,
            locationId: stockLocationId,
            type: 'SORTIE',
            quantity: parseInt(quantity),
            notes: `Location ${rental.rentalCode} - Accessoire ajouté`,
            createdById: session.user.id,
          },
        });

        console.log('[RENTAL-ACCESSORY-CREATE] Success - Stock decreased and movement created');

        // Return with full relations
        return tx.rentalAccessory.findUnique({
          where: { id: accessory.id },
          include: {
            rental: true,
            product: true,
            stockLocation: true,
          },
        });
      });

      return res.status(201).json(result);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Error in rental-accessories API:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
