import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';

// Generate rental code
async function generateRentalCode(prisma: any): Promise<string> {
  const currentYear = new Date().getFullYear();
  const prefix = `LOC-${currentYear}-`;

  const lastRental = await prisma.rental.findFirst({
    where: {
      rentalCode: {
        startsWith: prefix,
      },
    },
    orderBy: {
      rentalCode: 'desc',
    },
  });

  if (lastRental && lastRental.rentalCode) {
    const lastNumber = parseInt(lastRental.rentalCode.split('-')[2]);
    return `${prefix}${String(lastNumber + 1).padStart(4, '0')}`;
  }

  return `${prefix}0001`;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user?.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (req.method === 'GET') {
      // Build where clause based on user role
      const where: any = {};

      // If user is EMPLOYEE, only show rentals they created or are assigned to
      if (session.user.role === 'EMPLOYEE') {
        where.OR = [
          { createdById: session.user.id },
          { assignedToId: session.user.id }
        ];
      }

      const rentals = await prisma.rental.findMany({
        where,
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
              doctor: {
                select: {
                  id: true,
                  user: {
                    select: {
                      id: true,
                      firstName: true,
                      lastName: true,
                      role: true,
                    },
                  },
                },
              },
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
              paymentType: 'RENTAL', // Only get RENTAL type payments, not DEPOSIT, PENALTY, etc.
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
              periodStartDate: 'asc', // Order by period start date ascending to get all payments in chronological order
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      // Transform data to match frontend expectations
      const transformedRentals = rentals.map((rental) => {
        const lastPayment = rental.payments && rental.payments.length > 0 ? rental.payments[rental.payments.length - 1] : null;

        return {
          id: rental.id,
          rentalCode: rental.rentalCode,
          patientId: rental.patientId,
          medicalDeviceId: rental.medicalDeviceId,
          startDate: rental.startDate.toISOString().split('T')[0],
          endDate: rental.endDate ? rental.endDate.toISOString().split('T')[0] : null,
          status: rental.status,
          createdById: rental.createdById,
          assignedToId: rental.assignedToId,
          monthlyRate: rental.configuration?.rentalRate || null,

          // Statistics dashboard fields
          alertDate: rental.alertDate ? rental.alertDate.toISOString().split('T')[0] : null,
          titrationReminderDate: rental.titrationReminderDate ? rental.titrationReminderDate.toISOString().split('T')[0] : null,
          appointmentDate: rental.appointmentDate ? rental.appointmentDate.toISOString().split('T')[0] : null,
          notes: rental.notes,

          // Last payment information
          lastPaymentDate: lastPayment ? lastPayment.paymentDate.toISOString().split('T')[0] : null,
          lastPaymentPeriodStartDate: lastPayment?.periodStartDate ? lastPayment.periodStartDate.toISOString().split('T')[0] : null,
          lastPaymentPeriodEndDate: lastPayment?.periodEndDate ? lastPayment.periodEndDate.toISOString().split('T')[0] : null,
          lastPaymentAmount: lastPayment ? lastPayment.amount : null,
          lastPaymentMethod: lastPayment ? lastPayment.method : null,
          lastPaymentType: lastPayment ? lastPayment.paymentType : null,
          lastPaymentStatus: lastPayment ? lastPayment.status : null,

          // All payments with period data
          payments: rental.payments.map(p => ({
            id: p.id,
            paymentDate: p.paymentDate.toISOString().split('T')[0],
            periodStartDate: p.periodStartDate ? p.periodStartDate.toISOString().split('T')[0] : null,
            periodEndDate: p.periodEndDate ? p.periodEndDate.toISOString().split('T')[0] : null,
            amount: p.amount,
            method: p.method,
            paymentType: p.paymentType,
            status: p.status,
          })),

          patient: rental.patient,
          medicalDevice: rental.medicalDevice,
          createdBy: rental.createdBy,
          assignedTo: rental.assignedTo,
          configuration: rental.configuration,
        };
      });

      return res.status(200).json(transformedRentals);
    }

    if (req.method === 'POST') {
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

      // Validation
      if (!patientId) {
        return res.status(400).json({ error: 'Patient ID is required' });
      }
      if (!medicalDeviceId) {
        return res.status(400).json({ error: 'Medical device is required' });
      }
      if (!startDate) {
        return res.status(400).json({ error: 'Start date is required' });
      }
      if (!configuration?.rentalRate) {
        return res.status(400).json({ error: 'Rental rate is required' });
      }

      // Generate rental code
      const rentalCode = await generateRentalCode(prisma);

      // Create rental with configuration
      const rental = await prisma.rental.create({
        data: {
          rentalCode,
          patient: {
            connect: { id: patientId }
          },
          medicalDevice: {
            connect: { id: medicalDeviceId }
          },
          createdBy: {
            connect: { id: createdById || session.user.id }
          },
          ...(assignedToId && {
            assignedTo: {
              connect: { id: assignedToId }
            }
          }),
          startDate: new Date(startDate),
          endDate: endDate ? new Date(endDate) : null,
          status: status || 'PENDING',
          configuration: {
            create: {
              rentalRate: configuration.rentalRate || 0,
              billingCycle: configuration.billingCycle || 'DAILY',
              isGlobalOpenEnded: configuration.isGlobalOpenEnded || false,
              cnamEligible: configuration.cnamEligible || false,
              deliveryNotes: configuration.deliveryNotes || null,
              internalNotes: configuration.internalNotes || null,
            },
          },
        },
        include: {
          patient: true,
          medicalDevice: true,
          createdBy: true,
          assignedTo: true,
          configuration: true,
        },
      });

      return res.status(201).json(rental);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Error in comprehensive rentals API:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
