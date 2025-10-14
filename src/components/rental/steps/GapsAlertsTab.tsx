import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { 
  AlertTriangle, 
  Clock,
  CalendarIcon,
  Receipt,
  CreditCard
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RentalTimeline, RentalGap, RentalAlert } from "./types";

interface GapsAlertsTabProps {
  patientStatus: 'ACTIVE' | 'HOSPITALIZED' | 'DECEASED' | 'PAUSED';
  setPatientStatus: (status: 'ACTIVE' | 'HOSPITALIZED' | 'DECEASED' | 'PAUSED') => void;
  showTimeline: boolean;
  setShowTimeline: (show: boolean) => void;
  timeline: RentalTimeline[];
  comprehensiveGaps: RentalGap[];
  upcomingAlerts: RentalAlert[];
  onCreatePaymentPeriodForGap: (gap: RentalGap) => void;
  onInitiateCnamRenewal: (bondId: string) => void;
}

export function GapsAlertsTab({
  patientStatus,
  setPatientStatus,
  showTimeline,
  setShowTimeline,
  timeline,
  comprehensiveGaps,
  upcomingAlerts,
  onCreatePaymentPeriodForGap,
  onInitiateCnamRenewal
}: GapsAlertsTabProps) {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Analyse des Gaps & Alertes</h3>
          <p className="text-sm text-gray-600">Surveillez les périodes non couvertes et les alertes importantes</p>
        </div>
        <Button 
          onClick={() => setShowTimeline(!showTimeline)}
          size="sm" 
          variant="outline"
        >
          <Clock className="h-4 w-4 mr-2" />
          {showTimeline ? 'Masquer' : 'Afficher'} Timeline
        </Button>
      </div>

      {/* Patient Status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Statut du Patient</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Label>État actuel:</Label>
            <Select value={patientStatus} onValueChange={(value: any) => setPatientStatus(value)}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ACTIVE">Actif</SelectItem>
                <SelectItem value="HOSPITALIZED">Hospitalisé</SelectItem>
                <SelectItem value="DECEASED">Décédé</SelectItem>
                <SelectItem value="PAUSED">En pause</SelectItem>
              </SelectContent>
            </Select>
            {patientStatus === 'DECEASED' && (
              <Alert className="flex-1 border-red-200 bg-red-50">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <AlertDescription>
                  Programmer le retour des appareils et clôturer les dossiers CNAM en cours.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Timeline Visualization */}
      {showTimeline && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Timeline de Location</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative">
              {/* Timeline will be generated based on rental details, CNAM bonds, and payment periods */}
              <div className="space-y-4">
                {timeline.map((event, index) => (
                  <div key={index} className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      event.severity === 'error' ? 'bg-red-100' :
                      event.severity === 'warning' ? 'bg-yellow-100' :
                      'bg-blue-100'
                    }`}>
                      {event.type === 'rental_start' && <CalendarIcon className="h-5 w-5" />}
                      {event.type === 'cnam_submission' && <Receipt className="h-5 w-5" />}
                      {event.type === 'gap' && <AlertTriangle className="h-5 w-5" />}
                      {event.type === 'payment' && <CreditCard className="h-5 w-5" />}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">{format(event.date, "dd/MM/yyyy", { locale: fr })}</div>
                      <div className="text-sm text-gray-600">{event.description}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Identified Gaps */}
      <Card className="border-orange-200 bg-orange-50">
        <CardHeader>
          <CardTitle className="text-orange-800 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Gaps Identifiés
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {comprehensiveGaps.length === 0 ? (
              <div className="text-center text-orange-700 py-4">
                <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Aucun gap identifié dans la configuration actuelle</p>
              </div>
            ) : (
              comprehensiveGaps.map((gap, index) => (
                <div key={index} className="border border-orange-300 rounded-lg p-4 bg-white">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <Badge variant={gap.severity === 'high' ? 'destructive' : 'secondary'}>
                        {gap.type.replace('_', ' ').toUpperCase()}
                      </Badge>
                      <h4 className="font-semibold mt-1">{gap.title}</h4>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">{gap.amount?.toFixed(2)} TND</div>
                      <div className="text-xs text-gray-600">{gap.duration} jours</div>
                    </div>
                  </div>
                  <p className="text-sm text-gray-700">{gap.description}</p>
                  <div className="mt-3 flex gap-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => onCreatePaymentPeriodForGap(gap)}
                    >
                      Créer paiement
                    </Button>
                    {gap.type === 'cnam_expiring' && gap.bondId && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => onInitiateCnamRenewal(gap.bondId!)}
                      >
                        Renouveler CNAM
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Upcoming Alerts */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-600" />
            Alertes à Venir
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {upcomingAlerts.length === 0 ? (
              <div className="text-center text-gray-500 py-4">
                <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Aucune alerte programmée</p>
              </div>
            ) : (
              upcomingAlerts.map((alert, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <div className="flex items-center gap-2">
                    <Badge variant={alert.priority === 'high' ? 'destructive' : 'secondary'}>
                      {alert.daysUntil}J
                    </Badge>
                    <span className="text-sm">{alert.message}</span>
                  </div>
                  <Button size="sm" variant="ghost">
                    Planifier
                  </Button>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}