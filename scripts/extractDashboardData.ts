import * as fs from 'fs';
import { CNAMStatus, CNAMBondType, NotificationType, NotificationStatus } from '@prisma/client';

const DASHBOARD_INPUT_FILE = './public/excell/json-data/dashboard.json';
const RENTALS_CLEANED_FILE = './public/excell/json-data/rentals-cleaned.json';
const PATIENTS_CLEANED_FILE = './public/excell/json-data/patients-cleaned.json';

const CNAM_BONDS_OUTPUT_FILE = './public/excell/json-data/cnam-bonds-cleaned.json';
const NOTIFICATIONS_OUTPUT_FILE = './public/excell/json-data/notifications-cleaned.json';
const CNAM_STEP_HISTORY_OUTPUT_FILE = './public/excell/json-data/cnam-step-history-cleaned.json';
const RENTALS_UPDATED_FILE = './public/excell/json-data/rentals-updated.json';

interface RawDashboard {
  "TABLEAU DE BORD - Gestion des Locations d'Appareils Respiratoires": string;
  "__EMPTY": string; // Patient
  "__EMPTY_1": string; // Tel1
  "__EMPTY_2": string; // Tel2
  "__EMPTY_3": string; // Address
  "__EMPTY_4": string; // Insurance
  "__EMPTY_5": string; // Doctor
  "__EMPTY_6": string; // Technician
  "__EMPTY_7": string; // Supervisor
  "__EMPTY_8": string; // Device
  "__EMPTY_9": string; // Installation Date
  "__EMPTY_10": string; // Last Payment Start
  "__EMPTY_11": string; // Last Payment End
  "__EMPTY_12": string; // Payment Type
  "__EMPTY_13": string; // Amount
  "__EMPTY_14": string; // Reminder Date
  "__EMPTY_15": string; // Days since payment end
  "__EMPTY_16": string; // Current Stock
  "__EMPTY_17": string; // Location Status
  "__EMPTY_18": string; // CNAM Dossier Submitted
  "__EMPTY_19": string; // CNAM Deposit Date
  "__EMPTY_20": string; // Days Late CNAM
  "__EMPTY_21": string; // Notes
  [key: string]: any;
}

interface CleanedRental {
  id: string;
  patientId: string;
  medicalDeviceId: string;
  notes: string | null;
  [key: string]: any;
}

interface CleanedPatient {
  id: string;
  fullName: string;
}

interface CleanedCNAMBond {
  id: string;
  bondNumber: string | null;
  bondType: CNAMBondType;
  status: CNAMStatus;
  dossierNumber: string | null;
  submissionDate: string | null;
  approvalDate: string | null;
  startDate: string | null;
  endDate: string | null;
  monthlyAmount: number | null;
  totalAmount: number | null;
  renewalReminderDays: number;
  notes: string | null;
  rentalId: string;
  patientId: string;
  createdAt: string;
  updatedAt: string;
}

interface CleanedNotification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  status: NotificationStatus;
  dueDate: string | null;
  patientId: string | null;
  rentalId: string | null;
  createdAt: string;
  updatedAt: string;
}

interface CleanedCNAMStepHistory {
  id: string;
  bondId: string;
  fromStep: number | null;
  toStep: number;
  fromStatus: CNAMStatus | null;
  toStatus: CNAMStatus;
  notes: string | null;
  changeDate: string;
  createdAt: string;
}

