import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { id } = req.query;

  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid rental ID' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user?.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (req.method === 'PATCH') {
      // PATCH method for partial updates (statistics dashboard fields)
      const {
        alertDate,
        titrationReminderDate,
        appointmentDate,
        notes,
      } = req.body;

      // Build update data conditionally
      const updateData: any = {};
      if (alertDate !== undefined) updateData.alertDate = alertDate ? new Date(alertDate) : null;
      if (titrationReminderDate !== undefined) updateData.titrationReminderDate = titrationReminderDate ? new Date(titrationReminderDate) : null;
      if (appointmentDate !== undefined) updateData.appointmentDate = appointmentDate ? new Date(appointmentDate) : null;
      if (notes !== undefined) updateData.notes = notes;

      // Update rental
      const rental = await prisma.rental.update({
        where: { id },
        data: updateData,
      });

      return res.status(200).json(rental);
    }

    if (req.method === 'PUT') {
      const {
        patientId,
        medicalDeviceId,
        startDate,
        endDate,
        status,
        configuration,
        createdById,
        assignedToId,
        replacementReason, // Optional reason for device replacement
      } = req.body;

      // Validate required fields
      if (!patientId || !medicalDeviceId) {
        return res.status(400).json({ error: 'Missing required fields: patientId, medicalDeviceId' });
      }

      // Use transaction to handle rental update, device replacement, and stock management
      await prisma.$transaction(async (tx) => {
        // Fetch current user's role and stock location
        const currentUser = await tx.user.findUnique({
          where: { id: session.user.id },
          select: {
            id: true,
            role: true,
            stockLocation: {
              select: {
                id: true,
                name: true,
              }
            }
          }
        });

        if (!currentUser) {
          throw new Error('Current user not found');
        }

        // STEP 1: Fetch current rental with all details BEFORE update
        const currentRental = await tx.rental.findUnique({
          where: { id },
          include: {
            medicalDevice: {
              include: {
                stockLocation: true,
              }
            },
            patient: true,
            configuration: true,
            assignedTo: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                stockLocation: true,
              }
            }
          },
        });

        if (!currentRental) {
          throw new Error('Rental not found');
        }

        const oldDeviceId = currentRental.medicalDeviceId;
        const isDeviceReplacement = oldDeviceId !== medicalDeviceId;

        // STEP 2: Handle device replacement if device is changing
        if (isDeviceReplacement) {
          console.log(`[DEVICE REPLACEMENT] Old: ${oldDeviceId}, New: ${medicalDeviceId}`);

          // Fetch new device details
          const newDevice = await tx.medicalDevice.findUnique({
            where: { id: medicalDeviceId },
            include: {
              stockLocation: true,
            }
          });

          if (!newDevice) {
            throw new Error('New medical device not found');
          }

          // Calculate rental period with old device
          const now = new Date();
          const rentalStartDate = currentRental.startDate;
          const daysWithOldDevice = Math.ceil((now.getTime() - rentalStartDate.getTime()) / (1000 * 60 * 60 * 24));

          // Determine where to return the old device based on user role (calculate before history)
          let returnToLocationId: string | undefined;
          let returnToLocationName: string | undefined;

          if (currentUser.role === 'EMPLOYEE') {
            returnToLocationId = currentUser.stockLocation?.id || undefined;
            returnToLocationName = currentUser.stockLocation?.name || undefined;
          } else {
            // For ADMIN: priority logic
            if (currentRental.assignedTo?.stockLocation?.id) {
              returnToLocationId = currentRental.assignedTo.stockLocation.id;
              returnToLocationName = currentRental.assignedTo.stockLocation.name;
            } else if (currentRental.medicalDevice.stockLocationId) {
              returnToLocationId = currentRental.medicalDevice.stockLocationId;
              returnToLocationName = currentRental.medicalDevice.stockLocation?.name;
            } else {
              returnToLocationId = currentUser.stockLocation?.id || undefined;
              returnToLocationName = currentUser.stockLocation?.name || undefined;
            }
          }

          // ISSUE #1 FIX: Create PatientHistory entry documenting the device replacement
          await tx.patientHistory.create({
            data: {
              patientId: currentRental.patientId,
              actionType: 'RENTAL',
              performedById: session.user.id,
              relatedItemId: currentRental.id,
              relatedItemType: 'Rental',
              details: {
                action: 'DEVICE_REPLACEMENT',
                rentalId: currentRental.id,
                rentalCode: currentRental.rentalCode,
                oldDevice: {
                  id: currentRental.medicalDevice.id,
                  name: currentRental.medicalDevice.name,
                  deviceCode: currentRental.medicalDevice.deviceCode,
                  serialNumber: currentRental.medicalDevice.serialNumber,
                  brand: currentRental.medicalDevice.brand,
                  model: currentRental.medicalDevice.model,
                  type: currentRental.medicalDevice.type,
                  stockLocationId: currentRental.medicalDevice.stockLocationId,
                  stockLocationName: currentRental.medicalDevice.stockLocation?.name,
                  returnedToLocationId: returnToLocationId,
                  returnedToLocationName: returnToLocationName,
                },
                newDevice: {
                  id: newDevice.id,
                  name: newDevice.name,
                  deviceCode: newDevice.deviceCode,
                  serialNumber: newDevice.serialNumber,
                  brand: newDevice.brand,
                  model: newDevice.model,
                  type: newDevice.type,
                  stockLocationId: newDevice.stockLocationId,
                  stockLocationName: newDevice.stockLocation?.name,
                },
                oldConfiguration: currentRental.configuration ? {
                  rentalRate: currentRental.configuration.rentalRate,
                  billingCycle: currentRental.configuration.billingCycle,
                  isGlobalOpenEnded: currentRental.configuration.isGlobalOpenEnded,
                  cnamEligible: currentRental.configuration.cnamEligible,
                  deliveryNotes: currentRental.configuration.deliveryNotes,
                  internalNotes: currentRental.configuration.internalNotes,
                } : null,
                rentalPeriodWithOldDevice: {
                  startDate: rentalStartDate,
                  replacementDate: now,
                  daysUsed: daysWithOldDevice,
                },
                replacementReason: replacementReason || 'Non spécifié',
                replacedAt: now,
                replacedBy: {
                  id: session.user.id,
                  name: session.user.name,
                  email: session.user.email,
                  role: currentUser.role,
                },
              },
            },
          });

          // ISSUE #2 & #5 FIX: Update old device - return to stock and mark as available
          // returnToLocationId was already calculated above based on user role
          console.log(`[DEVICE REPLACEMENT] Role: ${currentUser.role}, Returning device to location: ${returnToLocationId} (${returnToLocationName})`);

          if (returnToLocationId) {
            await tx.medicalDevice.update({
              where: { id: oldDeviceId },
              data: {
                stockLocationId: returnToLocationId,
                destination: 'FOR_RENT', // Mark as available for rent again
                status: 'ACTIVE', // Mark as active and available
              },
            });

            console.log(`[DEVICE REPLACEMENT] Old device ${oldDeviceId} returned to location ${returnToLocationId}`);
          }

          // ISSUE #5 FIX: Mark new device as RESERVED (unavailable for other rentals)
          await tx.medicalDevice.update({
            where: { id: medicalDeviceId },
            data: {
              status: 'RESERVED', // Mark as reserved/rented
            },
          });

          console.log(`[DEVICE REPLACEMENT] New device ${medicalDeviceId} marked as RESERVED`);
        }

        // STEP 3: Build update data
        const updateData: any = {
          patient: {
            connect: { id: patientId },
          },
          medicalDevice: {
            connect: { id: medicalDeviceId },
          },
          startDate: startDate ? new Date(startDate) : undefined,
          endDate: endDate ? new Date(endDate) : null,
          status: status || 'ACTIVE',
        };

        // Update createdBy if provided
        if (createdById) {
          updateData.createdBy = { connect: { id: createdById } };
        }

        // Update assignedTo - support both adding and removing
        if (assignedToId) {
          updateData.assignedTo = { connect: { id: assignedToId } };
        } else if (assignedToId === null) {
          updateData.assignedTo = { disconnect: true };
        }

        // STEP 4: Update rental using connect pattern
        const rental = await tx.rental.update({
          where: { id },
          data: updateData,
        });

        // STEP 5: Update or create configuration (ISSUE #3 FIX: Preserve configuration)
        if (configuration) {
          await tx.rentalConfiguration.upsert({
            where: { rentalId: id },
            update: {
              rentalRate: configuration.rentalRate !== undefined ? parseFloat(configuration.rentalRate) : undefined,
              billingCycle: configuration.billingCycle || undefined,
              isGlobalOpenEnded: configuration.isGlobalOpenEnded !== undefined ? configuration.isGlobalOpenEnded : undefined,
              cnamEligible: configuration.cnamEligible !== undefined ? configuration.cnamEligible : undefined,
              deliveryNotes: configuration.deliveryNotes !== undefined ? configuration.deliveryNotes : undefined,
              internalNotes: configuration.internalNotes !== undefined ? configuration.internalNotes : undefined,
            },
            create: {
              rentalId: id,
              rentalRate: configuration.rentalRate || 0,
              billingCycle: configuration.billingCycle || 'DAILY',
              isGlobalOpenEnded: configuration.isGlobalOpenEnded || false,
              cnamEligible: configuration.cnamEligible || false,
              deliveryNotes: configuration.deliveryNotes || null,
              internalNotes: configuration.internalNotes || null,
            },
          });
        }

        return rental;
      });

      // Fetch updated rental with relations
      const updatedRental = await prisma.rental.findUnique({
        where: { id },
        include: {
          patient: true,
          medicalDevice: true,
          createdBy: true,
          assignedTo: true,
          configuration: true,
        },
      });

      return res.status(200).json(updatedRental);
    }

    if (req.method === 'DELETE') {
      // Delete rental with cascade deletion and device return
      await prisma.$transaction(async (tx) => {
        // Fetch rental with device info
        const rental = await tx.rental.findUnique({
          where: { id },
          include: {
            medicalDevice: {
              select: {
                id: true,
                stockLocationId: true,
              },
            },
            assignedTo: {
              select: {
                stockLocation: {
                  select: {
                    id: true,
                  },
                },
              },
            },
          },
        });

        if (!rental) {
          throw new Error('Rental not found');
        }

        // Get current user's stock location
        const currentUser = await tx.user.findUnique({
          where: { id: session.user.id },
          select: {
            role: true,
            stockLocation: {
              select: {
                id: true,
              },
            },
          },
        });

        // Determine where to return the device
        let returnToLocationId: string | undefined;

        if (currentUser?.role === 'EMPLOYEE' && currentUser.stockLocation?.id) {
          returnToLocationId = currentUser.stockLocation.id;
        } else if (rental.assignedTo?.stockLocation?.id) {
          returnToLocationId = rental.assignedTo.stockLocation.id;
        } else if (rental.medicalDevice.stockLocationId) {
          returnToLocationId = rental.medicalDevice.stockLocationId;
        } else if (currentUser?.stockLocation?.id) {
          returnToLocationId = currentUser.stockLocation.id;
        }

        // Delete related data in correct order (respecting foreign key constraints)
        // 1. Delete CNAM bons
        await tx.cNAMBonRental.deleteMany({
          where: { rentalId: id },
        });

        // 2. Delete payment details first, then payments
        const payments = await tx.payment.findMany({
          where: { rentalId: id },
          select: { id: true },
        });

        for (const payment of payments) {
          await tx.paymentDetail.deleteMany({
            where: { paymentId: payment.id },
          });
        }

        await tx.payment.deleteMany({
          where: { rentalId: id },
        });

        // 3. Delete rental accessories
        await tx.rentalAccessory.deleteMany({
          where: { rentalId: id },
        });

        // 4. Delete rental gaps
        await tx.rentalGap.deleteMany({
          where: { rentalId: id },
        });

        // 5. Delete rental configuration
        await tx.rentalConfiguration.deleteMany({
          where: { rentalId: id },
        });

        // 6. Return device to stock and mark as ACTIVE
        if (rental.medicalDeviceId && returnToLocationId) {
          await tx.medicalDevice.update({
            where: { id: rental.medicalDeviceId },
            data: {
              stockLocationId: returnToLocationId,
              destination: 'FOR_RENT',
              status: 'ACTIVE',
            },
          });
        }

        // 7. Finally, delete the rental itself
        await tx.rental.delete({
          where: { id },
        });
      });

      return res.status(200).json({ message: 'Rental deleted successfully' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Error in comprehensive rental [id] API:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
