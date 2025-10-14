import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';

export interface PaymentDetailData {
  method: string; // especes, cheque, virement, etc.
  amount: number;
  classification: string; // principale, garantie, complement
  reference?: string;
  metadata?: any; // Additional method-specific details
}

export interface CreatePaymentRequest {
  amount: number;
  method: 'CASH' | 'CHEQUE' | 'VIREMENT' | 'MANDAT' | 'TRAITE' | 'CNAM';
  status?: 'PENDING' | 'PAID' | 'GUARANTEE' | 'PARTIAL';
  patientId?: string;
  companyId?: string;
  saleId?: string;
  rentalId?: string;
  diagnosticId?: string;
  notes?: string;
  dueDate?: string;
  details: PaymentDetailData[];
  // Method-specific fields for backward compatibility
  chequeNumber?: string;
  bankName?: string;
  cnamCardNumber?: string;
  referenceNumber?: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const paymentData: CreatePaymentRequest = req.body;

    // Validate required fields
    if (!paymentData.amount || !paymentData.method || !paymentData.details || paymentData.details.length === 0) {
      return res.status(400).json({ 
        error: 'Missing required fields: amount, method, and details are required' 
      });
    }

    // Validate that detail amounts sum up to total amount
    const totalDetailAmount = paymentData.details.reduce((sum, detail) => sum + detail.amount, 0);
    if (Math.abs(totalDetailAmount - paymentData.amount) > 0.01) { // Allow for small floating point differences
      return res.status(400).json({ 
        error: `Detail amounts (${totalDetailAmount}) do not match total amount (${paymentData.amount})` 
      });
    }

    // Create the payment with details in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create main payment record
      const payment = await tx.payment.create({
        data: {
          amount: paymentData.amount,
          method: paymentData.method,
          status: paymentData.status || 'PENDING',
          patientId: paymentData.patientId,
          companyId: paymentData.companyId,
          saleId: paymentData.saleId,
          rentalId: paymentData.rentalId,
          diagnosticId: paymentData.diagnosticId,
          notes: paymentData.notes,
          dueDate: paymentData.dueDate ? new Date(paymentData.dueDate) : null,
          // Backward compatibility fields
          chequeNumber: paymentData.chequeNumber,
          bankName: paymentData.bankName,
          cnamCardNumber: paymentData.cnamCardNumber,
          referenceNumber: paymentData.referenceNumber,
        }
      });

      // Create payment details
      const paymentDetails = await Promise.all(
        paymentData.details.map(detail => 
          tx.paymentDetail.create({
            data: {
              paymentId: payment.id,
              method: detail.method,
              amount: detail.amount,
              classification: detail.classification,
              reference: detail.reference,
              metadata: detail.metadata,
            }
          })
        )
      );

      // Create user action history record
      await tx.userActionHistory.create({
        data: {
          userId: session.user.id,
          actionType: 'PAYMENT',
          relatedItemId: payment.id,
          relatedItemType: 'Payment',
          details: {
            amount: paymentData.amount,
            method: paymentData.method,
            status: paymentData.status || 'PENDING',
            patientId: paymentData.patientId,
            companyId: paymentData.companyId,
            saleId: paymentData.saleId,
            rentalId: paymentData.rentalId,
          },
        },
      });

      return { payment, paymentDetails };
    });

    // Return the created payment with details
    const paymentWithDetails = await prisma.payment.findUnique({
      where: { id: result.payment.id },
      include: {
        paymentDetails: true,
        patient: {
          select: { id: true, firstName: true, lastName: true }
        },
        company: {
          select: { id: true, companyName: true }
        }
      }
    });

    res.status(201).json({
      success: true,
      data: paymentWithDetails
    });

  } catch (error) {
    console.error('Error creating payment:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
    });
  }
}
