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

  const { id } = req.query;

  try {
    switch (req.method) {
      case 'GET':
        // Try to find medical device first
        const device = await prisma.medicalDevice.findUnique({
          where: { id: id as string },
          include: {
            stockLocation: true
          }
        });

        if (device) {
          return res.status(200).json({
            id: device.id,
            name: device.name,
            type: device.type,
            brand: device.brand,
            model: device.model,
            serialNumber: device.serialNumber,
            purchasePrice: device.purchasePrice,
            sellingPrice: device.sellingPrice,
            rentalPrice: device.rentalPrice,
            technicalSpecs: device.technicalSpecs,
            requiresMaintenance: device.requiresMaintenance,
            stockLocation: device.stockLocation?.name || 'Non assigné',
            stockLocationId: device.stockLocationId,
            stockQuantity: device.stockQuantity,
            status: device.status,
            configuration: device.configuration,
            installationDate: device.installationDate
          });
        }

        // If not found, try to find regular product
        const product = await prisma.product.findUnique({
          where: { id: id as string },
          include: {
            stocks: {
              include: {
                location: true
              }
            }
          }
        });

        if (!product) {
          return res.status(404).json({ error: 'Product not found' });
        }

        return res.status(200).json({
          id: product.id,
          name: product.name,
          type: product.type,
          brand: product.brand,
          model: product.model,
          serialNumber: product.serialNumber,
          purchasePrice: product.purchasePrice,
          sellingPrice: product.sellingPrice,
          warrantyExpiration: product.warrantyExpiration,
          stockLocation: product.stocks[0]?.location.name || 'Non assigné',
          stockLocationId: product.stocks[0]?.location.id,
          stockQuantity: product.stocks.reduce((acc, stock) => acc + stock.quantity, 0),
          status: product.stocks[0]?.status || 'FOR_SALE'
        });

      case 'PUT':
        try {
          console.log("Received PUT request for ID:", id);
          console.log("Request body:", JSON.stringify(req.body, null, 2));

          const { type, ...data } = req.body;
          console.log("Extracted type:", type);
          console.log("Updating device:", id, JSON.stringify(data, null, 2));

          if (!id) {
            return res.status(400).json({ error: 'ID is required' });
          }

          // Check if this is a simple update without type (e.g., just updating reservation status)
          // If so, update the medical device directly
          if (!type && (data.patientId || data.location || data.reservedUntil)) {
            try {
              const updatedDevice = await prisma.medicalDevice.update({
                where: { id: id as string },
                data: {
                  ...(data.patientId ? { patientId: data.patientId } : {}),
                  ...(data.location ? { location: data.location } : {}),
                  ...(data.status ? { status: data.status } : {}),
                  ...(data.reservedUntil ? { reservedUntil: new Date(data.reservedUntil) } : {})
                },
                include: {
                  stockLocation: true,
                }
              });

              console.log('Device reservation updated successfully:', updatedDevice.id);

              return res.status(200).json({
                id: updatedDevice.id,
                name: updatedDevice.name,
                patientId: updatedDevice.patientId,
                location: updatedDevice.location,
                reservedUntil: updatedDevice.reservedUntil,
                status: updatedDevice.status
              });
            } catch (error) {
              console.error("Error updating device reservation:", error);
              return res.status(500).json({ error: "Failed to update device reservation" });
            }
          }

          if (type === 'MEDICAL_DEVICE' || type === 'DIAGNOSTIC_DEVICE') {
            // With the schema refactoring, we no longer use DiagnosticParameter and ParameterValue models
            // diagnostic results are now tracked directly in the DiagnosticResult model
            if (type === 'DIAGNOSTIC_DEVICE' && data.parameters && Array.isArray(data.parameters)) {
              console.log('Diagnostic device parameters are now handled differently with the new schema');
              // We don't need to create separate parameters anymore since we use DiagnosticResult
              // Just remove parameters from data to avoid errors
              delete data.parameters;
            }

            console.log('About to update device with ID:', id);
            console.log('Update data:', {
              name: data.name,
              brand: data.brand,
              model: data.model,
              serialNumber: data.serialNumber,
              purchasePrice: data.purchasePrice ? parseFloat(data.purchasePrice) : null,
              sellingPrice: data.sellingPrice ? parseFloat(data.sellingPrice) : null,
            });

            try {
              const updatedDevice = await prisma.medicalDevice.update({
                where: { id: id as string },
                data: {
                  name: data.name,
                  brand: data.brand,
                  model: data.model,
                  serialNumber: data.serialNumber,
                  purchasePrice: data.purchasePrice ? parseFloat(data.purchasePrice) : null,
                  sellingPrice: data.sellingPrice ? parseFloat(data.sellingPrice) : null,
                  rentalPrice: data.rentalPrice ? parseFloat(data.rentalPrice) : null,
                  technicalSpecs: data.technicalSpecs,
                  warranty: data.warranty,
                  requiresMaintenance: data.requiresMaintenance || false,
                  configuration: data.configuration,
                  status: data.status || 'ACTIVE',
                  // Handle patient assignment and reservation
                  ...(data.patientId ? {
                    patientId: data.patientId,
                    location: data.location || 'PATIENT_HOME'
                  } : {}),
                  // Handle reservation date if provided
                  ...(data.reservedUntil ? {
                    reservedUntil: new Date(data.reservedUntil)
                  } : {}),
                  ...(data.stockLocationId ? {
                    stockLocation: {
                      connect: {
                        id: data.stockLocationId
                      }
                    }
                  } : {
                    stockLocation: {
                      disconnect: true
                    }
                  }),
                  stockQuantity: data.stockQuantity || 1,
                },
                include: {
                  stockLocation: true,
                }
              });

              console.log('Device updated successfully:', updatedDevice.id);

              return res.status(200).json({
                id: updatedDevice.id,
                name: updatedDevice.name,
                type: updatedDevice.type,
                brand: updatedDevice.brand,
                model: updatedDevice.model,
                serialNumber: updatedDevice.serialNumber,
                purchasePrice: updatedDevice.purchasePrice,
                sellingPrice: updatedDevice.sellingPrice,
                technicalSpecs: updatedDevice.technicalSpecs,
                requiresMaintenance: updatedDevice.requiresMaintenance,
                stockLocation: updatedDevice.stockLocation?.name || 'Non assigné',
                stockLocationId: updatedDevice.stockLocationId,
                stockQuantity: updatedDevice.stockQuantity,
                status: updatedDevice.status,
                configuration: updatedDevice.configuration
              });
            } catch (updateError) {
              console.error('Error updating device:', updateError);
              return res.status(500).json({ error: 'Failed to update device' });
            }
          } else {
            // Update product
            try {
              const { warrantyExpiration, purchasePrice, sellingPrice, status, stockLocationId, stockQuantity, ...productData } = data;

              const updatePayload: any = {
                ...productData,
              };

              if (purchasePrice) {
                updatePayload.purchasePrice = parseFloat(purchasePrice);
              }
              if (sellingPrice) {
                updatePayload.sellingPrice = parseFloat(sellingPrice);
              }
              if (warrantyExpiration) {
                updatePayload.warrantyExpiration = new Date(warrantyExpiration);
              }
              if (status) {
                updatePayload.status = status === 'FOR_SALE' ? 'ACTIVE' :
                                     status === 'VENDU' ? 'SOLD' :
                                     status === 'HORS_SERVICE' ? 'RETIRED' : 'ACTIVE';
              }

              const updatedProduct = await prisma.product.update({
                where: { id: id as string },
                data: updatePayload,
                include: {
                  stocks: {
                    include: {
                      location: true
                    }
                  }
                }
              });

              if (stockLocationId) {
                const existingStock = await prisma.stock.findFirst({
                  where: {
                    productId: id as string,
                    locationId: stockLocationId
                  }
                });

                await prisma.stock.upsert({
                  where: {
                    id: existingStock?.id || 'new-id'
                  },
                  create: {
                    quantity: parseInt(stockQuantity?.toString() || '1'),
                    status: status || 'FOR_SALE',
                    product: {
                      connect: { id: id as string }
                    },
                    location: {
                      connect: { id: stockLocationId }
                    }
                  },
                  update: {
                    quantity: parseInt(stockQuantity?.toString() || '1'),
                    status: status || 'FOR_SALE'
                  }
                });
              }

              // Map the status back to the frontend format
              const mappedStatus = updatedProduct.status === 'ACTIVE' ? 'FOR_SALE' :
                updatedProduct.status === 'SOLD' ? 'VENDU' :
                  updatedProduct.status === 'RETIRED' ? 'HORS_SERVICE' : 'FOR_SALE';

              return res.status(200).json({
                id: updatedProduct.id,
                name: updatedProduct.name,
                type: updatedProduct.type,
                brand: updatedProduct.brand,
                model: updatedProduct.model,
                serialNumber: updatedProduct.serialNumber,
                purchasePrice: updatedProduct.purchasePrice,
                sellingPrice: updatedProduct.sellingPrice,
                warrantyExpiration: updatedProduct.warrantyExpiration,
                stockLocation: updatedProduct.stocks[0]?.location?.name || 'Non assigné',
                stockLocationId: updatedProduct.stocks[0]?.location?.id,
                stockQuantity: updatedProduct.stocks[0]?.quantity || 0,
                status: mappedStatus
              });
            } catch (error) {
              console.error("Product update error:", error);
              return res.status(500).json({ error: "Failed to update product" });
            }
          }
        } catch (error) {
          console.error("Update error:", error);
          return res.status(500).json({ error: "Failed to update device" });
        }
        break;

      case 'DELETE':
        try {
          // First check if it's a medical device
          const device = await prisma.medicalDevice.findUnique({
            where: { id: id as string },
            include: {
              Diagnostic: true,
              Rental: true,
            },
          });

          if (device) {
            // Check if the device has any related records
            if (device.Diagnostic.length > 0 || device.Rental.length > 0) {
              return res.status(400).json({
                error: 'Cannot delete device with existing diagnostics or rentals'
              });
            }

            // Delete the medical device
            await prisma.medicalDevice.delete({
              where: { id: id as string },
            });

            return res.status(200).json({ message: 'Medical device deleted successfully' });
          }

          // If not a medical device, check if it's a product (accessory or spare part)
          const product = await prisma.product.findUnique({
            where: { id: id as string },
            include: {
              stocks: true,
              transfers: true
            }
          });

          if (!product) {
            return res.status(404).json({ error: 'Product not found' });
          }

          // Delete related stocks first
          if (product.stocks.length > 0) {
            await prisma.stock.deleteMany({
              where: { productId: id as string }
            });
          }

          // Delete related transfers
          if (product.transfers.length > 0) {
            await prisma.stockTransfer.deleteMany({
              where: { productId: id as string }
            });
          }

          // Delete the product
          await prisma.product.delete({
            where: { id: id as string }
          });

          return res.status(200).json({ message: 'Product deleted successfully' });
        } catch (error) {
          console.error('Error deleting device/product:', error);
          return res.status(500).json({ error: 'Error deleting device/product' });
        }

      default:
        res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
        return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }
  } catch (error) {
    console.error('Request error:', error);
    res.status(500).json({ error: 'Error processing your request' });
  }
}
