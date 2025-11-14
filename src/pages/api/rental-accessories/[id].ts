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

    const { id } = req.query;

    if (typeof id !== 'string') {
      return res.status(400).json({ error: 'Invalid ID' });
    }

    if (req.method === 'GET') {
      const accessory = await prisma.rentalAccessory.findUnique({
        where: { id },
        include: {
          rental: true,
          product: true,
          stockLocation: true,
        },
      });

      if (!accessory) {
        return res.status(404).json({ error: 'Rental accessory not found' });
      }

      return res.status(200).json(accessory);
    }

    if (req.method === 'PUT') {
      const { rentalId, productId, stockLocationId, quantity, unitPrice } = req.body;

      // Get existing rental accessory
      const existingAccessory = await prisma.rentalAccessory.findUnique({
        where: { id },
      });

      if (!existingAccessory) {
        return res.status(404).json({ error: 'Rental accessory not found' });
      }

      // Build update data object
      const updateData: any = {};

      if (rentalId !== undefined) updateData.rentalId = rentalId;
      if (productId !== undefined) updateData.productId = productId;
      if (stockLocationId !== undefined) updateData.stockLocationId = stockLocationId;
      if (quantity !== undefined) updateData.quantity = parseInt(quantity);
      if (unitPrice !== undefined) updateData.unitPrice = parseFloat(unitPrice);

      // Check if stock location or quantity is changing
      const isLocationChanging = stockLocationId &&
                                  stockLocationId !== existingAccessory.stockLocationId;
      const isQuantityChanging = quantity &&
                                 parseInt(quantity) !== existingAccessory.quantity;

      // Update with transaction if stock needs to be managed
      const accessory = await prisma.$transaction(async (tx) => {
        // Get rental code for stock movement notes
        const rental = await tx.rental.findUnique({
          where: { id: existingAccessory.rentalId },
          select: { rentalCode: true },
        });

        // Handle stock movements if location or quantity changing
        if (isLocationChanging || isQuantityChanging) {
          const oldLocationId = existingAccessory.stockLocationId;
          const newLocationId = stockLocationId || oldLocationId;
          const oldQuantity = existingAccessory.quantity;
          const newQuantity = updateData.quantity || oldQuantity;

          // Restore stock to old location
          if (oldLocationId) {
            await tx.stock.update({
              where: {
                locationId_productId: {
                  locationId: oldLocationId,
                  productId: existingAccessory.productId,
                },
              },
              data: {
                quantity: { increment: oldQuantity },
              },
            });

            // Create ENTREE movement
            await tx.stockMovement.create({
              data: {
                productId: existingAccessory.productId,
                locationId: oldLocationId,
                type: 'ENTREE',
                quantity: oldQuantity,
                notes: `Location ${rental?.rentalCode || existingAccessory.rentalId} - Accessoire modifié (restauration)`,
                createdById: session.user.id,
              },
            });
          }

          // Decrease stock at new location
          if (newLocationId) {
            const stock = await tx.stock.findUnique({
              where: {
                locationId_productId: {
                  locationId: newLocationId,
                  productId: existingAccessory.productId,
                },
              },
            });

            if (!stock || stock.quantity < newQuantity) {
              throw new Error(`Stock insuffisant. Disponible: ${stock?.quantity || 0}, Requis: ${newQuantity}`);
            }

            await tx.stock.update({
              where: { id: stock.id },
              data: {
                quantity: { decrement: newQuantity },
              },
            });

            // Create SORTIE movement
            await tx.stockMovement.create({
              data: {
                productId: existingAccessory.productId,
                locationId: newLocationId,
                type: 'SORTIE',
                quantity: newQuantity,
                notes: `Location ${rental?.rentalCode || existingAccessory.rentalId} - Accessoire modifié`,
                createdById: session.user.id,
              },
            });
          }

          console.log('[RENTAL-ACCESSORY-UPDATE] Stock movements created');
        }

        // Update the rental accessory
        return await tx.rentalAccessory.update({
          where: { id },
          data: updateData,
          include: {
            rental: true,
            product: true,
            stockLocation: true,
          },
        });
      });

      return res.status(200).json(accessory);
    }

    if (req.method === 'DELETE') {
      // Get rental accessory before deleting
      const accessory = await prisma.rentalAccessory.findUnique({
        where: { id },
      });

      if (!accessory) {
        return res.status(404).json({ error: 'Rental accessory not found' });
      }

      // Use transaction to restore stock and delete
      await prisma.$transaction(async (tx) => {
        // Get rental code for stock movement notes
        const rental = await tx.rental.findUnique({
          where: { id: accessory.rentalId },
          select: { rentalCode: true },
        });

        // Restore stock if stockLocationId exists
        if (accessory.stockLocationId) {
          await tx.stock.update({
            where: {
              locationId_productId: {
                locationId: accessory.stockLocationId,
                productId: accessory.productId,
              },
            },
            data: {
              quantity: { increment: accessory.quantity },
            },
          });

          // Create ENTREE movement
          await tx.stockMovement.create({
            data: {
              productId: accessory.productId,
              locationId: accessory.stockLocationId,
              type: 'ENTREE',
              quantity: accessory.quantity,
              notes: `Location ${rental?.rentalCode || accessory.rentalId} - Accessoire supprimé (restauration stock)`,
              createdById: session.user.id,
            },
          });

          console.log('[RENTAL-ACCESSORY-DELETE] Stock restored and ENTREE movement created');
        }

        // Delete the rental accessory
        await tx.rentalAccessory.delete({
          where: { id },
        });
      });

      return res.status(200).json({ message: 'Accessory deleted successfully' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Error in rental-accessories [id] API:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
