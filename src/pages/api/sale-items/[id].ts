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

      // Get existing sale item to check for changes
      const existingItem = await prisma.saleItem.findUnique({
        where: { id },
      });

      if (!existingItem) {
        return res.status(404).json({ error: 'Article non trouvé' });
      }

      // Build update data object
      const dataToUpdate: any = {};

      if (updateData.quantity !== undefined) dataToUpdate.quantity = parseInt(updateData.quantity);
      if (updateData.unitPrice !== undefined) dataToUpdate.unitPrice = parseFloat(updateData.unitPrice);
      if (updateData.discount !== undefined) dataToUpdate.discount = parseFloat(updateData.discount);
      if (updateData.description !== undefined) dataToUpdate.description = updateData.description;
      if (updateData.itemTotal !== undefined) dataToUpdate.itemTotal = parseFloat(updateData.itemTotal);
      if (updateData.serialNumber !== undefined) dataToUpdate.serialNumber = updateData.serialNumber;
      if (updateData.stockLocationId !== undefined) dataToUpdate.stockLocationId = updateData.stockLocationId;

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

      // Check if stock location or quantity is changing for products
      const isLocationChanging = updateData.stockLocationId &&
                                  updateData.stockLocationId !== existingItem.stockLocationId;
      const isQuantityChanging = updateData.quantity &&
                                 parseInt(updateData.quantity) !== existingItem.quantity;

      // Update the sale item with stock handling
      const updatedItem = await prisma.$transaction(async (tx) => {
        // If product and (location or quantity changing), handle stock movements
        if (existingItem.productId && (isLocationChanging || isQuantityChanging)) {
          const oldLocationId = existingItem.stockLocationId;
          const newLocationId = updateData.stockLocationId || oldLocationId;
          const oldQuantity = existingItem.quantity;
          const newQuantity = dataToUpdate.quantity || oldQuantity;

          // Fetch sale code for better tracking
          const sale = await tx.sale.findUnique({
            where: { id: existingItem.saleId },
            select: { saleCode: true },
          });

          // Restore stock to old location
          if (oldLocationId) {
            await tx.stock.update({
              where: {
                locationId_productId: {
                  locationId: oldLocationId,
                  productId: existingItem.productId,
                },
              },
              data: {
                quantity: { increment: oldQuantity },
              },
            });

            // Create ENTREE movement for restoration
            await tx.stockMovement.create({
              data: {
                productId: existingItem.productId,
                locationId: oldLocationId,
                type: 'ENTREE',
                quantity: oldQuantity,
                notes: `Vente ${sale?.saleCode || existingItem.saleId} - Modification article (restauration)`,
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
                  productId: existingItem.productId,
                },
              },
            });

            if (!stock || stock.quantity < newQuantity) {
              throw new Error(`Stock insuffisant au nouvel emplacement. Disponible: ${stock?.quantity || 0}, Requis: ${newQuantity}`);
            }

            await tx.stock.update({
              where: { id: stock.id },
              data: {
                quantity: { decrement: newQuantity },
              },
            });

            // Create SORTIE movement for new location
            await tx.stockMovement.create({
              data: {
                productId: existingItem.productId,
                locationId: newLocationId,
                type: 'SORTIE',
                quantity: newQuantity,
                notes: `Vente ${sale?.saleCode || existingItem.saleId} - Modification article`,
                createdById: session.user.id,
              },
            });
          }

          console.log('[SALE-ITEM-UPDATE] Stock movements created for location/quantity change');
        }

        // Update the sale item
        return await tx.saleItem.update({
          where: { id },
          data: dataToUpdate
        });
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

      // Use transaction to ensure atomicity
      await prisma.$transaction(async (tx) => {
        // If it was a medical device, restore it to available
        if (saleItem.medicalDeviceId) {
          await tx.medicalDevice.update({
            where: { id: saleItem.medicalDeviceId },
            data: {
              destination: 'FOR_SALE',
              stockLocationId: saleItem.stockLocationId, // Restore to original location
            }
          });
        }

        // If it was a product, restore stock quantity and create ENTREE movement
        if (saleItem.productId && saleItem.stockLocationId) {
          // Fetch sale code for better tracking
          const sale = await tx.sale.findUnique({
            where: { id: saleItem.saleId },
            select: { saleCode: true },
          });

          // Restore stock
          await tx.stock.update({
            where: {
              locationId_productId: {
                locationId: saleItem.stockLocationId,
                productId: saleItem.productId,
              },
            },
            data: {
              quantity: { increment: saleItem.quantity },
            },
          });

          // Create ENTREE movement
          await tx.stockMovement.create({
            data: {
              productId: saleItem.productId,
              locationId: saleItem.stockLocationId,
              type: 'ENTREE',
              quantity: saleItem.quantity,
              notes: `Vente ${sale?.saleCode || saleItem.saleId} - Article supprimé (restauration stock)`,
              createdById: session.user.id,
            },
          });

          console.log('[SALE-ITEM-DELETE] Stock restored and ENTREE movement created');
        }

        // Delete the sale item
        await tx.saleItem.delete({
          where: { id }
        });
      });

      // Update sale total (outside transaction)
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

      return res.status(200).json({ message: 'Article supprimé avec succès' });
    } catch (error) {
      console.error('Error deleting sale item:', error);
      return res.status(500).json({ error: 'Erreur lors de la suppression de l\'article' });
    }
  }

  return res.status(405).json({ error: 'Méthode non autorisée' });
}
