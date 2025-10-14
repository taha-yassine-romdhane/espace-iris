import { addDays, addMonths, differenceInDays } from "date-fns";
import { RentalPaymentPeriod, CNAMBondLocation, RentalTimeline, RentalGap, RentalAlert, GapReason } from "./types";

// Gap reasons for reference
export const gapReasons: GapReason[] = [
  { value: 'CNAM_PENDING', label: 'CNAM en attente d\'approbation' },
  { value: 'CNAM_EXPIRED', label: 'CNAM expiré/terminé' },
  { value: 'PATIENT_PAUSE', label: 'Pause demandée par le patient' },
  { value: 'MAINTENANCE', label: 'Maintenance de l\'appareil' },
  { value: 'OTHER', label: 'Autre raison' }
];

// Helper function to generate timeline events
export const generateTimeline = (
  rentalDetails: any,
  cnamBonds: CNAMBondLocation[],
  paymentPeriods: RentalPaymentPeriod[]
): RentalTimeline[] => {
  const events: RentalTimeline[] = [];
  
  // Add rental start
  if (rentalDetails?.globalStartDate) {
    events.push({
      type: 'rental_start',
      date: new Date(rentalDetails.globalStartDate),
      description: 'Début de la location',
      severity: 'info'
    });
  }
  
  // Add CNAM submissions and approvals
  cnamBonds.forEach(bond => {
    if (bond.submissionDate) {
      events.push({
        type: 'cnam_submission',
        date: bond.submissionDate,
        description: `Soumission du bond CNAM ${bond.bondNumber || 'en cours'}`,
        severity: 'info',
        relatedId: bond.id
      });
    }
    
    if (bond.approvalDate) {
      events.push({
        type: 'cnam_approval',
        date: bond.approvalDate,
        description: `Approbation du bond CNAM ${bond.bondNumber}`,
        severity: 'info',
        relatedId: bond.id
      });
    }
    
    if (bond.endDate) {
      const daysUntilExpiry = differenceInDays(bond.endDate, new Date());
      if (daysUntilExpiry <= bond.renewalReminderDays) {
        events.push({
          type: 'cnam_expiry',
          date: bond.endDate,
          description: `Expiration du bond CNAM ${bond.bondNumber}`,
          severity: daysUntilExpiry <= 0 ? 'error' : 'warning',
          relatedId: bond.id
        });
      }
    }
  });
  
  // Add payment periods
  paymentPeriods.forEach(period => {
    if (period.isGapPeriod) {
      events.push({
        type: 'gap',
        date: period.startDate,
        description: `Gap: ${gapReasons.find(r => r.value === period.gapReason)?.label || 'Non spécifié'}`,
        severity: 'warning'
      });
    } else {
      events.push({
        type: 'payment',
        date: period.startDate,
        description: `Paiement ${period.paymentMethod} - ${period.amount.toFixed(2)} TND`,
        severity: 'info'
      });
    }
  });
  
  // Sort by date
  return events.sort((a, b) => a.date.getTime() - b.date.getTime());
};

