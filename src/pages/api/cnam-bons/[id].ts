import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid CNAM bon ID' });
  }

  // GET - Fetch single CNAM bon
  if (req.method === 'GET') {
    try {
      const cnamBon = await prisma.cNAMBonRental.findUnique({
        where: { id },
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
              status: true,
            },
          },
        },
      });

      if (!cnamBon) {
        return res.status(404).json({ error: 'CNAM bon not found' });
      }

      return res.status(200).json(cnamBon);
    } catch (error) {
      console.error('Error fetching CNAM bon:', error);
      return res.status(500).json({ error: 'Failed to fetch CNAM bon' });
    }
  }

  // PATCH/PUT - Update CNAM bon
  if (req.method === 'PATCH' || req.method === 'PUT') {
    try {
      const {
        bonNumber,
        validationDate,
        startDate,
        endDate,
        amount,
        status,
        bonType,
        notes,
        category,
        currentStep,
        cnamMonthlyRate,
        deviceMonthlyRate,
        coveredMonths,
        bonAmount,
        devicePrice,
        complementAmount,
      } = req.body;

      const updateData: any = {};

      if (bonNumber !== undefined) updateData.bonNumber = bonNumber;
      if (validationDate !== undefined) updateData.validationDate = validationDate ? new Date(validationDate) : null;
      if (startDate !== undefined) updateData.startDate = startDate ? new Date(startDate) : null;
      if (endDate !== undefined) updateData.endDate = endDate ? new Date(endDate) : null;
      if (amount !== undefined) updateData.amount = amount;
      if (status !== undefined) updateData.status = status;
      if (bonType !== undefined) updateData.bonType = bonType;
      if (notes !== undefined) updateData.notes = notes;
      if (category !== undefined) updateData.category = category;
      if (currentStep !== undefined) updateData.currentStep = parseInt(currentStep);
      if (cnamMonthlyRate !== undefined) updateData.cnamMonthlyRate = parseFloat(cnamMonthlyRate);
      if (deviceMonthlyRate !== undefined) updateData.deviceMonthlyRate = parseFloat(deviceMonthlyRate);
      if (coveredMonths !== undefined) updateData.coveredMonths = parseInt(coveredMonths);
      if (bonAmount !== undefined) updateData.bonAmount = parseFloat(bonAmount);
      if (devicePrice !== undefined) updateData.devicePrice = parseFloat(devicePrice);
      if (complementAmount !== undefined) updateData.complementAmount = parseFloat(complementAmount);

      const updatedBon = await prisma.cNAMBonRental.update({
        where: { id },
        data: updateData,
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
        },
      });

      return res.status(200).json(updatedBon);
    } catch (error) {
      console.error('Error updating CNAM bon:', error);
      return res.status(500).json({
        error: 'Failed to update CNAM bon',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // DELETE - Delete CNAM bon
  if (req.method === 'DELETE') {
    try {
      // Check if the bon exists
      const existingBon = await prisma.cNAMBonRental.findUnique({
        where: { id },
        include: {
          rentalPeriods: true,
          payments: true,
        },
      });

      if (!existingBon) {
        return res.status(404).json({ error: 'CNAM bon not found' });
      }

      // Check if there are associated payments
      if (existingBon.payments && existingBon.payments.length > 0) {
        return res.status(400).json({
          error: 'Cannot delete CNAM bon with existing payments. Please delete payments first.'
        });
      }

      // Delete associated rental periods first
      if (existingBon.rentalPeriods && existingBon.rentalPeriods.length > 0) {
        await prisma.rentalPeriod.deleteMany({
          where: { cnamBonId: id },
        });
      }

      // Delete the CNAM bon
      await prisma.cNAMBonRental.delete({
        where: { id },
      });

      return res.status(200).json({ message: 'CNAM bon deleted successfully' });
    } catch (error) {
      console.error('Error deleting CNAM bon:', error);
      return res.status(500).json({
        error: 'Failed to delete CNAM bon',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
