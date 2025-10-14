import * as fs from 'fs';
import { RentalStatus, PaymentMethod } from '@prisma/client';

const RENTALS_INPUT_FILE = './public/excell/json-data/rentals.json';
const PAYMENTS_INPUT_FILE = './public/excell/json-data/rental-payments.json';
const PATIENTS_CLEANED_FILE = './public/excell/json-data/patients-cleaned.json';
const DEVICES_CLEANED_FILE = './public/excell/json-data/devices-cleaned.json';
const RENTALS_OUTPUT_FILE = './public/excell/json-data/rentals-cleaned.json';
const PAYMENTS_OUTPUT_FILE = './public/excell/json-data/payments-cleaned.json';
const RENTAL_PERIODS_OUTPUT_FILE = './public/excell/json-data/rental-periods-cleaned.json';

interface RawRental {
  "LocationID": string;
  "PatientID": string;
  "AppareilID": string;
  "DateDébut Installation": string;
  "DateFin": string | null;
  "Technicien": string;
  "Superviseur": string;
  "MontantMensuel": string;
  "StatutLocation": string;
  "DateCréation": string;
  "Notes": string | null;
}

interface RawPayment {
  "PaiementID": string;
  "LocationID": string;
  "PériodeNum": string;
  "DateDébut  DDP": string;
  "DateFin DFP": string;
  "Montant": string;
  "TypePaiement": string;
  "Gap": string;
  "NOTE": string | null;
  [key: string]: any;
}

interface CleanedPatient {
  id: string;
  fullName: string;
}

interface CleanedDevice {
  id: string;
  type: string;
}

interface CleanedRental {
  id: string;
  rentalCode: string;
  medicalDeviceId: string;
  patientId: string;
  patientName?: string;
  deviceType?: string;
  startDate: string;
  endDate: string | null;
  status: RentalStatus;
  technicianName: string;
  supervisorName: string;
  monthlyAmount: number;
  totalAmount: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  configuration?: {
    isGlobalOpenEnded: boolean;
    urgentRental: boolean;
    cnamEligible: boolean;
    depositAmount: number | null;
    depositMethod: PaymentMethod | null;
    totalPaymentAmount: number | null;
  };
}

interface CleanedRentalPeriod {
  id: string;
  rentalId: string;
  periodNumber: number;
  startDate: string;
  endDate: string;
  amount: number;
  paymentMethod: PaymentMethod;
  isGapPeriod: boolean;
  gapAmount: number;
  gapReason: string | null;
  notes: string | null;
  paymentStatus: 'PAID' | 'PENDING' | 'OVERDUE';
  createdAt: string;
  updatedAt: string;
}

function parseDate(dateStr: string | null): string | null {
  if (!dateStr || dateStr === 'null' || dateStr === '') return null;
  
  try {
    // Handle various date formats
    const patterns = [
      /(\d{1,2})\/(\d{1,2})\/(\d{2,4})/,  // MM/DD/YY or MM/DD/YYYY
      /(\d{1,2})-(\d{1,2})-(\d{2,4})/,     // MM-DD-YY or MM-DD-YYYY
      /(\d{4})-(\d{1,2})-(\d{1,2})/,       // YYYY-MM-DD
    ];
    
    for (const pattern of patterns) {
      const match = dateStr.match(pattern);
      if (match) {
        let year, month, day;
        
        if (match[0].includes('/')) {
          month = parseInt(match[1]);
          day = parseInt(match[2]);
          year = parseInt(match[3]);
          
          // Handle 2-digit years
          if (year < 100) {
            year = year > 50 ? 1900 + year : 2000 + year;
          }
        } else if (match[3] && match[3].length === 4) {
          year = parseInt(match[1]);
          month = parseInt(match[2]);
          day = parseInt(match[3]);
        }
        
        if (year && month && day) {
          // Create date and format as ISO
          const date = new Date(year, month - 1, day);
          return date.toISOString();
        }
      }
    }
  } catch (error) {
    console.warn(`Failed to parse date: ${dateStr}`);
  }
  
  return null;
}

