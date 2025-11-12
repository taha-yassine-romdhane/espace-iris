import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { PaymentMethod, PaymentStatus } from '@prisma/client';

// Define types based on the Prisma schema

interface PaymentDetail {
  id: string;
  paymentId: string;
  method: string;
  amount: number;
  classification: string;
  reference?: string;
  metadata?: any; // Using any for now to avoid type issues with Prisma's JSON field
  createdAt: Date;
  updatedAt: Date;
}

interface Payment {
  id: string;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  chequeNumber?: string;
  bankName?: string;
  cnamCardNumber?: string;
  referenceNumber?: string;
  notes?: string;
  paymentDate: Date;
  dueDate?: Date;
  patientId?: string;
  companyId?: string;
  saleId?: string;
  paymentDetails?: PaymentDetail[];
  createdAt: Date;
  updatedAt: Date;
  updatedBy?: string;
}

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
  const paymentId = Array.isArray(id) ? id[0] : id;

  if (!paymentId) {
    return res.status(400).json({ error: 'Payment ID is required' });
  }

  // Handle different HTTP methods
  switch (req.method) {
    case 'GET':
      return getPayment(paymentId, res);
    case 'PUT':
      return updatePayment(paymentId, req.body, session.user?.email, res);
    default:
      res.setHeader('Allow', ['GET', 'PUT']);
      return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
}

// Get a specific CNAM payment
async function getPayment(paymentId: string, res: NextApiResponse) {
  try {
    // Query the payment with its payment details
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        sale: true,
        paymentDetails: true,
      },
    });

    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    // Check if this is a CNAM payment - handle both storage approaches
    let isCNAMPayment = payment.method === 'CNAM';
  
    // Check payment details if they exist
    if (payment.paymentDetails?.some(detail => {
      // Check if method is CNAM
      if (detail.method === 'CNAM') return true;
      
      // Check metadata if it exists
      if (detail.metadata && typeof detail.metadata === 'object') {
        // Safe type casting for metadata
        const meta = detail.metadata as Record<string, any>;
        return meta.bonType !== undefined || meta.isCNAM === true || meta.type === 'cnam';
      }
      
      return false;
    })) {
      isCNAMPayment = true;
    }
  
    // Check notes field for legacy data
    if (!isCNAMPayment && payment.notes && typeof payment.notes === 'string') {
      try {
        const notesData = JSON.parse(payment.notes);
        if (notesData.payments && Array.isArray(notesData.payments)) {
          if (notesData.payments.some((p: any) => p.type === 'cnam' || p.cnamBonType)) {
            isCNAMPayment = true;
          }
        }
      } catch (error) {
        console.error('Error parsing payment notes:', error);
      }
    }

    
    if (!isCNAMPayment) {
      return res.status(400).json({ error: 'This endpoint is only for CNAM payments' });
    }

    return res.status(200).json(payment);
  } catch (error) {
    console.error('Error fetching payment:', error);
    return res.status(500).json({ error: 'Failed to fetch payment' });
  }
}

