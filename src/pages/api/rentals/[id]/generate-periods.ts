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

  const { id } = req.query;
  
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid rental ID' });
  }

  // Set CORS headers
  res.setHeader('Access-Control-Allow-Methods', 'POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  try {
    const { periods } = req.body;

    if (!periods || !Array.isArray(periods)) {
      return res.status(400).json({ error: 'Invalid periods data' });
    }

    // Validate rental exists
    const rental = await prisma.rental.findUnique({
      where: { id },
      include: {
        medicalDevice: true,
        patient: true,
        cnamBonds: true,
      }
    });

    if (!rental) {
      return res.status(404).json({ error: 'Rental not found' });
    }

    // Create periods in transaction
    const result = await prisma.$transaction(async (tx) => {
      const createdPeriods = [];

      for (const period of periods) {
        // Validate period data
        if (!period.startDate || !period.endDate || period.amount === undefined) {
          throw new Error(`Invalid period data: ${JSON.stringify(period)}`);
        }

        // Create rental period
        const createdPeriod = await tx.rentalPeriod.create({
          data: {
            rentalId: id,
            startDate: new Date(period.startDate),
            endDate: new Date(period.endDate),
            amount: typeof period.amount === 'number' ? period.amount : parseFloat(period.amount) || 0,
            paymentMethod: period.paymentMethod || 'CASH',
            isGapPeriod: period.isGapPeriod || false,
            gapReason: period.gapReason || null,
            notes: period.notes || null,
            cnamBondId: period.cnamBondId || null,
          },
          include: {
            cnamBond: true,
          }
        });

        createdPeriods.push(createdPeriod);
      }

      // Update rental configuration if needed
      const totalAmount = periods.reduce((sum: number, period: any) => {
        const amount = typeof period.amount === 'number' ? period.amount : parseFloat(period.amount) || 0;
        return sum + amount;
      }, 0);
      
      // Get current configuration to handle null totalPaymentAmount
      const currentConfig = await tx.rentalConfiguration.findUnique({
        where: { rentalId: id }
      });
      
      const currentTotal = currentConfig?.totalPaymentAmount 
        ? parseFloat(currentConfig.totalPaymentAmount.toString()) 
        : 0;
      
      await tx.rentalConfiguration.upsert({
        where: { rentalId: id },
        update: {
          totalPaymentAmount: currentTotal + totalAmount
        },
        create: {
          rentalId: id,
          totalPaymentAmount: totalAmount,
          isGlobalOpenEnded: false,
          urgentRental: false,
          cnamEligible: periods.some((p: any) => p.paymentMethod === 'CNAM'),
        }
      });

      // Create notifications for gaps
      const gapPeriods = periods.filter((p: any) => p.isGapPeriod);
      
      for (const gap of gapPeriods) {
        const gapSeverity = gap.gapReason === 'CNAM_PENDING' || gap.gapReason === 'CNAM_EXPIRED' ? 'HIGH' : 'MEDIUM';
        const dueDate = new Date(gap.startDate);
        
        await tx.notification.create({
          data: {
            title: 'Gap de paiement détecté',
            message: `Un gap de paiement de ${(typeof gap.amount === 'number' ? gap.amount : parseFloat(gap.amount) || 0).toFixed(2)} TND a été détecté pour la location ${rental.medicalDevice.name}`,
            type: 'PAYMENT_DUE',
            status: 'PENDING',
            dueDate: dueDate,
            patientId: rental.patientId,
            userId: session.user.id,
          }
        });
      }

      return createdPeriods;
    });

    return res.status(200).json({
      success: true,
      periods: result,
      message: `${result.length} périodes de paiement générées avec succès`
    });

  } catch (error) {
    console.error('Error generating payment periods:', error);
    return res.status(500).json({
      error: 'Failed to generate payment periods',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}