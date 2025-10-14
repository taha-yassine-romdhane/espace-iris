import React, { useState, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/components/ui/use-toast';
import { 
  Wand2,
  Shield,
  Calendar,
  CreditCard,
  AlertTriangle,
  CheckCircle,
  Trash2,
  RefreshCw,
  DollarSign,
  Clock,
  TrendingUp
} from 'lucide-react';
import { 
  differenceInDays, 
  addDays, 
  isAfter, 
  isBefore, 
  format,
  isWithinInterval
} from 'date-fns';
import { fr } from 'date-fns/locale';

interface PaymentAutoGenerationProps {
  rental: any;
  cnamBonds: any[];
  existingPeriods: any[];
  onPeriodsGenerated?: (periods: any[]) => void;
}

interface GeneratedPeriod {
  id: string;
  startDate: Date;
  endDate: Date;
  amount: number;
  paymentMethod: 'CNAM' | 'CASH';
  isGapPeriod: boolean;
  gapReason?: string;
  cnamBondId?: string;
  source: 'CNAM_BOND' | 'GAP_AUTO' | 'EXISTING';
  notes?: string;
}

export default function PaymentAutoGeneration({ 
  rental, 
  cnamBonds, 
  existingPeriods,
  onPeriodsGenerated 
}: PaymentAutoGenerationProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPeriods, setGeneratedPeriods] = useState<GeneratedPeriod[]>([]);
  const [showPreview, setShowPreview] = useState(false);

  // Auto-generation mutation
  const generatePeriodsMutation = useMutation({
    mutationFn: async (periods: GeneratedPeriod[]) => {
      const response = await fetch(`/api/rentals/${rental.id}/generate-periods`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ periods }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate payment periods');
      }

      return response.json();
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['rental', rental.id] });
      toast({
        title: "Périodes générées",
        description: `${result.periods.length} périodes de paiement ont été créées.`,
      });
      setShowPreview(false);
      onPeriodsGenerated?.(result.periods);
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: "Impossible de générer les périodes de paiement.",
        variant: "destructive",
      });
    },
  });

  // Calculate daily rate for rental
  const dailyRate = useMemo(() => {
    let total = 0;
    
    // Main device
    if (rental.medicalDevice?.rentalPrice) {
      total += parseFloat(rental.medicalDevice.rentalPrice);
    }
    
    // Accessories
    rental.accessories?.forEach((accessory: any) => {
      total += parseFloat(accessory.unitPrice || 0) * accessory.quantity;
    });
    
    return total;
  }, [rental]);

  // Auto-generate periods based on CNAM bonds and rental dates
  const generatePeriodsFromCNAMBonds = () => {
    setIsGenerating(true);
    
    try {
      const periods: GeneratedPeriod[] = [];
      const rentalStart = new Date(rental.startDate);
      const rentalEnd = rental.endDate ? new Date(rental.endDate) : null;
      
      // Sort CNAM bonds by start date
      const sortedBonds = [...cnamBonds]
        .filter(bond => bond.startDate && bond.endDate)
        .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

      if (sortedBonds.length === 0) {
        // No CNAM bonds - create cash periods
        if (rentalEnd) {
          periods.push({
            id: `cash-${Date.now()}`,
            startDate: rentalStart,
            endDate: rentalEnd,
            amount: dailyRate * (differenceInDays(rentalEnd, rentalStart) + 1),
            paymentMethod: 'CASH',
            isGapPeriod: false,
            source: 'GAP_AUTO',
            notes: 'Période générée automatiquement - Paiement cash',
          });
        } else {
          // Open rental
          periods.push({
            id: `cash-open-${Date.now()}`,
            startDate: rentalStart,
            endDate: addDays(rentalStart, 30), // Default 30 days
            amount: dailyRate * 30,
            paymentMethod: 'CASH',
            isGapPeriod: false,
            source: 'GAP_AUTO',
            notes: 'Période initiale - Location ouverte',
          });
        }
        
        setGeneratedPeriods(periods);
        setShowPreview(true);
        return;
      }

      let currentDate = rentalStart;
      
      // Check for gap before first CNAM bond
      const firstBond = sortedBonds[0];
      const firstBondStart = new Date(firstBond.startDate);
      
      if (isBefore(currentDate, firstBondStart)) {
        periods.push({
          id: `gap-pre-${firstBond.id}`,
          startDate: currentDate,
          endDate: addDays(firstBondStart, -1),
          amount: dailyRate * differenceInDays(firstBondStart, currentDate),
          paymentMethod: 'CASH',
          isGapPeriod: true,
          gapReason: 'CNAM_PENDING',
          source: 'GAP_AUTO',
          notes: 'Gap avant couverture CNAM',
        });
        currentDate = firstBondStart;
      }

      // Process CNAM bonds and gaps between them
      for (let i = 0; i < sortedBonds.length; i++) {
        const bond = sortedBonds[i];
        const bondStart = new Date(bond.startDate);
        const bondEnd = new Date(bond.endDate);
        
        // CNAM period
        if (rentalEnd && isAfter(bondStart, rentalEnd)) {
          break; // Bond is after rental end
        }
        
        const periodEnd = rentalEnd && isBefore(rentalEnd, bondEnd) ? rentalEnd : bondEnd;
        
        periods.push({
          id: `cnam-${bond.id}`,
          startDate: bondStart,
          endDate: periodEnd,
          amount: bond.totalAmount,
          paymentMethod: 'CNAM',
          isGapPeriod: false,
          cnamBondId: bond.id,
          source: 'CNAM_BOND',
          notes: `Bon CNAM - ${bond.bondType}`,
        });
        
        currentDate = addDays(periodEnd, 1);
        
        // Check for gap to next bond
        const nextBond = sortedBonds[i + 1];
        if (nextBond) {
          const nextBondStart = new Date(nextBond.startDate);
          
          if (isBefore(currentDate, nextBondStart)) {
            periods.push({
              id: `gap-between-${bond.id}-${nextBond.id}`,
              startDate: currentDate,
              endDate: addDays(nextBondStart, -1),
              amount: dailyRate * differenceInDays(nextBondStart, currentDate),
              paymentMethod: 'CASH',
              isGapPeriod: true,
              gapReason: 'CNAM_GAP',
              source: 'GAP_AUTO',
              notes: 'Gap entre bonds CNAM',
            });
            currentDate = nextBondStart;
          }
        }
      }
      
      // Gap after last CNAM bond (if rental continues)
      if (rentalEnd && isAfter(rentalEnd, currentDate)) {
        periods.push({
          id: `gap-post-${Date.now()}`,
          startDate: currentDate,
          endDate: rentalEnd,
          amount: dailyRate * (differenceInDays(rentalEnd, currentDate) + 1),
          paymentMethod: 'CASH',
          isGapPeriod: true,
          gapReason: 'CNAM_EXPIRED',
          source: 'GAP_AUTO',
          notes: 'Gap après expiration CNAM',
        });
      } else if (!rentalEnd) {
        // Open rental - create ongoing period
        const nextMonth = addDays(currentDate, 30);
        periods.push({
          id: `ongoing-${Date.now()}`,
          startDate: currentDate,
          endDate: nextMonth,
          amount: dailyRate * 30,
          paymentMethod: 'CASH',
          isGapPeriod: true,
          gapReason: 'OPEN_RENTAL',
          source: 'GAP_AUTO',
          notes: 'Période continue - Location ouverte',
        });
      }
      
      setGeneratedPeriods(periods);
      setShowPreview(true);
      
    } catch (error) {
      toast({
        title: "Erreur de génération",
        description: "Impossible de générer les périodes automatiquement.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Remove duplicates with existing periods
  const filteredPeriods = useMemo(() => {
    return generatedPeriods.filter(generated => {
      return !existingPeriods.some(existing => {
        const existingStart = new Date(existing.startDate);
        const existingEnd = new Date(existing.endDate);
        const generatedStart = generated.startDate;
        const generatedEnd = generated.endDate;
        
        // Check for overlap
        return (
          isWithinInterval(generatedStart, { start: existingStart, end: existingEnd }) ||
          isWithinInterval(generatedEnd, { start: existingStart, end: existingEnd }) ||
          isWithinInterval(existingStart, { start: generatedStart, end: generatedEnd })
        );
      });
    });
  }, [generatedPeriods, existingPeriods]);

  const applyGeneration = () => {
    generatePeriodsMutation.mutate(filteredPeriods);
  };

  // Statistics
  const stats = useMemo(() => {
    const cnamPeriods = filteredPeriods.filter(p => p.paymentMethod === 'CNAM');
    const gapPeriods = filteredPeriods.filter(p => p.isGapPeriod);
    const totalCnamAmount = cnamPeriods.reduce((sum, p) => {
      const amount = typeof p.amount === 'number' ? p.amount : parseFloat(p.amount) || 0;
      return sum + amount;
    }, 0);
    const totalGapAmount = gapPeriods.reduce((sum, p) => {
      const amount = typeof p.amount === 'number' ? p.amount : parseFloat(p.amount) || 0;
      return sum + amount;
    }, 0);
    const totalDays = filteredPeriods.reduce((sum, p) => 
      sum + differenceInDays(p.endDate, p.startDate) + 1, 0
    );

    return {
      totalPeriods: filteredPeriods.length,
      cnamPeriods: cnamPeriods.length,
      gapPeriods: gapPeriods.length,
      totalCnamAmount,
      totalGapAmount,
      totalAmount: totalCnamAmount + totalGapAmount,
      totalDays,
    };
  }, [filteredPeriods]);

  const getGapSeverity = (gapReason?: string) => {
    switch (gapReason) {
      case 'CNAM_PENDING': return 'high';
      case 'CNAM_EXPIRED': return 'high';
      case 'CNAM_GAP': return 'medium';
      default: return 'low';
    }
  };

  const getGapBadgeClass = (severity: string) => {
    switch (severity) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-orange-100 text-orange-800 border-orange-200';
      default: return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Generation Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5 text-blue-600" />
            Génération Automatique des Périodes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-gray-600">
                Génère automatiquement les périodes de paiement basées sur les bons CNAM et les gaps détectés.
              </p>
              <div className="text-sm text-gray-500 mt-1">
                Tarif journalier: <strong>{(typeof dailyRate === 'number' ? dailyRate : parseFloat(dailyRate) || 0).toFixed(2)} TND</strong> • 
                Bons CNAM: <strong>{cnamBonds.length}</strong> • 
                Périodes existantes: <strong>{existingPeriods.length}</strong>
              </div>
            </div>
            <Button
              onClick={generatePeriodsFromCNAMBonds}
              disabled={isGenerating}
              className="flex items-center gap-2"
            >
              {isGenerating ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Wand2 className="h-4 w-4" />
              )}
              Générer Périodes
            </Button>
          </div>

          {cnamBonds.length === 0 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Aucun bon CNAM détecté. La génération créera des périodes de paiement en espèces.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Preview Generated Periods */}
      {showPreview && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              Aperçu des Périodes Générées
              <Badge variant="outline">{filteredPeriods.length} périodes</Badge>
            </CardTitle>
            <div className="flex gap-2">
              <Button
                onClick={applyGeneration}
                disabled={generatePeriodsMutation.isPending || filteredPeriods.length === 0}
                className="flex items-center gap-1"
              >
                <CheckCircle className="h-4 w-4" />
                Appliquer ({filteredPeriods.length})
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowPreview(false)}
                className="flex items-center gap-1"
              >
                <Trash2 className="h-4 w-4" />
                Annuler
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-blue-50 p-3 rounded-lg">
                <div className="text-sm text-blue-600">Total Périodes</div>
                <div className="font-bold text-blue-800">{stats.totalPeriods}</div>
              </div>
              <div className="bg-green-50 p-3 rounded-lg">
                <div className="text-sm text-green-600">Couverture CNAM</div>
                <div className="font-bold text-green-800">{(stats.totalCnamAmount || 0).toFixed(2)} TND</div>
              </div>
              <div className="bg-orange-50 p-3 rounded-lg">
                <div className="text-sm text-orange-600">Gaps Détectés</div>
                <div className="font-bold text-orange-800">{stats.gapPeriods} gap(s)</div>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="text-sm text-gray-600">Durée Totale</div>
                <div className="font-bold text-gray-800">{stats.totalDays} jours</div>
              </div>
            </div>

            {/* Periods List */}
            <div className="space-y-3">
              {filteredPeriods.map((period) => (
                <div 
                  key={period.id}
                  className={`p-4 rounded-lg border ${
                    period.isGapPeriod ? 'bg-orange-50 border-orange-200' : 'bg-green-50 border-green-200'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {period.paymentMethod === 'CNAM' ? (
                          <Shield className="h-4 w-4 text-green-600" />
                        ) : (
                          <CreditCard className="h-4 w-4 text-blue-600" />
                        )}
                        <span className="font-medium">
                          {format(period.startDate, 'dd MMM', { locale: fr })} - {format(period.endDate, 'dd MMM yyyy', { locale: fr })}
                        </span>
                        <span className="text-sm text-gray-500">
                          ({differenceInDays(period.endDate, period.startDate) + 1} jours)
                        </span>
                      </div>
                      
                      <div className="text-sm text-gray-600">
                        {period.notes}
                      </div>
                      
                      {period.gapReason && (
                        <Badge 
                          variant="outline" 
                          className={`mt-2 ${getGapBadgeClass(getGapSeverity(period.gapReason))}`}
                        >
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          {period.gapReason === 'CNAM_PENDING' && 'En attente CNAM'}
                          {period.gapReason === 'CNAM_EXPIRED' && 'CNAM Expiré'}
                          {period.gapReason === 'CNAM_GAP' && 'Gap CNAM'}
                          {period.gapReason === 'OPEN_RENTAL' && 'Location Ouverte'}
                        </Badge>
                      )}
                    </div>
                    
                    <div className="text-right">
                      <div className="font-bold text-lg">
                        {(typeof period.amount === 'number' ? period.amount : parseFloat(period.amount) || 0).toFixed(2)} TND
                      </div>
                      <Badge variant={period.paymentMethod === 'CNAM' ? 'default' : 'secondary'}>
                        {period.paymentMethod}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {filteredPeriods.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Clock className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>Toutes les périodes générées existent déjà ou se chevauchent avec des périodes existantes.</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Existing Periods Summary */}
      {existingPeriods.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              Périodes Existantes
              <Badge variant="secondary">{existingPeriods.length} périodes</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-gray-600">
              Ces périodes existent déjà et seront conservées. La génération automatique évitera de créer des doublons.
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}