// Update a CNAM payment's status and history
async function updatePayment(
  paymentId: string, 
  data: any, 
  userEmail: string | undefined | null,
  res: NextApiResponse
) {
  try {
    // Extract data from the request
    const { 
      etatDossier, 
      isPending, 
      metadata = {}, 
      statusHistory = [],
      ...otherData 
    } = data;

    // Get the existing payment with its payment details
    const existingPayment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        paymentDetails: true
      }
    });

    if (!existingPayment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    // Find the CNAM payment detail in PaymentDetail records if they exist
    const cnamPaymentDetail = existingPayment.paymentDetails?.find(detail => {
      // Check if method is CNAM
      if (detail.method === 'CNAM') return true;
      
      // Check metadata if it exists
      if (detail.metadata && typeof detail.metadata === 'object') {
        const meta = detail.metadata as Record<string, any>;
        return meta.isCNAM === true || meta.type === 'cnam' || meta.bonType;
      }
      
      return false;
    });
    
    // Check if we have legacy data in the notes field
    let legacyNotesData: any = null;
    let legacyCnamPayment: any = null;
    
    if (existingPayment.notes && typeof existingPayment.notes === 'string') {
      try {
        legacyNotesData = JSON.parse(existingPayment.notes);
        if (legacyNotesData.payments && Array.isArray(legacyNotesData.payments)) {
          legacyCnamPayment = legacyNotesData.payments.find((p: any) => 
            p.type === 'cnam' || p.cnamBonType
          );
        }
      } catch (error) {
        console.error('Error parsing payment notes:', error);
      }
    }

    // If neither modern nor legacy CNAM payment found, return error
    if (!existingPayment.method.includes('CNAM') && !cnamPaymentDetail && !legacyCnamPayment) {
      return res.status(400).json({ error: 'This endpoint is only for CNAM payments' });
    }

    // Prepare the metadata object to update
    const metadataToUpdate = {
      lastUpdated: new Date().toISOString(),
      pendingStatus: isPending,
      statusHistory: statusHistory || [],
      etatDossier: etatDossier || 'en_attente'
    };
    
    // Add any additional metadata from the request
    if (metadata && typeof metadata === 'object') {
      Object.assign(metadataToUpdate, metadata);
    }

    let updatedPaymentDetail;
    let updatedPayment;
    
    // APPROACH 1: Update PaymentDetail record if it exists
    if (cnamPaymentDetail) {
      // Get existing metadata and merge with new data
      const existingMetadata = cnamPaymentDetail.metadata || {};
      const parsedExistingMetadata = typeof existingMetadata === 'string' 
        ? JSON.parse(existingMetadata) 
        : (existingMetadata as Record<string, any>);
        
      const combinedMetadata = {
        ...parsedExistingMetadata,
        ...metadataToUpdate
      };
      
      // Update the payment detail with the new metadata
      updatedPaymentDetail = await prisma.paymentDetail.update({
        where: { id: cnamPaymentDetail.id },
        data: {
          metadata: combinedMetadata as any
        }
      });
    }
    // APPROACH 2: Update legacy data in notes field if that's where the CNAM payment is stored
    else if (legacyNotesData && legacyCnamPayment) {
      // Update the CNAM payment in the legacy data
      const paymentIndex = legacyNotesData.payments.findIndex((p: any) => 
        p.type === 'cnam' || p.cnamBonType
      );
      
      if (paymentIndex !== -1) {
        // Update the payment with new data
        legacyNotesData.payments[paymentIndex] = {
          ...legacyNotesData.payments[paymentIndex],
          etatDossier: etatDossier || legacyNotesData.payments[paymentIndex].etatDossier,
          isPending: isPending !== undefined ? isPending : legacyNotesData.payments[paymentIndex].isPending,
          statusHistory: statusHistory || legacyNotesData.payments[paymentIndex].statusHistory || [],
          metadata: {
            ...(legacyNotesData.payments[paymentIndex].metadata || {}),
            ...metadataToUpdate
          }
        };
        
        // Update the payment record with the modified notes
        updatedPayment = await prisma.payment.update({
          where: { id: paymentId },
          data: {
            notes: JSON.stringify(legacyNotesData)
          }
        });
      }
    }
    
    // Update the main payment status
    updatedPayment = await prisma.payment.update({
      where: { id: paymentId },
      data: {
        // Update payment status
        status: isPending ? 'PENDING' : 'COMPLETED',
        // Add any other fields that need to be updated
        ...otherData,
        updatedAt: new Date(),
      },
    });

    // If the payment is now completed (not pending), update the sale status if needed
    if (existingPayment.saleId) {
      // Get the sale to update its status
      const sale = await prisma.sale.findUnique({
        where: { id: existingPayment.saleId },
        include: {
          payment: {
            include: {
              paymentDetails: true
            }
          }
        }
      });

      if (sale && sale.payment) {
        let hasPendingCNAMPayments = false;
        
        // APPROACH 1: Check PaymentDetail records for pending CNAM payments
        if (sale.payment.paymentDetails && sale.payment.paymentDetails.length > 0) {
          hasPendingCNAMPayments = sale.payment.paymentDetails.some(detail => {
            // Check if this is a CNAM payment
            const isCNAM = detail.method === 'CNAM';
            
            // Check if it's pending based on metadata
            let isPending = false;
            if (detail.metadata) {
              // Handle both string and object metadata
              const meta = typeof detail.metadata === 'string' 
                ? JSON.parse(detail.metadata) 
                : (detail.metadata as Record<string, any>);
              
              if (typeof meta === 'object' && meta !== null) {
                isPending = meta.pendingStatus === true || meta.isPending === true;
              }
            }
            
            return isCNAM && isPending;
          });
        }
        
        // APPROACH 2: Check legacy data in notes field
        if (!hasPendingCNAMPayments && sale.payment.notes && typeof sale.payment.notes === 'string') {
          try {
            const notesData = JSON.parse(sale.payment.notes);
            if (notesData.payments && Array.isArray(notesData.payments)) {
              hasPendingCNAMPayments = notesData.payments.some((p: any) => 
                (p.type === 'cnam' || p.cnamBonType) && 
                (p.isPending === true || p.etatDossier === 'en_attente')
              );
            }
          } catch (error) {
            console.error('Error parsing payment notes:', error);
          }
        }

        // Update sale status based on CNAM payment status
        // Use the correct enum values from the Prisma schema
        await prisma.sale.update({
          where: { id: sale.id },
          data: {
            status: hasPendingCNAMPayments ? 'PENDING' : 'COMPLETED'
          }
        });
      }
    }

    // Fetch the updated payment with payment details to return complete data
    const paymentWithDetails = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        paymentDetails: true
      }
    });
    
    // Find the CNAM payment detail again to include updated metadata
    const updatedCNAMDetail = paymentWithDetails?.paymentDetails?.find(detail => {
      // Check if method is CNAM
      if (detail.method === 'CNAM') return true;
      
      // Check metadata if it exists
      if (detail.metadata && typeof detail.metadata === 'object') {
        const meta = detail.metadata as Record<string, any>;
        return meta.isCNAM === true || meta.type === 'cnam';
      }
      
      return false;
    });
    
    // Return the payment with CNAM-specific fields
    return res.status(200).json({
      ...(paymentWithDetails || {}),
      type: 'cnam', // Add type field for frontend compatibility
      isPending: isPending || false,
      etatDossier: etatDossier || 'en_attente',
      // Include the updated metadata from the CNAM payment detail
      metadata: updatedCNAMDetail?.metadata || metadataToUpdate
    });
  } catch (error) {
    console.error('Error updating payment:', error);
    return res.status(500).json({ error: 'Failed to update payment' });
  }
}
