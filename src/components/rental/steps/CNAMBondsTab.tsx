import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, addMonths } from "date-fns";
import { fr } from "date-fns/locale";
import { 
  CalendarIcon, 
  Shield,
  CheckCircle,
  Plus,
  Minus,
  Info,
  X
} from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CNAMBondLocation, CNAMBondType, CNAMStatus, PredefinedBond } from "./types";

interface CNAMBondsTabProps {
  cnamBonds: CNAMBondLocation[];
  setCnamBonds: (bonds: CNAMBondLocation[]) => void;
  activeCnamBond: string;
  setActiveCnamBond: (bondId: string) => void;
  selectedClient: any;
  selectedProducts: any[];
  onAutoGeneratePaymentPeriods: () => void;
  onRemoveDuplicates?: () => void;
  paymentPeriodsCount?: number;
}

// CNAM Bond types for rental - Only Oxygène and VNI as per user requirements
const cnamBondTypes: CNAMBondType[] = [
  { value: 'CONCENTRATEUR_OXYGENE', label: 'Concentrateur Oxygène' },
  { value: 'VNI', label: 'VNI (Ventilation Non Invasive)' }
];

// Predefined CNAM rental bonds - Only Oxygène and VNI with 1 month each
const predefinedBonds: PredefinedBond[] = [
  {
    id: 'concentrateur-1m',
    bondType: 'CONCENTRATEUR_OXYGENE',
    label: 'Concentrateur Oxygène - 1 mois',
    coveredMonths: 1,
    totalAmount: 190
  },
  {
    id: 'vni-1m',
    bondType: 'VNI',
    label: 'VNI - 1 mois',
    coveredMonths: 1,
    totalAmount: 430
  }
];

const cnamStatuses: CNAMStatus[] = [
  { value: 'EN_ATTENTE_APPROBATION', label: 'En attente d\'approbation', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'APPROUVE', label: 'Approuvé', color: 'bg-green-100 text-green-800' },
  { value: 'EN_COURS', label: 'En cours', color: 'bg-blue-100 text-blue-800' },
  { value: 'TERMINE', label: 'Terminé', color: 'bg-gray-100 text-gray-800' },
  { value: 'REFUSE', label: 'Refusé', color: 'bg-red-100 text-red-800' }
];

