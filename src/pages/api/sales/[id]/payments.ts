import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]';
import { PaymentMethod, PaymentStatus } from '@prisma/client';
import { generatePaymentCode } from '@/utils/idGenerator';

// Define types based on the Prisma schema
interface PaymentDetail {
  id: string;
  paymentId: string;
  method: string;
  amount: number;
  classification: string;
  reference?: string;
  metadata?: any;
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
  const saleId = Array.isArray(id) ? id[0] : id;

  if (!saleId) {
    return res.status(400).json({ error: 'Sale ID is required' });
  }

  // Handle different methods
  switch (req.method) {
    case 'GET':
      return handleGetPayments(req, res, saleId);
    case 'POST':
      return handleAddPayment(req, res, saleId);
    case 'PUT':
      return handleUpdatePayments(req, res, saleId);
    default:
      res.setHeader('Allow', ['GET', 'POST', 'PUT']);
      return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
}

// Handler to add a new payment to an existing sale
async function handleAddPayment(req: NextApiRequest, res: NextApiResponse, saleId: string) {
  try {
    const paymentData = req.body;

    if (!paymentData.amount || isNaN(parseFloat(paymentData.amount))) {
      return res.status(400).json({ error: 'Valid payment amount is required' });
    }

    // Verify sale exists
    const sale = await prisma.sale.findUnique({
      where: { id: saleId },
      include: {
        payments: true
      }
    });

    if (!sale) {
      return res.status(404).json({ error: 'Sale not found' });
    }

    // Create the new payment
    const paymentCode = await generatePaymentCode(prisma as any);
    const payment = await prisma.payment.create({
      data: {
        paymentCode: paymentCode,
        source: 'SALE',
        saleId: saleId,
        patientId: sale.patientId,
        companyId: sale.companyId,
        amount: parseFloat(paymentData.amount),
        method: mapPaymentMethod(paymentData.type || 'cash'),
        status: PaymentStatus.PAID,
        chequeNumber: paymentData.type === 'cheque' ? paymentData.chequeNumber || null : null,
        bankName: paymentData.type === 'cheque' || paymentData.type === 'virement' || paymentData.type === 'traite' ?
          (paymentData.bank || null) : null,
        referenceNumber: paymentData.reference || paymentData.mandatNumber || paymentData.traiteNumber || null,
        cnamCardNumber: paymentData.type === 'cnam' ? paymentData.dossierNumber || null : null,
        cnamBonId: paymentData.type === 'cnam' ? paymentData.cnamBonId || null : null,
        notes: paymentData.notes || null,
        paymentDate: paymentData.paymentDate ? new Date(paymentData.paymentDate) : new Date(),
        dueDate: paymentData.dueDate ? new Date(paymentData.dueDate) : null,
        paymentDetails: {
          create: {
            method: paymentData.type || 'cash',
            amount: parseFloat(paymentData.amount),
            classification: paymentData.classification || 'principale',
            reference: createPaymentReference(paymentData),
            metadata: {
              ...paymentData,
              ...(paymentData.cnamInfo && { cnamInfo: paymentData.cnamInfo }),
              ...(paymentData.type === 'cheque' && {
                chequeNumber: paymentData.chequeNumber,
                bank: paymentData.bank
              }),
              ...(paymentData.type === 'virement' && {
                reference: paymentData.reference,
                bank: paymentData.bank
              }),
              ...(paymentData.type === 'cnam' && {
                bonType: paymentData.cnamInfo?.bonType,
                dossierNumber: paymentData.dossierNumber,
                currentStep: paymentData.cnamInfo?.currentStep,
                status: paymentData.cnamInfo?.status
              })
            }
          }
        }
      },
      include: {
        paymentDetails: true
      }
    });

    // Calculate updated payment totals
    const allPayments = await prisma.payment.findMany({
      where: { saleId: saleId }
    });

    const totalPaid = allPayments.reduce((sum, p) => sum + Number(p.amount), 0);
    const remaining = Number(sale.finalAmount) - totalPaid;

    return res.status(201).json({
      payment,
      totals: {
        totalPaid,
        remainingAmount: remaining,
        saleAmount: Number(sale.finalAmount)
      }
    });
  } catch (error) {
    console.error('Error adding payment:', error);
    return res.status(500).json({ error: 'Failed to add payment' });
  }
}

// Helper function to map frontend payment types to Prisma PaymentMethod enum
function mapPaymentMethod(frontendMethod: string): PaymentMethod {
  switch (frontendMethod?.toLowerCase()) {
    case 'cheque':
      return PaymentMethod.CHEQUE;
    case 'especes':
      return PaymentMethod.CASH;
    case 'cnam':
      return PaymentMethod.CNAM;
    case 'virement':
      return PaymentMethod.VIREMENT;
    case 'traite':
      return PaymentMethod.TRAITE;
    case 'mandat':
      return PaymentMethod.MANDAT;
    default:
      return PaymentMethod.CASH;
  }
}

// Helper function to create a payment reference string
function createPaymentReference(payment: any): string {
  if (!payment || !payment.type) return '';
  
  switch (payment.type.toLowerCase()) {
    case 'especes':
      return `Espèces: ${payment.amount} DT`;
    case 'cheque':
      return `Chèque N°${payment.chequeNumber || ''} ${payment.bank || ''}: ${payment.amount} DT`;
    case 'virement':
      return `Virement Réf:${payment.reference || ''} ${payment.bank ? `(${payment.bank})` : ''}: ${payment.amount} DT`;
    case 'mandat':
      return `Mandat N°${payment.mandatNumber || payment.reference || ''}: ${payment.amount} DT`;
    case 'traite':
      return `Traite N°${payment.traiteNumber || ''} Échéance:${payment.dueDate ? new Date(payment.dueDate).toLocaleDateString() : ''}: ${payment.amount} DT`;
    case 'cnam':
      const cnamRef = payment.dossierNumber || '';
      const bonType = payment.metadata?.cnamInfo?.bonType || '';
      const step = payment.metadata?.cnamInfo?.currentStep || '';
      return `CNAM ${bonType} Dossier:${cnamRef} Étape:${step}: ${payment.amount} DT`;
    default:
      return `${payment.type}: ${payment.amount} DT`;
  }
}

async function handleUpdatePayments(req: NextApiRequest, res: NextApiResponse, saleId: string) {
  try {
    // Update sale payments
    const { payments } = req.body;
    
    if (!Array.isArray(payments)) {
      return res.status(400).json({ error: 'Payments must be an array' });
    }

    // Start a transaction to update payments atomically
    const result = await prisma.$transaction(async (tx) => {
      // Get the existing sale with payments
      const sale = await tx.sale.findUnique({
        where: { id: saleId },
        include: {
          payments: {
            include: { paymentDetails: true }
          }
        }
      });

      if (!sale) {
        throw new Error('Sale not found');
      }

      // Delete ALL existing payments and their details for this sale
      if (sale.payments && sale.payments.length > 0) {
        const paymentIds = sale.payments.map(p => p.id);

        // Delete payment details first (foreign key constraint)
        await tx.paymentDetail.deleteMany({
          where: { paymentId: { in: paymentIds } }
        });

        // Delete the payments
        await tx.payment.deleteMany({
          where: { id: { in: paymentIds } }
        });
      }

      // Create new payments for all provided payment data
      const createdPayments = [];
      for (const paymentData of payments) {
        const paymentCode = await generatePaymentCode(tx as any);
        const payment = await tx.payment.create({
          data: {
            paymentCode,
            source: 'SALE',
            saleId: saleId,
            patientId: sale.patientId,
            companyId: sale.companyId,
            amount: Number(paymentData.amount),
            method: mapPaymentMethod(paymentData.type || 'cash'),
            status: PaymentStatus.PAID,
            chequeNumber: paymentData.type === 'cheque' ? paymentData.chequeNumber || null : null,
            bankName: paymentData.type === 'cheque' || paymentData.type === 'virement' || paymentData.type === 'traite' ?
              (paymentData.bank || null) : null,
            referenceNumber: paymentData.reference || paymentData.mandatNumber || paymentData.traiteNumber || null,
            cnamCardNumber: paymentData.type === 'cnam' ? paymentData.dossierNumber || null : null,
            cnamBonId: paymentData.type === 'cnam' ? paymentData.cnamBonId || null : null,
            notes: paymentData.notes || null,
            paymentDate: paymentData.paymentDate ? new Date(paymentData.paymentDate) : new Date(),
            dueDate: paymentData.dueDate ? new Date(paymentData.dueDate) : null,
            paymentDetails: {
              create: {
                method: paymentData.type || 'cash',
                amount: Number(paymentData.amount),
                classification: paymentData.classification || 'principale',
                reference: createPaymentReference(paymentData),
                metadata: {
                  ...paymentData,
                  ...(paymentData.cnamInfo && { cnamInfo: paymentData.cnamInfo }),
                  ...(paymentData.type === 'cheque' && {
                    chequeNumber: paymentData.chequeNumber,
                    bank: paymentData.bank
                  }),
                  ...(paymentData.type === 'virement' && {
                    reference: paymentData.reference,
                    bank: paymentData.bank
                  }),
                  ...(paymentData.type === 'cnam' && {
                    bonType: paymentData.cnamInfo?.bonType,
                    dossierNumber: paymentData.dossierNumber,
                    currentStep: paymentData.cnamInfo?.currentStep,
                    status: paymentData.cnamInfo?.status
                  })
                }
              }
            }
          },
          include: {
            paymentDetails: true
          }
        });
        createdPayments.push(payment);
      }

      // Calculate totals
      const totalPaid = createdPayments.reduce((sum, p) => sum + Number(p.amount), 0);
      const remaining = Number(sale.finalAmount) - totalPaid;

      return {
        payments: createdPayments,
        totals: {
          totalPaid,
          remainingAmount: remaining,
          saleAmount: Number(sale.finalAmount)
        }
      };
    });

    return res.status(200).json({
      message: 'Payments updated successfully',
      ...result
    });
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

async function handleGetPayments(req: NextApiRequest, res: NextApiResponse, saleId: string) {
  try {
    console.log(`[PAYMENTS-API] Fetching sale and payments for sale ID: ${saleId}`);
    
    // Fetch the sale and its payments separately
    const sale = await prisma.sale.findUnique({
      where: { id: saleId }
    });

    if (!sale) {
      return res.status(404).json({ error: 'Sale not found' });
    }
    
    // Log sale data for debugging
    console.log(`[PAYMENTS-API] Sale ID: ${sale.id}, Status: ${sale.status}`);
    console.log(`[PAYMENTS-API] Sale notes: ${sale.notes ? sale.notes.substring(0, 100) + '...' : 'null'}`);
    
    // Check if the sale notes might be stored in a different format or location
    try {
      if (sale.notes) {
        // Try to parse as JSON
        try {
          const notesData = JSON.parse(sale.notes);
          console.log(`[PAYMENTS-API] Successfully parsed sale notes as JSON. Keys: ${Object.keys(notesData).join(', ')}`);
        } catch (e: any) {
          console.log(`[PAYMENTS-API] Sale notes is not valid JSON: ${e.message || 'Unknown error'}`);
        }
      }
    } catch (error: any) {
      console.error(`[PAYMENTS-API] Error analyzing sale notes: ${error}`);
    }
    
    // Fetch payments for the sale
    let payments = await prisma.payment.findMany({
      where: { saleId: saleId },
      include: { paymentDetails: true },
      orderBy: { createdAt: 'desc' }
    }) as unknown as Payment[];
    
    // If no payments found, check if the sale has a paymentId and fetch that payment
    if (payments.length === 0 && sale.paymentId) {
      console.log(`[PAYMENTS-API] No payments found with saleId, checking payment with ID: ${sale.paymentId}`);
      const paymentFromSale = await prisma.payment.findUnique({
        where: { id: sale.paymentId },
        include: { paymentDetails: true }
      }) as unknown as Payment | null;
      
      if (paymentFromSale) {
        console.log(`[PAYMENTS-API] Found payment via sale.paymentId: ${paymentFromSale.id}`);
        payments = [paymentFromSale];
      }
    }
    
    console.log(`[PAYMENTS-API] Found ${payments.length} payments for sale ${saleId}`);
    
    // If still no payments found, create a synthetic payment based on sale data
    if (payments.length === 0) {
      console.log(`[PAYMENTS-API] No payments found for sale ${saleId}, checking sale data directly`);
      
      // Check if sale has notes that might contain payment data
      let legacyPayments: any[] = [];
      
      if (sale.notes && typeof sale.notes === 'string') {
        try {
          const notesData = JSON.parse(sale.notes);
          if (notesData.payments && Array.isArray(notesData.payments)) {
            legacyPayments = notesData.payments;
            console.log(`[PAYMENTS-API] Found ${legacyPayments.length} legacy payments in sale notes`);
          }
        } catch (e: any) {
          console.log(`[PAYMENTS-API] Could not parse sale notes as JSON: ${e.message}`);
        }
      }
      
      // If we found legacy payments in sale notes, create a synthetic payment
      if (legacyPayments.length > 0) {
        const hasCnam = legacyPayments.some(p => 
          p.type?.toLowerCase() === 'cnam' || p.method?.toLowerCase() === 'cnam'
        );
        
        console.log(`[PAYMENTS-API] Creating synthetic payment with ${legacyPayments.length} legacy payments`);
        console.log(`[PAYMENTS-API] Has CNAM payment: ${hasCnam}`);
        
        // Create a synthetic payment
        const syntheticPayment: Payment = {
          id: `synthetic-${saleId}`,
          amount: sale.finalAmount,
          method: hasCnam ? 'CNAM' : 'CASH',
          status: 'COMPLETED',
          paymentDate: sale.createdAt,
          createdAt: sale.createdAt,
          updatedAt: sale.updatedAt,
          // Add legacy payments to the synthetic payment
          legacyPayments: legacyPayments,
          // Add any other required fields
          paymentDetails: []
        } as unknown as Payment;
        
        payments = [syntheticPayment];
      }
    }
    
    // Process payments to extract legacy payment data if needed
    
    // We'll collect all legacy payments from payment notes here
    let allLegacyPayments: any[] = [];
    
    // Check each payment for legacy payment data in notes
    for (const payment of payments) {
      if (payment.notes && typeof payment.notes === 'string') {
        try {
          const notesData = JSON.parse(payment.notes);
          
          if (notesData.payments && Array.isArray(notesData.payments)) {
            // Add these legacy payments to our collection
            allLegacyPayments = [...allLegacyPayments, ...notesData.payments];
            console.log(`[PAYMENTS-API] Added ${notesData.payments.length} legacy payments from payment notes`);
          }
        } catch (error: any) {
          console.error(`[PAYMENTS-API] Error parsing payment notes: ${error.message || 'Unknown error'}`);
        }
      }
    }
    
    // If we found legacy payments but have no modern payments, create a synthetic payment
    if (payments.length === 0 && allLegacyPayments.length > 0) {
      console.log(`[PAYMENTS-API] Creating synthetic payment to hold ${allLegacyPayments.length} legacy payments`);
      
      // Find total amount from legacy payments
      const totalAmount = allLegacyPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
      
      // Check if any legacy payment is CNAM
      const hasCnam = allLegacyPayments.some(p => 
        p.type?.toLowerCase() === 'cnam' || p.method?.toLowerCase() === 'cnam'
      );
      
      // Create a synthetic payment
      payments.push({
        id: `synthetic-${Date.now()}`,
        amount: totalAmount,
        method: hasCnam ? 'CNAM' : 'CASH',
        status: 'COMPLETED',
        notes: JSON.stringify({ payments: allLegacyPayments }),
        paymentDate: new Date(),
        saleId: saleId,
        createdAt: new Date(),
        updatedAt: new Date(),
        paymentDetails: [] // Will be populated with legacy data later
      } as unknown as Payment);
    }
    
    // Transform the payments to include the type field needed by the frontend
    const transformedPayments = [];
    
    for (const payment of payments) {
      // Check if this is a CNAM payment based on payment method or payment details
      let isCNAM = payment.method === 'CNAM' || payment.paymentDetails?.some((detail: PaymentDetail) => 
        detail.method === 'CNAM' || detail.classification === 'CNAM'
      );
      
      // Extract CNAM-specific information from payment details
      let cnamDossierStatus = null;
      let cnamDossierNumber = null;
      let isPending = true;
      let cnamMetadata = null;
      const legacyPayments = [];
      
      // First check PaymentDetail records for CNAM information
      if (payment.paymentDetails?.length !== undefined && payment.paymentDetails?.length > 0) {
        const cnamDetail = payment.paymentDetails?.find((detail: PaymentDetail) => 
          detail.method === 'CNAM' || detail.classification === 'CNAM'
        );
        
        if (cnamDetail?.metadata) {
          try {
            // Handle metadata that might be a string or already an object
            let metadata;
            try {
              metadata = typeof cnamDetail.metadata === 'string' 
                ? JSON.parse(cnamDetail.metadata) 
                : cnamDetail.metadata;
            } catch (parseError) {
              metadata = cnamDetail.metadata || {};
            }
            
            cnamDossierStatus = metadata.etatDossier || null;
            cnamDossierNumber = metadata.numeroDossier || payment.cnamCardNumber || null;
            isPending = !['accepte', 'refuse'].includes(cnamDossierStatus || '');
            cnamMetadata = metadata;
          } catch (e) {
            // Silent error handling
          }
        }
      }
      
      // If no CNAM info found in PaymentDetail records, check the notes field for legacy data
      if ((!cnamDossierStatus || !cnamMetadata) && payment.notes && typeof payment.notes === 'string') {
        try {
          const notesData = JSON.parse(payment.notes);
          
          if (notesData.payments && Array.isArray(notesData.payments)) {
            // Look for CNAM payments in the legacy data
            const legacyCnamPayment = notesData.payments.find((p: any) => 
              p.type?.toLowerCase() === 'cnam' || p.method?.toLowerCase() === 'cnam'
            );
            
            if (legacyCnamPayment) {
              isCNAM = true;
              
              // Extract CNAM dossier information
              cnamDossierStatus = legacyCnamPayment.etatDossier || null;
              cnamDossierNumber = legacyCnamPayment.dossierReference || legacyCnamPayment.reference || null;
              isPending = legacyCnamPayment.isPending !== false && 
                !['accepte', 'refuse'].includes(cnamDossierStatus || '');
              
              // Extract metadata
              cnamMetadata = legacyCnamPayment.metadata || {};
              
              // Create individual payment entries for each legacy payment
              for (const legacyPayment of notesData.payments) {
                const paymentType = legacyPayment.type?.toLowerCase() || 'unknown';
                const isLegacyCnam = paymentType === 'cnam';
                
                legacyPayments.push({
                  id: legacyPayment.id || `legacy-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
                  amount: legacyPayment.amount || 0,
                  method: paymentType,
                  type: isLegacyCnam ? 'cnam' : 'standard',
                  classification: legacyPayment.classification || 'principale',
                  reference: legacyPayment.reference || legacyPayment.dossierReference || null,
                  etatDossier: isLegacyCnam ? legacyPayment.etatDossier : null,
                  isPending: isLegacyCnam ? isPending : false,
                  metadata: legacyPayment.metadata || {},
                  createdAt: legacyPayment.timestamp || payment.createdAt,
                  createdBy: legacyPayment.createdBy || 'system'
                });
              }
            }
          }
        } catch (error: any) {
          // Silent error handling
        }
      }
      
      // Also check if we have legacy payments from the sale notes that we should add
      if (payment.id.startsWith('synthetic-') && allLegacyPayments && allLegacyPayments.length > 0) {
        // Look for CNAM payments in the legacy data
        const legacyCnamPayment = allLegacyPayments.find((p: any) => 
          p.type?.toLowerCase() === 'cnam' || p.method?.toLowerCase() === 'cnam'
        );
        
        if (legacyCnamPayment) {
          isCNAM = true;
          
          // Extract CNAM dossier information
          cnamDossierStatus = legacyCnamPayment.etatDossier || null;
          cnamDossierNumber = legacyCnamPayment.dossierReference || legacyCnamPayment.reference || null;
          isPending = legacyCnamPayment.isPending !== false && 
            !['accepte', 'refuse'].includes(cnamDossierStatus || '');
          
          // Extract metadata
          cnamMetadata = legacyCnamPayment.metadata || {};
        }
        
        // Create individual payment entries for each legacy payment
        for (const legacyPayment of allLegacyPayments) {
          const paymentType = legacyPayment.type?.toLowerCase() || 'unknown';
          const isLegacyCnam = paymentType === 'cnam';
          
          legacyPayments.push({
            id: legacyPayment.id || `legacy-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
            amount: legacyPayment.amount || 0,
            method: paymentType,
            type: isLegacyCnam ? 'cnam' : 'standard',
            classification: legacyPayment.classification || 'principale',
            reference: legacyPayment.reference || legacyPayment.dossierReference || null,
            etatDossier: isLegacyCnam ? legacyPayment.etatDossier : null,
            isPending: isLegacyCnam ? isPending : false,
            metadata: legacyPayment.metadata || {},
            createdAt: legacyPayment.timestamp || payment.createdAt,
            createdBy: legacyPayment.createdBy || 'system'
          });
        }
      }
      
      transformedPayments.push({
        ...payment,
        type: isCNAM ? 'cnam' : 'standard',
        // Add fields needed by the frontend for CNAM dossiers
        isPending: isPending,
        etatDossier: cnamDossierStatus,
        numeroDossier: cnamDossierNumber,
        // Include payment details for frontend display
        paymentDetails: payment.paymentDetails?.map((detail: PaymentDetail) => ({
          ...detail,
          metadata: typeof detail.metadata === 'string' 
            ? JSON.parse(detail.metadata) 
            : detail.metadata
        })),
        // Include any legacy payments found in notes
        legacyPayments: legacyPayments.length > 0 ? legacyPayments : undefined
      });
    }

    // Return the transformed payments
    return res.status(200).json(transformedPayments);
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to fetch sale payments' });
  }
}
