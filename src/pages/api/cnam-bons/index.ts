import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';

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

      // If user is EMPLOYEE, only show bonds for rentals they created or are assigned to
      if (session.user.role === 'EMPLOYEE' && !category) {
        where.rental = {
          OR: [
            { createdById: session.user.id },
            { assignedToId: session.user.id }
          ]
        };
      }

      const cnamBons = await prisma.cNAMBonRental.findMany({
        where,
        include: {
          patient: {
            select: {
              id: true,
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
          rentalPeriods: {
            select: {
              id: true,
              startDate: true,
              endDate: true,
              expectedAmount: true,
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
      } = req.body;

      // Validate required fields
      if (!bonType || !patientId || !cnamMonthlyRate || !deviceMonthlyRate || !coveredMonths) {
        return res.status(400).json({
          error: 'Missing required fields: bonType, patientId, cnamMonthlyRate, deviceMonthlyRate, coveredMonths',
        });
      }

      // Auto-calculate amounts
      const bonAmount = parseFloat(cnamMonthlyRate) * parseInt(coveredMonths);
      const devicePrice = parseFloat(deviceMonthlyRate) * parseInt(coveredMonths);
      const complementAmount = devicePrice - bonAmount;

      const cnamBon = await prisma.cNAMBonRental.create({
        data: {
          bonNumber,
          bonType,
          category: category || 'LOCATION', // Default to LOCATION if not specified
          status: status || 'EN_ATTENTE_APPROBATION',
          dossierNumber,
          submissionDate: submissionDate ? new Date(submissionDate) : null,
          approvalDate: approvalDate ? new Date(approvalDate) : null,
          startDate: startDate ? new Date(startDate) : null,
          endDate: endDate ? new Date(endDate) : null,
          cnamMonthlyRate: parseFloat(cnamMonthlyRate),
          deviceMonthlyRate: parseFloat(deviceMonthlyRate),
          coveredMonths: parseInt(coveredMonths),
          bonAmount,
          devicePrice,
          complementAmount,
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

      return res.status(201).json(cnamBon);
    } catch (error) {
      console.error('Error creating CNAM bond:', error);
      return res.status(500).json({ error: 'Failed to create CNAM bond' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