// Comprehensive gap analysis
export const analyzeComprehensiveGaps = (
  rentalDetails: any,
  cnamBonds: CNAMBondLocation[],
  paymentPeriods: RentalPaymentPeriod[],
  calculateTotal: () => number
): RentalGap[] => {
  const gaps: RentalGap[] = [];
  const today = new Date();
  
  // Check for rental start before CNAM approval
  if (rentalDetails?.urgentRental && cnamBonds.length > 0) {
    const firstBond = cnamBonds[0];
    if (firstBond.submissionDate && rentalDetails.globalStartDate) {
      const gapDays = differenceInDays(firstBond.approvalDate || addDays(firstBond.submissionDate, 7), new Date(rentalDetails.globalStartDate));
      if (gapDays > 0) {
        gaps.push({
          type: 'pre_cnam_gap',
          title: 'Gap avant approbation CNAM',
          description: 'Location urgente démarrée avant l\'approbation CNAM',
          startDate: new Date(rentalDetails.globalStartDate),
          endDate: firstBond.approvalDate || addDays(firstBond.submissionDate, 7),
          duration: gapDays,
          amount: calculateTotal() * gapDays, // calculateTotal is already daily
          severity: 'high'
        });
      }
    }
  }
  
  // Check for CNAM expiration gaps
  cnamBonds.forEach(bond => {
    if (bond.endDate && bond.status === 'EN_COURS') {
      const daysUntilExpiry = differenceInDays(bond.endDate, today);
      if (daysUntilExpiry <= bond.renewalReminderDays && daysUntilExpiry > 0) {
        gaps.push({
          type: 'cnam_expiring',
          title: `Bond CNAM expire bientôt`,
          description: `Le bond ${bond.bondNumber} expire dans ${daysUntilExpiry} jours`,
          date: bond.endDate,
          duration: daysUntilExpiry,
          severity: daysUntilExpiry <= 7 ? 'high' : 'medium',
          bondId: bond.id
        });
      }
    }
  });
  
  // Check for payment timeline gaps
  const sortedPeriods = [...paymentPeriods].sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
  for (let i = 0; i < sortedPeriods.length - 1; i++) {
    const currentPeriod = sortedPeriods[i];
    const nextPeriod = sortedPeriods[i + 1];
    
    const gapDays = differenceInDays(nextPeriod.startDate, currentPeriod.endDate);
    if (gapDays > 1) {
      gaps.push({
        type: 'payment_gap',
        title: 'Période non couverte',
        description: `${gapDays} jours sans couverture de paiement`,
        startDate: addDays(currentPeriod.endDate, 1),
        endDate: addDays(nextPeriod.startDate, -1),
        duration: gapDays,
        amount: calculateTotal() * gapDays, // calculateTotal is already daily
        severity: 'medium'
      });
    }
  }
  
  return gaps;
};

// Get upcoming alerts
export const getUpcomingAlerts = (
  rentalDetails: any,
  cnamBonds: CNAMBondLocation[],
  patientStatus: 'ACTIVE' | 'HOSPITALIZED' | 'DECEASED' | 'PAUSED'
): RentalAlert[] => {
  const alerts: RentalAlert[] = [];
  const today = new Date();
  
  // CNAM renewal alerts
  cnamBonds.forEach(bond => {
    if (bond.endDate) {
      const daysUntil = differenceInDays(bond.endDate, today);
      if (daysUntil > 0 && daysUntil <= bond.renewalReminderDays) {
        alerts.push({
          daysUntil,
          message: `Renouveler le bond CNAM ${bond.bondNumber}`,
          priority: daysUntil <= 7 ? 'high' : 'medium',
          action: 'renew_cnam',
          bondId: bond.id
        });
      }
    }
  });
  
  // Device return alerts
  if (rentalDetails?.globalEndDate && !rentalDetails.isGlobalOpenEnded) {
    const daysUntilReturn = differenceInDays(new Date(rentalDetails.globalEndDate), today);
    if (daysUntilReturn > 0 && daysUntilReturn <= 30) {
      alerts.push({
        daysUntil: daysUntilReturn,
        message: 'Préparer le retour des appareils',
        priority: daysUntilReturn <= 7 ? 'high' : 'medium',
        action: 'prepare_return'
      });
    }
  }
  
  // Patient follow-up alerts
  if (patientStatus === 'HOSPITALIZED') {
    alerts.push({
      daysUntil: 0,
      message: 'Suivre l\'état du patient hospitalisé',
      priority: 'high',
      action: 'patient_followup'
    });
  }
  
  return alerts.sort((a, b) => a.daysUntil - b.daysUntil);
};

// Analyze potential gaps
export const analyzePaymentGaps = (paymentPeriods: RentalPaymentPeriod[]) => {
  const gaps = [];
  const sortedPeriods = [...paymentPeriods].sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
  
  for (let i = 0; i < sortedPeriods.length - 1; i++) {
    const currentPeriod = sortedPeriods[i];
    const nextPeriod = sortedPeriods[i + 1];
    
    const gap = differenceInDays(nextPeriod.startDate, currentPeriod.endDate);
    if (gap > 1) {
      gaps.push({
        type: 'timeline_gap',
        startDate: addDays(currentPeriod.endDate, 1),
        endDate: addDays(nextPeriod.startDate, -1),
        days: gap,
        description: `Période non couverte de ${gap} jour${gap > 1 ? 's' : ''}`
      });
    }
  }

  return gaps;
};

