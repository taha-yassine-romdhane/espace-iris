import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { DeviceStatus } from '@prisma/client';

// Type definitions for payment details
interface PaymentDetail {
  id: string;
  method: string;
  amount: number;
  classification: string;
  reference?: string;
  metadata?: Record<string, unknown>;
  displayMethod?: string;
  displayClassification?: string;
  etatDossier?: string;
  isPending?: boolean;
}

interface LegacyPaymentDetail {
  id?: string;
  type?: string;
  amount?: number;
  classification?: string;
  reference?: string;
  dossierReference?: string;
  metadata?: Record<string, unknown>;
  etatDossier?: string;
  isPending?: boolean;
}

// Helper function to aggregate payment data
function getAggregatedPaymentData(sale: any, additionalPayments: any[]) {
  // If there are additional payments via saleId, aggregate them
  if (additionalPayments.length > 0) {
    const totalAmount = additionalPayments.reduce((sum, p) => sum + Number(p.amount), 0);
    const allPaid = additionalPayments.every(p => p.status === 'PAID');
    const anyPending = additionalPayments.some(p => p.status === 'PENDING');
    const hasPartial = additionalPayments.some(p => p.status === 'PARTIAL');
    
    let aggregatedStatus = 'PENDING';
    if (allPaid) {
      aggregatedStatus = 'PAID';
    } else if (hasPartial || (additionalPayments.some(p => p.status === 'PAID') && anyPending)) {
      aggregatedStatus = 'PARTIAL';
    }
    
    return {
      id: additionalPayments[0].id,
      amount: totalAmount,
      status: aggregatedStatus,
      method: additionalPayments.length > 1 ? 'MIXED' : additionalPayments[0].method,
      paymentDetails: additionalPayments.map(p => ({
        id: p.id,
        method: p.method,
        amount: Number(p.amount),
        status: p.status,
        paymentDate: p.paymentDate,
        referenceNumber: p.referenceNumber,
        classification: p.method, // Use method as classification for simplicity
        metadata: {
          dossierNumber: p.cnamBonNumber,
          cnamInfo: p.cnamBonNumber ? {
            dossierNumber: p.cnamBonNumber,
            bonType: p.cnamBonType,
            status: p.cnamStatus
          } : null
        }
      }))
    };
  }
  
  // Fallback to single payment
  return sale.payment ? {
    id: sale.payment.id,
    amount: sale.payment.amount,
    status: sale.payment.status,
    method: sale.payment.method,
    createdAt: sale.payment.createdAt,
    // Handle both storage approaches: PaymentDetail records or JSON in notes
    paymentDetails: getPaymentDetails(sale.payment),
    // Group payment details by method for easy display
    paymentByMethod: groupPaymentDetailsByMethod(getPaymentDetails(sale.payment))
  } : null;
}

