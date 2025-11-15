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
      if (cnamMonthlyRate !== undefined || deviceMonthlyRate !== undefined || coveredMonths !== undefined || startDate !== undefined || endDate !== undefined) {
        // Get current bond to use existing values if not provided
        const currentBond = await prisma.cNAMBonRental.findUnique({
          where: { id },
          include: {
            payments: {
              where: {
                method: 'CNAM',
                cnamBonId: id,
              },
            },
          },
        });

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

        // Update linked CNAM payment if exists
        if (currentBond.payments.length > 0) {
          const cnamPayment = currentBond.payments[0];
          const paymentUpdateData: any = {
            amount: updateData.bonAmount,
          };

          // Update period dates if they changed
          if (startDate !== undefined) {
            paymentUpdateData.periodStartDate = startDate ? new Date(startDate) : null;
            paymentUpdateData.paymentDate = startDate ? new Date(startDate) : paymentUpdateData.paymentDate;
          }
          if (endDate !== undefined) {
            paymentUpdateData.periodEndDate = endDate ? new Date(endDate) : null;
          }

          await prisma.payment.update({
            where: { id: cnamPayment.id },
            data: paymentUpdateData,
          });

          console.log('[CNAM-BOND-UPDATE] Updated linked CNAM payment:', cnamPayment.paymentCode);
        }
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
      // Get bond with related payments
      const bond = await prisma.cNAMBonRental.findUnique({
        where: { id },
        include: {
          payments: {
            where: {
              method: 'CNAM',
              cnamBonId: id,
            },
          },
        },
      });

      if (!bond) {
        return res.status(404).json({ error: 'CNAM bond not found' });
      }

      // Use transaction to delete both bond and auto-created payment
      await prisma.$transaction(async (tx) => {
        // Delete auto-created CNAM payment first
        if (bond.payments.length > 0) {
          await tx.payment.deleteMany({
            where: {
              method: 'CNAM',
              cnamBonId: id,
            },
          });
          console.log('[CNAM-BOND-DELETE] Deleted', bond.payments.length, 'linked CNAM payment(s)');
        }

        // Delete the bond
        await tx.cNAMBonRental.delete({
          where: { id },
        });
      });

      return res.status(200).json({ message: 'CNAM bond and linked payment deleted successfully' });
    } catch (error) {
      console.error('Error deleting CNAM bond:', error);
      return res.status(500).json({ error: 'Failed to delete CNAM bond' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
