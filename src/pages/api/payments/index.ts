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
            select: {
              rentalCode: true,
              startDate: true, // Needed for gap calculation
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
                  serialNumber: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      // Group payments by rental for calculating period numbers and gaps
      const paymentsByRental = new Map<string, typeof payments>();
      payments.forEach(payment => {
        if (payment.rentalId) {
          if (!paymentsByRental.has(payment.rentalId)) {
            paymentsByRental.set(payment.rentalId, []);
          }
          paymentsByRental.get(payment.rentalId)!.push(payment);
        }
      });

      // Sort each rental's payments by period start date
      paymentsByRental.forEach(rentalPayments => {
        rentalPayments.sort((a, b) => {
          const dateA = new Date(a.periodStartDate || a.paymentDate);
          const dateB = new Date(b.periodStartDate || b.paymentDate);
          return dateA.getTime() - dateB.getTime();
        });
      });

      // Format for frontend with auto-calculated period numbers and gap days
      const formattedPayments = payments.map(payment => {
        let calculatedPeriodNumber = payment.periodNumber;
        let calculatedGapDays = payment.gapDays;

        // Calculate if not already set
        if (payment.rentalId && payment.periodStartDate) {
          const rentalPayments = paymentsByRental.get(payment.rentalId) || [];
          const paymentIndex = rentalPayments.findIndex(p => p.id === payment.id);

          // Calculate period number if not set
          if (calculatedPeriodNumber === null || calculatedPeriodNumber === undefined) {
            calculatedPeriodNumber = paymentIndex + 1;
          }

          // Calculate gap days if not set
          if ((calculatedGapDays === null || calculatedGapDays === undefined) && payment.rental) {
            const currentPeriodStart = new Date(payment.periodStartDate);

            if (paymentIndex === 0) {
              // P1: gap from rental start date
              const installationDate = new Date(payment.rental.startDate);
              const msPerDay = 24 * 60 * 60 * 1000;
              const diffMs = currentPeriodStart.getTime() - installationDate.getTime();
              calculatedGapDays = Math.max(0, Math.floor(diffMs / msPerDay));
            } else {
              // P2+: gap from previous period end
              const previousPayment = rentalPayments[paymentIndex - 1];
              if (previousPayment && previousPayment.periodEndDate) {
                const previousEndDate = new Date(previousPayment.periodEndDate);
                const msPerDay = 24 * 60 * 60 * 1000;
                const diffMs = currentPeriodStart.getTime() - previousEndDate.getTime();
                calculatedGapDays = Math.max(0, Math.floor(diffMs / msPerDay));
              } else {
                calculatedGapDays = 0;
              }
            }
          }
        }

        return {
          id: payment.id,
          paymentCode: payment.paymentCode,
          paymentType: payment.paymentType,
          source: payment.source,
          rentalId: payment.rentalId,
          amount: Number(payment.amount),
          method: payment.method,
          paymentDate: payment.paymentDate.toISOString().split('T')[0],
          periodStartDate: payment.periodStartDate ? payment.periodStartDate.toISOString().split('T')[0] : null,
          periodEndDate: payment.periodEndDate ? payment.periodEndDate.toISOString().split('T')[0] : null,
          periodNumber: calculatedPeriodNumber, // Auto-calculated if missing
          gapDays: calculatedGapDays, // Auto-calculated if missing
          paymentMethod: payment.method,
          status: payment.status,
          rental: payment.rental ? {
            rentalCode: payment.rental.rentalCode,
            patient: payment.rental.patient,
            medicalDevice: payment.rental.medicalDevice,
          } : null,
        };
      });

      return res.status(200).json(formattedPayments);
    } catch (error) {
      console.error('Error fetching payments:', error);
      return res.status(500).json({ error: 'Failed to fetch payments' });
    }
  }

  if (req.method === 'POST') {
    try {
      const {
        patientId,
        rentalId,
        saleId,
        amount,
        paymentDate,
        periodStartDate,
        periodEndDate,
        method,
        paymentMethod,
        paymentType,
        status,
        source,
        notes,
        periodNumber,
        gapDays
      } = req.body;

      // Validate required fields
      if (!amount || !paymentDate) {
        return res.status(400).json({ error: 'Missing required fields: amount, paymentDate' });
      }

      // Prevent manual CNAM payment creation - CNAM payments are auto-created from bonds only
      const paymentMethodValue = method || paymentMethod;
      if (paymentMethodValue === 'CNAM') {
        return res.status(400).json({
          error: 'Cannot create CNAM payments manually. CNAM payments are automatically created when creating a CNAM bond.'
        });
      }

      // Determine the source if not provided
      let paymentSource = source || 'AUTRE';
      if (rentalId && !source) paymentSource = 'RENTAL';
      if (saleId && !source) paymentSource = 'SALE';

      // Determine patient ID
      let resolvedPatientId = patientId;

      // If rentalId provided, get rental and patient info
      if (rentalId) {
        const rental = await prisma.rental.findUnique({
          where: { id: rentalId },
          select: { patientId: true },
        });

        if (!rental) {
          return res.status(404).json({ error: 'Rental not found' });
        }
        resolvedPatientId = rental.patientId;
      }

      // If saleId provided, get sale and patient info
      if (saleId) {
        const sale = await prisma.sale.findUnique({
          where: { id: saleId },
          select: { patientId: true, companyId: true },
        });

        if (!sale) {
          return res.status(404).json({ error: 'Sale not found' });
        }

        // For sales, patientId might be null if it's a company sale
        if (sale.patientId) {
          resolvedPatientId = sale.patientId;
        }
      }

      // Validate that we have a patient ID (required for payment)
      if (!resolvedPatientId) {
        return res.status(400).json({ error: 'Patient ID is required. Payment must be linked to a patient.' });
      }

      // Generate appropriate payment code based on source
      const paymentCode = await generatePaymentCode(prisma as any, paymentSource);

      // Determine payment type (only for rentals, others don't use paymentType enum)
      let resolvedPaymentType = null;
      if (paymentSource === 'RENTAL') {
        // Valid PaymentType enum values for rentals
        const validTypes = ['DEPOSIT', 'RENTAL', 'REFUND', 'PENALTY', 'ADJUSTMENT'];
        if (paymentType && validTypes.includes(paymentType)) {
          resolvedPaymentType = paymentType;
        } else {
          resolvedPaymentType = 'RENTAL'; // Default for rental payments
        }
      }

      // Build payment data
      const paymentData: any = {
        paymentCode,
        source: paymentSource,
        amount,
        method: method || paymentMethod || 'CASH',
        status: status || 'PAID',
        paymentDate: new Date(paymentDate),
        periodStartDate: periodStartDate ? new Date(periodStartDate) : null,
        periodEndDate: periodEndDate ? new Date(periodEndDate) : null,
        notes,
        patient: {
          connect: { id: resolvedPatientId }
        },
      };

      // Only set paymentType for rental payments
      if (resolvedPaymentType) {
        paymentData.paymentType = resolvedPaymentType;
      }

      // Connect to rental if provided
      if (rentalId) {
        paymentData.rental = { connect: { id: rentalId } };
      }

      // Connect to sale if provided
      if (saleId) {
        paymentData.sale = { connect: { id: saleId } };
      }

      const payment = await prisma.payment.create({
        data: paymentData,
        include: {
          rental: {
            select: {
              rentalCode: true,
              patient: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  patientCode: true,
                },
              },
            },
          },
          sale: {
            select: {
              saleCode: true,
              patient: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  patientCode: true,
                },
              },
            },
          },
        },
      });

      return res.status(201).json({
        id: payment.id,
        paymentCode: payment.paymentCode,
        source: payment.source,
        rentalId: payment.rentalId,
        saleId: payment.saleId,
        amount: Number(payment.amount),
        paymentDate: payment.paymentDate.toISOString().split('T')[0],
        method: payment.method,
        status: payment.status,
        rental: payment.rental,
        sale: payment.sale,
      });
    } catch (error) {
      console.error('Error creating payment:', error);
      return res.status(500).json({ error: 'Failed to create payment' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
