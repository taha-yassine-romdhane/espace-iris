import { differenceInDays, isAfter, isBefore, isEqual } from 'date-fns';

export interface RentalPeriod {
  id?: string;
  startDate: Date | string;
  endDate: Date | string;
  amount: number;
  paymentMethod?: string;
  isGapPeriod?: boolean;
  gapReason?: string;
}

export interface ValidationError {
  type: 'overlap' | 'gap' | 'invalid_date' | 'invalid_amount';
  message: string;
  periods?: string[];
  severity: 'error' | 'warning';
}

/**
 * Validates rental periods for overlaps and other issues
 */
export function validateRentalPeriods(
  periods: RentalPeriod[],
  rentalStartDate?: Date | string,
  rentalEndDate?: Date | string
): ValidationError[] {
  const errors: ValidationError[] = [];
  
  // Convert string dates to Date objects
  const normalizedPeriods = periods.map(period => ({
    ...period,
    startDate: typeof period.startDate === 'string' ? new Date(period.startDate) : period.startDate,
    endDate: typeof period.endDate === 'string' ? new Date(period.endDate) : period.endDate,
  }));

  // Sort periods by start date for easier analysis
  const sortedPeriods = normalizedPeriods.sort((a, b) => 
    a.startDate.getTime() - b.startDate.getTime()
  );

  // Check for invalid dates and amounts
  sortedPeriods.forEach((period, index) => {
    // Date validation
    if (isNaN(period.startDate.getTime()) || isNaN(period.endDate.getTime())) {
      errors.push({
        type: 'invalid_date',
        message: `Période ${index + 1}: Dates invalides`,
        periods: [period.id || `period-${index}`],
        severity: 'error'
      });
      return;
    }

    if (isAfter(period.startDate, period.endDate)) {
      errors.push({
        type: 'invalid_date',
        message: `Période ${index + 1}: Date de fin antérieure à la date de début`,
        periods: [period.id || `period-${index}`],
        severity: 'error'
      });
    }

    // Amount validation
    if (typeof period.amount !== 'number' || period.amount < 0) {
      errors.push({
        type: 'invalid_amount',
        message: `Période ${index + 1}: Montant invalide (${period.amount})`,
        periods: [period.id || `period-${index}`],
        severity: 'error'
      });
    }

    // Check if period extends beyond rental boundaries
    if (rentalStartDate) {
      const rentalStart = typeof rentalStartDate === 'string' ? new Date(rentalStartDate) : rentalStartDate;
      if (isBefore(period.startDate, rentalStart)) {
        errors.push({
          type: 'invalid_date',
          message: `Période ${index + 1}: Commence avant le début de location`,
          periods: [period.id || `period-${index}`],
          severity: 'warning'
        });
      }
    }

    if (rentalEndDate) {
      const rentalEnd = typeof rentalEndDate === 'string' ? new Date(rentalEndDate) : rentalEndDate;
      if (isAfter(period.endDate, rentalEnd)) {
        errors.push({
          type: 'invalid_date',
          message: `Période ${index + 1}: Se termine après la fin de location`,
          periods: [period.id || `period-${index}`],
          severity: 'warning'
        });
      }
    }
  });

  // Check for overlaps
  for (let i = 0; i < sortedPeriods.length - 1; i++) {
    const currentPeriod = sortedPeriods[i];
    const nextPeriod = sortedPeriods[i + 1];

    // Skip if either period has invalid dates
    if (isNaN(currentPeriod.endDate.getTime()) || isNaN(nextPeriod.startDate.getTime())) {
      continue;
    }

    // Check for overlap (next period starts before current ends)
    if (isBefore(nextPeriod.startDate, currentPeriod.endDate) || 
        isEqual(nextPeriod.startDate, currentPeriod.endDate)) {
      
      const overlapDays = differenceInDays(currentPeriod.endDate, nextPeriod.startDate);
      
      errors.push({
        type: 'overlap',
        message: `Chevauchement détecté: Période ${i + 1} et ${i + 2} (${Math.abs(overlapDays)} jour${Math.abs(overlapDays) > 1 ? 's' : ''})`,
        periods: [
          currentPeriod.id || `period-${i}`,
          nextPeriod.id || `period-${i + 1}`
        ],
        severity: 'error'
      });
    }
  }

  return errors;
}

/**
 * Detects gaps between periods
 */
