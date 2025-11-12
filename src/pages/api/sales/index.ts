import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { PaymentMethod, PaymentStatus, CNAMBonType, CNAMStatus } from '@prisma/client';
import { generateSaleCode, generatePaymentCode, generateCNAMDossierNumber } from '@/utils/idGenerator';

// Helper function to map frontend payment types to Prisma PaymentMethod enum
function mapPaymentMethod(frontendMethod: string): PaymentMethod {
  if (!frontendMethod) {
    console.warn('Payment method is null/undefined, defaulting to CASH');
    return PaymentMethod.CASH;
  }

  const method = frontendMethod.toLowerCase().trim();
  
  switch (method) {
    case 'cheque':
    case 'check':
      return PaymentMethod.CHEQUE;
    case 'especes':
    case 'cash':
    case 'liquid':
    case 'liquide':
      return PaymentMethod.CASH;
    case 'cnam':
      return PaymentMethod.CNAM;
    case 'virement':
    case 'bank_transfer':
    case 'banktransfer':
    case 'transfer':
      return PaymentMethod.VIREMENT;
    case 'traite':
    case 'draft':
      return PaymentMethod.TRAITE;
    case 'mandat':
    case 'mandate':
      return PaymentMethod.MANDAT;
    default:
      // Log unrecognized payment methods for debugging
      console.warn(`Unrecognized payment method: "${frontendMethod}", defaulting to CASH`);
      return PaymentMethod.CASH;
  }
}