// Create payment period for gap
export const createPaymentPeriodForGap = (
  gap: RentalGap,
  selectedProducts: any[],
  paymentPeriods: RentalPaymentPeriod[],
  setPaymentPeriods: (periods: RentalPaymentPeriod[]) => void,
  setActiveTab: (tab: string) => void,
  setActivePaymentPeriod: (periodId: string) => void
) => {
  const newPeriod: RentalPaymentPeriod = {
    id: `gap-payment-${Date.now()}`,
    productIds: selectedProducts.map(p => p.id),
    startDate: gap.startDate || new Date(),
    endDate: gap.endDate || new Date(),
    amount: gap.amount || 0,
    paymentMethod: 'CASH',
    isGapPeriod: true,
    gapReason: gap.type === 'pre_cnam_gap' ? 'CNAM_PENDING' : 'OTHER',
    notes: gap.description
  };
  
  setPaymentPeriods([...paymentPeriods, newPeriod]);
  setActiveTab('periods');
  setActivePaymentPeriod(newPeriod.id);
};

// Initiate CNAM renewal
export const initiateCnamRenewal = (
  bondId: string,
  cnamBonds: CNAMBondLocation[],
  setCnamBonds: (bonds: CNAMBondLocation[]) => void,
  setActiveTab: (tab: string) => void,
  setActiveCnamBond: (bondId: string) => void,
  toast: any
) => {
  const bondToRenew = cnamBonds.find(b => b.id === bondId);
  if (!bondToRenew) return;
  
  const renewalBond: CNAMBondLocation = {
    id: `bond-renewal-${Date.now()}`,
    bondNumber: '',
    bondType: bondToRenew.bondType,
    productIds: bondToRenew.productIds,
    status: 'EN_ATTENTE_APPROBATION',
    monthlyAmount: bondToRenew.monthlyAmount,
    coveredMonths: bondToRenew.coveredMonths,
    totalAmount: bondToRenew.totalAmount,
    renewalReminderDays: bondToRenew.renewalReminderDays,
    submissionDate: new Date(),
    notes: `Renouvellement du bond ${bondToRenew.bondNumber}`
  };
  
  setCnamBonds([...cnamBonds, renewalBond]);
  setActiveTab('cnam');
  setActiveCnamBond(renewalBond.id);
  
  toast({
    title: "Renouvellement initié",
    description: "Un nouveau bond de renouvellement a été créé. Veuillez compléter les informations."
  });
};

// Auto-generate payment periods from CNAM bonds
export const autoGeneratePaymentPeriods = (
  cnamBonds: CNAMBondLocation[],
  rentalDetails: any,
  selectedProducts: any[],
  calculateTotal: () => number,
  paymentPeriods: RentalPaymentPeriod[],
  setPaymentPeriods: (periods: RentalPaymentPeriod[]) => void,
  toast: any
) => {
  if (cnamBonds.length === 0) return;
  
  const autoPayments: RentalPaymentPeriod[] = [];
  const rentalStart = new Date(rentalDetails?.globalStartDate || new Date());
  
  cnamBonds.forEach((bond) => {
    // Pre-CNAM gap period
    if (bond.startDate && new Date(bond.startDate) > rentalStart) {
      const gapDays = differenceInDays(new Date(bond.startDate), rentalStart);
      autoPayments.push({
        id: `auto-gap-pre-${bond.id}`,
        productIds: selectedProducts.map(p => p.id),
        startDate: rentalStart,
        endDate: new Date(bond.startDate),
        amount: calculateTotal() * gapDays, // calculateTotal is already daily
        paymentMethod: 'CASH',
        isGapPeriod: true,
        gapReason: 'CNAM_PENDING',
        notes: `Gap auto-calculé avant ${bond.bondType}`
      });
    }
    
    // Post-CNAM gap period
    if (bond.endDate && rentalDetails?.globalEndDate) {
      const bondEnd = new Date(bond.endDate);
      const rentalEnd = new Date(rentalDetails.globalEndDate);
      
      if (rentalEnd > bondEnd) {
        const gapDays = differenceInDays(rentalEnd, bondEnd);
        autoPayments.push({
          id: `auto-gap-post-${bond.id}`,
          productIds: selectedProducts.map(p => p.id),
          startDate: bondEnd,
          endDate: rentalEnd,
          amount: calculateTotal() * gapDays, // calculateTotal is already daily
          paymentMethod: 'CASH',
          isGapPeriod: true,
          gapReason: 'CNAM_EXPIRED',
          notes: `Gap auto-calculé après ${bond.bondType}`
        });
      }
    }
  });
  
  // Add auto-generated periods to existing ones
  setPaymentPeriods([...paymentPeriods, ...autoPayments]);
  
  toast({
    title: "Gaps auto-générés",
    description: `${autoPayments.length} période(s) de gap ont été automatiquement créées à partir des dates CNAM`
  });
};