function normalizeRentalStatus(status: string | null, endDate: string | null): RentalStatus {
  if (!status) return endDate ? 'COMPLETED' : 'ACTIVE';
  
  const upperStatus = status.toUpperCase();
  
  if (upperStatus.includes('ACTIF') || upperStatus.includes('ACTIVE')) {
    return 'ACTIVE';
  }
  if (upperStatus.includes('TERMINÉ') || upperStatus.includes('COMPLETED') || upperStatus.includes('TERMINEE')) {
    return 'COMPLETED';
  }
  if (upperStatus.includes('ANNULÉ') || upperStatus.includes('CANCELLED')) {
    return 'CANCELLED';
  }
  if (upperStatus.includes('SUSPENDU') || upperStatus.includes('PAUSED')) {
    return 'PAUSED';
  }
  if (upperStatus.includes('EXPIRÉ') || upperStatus.includes('EXPIRED')) {
    return 'EXPIRED';
  }
  
  return endDate ? 'COMPLETED' : 'ACTIVE';
}

function normalizePaymentMethod(method: string | null): PaymentMethod {
  if (!method) return 'CASH';
  
  const upperMethod = method.toUpperCase();
  
  if (upperMethod.includes('CNAM')) return 'CNAM';
  if (upperMethod.includes('CHEQUE') || upperMethod.includes('CHÈQUE')) return 'CHEQUE';
  if (upperMethod.includes('CASH') || upperMethod.includes('ESPECE')) return 'CASH';
  if (upperMethod.includes('TRAITE')) return 'TRAITE';
  if (upperMethod.includes('MANDAT')) return 'MANDAT';
  if (upperMethod.includes('VIREMENT') || upperMethod.includes('TRANSFER')) return 'VIREMENT';
  if (upperMethod.includes('BANK')) return 'BANK_TRANSFER';
  
  return 'CASH';
}

function calculateMonthsBetween(startDate: string | null, endDate: string | null): number {
  if (!startDate) return 0;
  
  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : new Date();
  
  const months = (end.getFullYear() - start.getFullYear()) * 12 + 
                 (end.getMonth() - start.getMonth());
  
  return Math.max(1, months);
}

function determinePaymentStatus(endDate: string, periodNum: number): 'PAID' | 'PENDING' | 'OVERDUE' {
  const periodEnd = new Date(endDate);
  const now = new Date();
  const daysDiff = Math.floor((now.getTime() - periodEnd.getTime()) / (1000 * 60 * 60 * 24));
  
  // If period is in the future, it's pending
  if (periodEnd > now) {
    return 'PENDING';
  }
  
  // If period ended more than 30 days ago, likely paid
  if (daysDiff > 30) {
    return 'PAID';
  }
  
  // Recent periods might be overdue
  return daysDiff > 7 ? 'OVERDUE' : 'PENDING';
}

