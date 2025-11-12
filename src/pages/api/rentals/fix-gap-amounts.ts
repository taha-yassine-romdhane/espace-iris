import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import prisma from '@/lib/db';
import { fixInflatedGapPeriods, generateCorrectionReport } from '@/utils/fixGapPeriodAmounts';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Check authentication
  const session = await getServerSession(req, res, authOptions);
  if (!session || session.user.role !== 'ADMIN') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { rentalId, dryRun = true } = req.body;
    
    if (!rentalId) {
      return res.status(400).json({ error: 'Rental ID is required' });
    }
    
    // Fetch rental with all related data
    const rental = await prisma.rental.findUnique({
      where: { id: rentalId },
      include: {
        rentalPeriods: {
          orderBy: { startDate: 'asc' }
        },
        cnamBons: true,
        medicalDevice: true,
        configuration: true,
        patient: true
      }
    });
    
    if (!rental) {
      return res.status(404).json({ error: 'Rental not found' });
    }
    
    // Get medical device monthly price
    const monthlyPrice = rental.medicalDevice?.rentalPrice 
      ? parseFloat(rental.medicalDevice.rentalPrice.toString())
      : 1500; // Default fallback
    
    // Fix inflated gap periods
    const { fixedPeriods, corrections } = fixInflatedGapPeriods(
      rental.rentalPeriods.map(p => ({
        ...p,
        amount: parseFloat(p.expectedAmount.toString()),
        paymentMethod: 'CASH' as any, // Default since RentalPeriod doesn't have this field
        startDate: p.startDate,
        endDate: p.endDate
      })),
      monthlyPrice,
      rental.cnamBons.map(b => ({
        ...b,
        monthlyAmount: parseFloat(b.bonAmount.toString()),
        totalAmount: parseFloat(b.bonAmount.toString()),
        coveredMonths: b.coveredMonths
      }))
    );
    
    // Generate report
    const report = generateCorrectionReport(corrections);
    
    if (dryRun) {
      // Return preview without making changes
      return res.status(200).json({
        success: true,
        dryRun: true,
        rental: {
          id: rental.id,
          code: rental.rentalCode,
          patient: rental.patient ? `${rental.patient.firstName} ${rental.patient.lastName}` : null,
          device: rental.medicalDevice?.name
        },
        corrections,
        report,
        message: `Found ${corrections.length} periods that need correction. Run with dryRun=false to apply changes.`
      });
    }
    
    // Apply corrections in a transaction
    if (corrections.length > 0) {
      await prisma.$transaction(async (tx) => {
        // Update each corrected period
        for (const correction of corrections) {
          await tx.rentalPeriod.update({
            where: { id: correction.periodId },
            data: {
              expectedAmount: correction.newAmount,
              notes: `Montant corrigé le ${new Date().toLocaleDateString('fr-FR')} - Ancien: ${correction.oldAmount.toFixed(2)} TND`
            }
          });
        }
        
        // Update rental configuration total
        const newTotal = fixedPeriods.reduce((sum, p) => {
          const amount = typeof p.amount === 'number' ? p.amount : parseFloat(p.amount.toString());
          return sum + (p.isGapPeriod ? 0 : amount);
        }, 0);
        
        await tx.rentalConfiguration.update({
          where: { rentalId },
          data: {
            totalPaymentAmount: newTotal
          }
        });
        
        // Create notification for the correction
        await tx.notification.create({
          data: {
            title: 'Correction des montants de période',
            message: `Les montants des périodes gap ont été corrigés pour la location ${rental.rentalCode}. ${corrections.length} période(s) corrigée(s).`,
            type: 'INFO' as any,
            userId: session.user.id
          }
        });
      });
      
      return res.status(200).json({
        success: true,
        dryRun: false,
        corrections,
        report,
        message: `Successfully corrected ${corrections.length} periods.`
      });
    }
    
    return res.status(200).json({
      success: true,
      message: 'No corrections needed',
      report
    });
    
  } catch (error) {
    console.error('Error fixing gap amounts:', error);
    return res.status(500).json({
      error: 'Failed to fix gap amounts',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}