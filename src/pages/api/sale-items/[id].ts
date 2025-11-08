import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { prisma } from '@/lib/prisma';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions);

  if (!session || !session.user) {
    return res.status(401).json({ error: 'Non autorisé' });
  }

  const { id } = req.query;

  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'ID invalide' });
  }

  if (req.method === 'PUT') {
    try {
      const updateData = req.body;

      // Build update data object
      const dataToUpdate: any = {};

      if (updateData.quantity !== undefined) dataToUpdate.quantity = parseInt(updateData.quantity);
      if (updateData.unitPrice !== undefined) dataToUpdate.unitPrice = parseFloat(updateData.unitPrice);
      if (updateData.discount !== undefined) dataToUpdate.discount = parseFloat(updateData.discount);
      if (updateData.description !== undefined) dataToUpdate.description = updateData.description;
      if (updateData.itemTotal !== undefined) dataToUpdate.itemTotal = parseFloat(updateData.itemTotal);
      if (updateData.serialNumber !== undefined) dataToUpdate.serialNumber = updateData.serialNumber;

      // Allow changing product or medical device
      if (updateData.productId !== undefined) {
        dataToUpdate.productId = updateData.productId || null;
        dataToUpdate.medicalDeviceId = null; // Clear medical device if setting product
      }
      if (updateData.medicalDeviceId !== undefined) {
        dataToUpdate.medicalDeviceId = updateData.medicalDeviceId || null;
        dataToUpdate.productId = null; // Clear product if setting medical device
      }

      // Allow changing sale (which changes the client)
      if (updateData.saleId !== undefined) {
        dataToUpdate.saleId = updateData.saleId;
      }

      // Update the sale item
      const updatedItem = await prisma.saleItem.update({
        where: { id },
        data: dataToUpdate
      });

      // Handle configuration updates
      if (updateData.parameters !== undefined) {
        if (updatedItem.medicalDeviceId) {
          // Check if configuration exists
          const existingConfig = await prisma.saleConfiguration.findUnique({
            where: { saleItemId: id }
          });

          // Map parameter keys to match database schema
          const keyMap: Record<string, string> = {
            'IPAP': 'ipap',
            'EPAP': 'epap',
            'AID': 'aid',
            'pression': 'pression',
            'pressionRampe': 'pressionRampe',
            'dureeRampe': 'dureeRampe',
            'epr': 'epr',
            'mode': 'mode',
            'frequenceRespiratoire': 'frequenceRespiratoire',
            'volumeCourant': 'volumeCourant',
            'debit': 'debit',
          };

          const normalizedParams: any = {};
          if (updateData.parameters) {
            Object.keys(updateData.parameters).forEach(key => {
              const mappedKey = keyMap[key] || key;
              if (updateData.parameters[key] !== '' && updateData.parameters[key] !== null && updateData.parameters[key] !== undefined) {
                normalizedParams[mappedKey] = updateData.parameters[key];
              }
            });
          }

          if (existingConfig) {
            // Update existing configuration
            if (Object.keys(normalizedParams).length > 0) {
              await prisma.saleConfiguration.update({
                where: { saleItemId: id },
                data: normalizedParams
              });
            } else {
              // Delete if no parameters
              await prisma.saleConfiguration.delete({
                where: { saleItemId: id }
              });
            }
          } else if (Object.keys(normalizedParams).length > 0) {
            // Create new configuration
            await prisma.saleConfiguration.create({
              data: {
                saleItemId: id,
                ...normalizedParams,
              }
            });
          }
        } else {
          // If not a medical device, delete configuration if exists
          const existingConfig = await prisma.saleConfiguration.findUnique({
            where: { saleItemId: id }
          });
          if (existingConfig) {
            await prisma.saleConfiguration.delete({
              where: { saleItemId: id }
            });
          }
        }
      }

      // Update the sale's total amount
      const sale = await prisma.sale.findUnique({
        where: { id: updatedItem.saleId },
        include: {
          items: true
        }
      });

      if (sale) {
        const totalAmount = sale.items.reduce((sum, item) => {
          return sum + Number(item.itemTotal);
        }, 0);
        const finalAmount = totalAmount - Number(sale.discount || 0);

        // Round to 2 decimal places
        const roundedTotal = Math.round(totalAmount * 100) / 100;
        const roundedFinal = Math.round(finalAmount * 100) / 100;

        // Validate amounts
        if (roundedTotal > 99999999.99 || roundedFinal > 99999999.99) {
          return res.status(400).json({ error: 'Montant trop élevé' });
        }

        await prisma.sale.update({
          where: { id: updatedItem.saleId },
          data: {
            totalAmount: roundedTotal,
            finalAmount: roundedFinal,
          }
        });
      }

      return res.status(200).json({
        message: 'Article modifié avec succès',
        item: updatedItem
      });
    } catch (error) {
      console.error('Error updating sale item:', error);
      return res.status(500).json({ error: 'Erreur lors de la modification de l\'article' });
    }
  }

  if (req.method === 'DELETE') {
    try {
      // Get the sale item details before deletion
      const saleItem = await prisma.saleItem.findUnique({
        where: { id },
        include: {
          sale: true
        }
      });

      if (!saleItem) {
        return res.status(404).json({ error: 'Article non trouvé' });
      }

      // Get user info to determine stock location
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        include: { stockLocation: true }
      });

      // If it was a medical device, restore it to available
      if (saleItem.medicalDeviceId) {
        await prisma.medicalDevice.update({
          where: { id: saleItem.medicalDeviceId },
          data: {
            destination: 'FOR_SALE',
            stockLocationId: user?.stockLocation?.id || null, // Return to user's stock location
          }
        });
      }

      // If it was a product, restore stock quantity
      if (saleItem.productId && user?.stockLocation?.id) {
        // Try to restore stock, create if doesn't exist
        await prisma.stock.upsert({
          where: {
            locationId_productId: {
              locationId: user.stockLocation.id,
              productId: saleItem.productId
            }
          },
          update: {
            quantity: { increment: saleItem.quantity }
          },
          create: {
            locationId: user.stockLocation.id,
            productId: saleItem.productId,
            quantity: saleItem.quantity,
            status: 'FOR_SALE'
          }
        });
      }

      // Update sale total
      const sale = await prisma.sale.findUnique({
        where: { id: saleItem.saleId },
        include: { items: true }
      });

      if (sale) {
        const remainingItems = sale.items.filter(item => item.id !== id);
        const totalAmount = remainingItems.reduce((sum, item) => sum + Number(item.itemTotal), 0);
        const finalAmount = totalAmount - Number(sale.discount || 0);

        await prisma.sale.update({
          where: { id: saleItem.saleId },
          data: {
            totalAmount: Math.round(totalAmount * 100) / 100,
            finalAmount: Math.round(finalAmount * 100) / 100,
          }
        });
      }

      // Delete the sale item
      await prisma.saleItem.delete({
        where: { id }
      });

      return res.status(200).json({ message: 'Article supprimé avec succès' });
    } catch (error) {
      console.error('Error deleting sale item:', error);
      return res.status(500).json({ error: 'Erreur lors de la suppression de l\'article' });
    }
  }

  return res.status(405).json({ error: 'Méthode non autorisée' });
}
