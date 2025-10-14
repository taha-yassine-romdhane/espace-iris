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

  // Set CORS headers
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  switch (req.method) {
    case 'GET':
      try {
        const { rentalId } = req.query;

        if (!rentalId || typeof rentalId !== 'string') {
          return res.status(400).json({ error: 'Rental ID is required' });
        }

        // Fetch rental periods
        const periods = await prisma.rentalPeriod.findMany({
          where: {
            rentalId: rentalId,
          },
          include: {
            cnamBond: true,
            payment: true,
          },
          orderBy: {
            startDate: 'asc'
          }
        });

        return res.status(200).json({ 
          periods,
          success: true 
        });

      } catch (error) {
        console.error('Error fetching rental periods:', error);
        return res.status(500).json({ error: 'Failed to fetch rental periods' });
      }

    case 'PATCH':
      try {
        const { periods, rentalId } = req.body;

        if (!rentalId || !Array.isArray(periods)) {
          return res.status(400).json({ error: 'Rental ID and periods array are required' });
        }

        // Verify rental exists
        const rental = await prisma.rental.findUnique({
          where: { id: rentalId }
        });

        if (!rental) {
          return res.status(404).json({ error: 'Rental not found' });
        }

        // Use a transaction to update all periods
        const result = await prisma.$transaction(async (tx) => {
          // Get existing periods for the rental
          const existingPeriods = await tx.rentalPeriod.findMany({
            where: { rentalId }
          });

          const existingPeriodIds = existingPeriods.map(p => p.id);
          const incomingPeriodIds = periods.filter(p => p.id && !p.id.startsWith('new-')).map(p => p.id);

          // Delete periods that are no longer in the list
          const periodsToDelete = existingPeriodIds.filter(id => !incomingPeriodIds.includes(id));
          if (periodsToDelete.length > 0) {
            await tx.rentalPeriod.deleteMany({
              where: {
                id: { in: periodsToDelete },
                rentalId
              }
            });
          }

          // Update or create periods
          const updatedPeriods = [];
          for (const period of periods) {
            if (period.id && !period.id.startsWith('new-')) {
              // Check if the period exists before trying to update it
              const existingPeriod = existingPeriods.find(p => p.id === period.id);
              
              if (existingPeriod) {
                // Update existing period
                const updated = await tx.rentalPeriod.update({
                  where: { id: period.id },
                  data: {
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
                    payment: true,
                  }
                });
                updatedPeriods.push(updated);
              } else {
                // Period doesn't exist, create it as new
                console.warn(`Period with ID ${period.id} not found, creating as new period`);
                const created = await tx.rentalPeriod.create({
                  data: {
                    rentalId,
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
                    payment: true,
                  }
                });
                updatedPeriods.push(created);
              }
            } else {
              // Create new period
              const created = await tx.rentalPeriod.create({
                data: {
                  rentalId,
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
                  payment: true,
                }
              });
              updatedPeriods.push(created);
            }
          }

          // Update rental configuration with new totals
          const totalAmount = periods.reduce((sum: number, period: any) => {
            const amount = typeof period.amount === 'number' ? period.amount : parseFloat(period.amount) || 0;
            return sum + amount;
          }, 0);
          
          await tx.rentalConfiguration.upsert({
            where: { rentalId },
            update: {
              totalPaymentAmount: totalAmount || 0,
              cnamEligible: periods.some((p: any) => p.paymentMethod === 'CNAM'),
            },
            create: {
              rentalId,
              totalPaymentAmount: totalAmount || 0,
              isGlobalOpenEnded: false,
              urgentRental: false,
              cnamEligible: periods.some((p: any) => p.paymentMethod === 'CNAM'),
            }
          });

          return updatedPeriods;
        });

        return res.status(200).json({
          success: true,
          periods: result,
          message: 'Rental periods updated successfully'
        });

      } catch (error) {
        console.error('Error updating rental periods:', error);
        return res.status(500).json({ 
          error: 'Failed to update rental periods',
          details: error instanceof Error ? error.message : 'Unknown error'
        });
      }

    case 'DELETE':
      try {
        const { periodId } = req.query;

        if (!periodId || typeof periodId !== 'string') {
          return res.status(400).json({ error: 'Period ID is required' });
        }

        // Delete the period
        const deletedPeriod = await prisma.rentalPeriod.delete({
          where: { id: periodId }
        });

        return res.status(200).json({
          success: true,
          message: 'Period deleted successfully',
          period: deletedPeriod
        });

      } catch (error) {
        console.error('Error deleting rental period:', error);
        return res.status(500).json({ 
          error: 'Failed to delete rental period',
          details: error instanceof Error ? error.message : 'Unknown error'
        });
      }

    default:
      return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
}