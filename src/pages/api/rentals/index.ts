import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { PaymentMethod, CNAMBondType, CNAMStatus } from '@prisma/client';
import type { Prisma } from '@prisma/client';
import { createRentalExpirationNotification, createPaymentDueNotification } from '@/lib/notifications';
import { generateRentalCode, generatePaymentCode } from '@/utils/idGenerator';

// Type definitions for request body
interface ProductItem {
  productId: string;
  type: string;
  quantity: number;
  rentalPrice: number;
}

interface ProductPeriod {
  productId: string;
  startDate: string;
  endDate?: string;
}

interface PaymentPeriod {
  id: string;
  amount: number;
  paymentMethod: PaymentMethod;
  startDate: string;
  endDate: string;
  productIds: string[];
  cnamBondNumber?: string;
  cnamBondType?: CNAMBondType;
  cnamStatus?: CNAMStatus;
  cnamApprovalDate?: string;
  cnamStartDate?: string;
  cnamEndDate?: string;
  isGapPeriod?: boolean;
  gapReason?: string;
  notes?: string;
}

interface CNAMBond {
  bondNumber?: string;
  bondType: CNAMBondType;
  status?: CNAMStatus;
  dossierNumber?: string;
  submissionDate?: string;
  approvalDate?: string;
  startDate?: string;
  endDate?: string;
  monthlyAmount: number;
  coveredMonths: number;
  totalAmount: number;
  renewalReminderDays?: number;
  notes?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    switch (req.method) {
      case 'GET':
        // Build query filters
        const where: any = {};
        
        // Filter by createdById if provided (for employee role)
        if (req.query.createdById) {
          where.createdById = req.query.createdById;
        }
        
        // Filter by role if employee
        if (req.query.role === 'employee' && session.user?.id) {
          // For employee role, only show rentals they created
          // Since createdById might not exist yet in DB, we handle this carefully
          where.createdById = session.user.id;
        }
        
        // Fetch all rentals with enhanced related data including new relations
        const rentals = await prisma.rental.findMany({
          where,
          include: {
            medicalDevice: {
              select: {
                id: true,
                name: true,
                type: true,
                brand: true,
                model: true,
                serialNumber: true,
                rentalPrice: true,
              }
            },
            patient: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                telephone: true,
                cnamId: true,
              }
            },
            Company: {
              select: {
                id: true,
                companyName: true,
                telephone: true,
              }
            },
            payment: true,
            // New relational data instead of JSON metadata
            accessories: {
              include: {
                product: {
                  select: {
                    id: true,
                    name: true,
                    type: true,
                    brand: true,
                    model: true,
                  }
                }
              }
            },
            configuration: true,
            gaps: {
              orderBy: {
                startDate: 'asc'
              }
            },
            cnamBonds: {
              select: {
                id: true,
                bondNumber: true,
                bondType: true,
                status: true,
                totalAmount: true,
                coveredMonths: true,
                startDate: true,
                endDate: true,
              }
            },
            rentalPeriods: {
              select: {
                id: true,
                startDate: true,
                endDate: true,
                amount: true,
                paymentMethod: true,
                isGapPeriod: true,
                gapReason: true,
              }
            },
            createdBy: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              }
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        });

        // Transform the data to match the expected format in the frontend
        const transformedRentals = rentals.map((rental: Prisma.RentalGetPayload<{
          include: {
            medicalDevice: { select: { id: true, name: true, type: true, brand: true, model: true, serialNumber: true, rentalPrice: true } },
            patient: { select: { id: true, firstName: true, lastName: true, telephone: true, cnamId: true } },
            Company: { select: { id: true, companyName: true, telephone: true } },
            payment: true,
            accessories: { include: { product: { select: { id: true, name: true, type: true, brand: true, model: true } } } },
            configuration: true,
            gaps: { orderBy: { startDate: 'asc' } },
            cnamBonds: { select: { id: true, bondNumber: true, bondType: true, status: true, totalAmount: true, coveredMonths: true, startDate: true, endDate: true } },
            rentalPeriods: { select: { id: true, startDate: true, endDate: true, amount: true, paymentMethod: true, isGapPeriod: true, gapReason: true } }
          }
        }>) => {
          // Calculate rental status based on dates and payment
          const now = new Date();
          const startDate = new Date(rental.startDate);
          const endDate = rental.endDate ? new Date(rental.endDate) : null;
          
          let status = 'ACTIVE';
          if (endDate && now > endDate) {
            status = 'EXPIRED';
          } else if (now < startDate) {
            status = 'SCHEDULED';
          } else if (endDate && endDate.getTime() - now.getTime() <= 7 * 24 * 60 * 60 * 1000) {
            status = 'EXPIRING_SOON';
          }
          
          // Calculate total amount from rental periods or payment
          const totalAmount = rental.rentalPeriods?.length > 0 
            ? rental.rentalPeriods.reduce((sum, period) => sum + Number(period.amount), 0)
            : rental.payment?.amount || 0;
          
          // Extract relational data instead of metadata
          const accessories = rental.accessories?.map(acc =>  ({
            id: acc.id,
            productId: acc.productId,
            quantity: acc.quantity,
            unitPrice: acc.unitPrice,
            product: acc.product
          })) || [];
          
          return {
            id: rental.id,
            rentalCode: rental.rentalCode,
            medicalDeviceId: rental.medicalDeviceId,
            medicalDevice: {
              id: rental.medicalDevice.id,
              name: rental.medicalDevice.name,
              type: rental.medicalDevice.type,
              brand: rental.medicalDevice.brand || null,
              model: rental.medicalDevice.model || null,
              serialNumber: rental.medicalDevice.serialNumber || null,
              rentalPrice: rental.medicalDevice.rentalPrice,
              parameters: null, // Device parameters should be handled separately
            },
            patientId: rental.patientId,
            patient: rental.patient ? {
              id: rental.patient.id,
              firstName: rental.patient.firstName,
              lastName: rental.patient.lastName,
              telephone: rental.patient.telephone,
              cnamId: rental.patient.cnamId,
            } : null,
            companyId: rental.companyId || null,
            company: rental.Company ? {
              id: rental.Company.id,
              companyName: rental.Company.companyName,
              telephone: rental.Company.telephone,
            } : null,
            startDate: rental.startDate,
            endDate: rental.endDate,
            status: status,
            notes: rental.notes || null,
            paymentId: rental.paymentId || null,
            payment: rental.payment ? {
              id: rental.payment.id,
              amount: rental.payment.amount,
              status: rental.payment.status,
              method: rental.payment.method,
              chequeNumber: rental.payment.chequeNumber,
              bankName: rental.payment.bankName,
              referenceNumber: rental.payment.referenceNumber,
              cnamCardNumber: rental.payment.cnamCardNumber,
              notes: rental.payment.notes,
            } : null,
            // Include CNAM bonds with enhanced data
            cnamBonds: rental.cnamBonds?.map(bond => ({
              id: bond.id,
              bondNumber: bond.bondNumber,
              bondType: bond.bondType,
              status: bond.status,
              totalAmount: bond.totalAmount,
              coveredMonths: bond.coveredMonths,
              startDate: bond.startDate,
              endDate: bond.endDate,
              // Calculate remaining coverage
              remainingMonths: bond.endDate ? Math.max(0, Math.ceil((new Date(bond.endDate).getTime() - now.getTime()) / (30 * 24 * 60 * 60 * 1000))) : 0,
            })) || [],
            // Include rental periods
            rentalPeriods: rental.rentalPeriods?.map(period => ({
              id: period.id,
              startDate: period.startDate,
              endDate: period.endDate,
              amount: period.amount,
              paymentMethod: period.paymentMethod,
              isGapPeriod: period.isGapPeriod,
              gapReason: period.gapReason,
              // Calculate period status
              status: now < new Date(period.startDate) ? 'UPCOMING' : 
                     now > new Date(period.endDate) ? 'COMPLETED' : 'ACTIVE',
            })) || [],
            // Enhanced relational data (no more metadata JSON)
            configuration: rental.configuration ? {
              isGlobalOpenEnded: rental.configuration.isGlobalOpenEnded,
              urgentRental: rental.configuration.urgentRental,
              cnamEligible: rental.configuration.cnamEligible,
              totalPaymentAmount: rental.configuration.totalPaymentAmount,
              depositAmount: rental.configuration.depositAmount,
              depositMethod: rental.configuration.depositMethod,
              notes: rental.configuration.notes,
            } : null,
            accessories: accessories,
            gaps: rental.gaps?.map(gap => ({
              id: gap.id,
              gapType: gap.gapType,
              startDate: gap.startDate,
              endDate: gap.endDate,
              reason: gap.reason,
              amount: gap.amount,
              status: gap.status,
              description: gap.description,
            })) || [],
            // Financial summary
            financialSummary: {
              totalAmount: totalAmount,
              paidAmount: rental.payment?.status === 'PAID' ? rental.payment.amount : 0,
              pendingAmount: rental.payment?.status === 'PENDING' ? rental.payment.amount : 0,
              cnamAmount: rental.cnamBonds?.reduce((sum, bond) => sum + Number(bond.totalAmount || 0), 0) || 0,
              depositAmount: rental.configuration?.depositAmount || 0,
            },
            createdAt: rental.createdAt,
            updatedAt: rental.updatedAt,
            createdBy: (rental as any).createdBy ? {
              id: (rental as any).createdBy.id,
              firstName: (rental as any).createdBy.firstName,
              lastName: (rental as any).createdBy.lastName,
              email: (rental as any).createdBy.email,
            } : null,
          };
        });

        return res.status(200).json({ rentals: transformedRentals });

      case 'POST':
        // Create an enhanced rental with comprehensive data
        const { 
          clientId, 
          clientType, 
          products, 
          // Enhanced rental details
          globalStartDate,
          globalEndDate,
          isGlobalOpenEnded,
          urgentRental,
          productPeriods,
          identifiedGaps,
          notes,
          // Enhanced payment data
          paymentPeriods,
          cnamBonds,
          depositAmount,
          depositMethod,
          paymentGaps,
          cnamEligible,
          // Legacy fields for compatibility
          startDate, 
          endDate, 
          payment,
          // Status and totals
          totalPrice,
          totalPaymentAmount
        }: {
          clientId: string;
          clientType: 'patient' | 'societe';
          products: ProductItem[];
          globalStartDate?: string;
          globalEndDate?: string;
          isGlobalOpenEnded?: boolean;
          urgentRental?: boolean;
          productPeriods?: ProductPeriod[];
          identifiedGaps?: any[];
          notes?: string | null;
          paymentPeriods?: PaymentPeriod[];
          cnamBonds?: CNAMBond[];
          depositAmount?: number;
          depositMethod?: PaymentMethod;
          paymentGaps?: any[];
          cnamEligible?: boolean;
          startDate?: string;
          endDate?: string;
          payment?: any;
          totalPrice?: number;
          totalPaymentAmount?: number;
        } = req.body;
        
        // Use enhanced or legacy date fields
        const rentalStartDate = globalStartDate || startDate;
        const rentalEndDate = globalEndDate || endDate;
        
        // Validate required fields
        if (!clientId || !products || !rentalStartDate) {
          return res.status(400).json({ 
            error: 'Missing required fields: clientId, products, and start date are required' 
          });
        }
        
        // Validate products array
        if (!Array.isArray(products) || products.length === 0) {
          return res.status(400).json({ 
            error: 'At least one product is required for rental' 
          });
        }
        
        // Validate clientType
        if (!clientType || !['patient', 'societe'].includes(clientType)) {
          return res.status(400).json({ 
            error: 'Invalid clientType. Must be either "patient" or "societe"' 
          });
        }
        
        // For company rentals, we need to ensure we have a valid approach since patientId is required in schema
        if (clientType === 'societe') {
          return res.status(400).json({ 
            error: 'Company rentals are not fully supported yet. patientId is required in the current schema design.' 
          });
        }
        
        // Debug: Log received products to see if parameters are being sent
        console.log('📦 Received products:', JSON.stringify(products, null, 2));
        
        // Track accessories outside transaction for summary
        const accessoryRecords = products.filter((p: ProductItem) => p.type === 'ACCESSORY');
        
        try {
          // Start a transaction to ensure all operations succeed or fail together
          const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
            // Create CNAM bonds first if provided (only for patients)
            const cnamBondRecords = [];
            if (cnamBonds && Array.isArray(cnamBonds) && cnamBonds.length > 0 && clientId) {
              for (const bond of cnamBonds) {
                const cnamBondRecord = await tx.cNAMBondRental.create({
                  data: {
                    bondNumber: bond.bondNumber || null,
                    bondType: bond.bondType,
                    status: bond.status || 'EN_ATTENTE_APPROBATION',
                    dossierNumber: bond.dossierNumber || null,
                    submissionDate: bond.submissionDate ? new Date(bond.submissionDate) : null,
                    approvalDate: bond.approvalDate ? new Date(bond.approvalDate) : null,
                    startDate: bond.startDate ? new Date(bond.startDate) : null,
                    endDate: bond.endDate ? new Date(bond.endDate) : null,
                    monthlyAmount: bond.monthlyAmount,
                    coveredMonths: bond.coveredMonths,
                    totalAmount: bond.totalAmount,
                    renewalReminderDays: bond.renewalReminderDays || 30,
                    notes: bond.notes || null,
                    patient: { connect: { id: clientId } }
                  }
                });
                cnamBondRecords.push(cnamBondRecord);
              }
            }

            // Create enhanced payment records if payment periods are provided
            const paymentRecords = [];
            
            // Handle enhanced payment periods
            if (paymentPeriods && Array.isArray(paymentPeriods) && paymentPeriods.length > 0) {
              for (const period of paymentPeriods) {
                const paymentCode = await generatePaymentCode(tx as any);
                const paymentRecord = await tx.payment.create({
                  data: {
                    paymentCode: paymentCode,
                    amount: period.amount,
                    method: period.paymentMethod || 'CASH',
                    status: period.cnamStatus === 'APPROUVE' ? 'PAID' : 'PENDING',
                    patient: { connect: { id: clientId } },
                    notes: period.notes || null,
                    // Enhanced payment period data as proper fields
                    cnamBondNumber: period.cnamBondNumber || null,
                    cnamBondType: period.cnamBondType || null,
                    cnamStatus: period.cnamStatus || null,
                    cnamApprovalDate: period.cnamApprovalDate ? new Date(period.cnamApprovalDate) : null,
                    cnamStartDate: period.cnamStartDate ? new Date(period.cnamStartDate) : null,
                    cnamEndDate: period.cnamEndDate ? new Date(period.cnamEndDate) : null,
                    isGapPeriod: period.isGapPeriod || false,
                    gapReason: period.gapReason || null,
                    isRentalPayment: true
                  }
                });
                paymentRecords.push(paymentRecord);
              }
            }
            
            // Handle deposit payment if provided
            let depositRecord = null;
            if (depositAmount && depositAmount > 0) {
              const depositPaymentCode = await generatePaymentCode(tx as any);
              depositRecord = await tx.payment.create({
                data: {
                  paymentCode: depositPaymentCode,
                  amount: depositAmount,
                  method: depositMethod || 'CASH',
                  status: 'GUARANTEE', // Deposit is a guarantee payment
                  patient: { connect: { id: clientId } },
                  notes: 'Dépôt de garantie pour location',
                  isDepositPayment: true,
                  isRentalPayment: true
                }
              });
            }
            
            // Create legacy payment record if provided (for backward compatibility)
            let legacyPaymentRecord = null;
            if (payment) {
              // Ensure payment method is set - default to CASH if not provided
              const paymentMethod = payment.method || 'CASH';
              
              // Validate that the method is one of the allowed enum values
              if (!['CNAM', 'CHEQUE', 'CASH', 'BANK_TRANSFER', 'MANDAT', 'VIREMENT', 'TRAITE'].includes(paymentMethod)) {
                throw new Error(`Invalid payment method: ${paymentMethod}. Must be one of: CNAM, CHEQUE, CASH, BANK_TRANSFER, MANDAT, VIREMENT, TRAITE`);
              }
              
              // Map and validate payment status to ensure it's a valid enum value
              let paymentStatus = payment.status || 'PENDING';
              // Only allow valid PaymentStatus enum values
              const validStatuses = ['PENDING', 'PAID', 'GUARANTEE', 'PARTIAL'];
              if (!validStatuses.includes(paymentStatus)) {
                // Map custom statuses to valid ones
                if (paymentStatus === 'COMPLETED_WITH_PENDING_CNAM') {
                  paymentStatus = 'PARTIAL'; // Map to PARTIAL as it's partially paid
                } else if (paymentStatus === 'COMPLETED') {
                  paymentStatus = 'PAID'; // Map COMPLETED to PAID
                } else {
                  // Default to PENDING for any other invalid status
                  paymentStatus = 'PENDING';
                }
              }
              
              const legacyPaymentCode = await generatePaymentCode(tx as any);
              legacyPaymentRecord = await tx.payment.create({
                data: {
                  paymentCode: legacyPaymentCode,
                  amount: payment.amount || totalPrice,
                  method: paymentMethod,
                  status: paymentStatus,
                  chequeNumber: payment.chequeNumber,
                  bankName: payment.bankName,
                  referenceNumber: payment.referenceNumber,
                  cnamCardNumber: payment.cnamCardNumber,
                  notes: payment.notes,
                  patient: { connect: { id: clientId } },
                  // Add any other payment fields as needed
                }
              });
            }
            
            // Create enhanced rental records for each product
            const rentalRecords = [];
            const accessoryRecords = [];
            
            for (const product of products) {
              // Handle accessories separately - we'll create RentalAccessory records
              if (product.type === 'ACCESSORY') {
                // Accessories will be handled after rental creation
                continue;
              }
              
              // Find the specific product period if available
              const productPeriod = productPeriods?.find((p: ProductPeriod) => p.productId === product.productId) || null;
              
              // Determine dates for this specific product
              const productStartDate = productPeriod?.startDate || rentalStartDate;
              const productEndDate = productPeriod?.endDate || rentalEndDate;
              
              // Generate rental code
              const rentalCode = await generateRentalCode(tx as any);
              
              // Create the enhanced rental record for medical devices only
              const rental = await tx.rental.create({
                data: {
                  rentalCode: rentalCode,
                  medicalDeviceId: product.productId,
                  patientId: clientId, // Since we only support patient rentals now
                  startDate: new Date(productStartDate),
                  endDate: productEndDate ? new Date(productEndDate) : null,
                  notes: notes || null,
                  paymentId: legacyPaymentRecord?.id || paymentRecords[0]?.id || null,
                  createdById: session.user?.id || null, // Track who created the rental
                },
                include: {
                  medicalDevice: true,
                  patient: {
                    include: {
                      assignedTo: true
                    }
                  },
                  payment: true,
                }
              });

              // Create rental configuration
              if (rental) {
                await tx.rentalConfiguration.create({
                  data: {
                    rentalId: rental.id,
                    isGlobalOpenEnded: isGlobalOpenEnded || false,
                    urgentRental: urgentRental || false,
                    cnamEligible: cnamEligible || false,
                    totalPaymentAmount: totalPaymentAmount || null,
                    depositAmount: depositAmount || null,
                    depositMethod: depositMethod || null,
                    notes: notes || null,
                  }
                });

                // Create rental gaps if provided
                if (identifiedGaps && Array.isArray(identifiedGaps)) {
                  for (const gap of identifiedGaps) {
                    // Validate gap dates before creating
                    if (!gap.startDate || !gap.endDate) {
                      console.warn('Skipping gap with missing dates:', gap);
                      continue;
                    }
                    
                    const startDate = new Date(gap.startDate);
                    const endDate = new Date(gap.endDate);
                    
                    // Check if dates are valid
                    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
                      console.warn('Skipping gap with invalid dates:', gap);
                      continue;
                    }
                    
                    await tx.rentalGap.create({
                      data: {
                        rentalId: rental.id,
                        gapType: 'IDENTIFIED',
                        startDate: startDate,
                        endDate: endDate,
                        reason: gap.reason || null,
                        amount: gap.amount || null,
                        description: gap.description || null,
                      }
                    });
                  }
                }

                if (paymentGaps && Array.isArray(paymentGaps)) {
                  for (const gap of paymentGaps) {
                    // Validate gap dates before creating
                    if (!gap.startDate || !gap.endDate) {
                      console.warn('Skipping payment gap with missing dates:', gap);
                      continue;
                    }
                    
                    const startDate = new Date(gap.startDate);
                    const endDate = new Date(gap.endDate);
                    
                    // Check if dates are valid
                    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
                      console.warn('Skipping payment gap with invalid dates:', gap);
                      continue;
                    }
                    
                    await tx.rentalGap.create({
                      data: {
                        rentalId: rental.id,
                        gapType: 'PAYMENT',
                        startDate: startDate,
                        endDate: endDate,
                        reason: gap.reason || null,
                        amount: gap.amount || null,
                        description: gap.description || null,
                      }
                    });
                  }
                }
              }
              
              // Update the medical device to associate it with the patient
              await tx.medicalDevice.update({
                where: { id: product.productId },
                data: { patientId: clientId }
              });
              
              // Create patient history record for the rental
              if (rental.patientId) {
                const [patient, device] = await Promise.all([
                  tx.patient.findUnique({
                    where: { id: rental.patientId },
                    select: { doctorId: true }
                  }),
                  tx.medicalDevice.findUnique({
                    where: { id: rental.medicalDeviceId },
                    select: { name: true }
                  })
                ]);

                await tx.patientHistory.create({
                  data: {
                    patientId: rental.patientId,
                    actionType: 'RENTAL',
                    performedById: session.user.id,
                    relatedItemId: rental.id,
                    relatedItemType: 'Rental',
                    details: {
                      rentalId: rental.id,
                      deviceId: rental.medicalDeviceId,
                      deviceName: device?.name || 'Unknown Device',
                      startDate: rental.startDate,
                      endDate: rental.endDate,
                      notes: rental.notes,
                      responsibleDoctorId: patient?.doctorId,
                    },
                  },
                });
              }

              rentalRecords.push(rental);
            }

            // Now handle accessories with stock reduction
            if (accessoryRecords.length === 0 && rentalRecords.length > 0) {
              // Process accessories for the first rental (since accessories are shared)
              const primaryRental = rentalRecords[0];
              
              for (const product of products) {
                if (product.type === 'ACCESSORY') {
                  // Create RentalAccessory record
                  const rentalAccessory = await tx.rentalAccessory.create({
                    data: {
                      rentalId: primaryRental.id,
                      productId: product.productId,
                      quantity: product.quantity,
                      unitPrice: product.rentalPrice || 0,
                    }
                  });
                  
                  accessoryRecords.push(rentalAccessory);
                  
                  // Reduce stock quantity
                  const existingStock = await tx.stock.findFirst({
                    where: {
                      productId: product.productId,
                      quantity: {
                        gte: product.quantity // Ensure we have enough stock
                      }
                    },
                    orderBy: {
                      quantity: 'desc' // Get the location with most stock first
                    }
                  });
                  
                  if (existingStock) {
                    // Reduce stock quantity
                    await tx.stock.update({
                      where: { id: existingStock.id },
                      data: {
                        quantity: existingStock.quantity - product.quantity,
                        status: 'FOR_RENT' // Mark as rented
                      }
                    });
                  } else {
                    throw new Error(`Insufficient stock for accessory: ${product.productId}`);
                  }
                }
              }
            }
            
            // Continue with rental creation for each rental
            for (const rental of rentalRecords) {
              // Create notification for rental expiration if end date is set
              if (rental.endDate && rental.patientId && rental.patient) {
                try {
                  await createRentalExpirationNotification(
                    rental.id,
                    rental.medicalDevice.name,
                    rental.patientId,
                    `${rental.patient.firstName} ${rental.patient.lastName}`,
                    rental.endDate,
                    rental.patient.assignedTo?.id || rental.patientId
                  );
                } catch (notificationError) {
                  console.error('Failed to create rental expiration notification:', notificationError);
                }
              }
            }
            
            // Create rental periods for enhanced tracking
            const rentalPeriodRecords = [];
            if (paymentPeriods && Array.isArray(paymentPeriods) && paymentPeriods.length > 0 && rentalRecords.length > 0) {
              for (const period of paymentPeriods) {
                // Find corresponding payment and CNAM bond
                const correspondingPayment = paymentRecords.find((p: any) => 
                  p.periodId === period.id
                );
                const correspondingCnamBond = cnamBondRecords.find((b) => 
                  b.bondNumber === period.cnamBondNumber
                );
                
                const rentalPeriod = await tx.rentalPeriod.create({
                  data: {
                    rentalId: rentalRecords[0].id, // Link to first rental for now
                    startDate: new Date(period.startDate),
                    endDate: new Date(period.endDate),
                    amount: period.amount,
                    paymentMethod: period.paymentMethod || 'CASH',
                    isGapPeriod: period.isGapPeriod || false,
                    gapReason: period.gapReason || null,
                    notes: period.notes || null,
                    paymentId: correspondingPayment?.id || null,
                    cnamBondId: correspondingCnamBond?.id || null,
                  }
                });
                rentalPeriodRecords.push(rentalPeriod);
                
                // Create payment due notification if payment is pending and not CNAM
                if (correspondingPayment && correspondingPayment.status === 'PENDING' && period.paymentMethod !== 'CNAM') {
                  const rental = rentalRecords[0];
                  if (rental.patientId && rental.patient) {
                    try {
                      await createPaymentDueNotification(
                        rental.patientId,
                        `${rental.patient.firstName} ${rental.patient.lastName}`,
                        period.amount,
                        new Date(period.startDate),
                        rental.patient.assignedTo?.id || rental.patientId,
                        correspondingPayment.id
                      );
                    } catch (notificationError) {
                      console.error('Failed to create payment due notification:', notificationError);
                    }
                  }
                }
              }
            }

            // Update CNAM bonds with rental references
            for (const bond of cnamBondRecords) {
              if (rentalRecords.length > 0) {
                await tx.cNAMBondRental.update({
                  where: { id: bond.id },
                  data: { rentalId: rentalRecords[0].id }
                });
              }
            }
            
            return {
              rentals: rentalRecords,
              accessories: accessoryRecords, // New: properly tracked accessories
              paymentRecords: paymentRecords,
              depositRecord: depositRecord,
              legacyPayment: legacyPaymentRecord,
              cnamBondRecords: cnamBondRecords,
              rentalPeriodRecords: rentalPeriodRecords,
              enhancedData: {
                paymentPeriods,
                cnamBonds,
                identifiedGaps,
                paymentGaps,
                totalPaymentAmount,
                cnamEligible,
                isEnhancedRental: true,
                hasStockReduction: accessoryRecords.length > 0 // Track if stock was reduced
              }
            };
          });
          
          return res.status(201).json({
            success: true,
            message: 'Enhanced rental created successfully',
            data: result,
            summary: {
              totalRentals: result.rentals.length,
              totalAccessories: result.accessories.length, // Updated to use proper accessor records
              totalProducts: products.length,
              totalPaymentPeriods: result.paymentRecords.length,
              totalCnamBonds: result.cnamBondRecords.length,
              totalRentalPeriods: result.rentalPeriodRecords.length,
              hasDeposit: !!result.depositRecord,
              hasStockReduction: result.enhancedData.hasStockReduction,
              totalAmount: totalPaymentAmount || totalPrice,
              cnamEligible: cnamEligible || false,
              urgentRental: urgentRental || false,
              isOpenEnded: isGlobalOpenEnded || false
            }
          });
          
        } catch (error) {
          console.error('Error creating rental:', error);
          const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
          const errorStack = error instanceof Error ? error.stack : '';
          console.error('Error details:', { message: errorMessage, stack: errorStack });
          return res.status(500).json({ 
            error: 'Failed to create rental', 
            message: errorMessage,
            details: process.env.NODE_ENV === 'development' ? errorStack : undefined
          });
        }

      default:
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