// Helper function to create a payment reference string based on payment type
function createPaymentReference(payment: {
  type?: string;
  amount?: number;
  chequeNumber?: string;
  bank?: string;
  bankName?: string;
  reference?: string;
  mondatNumber?: string;
  dossierNumber?: string;
  fileNumber?: string;
  cnamInfo?: {
    bonType?: string;
    currentStep?: number;
  };
  dueDate?: string;
}): string {
  if (!payment || !payment.type) return '';
  
  switch (payment.type.toLowerCase()) {
    case 'especes':
      return `Espèces: ${payment.amount} DT`;
      
    case 'cheque':
      return `Chèque N°${payment.chequeNumber || ''} ${payment.bank || payment.bankName || ''}: ${payment.amount} DT`;
      
    case 'virement':
      return `Virement Réf:${payment.reference || ''} ${payment.bank ? `(${payment.bank})` : ''}: ${payment.amount} DT`;
      
    case 'mandat':
      return `Mandat N°${payment.mondatNumber || payment.reference || ''}: ${payment.amount} DT`;
      
    case 'cnam':
      const cnamRef = payment.dossierNumber || payment.fileNumber || '';
      const bonType = payment.cnamInfo?.bonType || '';
      const step = payment.cnamInfo?.currentStep || '';
      return `CNAM ${bonType} Dossier:${cnamRef} Étape:${step}: ${payment.amount} DT`;
      
    case 'traite':
      return `Traite Échéance:${payment.dueDate ? new Date(payment.dueDate).toLocaleDateString() : ''}: ${payment.amount} DT`;
      
    default:
      return `${payment.type}: ${payment.amount} DT`;
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // Check authentication
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (req.method === 'GET') {
      // Parse query parameters for pagination
      const usePagination = req.query.paginate !== 'false'; // Pagination enabled by default
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 100; // Default 100 items per page
      const includeDetails = req.query.details === 'true'; // Option to include full details
      const skip = usePagination ? (page - 1) * limit : 0;

      // Role-based filtering
      const whereClause: any = {};

      // If user is EMPLOYEE, only show sales assigned to them or processed by them
      if (session.user.role === 'EMPLOYEE') {
        whereClause.OR = [
          { assignedToId: session.user.id },
          { processedById: session.user.id }
        ];
      }
      // ADMIN and DOCTOR can see all sales (no filter)

      // Build include based on details flag
      const includeClause = includeDetails ? {
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
            patientCode: true,
          },
        },
        company: {
          select: {
            id: true,
            companyName: true,
            companyCode: true,
            telephone: true,
          },
        },
        payments: {
          include: {
            paymentDetails: true,
          },
          orderBy: {
            createdAt: 'asc' as const,
          },
        },
        items: {
          include: {
            product: true,
            medicalDevice: true,
            configuration: true,
          },
        },
        cnamDossiers: {
          include: {
            patient: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                patientCode: true,
              },
            },
          },
        },
        cnamBons: {
          where: {
            category: 'ACHAT' as const,
          },
          include: {
            patient: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                patientCode: true,
              },
            },
          },
        },
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true,
          },
        },
      } : {
        // Minimal data for list view
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            patientCode: true,
          },
        },
        company: {
          select: {
            id: true,
            companyName: true,
            companyCode: true,
          },
        },
        processedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        _count: {
          select: {
            payments: true,
            items: true,
          },
        },
      };

      // Get total count for pagination
      const totalCount = await prisma.sale.count({ where: whereClause });

      const sales = await prisma.sale.findMany({
        where: whereClause,
        include: includeClause,
        orderBy: {
          saleDate: 'desc',
        },
        ...(usePagination && {
          skip,
          take: limit,
        }),
      });

      // Payments are now included via the `payments` relation in the query above
      // No need for a separate query

      // Transform the data to match the expected format in the frontend
      const transformedSales = sales.map(sale => ({
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
        processedBy: sale.processedBy ? {
          id: sale.processedBy.id,
          firstName: sale.processedBy.firstName,
          lastName: sale.processedBy.lastName,
          name: `${sale.processedBy.firstName} ${sale.processedBy.lastName}`,
          email: sale.processedBy.email,
        } : null,

        // Who is assigned to the sale
        assignedToId: sale.assignedToId,
        assignedTo: sale.assignedTo ? {
          id: sale.assignedTo.id,
          firstName: sale.assignedTo.firstName,
          lastName: sale.assignedTo.lastName,
          role: sale.assignedTo.role,
        } : null,

        // Client information (either patient or company)
        patientId: sale.patientId,
        patient: sale.patient ? {
          id: sale.patient.id,
          firstName: sale.patient.firstName,
          lastName: sale.patient.lastName,
          telephone: sale.patient.telephone,
          patientCode: sale.patient.patientCode,
          fullName: `${sale.patient.firstName} ${sale.patient.lastName}`,
        } : null,
        
        companyId: sale.companyId,
        company: sale.company ? {
          id: sale.company.id,
          companyName: sale.company.companyName,
          companyCode: sale.company.companyCode,
          telephone: sale.company.telephone,
        } : null,
        
        // Client display name (either patient name or company name)
        clientName: sale.patient 
          ? `${sale.patient.firstName} ${sale.patient.lastName}`
          : (sale.company ? sale.company.companyName : 'Client inconnu'),
        
        clientType: sale.patient ? 'PATIENT' : (sale.company ? 'COMPANY' : null),
        
        // Payment information - handle multiple payments
        payments: sale.payments,
        payment: (() => {
          const salePayments = sale.payments || [];

          // If there are multiple payments, aggregate them
          if (salePayments.length > 0) {
            const totalPaidAmount = salePayments.reduce((sum, p) => sum + Number(p.amount), 0);
            const allPaid = salePayments.every(p => p.status === 'PAID');
            const anyPending = salePayments.some(p => p.status === 'PENDING');
            const hasPartial = salePayments.some(p => p.status === 'PARTIAL');

            let aggregatedStatus = 'PENDING';
            if (totalPaidAmount >= Number(sale.finalAmount)) {
              aggregatedStatus = 'PAID';
            } else if (totalPaidAmount > 0) {
              aggregatedStatus = 'PARTIAL';
            }

            return {
              id: salePayments[0].id,
              paymentCode: salePayments[0].paymentCode || null,
              amount: totalPaidAmount,
              remainingAmount: Number(sale.finalAmount) - totalPaidAmount,
              status: aggregatedStatus,
              method: salePayments.length > 1 ? 'MIXED' : salePayments[0].method,
              paymentDetails: salePayments.map(p => ({
                id: p.id,
                paymentCode: p.paymentCode,
                method: p.method,
                amount: Number(p.amount),
                status: p.status,
                paymentDate: p.paymentDate,
                referenceNumber: p.referenceNumber,
                chequeNumber: p.chequeNumber,
                bankName: p.bankName,
                notes: p.notes,
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

          // No payments yet
          return null;
        })(),
        
        // Items in the sale (only when details are included)
        items: sale.items ? sale.items.map(item => ({
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
            productCode: item.product.productCode || null,
            name: item.product.name,
            type: item.product.type,
            brand: item.product.brand || null,
            model: item.product.model || null,
          } : null,

          medicalDeviceId: item.medicalDeviceId,
          medicalDevice: item.medicalDevice ? {
            id: item.medicalDevice.id,
            deviceCode: item.medicalDevice.deviceCode || null,
            name: item.medicalDevice.name,
            type: item.medicalDevice.type,
            brand: item.medicalDevice.brand || null,
            model: item.medicalDevice.model || null,
            serialNumber: item.medicalDevice.serialNumber || null,
          } : null,
          
          // Include device configuration data
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
          
          // Item name for display
          name: item.product
            ? item.product.name
            : (item.medicalDevice ? item.medicalDevice.name : 'Article inconnu'),
        })) : [],

        // Use _count for items count when items not included
        itemsCount: includeDetails ? undefined : (sale as any)._count?.items,
        paymentsCount: includeDetails ? undefined : (sale as any)._count?.payments,

        // CNAM Bons information (only when details included)
        cnamBons: sale.cnamBons?.map(bon => ({
          id: bon.id,
          bonNumber: bon.bonNumber,
          bonType: bon.bonType,
          status: bon.status,
          bonAmount: bon.bonAmount,
          devicePrice: bon.devicePrice,
          complementAmount: bon.complementAmount,
          currentStep: bon.currentStep,
          dossierNumber: bon.dossierNumber,
          submissionDate: bon.submissionDate,
          approvalDate: bon.approvalDate,
          patient: bon.patient ? {
            id: bon.patient.id,
            patientCode: bon.patient.patientCode,
            firstName: bon.patient.firstName,
            lastName: bon.patient.lastName,
            fullName: `${bon.patient.firstName} ${bon.patient.lastName}`,
          } : null,
        })) || [],

        createdAt: sale.createdAt,
        updatedAt: sale.updatedAt,
      }));

      return res.status(200).json({
        sales: transformedSales,
        ...(usePagination && {
          pagination: {
            page,
            limit,
            total: totalCount,
            totalPages: Math.ceil(totalCount / limit),
            hasMore: skip + sales.length < totalCount,
          },
        }),
      });
    }

    if (req.method === 'POST') {
      const session = await getServerSession(req, res, authOptions);

      if (!session) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const saleData = req.body;
      
      // Validate required fields
      if (!saleData) {
        return res.status(400).json({ error: 'No sale data provided' });
      }
      
      if (!saleData.processedById) {
        // Use the current user's ID from the session
        saleData.processedById = session.user.id;
      }

      // Optional client information - can be added later
      // No validation required for patientId or companyId

      // Optional items - can be added later via separate management
      // Only validate items if they are provided
      if (saleData.items && Array.isArray(saleData.items) && saleData.items.length > 0) {
        // Validate each item has required fields
        for (let i = 0; i < saleData.items.length; i++) {
          const item = saleData.items[i];
          if (!item.quantity || isNaN(parseInt(item.quantity))) {
            return res.status(400).json({ error: `Item ${i + 1}: Valid quantity is required` });
          }
          if (!item.unitPrice || isNaN(parseFloat(item.unitPrice))) {
            return res.status(400).json({ error: `Item ${i + 1}: Valid unitPrice is required` });
          }
          if (!item.itemTotal || isNaN(parseFloat(item.itemTotal))) {
            return res.status(400).json({ error: `Item ${i + 1}: Valid itemTotal is required` });
          }
          if (!item.productId && !item.medicalDeviceId) {
            return res.status(400).json({ error: `Item ${i + 1}: Either productId or medicalDeviceId is required` });
          }
        }
      }

      // Set default values for financial fields if not provided
      if (!saleData.totalAmount || isNaN(parseFloat(saleData.totalAmount))) {
        saleData.totalAmount = 0;
      }

      if (!saleData.finalAmount || isNaN(parseFloat(saleData.finalAmount))) {
        saleData.finalAmount = 0;
      }
      
      try {
        // Start a transaction to ensure all operations succeed or fail together
        const result = await prisma.$transaction(async (tx) => {
          // 1. Parse payment data if provided (we'll create payments after the sale is created)
          // Handle the new payment structure from the stepper
          // The stepper sends payment data in saleData.payment as an array
          let payments: Array<{
            type?: string;
            amount?: number;
            classification?: string;
            cnamInfo?: {
              bonType?: string;
              bonAmount?: number;
              devicePrice?: number;
              complementAmount?: number;
              currentStep?: number;
              totalSteps?: number;
              status?: string;
              notes?: string;
            };
            dossierNumber?: string;
            notes?: string;
            paymentDate?: string;
            dueDate?: string;
            chequeNumber?: string;
            bank?: string;
            reference?: string;
          }> = [];
          if (saleData.payment) {
            // The stepper now sends an array of payments directly
            payments = Array.isArray(saleData.payment) ? saleData.payment : [saleData.payment];
          }
          
          // Store CNAM payment data for later processing (after sale creation)
          const cnamPaymentsData: Array<{
            dossierNumber: string;
            bonType: CNAMBonType;
            bonAmount: number;
            devicePrice: number;
            complementAmount: number;
            currentStep: number;
            totalSteps: number;
            status: CNAMStatus;
            notes: string | null;
          }> = [];
          
          if (saleData.patientId && payments.length > 0) {
            const cnamPayments = payments.filter(p => p.type === 'cnam' && p.cnamInfo);
            
            for (const cnamPayment of cnamPayments) {
              if (cnamPayment.cnamInfo && cnamPayment.dossierNumber) {
                // Map bond type from string to enum
                const bondTypeEnum = cnamPayment.cnamInfo.bonType?.toUpperCase() || 'AUTRE';
                const validBondType = ['MASQUE', 'CPAP', 'AUTRE'].includes(bondTypeEnum) ? bondTypeEnum : 'AUTRE';
                
                // Map status from string to enum  
                const statusEnum = cnamPayment.cnamInfo.status?.toUpperCase() || 'EN_ATTENTE_APPROBATION';
                const validStatus = ['EN_ATTENTE_APPROBATION', 'APPROUVE', 'EN_COURS', 'TERMINE', 'REFUSE'].includes(statusEnum) 
                  ? statusEnum : 'EN_ATTENTE_APPROBATION';
                
                // Store data for later processing
                cnamPaymentsData.push({
                  dossierNumber: cnamPayment.dossierNumber,
                  bonType: validBondType as CNAMBonType,
                  bonAmount: Number(cnamPayment.cnamInfo.bonAmount || cnamPayment.amount),
                  devicePrice: Number(cnamPayment.cnamInfo.devicePrice || 0),
                  complementAmount: Number(cnamPayment.cnamInfo.complementAmount || 0),
                  currentStep: cnamPayment.cnamInfo.currentStep || 1,
                  totalSteps: cnamPayment.cnamInfo.totalSteps || 7,
                  status: validStatus as CNAMStatus,
                  notes: cnamPayment.notes || cnamPayment.cnamInfo.notes || null
                });
              }
            }
          }
          
          // 2. Generate unique invoice number using current date and time
          const now = new Date();
          const year = now.getFullYear().toString();
          // Generate invoice number in format: FACTURE-2025-0001
          // Find the last invoice number for this year
          const lastInvoice = await tx.sale.findFirst({
            where: {
              invoiceNumber: {
                startsWith: `FACTURE-${year}-`
              }
            },
            orderBy: {
              createdAt: 'desc'
            },
            select: {
              invoiceNumber: true
            }
          });

          let invoiceCounter = 1;
          if (lastInvoice?.invoiceNumber) {
            // Extract the counter from the last invoice (e.g., "FACTURE-2025-0042" -> 42)
            const match = lastInvoice.invoiceNumber.match(/FACTURE-\d{4}-(\d+)$/);
            if (match) {
              invoiceCounter = parseInt(match[1], 10) + 1;
            }
          }

          // Format: FACTURE-2025-0001
          const newInvoiceNumber = `FACTURE-${year}-${invoiceCounter.toString().padStart(4, '0')}`;

          // Generate sale code
          const saleCode = await generateSaleCode(tx as any);
          
          const sale = await tx.sale.create({
            data: {
              saleCode: saleCode,
              invoiceNumber: newInvoiceNumber,
              saleDate: new Date(saleData.saleDate || new Date()),
              totalAmount: parseFloat(saleData.totalAmount),
              discount: saleData.discount ? parseFloat(saleData.discount) : 0,
              finalAmount: parseFloat(saleData.finalAmount),
              status: saleData.status || 'PENDING',
              notes: saleData.notes,
              processedById: saleData.processedById, // Use the user ID from the session
              assignedToId: saleData.assignedToId || null, // Employee assigned to manage this sale
              patientId: saleData.patientId || null,
              companyId: saleData.companyId || null,
              // Items will be created in the next step
            }
          });
          
          // 3. Create the sale items (only if items are provided)
          const saleItems = [];
          if (saleData.items && Array.isArray(saleData.items) && saleData.items.length > 0) {
            for (const item of saleData.items) {
              // Check if item has parameters (device configuration)
              const hasParameters = item.parameters && Object.keys(item.parameters).length > 0;
            
            const saleItem = await tx.saleItem.create({
              data: {
                saleId: sale.id,
                quantity: parseInt(item.quantity),
                unitPrice: parseFloat(item.unitPrice),
                discount: item.discount ? parseFloat(item.discount) : 0,
                itemTotal: parseFloat(item.itemTotal),
                serialNumber: item.serialNumber,
                warranty: item.warranty, // Keep warranty for actual warranty info
                productId: item.productId || null,
                medicalDeviceId: item.medicalDeviceId || null,
                // Create configuration if parameters exist
                ...(hasParameters && {
                  configuration: {
                    create: {
                      // CPAP parameters
                      pression: item.parameters.pression || null,
                      pressionRampe: item.parameters.pressionRampe || null,
                      dureeRampe: item.parameters.dureeRampe ? parseInt(item.parameters.dureeRampe) : null,
                      epr: item.parameters.epr || null,
                      // VNI parameters
                      ipap: item.parameters.ipap || null,
                      epap: item.parameters.epap || null,
                      aid: item.parameters.aid || null,
                      mode: item.parameters.mode || null,
                      frequenceRespiratoire: item.parameters.frequenceRespiratoire || null,
                      volumeCourant: item.parameters.volumeCourant || null,
                      // Oxygen concentrator parameters
                      debit: item.parameters.debit || null,
                      // Store any additional parameters in JSON field
                      additionalParams: (() => {
                        const knownParams = ['pression', 'pressionRampe', 'dureeRampe', 'epr', 
                                           'ipap', 'epap', 'aid', 'mode', 'frequenceRespiratoire', 
                                           'volumeCourant', 'debit'];
                        const additional = Object.keys(item.parameters)
                          .filter(key => !knownParams.includes(key))
                          .reduce((acc, key) => {
                            acc[key] = item.parameters[key];
                            return acc;
                          }, {} as any);
                        return Object.keys(additional).length > 0 ? additional : null;
                      })()
                    }
                  }
                })
              },
              include: {
                configuration: true // Include configuration in response
              }
            });
            saleItems.push(saleItem);
            
            // 4. Update inventory if needed
            if (item.productId) {
              // Calculate total available stock across all locations
              const totalAvailable = await tx.stock.aggregate({
                where: { 
                  productId: item.productId,
                  quantity: { gt: 0 }
                },
                _sum: { quantity: true }
              });
              
              const requestedQuantity = parseInt(item.quantity);
              const availableQuantity = totalAvailable._sum.quantity || 0;
              
              if (availableQuantity < requestedQuantity) {
                throw new Error(`Stock insuffisant pour le produit. Disponible: ${availableQuantity}, Demandé: ${requestedQuantity}`);
              }
              
              // Find stock records with available quantity, ordered by FIFO (oldest first)
              const stockRecords = await tx.stock.findMany({
                where: { 
                  productId: item.productId,
                  quantity: { gt: 0 }
                },
                orderBy: { createdAt: 'asc' } // FIFO: First In, First Out
              });
              
              // Distribute the deduction across multiple stock records if needed
              let remainingToDeduct = requestedQuantity;
              
              for (const stockRecord of stockRecords) {
                if (remainingToDeduct <= 0) break;
                
                const deductFromThis = Math.min(stockRecord.quantity, remainingToDeduct);
                const newQuantity = stockRecord.quantity - deductFromThis;
                
                await tx.stock.update({
                  where: { id: stockRecord.id },
                  data: { quantity: newQuantity }
                });
                
                remainingToDeduct -= deductFromThis;
              }
              
              // Log stock transaction for audit trail
              console.log(`Stock updated for product ${item.productId}: deducted ${requestedQuantity} units across ${stockRecords.length} locations`);
            }
            
            if (item.medicalDeviceId) {
              // Find the "Vendu" stock location
              const venduLocation = await tx.stockLocation.findFirst({
                where: { name: 'Vendu' }
              });

              await tx.medicalDevice.update({
                where: { id: item.medicalDeviceId },
                data: {
                  status: 'SOLD',
                  stockLocationId: venduLocation?.id || null
                  // Note: Patient/company association is through the Sale record, not directly on the device
                }
              });
            }
            }
          }

          // 4.5. Create CNAM dossiers now that sale is created
          const cnamDossierIds: string[] = [];
          if (cnamPaymentsData.length > 0 && saleData.patientId) {
            for (const cnamData of cnamPaymentsData) {
              // Generate CNAM dossier number
              const dossierNumber = await generateCNAMDossierNumber(tx as any);
              // Create CNAM dossier with proper sale reference
              const cnamDossier = await tx.cNAMDossier.create({
                data: {
                  dossierNumber: dossierNumber,
                  bonType: cnamData.bonType,
                  bondAmount: cnamData.bonAmount || 0,
                  devicePrice: cnamData.devicePrice,
                  complementAmount: cnamData.complementAmount,
                  currentStep: cnamData.currentStep,
                  totalSteps: cnamData.totalSteps,
                  status: cnamData.status,
                  notes: cnamData.notes,
                  saleId: sale.id, // Now we have the actual sale ID
                  patientId: saleData.patientId
                }
              });
              
              cnamDossierIds.push(cnamDossier.id);
              
              // Create initial step history entry
              await tx.cNAMStepHistory.create({
                data: {
                  dossierId: cnamDossier.id,
                  toStep: cnamDossier.currentStep,
                  toStatus: cnamDossier.status,
                  notes: 'Dossier CNAM créé lors de la vente',
                  changedById: saleData.processedById,
                  changeDate: new Date()
                }
              });
            }
          }

          // 4.6. Create CNAM Bons if provided
          if (saleData.cnamBons && Array.isArray(saleData.cnamBons) && saleData.cnamBons.length > 0 && saleData.patientId) {
            for (const bonData of saleData.cnamBons) {
              // Generate bon number if not provided
              const bonNumber = bonData.bonNumber || `BON-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`;

              // Create CNAM Bon with category ACHAT for sales
              await tx.cNAMBonRental.create({
                data: {
                  bonNumber: bonNumber,
                  category: 'ACHAT', // Sale type CNAM bon
                  bonType: bonData.bonType || 'AUTRE',
                  status: bonData.status || 'EN_ATTENTE_APPROBATION',
                  bonAmount: Number(bonData.bondAmount || bonData.bonAmount) || 0,
                  devicePrice: Number(bonData.devicePrice) || 0,
                  complementAmount: Number(bonData.complementAmount) || 0,
                  cnamMonthlyRate: 0, // Not applicable for sales (one-time purchase)
                  deviceMonthlyRate: 0, // Not applicable for sales
                  coveredMonths: 1, // Set to 1 for one-time purchase
                  notes: bonData.notes || null,
                  patientId: saleData.patientId,
                  saleId: sale.id, // Link to this sale
                }
              });
            }
          }

          // 5. Create patient history record if a patient is associated
          if (sale.patientId) {
            const patient = await tx.patient.findUnique({
              where: { id: sale.patientId },
              select: { doctorId: true }
            });

            await tx.patientHistory.create({
              data: {
                patientId: sale.patientId,
                actionType: 'SALE',
                performedById: sale.processedById,
                relatedItemId: sale.id,
                relatedItemType: 'Sale',
                details: {
                  saleId: sale.id,
                  finalAmount: sale.finalAmount,
                  notes: sale.notes,
                  itemCount: saleData.items?.length || 0,
                  responsibleDoctorId: patient?.doctorId,
                },
              },
            });
          }

          // 6. Create payments linked to the sale via saleId
          const createdPayments = [];
          if (payments.length > 0) {
            for (const paymentData of payments) {
              const paymentCode = await generatePaymentCode(tx as any);
              const payment = await tx.payment.create({
                data: {
                  paymentCode: paymentCode,
                  source: 'SALE', // Payment source for sales
                  saleId: sale.id, // Link payment to sale via saleId
                  patientId: sale.patientId,
                  companyId: sale.companyId,
                  amount: Number(paymentData.amount),
                  method: mapPaymentMethod(paymentData.type || 'cash'),
                  status: PaymentStatus.PAID,
                  // Store payment details in main fields
                  chequeNumber: paymentData.type === 'cheque' ? paymentData.chequeNumber || null : null,
                  bankName: paymentData.type === 'cheque' ? paymentData.bank || null : null,
                  referenceNumber: ['virement', 'mandat'].includes(paymentData.type || '') ? paymentData.reference || null : null,
                  cnamCardNumber: paymentData.type === 'cnam' ? paymentData.dossierNumber || null : null,
                  notes: paymentData.notes || null,
                  paymentDate: paymentData.paymentDate ? new Date(paymentData.paymentDate) : new Date(),
                  dueDate: paymentData.dueDate ? new Date(paymentData.dueDate) : null,
                  // Create payment details
                  paymentDetails: {
                    create: {
                      method: paymentData.type || 'cash',
                      amount: Number(paymentData.amount),
                      classification: paymentData.classification || 'principale',
                      reference: createPaymentReference(paymentData),
                      metadata: {
                        ...paymentData,
                        // Store CNAM info if present
                        ...(paymentData.cnamInfo && { cnamInfo: paymentData.cnamInfo }),
                        // Store payment-specific details
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
                }
              });
              createdPayments.push(payment);
            }
          }

          // Return the created sale with its items and payments
          return { sale, saleItems, createdPayments };
        });

        // Fetch the complete sale with all relations
        const completeSale = await prisma.sale.findUnique({
          where: { id: result.sale.id },
          include: {
            processedBy: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true
              }
            },
            assignedTo: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                role: true,
              }
            },
            patient: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                telephone: true,
                patientCode: true
              }
            },
            company: {
              select: {
                id: true,
                companyName: true,
                companyCode: true,
                telephone: true
              }
            },
            payments: {
              include: {
                paymentDetails: true
              },
              orderBy: {
                createdAt: 'asc'
              }
            },
            items: {
              include: {
                product: true,
                medicalDevice: true,
                configuration: true
              }
            },
            cnamDossiers: {
              include: {
                patient: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    patientCode: true
                  }
                }
              }
            },
            cnamBons: {
              where: {
                category: 'ACHAT'
              },
              include: {
                patient: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    patientCode: true
                  }
                }
              }
            }
          }
        });

        return res.status(201).json({
          message: 'Sale created successfully',
          sale: completeSale,
          saleItems: result.saleItems
        });
      } catch (error) {
        console.error('Error creating sale:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        const errorStack = error instanceof Error ? error.stack : '';
        console.error('Sale creation error details:', { message: errorMessage, stack: errorStack });
        
        // Provide more specific error messages based on the error type
        if (errorMessage.includes('violates unique constraint')) {
          return res.status(400).json({ 
            error: 'Données dupliquées détectées. Veuillez vérifier les informations saisies.',
            details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
          });
        } else if (errorMessage.includes('Foreign key constraint')) {
          return res.status(400).json({ 
            error: 'Référence invalide. Veuillez vérifier que le client et les produits existent.',
            details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
          });
        } else if (errorMessage.includes('required')) {
          return res.status(400).json({ 
            error: 'Champs requis manquants. Veuillez vérifier toutes les informations.',
            details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
          });
        } else {
          return res.status(500).json({ 
            error: 'Erreur lors de la création de la vente. Veuillez réessayer.',
            details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
          });
        }
      }
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}