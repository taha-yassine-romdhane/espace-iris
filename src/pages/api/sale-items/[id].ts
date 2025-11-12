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
        console.log('[API sale-items/[id]] Received parameters:', JSON.stringify(updateData.parameters, null, 2));

        if (updatedItem.medicalDeviceId) {
          // Check if configuration exists
          const existingConfig = await prisma.saleConfiguration.findUnique({
            where: { saleItemId: id }
          });
          console.log('[API sale-items/[id]] Existing config:', existingConfig ? 'Found' : 'Not found');

          // Map incoming keys to schema fields (case-insensitive)
          const fieldMapping: Record<string, string> = {
            'pression': 'pression',
            'pressionrampe': 'pressionRampe',
            'dureerampe': 'dureeRampe',
            'epr': 'epr',
            'ipap': 'ipap',
            'epap': 'epap',
            'aid': 'aid',
            'mode': 'mode',
            'frequencerespiratoire': 'frequenceRespiratoire',
            'volumecourant': 'volumeCourant',
            'debit': 'debit',
            'auto1': 'auto1',
            'auto2': 'auto2',
            'pressiontraitement': 'pressionTraitement'
          };

          const normalizedParams: any = {};
          const additionalParams: any = {};

          if (updateData.parameters) {
            Object.keys(updateData.parameters).forEach(key => {
              const value = updateData.parameters[key];

              // Skip empty values (but keep 0 and false!)
              if (value === '' || value === null || value === undefined) {
                return;
              }

              // Normalize key to lowercase for lookup
              const lookupKey = key.toLowerCase();
              const mappedField = fieldMapping[lookupKey];

              console.log(`[API sale-items/[id]] Processing param: ${key} = ${value} -> mapped to: ${mappedField || 'unknown'}`);

              // Check if it's a valid schema field
              if (mappedField) {
                // Special handling for numeric fields
                if (mappedField === 'dureeRampe' || mappedField === 'pressionTraitement') {
                  normalizedParams[mappedField] = parseInt(value) || 0;
                } else if (mappedField === 'auto1' || mappedField === 'auto2') {
                  // Boolean fields
                  normalizedParams[mappedField] = Boolean(value);
                } else {
                  // Store as String with correct field name
                  normalizedParams[mappedField] = String(value);
                }
              } else {
                // Unknown field - store in additionalParams
                additionalParams[key] = value;
              }
            });
          }

          console.log('[API sale-items/[id]] Normalized params:', JSON.stringify(normalizedParams, null, 2));
          console.log('[API sale-items/[id]] Additional params:', JSON.stringify(additionalParams, null, 2));

          // Add additionalParams if any unknown fields exist
          if (Object.keys(additionalParams).length > 0) {
            normalizedParams.additionalParams = additionalParams;
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