export function detectGaps(
  periods: RentalPeriod[],
  rentalStartDate: Date | string,
  rentalEndDate?: Date | string,
  dailyRate: number = 0
): Array<{
  startDate: Date;
  endDate: Date;
  durationDays: number;
  estimatedAmount: number;
  type: 'start_gap' | 'middle_gap' | 'end_gap';
  description: string;
}> {
  const gaps = [];
  
  const rentalStart = typeof rentalStartDate === 'string' ? new Date(rentalStartDate) : rentalStartDate;
  const rentalEnd = rentalEndDate ? 
    (typeof rentalEndDate === 'string' ? new Date(rentalEndDate) : rentalEndDate) : 
    new Date();

  // Filter out gap periods and sort by start date
  const billingPeriods = periods
    .filter(p => !p.isGapPeriod)
    .map(period => ({
      ...period,
      startDate: typeof period.startDate === 'string' ? new Date(period.startDate) : period.startDate,
      endDate: typeof period.endDate === 'string' ? new Date(period.endDate) : period.endDate,
    }))
    .sort((a, b) => a.startDate.getTime() - b.startDate.getTime());

  if (billingPeriods.length === 0) {
    // No billing periods - entire rental is a gap
    const durationDays = differenceInDays(rentalEnd, rentalStart) + 1;
    gaps.push({
      startDate: rentalStart,
      endDate: rentalEnd,
      durationDays,
      estimatedAmount: durationDays * dailyRate,
      type: 'start_gap' as const,
      description: 'Aucune période de facturation définie'
    });
    return gaps;
  }

  // Check for gap at the beginning
  const firstPeriod = billingPeriods[0];
  if (isAfter(firstPeriod.startDate, rentalStart)) {
    const durationDays = differenceInDays(firstPeriod.startDate, rentalStart);
    if (durationDays > 0) {
      gaps.push({
        startDate: rentalStart,
        endDate: new Date(firstPeriod.startDate.getTime() - 24 * 60 * 60 * 1000), // One day before
        durationDays,
        estimatedAmount: durationDays * dailyRate,
        type: 'start_gap' as const,
        description: `Gap initial de ${durationDays} jour${durationDays > 1 ? 's' : ''}`
      });
    }
  }

  // Check for gaps between periods
  for (let i = 0; i < billingPeriods.length - 1; i++) {
    const currentPeriod = billingPeriods[i];
    const nextPeriod = billingPeriods[i + 1];

    const gapStart = new Date(currentPeriod.endDate.getTime() + 24 * 60 * 60 * 1000); // One day after
    const gapEnd = new Date(nextPeriod.startDate.getTime() - 24 * 60 * 60 * 1000); // One day before

    const durationDays = differenceInDays(gapEnd, gapStart) + 1;
    
    if (durationDays > 0) {
      gaps.push({
        startDate: gapStart,
        endDate: gapEnd,
        durationDays,
        estimatedAmount: durationDays * dailyRate,
        type: 'middle_gap' as const,
        description: `Gap entre périodes de ${durationDays} jour${durationDays > 1 ? 's' : ''}`
      });
    }
  }

  // Check for gap at the end (only if rental has end date)
  if (rentalEndDate) {
    const lastPeriod = billingPeriods[billingPeriods.length - 1];
    if (isBefore(lastPeriod.endDate, rentalEnd)) {
      const gapStart = new Date(lastPeriod.endDate.getTime() + 24 * 60 * 60 * 1000);
      const durationDays = differenceInDays(rentalEnd, gapStart) + 1;
      
      if (durationDays > 0) {
        gaps.push({
          startDate: gapStart,
          endDate: rentalEnd,
          durationDays,
          estimatedAmount: durationDays * dailyRate,
          type: 'end_gap' as const,
          description: `Gap final de ${durationDays} jour${durationDays > 1 ? 's' : ''}`
        });
      }
    }
  }

  return gaps;
}

/**
 * Calculates financial summary for rental periods
 */
export function calculateRentalFinancials(periods: RentalPeriod[]) {
  const financials = {
    totalAmount: 0,
    cnamAmount: 0,
    patientAmount: 0,
    gapAmount: 0,
    totalDays: 0,
    billableDays: 0,
    gapDays: 0,
    periodCount: periods.length,
    cnamPeriods: 0,
    gapPeriods: 0,
  };

  periods.forEach(period => {
    const amount = typeof period.amount === 'number' ? period.amount : parseFloat(period.amount) || 0;
    const startDate = typeof period.startDate === 'string' ? new Date(period.startDate) : period.startDate;
    const endDate = typeof period.endDate === 'string' ? new Date(period.endDate) : period.endDate;
    const days = differenceInDays(endDate, startDate) + 1;

    financials.totalAmount += amount;
    financials.totalDays += days;

    if (period.isGapPeriod) {
      financials.gapAmount += amount;
      financials.gapDays += days;
      financials.gapPeriods += 1;
    } else {
      financials.billableDays += days;
      if (period.paymentMethod === 'CNAM') {
        financials.cnamAmount += amount;
        financials.cnamPeriods += 1;
      } else {
        financials.patientAmount += amount;
      }
    }
  });

  return financials;
}