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

  if (req.method === 'GET') {
    try {
      // Build where clause based on user role
      const whereClause: any = {};

      // If user is EMPLOYEE, only show sale items from sales assigned to them or processed by them
      if (session.user.role === 'EMPLOYEE') {
        whereClause.sale = {
          OR: [
            { assignedToId: session.user.id },
            { processedById: session.user.id }
          ]
        };
      }
      // ADMIN and DOCTOR can see all sale items (no filter)

      const items = await prisma.saleItem.findMany({
        where: whereClause,
        include: {
          sale: {
            select: {
              id: true,
              saleCode: true,
              invoiceNumber: true,
              assignedTo: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  stockLocation: {
                    select: {
                      id: true,
                      name: true,
                    }
                  }
                }
              },
              patient: {
                select: {
                  id: true,
                  patientCode: true,
                  firstName: true,
                  lastName: true,
                }
              },
              company: {
                select: {
                  id: true,
                  companyCode: true,
                  companyName: true,
                }
              }
            }
          },
          product: {
            select: {
              id: true,
              name: true,
              productCode: true,
              type: true,
              brand: true,
              model: true,
            }
          },
          medicalDevice: {
            select: {
              id: true,
              name: true,
              deviceCode: true,
              serialNumber: true,
              type: true,
            }
          },
          stockLocation: {
            select: {
              id: true,
              name: true,
            }
          },
          configuration: true,
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      return res.status(200).json({ items });
    } catch (error) {
      console.error('Error fetching sale items:', error);
      return res.status(500).json({ error: 'Erreur lors de la récupération des articles' });
    }
  }

  if (req.method === 'POST') {
    try {
      const itemData = req.body;

      // Validation
      if (!itemData.saleId) {
        return res.status(400).json({ error: 'ID de vente requis' });
      }

      if (!itemData.productId && !itemData.medicalDeviceId) {
        return res.status(400).json({ error: 'Produit ou appareil médical requis' });
      }

      if (!itemData.quantity || itemData.quantity <= 0) {
        return res.status(400).json({ error: 'Quantité invalide' });
      }

      if (itemData.unitPrice === undefined || itemData.unitPrice < 0) {
        return res.status(400).json({ error: 'Prix unitaire invalide' });
      }

      // Validate stockLocationId is provided for products
      if (itemData.productId && !itemData.stockLocationId) {
        return res.status(400).json({
          error: 'Emplacement de stock requis pour les produits (stockLocationId)'
        });
      }

      // For medical devices, use device's current stockLocationId
      if (itemData.medicalDeviceId && !itemData.stockLocationId) {
        const device = await prisma.medicalDevice.findUnique({
          where: { id: itemData.medicalDeviceId },
          select: { stockLocationId: true }
        });
        if (device?.stockLocationId) {
          itemData.stockLocationId = device.stockLocationId;
        }
      }

      // For medical devices, check if already sold
      if (itemData.medicalDeviceId) {
        const device = await prisma.medicalDevice.findUnique({
          where: { id: itemData.medicalDeviceId }
        });

        if (!device) {
          return res.status(400).json({ error: 'Appareil médical non trouvé' });
        }
      }

      // Create the sale item within a transaction for stock management
      const newItem = await prisma.$transaction(async (tx) => {
        // For products, check stock and create movement
        if (itemData.productId && itemData.stockLocationId) {
          const stock = await tx.stock.findUnique({
            where: {
              locationId_productId: {
                locationId: itemData.stockLocationId,
                productId: itemData.productId,
              },
            },
          });

          if (!stock) {
            throw new Error(`Aucun stock trouvé pour ce produit à l'emplacement sélectionné`);
          }

          if (stock.quantity < parseInt(itemData.quantity)) {
            throw new Error(`Stock insuffisant. Disponible: ${stock.quantity}, Demandé: ${itemData.quantity}`);
          }

          // Decrease stock quantity
          await tx.stock.update({
            where: { id: stock.id },
            data: {
              quantity: { decrement: parseInt(itemData.quantity) },
            },
          });

          // Fetch sale code for better tracking
          const sale = await tx.sale.findUnique({
            where: { id: itemData.saleId },
            select: { saleCode: true },
          });

          // Create stock movement record (SORTIE)
          await tx.stockMovement.create({
            data: {
              productId: itemData.productId,
              locationId: itemData.stockLocationId,
              type: 'SORTIE',
              quantity: parseInt(itemData.quantity),
              notes: `Vente ${sale?.saleCode || itemData.saleId} - Article vendu`,
              createdById: session.user.id,
            },
          });

          console.log('[SALE-ITEM-CREATE] Stock decreased and movement created');
        }

        // Create the sale item
        const saleItem = await tx.saleItem.create({
          data: {
            saleId: itemData.saleId,
            productId: itemData.productId || null,
            medicalDeviceId: itemData.medicalDeviceId || null,
            stockLocationId: itemData.stockLocationId || null,
            quantity: parseInt(itemData.quantity),
            unitPrice: parseFloat(itemData.unitPrice),
            discount: itemData.discount ? parseFloat(itemData.discount) : 0,
            itemTotal: parseFloat(itemData.itemTotal),
            serialNumber: itemData.serialNumber || null,
            description: itemData.description || null,
          },
          include: {
            sale: {
              select: {
                id: true,
                saleCode: true,
                invoiceNumber: true,
                assignedTo: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    stockLocation: {
                      select: {
                        id: true,
                        name: true,
                      }
                    }
                  }
                },
                patient: {
                  select: {
                    id: true,
                    patientCode: true,
                    firstName: true,
                    lastName: true,
                  }
                },
                company: {
                  select: {
                    id: true,
                    companyCode: true,
                    companyName: true,
                  }
                }
              }
            },
            product: {
              select: {
                id: true,
                name: true,
                productCode: true,
                type: true,
              }
            },
            medicalDevice: {
              select: {
                id: true,
                name: true,
                deviceCode: true,
                serialNumber: true,
                type: true,
              }
            },
            stockLocation: {
              select: {
                id: true,
                name: true,
              }
            },
            configuration: true,
          }
        });

        return saleItem;
      });

      // If parameters are provided, create configuration
      if (itemData.parameters && itemData.medicalDeviceId) {
        // Map parameter keys to match database schema (camelCase)
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
        Object.keys(itemData.parameters).forEach(key => {
          const mappedKey = keyMap[key] || key;
          // Only add if the value is not empty
          if (itemData.parameters[key] !== '' && itemData.parameters[key] !== null && itemData.parameters[key] !== undefined) {
            normalizedParams[mappedKey] = itemData.parameters[key];
          }
        });

        await prisma.saleConfiguration.create({
          data: {
            saleItemId: newItem.id,
            ...normalizedParams,
          }
        });
      }

      // Update medical device status if sold
      if (itemData.medicalDeviceId) {
        await prisma.medicalDevice.update({
          where: { id: itemData.medicalDeviceId },
          data: {
            stockLocationId: null, // Remove from stock location (now at patient's location)
            // status remains ACTIVE for maintenance tracking
          }
        });
      }

      // Update the sale's total amount
      const sale = await prisma.sale.findUnique({
        where: { id: itemData.saleId },
        include: {
          items: true
        }
      });

      if (sale) {
        const totalAmount = sale.items.reduce((sum, item) => {
          return sum + Number(item.itemTotal);
        }, 0);
        const finalAmount = totalAmount - Number(sale.discount || 0);

        // Round to 2 decimal places to ensure precision
        const roundedTotal = Math.round(totalAmount * 100) / 100;
        const roundedFinal = Math.round(finalAmount * 100) / 100;

        // Validate amounts are within database limits (Decimal(10,2))
        if (roundedTotal > 99999999.99 || roundedFinal > 99999999.99) {
          return res.status(400).json({ error: 'Montant trop élevé' });
        }

        await prisma.sale.update({
          where: { id: itemData.saleId },
          data: {
            totalAmount: roundedTotal,
            finalAmount: roundedFinal,
          }
        });
      }

      return res.status(201).json({
        message: 'Article créé avec succès',
        item: newItem
      });
    } catch (error) {
      console.error('Error creating sale item:', error);
      return res.status(500).json({ error: 'Erreur lors de la création de l\'article' });
    }
  }

  return res.status(405).json({ error: 'Méthode non autorisée' });
}
