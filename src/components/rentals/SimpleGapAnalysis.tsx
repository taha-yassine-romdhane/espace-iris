import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Calendar,
  AlertTriangle,
  CheckCircle,
  Clock
} from 'lucide-react';
import { 
  differenceInDays, 
  isBefore,
  format
} from 'date-fns';
import { fr } from 'date-fns/locale';

interface SimpleGap {
  id: string;
  startDate: Date;
  endDate: Date;
  days: number;
  amount: number;
  description: string;
}

interface SimpleGapAnalysisProps {
  rental: any;
  rentalPeriods: any[];
}

export default function SimpleGapAnalysis({ 
  rental, 
  rentalPeriods
}: SimpleGapAnalysisProps) {

  // Calculate daily rental rate
  const dailyRate = useMemo(() => {
    let total = 0;
    if (rental.medicalDevice?.rentalPrice) {
      total += parseFloat(rental.medicalDevice.rentalPrice);
    }
    rental.accessories?.forEach((accessory: any) => {
      total += parseFloat(accessory.unitPrice || 0) * accessory.quantity;
    });
    return total;
  }, [rental]);

  // Simple gap analysis - find both marked gaps and coverage gaps
  const gaps = useMemo(() => {
    const foundGaps: SimpleGap[] = [];
    const rentalStart = new Date(rental.startDate);
    const rentalEnd = rental.endDate ? new Date(rental.endDate) : null;

    // First, add all periods that are explicitly marked as gaps
    const markedGaps = rentalPeriods.filter(period => period.isGapPeriod);
    markedGaps.forEach(gap => {
      foundGaps.push({
        id: gap.id,
        startDate: new Date(gap.startDate),
        endDate: new Date(gap.endDate),
        days: differenceInDays(new Date(gap.endDate), new Date(gap.startDate)) + 1,
        amount: parseFloat(gap.amount) || 0,
        description: gap.gapReason === 'CNAM_PENDING' 
          ? 'Gap avant couverture CNAM' 
          : gap.gapReason === 'CNAM_GAP'
          ? 'Gap entre bons CNAM'
          : gap.gapReason === 'CNAM_EXPIRED'
          ? 'Gap après expiration CNAM'
          : gap.notes || 'Période gap'
      });
    });

    // Then look for uncovered gaps between periods
    if (rentalPeriods.length > 0 && rentalEnd) {
      const sortedPeriods = [...rentalPeriods]
        .filter(period => period.startDate && period.endDate)
        .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

      // Gap before first period
      const firstPeriod = sortedPeriods[0];
      if (firstPeriod) {
        const firstPeriodStart = new Date(firstPeriod.startDate);
        if (isBefore(rentalStart, firstPeriodStart)) {
          const gapDays = differenceInDays(firstPeriodStart, rentalStart);
          if (gapDays > 0) {
            foundGaps.push({
              id: `gap-start`,
              startDate: rentalStart,
              endDate: new Date(firstPeriodStart.getTime() - 24 * 60 * 60 * 1000),
              days: gapDays,
              amount: dailyRate * gapDays,
              description: 'Période non couverte au début'
            });
          }
        }
      }

      // Gaps between periods
      for (let i = 1; i < sortedPeriods.length; i++) {
        const prevPeriodEnd = new Date(sortedPeriods[i - 1].endDate);
        const currentPeriodStart = new Date(sortedPeriods[i].startDate);
        const gapHours = (currentPeriodStart.getTime() - prevPeriodEnd.getTime()) / (1000 * 60 * 60);
        
        if (gapHours > 25) { // Gap > 1 day
          const gapDays = differenceInDays(currentPeriodStart, prevPeriodEnd) - 1;
          if (gapDays > 0) {
            foundGaps.push({
              id: `gap-between-${i}`,
              startDate: new Date(prevPeriodEnd.getTime() + 24 * 60 * 60 * 1000),
              endDate: new Date(currentPeriodStart.getTime() - 24 * 60 * 60 * 1000),
              days: gapDays,
              amount: dailyRate * gapDays,
              description: 'Période non couverte entre deux périodes'
            });
          }
        }
      }

      // Gap after last period
      const lastPeriod = sortedPeriods[sortedPeriods.length - 1];
      if (lastPeriod) {
        const lastPeriodEnd = new Date(lastPeriod.endDate);
        const gapHours = (rentalEnd.getTime() - lastPeriodEnd.getTime()) / (1000 * 60 * 60);
        
        if (gapHours > 25) {
          const gapDays = differenceInDays(rentalEnd, lastPeriodEnd);
          if (gapDays > 0) {
            foundGaps.push({
              id: `gap-end`,
              startDate: new Date(lastPeriodEnd.getTime() + 24 * 60 * 60 * 1000),
              endDate: rentalEnd,
              days: gapDays,
              amount: dailyRate * gapDays,
              description: 'Période non couverte à la fin'
            });
          }
        }
      }
    }

    return foundGaps;
  }, [rental, rentalPeriods, dailyRate]);

  // Summary calculations
  const totalGaps = gaps.length;
  const totalDays = gaps.reduce((sum, gap) => sum + gap.days, 0);
  const totalAmount = gaps.reduce((sum, gap) => sum + gap.amount, 0);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-600" />
            Analyse des Gaps - Périodes Non Couvertes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {totalGaps === 0 ? (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Aucun gap détecté - La location est entièrement couverte
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-4">
              {/* Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-orange-50 rounded-lg">
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">{totalGaps}</div>
                  <div className="text-sm text-orange-800">Gaps détectés</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">{totalDays}</div>
                  <div className="text-sm text-orange-800">Jours non couverts</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">{totalAmount.toFixed(2)} TND</div>
                  <div className="text-sm text-orange-800">Contribution patient</div>
                </div>
              </div>

              {/* Gap Details */}
              <div className="space-y-3">
                {gaps.map((gap) => (
                  <Card key={gap.id} className="border-l-4 border-l-orange-500">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Clock className="h-4 w-4 text-orange-600" />
                            <span className="font-medium text-gray-900">
                              {gap.description}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              {format(gap.startDate, 'dd MMM yyyy', { locale: fr })} - {format(gap.endDate, 'dd MMM yyyy', { locale: fr })}
                            </div>
                            <Badge variant="outline" className="bg-orange-100 text-orange-800">
                              {gap.days} jour{gap.days > 1 ? 's' : ''}
                            </Badge>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-orange-600">
                            {gap.amount.toFixed(2)} TND
                          </div>
                          <div className="text-sm text-gray-500">
                            {gap.days > 0 ? (gap.amount / gap.days).toFixed(2) : '0.00'} TND/jour
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Info about gaps */}
              <Alert className="border-blue-200 bg-blue-50">
                <AlertTriangle className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800">
                  Ces périodes représentent les gaps de couverture CNAM où le patient doit payer directement. 
                  Les montants sont calculés avec un tarif réduit (contribution patient uniquement).
                </AlertDescription>
              </Alert>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}