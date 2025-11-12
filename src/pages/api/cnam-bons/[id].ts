import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid bond ID' });
  }

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
      });

      if (!cnamBon) {
        return res.status(404).json({ error: 'CNAM bond not found' });
      }

      return res.status(200).json(cnamBon);
    } catch (error) {
      console.error('Error fetching CNAM bond:', error);
      return res.status(500).json({ error: 'Failed to fetch CNAM bond' });
    }
  }

  if (req.method === 'PATCH' || req.method === 'PUT') {
    try {
      const {
        bonNumber,
        bonType,
        status,
        category,
        currentStep,
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
      } = req.body;

      // Build update data
      const updateData: any = {};

      if (bonNumber !== undefined) updateData.bonNumber = bonNumber;
      if (bonType !== undefined) updateData.bonType = bonType;
      if (status !== undefined) updateData.status = status;
      if (category !== undefined) updateData.category = category;
      if (currentStep !== undefined) updateData.currentStep = parseInt(currentStep);
      if (dossierNumber !== undefined) updateData.dossierNumber = dossierNumber;
      if (submissionDate !== undefined) updateData.submissionDate = submissionDate ? new Date(submissionDate) : null;
      if (approvalDate !== undefined) updateData.approvalDate = approvalDate ? new Date(approvalDate) : null;
      if (startDate !== undefined) updateData.startDate = startDate ? new Date(startDate) : null;
      if (endDate !== undefined) updateData.endDate = endDate ? new Date(endDate) : null;
      if (renewalReminderDays !== undefined) updateData.renewalReminderDays = parseInt(renewalReminderDays);
      if (notes !== undefined) updateData.notes = notes;

      // If any pricing fields change, recalculate all amounts
      if (cnamMonthlyRate !== undefined || deviceMonthlyRate !== undefined || coveredMonths !== undefined) {
        // Get current bond to use existing values if not provided
        const currentBond = await prisma.cNAMBonRental.findUnique({ where: { id } });
        if (!currentBond) {
          return res.status(404).json({ error: 'CNAM bond not found' });
        }

        const finalCnamRate = cnamMonthlyRate !== undefined ? parseFloat(cnamMonthlyRate) : parseFloat(currentBond.cnamMonthlyRate.toString());
        const finalDeviceRate = deviceMonthlyRate !== undefined ? parseFloat(deviceMonthlyRate) : parseFloat(currentBond.deviceMonthlyRate.toString());
        const finalMonths = coveredMonths !== undefined ? parseInt(coveredMonths) : currentBond.coveredMonths;

        updateData.cnamMonthlyRate = finalCnamRate;
        updateData.deviceMonthlyRate = finalDeviceRate;
        updateData.coveredMonths = finalMonths;
        updateData.bonAmount = finalCnamRate * finalMonths;
        updateData.devicePrice = finalDeviceRate * finalMonths;
        updateData.complementAmount = (finalDeviceRate * finalMonths) - (finalCnamRate * finalMonths);
      }

      const updatedBond = await prisma.cNAMBonRental.update({
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
            },
          },
        },
      });

      return res.status(200).json(updatedBond);
    } catch (error) {
      console.error('Error updating CNAM bond:', error);
      return res.status(500).json({ error: 'Failed to update CNAM bond' });
    }
  }

  if (req.method === 'DELETE') {
    try {
      // Check if bond has related payments
      const bond = await prisma.cNAMBonRental.findUnique({
        where: { id },
        include: {
          payments: true,
        },
      });

      if (!bond) {
        return res.status(404).json({ error: 'CNAM bond not found' });
      }

      if (bond.payments.length > 0) {
        return res.status(400).json({
          error: 'Cannot delete CNAM bond with existing payments. Please remove them first.',
        });
      }

      await prisma.cNAMBonRental.delete({
        where: { id },
      });

      return res.status(200).json({ message: 'CNAM bond deleted successfully' });
    } catch (error) {
      console.error('Error deleting CNAM bond:', error);
      return res.status(500).json({ error: 'Failed to delete CNAM bond' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
