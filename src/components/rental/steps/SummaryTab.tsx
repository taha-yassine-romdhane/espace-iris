import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { format, differenceInDays, addDays } from "date-fns";
import { fr } from "date-fns/locale";
import { 
  Shield, 
  CreditCard, 
  AlertTriangle,
  Calendar,
  Clock,
  Info,
  TrendingUp
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CNAMBondLocation, RentalPaymentPeriod, CNAMStatus, GapReason } from "./types";

interface SummaryTabProps {
  cnamBonds: CNAMBondLocation[];
  paymentPeriods: RentalPaymentPeriod[];
  comprehensiveGaps: any[];
  depositAmount: number;
  depositMethod: string;
  patientStatus: 'ACTIVE' | 'HOSPITALIZED' | 'DECEASED' | 'PAUSED';
  paymentNotes: string;
  setPaymentNotes: (notes: string) => void;
  calculateTotalPaymentAmount: () => number;
  rentalDetails?: any;
  selectedProducts?: any[];
  calculateTotal?: () => number;
}

const cnamStatuses: CNAMStatus[] = [
  { value: 'EN_ATTENTE_APPROBATION', label: 'En attente d\'approbation', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'APPROUVE', label: 'Approuvé', color: 'bg-green-100 text-green-800' },
  { value: 'EN_COURS', label: 'En cours', color: 'bg-blue-100 text-blue-800' },
  { value: 'TERMINE', label: 'Terminé', color: 'bg-gray-100 text-gray-800' },
  { value: 'REFUSE', label: 'Refusé', color: 'bg-red-100 text-red-800' }
];

const gapReasons: GapReason[] = [
  { value: 'CNAM_PENDING', label: 'CNAM en attente d\'approbation' },
  { value: 'CNAM_EXPIRED', label: 'CNAM expiré/terminé' },
  { value: 'PATIENT_PAUSE', label: 'Pause demandée par le patient' },
  { value: 'MAINTENANCE', label: 'Maintenance de l\'appareil' },
  { value: 'OTHER', label: 'Autre raison' }
];