// Calculate total payment amount
export const calculateTotalPaymentAmount = (
  paymentPeriods: RentalPaymentPeriod[],
  depositAmount: number
): number => {
  return paymentPeriods.reduce((total, period) => total + period.amount, 0) + depositAmount;
};

// Validate CNAM bond coverage and generate gaps for invalid bonds
export const validateCnamBondCoverage = (
  bond: CNAMBondLocation,
  today: Date = new Date()
): {
  isValid: boolean;
  reason: string;
  shouldCreateGap: boolean;
  gapReason?: 'CNAM_PENDING' | 'CNAM_EXPIRED' | 'CNAM_REFUSED';
} => {
  // Check if bond is refused
  if (bond.status === 'REFUSE') {
    return {
      isValid: false,
      reason: 'Bond CNAM refusé',
      shouldCreateGap: true,
      gapReason: 'CNAM_PENDING' // Patient needs to pay while waiting for new submission
    };
  }

  // Check if bond is still pending approval
  if (bond.status === 'EN_ATTENTE_APPROBATION') {
    return {
      isValid: false,
      reason: 'Bond CNAM en attente d\'approbation',
      shouldCreateGap: true,
      gapReason: 'CNAM_PENDING'
    };
  }

  // Check if bond is approved but hasn't started yet
  if (bond.status === 'APPROUVE' && bond.startDate && bond.startDate > today) {
    return {
      isValid: false,
      reason: 'Couverture CNAM pas encore commencée',
      shouldCreateGap: true,
      gapReason: 'CNAM_PENDING'
    };
  }

  // Check if bond has expired
  if (bond.status === 'TERMINE' || (bond.endDate && bond.endDate < today)) {
    return {
      isValid: false,
      reason: 'Couverture CNAM expirée',
      shouldCreateGap: true,
      gapReason: 'CNAM_EXPIRED'
    };
  }

  // Check if bond is approved and currently active
  if (bond.status === 'APPROUVE' || bond.status === 'EN_COURS') {
    // Ensure dates are valid
    if (bond.startDate && bond.endDate) {
      if (bond.startDate <= today && bond.endDate >= today) {
        return {
          isValid: true,
          reason: 'Couverture CNAM active',
          shouldCreateGap: false
        };
      }
    }
    
    // If approved but dates aren't set or valid
    return {
      isValid: false,
      reason: 'Dates de couverture CNAM non définies',
      shouldCreateGap: true,
      gapReason: 'CNAM_PENDING'
    };
  }

  // Default case - treat as invalid
  return {
    isValid: false,
    reason: 'Statut CNAM invalide',
    shouldCreateGap: true,
    gapReason: 'CNAM_PENDING'
  };
};

// Check if a period overlaps with existing periods
const hasOverlappingPeriod = (
  newPeriod: { startDate: Date; endDate: Date },
  existingPeriods: RentalPaymentPeriod[]
): boolean => {
  return existingPeriods.some(existing => {
    const newStart = newPeriod.startDate.getTime();
    const newEnd = newPeriod.endDate.getTime();
    const existingStart = existing.startDate.getTime();
    const existingEnd = existing.endDate.getTime();
    
    // Check for any overlap
    return (newStart <= existingEnd && newEnd >= existingStart);
  });
};

// Deduplicate payment periods
const deduplicatePaymentPeriods = (periods: RentalPaymentPeriod[]): RentalPaymentPeriod[] => {
  const uniquePeriods: RentalPaymentPeriod[] = [];
  
  periods.forEach(period => {
    const isDuplicate = uniquePeriods.some(existing => 
      existing.startDate.getTime() === period.startDate.getTime() &&
      existing.endDate.getTime() === period.endDate.getTime() &&
      existing.amount === period.amount &&
      existing.isGapPeriod === period.isGapPeriod
    );
    
    if (!isDuplicate) {
      uniquePeriods.push(period);
    }
  });
  
  return uniquePeriods;
};

