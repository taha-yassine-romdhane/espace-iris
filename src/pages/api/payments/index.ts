import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import prisma from '@/lib/db';
import { generatePaymentCode } from '@/utils/idGenerator';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    try {
      // Build where clause based on user role
      const where: any = {
        rentalId: {
          not: null,
        },
      };

      // If user is EMPLOYEE, only show payments for rentals they created or are assigned to
      if (session.user.role === 'EMPLOYEE') {
        where.rental = {
          OR: [
            { createdById: session.user.id },
            { assignedToId: session.user.id }
          ]
        };
      }

      // Get all rental payments
      const payments = await prisma.payment.findMany({
        where,
        include: {
          rental: {
            include: {
              patient: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  patientCode: true,
                },
              },
              medicalDevice: {
                select: {
                  id: true,
                  name: true,
                  deviceCode: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      // Format for frontend
      const formattedPayments = payments.map(payment => ({
        id: payment.id,
        paymentCode: payment.paymentCode,
        paymentType: payment.paymentType,
        source: payment.source, // Include source field
        rentalId: payment.rentalId,
        amount: Number(payment.amount),
        method: payment.method, // Include method field
        paymentDate: payment.paymentDate.toISOString().split('T')[0],
        periodStartDate: payment.periodStartDate ? payment.periodStartDate.toISOString().split('T')[0] : null,
        periodEndDate: payment.periodEndDate ? payment.periodEndDate.toISOString().split('T')[0] : null,
        periodNumber: payment.periodNumber, // Period number (1, 2, 3, etc.)
        gapDays: payment.gapDays, // Number of gap days
        paymentMethod: payment.method, // Keep for backward compatibility
        status: payment.status,
        rental: payment.rental ? {
          rentalCode: payment.rental.rentalCode,
          patient: payment.rental.patient,
          medicalDevice: payment.rental.medicalDevice,
        } : null,
      }));

      return res.status(200).json(formattedPayments);
    } catch (error) {
      console.error('Error fetching payments:', error);
      return res.status(500).json({ error: 'Failed to fetch payments' });
    }
  }

  if (req.method === 'POST') {
    try {
      const { rentalId, rentalPeriodId, amount, paymentDate, periodStartDate, periodEndDate, paymentMethod, paymentType, status, notes, periodNumber, gapDays } = req.body;

      if (!rentalId || !amount || !paymentDate) {
        return res.status(400).json({ error: 'Missing required fields: rentalId, amount, paymentDate' });
      }

      // Get rental to verify it exists and get configuration for rate calculation
      const rental = await prisma.rental.findUnique({
        where: { id: rentalId },
        include: {
          patient: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              patientCode: true,
            },
          },
          medicalDevice: {
            select: {
              id: true,
              name: true,
              deviceCode: true,
            },
          },
          configuration: {
            select: {
              rentalRate: true,
              billingCycle: true,
            },
          },
        },
      });

      if (!rental) {
        return res.status(404).json({ error: 'Rental not found' });
      }

      const paymentCode = await generatePaymentCode(prisma as any, 'RENTAL');

      const payment = await prisma.payment.create({
        data: {
          paymentCode,
          paymentType: paymentType || 'RENTAL',
          source: 'RENTAL', // Mark this as a RENTAL payment
          amount,
          method: paymentMethod || 'CASH',
          status: status || 'PAID',
          paymentDate: new Date(paymentDate),
          periodStartDate: periodStartDate ? new Date(periodStartDate) : null,
          periodEndDate: periodEndDate ? new Date(periodEndDate) : null,
          notes,
          rental: {
            connect: { id: rentalId }
          },
          patient: {
            connect: { id: rental.patientId }
          },
        },
      });

      return res.status(201).json({
        id: payment.id,
        rentalId,
        amount: Number(payment.amount),
        paymentDate: payment.createdAt.toISOString().split('T')[0],
        paymentMethod: payment.method,
        status: payment.status,
        rental: {
          patient: rental.patient,
          device: rental.medicalDevice,
        },
      });
    } catch (error) {
      console.error('Error creating payment:', error);
      return res.status(500).json({ error: 'Failed to create payment' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
