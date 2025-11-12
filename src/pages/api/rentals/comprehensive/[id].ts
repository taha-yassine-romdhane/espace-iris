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
      } = req.body;

      // Validate required fields
      if (!patientId || !medicalDeviceId) {
        return res.status(400).json({ error: 'Missing required fields: patientId, medicalDeviceId' });
      }

      // Use transaction to handle rental update and placeholder period
      await prisma.$transaction(async (tx) => {
        // Build update data
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

        // Update rental using connect pattern
        const rental = await tx.rental.update({
          where: { id },
          data: updateData,
        });

        // Update or create configuration
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
      // Delete rental (configuration will be cascade deleted)
      await prisma.rental.delete({
        where: { id },
      });

      return res.status(200).json({ message: 'Rental deleted successfully' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Error in comprehensive rental [id] API:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