/**
 * Sale details API endpoint
 * 
 * Handles GET, PUT, and DELETE requests for a specific sale
 * 
 * @param {NextApiRequest} req - The incoming request
 * @param {NextApiResponse} res - The outgoing response
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Check authentication
  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { id } = req.query;
    console.log(`[SALE-API] ${req.method} request for sale ID: ${id}`);
    
    if (!id || typeof id !== 'string') {
      console.log(`[SALE-API] Invalid sale ID: ${id}`);
      return res.status(400).json({ error: 'Invalid sale ID' });
    }
    
    switch (req.method) {
      case 'GET':
        // Get a single sale by ID
        console.log(`[SALE-API] Fetching sale with ID: ${id}`);
        const sale = await prisma.sale.findUnique({
          where: { id },
          include: {
            processedBy: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
            patient: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                telephone: true,
                telephoneTwo: true,
                cin: true,
                cnamId: true,
                detailedAddress: true,
                affiliation: true,
                beneficiaryType: true,
              },
            },
            company: {
              select: {
                id: true,
                companyName: true,
                telephone: true,
              },
            },
            payment: {
              include: {
                paymentDetails: true // Include payment details
              }
            },
            items: {
              include: {
                product: true,
                medicalDevice: true,
                configuration: true, // Include the new configuration
              },
            },
          },
        });

        if (!sale) {
          console.log(`[SALE-API] Sale not found with ID: ${id}`);
          return res.status(404).json({ error: 'Sale not found' });
        }

        // Fetch additional payments linked via saleId (for mixed payments)
        const additionalPayments = await prisma.payment.findMany({
          where: {
            saleId: id
          },
          orderBy: {
            paymentDate: 'asc'
          }
        });

        console.log(`[SALE-API] Sale found with ID: ${id}, payment ID: ${sale.paymentId || 'none'}`);

        // Log the raw sale data for debugging
        console.log(`[SALE-API] Raw sale data:`, {
          id: sale.id,
          status: sale.status,
          paymentId: sale.paymentId,
          hasPayment: !!sale.payment,
          paymentMethod: sale.payment?.method,
          paymentDetailsCount: sale.payment?.paymentDetails?.length || 0,
          hasPaymentNotes: !!sale.payment?.notes
        });
        
        // If payment has notes, try to parse and log them
        if (sale.payment?.notes) {
          try {
            const notesData = JSON.parse(sale.payment.notes);
            console.log(`[SALE-API] Payment notes contains:`, {
              hasPaymentsArray: !!notesData.payments,
              paymentsCount: notesData.payments?.length || 0,
              paymentTypes: notesData.payments?.map((p: { type?: string }) => p.type).join(', ') || 'none'
            });
          } catch (error) {
            console.log(`[SALE-API] Error parsing payment notes:`, error);
          }
        }
        
        // Transform the data to match the expected format in the frontend
        const transformedSale = {
          id: sale.id,
          saleCode: sale.saleCode,
          invoiceNumber: sale.invoiceNumber || `INV-${sale.id.substring(0, 8).toUpperCase()}`,
          saleDate: sale.saleDate,
          totalAmount: sale.totalAmount,
          discount: sale.discount || 0,
          finalAmount: sale.finalAmount,
          status: sale.status,
          notes: sale.notes || null,
          
          // Who processed the sale
          processedById: sale.processedById,
          processedBy: {
            id: sale.processedBy.id,
            name: `${sale.processedBy.firstName} ${sale.processedBy.lastName}`,
            email: sale.processedBy.email,
          },
          
          // Client information (either patient or company)
          patientId: sale.patientId,
          patient: sale.patient ? {
            id: sale.patient.id,
            firstName: sale.patient.firstName,
            lastName: sale.patient.lastName,
            telephone: sale.patient.telephone,
            telephoneTwo: sale.patient.telephoneTwo,
            cin: sale.patient.cin,
            cnamId: sale.patient.cnamId,
            address: sale.patient.detailedAddress, // Map detailedAddress to address for frontend compatibility
            affiliation: sale.patient.affiliation,
            beneficiaryType: sale.patient.beneficiaryType,
            fullName: `${sale.patient.firstName} ${sale.patient.lastName}`,
          } : null,
          
          companyId: sale.companyId,
          company: sale.company ? {
            id: sale.company.id,
            companyName: sale.company.companyName,
            telephone: sale.company.telephone,
          } : null,
          
          // Client display name (either patient name or company name)
          clientName: sale.patient 
            ? `${sale.patient.firstName} ${sale.patient.lastName}`
            : (sale.company ? sale.company.companyName : 'Client inconnu'),
          
          clientType: sale.patient ? 'PATIENT' : (sale.company ? 'COMPANY' : null),
          
          // Payment information with details - handle multiple payments
          paymentId: sale.paymentId,
          payment: getAggregatedPaymentData(sale, additionalPayments),
          
          // Items in the sale
          items: sale.items.map(item => ({
            id: item.id,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discount: item.discount || 0,
            itemTotal: item.itemTotal,
            serialNumber: item.serialNumber || null,
            warranty: item.warranty || null,
            
            // Product or medical device information
            productId: item.productId,
            product: item.product ? {
              id: item.product.id,
              name: item.product.name,
              type: item.product.type,
              brand: item.product.brand || null,
              model: item.product.model || null,
            } : null,
            
            medicalDeviceId: item.medicalDeviceId,
            medicalDevice: item.medicalDevice ? {
              id: item.medicalDevice.id,
              name: item.medicalDevice.name,
              type: item.medicalDevice.type,
              brand: item.medicalDevice.brand || null,
              model: item.medicalDevice.model || null,
              serialNumber: item.medicalDevice.serialNumber || null,
            } : null,
            
            // Item name for display
            name: item.product 
              ? item.product.name 
              : (item.medicalDevice ? item.medicalDevice.name : 'Article inconnu'),
            
            // Use the new configuration table
            deviceConfiguration: item.configuration ? {
              pression: item.configuration.pression,
              pressionRampe: item.configuration.pressionRampe,
              dureeRampe: item.configuration.dureeRampe,
              epr: item.configuration.epr,
              ipap: item.configuration.ipap,
              epap: item.configuration.epap,
              aid: item.configuration.aid,
              mode: item.configuration.mode,
              frequenceRespiratoire: item.configuration.frequenceRespiratoire,
              volumeCourant: item.configuration.volumeCourant,
              debit: item.configuration.debit,
              ...(item.configuration.additionalParams as any || {})
            } : null,
            
            // Include raw configuration for debugging
            configuration: item.configuration,
          })),
          
          createdAt: sale.createdAt,
          updatedAt: sale.updatedAt,
        };

        return res.status(200).json({ sale: transformedSale });

      case 'PUT':
        // Update a sale
        const updateData = req.body;
        
        // Validate the update data
        if (!updateData) {
          return res.status(400).json({ error: 'No update data provided' });
        }

        // Update the sale
        const updatedSale = await prisma.sale.update({
          where: { id },
          data: {
            status: updateData.status,
            notes: updateData.notes,
            discount: updateData.discount ? parseFloat(updateData.discount) : undefined,
            finalAmount: updateData.finalAmount ? parseFloat(updateData.finalAmount) : undefined,
            // Only update these if they are provided
            patientId: updateData.patientId || undefined,
            companyId: updateData.companyId || undefined,
            // Don't allow updating the processedBy user
          },
          include: {
            processedBy: true,
            patient: true,
            company: true,
            payment: {
              include: {
                paymentDetails: true
              }
            },
            items: {
              include: {
                product: true,
                medicalDevice: true,
                configuration: true, // Include the new configuration
              },
            },
          },
        });

        return res.status(200).json({ sale: updatedSale });

      case 'DELETE':
        // Check if the sale exists and get its details
        const saleToDelete = await prisma.sale.findUnique({
          where: { id },
          select: {
            status: true,
            items: {
              select: {
                id: true,
                productId: true,
                medicalDeviceId: true,
                quantity: true,
              }
            }
          },
        });

        if (!saleToDelete) {
          return res.status(404).json({ error: 'Sale not found' });
        }

        // Use transaction to ensure all deletions succeed or all fail
        await prisma.$transaction(async (tx) => {
          // 1. Delete all SaleConfiguration records for sale items
          const saleItemIds = saleToDelete.items.map(item => item.id);
          await tx.saleConfiguration.deleteMany({
            where: { saleItemId: { in: saleItemIds } },
          });

          // 2. Delete sale items
          await tx.saleItem.deleteMany({
            where: { saleId: id },
          });

          // 3. Get all payments related to this sale via saleId
          const allPayments = await tx.payment.findMany({
            where: { saleId: id },
            select: { id: true }
          });

          // 4. Delete all payment details for these payments
          if (allPayments.length > 0) {
            const paymentIds = allPayments.map(p => p.id);
            await tx.paymentDetail.deleteMany({
              where: { paymentId: { in: paymentIds } },
            });

            // 5. Delete all payments
            await tx.payment.deleteMany({
              where: { id: { in: paymentIds } },
            });
          }

          // 6. Delete all CNAM bons related to this sale
          await tx.cNAMBonRental.deleteMany({
            where: { saleId: id },
          });

          // 7. Finally delete the sale
          await tx.sale.delete({
            where: { id },
          });

          // 8. Update stock levels back if needed
          // This would increment the stock for each item that was sold
          for (const item of saleToDelete.items) {
            if (item.productId) {
              // Find the stock record for this product
              const stockRecord = await tx.stock.findFirst({
                where: {
                  productId: item.productId,
                  status: 'FOR_SALE'
                }
              });

              if (stockRecord) {
                // Update the stock quantity
                await tx.stock.update({
                  where: { id: stockRecord.id },
                  data: {
                    quantity: stockRecord.quantity + item.quantity
                  }
                });
              }
            }

            if (item.medicalDeviceId) {
              // For medical devices, change status back to ACTIVE
              await tx.medicalDevice.update({
                where: { id: item.medicalDeviceId },
                data: {
                  status: 'ACTIVE' as DeviceStatus
                }
              }).catch(() => {
                // Ignore if medical device doesn't exist
              });
            }
          }
        });

        return res.status(200).json({
          message: 'Sale deleted successfully',
          details: 'Sale and all related records (items, configurations, payments, CNAM bons) have been removed, stock levels have been updated'
        });

      default:
        res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
        return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

// Helper function to get a display-friendly payment method name
function getPaymentMethodDisplay(method: string): string {
  const methodMap: Record<string, string> = {
    'especes': 'Espèces',
    'cheque': 'Chèque',
    'virement': 'Virement',
    'mondat': 'Mandat',
    'cnam': 'CNAM',
    'traite': 'Traite'
  };
  return methodMap[method.toLowerCase()] || method;
}

// Helper function to get a display-friendly payment classification
function getPaymentClassificationDisplay(classification: string): string {
  const classMap: Record<string, string> = {
    'principale': 'Principal',
    'garantie': 'Garantie',
    'complement': 'Complément'
  };
  return classMap[classification.toLowerCase()] || classification;
}

// Helper function to extract payment details from either PaymentDetail records or notes JSON
function getPaymentDetails(payment: {
  id?: string;
  method?: string;
  amount?: number | { toNumber(): number };
  status?: string;
  paymentDetails?: Array<{
    id: string;
    paymentId: string;
    amount: { toNumber(): number };
    method: string;
    classification: string;
    reference: string | null;
    metadata?: any;
    createdAt?: Date;
    updatedAt?: Date;
  }>;
  notes?: string | null;
} | null): PaymentDetail[] {
  if (!payment) {
    console.log(`[SALE-API] getPaymentDetails called with null or undefined payment`);
    return [];
  }
  
  console.log(`[SALE-API] getPaymentDetails called for payment:`, {
    id: payment?.id || 'unknown',
    method: payment?.method,
    amount: payment?.amount,
    status: payment?.status,
    hasPaymentDetails: !!payment?.paymentDetails,
    paymentDetailsCount: payment?.paymentDetails?.length || 0,
    hasNotes: !!payment?.notes,
    notesLength: payment?.notes?.length || 0
  });
  
  // If we have PaymentDetail records, use those
  if (payment.paymentDetails && Array.isArray(payment.paymentDetails) && payment.paymentDetails.length > 0) {
    console.log(`[SALE-API] Found ${payment.paymentDetails.length} PaymentDetail records`);
    console.log(`[SALE-API] PaymentDetail methods: ${payment.paymentDetails.map((d) => d.method).join(', ')}`);
    
    return payment.paymentDetails.map((detail) => {
      console.log(`[SALE-API] Processing PaymentDetail:`, {
        id: detail?.id,
        method: detail?.method,
        amount: detail?.amount,
        classification: detail?.classification,
        reference: detail?.reference,
        hasMetadata: !!detail?.metadata
      });
      return {
        id: detail.id,
        method: detail.method,
        amount: typeof detail.amount === 'number' ? detail.amount : detail.amount.toNumber(),
        classification: detail.classification,
        reference: detail.reference || undefined,
        // Format for display
        displayMethod: getPaymentMethodDisplay(detail.method),
        displayClassification: getPaymentClassificationDisplay(detail.classification),
        // Include metadata if available
        ...(detail.metadata ? { metadata: detail.metadata } : {})
      };
    });
  }
  
  // Otherwise, try to parse the notes field if it exists and contains payment data
  if (payment.notes && typeof payment.notes === 'string') {
    console.log(`[SALE-API] No PaymentDetail records found, checking notes field`);
    console.log(`[SALE-API] Notes field length: ${payment.notes.length} characters`);
    console.log(`[SALE-API] Notes field content (first 200 chars): ${payment.notes.substring(0, 200)}...`);
    
    try {
      const notesData = JSON.parse(payment.notes);
      console.log(`[SALE-API] Successfully parsed notes JSON:`, {
        hasPaymentsArray: !!notesData.payments,
        paymentsCount: notesData.payments?.length || 0,
        notesDataKeys: Object.keys(notesData)
      });
      
      // If we have a payments array in the notes JSON
      if (notesData.payments && Array.isArray(notesData.payments)) {
        console.log(`[SALE-API] Found ${notesData.payments.length} legacy payment details in notes`);
        console.log(`[SALE-API] Legacy payment details:`, JSON.stringify(notesData.payments, null, 2));
        
        return notesData.payments.map((detail: LegacyPaymentDetail) => {
          const legacyId = detail.id || `legacy-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
          
          console.log(`[SALE-API] Processing legacy payment:`, {
            legacyId,
            type: detail.type || 'unknown',
            amount: detail.amount || 0,
            classification: detail.classification || 'principale',
            reference: detail.reference || detail.dossierReference || null,
            hasMetadata: !!detail.metadata
          });
          
          return {
            id: legacyId,
            method: detail.type || 'unknown',
            amount: typeof detail.amount === 'number' ? detail.amount : (typeof detail.amount === 'string' ? parseFloat(detail.amount) : 0),
            classification: detail.classification || 'principale',
            reference: detail.reference || detail.dossierReference || undefined,
            // Format for display
            displayMethod: getPaymentMethodDisplay(detail.type || 'unknown'),
            displayClassification: getPaymentClassificationDisplay(detail.classification || 'principale'),
            // Include CNAM-specific fields if available
            ...(detail.etatDossier ? { etatDossier: detail.etatDossier } : {}),
            ...(detail.isPending !== undefined ? { isPending: detail.isPending } : {}),
            ...(detail.metadata ? { metadata: detail.metadata } : {})
          };
        });
      } else {
        console.log(`[SALE-API] No payments array found in notes JSON or it's not an array`);
      }
    } catch (error) {
      console.error('[SALE-API] Error parsing payment notes:', error);
      return [];
    }
  }
  
  // If no details found, return empty array
  console.log(`[SALE-API] No payment details found in either PaymentDetail records or notes JSON`);
  return [];
}

// Helper function to group payment details by method
function groupPaymentDetailsByMethod(details: PaymentDetail[]): Record<string, {
  method: string;
  displayMethod: string;
  details: PaymentDetail[];
  totalAmount: number;
}> {
  console.log(`[SALE-API] groupPaymentDetailsByMethod called with ${details.length} details`);
  console.log(`[SALE-API] Payment details to group:`, JSON.stringify(details, null, 2));
  
  const result = details.reduce((acc: Record<string, {
    method: string;
    displayMethod: string;
    details: PaymentDetail[];
    totalAmount: number;
  }>, detail) => {
    if (!detail || typeof detail !== 'object') {
      console.log(`[SALE-API] Invalid detail item:`, detail);
      return acc;
    }
    
    if (!detail.method) {
      console.log(`[SALE-API] Detail missing method:`, detail);
      return acc;
    }
    
    const method = detail.method.toLowerCase();
    console.log(`[SALE-API] Processing detail with method: ${method}`);
    
    if (!acc[method]) {
      acc[method] = {
        method: method,
        displayMethod: getPaymentMethodDisplay(method),
        details: [],
        totalAmount: 0
      };
      console.log(`[SALE-API] Created new group for method: ${method}`);
    }
    
    acc[method].details.push(detail);
    
    // Safely parse amount
    const amount = typeof detail.amount === 'number' 
      ? detail.amount 
      : parseFloat(String(detail.amount || 0));
    
    if (isNaN(amount)) {
      console.log(`[SALE-API] Invalid amount for detail:`, detail);
    } else {
      acc[method].totalAmount += amount;
      console.log(`[SALE-API] Added amount ${amount} to ${method}, new total: ${acc[method].totalAmount}`);
    }
    
    return acc;
  }, {});
  
  console.log(`[SALE-API] Final grouped payment details:`, JSON.stringify(result, null, 2));
  return result;
}