function parseDate(dateStr: string | null): string | null {
  if (!dateStr || dateStr === 'null' || dateStr === '' || dateStr === '-') return null;
  
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

function determineCNAMBondType(deviceType: string): CNAMBondType {
  if (!deviceType) return 'AUTRE';
  
  const upperDevice = deviceType.toUpperCase();
  
  if (upperDevice.includes('VNI')) return 'VNI';
  if (upperDevice.includes('CPAP')) return 'CPAP';
  if (upperDevice.includes('CONCENTRATEUR') || upperDevice.includes('O2') || upperDevice.includes('OXYGEN')) {
    return 'CONCENTRATEUR_OXYGENE';
  }
  if (upperDevice.includes('MASQUE')) return 'MASQUE';
  
  return 'AUTRE';
}

function determineCNAMStatus(dossierSubmitted: string | null, daysLate: string | null): CNAMStatus {
  if (!dossierSubmitted || dossierSubmitted === '' || dossierSubmitted === '-') {
    return 'EN_ATTENTE_APPROBATION';
  }
  
  const daysLateNum = parseInt(daysLate || '0');
  
  // If dossier is submitted
  if (dossierSubmitted.toLowerCase().includes('oui') || dossierSubmitted.toLowerCase().includes('yes')) {
    if (daysLateNum > 30) {
      return 'EN_COURS'; // Long processing
    } else {
      return 'APPROUVE'; // Likely approved
    }
  }
  
  return 'EN_ATTENTE_APPROBATION';
}

function calculatePaymentStatus(daysSincePayment: string | null): NotificationStatus {
  if (!daysSincePayment) return 'PENDING';
  
  const days = parseInt(daysSincePayment);
  if (isNaN(days)) return 'PENDING';
  
  if (days === 0) return 'COMPLETED';
  if (days > 7) return 'PENDING'; // Needs attention
  
  return 'READ';
}

function generateCNAMBondId(rentalId: string): string {
  return `CNAM-${rentalId.replace('LOC', 'BND')}`;
}

function generateNotificationId(rentalId: string, type: string): string {
  return `NOTIF-${rentalId.replace('LOC', '')}-${type}`;
}

function generateStepHistoryId(bondId: string, step: number): string {
  return `STEP-${bondId.replace('CNAM-', '')}-${step}`;
}

async function extractDashboardData() {
  try {
    console.log('📖 Reading dashboard and related data...');
    const rawDashboard: RawDashboard[] = JSON.parse(fs.readFileSync(DASHBOARD_INPUT_FILE, 'utf-8'));
    const cleanedRentals: CleanedRental[] = JSON.parse(fs.readFileSync(RENTALS_CLEANED_FILE, 'utf-8'));
    const cleanedPatients: CleanedPatient[] = JSON.parse(fs.readFileSync(PATIENTS_CLEANED_FILE, 'utf-8'));
    
    // Create lookup maps
    const rentalMap = new Map(cleanedRentals.map(r => [r.id, r]));
    const patientMap = new Map(cleanedPatients.map(p => [p.id, p]));
    
    console.log(`Found ${rawDashboard.length} dashboard records`);
    
    // Filter valid dashboard records (skip headers and empty rows)
    const validDashboard = rawDashboard.filter(record => {
      const locationId = record["TABLEAU DE BORD - Gestion des Locations d'Appareils Respiratoires"];
      return locationId && 
             locationId.startsWith('LOC') && 
             !locationId.includes('Location ID') &&
             !locationId.includes('GUIDE');
    });
    
    console.log(`Processing ${validDashboard.length} valid dashboard records`);
    
    const cnamBonds: CleanedCNAMBond[] = [];
    const notifications: CleanedNotification[] = [];
    const stepHistory: CleanedCNAMStepHistory[] = [];
    const updatedRentals: CleanedRental[] = [...cleanedRentals]; // Copy existing rentals
    
    console.log('🔄 Processing dashboard data...');
    
    for (const record of validDashboard) {
      const locationId = record["TABLEAU DE BORD - Gestion des Locations d'Appareils Respiratoires"];
      
      if (!rentalMap.has(locationId)) {
        console.warn(`⚠️  Rental ${locationId} not found in cleaned data`);
        continue;
      }
      
      const rental = rentalMap.get(locationId)!;
      const patient = patientMap.get(rental.patientId);
      
      if (!patient) {
        console.warn(`⚠️  Patient ${rental.patientId} not found`);
        continue;
      }
      
      // Extract data
      const deviceType = record["__EMPTY_8"]; // Device
      const paymentType = record["__EMPTY_12"]; // Payment Type
      const amount = parseFloat(record["__EMPTY_13"]) || 0;
      const reminderDate = record["__EMPTY_14"]; // Reminder Date
      const daysSincePayment = record["__EMPTY_15"]; // Days since payment end
      const cnamDossierSubmitted = record["__EMPTY_18"]; // CNAM Dossier
      const cnamDepositDate = record["__EMPTY_19"]; // CNAM Deposit Date
      const cnamDaysLate = record["__EMPTY_20"]; // Days Late CNAM
      const dashboardNotes = record["__EMPTY_21"]; // Notes
      
      // 1. Create CNAM Bond if CNAM payment type
      if (paymentType && paymentType.toUpperCase().includes('CNAM')) {
        const bondId = generateCNAMBondId(locationId);
        const bondType = determineCNAMBondType(deviceType);
        const status = determineCNAMStatus(cnamDossierSubmitted, cnamDaysLate);
        const submissionDate = parseDate(cnamDepositDate);
        
        const cnamBond: CleanedCNAMBond = {
          id: bondId,
          bondNumber: cnamDossierSubmitted && cnamDossierSubmitted !== '-' ? `BND-${locationId.replace('LOC', '')}` : null,
          bondType,
          status,
          dossierNumber: cnamDossierSubmitted && cnamDossierSubmitted !== '-' ? `DOS-${locationId.replace('LOC', '')}` : null,
          submissionDate,
          approvalDate: status === 'APPROUVE' ? submissionDate : null,
          startDate: submissionDate,
          endDate: null,
          monthlyAmount: amount > 0 ? amount : null,
          totalAmount: null,
          renewalReminderDays: 30,
          notes: dashboardNotes || null,
          rentalId: locationId,
          patientId: rental.patientId,
          createdAt: submissionDate || new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        cnamBonds.push(cnamBond);
        
        // Create CNAM step history
        const stepHistoryRecord: CleanedCNAMStepHistory = {
          id: generateStepHistoryId(bondId, 1),
          bondId,
          fromStep: null,
          toStep: 1,
          fromStatus: null,
          toStatus: status,
          notes: `Initial status: ${cnamDossierSubmitted || 'Pending submission'}`,
          changeDate: submissionDate || new Date().toISOString(),
          createdAt: new Date().toISOString()
        };
        
        stepHistory.push(stepHistoryRecord);
      }
      
      // 2. Create Payment Reminder Notification
      if (reminderDate && reminderDate !== '-') {
        const dueDate = parseDate(reminderDate);
        const paymentStatus = calculatePaymentStatus(daysSincePayment);
        
        const notification: CleanedNotification = {
          id: generateNotificationId(locationId, 'PAYMENT'),
          title: `Payment Reminder - ${patient.fullName}`,
          message: `Payment due for rental ${locationId}. ${daysSincePayment ? `${daysSincePayment} days since last payment.` : ''}`,
          type: 'PAYMENT_DUE',
          status: paymentStatus,
          dueDate,
          patientId: rental.patientId,
          rentalId: locationId,
          createdAt: dueDate || new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        notifications.push(notification);
      }
      
      // 3. Create CNAM Follow-up Notification if days late
      if (cnamDaysLate && parseInt(cnamDaysLate) > 0) {
        const daysLate = parseInt(cnamDaysLate);
        
        const cnamNotification: CleanedNotification = {
          id: generateNotificationId(locationId, 'CNAM'),
          title: `CNAM Dossier Follow-up - ${patient.fullName}`,
          message: `CNAM dossier submission is ${daysLate} days late for rental ${locationId}`,
          type: 'FOLLOW_UP',
          status: 'PENDING',
          dueDate: new Date().toISOString(),
          patientId: rental.patientId,
          rentalId: locationId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        notifications.push(cnamNotification);
      }
      
      // 4. Update rental notes with dashboard info
      const rentalIndex = updatedRentals.findIndex(r => r.id === locationId);
      if (rentalIndex !== -1 && dashboardNotes && dashboardNotes !== '-') {
        const existingNotes = updatedRentals[rentalIndex].notes;
        const combinedNotes = existingNotes ? 
          `${existingNotes}\n\nDashboard: ${dashboardNotes}` : 
          dashboardNotes;
        
        updatedRentals[rentalIndex] = {
          ...updatedRentals[rentalIndex],
          notes: combinedNotes,
          updatedAt: new Date().toISOString()
        };
      }
    }
    
    // Sort data
    cnamBonds.sort((a, b) => a.rentalId.localeCompare(b.rentalId));
    notifications.sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || ''));
    stepHistory.sort((a, b) => a.bondId.localeCompare(b.bondId));
    
    // Save data
    console.log('💾 Saving extracted data...');
    fs.writeFileSync(CNAM_BONDS_OUTPUT_FILE, JSON.stringify(cnamBonds, null, 2), 'utf-8');
    fs.writeFileSync(NOTIFICATIONS_OUTPUT_FILE, JSON.stringify(notifications, null, 2), 'utf-8');
    fs.writeFileSync(CNAM_STEP_HISTORY_OUTPUT_FILE, JSON.stringify(stepHistory, null, 2), 'utf-8');
    fs.writeFileSync(RENTALS_UPDATED_FILE, JSON.stringify(updatedRentals, null, 2), 'utf-8');
    
    // Generate statistics
    const stats = {
      cnamBonds: {
        total: cnamBonds.length,
        byStatus: {
          pending: cnamBonds.filter(b => b.status === 'EN_ATTENTE_APPROBATION').length,
          approved: cnamBonds.filter(b => b.status === 'APPROUVE').length,
          inProgress: cnamBonds.filter(b => b.status === 'EN_COURS').length
        },
        byType: {
          vni: cnamBonds.filter(b => b.bondType === 'VNI').length,
          cpap: cnamBonds.filter(b => b.bondType === 'CPAP').length,
          oxygen: cnamBonds.filter(b => b.bondType === 'CONCENTRATEUR_OXYGENE').length,
          other: cnamBonds.filter(b => b.bondType === 'AUTRE').length
        }
      },
      notifications: {
        total: notifications.length,
        byType: {
          payment: notifications.filter(n => n.type === 'PAYMENT_DUE').length,
          followUp: notifications.filter(n => n.type === 'FOLLOW_UP').length
        },
        byStatus: {
          pending: notifications.filter(n => n.status === 'PENDING').length,
          completed: notifications.filter(n => n.status === 'COMPLETED').length,
          read: notifications.filter(n => n.status === 'READ').length
        }
      },
      stepHistory: stepHistory.length,
      updatedRentals: updatedRentals.filter(r => r.notes && r.notes.includes('Dashboard')).length
    };
    
    console.log('\n📊 Extraction Statistics:');
    console.log(`  CNAM Bonds: ${stats.cnamBonds.total}`);
    console.log(`    - Pending: ${stats.cnamBonds.byStatus.pending}`);
    console.log(`    - Approved: ${stats.cnamBonds.byStatus.approved}`);
    console.log(`    - In Progress: ${stats.cnamBonds.byStatus.inProgress}`);
    console.log(`    - VNI: ${stats.cnamBonds.byType.vni}, O2: ${stats.cnamBonds.byType.oxygen}, CPAP: ${stats.cnamBonds.byType.cpap}`);
    console.log(`  Notifications: ${stats.notifications.total}`);
    console.log(`    - Payment Due: ${stats.notifications.byType.payment}`);
    console.log(`    - Follow-up: ${stats.notifications.byType.followUp}`);
    console.log(`    - Pending: ${stats.notifications.byStatus.pending}`);
    console.log(`  CNAM Step History: ${stats.stepHistory}`);
    console.log(`  Updated Rentals: ${stats.updatedRentals}`);
    
    console.log('\n✅ Dashboard data extraction complete!');
    console.log('📁 Files created:');
    console.log(`   - ${CNAM_BONDS_OUTPUT_FILE}`);
    console.log(`   - ${NOTIFICATIONS_OUTPUT_FILE}`);
    console.log(`   - ${CNAM_STEP_HISTORY_OUTPUT_FILE}`);
    console.log(`   - ${RENTALS_UPDATED_FILE}`);
    
    // Show samples
    console.log('\n📋 Sample CNAM Bond:');
    if (cnamBonds.length > 0) {
      console.log(JSON.stringify(cnamBonds[0], null, 2));
    }
    
    console.log('\n📋 Sample Notification:');
    if (notifications.length > 0) {
      console.log(JSON.stringify(notifications[0], null, 2));
    }
    
    return {
      cnamBonds,
      notifications,
      stepHistory,
      updatedRentals
    };
    
  } catch (error) {
    console.error('❌ Error extracting dashboard data:', error);
    throw error;
  }
}

if (require.main === module) {
  extractDashboardData()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { extractDashboardData };