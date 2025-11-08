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
      const items = await prisma.saleItem.findMany({
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

      // Get user information for stock location
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        include: { stockLocation: true }
      });

      // Determine stock location based on role
      let stockLocationId: string | null = null;

      if (itemData.productId) {
        if (user?.role === 'ADMIN') {
          // Admin can specify location, defaults to their own
          stockLocationId = itemData.stockLocationId || user.stockLocation?.id || null;
        } else if (user?.role === 'EMPLOYEE') {
          // Employee uses only their stock location
          stockLocationId = user.stockLocation?.id || null;
        }

        if (!stockLocationId) {
          return res.status(400).json({ error: 'Emplacement de stock non trouvé pour cet utilisateur' });
        }

        // Check stock availability
        const stock = await prisma.stock.findUnique({
          where: {
            locationId_productId: {
              locationId: stockLocationId,
              productId: itemData.productId
            }
          }
        });

        if (!stock || stock.quantity < itemData.quantity) {
          return res.status(400).json({
            error: `Stock insuffisant. Disponible: ${stock?.quantity || 0}, Demandé: ${itemData.quantity}`
          });
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

      // Create the sale item
      const newItem = await prisma.saleItem.create({
        data: {
          saleId: itemData.saleId,
          productId: itemData.productId || null,
          medicalDeviceId: itemData.medicalDeviceId || null,
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
          configuration: true,
        }
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

      // Decrease product stock quantity if product sold
      if (itemData.productId && stockLocationId) {
        await prisma.stock.update({
          where: {
            locationId_productId: {
              locationId: stockLocationId,
              productId: itemData.productId
            }
          },
          data: {
            quantity: { decrement: parseInt(itemData.quantity) }
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
