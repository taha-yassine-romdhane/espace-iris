import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, addDays, addMonths } from "date-fns";
import { fr } from "date-fns/locale";
import { 
  CalendarIcon, 
  Plus,
  Minus,
  Info
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RentalPaymentPeriod, GapReason } from "./types";

interface PaymentPeriodsTabProps {
  paymentPeriods: RentalPaymentPeriod[];
  setPaymentPeriods: (periods: RentalPaymentPeriod[]) => void;
  activePaymentPeriod: string;
  setActivePaymentPeriod: (periodId: string) => void;
  selectedClient: any;
  selectedProducts: any[];
  calculateTotal: () => number;
}

const gapReasons: GapReason[] = [
  { value: 'CNAM_PENDING', label: 'CNAM en attente d\'approbation' },
  { value: 'CNAM_EXPIRED', label: 'CNAM expiré/terminé' },
  { value: 'PATIENT_PAUSE', label: 'Pause demandée par le patient' },
  { value: 'MAINTENANCE', label: 'Maintenance de l\'appareil' },
  { value: 'OTHER', label: 'Autre raison' }
];

export function PaymentPeriodsTab({
  paymentPeriods,
  setPaymentPeriods,
  activePaymentPeriod,
  setActivePaymentPeriod,
  selectedClient,
  selectedProducts,
  calculateTotal
}: PaymentPeriodsTabProps) {
  // Add new payment period
  const addPaymentPeriod = () => {
    const lastPeriod = paymentPeriods[paymentPeriods.length - 1];
    const startDate = lastPeriod ? addDays(lastPeriod.endDate, 1) : new Date();
    const endDate = addMonths(startDate, 1);
    
    const newPeriod: RentalPaymentPeriod = {
      id: `period-${Date.now()}`,
      productIds: selectedProducts.map(p => p.id),
      startDate,
      endDate,
      amount: calculateTotal() / 12, // Monthly amount
      paymentMethod: 'CASH',
      isGapPeriod: false,
      notes: ''
    };

    setPaymentPeriods([...paymentPeriods, newPeriod]);
    setActivePaymentPeriod(newPeriod.id);
  };

  // Remove payment period
  const removePaymentPeriod = (periodId: string) => {
    const updatedPeriods = paymentPeriods.filter(p => p.id !== periodId);
    setPaymentPeriods(updatedPeriods);
    if (activePaymentPeriod === periodId && updatedPeriods.length > 0) {
      setActivePaymentPeriod(updatedPeriods[0].id);
    }
  };

  // Update payment period
  const updatePaymentPeriod = (periodId: string, updates: Partial<RentalPaymentPeriod>) => {
    const updatedPeriods = paymentPeriods.map(period => 
      period.id === periodId ? { ...period, ...updates } : period
    );
    setPaymentPeriods(updatedPeriods);
  };

  const activePeriod = paymentPeriods.find(p => p.id === activePaymentPeriod);

  return (
    <div className="space-y-4">
      {/* Payment Periods List */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Périodes de Paiement</h3>
        <Button onClick={addPaymentPeriod} size="sm" variant="outline">
          <Plus className="h-4 w-4 mr-2" />
          Ajouter une période
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Period List */}
        <div className="space-y-2">
          {paymentPeriods.map((period, index) => (
            <Card 
              key={period.id}
              className={`cursor-pointer transition-all ${
                activePaymentPeriod === period.id 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => setActivePaymentPeriod(period.id)}
            >
              <CardContent className="p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={period.isGapPeriod ? 'destructive' : 'default'}>
                        {period.isGapPeriod ? 'Gap' : `Période ${index + 1}`}
                      </Badge>
                      {period.paymentMethod === 'CNAM' && (
                        <Badge variant="secondary">
                          CNAM
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm text-gray-600">
                      {format(period.startDate, "dd/MM/yyyy", { locale: fr })} - {format(period.endDate, "dd/MM/yyyy", { locale: fr })}
                    </div>
                    <div className="font-semibold text-blue-600">
                      {period.amount.toFixed(2)} TND
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      removePaymentPeriod(period.id);
                    }}
                    className="text-red-600 hover:text-red-800"
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Period Details */}
        {activePeriod && (
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Configuration de la Période
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Date Range */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Date de début</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {format(activePeriod.startDate, "dd/MM/yyyy", { locale: fr })}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={activePeriod.startDate}
                          onSelect={(date) => {
                            if (date) {
                              updatePaymentPeriod(activePeriod.id, { startDate: date });
                            }
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <Label>Date de fin</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {format(activePeriod.endDate, "dd/MM/yyyy", { locale: fr })}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={activePeriod.endDate}
                          onSelect={(date) => {
                            if (date) {
                              updatePaymentPeriod(activePeriod.id, { endDate: date });
                            }
                          }}
                          disabled={(date) => date < activePeriod.startDate}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                {/* Amount and Payment Method */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Montant (TND)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={activePeriod.amount}
                      onChange={(e) => updatePaymentPeriod(activePeriod.id, { 
                        amount: parseFloat(e.target.value) || 0 
                      })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Méthode de paiement</Label>
                    <Select
                      value={activePeriod.paymentMethod}
                      onValueChange={(value) => updatePaymentPeriod(activePeriod.id, { 
                        paymentMethod: value as any 
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CASH">Espèces</SelectItem>
                        <SelectItem value="CHEQUE">Chèque</SelectItem>
                        <SelectItem value="VIREMENT">Virement</SelectItem>
                        <SelectItem value="TRAITE">Traite</SelectItem>
                        {selectedClient?.cnamId && (
                          <SelectItem value="CNAM">CNAM (Bond de Location)</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* CNAM Configuration moved to dedicated CNAM Bonds tab */}
                {activePeriod.paymentMethod === 'CNAM' && (
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center gap-2">
                      <Info className="h-4 w-4 text-blue-600" />
                      <span className="text-sm text-blue-800">
                        Pour configurer les détails CNAM, utilisez l'onglet "Bonds CNAM" ci-dessus.
                      </span>
                    </div>
                  </div>
                )}

                {/* Gap Period Configuration */}
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={activePeriod.isGapPeriod}
                    onCheckedChange={(checked) => updatePaymentPeriod(activePeriod.id, { 
                      isGapPeriod: checked 
                    })}
                  />
                  <Label>Période de gap (non couverte par CNAM)</Label>
                </div>

                {activePeriod.isGapPeriod && (
                  <div className="space-y-2">
                    <Label>Raison du gap</Label>
                    <Select
                      value={activePeriod.gapReason || ''}
                      onValueChange={(value) => updatePaymentPeriod(activePeriod.id, { 
                        gapReason: value as any 
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner la raison" />
                      </SelectTrigger>
                      <SelectContent>
                        {gapReasons.map((reason) => (
                          <SelectItem key={reason.value} value={reason.value}>
                            {reason.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Notes */}
                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea
                    placeholder="Notes spécifiques à cette période..."
                    value={activePeriod.notes || ''}
                    onChange={(e) => updatePaymentPeriod(activePeriod.id, { 
                      notes: e.target.value 
                    })}
                    className="min-h-[80px]"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}