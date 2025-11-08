import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user?.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.query;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'Invalid rental ID' });
    }

    // GET - Fetch single rental
    if (req.method === 'GET') {
      const rental = await prisma.rental.findUnique({
        where: { id },
        include: {
          patient: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              cnamId: true,
              telephone: true,
              telephoneTwo: true,
              patientCode: true,
            },
          },
          medicalDevice: {
            select: {
              id: true,
              name: true,
              deviceCode: true,
              rentalPrice: true,
              type: true,
            },
          },
          createdBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
          assignedTo: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
          configuration: {
            select: {
              rentalRate: true,
              billingCycle: true,
              isGlobalOpenEnded: true,
              cnamEligible: true,
              deliveryNotes: true,
              internalNotes: true,
            },
          },
          payments: {
            where: {
              paymentType: 'RENTAL',
            },
            select: {
              id: true,
              paymentDate: true,
              periodStartDate: true,
              periodEndDate: true,
              amount: true,
              method: true,
              paymentType: true,
              status: true,
            },
            orderBy: {
              periodStartDate: 'asc',
            },
          },
        },
      });

      if (!rental) {
        return res.status(404).json({ error: 'Rental not found' });
      }

      return res.status(200).json(rental);
    }

    // PUT/PATCH - Update rental
    if (req.method === 'PUT' || req.method === 'PATCH') {
      const {
        patientId,
        medicalDeviceId,
        startDate,
        endDate,
        status,
        configuration,
        createdById,
        assignedToId,
        alertDate,
        titrationReminderDate,
        appointmentDate,
        notes,
      } = req.body;

      // Check if rental exists
      const existingRental = await prisma.rental.findUnique({
        where: { id },
        include: { configuration: true },
      });

      if (!existingRental) {
        return res.status(404).json({ error: 'Rental not found' });
      }

      // Prepare update data
      const updateData: any = {
        ...(patientId && { patient: { connect: { id: patientId } } }),
        ...(medicalDeviceId && { medicalDevice: { connect: { id: medicalDeviceId } } }),
        ...(startDate && { startDate: new Date(startDate) }),
        ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
        ...(status && { status }),
        ...(createdById && { createdBy: { connect: { id: createdById } } }),
        ...(alertDate !== undefined && { alertDate: alertDate ? new Date(alertDate) : null }),
        ...(titrationReminderDate !== undefined && { titrationReminderDate: titrationReminderDate ? new Date(titrationReminderDate) : null }),
        ...(appointmentDate !== undefined && { appointmentDate: appointmentDate ? new Date(appointmentDate) : null }),
        ...(notes !== undefined && { notes }),
      };

      // Handle assignedTo (can be null or undefined to remove assignment)
      if (assignedToId === null) {
        updateData.assignedTo = { disconnect: true };
      } else if (assignedToId) {
        updateData.assignedTo = { connect: { id: assignedToId } };
      }

      // Update configuration if provided
      if (configuration && existingRental.configuration) {
        await prisma.rentalConfiguration.update({
          where: { id: existingRental.configuration.id },
          data: {
            ...(configuration.rentalRate !== undefined && { rentalRate: configuration.rentalRate }),
            ...(configuration.billingCycle && { billingCycle: configuration.billingCycle }),
            ...(configuration.isGlobalOpenEnded !== undefined && { isGlobalOpenEnded: configuration.isGlobalOpenEnded }),
            ...(configuration.cnamEligible !== undefined && { cnamEligible: configuration.cnamEligible }),
            ...(configuration.deliveryNotes !== undefined && { deliveryNotes: configuration.deliveryNotes }),
            ...(configuration.internalNotes !== undefined && { internalNotes: configuration.internalNotes }),
          },
        });
      } else if (configuration && !existingRental.configuration) {
        // Create configuration if it doesn't exist
        updateData.configuration = {
          create: {
            rentalRate: configuration.rentalRate || 0,
            billingCycle: configuration.billingCycle || 'DAILY',
            isGlobalOpenEnded: configuration.isGlobalOpenEnded || false,
            cnamEligible: configuration.cnamEligible || false,
            deliveryNotes: configuration.deliveryNotes || null,
            internalNotes: configuration.internalNotes || null,
          },
        };
      }

      const updatedRental = await prisma.rental.update({
        where: { id },
        data: updateData,
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

    // DELETE - Delete rental
    if (req.method === 'DELETE') {
      // Check if rental exists
      const existingRental = await prisma.rental.findUnique({
        where: { id },
        include: {
          payments: true,
          accessories: true,
          configuration: true,
        },
      });

      if (!existingRental) {
        return res.status(404).json({ error: 'Rental not found' });
      }

      // Check if there are payments
      if (existingRental.payments && existingRental.payments.length > 0) {
        return res.status(400).json({
          error: 'Cannot delete rental with existing payments. Please delete payments first.'
        });
      }

      // Delete configuration first if it exists
      if (existingRental.configuration) {
        await prisma.rentalConfiguration.delete({
          where: { id: existingRental.configuration.id },
        });
      }

      // Delete rental accessories if any
      if (existingRental.accessories && existingRental.accessories.length > 0) {
        await prisma.rentalAccessory.deleteMany({
          where: { rentalId: id },
        });
      }

      // Delete the rental
      await prisma.rental.delete({
        where: { id },
      });

      return res.status(200).json({ message: 'Rental deleted successfully' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Error in rental API:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
