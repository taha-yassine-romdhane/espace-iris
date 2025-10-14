// Utility to fix inflated gap period amounts
import { differenceInDays } from 'date-fns';

interface RentalPeriod {
  id: string;
  startDate: Date | string;
  endDate: Date | string;
  amount: number | string;
  isGapPeriod: boolean;
  paymentMethod: string;
  cnamBondId?: string | null;
}

interface CNAMBond {
  id: string;
  monthlyAmount: number | string;
  totalAmount: number | string;
  coveredMonths: number;
}

export function calculateProperGapAmount(
  startDate: Date | string,
  endDate: Date | string,
  medicalDeviceMonthlyPrice: number,
  cnamBonds: CNAMBond[] = []
): { amount: number; dailyRate: number; days: number; calculation: string } {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const days = differenceInDays(end, start) + 1;
  
  // Convert monthly price to daily rate
  const equipmentDailyRate = medicalDeviceMonthlyPrice / 30;
  
  // Calculate gap daily rate based on CNAM coverage
  let gapDailyRate: number;
  let calculation: string;
  
  if (cnamBonds.length > 0) {
    // If CNAM bonds exist, use CNAM pricing as reference
    const firstBond = cnamBonds[0];
    const bondMonthlyAmount = typeof firstBond.monthlyAmount === 'string' 
      ? parseFloat(firstBond.monthlyAmount) 
      : firstBond.monthlyAmount;
    const cnamDailyRate = bondMonthlyAmount / 30;
    
    // Gap rate is the smaller of:
    // 1. 20% of equipment rate (patient co-payment)
    // 2. CNAM daily rate (as a ceiling)
    gapDailyRate = Math.min(equipmentDailyRate * 0.2, cnamDailyRate);
    calculation = `Min(${(equipmentDailyRate * 0.2).toFixed(2)}, ${cnamDailyRate.toFixed(2)}) × ${days} jours`;
  } else {
    // No CNAM coverage, use 20% patient responsibility rate
    gapDailyRate = equipmentDailyRate * 0.2;
    calculation = `${gapDailyRate.toFixed(2)} TND/jour × ${days} jours`;
  }
  
  const amount = gapDailyRate * days;
  
  return {
    amount: Math.round(amount * 100) / 100, // Round to 2 decimals
    dailyRate: Math.round(gapDailyRate * 100) / 100,
    days,
    calculation
  };
}

export function fixInflatedGapPeriods(
  periods: RentalPeriod[],
  medicalDeviceMonthlyPrice: number,
  cnamBonds: CNAMBond[] = []
): { fixedPeriods: RentalPeriod[]; corrections: any[] } {
  const corrections: any[] = [];
  
  const fixedPeriods = periods.map(period => {
    if (!period.isGapPeriod) {
      return period;
    }
    
    const currentAmount = typeof period.amount === 'string' 
      ? parseFloat(period.amount) 
      : period.amount;
    
    const { amount: correctAmount, dailyRate, days, calculation } = calculateProperGapAmount(
      period.startDate,
      period.endDate,
      medicalDeviceMonthlyPrice,
      cnamBonds
    );
    
    // Check if the amount needs correction (more than 10% difference)
    const difference = Math.abs(currentAmount - correctAmount);
    const percentageDiff = (difference / currentAmount) * 100;
    
    if (percentageDiff > 10) {
      corrections.push({
        periodId: period.id,
        startDate: period.startDate,
        endDate: period.endDate,
        oldAmount: currentAmount,
        newAmount: correctAmount,
        difference,
        percentageDiff: percentageDiff.toFixed(1),
        days,
        dailyRate,
        calculation
      });
      
      return {
        ...period,
        amount: correctAmount
      };
    }
    
    return period;
  });
  
  return { fixedPeriods, corrections };
}

// Function to generate a correction report
export function generateCorrectionReport(corrections: any[]): string {
  if (corrections.length === 0) {
    return 'Aucune correction nécessaire.';
  }
  
  const totalOldAmount = corrections.reduce((sum, c) => sum + c.oldAmount, 0);
  const totalNewAmount = corrections.reduce((sum, c) => sum + c.newAmount, 0);
  const totalSavings = totalOldAmount - totalNewAmount;
  
  let report = `RAPPORT DE CORRECTION DES PÉRIODES GAP\n`;
  report += `=======================================\n\n`;
  report += `Nombre de périodes corrigées: ${corrections.length}\n`;
  report += `Montant total avant: ${totalOldAmount.toFixed(2)} TND\n`;
  report += `Montant total après: ${totalNewAmount.toFixed(2)} TND\n`;
  report += `Économie totale: ${totalSavings.toFixed(2)} TND\n\n`;
  
  report += `DÉTAILS DES CORRECTIONS:\n`;
  report += `------------------------\n`;
  
  corrections.forEach((c, index) => {
    report += `\nPériode ${index + 1}:\n`;
    report += `  Dates: ${new Date(c.startDate).toLocaleDateString()} - ${new Date(c.endDate).toLocaleDateString()}\n`;
    report += `  Durée: ${c.days} jours\n`;
    report += `  Ancien montant: ${c.oldAmount.toFixed(2)} TND\n`;
    report += `  Nouveau montant: ${c.newAmount.toFixed(2)} TND\n`;
    report += `  Économie: ${c.difference.toFixed(2)} TND (${c.percentageDiff}%)\n`;
    report += `  Calcul: ${c.calculation}\n`;
  });
  
  return report;
}