export function SummaryTab({
  cnamBonds,
  paymentPeriods,
  comprehensiveGaps,
  depositAmount,
  depositMethod,
  patientStatus,
  paymentNotes,
  setPaymentNotes,
  calculateTotalPaymentAmount,
  rentalDetails,
  selectedProducts,
  calculateTotal
}: SummaryTabProps) {
  // Calculate coverage analysis
  const calculateCoverageAnalysis = () => {
    if (!calculateTotal) return null;
    
    const dailyRate = calculateTotal();
    const totalCnamAmount = cnamBonds.reduce((sum, bond) => sum + bond.totalAmount, 0);
    const totalGapAmount = paymentPeriods.filter(p => p.isGapPeriod).reduce((sum, p) => sum + p.amount, 0);
    const gapDays = totalGapAmount / dailyRate;
    
    // Days covered by different payment sources (gaps are NOT paid by patient)
    const daysCoveredByDeposit = depositAmount / dailyRate;
    const daysCoveredByCnam = totalCnamAmount / dailyRate;
    const totalDaysCovered = daysCoveredByDeposit + daysCoveredByCnam; // Excluding gaps as they're unpaid
    
    // CNAM renewal alerts
    const renewalAlerts: any[] = [];
    cnamBonds.forEach(bond => {
      if (bond.endDate) {
        const daysUntilExpiry = differenceInDays(new Date(bond.endDate), new Date());
        if (daysUntilExpiry > 0 && daysUntilExpiry <= (bond.renewalReminderDays || 30)) {
          renewalAlerts.push({
            bondNumber: bond.bondNumber,
            daysUntil: daysUntilExpiry,
            expiryDate: bond.endDate,
            reminderDate: addDays(bond.endDate, -(bond.renewalReminderDays || 30))
          });
        }
      }
    });
    
    return {
      dailyRate,
      daysCoveredByDeposit,
      daysCoveredByCnam,
      gapDays,
      totalDaysCovered,
      renewalAlerts,
      totalGapAmount
    };
  };
  
  const coverageAnalysis = calculateCoverageAnalysis();
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Récapitulatif Complet de la Location</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* CNAM Bonds Summary */}
          {cnamBonds.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-semibold flex items-center gap-2">
                <Shield className="h-4 w-4 text-blue-600" />
                Bonds CNAM ({cnamBonds.length})
              </h4>
              {cnamBonds.map((bond, index) => (
                <div key={bond.id} className="flex justify-between items-center p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div>
                    <div className="font-medium">
                      Bond {index + 1}: {bond.bondNumber || 'En cours'}
                    </div>
                    <div className="text-sm text-gray-600">
                      {bond.coveredMonths} mois - {bond.bondType}
                    </div>
                    <div className="text-xs">
                      <Badge className={cnamStatuses.find(s => s.value === bond.status)?.color}>
                        {cnamStatuses.find(s => s.value === bond.status)?.label}
                      </Badge>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">{bond.totalAmount.toFixed(2)} TND</div>
                    {bond.startDate && bond.endDate && (
                      <div className="text-xs text-gray-600">
                        {format(bond.startDate, "dd/MM", { locale: fr })} - {format(bond.endDate, "dd/MM/yyyy", { locale: fr })}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Coverage Analysis */}
          {coverageAnalysis && (
            <div className="space-y-2">
              <h4 className="font-semibold flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-600" />
                Analyse de Couverture
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                  <div className="text-sm text-gray-600">Tarif journalier</div>
                  <div className="font-semibold">{coverageAnalysis.dailyRate.toFixed(2)} TND/jour</div>
                </div>
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="text-sm text-gray-600">Jours couverts par CNAM</div>
                  <div className="font-semibold">{Math.floor(coverageAnalysis.daysCoveredByCnam)} jours</div>
                </div>
                <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                  <div className="text-sm text-gray-600">Jours couverts par caution</div>
                  <div className="font-semibold">{Math.floor(coverageAnalysis.daysCoveredByDeposit)} jours</div>
                </div>
                <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                  <div className="text-sm text-gray-600">Jours de gap (non payés)</div>
                  <div className="font-semibold text-orange-600">{Math.floor(coverageAnalysis.gapDays)} jours</div>
                  <div className="text-xs text-orange-700">En attente CNAM</div>
                </div>
              </div>
              <div className="p-3 bg-gray-100 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Total jours payés</span>
                  <span className="text-lg font-bold text-blue-600">{Math.floor(coverageAnalysis.totalDaysCovered)} jours</span>
                </div>
              </div>
              
              {/* Gap Warning */}
              {coverageAnalysis.gapDays > 0 && (
                <Alert className="border-orange-200 bg-orange-50">
                  <AlertTriangle className="h-4 w-4 text-orange-600" />
                  <AlertDescription>
                    <div className="font-medium mb-1">Risque financier</div>
                    <div className="text-sm">
                      {Math.floor(coverageAnalysis.gapDays)} jours ({coverageAnalysis.totalGapAmount.toFixed(2)} TND) 
                      en attente d'approbation CNAM. Ce montant sera à votre charge si la CNAM refuse.
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {/* CNAM Renewal Alerts */}
          {coverageAnalysis?.renewalAlerts && coverageAnalysis.renewalAlerts.length > 0 && (
            <Alert className="border-yellow-200 bg-yellow-50">
              <Clock className="h-4 w-4 text-yellow-600" />
              <AlertDescription>
                <div className="font-medium mb-2">Alertes de Renouvellement CNAM</div>
                {coverageAnalysis.renewalAlerts.map((alert: any, index: number) => (
                  <div key={index} className="text-sm mb-1">
                    • Bond {alert.bondNumber}: expire dans <strong>{alert.daysUntil} jours</strong> 
                    (le {format(new Date(alert.expiryDate), "dd/MM/yyyy", { locale: fr })})
                    - Rappel prévu le {format(new Date(alert.reminderDate), "dd/MM/yyyy", { locale: fr })}
                  </div>
                ))}
              </AlertDescription>
            </Alert>
          )}

          {/* Payment Periods Summary */}
          <div className="space-y-2">
            <h4 className="font-semibold flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-green-600" />
              Périodes de paiement ({paymentPeriods.length})
            </h4>
            {paymentPeriods.map((period, index) => (
              <div key={period.id} className={`flex justify-between items-center p-3 rounded-lg border ${
                period.isGapPeriod ? 'bg-orange-50 border-orange-200' : 'bg-gray-50 border-gray-200'
              }`}>
                <div>
                  <span className="font-medium">
                    {period.isGapPeriod ? 'Gap' : `Période ${index + 1}`}
                  </span>
                  <div className="text-sm text-gray-600">
                    {format(period.startDate, "dd/MM/yyyy", { locale: fr })} - {format(period.endDate, "dd/MM/yyyy", { locale: fr })}
                  </div>
                  {period.isGapPeriod && (
                    <div className="text-xs text-orange-600">
                      Raison: {gapReasons.find(r => r.value === period.gapReason)?.label}
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <div className="font-semibold">{period.amount.toFixed(2)} TND</div>
                  <div className="text-sm text-gray-600">{period.paymentMethod}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Gaps Summary */}
          {comprehensiveGaps.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-semibold flex items-center gap-2 text-orange-700">
                <AlertTriangle className="h-4 w-4" />
                Gaps Identifiés ({comprehensiveGaps.length})
              </h4>
              <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                {comprehensiveGaps.map((gap, index) => (
                  <div key={index} className="text-sm mb-1">
                    • {gap.title}: {gap.duration} jours ({gap.amount?.toFixed(2)} TND)
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Deposit Summary */}
          {depositAmount > 0 && (
            <div className="space-y-2">
              <h4 className="font-semibold">Caution</h4>
              <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg border border-purple-200">
                <span>Dépôt de garantie</span>
                <div className="text-right">
                  <div className="font-semibold">{depositAmount.toFixed(2)} TND</div>
                  <div className="text-sm text-gray-600">{depositMethod}</div>
                </div>
              </div>
            </div>
          )}

          {/* Financial Summary */}
          <div className="border-t pt-4 space-y-2">
            <div className="flex justify-between items-center">
              <span>Total CNAM</span>
              <span className="font-semibold">
                {cnamBonds.reduce((sum, bond) => sum + bond.totalAmount, 0).toFixed(2)} TND
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span>Total Gaps (Non payés)</span>
              <span className="font-semibold text-orange-600">
                {paymentPeriods.filter(p => p.isGapPeriod).reduce((sum, period) => sum + period.amount, 0).toFixed(2)} TND
              </span>
            </div>
            {depositAmount > 0 && (
              <div className="flex justify-between items-center">
                <span>Caution</span>
                <span className="font-semibold">{depositAmount.toFixed(2)} TND</span>
              </div>
            )}
            <div className="flex justify-between items-center text-lg font-bold pt-2 border-t">
              <span>Total Payé par Patient</span>
              <span className="text-blue-600">{depositAmount.toFixed(2)} TND</span>
            </div>
            <div className="text-sm text-gray-600 mt-1">
              + CNAM: {cnamBonds.reduce((sum, bond) => sum + bond.totalAmount, 0).toFixed(2)} TND (payé directement par CNAM)
            </div>
          </div>

          {/* Patient Status */}
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="font-medium">Statut du Patient</span>
              <Badge variant={patientStatus === 'ACTIVE' ? 'default' : 
                            patientStatus === 'DECEASED' ? 'destructive' : 'secondary'}>
                {patientStatus === 'ACTIVE' ? 'Actif' :
                 patientStatus === 'HOSPITALIZED' ? 'Hospitalisé' :
                 patientStatus === 'DECEASED' ? 'Décédé' : 'En pause'}
              </Badge>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notes générales sur la location</Label>
            <Textarea
              placeholder="Instructions spéciales, conditions de location, informations importantes..."
              value={paymentNotes}
              onChange={(e) => setPaymentNotes(e.target.value)}
              className="min-h-[100px]"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}