// Generate payment periods with proper CNAM validation and deduplication
export const generatePaymentPeriodsWithCnamValidation = (
  cnamBonds: CNAMBondLocation[],
  rentalDetails: any,
  selectedProducts: any[],
  calculateTotal: () => number,
  existingRentalData?: any,
  existingPeriods: RentalPaymentPeriod[] = []
): RentalPaymentPeriod[] => {
  const periods: RentalPaymentPeriod[] = [];
  const today = new Date();
  
  // Determine effective start date
  const effectiveStartDate = existingRentalData?.isExistingRental && existingRentalData.importDate 
    ? existingRentalData.importDate 
    : new Date(rentalDetails?.globalStartDate || today);
  
  const rentalEndDate = rentalDetails?.globalEndDate 
    ? new Date(rentalDetails.globalEndDate) 
    : addMonths(effectiveStartDate, 1);

  // Handle existing rental unpaid amounts (only if not already exists)
  if (existingRentalData?.isExistingRental && existingRentalData.currentUnpaidAmount > 0) {
    const unpaidPeriod = {
      startDate: effectiveStartDate,
      endDate: addDays(effectiveStartDate, 1)
    };
    
    if (!hasOverlappingPeriod(unpaidPeriod, existingPeriods)) {
      periods.push({
        id: `unpaid-existing-${Date.now()}`,
        productIds: selectedProducts.map(p => p.id),
        startDate: unpaidPeriod.startDate,
        endDate: unpaidPeriod.endDate,
        amount: existingRentalData.currentUnpaidAmount,
        paymentMethod: 'CASH',
        isGapPeriod: true,
        gapReason: 'OTHER',
        notes: 'Montant impayé existant à régulariser'
      });
    }
  }

  // Process each CNAM bond
  cnamBonds.forEach((bond) => {
    const validation = validateCnamBondCoverage(bond, today);
    
    if (!validation.isValid && validation.shouldCreateGap) {
      // Create gap period for invalid CNAM bond
      const gapStartDate = bond.startDate || effectiveStartDate;
      const gapEndDate = bond.endDate || rentalEndDate;
      const gapDays = differenceInDays(gapEndDate, gapStartDate);
      
      if (gapDays > 0) {
        const gapPeriod = {
          startDate: gapStartDate,
          endDate: gapEndDate
        };
        
        // Only create if no overlapping period exists
        if (!hasOverlappingPeriod(gapPeriod, [...existingPeriods, ...periods])) {
          periods.push({
            id: `cnam-gap-${bond.id}-${Date.now()}`,
            productIds: selectedProducts.map(p => p.id),
            startDate: gapStartDate,
            endDate: gapEndDate,
            amount: calculateTotal() * gapDays,
            paymentMethod: 'CASH',
            isGapPeriod: true,
            gapReason: validation.gapReason === 'CNAM_REFUSED' ? 'OTHER' : (validation.gapReason || 'CNAM_PENDING'),
            notes: `Gap CNAM: ${validation.reason}`
          });
        }
      }
    }
  });

  // If no valid CNAM bonds, create standard rental payment period
  if (cnamBonds.length === 0 || !cnamBonds.some(bond => validateCnamBondCoverage(bond, today).isValid)) {
    const rentalDays = differenceInDays(rentalEndDate, effectiveStartDate);
    const standardPeriod = {
      startDate: effectiveStartDate,
      endDate: rentalEndDate
    };
    
    // Only create if no overlapping period exists
    if (!hasOverlappingPeriod(standardPeriod, [...existingPeriods, ...periods])) {
      periods.push({
        id: `standard-rental-${Date.now()}`,
        productIds: selectedProducts.map(p => p.id),
        startDate: effectiveStartDate,
        endDate: rentalEndDate,
        amount: calculateTotal() * rentalDays,
        paymentMethod: 'CASH',
        isGapPeriod: false,
        notes: 'Période de location standard'
      });
    }
  }

  // Deduplicate and return
  return deduplicatePaymentPeriods(periods);
};