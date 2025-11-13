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
            stockLocation: device.stockLocation?.name || 'Non assigné',
            stockLocationId: device.stockLocationId,
            stockQuantity: device.stockQuantity,
            status: device.status,
            technicalSpecs: device.technicalSpecs,
            configuration: device.configuration,
            warranty: device.warranty,
            description: device.description,
            maintenanceInterval: device.maintenanceInterval,
            installationDate: device.installationDate,
            deviceCode: device.deviceCode
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
          description: product.description,
          partNumber: product.partNumber,
          compatibleWith: product.compatibleWith,
          minQuantity: product.minQuantity,
          purchasePrice: product.purchasePrice,
          sellingPrice: product.sellingPrice,
          warrantyExpiration: product.warrantyExpiration,
          stocks: product.stocks, // Include full stocks array for edit form
          // Backwards compatibility fields
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

          // Check if this is a simple update without type (e.g., just updating reservation status or stock location)
          // If so, update the medical device directly
          if (!type && (data.patientId || data.location || data.reservedUntil || data.stockLocationId)) {
            try {
              const updatedDevice = await prisma.medicalDevice.update({
                where: { id: id as string },
                data: {
                  ...(data.patientId ? { patientId: data.patientId } : {}),
                  ...(data.location ? { location: data.location } : {}),
                  ...(data.status ? { status: data.status } : {}),
                  ...(data.reservedUntil ? { reservedUntil: new Date(data.reservedUntil) } : {}),
                  ...(data.stockLocationId ? {
                    stockLocation: {
                      connect: { id: data.stockLocationId }
                    }
                  } : {})
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
                status: updatedDevice.status,
                stockLocationId: updatedDevice.stockLocationId,
                stockLocation: updatedDevice.stockLocation
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

            // Check if device exists and has no code - generate one
            const existingDevice = await prisma.medicalDevice.findUnique({
              where: { id: id as string }
            });

            if (!existingDevice) {
              return res.status(404).json({ error: 'Device not found' });
            }

            let deviceCode = existingDevice.deviceCode;

            // Check if device needs code generation or pattern correction
            const needsCodeGeneration = !deviceCode;
            const isDiagnosticDevice = existingDevice.type === 'DIAGNOSTIC_DEVICE' || type === 'DIAGNOSTIC_DEVICE';

            // Check if pattern is incorrect
            let needsPatternCorrection = false;
            if (deviceCode && isDiagnosticDevice) {
              // Diagnostic device should have APP-DIAG-XX pattern, not APPXXXX or other patterns
              needsPatternCorrection = !deviceCode.match(/^APP-DIAG-\d{2}$/);
            } else if (deviceCode && !isDiagnosticDevice) {
              // Regular device should have APPXXXX pattern, not APP-DIAG-XX
              needsPatternCorrection = deviceCode.startsWith('APP-DIAG-');
            }

            if (needsCodeGeneration || needsPatternCorrection) {
              if (needsCodeGeneration) {
                console.log('Device has no code, generating new code...');
              } else {
                console.log('Device has incorrect pattern, correcting code from:', deviceCode);
              }

              if (isDiagnosticDevice) {
                // Generate APP-DIAG-01, APP-DIAG-02, etc. for diagnostic devices
                const lastDiagDevice = await prisma.medicalDevice.findFirst({
                  where: {
                    deviceCode: {
                      startsWith: 'APP-DIAG-'
                    }
                  },
                  orderBy: {
                    deviceCode: 'desc'
                  }
                });

                deviceCode = 'APP-DIAG-01';
                if (lastDiagDevice && lastDiagDevice.deviceCode) {
                  const lastNumber = parseInt(lastDiagDevice.deviceCode.replace('APP-DIAG-', ''));
                  if (!isNaN(lastNumber)) {
                    deviceCode = `APP-DIAG-${String(lastNumber + 1).padStart(2, '0')}`;
                  }
                }
              } else {
                // Generate APP0001, APP0002, etc. for regular medical devices
                const lastDevice = await prisma.medicalDevice.findFirst({
                  where: {
                    deviceCode: {
                      startsWith: 'APP',
                      not: {
                        startsWith: 'APP-DIAG-'
                      }
                    }
                  },
                  orderBy: {
                    deviceCode: 'desc'
                  }
                });

                deviceCode = 'APP0001';
                if (lastDevice && lastDevice.deviceCode) {
                  const lastNumber = parseInt(lastDevice.deviceCode.replace('APP', ''));
                  if (!isNaN(lastNumber)) {
                    deviceCode = `APP${String(lastNumber + 1).padStart(4, '0')}`;
                  }
                }
              }

              console.log('Generated/Corrected device code:', deviceCode);
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
                  deviceCode: deviceCode, // Set the generated or existing code
                  name: data.name,
                  brand: data.brand,
                  model: data.model,
                  serialNumber: data.serialNumber,
                  purchasePrice: data.purchasePrice ? parseFloat(data.purchasePrice) : null,
                  sellingPrice: data.sellingPrice ? parseFloat(data.sellingPrice) : null,
                  rentalPrice: data.rentalPrice ? parseFloat(data.rentalPrice) : null,
                  status: data.status || 'ACTIVE',
                  // Optional fields from schema
                  technicalSpecs: data.technicalSpecs || null,
                  configuration: data.configuration || null,
                  warranty: data.warranty || null,
                  description: data.description || null,
                  maintenanceInterval: data.maintenanceInterval || null,
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
                rentalPrice: updatedDevice.rentalPrice,
                stockLocation: updatedDevice.stockLocation?.name || 'Non assigné',
                stockLocationId: updatedDevice.stockLocationId,
                stockQuantity: updatedDevice.stockQuantity,
                status: updatedDevice.status,
                technicalSpecs: updatedDevice.technicalSpecs,
                configuration: updatedDevice.configuration,
                warranty: updatedDevice.warranty,
                description: updatedDevice.description,
                maintenanceInterval: updatedDevice.maintenanceInterval,
                deviceCode: updatedDevice.deviceCode
              });
            } catch (updateError) {
              console.error('Error updating device:', updateError);
              return res.status(500).json({ error: 'Failed to update device' });
            }
          } else {
            // Update product (accessories/spare parts)
            try {
              const { warrantyExpiration, purchasePrice, sellingPrice, status, stockLocationId, stockQuantity, stockEntries, description, minQuantity, ...productData } = data;

              console.log('Updating product with description:', description);

              // First, get the existing product to check if it needs a code
              const existingProduct = await prisma.product.findUnique({
                where: { id: id as string }
              });

              if (!existingProduct) {
                return res.status(404).json({ error: 'Product not found' });
              }

              let productCode = existingProduct.productCode;
              const type = productData.type || existingProduct.type;

              // Check if product needs code generation or pattern correction
              const needsCodeGeneration = !productCode;
              let needsPatternCorrection = false;

              if (productCode && type) {
                const expectedPrefix = type === 'ACCESSORY' ? 'ACC-' : type === 'SPARE_PART' ? 'PIEC-' : 'PRD-';
                needsPatternCorrection = !productCode.startsWith(expectedPrefix);
              }

              if (needsCodeGeneration || needsPatternCorrection) {
                if (needsCodeGeneration) {
                  console.log('Product has no code, generating new code...');
                } else {
                  console.log('Product has incorrect pattern, correcting code from:', productCode);
                }

                const prefix = type === 'ACCESSORY' ? 'ACC-' : type === 'SPARE_PART' ? 'PIEC-' : 'PRD-';

                const lastProduct = await prisma.product.findFirst({
                  where: {
                    type: type,
                    productCode: {
                      startsWith: prefix
                    }
                  },
                  orderBy: {
                    productCode: 'desc'
                  }
                });

                productCode = `${prefix}001`;
                if (lastProduct && lastProduct.productCode) {
                  const lastNumber = parseInt(lastProduct.productCode.replace(prefix, ''));
                  if (!isNaN(lastNumber)) {
                    productCode = `${prefix}${String(lastNumber + 1).padStart(3, '0')}`;
                  }
                }

                console.log('Generated/Corrected product code:', productCode);
              }

              const updatePayload: any = {
                ...productData,
                productCode: productCode, // Always set the productCode
              };

              if (description !== undefined) {
                updatePayload.description = description;
              }
              if (minQuantity !== undefined) {
                updatePayload.minQuantity = minQuantity ? parseInt(minQuantity.toString()) : null;
              }
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

              // Handle multi-location stock updates
              if (Array.isArray(stockEntries) && stockEntries.length > 0) {
                // Delete existing stocks
                await prisma.stock.deleteMany({
                  where: { productId: id as string }
                });

                // Create new stocks based on stockEntries
                const createdStocks = await Promise.all(
                  stockEntries.map((entry: any) =>
                    prisma.stock.create({
                      data: {
                        productId: id as string,
                        locationId: entry.locationId,
                        quantity: parseInt(entry.quantity.toString()),
                        status: entry.status || 'FOR_SALE'
                      },
                      include: {
                        location: true
                      }
                    })
                  )
                );

                // Calculate total quantity
                const totalQuantity = createdStocks.reduce((sum, stock) => sum + stock.quantity, 0);

                return res.status(200).json({
                  id: updatedProduct.id,
                  name: updatedProduct.name,
                  type: updatedProduct.type,
                  brand: updatedProduct.brand,
                  model: updatedProduct.model,
                  serialNumber: updatedProduct.serialNumber,
                  description: updatedProduct.description,
                  partNumber: updatedProduct.partNumber,
                  compatibleWith: updatedProduct.compatibleWith,
                  minQuantity: updatedProduct.minQuantity,
                  purchasePrice: updatedProduct.purchasePrice,
                  sellingPrice: updatedProduct.sellingPrice,
                  warrantyExpiration: updatedProduct.warrantyExpiration,
                  stocks: createdStocks,
                  locations: createdStocks.map(stock => ({
                    id: stock.location.id,
                    name: stock.location.name,
                    quantity: stock.quantity,
                    status: stock.status
                  })),
                  totalQuantity: totalQuantity,
                  // Backwards compatibility
                  stockLocation: createdStocks[0]?.location?.name || 'Non assigné',
                  stockLocationId: createdStocks[0]?.location?.id,
                  stockQuantity: createdStocks[0]?.quantity || 0,
                  status: createdStocks[0]?.status || 'FOR_SALE'
                });
              }
              // Fallback to old single-location format (backwards compatibility)
              else if (stockLocationId) {
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

                // Fetch updated product with stocks
                const productWithStocks = await prisma.product.findUnique({
                  where: { id: id as string },
                  include: {
                    stocks: {
                      include: {
                        location: true
                      }
                    }
                  }
                });

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
                  description: updatedProduct.description,
                  partNumber: updatedProduct.partNumber,
                  compatibleWith: updatedProduct.compatibleWith,
                  minQuantity: updatedProduct.minQuantity,
                  purchasePrice: updatedProduct.purchasePrice,
                  sellingPrice: updatedProduct.sellingPrice,
                  warrantyExpiration: updatedProduct.warrantyExpiration,
                  stockLocation: productWithStocks?.stocks[0]?.location?.name || 'Non assigné',
                  stockLocationId: productWithStocks?.stocks[0]?.location?.id,
                  stockQuantity: productWithStocks?.stocks[0]?.quantity || 0,
                  status: mappedStatus
                });
              } else {
                // No stock update needed, just return updated product info
                const productWithStocks = await prisma.product.findUnique({
                  where: { id: id as string },
                  include: {
                    stocks: {
                      include: {
                        location: true
                      }
                    }
                  }
                });

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
                  description: updatedProduct.description,
                  partNumber: updatedProduct.partNumber,
                  compatibleWith: updatedProduct.compatibleWith,
                  minQuantity: updatedProduct.minQuantity,
                  purchasePrice: updatedProduct.purchasePrice,
                  sellingPrice: updatedProduct.sellingPrice,
                  warrantyExpiration: updatedProduct.warrantyExpiration,
                  stockLocation: productWithStocks?.stocks[0]?.location?.name || 'Non assigné',
                  stockLocationId: productWithStocks?.stocks[0]?.location?.id,
                  stockQuantity: productWithStocks?.stocks[0]?.quantity || 0,
                  status: mappedStatus
                });
              }
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
