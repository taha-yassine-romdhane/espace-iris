import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import prisma from '@/lib/db';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Check authentication
  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Get rental ID from request
  const { id } = req.query;
  
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid rental ID' });
  }

  // Set CORS headers
  res.setHeader('Access-Control-Allow-Methods', 'GET, PATCH, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  switch (req.method) {
    case 'GET':
    try {
      // Fetch rental with all related data including enhanced relationships
      const rental = await prisma.rental.findUnique({
        where: {
          id: id,
        },
        include: {
          medicalDevice: true,
          patient: {
            include: {
              doctor: true,
            }
          },
          Company: true,
          payment: {
            include: {
              paymentDetails: true,
            },
          },
          // Include new relational data
          accessories: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  type: true,
                  brand: true,
                  model: true,
                }
              }
            }
          },
          configuration: true,
          gaps: {
            orderBy: {
              startDate: 'asc'
            }
          },
          // Include CNAM bonds
          cnamBonds: {
            orderBy: {
              createdAt: 'desc'
            }
          },
          // Include rental periods
          rentalPeriods: {
            include: {
              payment: true,
              cnamBond: true,
            },
            orderBy: {
              startDate: 'asc'
            }
          }
        },
      });

      if (!rental) {
        return res.status(404).json({ error: 'Rental not found' });
      }

      // Return the rental data
      return res.status(200).json({ rental });
    } catch (error) {
      console.error('Error fetching rental:', error);
      return res.status(500).json({ error: 'Failed to fetch rental' });
    }

    case 'PATCH':
      try {
        const updateData = req.body;
        
        // Update the rental
        const updatedRental = await prisma.rental.update({
          where: { id },
          data: {
            ...(updateData.startDate && { startDate: new Date(updateData.startDate) }),
            ...(updateData.endDate && { endDate: new Date(updateData.endDate) }),
            ...(updateData.notes !== undefined && { notes: updateData.notes }),
            ...(updateData.status && { status: updateData.status }),
            ...(updateData.metadata && { metadata: updateData.metadata }),
          },
          include: {
            medicalDevice: true,
            patient: {
              include: {
                doctor: true,
              }
            },
            Company: true,
            payment: {
              include: {
                paymentDetails: true,
              },
            },
            // Include new relational data
            accessories: {
              include: {
                product: {
                  select: {
                    id: true,
                    name: true,
                    type: true,
                    brand: true,
                    model: true,
                  }
                }
              }
            },
            configuration: true,
            gaps: {
              orderBy: {
                startDate: 'asc'
              }
            },
            cnamBonds: {
              orderBy: {
                createdAt: 'desc'
              }
            },
            rentalPeriods: {
              include: {
                payment: true,
                cnamBond: true,
              },
              orderBy: {
                startDate: 'asc'
              }
            }
          },
        });
        
        return res.status(200).json({ 
          success: true, 
          rental: updatedRental 
        });
        
      } catch (error) {
        console.error('Error updating rental:', error);
        return res.status(500).json({ 
          error: 'Failed to update rental',
          details: error instanceof Error ? error.message : 'Unknown error'
        });
      }

    case 'DELETE':
      try {
        // Delete the rental and related records in a transaction
        const deletedRental = await prisma.$transaction(async (tx) => {
          // First, get the rental to check if it exists
          const rental = await tx.rental.findUnique({
            where: { id },
            include: {
              medicalDevice: true,
              patient: true,
              Company: true,
            }
          });
          
          if (!rental) {
            throw new Error('Rental not found');
          }
          
          // Update the medical device to remove patient/company association
          await tx.medicalDevice.update({
            where: { id: rental.medicalDeviceId },
            data: {
              patientId: null,
              companyId: null,
            }
          });
          
          // Delete related accessories and restore stock
          const accessories = await tx.rentalAccessory.findMany({
            where: { rentalId: id }
          });
          
          for (const accessory of accessories) {
            // Restore stock quantity
            const existingStock = await tx.stock.findFirst({
              where: {
                productId: accessory.productId,
                status: 'FOR_RENT'
              }
            });
            
            if (existingStock) {
              await tx.stock.update({
                where: { id: existingStock.id },
                data: {
                  quantity: existingStock.quantity + accessory.quantity,
                  status: 'FOR_SALE' // Return to available status
                }
              });
            }
          }
          
          // Delete rental accessories
          await tx.rentalAccessory.deleteMany({
            where: { rentalId: id }
          });
          
          // Delete rental configuration
          await tx.rentalConfiguration.deleteMany({
            where: { rentalId: id }
          });
          
          // Delete rental gaps
          await tx.rentalGap.deleteMany({
            where: { rentalId: id }
          });
          
          // Delete related rental periods
          await tx.rentalPeriod.deleteMany({
            where: { rentalId: id }
          });
          
          // Update CNAM bonds to remove rental association
          await tx.cNAMBondRental.updateMany({
            where: { rentalId: id },
            data: { rentalId: null }
          });
          
          // Delete the rental
          const deleted = await tx.rental.delete({
            where: { id }
          });
          
          // Create patient history record for the deletion
          if (rental.patientId) {
            await tx.patientHistory.create({
              data: {
                patientId: rental.patientId,
                actionType: 'RENTAL',
                performedById: session.user.id,
                relatedItemId: rental.id,
                relatedItemType: 'Rental',
                details: {
                  rentalId: rental.id,
                  deviceId: rental.medicalDeviceId,
                  deviceName: rental.medicalDevice.name,
                  deletedAt: new Date(),
                  action: 'DELETED',
                },
              },
            });
          }
          
          return deleted;
        });
        
        return res.status(200).json({ 
          success: true, 
          message: 'Rental deleted successfully',
          data: deletedRental 
        });
        
      } catch (error) {
        if (error instanceof Error && error.message === 'Rental not found') {
          return res.status(404).json({ error: 'Rental not found' });
        }
        console.error('Error deleting rental:', error);
        return res.status(500).json({ 
          error: 'Failed to delete rental',
          details: error instanceof Error ? error.message : 'Unknown error'
        });
      }

    default:
      return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
}
