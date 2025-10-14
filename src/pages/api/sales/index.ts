import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { PaymentMethod, PaymentStatus, CNAMBondType, CNAMStatus } from '@prisma/client';
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
    bondType?: string;
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
      const bondType = payment.cnamInfo?.bondType || '';
      const step = payment.cnamInfo?.currentStep || '';
      return `CNAM ${bondType} Dossier:${cnamRef} Étape:${step}: ${payment.amount} DT`;
      
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
    if (req.method === 'GET') {
      // Get the createdBy filter from query params for employee filtering
      const { createdBy, processedBy } = req.query;
      
      // Build the where clause
      const whereClause: any = {};
      if (createdBy) {
        whereClause.processedById = createdBy as string;
      }
      if (processedBy) {
        whereClause.processedById = processedBy as string;
      }
      
      const sales = await prisma.sale.findMany({
        where: whereClause,
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
              patientCode: true,
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
              paymentDetails: true, // Include payment details for complex payments
            },
          },
          items: {
            include: {
              product: true,
              medicalDevice: true,
              configuration: true, // Include the new configuration
            },
          },
        },
        orderBy: {
          saleDate: 'desc',
        },
      });

      // Get all payments for all sales in a single query
      const saleIds = sales.map(sale => sale.id);
      const allPayments = await prisma.payment.findMany({
        where: {
          saleId: {
            in: saleIds
          }
        },
        orderBy: {
          paymentDate: 'asc'
        }
      });

      // Group payments by saleId
      const paymentsBySale = allPayments.reduce((acc, payment) => {
        if (!acc[payment.saleId!]) {
          acc[payment.saleId!] = [];
        }
        acc[payment.saleId!].push(payment);
        return acc;
      }, {} as Record<string, typeof allPayments>);

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
          telephone: sale.company.telephone,
        } : null,
        
        // Client display name (either patient name or company name)
        clientName: sale.patient 
          ? `${sale.patient.firstName} ${sale.patient.lastName}`
          : (sale.company ? sale.company.companyName : 'Client inconnu'),
        
        clientType: sale.patient ? 'PATIENT' : (sale.company ? 'COMPANY' : null),
        
        // Payment information - handle multiple payments
        paymentId: sale.paymentId,
        payment: (() => {
          const salePayments = paymentsBySale[sale.id] || [];
          
          // If there are multiple payments via saleId, aggregate them
          if (salePayments.length > 0) {
            const totalAmount = salePayments.reduce((sum, p) => sum + Number(p.amount), 0);
            const allPaid = salePayments.every(p => p.status === 'PAID');
            const anyPending = salePayments.some(p => p.status === 'PENDING');
            const hasPartial = salePayments.some(p => p.status === 'PARTIAL');
            
            let aggregatedStatus = 'PENDING';
            if (allPaid) {
              aggregatedStatus = 'PAID';
            } else if (hasPartial || (salePayments.some(p => p.status === 'PAID') && anyPending)) {
              aggregatedStatus = 'PARTIAL';
            }
            
            return {
              id: salePayments[0].id,
              amount: totalAmount,
              status: aggregatedStatus,
              method: salePayments.length > 1 ? 'MIXED' : salePayments[0].method,
              paymentDetails: salePayments.map(p => ({
                method: p.method,
                amount: Number(p.amount),
                status: p.status,
                paymentDate: p.paymentDate,
                referenceNumber: p.referenceNumber,
                metadata: {
                  dossierNumber: p.cnamBondNumber,
                  cnamInfo: p.cnamBondNumber ? {
                    dossierNumber: p.cnamBondNumber,
                    bondType: p.cnamBondType,
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
            paymentDetails: sale.payment.paymentDetails || []
          } : null;
        })(),
        
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
        })),
        
        createdAt: sale.createdAt,
        updatedAt: sale.updatedAt,
      }));

      return res.status(200).json({ sales: transformedSales });
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
      
      // Validate client information
      if (!saleData.patientId && !saleData.companyId) {
        return res.status(400).json({ error: 'Either patientId or companyId must be provided' });
      }
      
      // Validate items
      if (!saleData.items || !Array.isArray(saleData.items) || saleData.items.length === 0) {
        return res.status(400).json({ error: 'At least one item must be provided' });
      }
      
      // Validate required financial fields
      if (!saleData.totalAmount || isNaN(parseFloat(saleData.totalAmount))) {
        return res.status(400).json({ error: 'Valid totalAmount is required' });
      }
      
      if (!saleData.finalAmount || isNaN(parseFloat(saleData.finalAmount))) {
        return res.status(400).json({ error: 'Valid finalAmount is required' });
      }
      
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
      
      try {
        // Start a transaction to ensure all operations succeed or fail together
        const result = await prisma.$transaction(async (tx) => {
          // 1. Create the payment if provided
          let paymentId = null;
          
          // Handle the new payment structure from the stepper
          // The stepper sends payment data in saleData.payment as an array
          let payments: Array<{
            type?: string;
            amount?: number;
            classification?: string;
            cnamInfo?: {
              bondType?: string;
              bondAmount?: number;
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
            
            if (payments.length > 0) {
              // Calculate total payment amount
              const totalPaymentAmount = payments.reduce((sum: number, p) => sum + (Number(p.amount) || 0), 0);
              
              // Get the primary payment (first one or the one marked as 'principale')
              const primaryPayment = payments.find(p => p.classification === 'principale') || payments[0];
              
              // Create the main payment record
              const paymentCode = await generatePaymentCode(tx as any);
              const payment = await tx.payment.create({
                data: {
                  paymentCode: paymentCode,
                  amount: totalPaymentAmount,
                  method: mapPaymentMethod(primaryPayment.type || 'cash'),
                  status: totalPaymentAmount >= Number(saleData.finalAmount) ? PaymentStatus.PAID : PaymentStatus.PARTIAL,
                  // Store primary payment details in main fields
                  chequeNumber: primaryPayment.type === 'cheque' ? primaryPayment.chequeNumber || null : null,
                  bankName: primaryPayment.type === 'cheque' ? primaryPayment.bank || null : null,
                  referenceNumber: ['virement', 'mandat'].includes(primaryPayment.type || '') ? primaryPayment.reference || null : null,
                  cnamCardNumber: primaryPayment.type === 'cnam' ? primaryPayment.dossierNumber || null : null,
                  notes: primaryPayment.notes || null,
                  paymentDate: primaryPayment.paymentDate ? new Date(primaryPayment.paymentDate) : new Date(),
                  dueDate: primaryPayment.dueDate ? new Date(primaryPayment.dueDate) : null,
                  // Create payment details for each payment method
                  paymentDetails: {
                    create: payments.map(p => ({
                      method: p.type || 'cash',
                      amount: Number(p.amount),
                      classification: p.classification || 'principale',
                      reference: createPaymentReference(p),
                      metadata: {
                        ...p,
                        // Store CNAM info if present
                        ...(p.cnamInfo && { cnamInfo: p.cnamInfo }),
                        // Store payment-specific details
                        ...(p.type === 'cheque' && {
                          chequeNumber: p.chequeNumber,
                          bank: p.bank
                        }),
                        ...(p.type === 'virement' && {
                          reference: p.reference,
                          bank: p.bank
                        }),
                        ...(p.type === 'cnam' && {
                          bondType: p.cnamInfo?.bondType,
                          dossierNumber: p.dossierNumber,
                          currentStep: p.cnamInfo?.currentStep,
                          status: p.cnamInfo?.status
                        })
                      }
                    }))
                  }
                }
              });
              paymentId = payment.id;
            }
          }
          
          // Store CNAM payment data for later processing (after sale creation)
          const cnamPaymentsData: Array<{
            dossierNumber: string;
            bondType: CNAMBondType;
            bondAmount: number;
            devicePrice: number;
            complementAmount: number;
            currentStep: number;
            totalSteps: number;
            status: CNAMStatus;
            notes: string | null;
          }> = [];
          
          if (saleData.patientId && paymentId) {
            const cnamPayments = payments.filter(p => p.type === 'cnam' && p.cnamInfo);
            
            for (const cnamPayment of cnamPayments) {
              if (cnamPayment.cnamInfo && cnamPayment.dossierNumber) {
                // Map bond type from string to enum
                const bondTypeEnum = cnamPayment.cnamInfo.bondType?.toUpperCase() || 'AUTRE';
                const validBondType = ['MASQUE', 'CPAP', 'AUTRE'].includes(bondTypeEnum) ? bondTypeEnum : 'AUTRE';
                
                // Map status from string to enum  
                const statusEnum = cnamPayment.cnamInfo.status?.toUpperCase() || 'EN_ATTENTE_APPROBATION';
                const validStatus = ['EN_ATTENTE_APPROBATION', 'APPROUVE', 'EN_COURS', 'TERMINE', 'REFUSE'].includes(statusEnum) 
                  ? statusEnum : 'EN_ATTENTE_APPROBATION';
                
                // Store data for later processing
                cnamPaymentsData.push({
                  dossierNumber: cnamPayment.dossierNumber,
                  bondType: validBondType as CNAMBondType,
                  bondAmount: Number(cnamPayment.cnamInfo.bondAmount || cnamPayment.amount),
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
          const month = (now.getMonth() + 1).toString().padStart(2, '0');
          const day = now.getDate().toString().padStart(2, '0');
          const hours = now.getHours().toString().padStart(2, '0');
          const minutes = now.getMinutes().toString().padStart(2, '0');
          const seconds = now.getSeconds().toString().padStart(2, '0');
          
          // Generate a unique invoice number using timestamp + random suffix
          let newInvoiceNumber = '';
          let isUnique = false;
          let attempts = 0;
          const maxAttempts = 1000; // Increased from 100 to 1000
          
          while (!isUnique && attempts < maxAttempts) {
            // Generate random 4-digit suffix for uniqueness
            const randomSuffix = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
            newInvoiceNumber = `${year}${month}${day}-${hours}${minutes}${seconds}-${randomSuffix}`;
            
            // Check if this invoice number already exists
            const existingSale = await tx.sale.findUnique({
              where: { invoiceNumber: newInvoiceNumber }
            });
            
            if (!existingSale) {
              isUnique = true;
            } else {
              attempts++;
              // Add small delay to ensure different timestamp on next iteration
              await new Promise(resolve => setTimeout(resolve, 1));
            }
          }
          
          if (!isUnique) {
            // Final fallback: use UUID-based approach
            const { randomUUID } = await import('crypto');
            const uuid = randomUUID().replace(/-/g, '').substring(0, 8).toUpperCase();
            newInvoiceNumber = `${year}${month}${day}-${uuid}`;
            
            // Final check - if this still exists (extremely unlikely), let database handle the constraint
            console.warn(`Invoice generation required fallback to UUID: ${newInvoiceNumber}`);
          }

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
              patientId: saleData.patientId || null,
              companyId: saleData.companyId || null,
              paymentId: paymentId,
              // Items will be created in the next step
            }
          });
          
          // 3. Create the sale items
          const saleItems = [];
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
              await tx.medicalDevice.update({
                where: { id: item.medicalDeviceId },
                data: {
                  status: 'SOLD',
                  // Associate the device with the patient or company
                  patientId: saleData.patientId || null,
                  companyId: saleData.companyId || null
                }
              });
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
                  bondType: cnamData.bondType,
                  bondAmount: cnamData.bondAmount,
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
                  itemCount: saleData.items.length,
                  responsibleDoctorId: patient?.doctorId,
                },
              },
            });
          }
          
          // Return the created sale with its items
          return { sale, saleItems };
        });
        
        return res.status(201).json({
          message: 'Sale created successfully',
          sale: result.sale,
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