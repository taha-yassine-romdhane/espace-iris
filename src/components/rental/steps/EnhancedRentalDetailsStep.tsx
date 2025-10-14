import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, addDays, addMonths, differenceInDays } from "date-fns";
import { fr } from "date-fns/locale";
import { 
  CalendarIcon, 
  Loader2, 
  AlertTriangle, 
  Clock, 
  Calendar as CalendarIconSolid,
  Info,
  CheckCircle,
  XCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/use-toast";

interface RentalProduct {
  id: string;
  name: string;
  type: 'MEDICAL_DEVICE' | 'ACCESSORY';
  rentalPrice: number;
  quantity: number;
  requiresReturn: boolean;
}

interface RentalPeriod {
  id: string;
  productId: string;
  startDate: Date;
  endDate: Date | null; // null means open-ended
  monthlyRate: number;
  dailyRate: number;
  isOpenEnded: boolean;
  urgentRental: boolean;
  estimatedDuration?: number; // in days
}

interface EnhancedRentalDetailsStepProps {
  selectedProducts: RentalProduct[];
  onBack: () => void;
  onComplete: (data: any) => void;
  isSubmitting: boolean;
  clientDetails: any;
}

export function EnhancedRentalDetailsStep({
  selectedProducts,
  onBack,
  onComplete,
  isSubmitting,
  clientDetails
}: EnhancedRentalDetailsStepProps) {
  // Global rental settings
  const [globalStartDate, setGlobalStartDate] = useState<Date>(new Date());
  const [globalEndDate, setGlobalEndDate] = useState<Date | null>(addMonths(new Date(), 1));
  const [isGlobalOpenEnded, setIsGlobalOpenEnded] = useState(false);
  const [urgentRental, setUrgentRental] = useState(false);
  const [rentalNotes, setRentalNotes] = useState("");
  
  // Product-specific rental periods
  const [productRentalPeriods, setProductRentalPeriods] = useState<RentalPeriod[]>(
    selectedProducts.map(product => ({
      id: `period-${product.id}`,
      productId: product.id,
      startDate: new Date(),
      endDate: addMonths(new Date(), 1),
      monthlyRate: (product.rentalPrice || 0) * 30, // Convert daily to monthly
      dailyRate: product.rentalPrice || 0, // Keep the original daily rate
      isOpenEnded: false,
      urgentRental: false,
      estimatedDuration: 30
    }))
  );

  // Calendar states
  const [globalStartDateOpen, setGlobalStartDateOpen] = useState(false);
  const [globalEndDateOpen, setGlobalEndDateOpen] = useState(false);
  const [productDateStates, setProductDateStates] = useState<Record<string, any>>({});

  // Rental duration presets
  const durationPresets = [
    { label: '1 semaine', days: 7 },
    { label: '2 semaines', days: 14 },
    { label: '1 mois', days: 30 },
    { label: '3 mois', days: 90 },
    { label: '6 mois', days: 180 },
    { label: '1 an', days: 365 }
  ];

  // Apply global dates to all products
  const applyGlobalDates = () => {
    setProductRentalPeriods(prev => prev.map(period => ({
      ...period,
      startDate: globalStartDate,
      endDate: isGlobalOpenEnded ? null : globalEndDate,
      isOpenEnded: isGlobalOpenEnded,
      urgentRental: urgentRental
    })));
  };

  // Update specific product rental period
  const updateProductPeriod = (productId: string, updates: Partial<RentalPeriod>) => {
    setProductRentalPeriods(prev => prev.map(period => 
      period.productId === productId ? { ...period, ...updates } : period
    ));
  };

  // Apply duration preset to product
  const applyDurationPreset = (productId: string, days: number) => {
    const startDate = productRentalPeriods.find(p => p.productId === productId)?.startDate || new Date();
    const endDate = addDays(startDate, days);
    updateProductPeriod(productId, { 
      endDate, 
      isOpenEnded: false,
      estimatedDuration: days 
    });
  };

  // Calculate total rental cost for a period
  const calculatePeriodCost = (period: RentalPeriod) => {
    const dailyRate = Number(period.dailyRate) || 0;
    
    // For open-ended rentals, return daily rate only (no multiplication)
    if (period.isOpenEnded) {
      return dailyRate;
    }
    
    // For fixed periods, calculate total based on duration
    if (!period.endDate && !period.estimatedDuration) return 0;
    
    const days = period.endDate 
      ? differenceInDays(period.endDate, period.startDate)
      : period.estimatedDuration || 30;
    
    return days * dailyRate;
  };

  // Calculate total rental cost
  const calculateTotalCost = () => {
    return productRentalPeriods.reduce((total, period) => {
      const product = selectedProducts.find(p => p.id === period.productId);
      const quantity = product?.quantity || 1;
      return total + (calculatePeriodCost(period) * quantity);
    }, 0);
  };

  // Identify potential gaps and issues
  const identifyRentalGaps = () => {
    const gaps = [];
    const today = new Date();
    
    for (const period of productRentalPeriods) {
      const product = selectedProducts.find(p => p.id === period.productId);
      if (!product) continue;

      // Check for urgent rental without end date
      if (period.urgentRental && !period.endDate) {
        gaps.push({
          type: 'urgent_no_end',
          productName: product.name,
          message: 'Location urgente sans date de fin définie',
          severity: 'high'
        });
      }

      // Check for start date in the past without urgent flag
      if (period.startDate < today && !period.urgentRental) {
        gaps.push({
          type: 'past_start',
          productName: product.name,
          message: 'Date de début dans le passé sans marquage urgent',
          severity: 'medium'
        });
      }

      // Check for very long rental periods (> 1 year)
      if (period.endDate && differenceInDays(period.endDate, period.startDate) > 365) {
        gaps.push({
          type: 'long_rental',
          productName: product.name,
          message: 'Période de location très longue (> 1 an)',
          severity: 'low'
        });
      }
    }

    return gaps;
  };

  const rentalGaps = identifyRentalGaps();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!globalStartDate) {
      toast({
        title: "Date de début requise",
        description: "Veuillez sélectionner une date de début pour la location",
        variant: "destructive"
      });
      return;
    }
    
    if (!isGlobalOpenEnded && !globalEndDate) {
      toast({
        title: "Date de fin requise",
        description: "Veuillez sélectionner une date de fin ou cocher 'Location ouverte'",
        variant: "destructive"
      });
      return;
    }
    
    if (!isGlobalOpenEnded && globalEndDate && globalStartDate >= globalEndDate) {
      toast({
        title: "Dates invalides",
        description: "La date de fin doit être postérieure à la date de début",
        variant: "destructive"
      });
      return;
    }
    
    const rentalData = {
      globalStartDate,
      globalEndDate,
      isGlobalOpenEnded,
      urgentRental,
      notes: rentalNotes,
      productPeriods: productRentalPeriods,
      totalCost: calculateTotalCost(),
      identifiedGaps: rentalGaps,
      cnamEligible: clientDetails?.cnamId ? true : false
    };

    onComplete(rentalData);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header - Fixed */}
      <div className="flex-shrink-0 mb-6">
        <h2 className="text-xl font-semibold text-blue-900 mb-2">
          Configuration Avancée de Location
        </h2>
        <p className="text-gray-600">
          Configurez les détails précis de chaque appareil et gérez les périodes de location
        </p>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto space-y-6 pr-2">

      {/* Rental Gaps Alert */}
      {rentalGaps.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-orange-800 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Alertes détectées ({rentalGaps.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {rentalGaps.map((gap, index) => (
                <div key={index} className="flex items-start gap-2 text-sm">
                  <Badge variant={gap.severity === 'high' ? 'destructive' : gap.severity === 'medium' ? 'secondary' : 'outline'}>
                    {gap.severity === 'high' ? 'Critique' : gap.severity === 'medium' ? 'Important' : 'Info'}
                  </Badge>
                  <div>
                    <span className="font-medium">{gap.productName}:</span> {gap.message}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Global Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIconSolid className="h-5 w-5 text-blue-600" />
            Paramètres Globaux
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Global Start Date */}
            <div className="space-y-2">
              <Label>Date de début globale</Label>
              <Popover open={globalStartDateOpen} onOpenChange={setGlobalStartDateOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(globalStartDate, "PPP", { locale: fr })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={globalStartDate}
                    onSelect={(date) => {
                      if (date) {
                        setGlobalStartDate(date);
                        setGlobalStartDateOpen(false);
                      }
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Global End Date */}
            <div className="space-y-2">
              <Label>Date de fin globale</Label>
              <Popover open={globalEndDateOpen} onOpenChange={setGlobalEndDateOpen}>
                <PopoverTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    disabled={isGlobalOpenEnded}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {isGlobalOpenEnded ? "Date ouverte" : globalEndDate ? format(globalEndDate, "PPP", { locale: fr }) : "Sélectionner"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={globalEndDate || undefined}
                    onSelect={(date) => {
                      setGlobalEndDate(date || null);
                      setGlobalEndDateOpen(false);
                    }}
                    disabled={(date) => date < globalStartDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="flex flex-wrap gap-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="open-ended"
                checked={isGlobalOpenEnded}
                onCheckedChange={setIsGlobalOpenEnded}
              />
              <Label htmlFor="open-ended" className="text-sm">
                Location à durée indéterminée
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="urgent"
                checked={urgentRental}
                onCheckedChange={setUrgentRental}
              />
              <Label htmlFor="urgent" className="text-sm">
                Location urgente
              </Label>
            </div>
          </div>

          <Button onClick={applyGlobalDates} variant="outline" className="w-full">
            Appliquer à tous les produits
          </Button>
        </CardContent>
      </Card>

      {/* Product-Specific Settings */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-blue-900">
          Configuration par Produit
        </h3>
        
        {selectedProducts.map((product) => {
          const period = productRentalPeriods.find(p => p.productId === product.id);
          if (!period) return null;

          const estimatedDays = period.isOpenEnded 
            ? 0 // For open-ended, don't show a specific duration
            : period.endDate 
              ? differenceInDays(period.endDate, period.startDate)
              : period.estimatedDuration || 30;

          return (
            <Card key={product.id} className="border-blue-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant={product.type === 'MEDICAL_DEVICE' ? 'default' : 'secondary'}>
                      {product.type === 'MEDICAL_DEVICE' ? 'Appareil Médical' : 'Accessoire'}
                    </Badge>
                    {product.name}
                  </div>
                  <div className="text-sm text-gray-600">
                    Qté: {product.quantity} × {(Number(period.dailyRate) || 0).toFixed(2)} TND/jour
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Duration Presets - Hidden for open-ended rentals */}
                {!period.isOpenEnded && (
                  <div className="space-y-2">
                    <Label className="text-sm">Durées prédéfinies</Label>
                    <div className="flex flex-wrap gap-2">
                      {durationPresets.map((preset) => (
                        <Button
                          key={preset.days}
                          variant="outline"
                          size="sm"
                          onClick={() => applyDurationPreset(product.id, preset.days)}
                          className="text-xs"
                        >
                          {preset.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Date Range */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm">Début</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-sm">
                          <CalendarIcon className="mr-2 h-3 w-3" />
                          {format(period.startDate, "dd/MM/yyyy", { locale: fr })}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={period.startDate}
                          onSelect={(date) => {
                            if (date) {
                              updateProductPeriod(product.id, { startDate: date });
                            }
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm">Fin</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button 
                          variant="outline" 
                          className="w-full justify-start text-sm"
                          disabled={period.isOpenEnded}
                        >
                          <CalendarIcon className="mr-2 h-3 w-3" />
                          {period.isOpenEnded ? "Date ouverte" : 
                           period.endDate ? format(period.endDate, "dd/MM/yyyy", { locale: fr }) : "Non définie"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={period.endDate || undefined}
                          onSelect={(date) => {
                            updateProductPeriod(product.id, { endDate: date || null });
                          }}
                          disabled={(date) => date < period.startDate}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                {/* Options */}
                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={period.isOpenEnded}
                      onCheckedChange={(checked) => 
                        updateProductPeriod(product.id, { isOpenEnded: checked, endDate: checked ? null : addMonths(period.startDate, 1) })
                      }
                    />
                    <Label className="text-xs">Durée indéterminée</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={period.urgentRental}
                      onCheckedChange={(checked) => 
                        updateProductPeriod(product.id, { urgentRental: checked })
                      }
                    />
                    <Label className="text-xs">Urgent</Label>
                  </div>
                </div>

                {/* Duration & Cost Summary */}
                <div className="bg-gray-50 p-3 rounded-lg">
                  {period.isOpenEnded ? (
                    // Open-ended rental display
                    <div className="text-center space-y-2">
                      <div className="flex items-center justify-center gap-2 text-orange-600">
                        <Clock className="h-4 w-4" />
                        <span className="font-medium">Location Ouverte</span>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-center">
                        <div>
                          <div className="text-xs text-gray-600">Tarif journalier</div>
                          <div className="font-semibold text-sm">
                            {(Number(period.dailyRate) || 0).toFixed(2)} TND/jour
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-600">Coût total (×{product.quantity})</div>
                          <div className="font-semibold text-sm text-blue-600">
                            {((Number(period.dailyRate) || 0) * product.quantity).toFixed(2)} TND/jour
                          </div>
                        </div>
                      </div>
                      <div className="text-xs text-orange-600 bg-orange-50 p-2 rounded">
                        Facturation au jour, selon durée réelle d'utilisation
                      </div>
                    </div>
                  ) : (
                    // Fixed duration rental display
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <div className="text-xs text-gray-600">Durée</div>
                        <div className="font-semibold text-sm">
                          {estimatedDays} jour{estimatedDays > 1 ? 's' : ''}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-600">Coût unitaire</div>
                        <div className="font-semibold text-sm">
                          {calculatePeriodCost(period).toFixed(2)} TND
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-600">Coût total</div>
                        <div className="font-semibold text-sm text-blue-600">
                          {(calculatePeriodCost(period) * product.quantity).toFixed(2)} TND
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Global Notes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Notes de Location</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Instructions spéciales, conditions de location, informations sur le retour des appareils, etc..."
            value={rentalNotes}
            onChange={(e) => setRentalNotes(e.target.value)}
            className="min-h-[100px]"
          />
        </CardContent>
      </Card>

      {/* Total Cost Summary */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-semibold text-blue-900">Coût Total Estimé</h3>
              <p className="text-sm text-blue-700">
                Basé sur les durées configurées
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-blue-900">
                {calculateTotalCost().toFixed(2)} TND
                {productRentalPeriods.some(p => p.isOpenEnded) && <span className="text-sm">/jour</span>}
              </div>
              <div className="text-sm text-blue-600">
                {productRentalPeriods.some(p => p.isOpenEnded) && productRentalPeriods.some(p => !p.isOpenEnded) && 
                  "* Coût mixte: fixe + journalier"}
                {productRentalPeriods.every(p => p.isOpenEnded) && 
                  "* Tarif journalier pour location ouverte"}
                {productRentalPeriods.some(p => p.isOpenEnded) && !productRentalPeriods.some(p => !p.isOpenEnded) && 
                  "* Coût estimé pour durée indéterminée"}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      </div>

      {/* Navigation - Fixed at bottom */}
      <div className="flex-shrink-0 flex justify-between pt-4 border-t bg-white">
        <Button type="button" variant="outline" onClick={onBack}>
          ← Retour
        </Button>
        <Button 
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Configuration...
            </>
          ) : (
            "Continuer vers le paiement →"
          )}
        </Button>
      </div>
    </div>
  );
}