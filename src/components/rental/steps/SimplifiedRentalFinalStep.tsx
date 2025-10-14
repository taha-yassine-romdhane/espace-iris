import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { format, addMonths } from "date-fns";
import { fr } from "date-fns/locale";
import { 
  CalendarIcon, 
  Loader2,
  User,
  Package,
  Clock,
  CreditCard,
  AlertCircle,
  CheckCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/use-toast";

interface SimplifiedRentalFinalStepProps {
  selectedClient: any;
  selectedProducts: any[];
  onBack: () => void;
  onComplete: (data: any) => void;
  isSubmitting: boolean;
  theme?: 'blue' | 'green';
}

export function SimplifiedRentalFinalStep({
  selectedClient,
  selectedProducts,
  onBack,
  onComplete,
  isSubmitting,
  theme = 'blue'
}: SimplifiedRentalFinalStepProps) {
  // Theme-based color classes
  const getThemeColors = () => {
    if (theme === 'green') {
      return {
        primary: 'text-green-600',
        primaryBg: 'bg-green-50',
        primaryBorder: 'border-green-200',
        primaryText: 'text-green-700',
        primaryDark: 'text-green-900',
        primaryButton: 'bg-green-700 hover:bg-green-800'
      };
    }
    return {
      primary: 'text-blue-600',
      primaryBg: 'bg-blue-50',
      primaryBorder: 'border-blue-200',
      primaryText: 'text-blue-700',
      primaryDark: 'text-blu!!e-900',
      primaryButton: 'bg-blue-700 hover:bg-blue-800'
    };
  };
  
  const colors = getThemeColors();

  // Essential rental info
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date | undefined>(addMonths(new Date(), 1));
  const [isOpenEnded, setIsOpenEnded] = useState(false);
  const [urgentRental, setUrgentRental] = useState(false);
  
  // Simple payment info
  const [depositAmount, setDepositAmount] = useState<number>(0);
  const [depositMethod, setDepositMethod] = useState<string>("CASH");
  const [hasCnamCoverage, setHasCnamCoverage] = useState(false);
  const [cnamStartMonth, setCnamStartMonth] = useState<string>("");
  
  // Notes
  const [deliveryNotes, setDeliveryNotes] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  
  // Calculate daily total
  const calculateDailyTotal = () => {
    return selectedProducts.reduce((total, product) => {
      const price = product.rentalPrice || 0;
      const quantity = product.quantity || 1;
      return total + (price * quantity);
    }, 0);
  };

  const dailyTotal = calculateDailyTotal();

  const handleSubmit = () => {
    // Validate minimum required fields
    if (!startDate) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner une date de début",
        variant: "destructive"
      });
      return;
    }

    if (!isOpenEnded && !endDate) {
      toast({
        title: "Erreur", 
        description: "Veuillez sélectionner une date de fin ou activer la location ouverte",
        variant: "destructive"
      });
      return;
    }

    // Prepare simplified rental data
    const rentalData = {
      // Basic info
      clientId: selectedClient.id,
      clientType: selectedClient.type,
      products: selectedProducts.map(p => ({
        productId: p.id,
        type: p.type,
        quantity: p.quantity || 1,
        rentalPrice: p.rentalPrice || 0,
        name: p.name
      })),
      
      // Rental period
      startDate: startDate,
      endDate: isOpenEnded ? null : endDate,
      isOpenEnded: isOpenEnded,
      urgentRental: urgentRental,
      
      // Simple payment
      depositAmount: depositAmount,
      depositMethod: depositMethod,
      hasCnamCoverage: hasCnamCoverage,
      cnamStartMonth: hasCnamCoverage ? cnamStartMonth : null,
      
      // Notes
      deliveryNotes: deliveryNotes,
      internalNotes: internalNotes,
      
      // Status
      status: "ACTIVE",
      totalDailyRate: dailyTotal,
      
      // Flag for simplified creation
      isSimplifiedCreation: true
    };

    onComplete(rentalData);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-y-auto">
        <div className="space-y-6">
          {/* Client Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Information Client
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-green-700">Nom</Label>
                  <p className="font-medium">
                    {selectedClient.type === 'patient' 
                      ? `${selectedClient.firstName} ${selectedClient.lastName}`
                      : selectedClient.nomSociete}
                  </p>
                </div>
                <div>
                  <Label className="text-green-700">Téléphone</Label>
                  <p className="font-medium">{selectedClient.telephone || 'Non renseigné'}</p>
                </div>
                {selectedClient.cnamId && (
                  <div>
                    <Label className="text-green-700">CNAM ID</Label>
                    <p className="font-medium">{selectedClient.cnamId}</p>
                  </div>
                )}
                {selectedClient.address && (
                  <div className="col-span-2">
                    <Label className="text-green-700">Adresse</Label>
                    <p className="font-medium">{selectedClient.address}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Products Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Équipements ({selectedProducts.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {selectedProducts.map((product, index) => (
                  <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-green-700">{product.name}</p>
                      <p className="text-sm text-green-700">
                        {product.type === 'MEDICAL_DEVICE' ? 'Appareil médical' : 'Accessoire'}
                        {product.quantity > 1 && ` × ${product.quantity}`}
                      </p>
                    </div>
                    <Badge variant="secondary">
                      {(product.rentalPrice * (product.quantity || 1)).toFixed(2)} DT/jour
                    </Badge>
                  </div>
                ))}
                <Separator />
                <div className="flex justify-between items-center font-semibold">
                  <span>Total journalier</span>
                  <span className={`text-lg ${colors.primary}`}>{dailyTotal.toFixed(2)} DT/jour</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Rental Period */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5" />
                Période de Location
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Date de début *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !startDate && "text-green-700"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {startDate ? format(startDate, "dd/MM/yyyy") : "Sélectionner"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={startDate}
                        onSelect={(date) => date && setStartDate(date)}
                        locale={fr}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div>
                  <Label>Date de fin {!isOpenEnded && '*'}</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        disabled={isOpenEnded}
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !endDate && "text-green-700"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {isOpenEnded 
                          ? "Location ouverte" 
                          : endDate 
                            ? format(endDate, "dd/MM/yyyy") 
                            : "Sélectionner"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={endDate}
                        onSelect={setEndDate}
                        locale={fr}
                        disabled={(date) => date < startDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="open-ended" className="flex items-center gap-2">
                    Location sans date de fin
                    <AlertCircle className="h-4 w-4 text-green-700" />
                  </Label>
                  <Switch
                    id="open-ended"
                    checked={isOpenEnded}
                    onCheckedChange={setIsOpenEnded}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="urgent" className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-orange-500" />
                    Location urgente
                  </Label>
                  <Switch
                    id="urgent"
                    checked={urgentRental}
                    onCheckedChange={setUrgentRental}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Simple Payment */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Paiement Initial
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Montant de caution</Label>
                  <Input
                    type="number"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label>Méthode de paiement</Label>
                  <Select value={depositMethod} onValueChange={setDepositMethod}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CASH">Espèces</SelectItem>
                      <SelectItem value="CHEQUE">Chèque</SelectItem>
                      <SelectItem value="VIREMENT">Virement</SelectItem>
                      <SelectItem value="CARTE">Carte bancaire</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* CNAM Coverage Flag */}
              <div className={`p-4 ${colors.primaryBg} rounded-lg space-y-3`}>
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    Patient avec couverture CNAM
                    {selectedClient.cnamId && (
                      <Badge variant="secondary" className="ml-2">
                        ID: {selectedClient.cnamId}
                      </Badge>
                    )}
                  </Label>
                  <Switch
                    checked={hasCnamCoverage}
                    onCheckedChange={setHasCnamCoverage}
                  />
                </div>
                
                {hasCnamCoverage && (
                  <div>
                    <Label>Mois de début CNAM (approximatif)</Label>
                    <Input
                      type="month"
                      value={cnamStartMonth}
                      onChange={(e) => setCnamStartMonth(e.target.value)}
                      className="mt-1"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Le dossier CNAM sera géré dans les détails de location
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 bg-green-50">
              <div>
                <Label className="text-green-700">Notes de livraison (pour le patient)</Label>
                <Textarea
                  value={deliveryNotes}
                  onChange={(e) => setDeliveryNotes(e.target.value)}
                  placeholder="Instructions spéciales, remarques pour le patient..."
                  rows={2}
                />
              </div>
              <div>
                <Label className="text-green-700">Notes internes</Label>
                <Textarea 
                  value={internalNotes}
                  onChange={(e) => setInternalNotes(e.target.value)}
                  placeholder="Informations internes, observations..."
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          {/* Quick Summary */}
          <Card className={`${colors.primaryBg} ${colors.primaryBorder}`}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle className={`h-5 w-5 ${colors.primary}`} />
                <span className={`font-semibold ${colors.primaryDark}`}>Récapitulatif rapide</span>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className={colors.primaryText}>Tarif journalier:</span>
                  <span className={`font-medium ${colors.primaryDark}`}>{dailyTotal.toFixed(2)} DT/jour</span>
                </div>
                <div className="flex justify-between">
                  <span className={colors.primaryText}>Début location:</span>
                  <span className={`font-medium ${colors.primaryDark}`}>{format(startDate, "dd/MM/yyyy")}</span>
                </div>
                <div className="flex justify-between">
                  <span className={colors.primaryText}>Type:</span>
                  <span className={`font-medium ${colors.primaryDark}`}>
                    {isOpenEnded ? "Location ouverte" : `Jusqu'au ${endDate ? format(endDate, "dd/MM/yyyy") : ''}`}
                  </span>
                </div>
                {depositAmount > 0 && (
                  <div className="flex justify-between">
                    <span className={colors.primaryText}>Caution reçue:</span>
                    <span className={`font-medium ${colors.primaryDark}`}>{depositAmount.toFixed(2)} DT</span>
                  </div>
                )}
                {hasCnamCoverage && (
                  <div className="flex justify-between">
                    <span className={colors.primaryText}>CNAM:</span>
                    <Badge className="bg-green-100 text-green-800 border-green-200">
                      À configurer
                    </Badge>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex-shrink-0 border-t bg-white p-6">
        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={onBack}
            disabled={isSubmitting}
          >
            Retour
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="min-w-[150px] bg-green-700 hover:bg-green-800 "
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Création...
              </>
            ) : (
              'Créer la location'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}