async function cleanRentalsAndPayments() {
  try {
    console.log('📖 Reading raw data files...');
    const rawRentals: RawRental[] = JSON.parse(fs.readFileSync(RENTALS_INPUT_FILE, 'utf-8'));
    const rawPayments: RawPayment[] = JSON.parse(fs.readFileSync(PAYMENTS_INPUT_FILE, 'utf-8'));
    const cleanedPatients: CleanedPatient[] = JSON.parse(fs.readFileSync(PATIENTS_CLEANED_FILE, 'utf-8'));
    const cleanedDevices: CleanedDevice[] = JSON.parse(fs.readFileSync(DEVICES_CLEANED_FILE, 'utf-8'));
    
    // Create lookup maps
    const patientMap = new Map(cleanedPatients.map(p => [p.id, p]));
    const deviceMap = new Map(cleanedDevices.map(d => [d.id, d]));
    
    console.log(`Found ${rawRentals.length} rentals and ${rawPayments.length} payments`);
    
    // Filter valid rentals
    const validRentals = rawRentals.filter(rental => {
      return rental["LocationID"] && rental["PatientID"] && rental["AppareilID"];
    });
    
    console.log(`Processing ${validRentals.length} valid rentals`);
    
    // Clean rentals
    console.log('🧹 Cleaning rental data...');
    const cleanedRentals: CleanedRental[] = [];
    const rentalIdMap = new Map<string, string>();
    
    for (const rental of validRentals) {
      const startDate = parseDate(rental["DateDébut Installation"]);
      const endDate = parseDate(rental["DateFin"]);
      const monthlyAmount = parseFloat(rental["MontantMensuel"]) || 0;
      const months = calculateMonthsBetween(startDate, endDate);
      const totalAmount = monthlyAmount * months;
      
      // Validate patient and device IDs exist
      const patientExists = patientMap.has(rental["PatientID"]);
      const deviceExists = deviceMap.has(rental["AppareilID"]);
      
      if (!patientExists) {
        console.warn(`⚠️  Patient ${rental["PatientID"]} not found for rental ${rental["LocationID"]}`);
        continue;
      }
      
      if (!deviceExists) {
        console.warn(`⚠️  Device ${rental["AppareilID"]} not found for rental ${rental["LocationID"]}`);
        continue;
      }
      
      const patient = patientMap.get(rental["PatientID"]);
      const device = deviceMap.get(rental["AppareilID"]);
      
      // Determine CNAM eligibility based on payment data
      const rentalPayments = rawPayments.filter(p => p["LocationID"] === rental["LocationID"]);
      const hasCnamPayment = rentalPayments.some(p => p["TypePaiement"]?.toUpperCase().includes('CNAM'));
      
      const cleanedRental: CleanedRental = {
        id: rental["LocationID"],
        rentalCode: `RNT-${rental["LocationID"].replace('LOC', '')}`,
        medicalDeviceId: rental["AppareilID"],
        patientId: rental["PatientID"],
        patientName: patient?.fullName,
        deviceType: device?.type,
        startDate: startDate || new Date().toISOString(),
        endDate: endDate,
        status: normalizeRentalStatus(rental["StatutLocation"], endDate),
        technicianName: rental["Technicien"] || '',
        supervisorName: rental["Superviseur"] || '',
        monthlyAmount,
        totalAmount,
        notes: rental["Notes"],
        createdAt: parseDate(rental["DateCréation"]) || startDate || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        configuration: {
          isGlobalOpenEnded: !endDate,
          urgentRental: false,
          cnamEligible: hasCnamPayment,
          depositAmount: null,
          depositMethod: null,
          totalPaymentAmount: totalAmount
        }
      };
      
      cleanedRentals.push(cleanedRental);
      rentalIdMap.set(rental["LocationID"], cleanedRental.id);
    }
    
    // Clean payments and create rental periods
    console.log('💳 Cleaning payment data and creating rental periods...');
    const cleanedRentalPeriods: CleanedRentalPeriod[] = [];
    const paymentsByRental = new Map<string, CleanedRentalPeriod[]>();
    
    for (const payment of rawPayments) {
      if (!payment["LocationID"] || !rentalIdMap.has(payment["LocationID"])) {
        continue;
      }
      
      const rentalId = rentalIdMap.get(payment["LocationID"])!;
      const startDate = parseDate(payment["DateDébut  DDP"]);
      const endDate = parseDate(payment["DateFin DFP"]);
      const amount = parseFloat(payment["Montant"]) || 0;
      const gap = parseFloat(payment["Gap"]) || 0;
      const periodNum = parseInt(payment["PériodeNum"]) || 1;
      
      const cleanedPeriod: CleanedRentalPeriod = {
        id: payment["PaiementID"],
        rentalId,
        periodNumber: periodNum,
        startDate: startDate || new Date().toISOString(),
        endDate: endDate || new Date().toISOString(),
        amount,
        paymentMethod: normalizePaymentMethod(payment["TypePaiement"]),
        isGapPeriod: gap > 0,
        gapAmount: gap,
        gapReason: gap > 0 ? 'Payment adjustment' : null,
        notes: payment["NOTE"],
        paymentStatus: determinePaymentStatus(endDate || new Date().toISOString(), periodNum),
        createdAt: startDate || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      cleanedRentalPeriods.push(cleanedPeriod);
      
      if (!paymentsByRental.has(rentalId)) {
        paymentsByRental.set(rentalId, []);
      }
      paymentsByRental.get(rentalId)!.push(cleanedPeriod);
    }
    
    // Sort by rental ID and period number
    cleanedRentals.sort((a, b) => a.id.localeCompare(b.id));
    cleanedRentalPeriods.sort((a, b) => {
      const rentalCompare = a.rentalId.localeCompare(b.rentalId);
      return rentalCompare !== 0 ? rentalCompare : a.periodNumber - b.periodNumber;
    });
    
    // Save cleaned data
    console.log('💾 Saving cleaned data...');
    fs.writeFileSync(RENTALS_OUTPUT_FILE, JSON.stringify(cleanedRentals, null, 2), 'utf-8');
    fs.writeFileSync(RENTAL_PERIODS_OUTPUT_FILE, JSON.stringify(cleanedRentalPeriods, null, 2), 'utf-8');
    
    // Generate statistics
    const stats = {
      rentals: {
        total: cleanedRentals.length,
        active: cleanedRentals.filter(r => r.status === 'ACTIVE').length,
        completed: cleanedRentals.filter(r => r.status === 'COMPLETED').length,
        withCnam: cleanedRentals.filter(r => r.configuration?.cnamEligible).length,
        openEnded: cleanedRentals.filter(r => !r.endDate).length
      },
      periods: {
        total: cleanedRentalPeriods.length,
        paid: cleanedRentalPeriods.filter(p => p.paymentStatus === 'PAID').length,
        pending: cleanedRentalPeriods.filter(p => p.paymentStatus === 'PENDING').length,
        overdue: cleanedRentalPeriods.filter(p => p.paymentStatus === 'OVERDUE').length,
        withGaps: cleanedRentalPeriods.filter(p => p.isGapPeriod).length,
        byCnam: cleanedRentalPeriods.filter(p => p.paymentMethod === 'CNAM').length
      },
      totalRevenue: cleanedRentals.reduce((sum, r) => sum + r.totalAmount, 0),
      averageMonthlyAmount: cleanedRentals.reduce((sum, r) => sum + r.monthlyAmount, 0) / cleanedRentals.length
    };
    
    console.log('\n📊 Cleaning Statistics:');
    console.log(`  Rentals: ${stats.rentals.total} total`);
    console.log(`    - Active: ${stats.rentals.active}`);
    console.log(`    - Completed: ${stats.rentals.completed}`);
    console.log(`    - CNAM Eligible: ${stats.rentals.withCnam}`);
    console.log(`    - Open-ended: ${stats.rentals.openEnded}`);
    console.log(`  Payment Periods: ${stats.periods.total} total`);
    console.log(`    - Paid: ${stats.periods.paid}`);
    console.log(`    - Pending: ${stats.periods.pending}`);
    console.log(`    - Overdue: ${stats.periods.overdue}`);
    console.log(`    - With Gaps: ${stats.periods.withGaps}`);
    console.log(`    - CNAM Payments: ${stats.periods.byCnam}`);
    console.log(`  Total Revenue: ${stats.totalRevenue.toFixed(2)} TND`);
    console.log(`  Average Monthly: ${stats.averageMonthlyAmount.toFixed(2)} TND`);
    
    console.log('\n✅ Rental and payment data cleaned successfully!');
    console.log(`📁 Files saved:`);
    console.log(`   - ${RENTALS_OUTPUT_FILE}`);
    console.log(`   - ${RENTAL_PERIODS_OUTPUT_FILE}`);
    
    // Show samples
    console.log('\n📋 Sample cleaned rental:');
    console.log(JSON.stringify(cleanedRentals[0], null, 2));
    
    console.log('\n📋 Sample rental period:');
    console.log(JSON.stringify(cleanedRentalPeriods[0], null, 2));
    
    return { rentals: cleanedRentals, periods: cleanedRentalPeriods };
    
  } catch (error) {
    console.error('❌ Error cleaning rental data:', error);
    throw error;
  }
}

if (require.main === module) {
  cleanRentalsAndPayments()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { cleanRentalsAndPayments };