export function CNAMBondsTab({
  cnamBonds,
  setCnamBonds,
  activeCnamBond,
  setActiveCnamBond,
  selectedClient,
  selectedProducts,
  onAutoGeneratePaymentPeriods,
  onRemoveDuplicates,
  paymentPeriodsCount = 0
}: CNAMBondsTabProps) {
  // Create bond from predefined template
  const createBondFromTemplate = (templateId: string) => {
    const template = predefinedBonds.find(t => t.id === templateId);
    if (!template) return;

    const newBond: CNAMBondLocation = {
      id: `bond-${Date.now()}`,
      bondNumber: '',
      bondType: template.bondType as any,
      productIds: selectedProducts.map(p => p.id),
      status: 'EN_ATTENTE_APPROBATION',
      monthlyAmount: template.totalAmount / template.coveredMonths,
      coveredMonths: template.coveredMonths,
      totalAmount: template.totalAmount,
      renewalReminderDays: 30,
      submissionDate: new Date(),
      notes: `Bond prédéfini: ${template.label}`
    };

    setCnamBonds([...cnamBonds, newBond]);
    setActiveCnamBond(newBond.id);
    
    toast({
      title: "Bond créé",
      description: `Bond ${template.label} créé avec succès. Vous pouvez maintenant personnaliser les détails.`
    });
  };

  const createNewCnamBond = () => {
    const newBond: CNAMBondLocation = {
      id: `bond-${Date.now()}`,
      bondNumber: '',
      bondType: 'CONCENTRATEUR_OXYGENE',
      productIds: selectedProducts.map(p => p.id),
      status: 'EN_ATTENTE_APPROBATION',
      monthlyAmount: 190, // Default to 1-month concentrator rate
      coveredMonths: 1,
      totalAmount: 190,
      renewalReminderDays: 30,
      submissionDate: new Date()
    };
    setCnamBonds([...cnamBonds, newBond]);
    setActiveCnamBond(newBond.id);
  };

  const removeCnamBond = (bondId: string) => {
    setCnamBonds(cnamBonds.filter(b => b.id !== bondId));
    if (activeCnamBond === bondId) {
      setActiveCnamBond('');
    }
  };

  const updateCnamBond = (bondId: string, updates: Partial<CNAMBondLocation>) => {
    const updatedBonds = cnamBonds.map(bond => 
      bond.id === bondId ? { ...bond, ...updates } : bond
    );
    setCnamBonds(updatedBonds);
  };

  const activeBond = cnamBonds.find(b => b.id === activeCnamBond);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Bonds de Location CNAM</h3>
          <p className="text-sm text-gray-600">Gérez les bonds CNAM pour la prise en charge de la location</p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={onAutoGeneratePaymentPeriods}
            size="sm" 
            variant="outline"
            disabled={cnamBonds.length === 0}
            className="bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Auto-Calculer Gaps
          </Button>
          {onRemoveDuplicates && paymentPeriodsCount > 0 && (
            <Button 
              onClick={onRemoveDuplicates}
              size="sm" 
              variant="outline"
              className="bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100"
            >
              <X className="h-4 w-4 mr-2" />
              Supprimer Doublons ({paymentPeriodsCount})
            </Button>
          )}
          <Button 
            onClick={createNewCnamBond}
            size="sm" 
            variant="outline"
            disabled={!selectedClient?.cnamId}
          >
            <Plus className="h-4 w-4 mr-2" />
            Nouveau Bond CNAM
          </Button>
        </div>
      </div>

      {!selectedClient?.cnamId && (
        <Alert className="border-yellow-200 bg-yellow-50">
          <Info className="h-4 w-4 text-yellow-600" />
          <AlertDescription>
            Ce client n'est pas éligible CNAM. Les bonds de location CNAM ne sont disponibles que pour les patients affiliés à la CNAM.
          </AlertDescription>
        </Alert>
      )}

      {/* Auto-calculation Info */}
      {cnamBonds.length > 0 && (
        <Alert className="border-green-200 bg-green-50">
          <Info className="h-4 w-4 text-green-600" />
          <AlertDescription>
            <strong>Calcul automatique des gaps:</strong> Une fois vos bonds CNAM configurés avec les dates de début et fin de couverture, 
            cliquez sur "Auto-Calculer Gaps" pour générer automatiquement les périodes de paiement pour les gaps avant et après la couverture CNAM.
          </AlertDescription>
        </Alert>
      )}

      {/* Quick Bond Selection - Compact */}
      {selectedClient?.cnamId && (
        <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-blue-600" />
            <Label className="text-sm font-medium text-blue-900">Bonds Prédéfinis CNAM:</Label>
          </div>
          <Select value="" onValueChange={(value) => createBondFromTemplate(value)}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Sélectionner un bond standard..." />
            </SelectTrigger>
            <SelectContent>
              {predefinedBonds.map((bond) => (
                <SelectItem key={bond.id} value={bond.id}>
                  <div className="flex flex-col">
                    <div className="font-medium">{bond.label}</div>
                    <div className="text-xs text-gray-500">
                      {bond.coveredMonths} mois • {bond.totalAmount} TND ({(bond.totalAmount / bond.coveredMonths).toFixed(2)} TND/mois)
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* CNAM Bonds List */}
        <div className="space-y-2">
          {cnamBonds.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="p-4 text-center text-gray-500">
                <Shield className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                <p className="text-sm">Aucun bond CNAM configuré</p>
              </CardContent>
            </Card>
          ) : (
            cnamBonds.map((bond, index) => (
              <Card 
                key={bond.id}
                className={`cursor-pointer transition-all ${
                  activeCnamBond === bond.id 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setActiveCnamBond(bond.id)}
              >
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="default">Bond {index + 1}</Badge>
                        <Badge className={cnamStatuses.find(s => s.value === bond.status)?.color}>
                          {cnamStatuses.find(s => s.value === bond.status)?.label}
                        </Badge>
                      </div>
                      {bond.bondNumber && (
                        <div className="text-sm font-medium">{bond.bondNumber}</div>
                      )}
                      <div className="text-xs text-gray-600">
                        {bond.coveredMonths} mois - {bond.totalAmount.toFixed(2)} TND
                      </div>
                      {bond.endDate && (
                        <div className="text-xs text-red-600">
                          Expire: {format(bond.endDate, "dd/MM/yyyy", { locale: fr })}
                        </div>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeCnamBond(bond.id);
                      }}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* CNAM Bond Details */}
        {activeBond && (
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Configuration du Bond CNAM</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Bond Information */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Type de Bond</Label>
                    <Select
                      value={activeBond.bondType}
                      onValueChange={(value) => {
                        updateCnamBond(activeBond.id, { bondType: value as any });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {cnamBondTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Statut du Bond</Label>
                    <Select
                      value={activeBond.status}
                      onValueChange={(value) => {
                        updateCnamBond(activeBond.id, { status: value as any });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {cnamStatuses.map((status) => (
                          <SelectItem key={status.value} value={status.value}>
                            {status.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Bond Numbers */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Numéro du Bond</Label>
                    <Input
                      placeholder="BL-2024-001234"
                      value={activeBond.bondNumber}
                      onChange={(e) => {
                        updateCnamBond(activeBond.id, { bondNumber: e.target.value });
                      }}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Numéro de Dossier CNAM</Label>
                    <Input
                      placeholder="DOSS-2024-001234"
                      value={activeBond.dossierNumber || ''}
                      onChange={(e) => {
                        updateCnamBond(activeBond.id, { dossierNumber: e.target.value });
                      }}
                    />
                  </div>
                </div>

                {/* Important Dates */}
                <div className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="font-semibold text-blue-900">Dates Importantes</h4>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Date de Soumission</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="w-full justify-start">
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {activeBond.submissionDate ? 
                              format(activeBond.submissionDate, "dd/MM/yyyy", { locale: fr }) : 
                              "Sélectionner"
                            }
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={activeBond.submissionDate}
                            onSelect={(date) => {
                              updateCnamBond(activeBond.id, { submissionDate: date });
                            }}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div className="space-y-2">
                      <Label>Date d'Approbation</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button 
                            variant="outline" 
                            className="w-full justify-start"
                            disabled={activeBond.status !== 'APPROUVE'}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {activeBond.approvalDate ? 
                              format(activeBond.approvalDate, "dd/MM/yyyy", { locale: fr }) : 
                              "Non approuvé"
                            }
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={activeBond.approvalDate}
                            onSelect={(date) => {
                              updateCnamBond(activeBond.id, { approvalDate: date });
                            }}
                            disabled={(date) => activeBond.submissionDate ? date < activeBond.submissionDate : false}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Date de Début de Couverture</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button 
                            variant="outline" 
                            className="w-full justify-start"
                            disabled={activeBond.status !== 'APPROUVE'}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {activeBond.startDate ? 
                              format(activeBond.startDate, "dd/MM/yyyy", { locale: fr }) : 
                              "Sélectionner"
                            }
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={activeBond.startDate}
                            onSelect={(date) => {
                              updateCnamBond(activeBond.id, { startDate: date });
                            }}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div className="space-y-2">
                      <Label>Date de Fin de Couverture</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button 
                            variant="outline" 
                            className="w-full justify-start"
                            disabled={!activeBond.startDate}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {activeBond.endDate ? 
                              format(activeBond.endDate, "dd/MM/yyyy", { locale: fr }) : 
                              "Calculer automatiquement"
                            }
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={activeBond.endDate}
                            onSelect={(date) => {
                              updateCnamBond(activeBond.id, { endDate: date });
                            }}
                            disabled={(date) => activeBond.startDate ? date <= activeBond.startDate : false}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                </div>

                {/* Coverage Details */}
                <div className="space-y-4">
                  <h4 className="font-semibold">Détails de la Couverture</h4>
                  
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Mois Couverts</Label>
                      <Input
                        type="number"
                        min="1"
                        max="12"
                        value={activeBond.coveredMonths}
                        onChange={(e) => {
                          const months = parseInt(e.target.value) || 1;
                          updateCnamBond(activeBond.id, { 
                            coveredMonths: months,
                            totalAmount: activeBond.monthlyAmount * months,
                            endDate: activeBond.startDate ? addMonths(activeBond.startDate, months) : undefined
                          });
                        }}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Montant Mensuel (TND)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={activeBond.monthlyAmount}
                        onChange={(e) => {
                          const amount = parseFloat(e.target.value) || 0;
                          updateCnamBond(activeBond.id, { 
                            monthlyAmount: amount,
                            totalAmount: amount * activeBond.coveredMonths
                          });
                        }}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Montant Total (TND)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={activeBond.totalAmount}
                        disabled
                        className="bg-gray-50"
                      />
                    </div>
                  </div>
                </div>

                {/* Renewal Settings */}
                <div className="space-y-2">
                  <Label>Rappel de Renouvellement (jours avant expiration)</Label>
                  <Input
                    type="number"
                    min="7"
                    max="90"
                    value={activeBond.renewalReminderDays}
                    onChange={(e) => {
                      updateCnamBond(activeBond.id, { renewalReminderDays: parseInt(e.target.value) || 30 });
                    }}
                  />
                  <p className="text-xs text-gray-600">
                    Vous serez notifié {activeBond.renewalReminderDays} jours avant l'expiration du bond
                  </p>
                </div>

                {/* Notes */}
                <div className="space-y-2">
                  <Label>Notes sur le Bond</Label>
                  <Textarea
                    placeholder="Informations complémentaires, conditions spéciales, etc..."
                    value={activeBond.notes || ''}
                    onChange={(e) => {
                      updateCnamBond(activeBond.id, { notes: e.target.value });
                    }}
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