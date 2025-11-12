import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import prisma from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { id } = req.query;

  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid payment ID' });
  }

  if (req.method === 'PUT') {
    try {
      console.log('[PAYMENT UPDATE] Received body:', req.body);
      console.log('[PAYMENT UPDATE] Payment ID:', id);

      const {
        rentalId,
        amount,
        paymentDate,
        periodStartDate,
        periodEndDate,
        paymentMethod,
        method,
        paymentType,
        status,
        periodNumber,
        gapDays,
        referenceNumber,
        chequeNumber,
        bankName,
        cnamCardNumber,
        cnamBonId,
        notes,
        dueDate
      } = req.body;

      // Get the existing payment
      const existingPayment = await prisma.payment.findUnique({
        where: { id },
      });

      if (!existingPayment) {
        return res.status(404).json({ error: 'Payment not found' });
      }

      console.log('[PAYMENT UPDATE] Existing payment:', {
        id: existingPayment.id,
        paymentCode: existingPayment.paymentCode,
        source: existingPayment.source,
        saleId: existingPayment.saleId,
      });

      // Build update data object conditionally to avoid undefined issues
      const updateData: any = {};

      if (amount !== undefined) updateData.amount = Number(amount);
      if (paymentMethod !== undefined) updateData.method = paymentMethod;
      if (method !== undefined) updateData.method = method;
      if (paymentType !== undefined) updateData.paymentType = paymentType;
      if (status !== undefined) updateData.status = status;
      if (paymentDate !== undefined) updateData.paymentDate = new Date(paymentDate);
      if (periodStartDate !== undefined) updateData.periodStartDate = periodStartDate ? new Date(periodStartDate) : null;
      if (periodEndDate !== undefined) updateData.periodEndDate = periodEndDate ? new Date(periodEndDate) : null;
      if (referenceNumber !== undefined) updateData.referenceNumber = referenceNumber;
      if (chequeNumber !== undefined) updateData.chequeNumber = chequeNumber;
      if (bankName !== undefined) updateData.bankName = bankName;
      if (cnamCardNumber !== undefined) updateData.cnamCardNumber = cnamCardNumber;
      if (cnamBonId !== undefined) updateData.cnamBonId = cnamBonId;
      if (notes !== undefined) updateData.notes = notes;
      if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null;

      // IMPORTANT: Preserve paymentCode and source - never change these on update
      // They should remain as they were when the payment was created

      console.log('[PAYMENT UPDATE] Update data:', updateData);

      const payment = await prisma.payment.update({
        where: { id },
        data: updateData,
      });

      console.log('[PAYMENT UPDATE] Updated payment:', {
        id: payment.id,
        paymentCode: payment.paymentCode,
        source: payment.source,
        referenceNumber: payment.referenceNumber,
      });

      // Get sale or rental info for response
      const sale = payment.saleId ? await prisma.sale.findUnique({
        where: { id: payment.saleId },
        include: {
          patient: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
          company: {
            select: {
              id: true,
              companyCode: true,
              companyName: true,
            },
          },
        },
      }) : null;

      const rental = payment.rentalId ? await prisma.rental.findUnique({
        where: { id: payment.rentalId },
        include: {
          patient: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
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
      }) : null;

      return res.status(200).json({
        id: payment.id,
        paymentCode: payment.paymentCode,
        source: payment.source,
        saleId: payment.saleId,
        rentalId: payment.rentalId,
        amount: Number(payment.amount),
        method: payment.method,
        status: payment.status,
        paymentDate: payment.paymentDate.toISOString().split('T')[0],
        periodStartDate: payment.periodStartDate ? payment.periodStartDate.toISOString().split('T')[0] : null,
        periodEndDate: payment.periodEndDate ? payment.periodEndDate.toISOString().split('T')[0] : null,
        referenceNumber: payment.referenceNumber,
        chequeNumber: payment.chequeNumber,
        bankName: payment.bankName,
        cnamCardNumber: payment.cnamCardNumber,
        cnamBonId: payment.cnamBonId,
        notes: payment.notes,
        dueDate: payment.dueDate ? payment.dueDate.toISOString().split('T')[0] : null,
        paymentType: payment.paymentType,
        sale: sale ? {
          id: sale.id,
          saleCode: sale.saleCode,
          invoiceNumber: sale.invoiceNumber,
          patient: sale.patient,
          company: sale.company,
        } : null,
        rental: rental ? {
          rentalCode: rental.rentalCode,
          patient: rental.patient,
          medicalDevice: rental.medicalDevice,
        } : null,
      });
    } catch (error) {
      console.error('Error updating payment:', error);
      return res.status(500).json({ error: 'Failed to update payment' });
    }
  }

  if (req.method === 'DELETE') {
    try {
      // Use transaction to safely delete payment and related records
      await prisma.$transaction(async (tx) => {
        // 1. Delete PaymentDetails first (child records)
        await tx.paymentDetail.deleteMany({
          where: { paymentId: id },
        });

        // 2. Delete the payment (no need to update Sale since it uses payments[] relation)
        // The Sale.payments relation is managed automatically by Prisma
        await tx.payment.delete({
          where: { id },
        });
      });

      return res.status(200).json({ message: 'Payment deleted successfully' });
    } catch (error) {
      console.error('Error deleting payment:', error);
      return res.status(500).json({ error: 'Failed to delete payment' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
