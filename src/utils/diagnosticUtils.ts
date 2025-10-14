// Diagnostic utility functions for IAH severity calculation

export interface SeverityLevel {
  level: 'negative' | 'moderate' | 'severe';
  labelFr: string;
  color: 'emerald' | 'amber' | 'red';
  bgColor: string;
  textColor: string;
}

export function calculateIAHSeverity(iahValue: number): SeverityLevel {
  if (iahValue < 5) {
    return {
      level: 'negative',
      labelFr: 'Négatif',
      color: 'emerald',
      bgColor: 'bg-emerald-100',
      textColor: 'text-emerald-800'
    };
  } else if (iahValue >= 5 && iahValue < 30) {
    return {
      level: 'moderate',
      labelFr: 'Modéré',
      color: 'amber',
      bgColor: 'bg-amber-100',
      textColor: 'text-amber-800'
    };
  } else {
    return {
      level: 'severe',
      labelFr: 'Sévère',
      color: 'red',
      bgColor: 'bg-red-100',
      textColor: 'text-red-800'
    };
  }
}

export function formatIAHValue(value: number | null): string {
  if (value === null || value === undefined) return '-';
  return value.toFixed(1);
}