import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  AlertTriangle,
  TrendingDown,
  Shield,
  Calendar,
  DollarSign,
  Clock,
  Target,
  CheckCircle,
  XCircle,
  AlertCircle,
  Zap,
  RefreshCw,
  BarChart3
} from 'lucide-react';
import { 
  differenceInDays, 
  addDays,
  isAfter, 
  isBefore,
  format,
  isWithinInterval,
  startOfDay,
  endOfDay
} from 'date-fns';
import { fr } from 'date-fns/locale';

interface Gap {
  id: string;
  type: 'COVERAGE_GAP' | 'PAYMENT_GAP' | 'TIMELINE_GAP' | 'CNAM_EXPIRY';
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  startDate: Date;
  endDate: Date;
  duration: number;
  amount: number;
  reason: string;
  description: string;
  impactScore: number;
  suggestions: string[];
  affectedBondId?: string;
  affectedPeriodId?: string;
}

interface GapAnalysisProps {
  rental: any;
  cnamBonds: any[];
  rentalPeriods: any[];
  onGapAction?: (gap: Gap, action: string) => void;
}

export default function ComprehensiveGapAnalysis({ 
  rental, 
  cnamBonds, 
  rentalPeriods,
  onGapAction 
}: GapAnalysisProps) {
  const [selectedSeverity, setSelectedSeverity] = useState<string>('ALL');
  const [showDetails, setShowDetails] = useState<{ [key: string]: boolean }>({});

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

  // Comprehensive gap analysis
  const gapAnalysis = useMemo(() => {
    const gaps: Gap[] = [];
    const rentalStart = new Date(rental.startDate);
    const rentalEnd = rental.endDate ? new Date(rental.endDate) : null;

    // 1. ACTUAL COVERAGE GAPS (periods not covered by ANY rental period)
    if (rentalPeriods.length > 0 && rentalEnd) {
      const sortedPeriods = [...rentalPeriods]
        .filter(period => period.startDate && period.endDate && !period.isGapPeriod)
        .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

      let currentDate = rentalStart;

      // Gap before first rental period
      const firstPeriod = sortedPeriods[0];
      if (firstPeriod) {
        const firstPeriodStart = new Date(firstPeriod.startDate);
        if (isBefore(currentDate, firstPeriodStart)) {
          const gapDays = differenceInDays(firstPeriodStart, currentDate);
          const gapHours = (firstPeriodStart.getTime() - currentDate.getTime()) / (1000 * 60 * 60);

          // Only consider gaps of more than 1 hour to avoid micro-gaps
          if (gapHours > 1) {
            gaps.push({
              id: `coverage-pre-${firstPeriod.id}`,
              type: 'COVERAGE_GAP',
              severity: gapDays > 7 ? 'HIGH' : gapDays > 1 ? 'MEDIUM' : 'LOW',
              startDate: currentDate,
              endDate: addDays(firstPeriodStart, -1),
              duration: gapDays,
              amount: (parseFloat(firstPeriod.amount) / 30) * gapDays, // Use actual period rate
              reason: 'RENTAL_NOT_STARTED',
              description: `Période non couverte avant le début de la location`,
              impactScore: gapDays * 2,
              suggestions: [
                'Ajuster la date de début de location',
                'Créer une période de couverture',
                'Confirmer les dates avec le patient'
              ],
              affectedPeriodId: firstPeriod.id,
            });
          }
        }
      }

      // Gaps between rental periods
      for (let i = 0; i < sortedPeriods.length - 1; i++) {
        const currentPeriod = sortedPeriods[i];
        const nextPeriod = sortedPeriods[i + 1];
        const currentEnd = new Date(currentPeriod.endDate);
        const nextStart = new Date(nextPeriod.startDate);

        if (isAfter(nextStart, addDays(currentEnd, 1))) {
          const gapStart = addDays(currentEnd, 1);
          const gapEnd = addDays(nextStart, -1);
          const gapDays = differenceInDays(gapEnd, gapStart) + 1;
          const gapHours = (nextStart.getTime() - currentEnd.getTime()) / (1000 * 60 * 60);

          // Only consider gaps of more than 1 hour to avoid micro-gaps
          if (gapHours > 1) {
            gaps.push({
              id: `coverage-between-${currentPeriod.id}-${nextPeriod.id}`,
              type: 'COVERAGE_GAP',
              severity: gapDays > 7 ? 'HIGH' : 'MEDIUM',
              startDate: gapStart,
              endDate: gapEnd,
              duration: gapDays,
              amount: (parseFloat(nextPeriod.amount) / 30) * gapDays,
              reason: 'RENTAL_DISCONTINUITY',
              description: `Gap de couverture entre deux périodes de location`,
              impactScore: gapDays * 1.5,
              suggestions: [
                'Créer une période de transition',
                'Ajuster les dates des périodes',
                'Vérifier la continuité de service'
              ],
              affectedPeriodId: nextPeriod.id,
            });
          }
        }
      }

      // Gap after last rental period
      if (sortedPeriods.length > 0) {
        const lastPeriod = sortedPeriods[sortedPeriods.length - 1];
        const lastPeriodEnd = new Date(lastPeriod.endDate);
        
        if (isAfter(rentalEnd, lastPeriodEnd)) {
          const gapStart = addDays(lastPeriodEnd, 1);
          const gapDays = differenceInDays(rentalEnd, gapStart) + 1;
          const gapHours = (rentalEnd.getTime() - lastPeriodEnd.getTime()) / (1000 * 60 * 60);

          // Only consider gaps of more than 1 hour to avoid micro-gaps
          if (gapHours > 1) {
            gaps.push({
              id: `coverage-post-${lastPeriod.id}`,
              type: 'COVERAGE_GAP',
              severity: gapDays > 7 ? 'HIGH' : gapDays > 1 ? 'MEDIUM' : 'LOW',
              startDate: gapStart,
              endDate: rentalEnd,
              duration: gapDays,
              amount: (parseFloat(lastPeriod.amount) / 30) * gapDays,
              reason: 'RENTAL_ENDED_EARLY',
              description: `Période non couverte après la fin de la dernière période`,
              impactScore: gapDays * 2,
              suggestions: [
                'Étendre la dernière période',
                'Créer une période de clôture',
                'Ajuster la date de fin de location'
              ],
              affectedPeriodId: lastPeriod.id,
            });
          }
        }
      }
    }

    // 2. Check for actual gap periods marked as gaps
    rentalPeriods.forEach(period => {
      if (period.isGapPeriod) {
        const gapStart = new Date(period.startDate);
        const gapEnd = new Date(period.endDate);
        const gapDays = differenceInDays(gapEnd, gapStart) + 1;

        gaps.push({
          id: `marked-gap-${period.id}`,
          type: 'PAYMENT_GAP',
          severity: gapDays > 7 ? 'HIGH' : 'MEDIUM',
          startDate: gapStart,
          endDate: gapEnd,
          duration: gapDays,
          amount: parseFloat(period.amount) || 0,
          reason: period.gapReason || 'PAYMENT_GAP',
          description: `Période marquée comme gap: ${period.gapReason || 'Raison non spécifiée'}`,
          impactScore: gapDays * 1.2,
          suggestions: [
            'Résoudre la cause du gap',
            'Négocier un paiement de rattrapage',
            'Ajuster la facturation'
          ],
          affectedPeriodId: period.id,
        });
      }
    });

    // 3. CNAM Expiry Warnings
    const today = new Date();
    cnamBonds.forEach(bond => {
      if (bond.endDate) {
        const bondEnd = new Date(bond.endDate);
        const daysUntilExpiry = differenceInDays(bondEnd, today);

        if (daysUntilExpiry <= 30 && daysUntilExpiry >= 0) {
          gaps.push({
            id: `expiry-warning-${bond.id}`,
            type: 'CNAM_EXPIRY',
            severity: daysUntilExpiry <= 7 ? 'CRITICAL' : daysUntilExpiry <= 15 ? 'HIGH' : 'MEDIUM',
            startDate: bondEnd,
            endDate: bondEnd,
            duration: 0,
            amount: 0,
            reason: 'CNAM_EXPIRING',
            description: `Le bon CNAM ${bond.bondType} expire dans ${daysUntilExpiry} jour${daysUntilExpiry > 1 ? 's' : ''}`,
            impactScore: (31 - daysUntilExpiry) * 2,
            suggestions: [
              'Préparer le renouvellement CNAM',
              'Contacter la CNAM pour extension',
              'Planifier une évaluation médicale',
              'Informer le patient de l\'expiration'
            ],
            affectedBondId: bond.id,
          });
        }
      }
    });

    return gaps.sort((a, b) => b.impactScore - a.impactScore);
  }, [rental, cnamBonds, rentalPeriods, dailyRate]);

  // Filter gaps by severity
  const filteredGaps = useMemo(() => {
    if (selectedSeverity === 'ALL') return gapAnalysis;
    return gapAnalysis.filter(gap => gap.severity === selectedSeverity);
  }, [gapAnalysis, selectedSeverity]);

  // Statistics
  const stats = useMemo(() => {
    const totalGaps = gapAnalysis.length;
    const criticalGaps = gapAnalysis.filter(g => g.severity === 'CRITICAL').length;
    const highGaps = gapAnalysis.filter(g => g.severity === 'HIGH').length;
    const mediumGaps = gapAnalysis.filter(g => g.severity === 'MEDIUM').length;
    const lowGaps = gapAnalysis.filter(g => g.severity === 'LOW').length;
    
    const totalFinancialImpact = gapAnalysis.reduce((sum, gap) => sum + gap.amount, 0);
    const totalDaysAffected = gapAnalysis.reduce((sum, gap) => sum + gap.duration, 0);
    const avgImpactScore = totalGaps > 0 ? gapAnalysis.reduce((sum, gap) => sum + gap.impactScore, 0) / totalGaps : 0;

    return {
      totalGaps,
      criticalGaps,
      highGaps,
      mediumGaps,
      lowGaps,
      totalFinancialImpact,
      totalDaysAffected,
      avgImpactScore,
    };
  }, [gapAnalysis]);

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'HIGH': return <AlertCircle className="h-4 w-4 text-orange-600" />;
      case 'MEDIUM': return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'LOW': return <CheckCircle className="h-4 w-4 text-blue-600" />;
      default: return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return 'bg-red-100 text-red-800 border-red-200';
      case 'HIGH': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'LOW': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'COVERAGE_GAP': return <Shield className="h-4 w-4" />;
      case 'PAYMENT_GAP': return <DollarSign className="h-4 w-4" />;
      case 'TIMELINE_GAP': return <Calendar className="h-4 w-4" />;
      case 'CNAM_EXPIRY': return <Clock className="h-4 w-4" />;
      default: return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const toggleDetails = (gapId: string) => {
    setShowDetails(prev => ({ ...prev, [gapId]: !prev[gapId] }));
  };

  const getRiskLevel = () => {
    if (stats.criticalGaps > 0) return { level: 'CRITIQUE', color: 'text-red-600', bgColor: 'bg-red-50' };
    if (stats.highGaps > 2) return { level: 'ÉLEVÉ', color: 'text-orange-600', bgColor: 'bg-orange-50' };
    if (stats.mediumGaps > 0) return { level: 'MODÉRÉ', color: 'text-yellow-600', bgColor: 'bg-yellow-50' };
    return { level: 'FAIBLE', color: 'text-green-600', bgColor: 'bg-green-50' };
  };

  const riskLevel = getRiskLevel();

  return (
    <div className="space-y-6">
      {/* Risk Overview */}
      <Card className={`border-2 ${riskLevel.bgColor}`}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingDown className={`h-5 w-5 ${riskLevel.color}`} />
            Analyse Complète des Gaps
            <Badge variant="outline" className={getSeverityColor(stats.criticalGaps > 0 ? 'CRITICAL' : 'MEDIUM')}>
              Risque {riskLevel.level}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{stats.criticalGaps}</div>
              <div className="text-sm text-gray-600">Critiques</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{stats.highGaps}</div>
              <div className="text-sm text-gray-600">Élevés</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{stats.mediumGaps}</div>
              <div className="text-sm text-gray-600">Moyens</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.lowGaps}</div>
              <div className="text-sm text-gray-600">Faibles</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="text-sm text-gray-600">Impact Financier Total</div>
              <div className="text-xl font-bold text-red-600">
                {(stats.totalFinancialImpact || 0).toFixed(2)} TND
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Jours Affectés</div>
              <div className="text-xl font-bold text-orange-600">
                {stats.totalDaysAffected} jours
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Score d'Impact Moyen</div>
              <div className="text-xl font-bold text-gray-600">
                {(stats.avgImpactScore || 0).toFixed(1)}/10
              </div>
              <Progress value={((stats.avgImpactScore || 0) / 10) * 100} className="mt-1" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map(severity => (
          <Button
            key={severity}
            variant={selectedSeverity === severity ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedSeverity(severity)}
            className="flex items-center gap-1"
          >
            {severity !== 'ALL' && getSeverityIcon(severity)}
            {severity === 'ALL' ? 'Tous' : severity}
            {severity !== 'ALL' && (
              <Badge variant="secondary" className="ml-1">
                {severity === 'CRITICAL' && stats.criticalGaps}
                {severity === 'HIGH' && stats.highGaps}
                {severity === 'MEDIUM' && stats.mediumGaps}
                {severity === 'LOW' && stats.lowGaps}
              </Badge>
            )}
          </Button>
        ))}
      </div>

      {/* Gaps List */}
      <div className="space-y-4">
        {filteredGaps.map((gap) => (
          <Card key={gap.id} className="border-l-4" style={{ borderLeftColor: 
            gap.severity === 'CRITICAL' ? '#dc2626' : 
            gap.severity === 'HIGH' ? '#ea580c' : 
            gap.severity === 'MEDIUM' ? '#d97706' : '#2563eb' 
          }}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div className="flex items-start gap-3">
                  <div className="flex items-center gap-2">
                    {getTypeIcon(gap.type)}
                    {getSeverityIcon(gap.severity)}
                  </div>
                  <div>
                    <div className="font-medium">{gap.description}</div>
                    <div className="text-sm text-gray-600 mt-1">
                      {gap.duration > 0 && (
                        <>
                          {format(gap.startDate, 'dd MMM', { locale: fr })} - {format(gap.endDate, 'dd MMM yyyy', { locale: fr })} 
                          <span className="mx-2">•</span>
                          {gap.duration} jour{gap.duration > 1 ? 's' : ''}
                        </>
                      )}
                      {gap.amount > 0 && (
                        <>
                          <span className="mx-2">•</span>
                          <span className="font-medium text-red-600">{(gap.amount || 0).toFixed(2)} TND</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={getSeverityColor(gap.severity)}>
                    {gap.severity}
                  </Badge>
                  <div className="text-sm font-medium text-gray-600">
                    Score: {(gap.impactScore || 0).toFixed(1)}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleDetails(gap.id)}
                  >
                    {showDetails[gap.id] ? 'Masquer' : 'Détails'}
                  </Button>
                </div>
              </div>
            </CardHeader>
            
            {showDetails[gap.id] && (
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="font-medium text-sm text-gray-700 mb-2">Raison du Gap:</div>
                    <div className="text-sm text-gray-600">{gap.reason}</div>
                  </div>
                  
                  {gap.suggestions.length > 0 && (
                    <div>
                      <div className="font-medium text-sm text-gray-700 mb-2">Suggestions d'Action:</div>
                      <ul className="space-y-1">
                        {gap.suggestions.map((suggestion, index) => (
                          <li key={index} className="text-sm text-gray-600 flex items-start gap-2">
                            <Target className="h-3 w-3 mt-0.5 text-blue-600" />
                            {suggestion}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onGapAction?.(gap, 'create_period')}
                    >
                      Créer Période
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onGapAction?.(gap, 'create_bond')}
                    >
                      Créer Bon CNAM
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onGapAction?.(gap, 'notify_patient')}
                    >
                      Notifier Patient
                    </Button>
                  </div>
                </div>
              </CardContent>
            )}
          </Card>
        ))}
      </div>

      {filteredGaps.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {selectedSeverity === 'ALL' ? 'Aucun Gap Détecté' : `Aucun Gap ${selectedSeverity}`}
            </h3>
            <p className="text-gray-600">
              {selectedSeverity === 'ALL' ? 
                'La location semble bien configurée sans gaps majeurs.' :
                `Aucun gap de niveau ${selectedSeverity} n'a été détecté.`
              }
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}