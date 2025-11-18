import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { generatePaymentCode } from '@/utils/idGenerator';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    try {
      const { rentalId, patientId, category, saleId } = req.query;

      const where: any = {};
      if (rentalId) where.rentalId = rentalId as string;
      if (patientId) where.patientId = patientId as string;
      if (saleId) where.saleId = saleId as string;

      // Filter by category (LOCATION for rentals, ACHAT for sales)
      if (category) {
        where.category = category as string;
      }

      // If user is EMPLOYEE, only show bonds for their rentals/sales
      if (session.user.role === 'EMPLOYEE') {
        where.OR = [
          // Rental bonds where employee created or is assigned to the rental
          {
            rental: {
              OR: [
                { createdById: session.user.id },
                { assignedToId: session.user.id }
              ]
            }
          },
          // Sale bonds where employee is assigned or processed the sale
          {
            sale: {
              OR: [
                { assignedToId: session.user.id },
                { processedById: session.user.id }
              ]
            }
          }
        ];
      }
      // ADMIN and DOCTOR can see all bonds (no additional filter)

      const cnamBons = await prisma.cNAMBonRental.findMany({
        where,
        include: {
          patient: {
            select: {
              id: true,
              patientCode: true,
              firstName: true,
              lastName: true,
              cnamId: true,
            },
          },
          rental: {
            select: {
              id: true,
              rentalCode: true,
              medicalDevice: {
                select: {
                  id: true,
                  name: true,
                  deviceCode: true,
                },
              },
            },
          },
          sale: {
            select: {
              id: true,
              saleCode: true,
              invoiceNumber: true,
              totalAmount: true,
            },
          },
          payments: {
            select: {
              id: true,
              paymentCode: true,
              amount: true,
              paymentDate: true,
              method: true,
              status: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return res.status(200).json(cnamBons);
    } catch (error) {
      console.error('Error fetching CNAM bons:', error);
      return res.status(500).json({ error: 'Failed to fetch CNAM bons' });
    }
  }

  if (req.method === 'POST') {
    try {
      const {
        bonNumber,
        bonType,
        status,
        dossierNumber,
        submissionDate,
        approvalDate,
        startDate,
        endDate,
        cnamMonthlyRate,
        deviceMonthlyRate,
        coveredMonths,
        renewalReminderDays,
        notes,
        rentalId,
        saleId,
        patientId,
        category,
        currentStep,
        totalSteps,
      } = req.body;

      // Log request body for debugging
      console.log('[CNAM-BOND-CREATE] Request body:', req.body);

      // Validate required fields with detailed error messages
      const missingFields = [];
      if (!bonType) missingFields.push('bonType');
      if (!patientId) missingFields.push('patientId');
      if (cnamMonthlyRate === undefined || cnamMonthlyRate === null || cnamMonthlyRate === '') missingFields.push('cnamMonthlyRate');
      if (deviceMonthlyRate === undefined || deviceMonthlyRate === null || deviceMonthlyRate === '') missingFields.push('deviceMonthlyRate');
      if (!coveredMonths) missingFields.push('coveredMonths');

      if (missingFields.length > 0) {
        console.error('[CNAM-BOND-CREATE] Missing required fields:', missingFields);
        return res.status(400).json({
          error: `Missing required fields: ${missingFields.join(', ')}`,
          missingFields,
          receivedData: req.body,
        });
      }

      // Auto-generate bonNumber if not provided - synchronized with DB
      let finalBonNumber = bonNumber;
      let finalDossierNumber = dossierNumber;

      if (!finalBonNumber) {
        // Get total count of all bonds to determine next BL number
        const totalBonds = await prisma.cNAMBonRental.count();
        const nextNumber = totalBonds + 1;
        finalBonNumber = `BL-2025-${String(nextNumber).padStart(4, '0')}`;
      }

      // Auto-generate dossierNumber if not provided
      if (!finalDossierNumber) {
        const bondCategory = category || 'LOCATION';
        if (bondCategory === 'LOCATION') {
          const locationCount = await prisma.cNAMBonRental.count({
            where: { category: 'LOCATION' }
          });
          finalDossierNumber = `DOSS-LOC-${String(locationCount + 1).padStart(4, '0')}`;
        } else {
          const achatCount = await prisma.cNAMBonRental.count({
            where: { category: 'ACHAT' }
          });
          finalDossierNumber = `DOSS-VEN-${String(achatCount + 1).padStart(4, '0')}`;
        }
      }

      // Auto-calculate amounts
      const bonAmount = parseFloat(cnamMonthlyRate) * parseInt(coveredMonths);
      const devicePrice = parseFloat(deviceMonthlyRate) * parseInt(coveredMonths);
      const complementAmount = Math.max(0, devicePrice - bonAmount);

      // Use transaction to create both bond and payment together
      const result = await prisma.$transaction(async (tx) => {
        // Create CNAM Bond
        const cnamBon = await tx.cNAMBonRental.create({
          data: {
            bonNumber: finalBonNumber,
            bonType,
            category: category || 'LOCATION', // Default to LOCATION if not specified
            status: status || 'CREATION',
            dossierNumber: finalDossierNumber,
            startDate: startDate ? new Date(startDate) : null,
            endDate: endDate ? new Date(endDate) : null,
            cnamMonthlyRate: parseFloat(cnamMonthlyRate),
            deviceMonthlyRate: parseFloat(deviceMonthlyRate),
            coveredMonths: parseInt(coveredMonths),
            bonAmount,
            devicePrice,
            complementAmount,
            currentStep: currentStep ? parseInt(currentStep) : 1,
            renewalReminderDays: renewalReminderDays || 30,
            notes,
            patient: {
              connect: { id: patientId },
            },
            ...(rentalId && {
              rental: {
                connect: { id: rentalId },
              },
            }),
            ...(saleId && {
              sale: {
                connect: { id: saleId },
              },
            }),
          },
          include: {
            patient: {
              select: {
                id: true,
                patientCode: true,
                firstName: true,
                lastName: true,
                cnamId: true,
              },
            },
            rental: {
              select: {
                id: true,
                rentalCode: true,
              },
            },
            sale: {
              select: {
                id: true,
                saleCode: true,
                totalAmount: true,
                invoiceNumber: true,
              },
            },
          },
        });

        // Automatically create CNAM payment
        const paymentCode = await generatePaymentCode(tx as any);

        // Determine payment source based on category
        // Map: LOCATION → RENTAL, ACHAT → SALE
        const bondCategory = category || 'LOCATION';
        const paymentSource = bondCategory === 'ACHAT' ? 'SALE' : 'RENTAL';

        // Build payment data conditionally
        const paymentData: any = {
          paymentCode,
          paymentType: 'RENTAL', // Required field - no SALE/ACHAT value in enum, use source field instead
          method: 'CNAM', // Method: CNAM
          status: 'PAID', // Status: Payé
          amount: bonAmount, // Amount CNAM covers
          paymentDate: startDate ? new Date(startDate) : new Date(),
          cnamBonId: cnamBon.id, // Link to CNAM bond
          patientId: patientId,
          source: paymentSource, // 'RENTAL' or 'SALE' for Payment model
          notes: `Paiement CNAM automatique pour bon ${finalBonNumber}`,
        };

        // Only set period dates for rental (LOCATION category) payments
        if (bondCategory === 'LOCATION') {
          paymentData.periodStartDate = startDate ? new Date(startDate) : null;
          paymentData.periodEndDate = endDate ? new Date(endDate) : null;
        }

        // Link to rental or sale based on category
        if (rentalId) {
          paymentData.rentalId = rentalId;
        } else if (saleId) {
          paymentData.saleId = saleId;
        }

        const cnamPayment = await tx.payment.create({
          data: paymentData,
        });

        console.log('[CNAM-BOND-CREATE] Auto-created CNAM payment:', paymentCode, 'Source:', paymentSource);

        return { cnamBon, cnamPayment };
      });

      return res.status(201).json(result.cnamBon);
    } catch (error) {
      console.error('Error creating CNAM bond:', error);
      return res.status(500).json({ error: 'Failed to create CNAM bond' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
