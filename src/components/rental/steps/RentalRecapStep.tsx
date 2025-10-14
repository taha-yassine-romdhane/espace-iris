import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { format, differenceInDays } from "date-fns";
import { fr } from "date-fns/locale";
import { 
  Loader2, 
  User, 
  Package, 
  Calendar,
  CreditCard,
  Shield,
  AlertTriangle,
  CheckCircle,
  Clock,
  MapPin,
  Phone,
  FileText,
  TrendingUp,
  AlertCircle,
  Info
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface RentalRecapStepProps {
  selectedClient: any;
  selectedProducts: any[];
  rentalDetails: any;
  paymentData: any;
  calculateTotal: () => number;
  onBack: () => void;
  onFinalize: () => void;
  isSubmitting: boolean;
}

export function RentalRecapStep({
  selectedClient,
  selectedProducts,
  rentalDetails,
  paymentData,
  calculateTotal,
  onBack,
  onFinalize,
  isSubmitting
}: RentalRecapStepProps) {
  const [finalNotes, setFinalNotes] = useState("");

  // Use gap periods from Step 4 instead of recalculating
  const autoCalculatedGaps = paymentData?.paymentPeriods?.filter((p: any) => p.isGapPeriod).map((period: any) => ({
    type: period.gapReason === 'CNAM_PENDING' ? 'pre_cnam' : 'post_cnam',
    title: period.gapReason === 'CNAM_PENDING' ? 'Gap avant couverture CNAM' : 'Gap après couverture CNAM',
    startDate: period.startDate,
    endDate: period.endDate,
    duration: differenceInDays(period.endDate, period.startDate),
    amount: period.amount,
    severity: period.gapReason === 'CNAM_PENDING' ? 'high' : 'medium',
    bondRef: period.notes || 'Période de gap'
  })) || [];
  
  // Calculate patient payments using validated payment periods from Step 4
  const gapPayments = paymentData?.paymentPeriods?.filter((p: any) => p.isGapPeriod).reduce((sum: number, period: any) => sum + period.amount, 0) || 0;
  const totalGapAmount = gapPayments;

  // Calculate financial summary
  const totalCnamAmount = paymentData?.cnamBonds?.reduce((sum: number, bond: any) => sum + bond.totalAmount, 0) || 0;
  const totalDirectPayments = paymentData?.paymentPeriods?.filter((p: any) => !p.isGapPeriod).reduce((sum: number, period: any) => sum + period.amount, 0) || 0;
  const depositAmount = paymentData?.depositAmount || 0;
  const totalPatientPayment = depositAmount + gapPayments; // Patient pays deposit + gaps
  const totalExpectedRevenue = totalCnamAmount + depositAmount + gapPayments; // Include all payments

  // Get alerts and important dates
  const getImportantDates = () => {
    const dates: any[] = [];
    
    // Rental dates
    if (rentalDetails?.globalStartDate) {
      dates.push({
        date: new Date(rentalDetails.globalStartDate),
        type: 'rental_start',
        description: 'Début de location',
        priority: 'high'
      });
    }
    
    if (rentalDetails?.globalEndDate && !rentalDetails?.isGlobalOpenEnded) {
      dates.push({
        date: new Date(rentalDetails.globalEndDate),
        type: 'rental_end',
        description: 'Fin de location prévue',
        priority: 'medium'
      });
    }
    
    // CNAM dates
    paymentData?.cnamBonds?.forEach((bond: any) => {
      if (bond.submissionDate) {
        dates.push({
          date: new Date(bond.submissionDate),
          type: 'cnam_submission',
          description: `Soumission CNAM - ${bond.bondType}`,
          priority: 'medium'
        });
      }
      
      if (bond.endDate) {
        const daysUntil = differenceInDays(new Date(bond.endDate), new Date());
        dates.push({
          date: new Date(bond.endDate),
          type: 'cnam_expiry',
          description: `Expiration CNAM - ${bond.bondType}`,
          priority: daysUntil <= 30 ? 'high' : 'medium'
        });
      }
    });
    
    return dates.sort((a, b) => a.date.getTime() - b.date.getTime());
  };

  const importantDates = getImportantDates();

  return (
    <div className="flex flex-col h-full">
      {/* Header - Fixed */}
      <div className="flex-shrink-0 mb-6">
        <h2 className="text-xl font-semibold text-blue-900 mb-2">
          Récapitulatif Complet de la Location
        </h2>
        <p className="text-gray-600">
          Vérifiez tous les détails avant de finaliser la création de la location
        </p>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto space-y-6 pr-2">

      {/* Critical Alerts */}
      {(autoCalculatedGaps.length > 0 || paymentData?.patientStatus !== 'ACTIVE') && (
        <Alert className="border-orange-200 bg-orange-50">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <AlertDescription>
            <div className="space-y-1">
              {autoCalculatedGaps.length > 0 && (
                <p><strong>Gaps détectés:</strong> {autoCalculatedGaps.length} période(s) non couvertes par CNAM ({totalGapAmount.toFixed(2)} TND)</p>
              )}
              {paymentData?.patientStatus !== 'ACTIVE' && (
                <p><strong>Statut patient:</strong> {paymentData.patientStatus} - Attention particulière requise</p>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Client Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-blue-600" />
              Informations Client
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <div className="font-semibold">{selectedClient?.firstName} {selectedClient?.lastName}</div>
              <div className="text-sm text-gray-600">
                {selectedClient?.type === 'PATIENT' ? 'Patient' : 'Société'}
              </div>
            </div>
            
            {selectedClient?.cnamId && (
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-green-600" />
                <span className="text-sm">CNAM: {selectedClient.cnamId}</span>
              </div>
            )}
            
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Phone className="h-4 w-4" />
              {selectedClient?.telephone}
            </div>
            
            <div className="flex items-start gap-2 text-sm text-gray-600">
              <MapPin className="h-4 w-4 mt-0.5" />
              <span>{selectedClient?.address}</span>
            </div>
          </CardContent>
        </Card>

        {/* Rental Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              Aperçu de la Location
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <div className="text-sm text-gray-600">Début</div>
              <div className="font-semibold">
                {rentalDetails?.globalStartDate ? 
                  format(new Date(rentalDetails.globalStartDate), "dd MMMM yyyy", { locale: fr }) :
                  "Non défini"
                }
              </div>
            </div>
            
            <div>
              <div className="text-sm text-gray-600">Fin</div>
              <div className="font-semibold">
                {rentalDetails?.isGlobalOpenEnded ? 
                  "Durée indéterminée" :
                  rentalDetails?.globalEndDate ?
                    format(new Date(rentalDetails.globalEndDate), "dd MMMM yyyy", { locale: fr }) :
                    "Non définie"
                }
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {rentalDetails?.urgentRental && (
                <Badge variant="destructive">Urgent</Badge>
              )}
              {selectedClient?.cnamId && (
                <Badge variant="secondary">CNAM Éligible</Badge>
              )}
              <Badge variant="outline">
                {selectedProducts.length} produit{selectedProducts.length > 1 ? 's' : ''}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Products Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-blue-600" />
            Produits Loués ({selectedProducts.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {selectedProducts.map((product, index) => (
              <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <div>
                  <div className="font-medium">{product.name}</div>
                  <div className="text-sm text-gray-600">
                    {product.type === 'MEDICAL_DEVICE' ? 'Appareil Médical' : 'Accessoire'} • Qté: {product.quantity}
                  </div>
                  
                  {/* Device Parameters */}
                  {product.parameters && Object.keys(product.parameters).length > 0 && (
                    <div className="mt-2 p-2 bg-white rounded border border-gray-200">
                      <div className="text-xs font-medium text-gray-700 mb-1">Paramètres configurés:</div>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-600">
                        {/* CPAP Parameters */}
                        {product.parameters.pression && (
                          <div><span className="font-medium">Pression:</span> {product.parameters.pression}</div>
                        )}
                        {product.parameters.pressionRampe && (
                          <div><span className="font-medium">Pression Rampe:</span> {product.parameters.pressionRampe}</div>
                        )}
                        {product.parameters.dureeRampe && (
                          <div><span className="font-medium">Durée Rampe:</span> {product.parameters.dureeRampe} min</div>
                        )}
                        {product.parameters.epr && (
                          <div><span className="font-medium">EPR:</span> {product.parameters.epr}</div>
                        )}
                        
                        {/* VNI Parameters */}
                        {product.parameters.ipap && (
                          <div><span className="font-medium">IPAP:</span> {product.parameters.ipap}</div>
                        )}
                        {product.parameters.epap && (
                          <div><span className="font-medium">EPAP:</span> {product.parameters.epap}</div>
                        )}
                        {product.parameters.aid && (
                          <div><span className="font-medium">AID:</span> {product.parameters.aid}</div>
                        )}
                        {product.parameters.frequenceRespiratoire && (
                          <div><span className="font-medium">Fréquence Resp.:</span> {product.parameters.frequenceRespiratoire}</div>
                        )}
                        {product.parameters.volumeCourant && (
                          <div><span className="font-medium">Volume Courant:</span> {product.parameters.volumeCourant}</div>
                        )}
                        {product.parameters.mode && (
                          <div><span className="font-medium">Mode:</span> {product.parameters.mode}</div>
                        )}
                        
                        {/* Concentrateur & Bouteille Parameters */}
                        {product.parameters.debit && (
                          <div><span className="font-medium">Débit:</span> {product.parameters.debit}</div>
                        )}
                        
                        {/* Auto options */}
                        {product.parameters.autoPression && (
                          <div className="col-span-2"><span className="font-medium">Auto Pression:</span> Activé</div>
                        )}
                        {product.parameters.autoRampe && (
                          <div className="col-span-2"><span className="font-medium">Auto Rampe:</span> Activé</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <div className="font-semibold">{(parseFloat(product.rentalPrice) || 0).toFixed(2)} TND</div>
                  <div className="text-sm text-gray-600">par unité</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* CNAM Bonds */}
      {paymentData?.cnamBonds && paymentData.cnamBonds.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-blue-600" />
              Bonds CNAM ({paymentData.cnamBonds.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {paymentData.cnamBonds.map((bond: any, index: number) => (
                <div key={bond.id} className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium">{bond.bondNumber || `Bond ${index + 1}`}</div>
                      <div className="text-sm text-gray-600">{bond.bondType} • {bond.coveredMonths} mois</div>
                      {bond.startDate && bond.endDate && (
                        <div className="text-sm text-blue-600">
                          {format(new Date(bond.startDate), "dd/MM", { locale: fr })} - {format(new Date(bond.endDate), "dd/MM/yyyy", { locale: fr })}
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">{bond.totalAmount.toFixed(2)} TND</div>
                      <Badge className="mt-1 text-xs">
                        {bond.status === 'EN_ATTENTE_APPROBATION' ? 'En attente' :
                         bond.status === 'APPROUVE' ? 'Approuvé' : bond.status}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Auto-Calculated Gaps */}
      {autoCalculatedGaps.length > 0 && (
        <Card className="border-orange-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-700">
              <AlertTriangle className="h-5 w-5" />
              Gaps Auto-Calculés ({autoCalculatedGaps.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {autoCalculatedGaps.map((gap: any, index: number) => (
                <div key={index} className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium text-orange-800">{gap.title}</div>
                      <div className="text-sm text-gray-600">
                        {format(gap.startDate, "dd/MM", { locale: fr })} - {format(gap.endDate, "dd/MM/yyyy", { locale: fr })} 
                        • {gap.duration} jours
                      </div>
                      <div className="text-sm text-orange-600">Référence: {gap.bondRef}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-orange-700">{gap.amount.toFixed(2)} TND</div>
                      <Badge variant={gap.severity === 'high' ? 'destructive' : 'secondary'}>
                        {gap.severity === 'high' ? 'Critique' : 'Important'}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Financial Summary */}
      <Card className="border-green-200 bg-green-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-900">
            <TrendingUp className="h-5 w-5" />
            Résumé Financier
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <div className="text-sm font-medium text-gray-700 mb-2">Paiements confirmés:</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Caution (payée par patient)</div>
              <div className="font-semibold text-blue-600">{depositAmount.toFixed(2)} TND</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">CNAM (payé directement)</div>
              <div className="font-semibold text-green-600">{totalCnamAmount.toFixed(2)} TND</div>
            </div>
            
            {totalGapAmount > 0 && (
              <>
                <div className="col-span-2 mt-2">
                  <div className="text-sm font-medium text-gray-700 mb-2">En attente:</div>
                </div>
                <div className="col-span-2">
                  <div className="text-sm text-gray-600">Gaps CNAM (non payés)</div>
                  <div className="font-semibold text-orange-600">{totalGapAmount.toFixed(2)} TND</div>
                  <div className="text-xs text-orange-700">Risque à votre charge si CNAM refuse</div>
                </div>
              </>
            )}
          </div>
          
          <Separator />
          
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="font-medium">Total payé par patient:</span>
              <span className="font-bold text-blue-600">{totalPatientPayment.toFixed(2)} TND</span>
            </div>
            <div className="text-xs text-gray-600 ml-4 mb-2">
              Caution: {depositAmount.toFixed(2)} TND + Gaps: {gapPayments.toFixed(2)} TND
            </div>
            <div className="flex justify-between items-center">
              <span className="font-medium">Total attendu (Patient + CNAM):</span>
              <span className="font-bold text-green-700">{totalExpectedRevenue.toFixed(2)} TND</span>
            </div>
            {totalGapAmount > 0 && (
              <div className="flex justify-between items-center text-sm text-orange-600">
                <span>+ Risque gap CNAM:</span>
                <span className="font-medium">{totalGapAmount.toFixed(2)} TND</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Important Dates Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-600" />
            Dates Importantes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {importantDates.map((dateItem, index) => (
              <div key={index} className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${
                  dateItem.priority === 'high' ? 'bg-red-500' : 'bg-blue-500'
                }`} />
                <div className="flex-1">
                  <div className="text-sm font-medium">
                    {format(dateItem.date, "dd MMMM yyyy", { locale: fr })}
                  </div>
                  <div className="text-sm text-gray-600">{dateItem.description}</div>
                </div>
                {dateItem.type === 'cnam_expiry' && differenceInDays(dateItem.date, new Date()) <= 30 && (
                  <Badge variant="destructive">Urgent</Badge>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Final Notes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            Notes Finales
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {rentalDetails?.notes && (
              <div>
                <Label className="text-sm font-medium">Notes de configuration:</Label>
                <p className="text-sm text-gray-600 mt-1">{rentalDetails.notes}</p>
              </div>
            )}
            
            {paymentData?.notes && (
              <div>
                <Label className="text-sm font-medium">Notes de paiement:</Label>
                <p className="text-sm text-gray-600 mt-1">{paymentData.notes}</p>
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="final-notes">Instructions supplémentaires</Label>
              <Textarea
                id="final-notes"
                placeholder="Ajoutez des instructions spéciales, rappels, ou informations importantes pour cette location..."
                value={finalNotes}
                onChange={(e) => setFinalNotes(e.target.value)}
                className="min-h-[100px]"
              />
            </div>
          </div>
        </CardContent>
      </Card>
      </div>

      {/* Navigation - Fixed at bottom */}
      <div className="flex-shrink-0 flex justify-between pt-4 border-t bg-white">
        <Button type="button" variant="outline" onClick={onBack}>
          ← Retour aux paiements
        </Button>
        <Button 
          onClick={onFinalize}
          disabled={isSubmitting}
          className="bg-green-600 hover:bg-green-700 text-white"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Création en cours...
            </>
          ) : (
            <>
              <CheckCircle className="mr-2 h-4 w-4" />
              Finaliser la Location
            </>
          )}
        </Button>
      </div>
    </div>
  );
}