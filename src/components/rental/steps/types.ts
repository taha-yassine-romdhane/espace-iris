export interface RentalPaymentPeriod {
  id: string;
  productIds: string[];
  startDate: Date;
  endDate: Date;
  amount: number;
  paymentMethod: 'CASH' | 'CHEQUE' | 'CNAM' | 'VIREMENT' | 'TRAITE';
  notes?: string;
  isGapPeriod: boolean;
  gapReason?: 'CNAM_PENDING' | 'CNAM_EXPIRED' | 'PATIENT_PAUSE' | 'MAINTENANCE' | 'OTHER';
}

export interface CNAMBondLocation {
  id: string;
  bondNumber: string;
  bondType: 'MASQUE' | 'CPAP' | 'CONCENTRATEUR_OXYGENE' | 'VNI' | 'AUTRE';
  productIds: string[];
  status: 'EN_ATTENTE_APPROBATION' | 'APPROUVE' | 'EN_COURS' | 'TERMINE' | 'REFUSE';
  dossierNumber?: string;
  submissionDate?: Date;
  approvalDate?: Date;
  startDate?: Date;
  endDate?: Date;
  monthlyAmount: number;
  coveredMonths: number;
  totalAmount: number;
  renewalReminderDays: number;
  notes?: string;
}

export interface RentalTimeline {
  type: 'rental_start' | 'cnam_submission' | 'cnam_approval' | 'payment' | 'gap' | 'cnam_expiry' | 'renewal_reminder';
  date: Date;
  description: string;
  severity?: 'info' | 'warning' | 'error';
  relatedId?: string;
}

export interface ExistingRentalData {
  isExistingRental: boolean;
  importDate?: Date;
  hasActiveCnam?: boolean;
  cnamExpirationDate?: Date;
  cnamMonthlyAmount?: number;
  currentUnpaidAmount?: number;
}

export interface RentalPaymentStepProps {
  selectedProducts: any[];
  selectedClient: any;
  rentalDetails: any;
  calculateTotal: () => number;
  onBack: () => void;
  onComplete: (paymentData: any) => void;
  isSubmitting?: boolean;
  existingPaymentData?: any; // Add this to preserve data when navigating back
  existingRentalData?: ExistingRentalData; // Add existing rental import data
}

export interface CNAMBondType {
  value: string;
  label: string;
}

export interface CNAMStatus {
  value: string;
  label: string;
  color: string;
}

export interface GapReason {
  value: string;
  label: string;
}

export interface PredefinedBond {
  id: string;
  bondType: string;
  label: string;
  coveredMonths: number;
  totalAmount: number;
}

export interface RentalGap {
  type: string;
  title: string;
  description: string;
  startDate?: Date;
  endDate?: Date;
  date?: Date;
  duration: number;
  amount?: number;
  severity: 'high' | 'medium' | 'low';
  bondId?: string;
  bondRef?: string;
}

export interface RentalAlert {
  daysUntil: number;
  message: string;
  priority: 'high' | 'medium' | 'low';
  action: string;
  bondId?: string;
}

export interface PaymentData {
  paymentPeriods: RentalPaymentPeriod[];
  cnamBonds: CNAMBondLocation[];
  depositAmount: number;
  depositMethod: string;
  totalAmount: number;
  notes: string;
  gaps: RentalGap[];
  upcomingAlerts: RentalAlert[];
  patientStatus: 'ACTIVE' | 'HOSPITALIZED' | 'DECEASED' | 'PAUSED';
  cnamEligible: boolean;
  autoCalculatedGaps: boolean;
  isRental: boolean;
}