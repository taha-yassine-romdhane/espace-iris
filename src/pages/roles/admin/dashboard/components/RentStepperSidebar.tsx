import { cn } from "@/lib/utils";
import { CheckCircle2, Circle, Building2, Package, Phone, Check, Shield } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface ClientDetails {
  id: string;
  firstName?: string;
  lastName?: string;
  nomComplet?: string;
  telephone?: string;
  address?: string;
  cin?: string;
  cnamId?: string;
  // For company
  nomSociete?: string;
  matriculeFiscale?: string;
  type: "patient" | "societe";
}

interface Step {
  id: number;
  name: string;
  description: string;
}

interface RentStepperSidebarProps {
  steps: ReadonlyArray<Step> | readonly {
    id: number;
    name: string;
    description: string;
  }[];
  currentStep: number;
  clientDetails: ClientDetails | null;
  selectedProducts: any[];
  totalPrice?: number;
}

export function RentStepperSidebar({ 
  steps = [], 
  currentStep, 
  clientDetails,
  selectedProducts = [],
  totalPrice = 0
}: RentStepperSidebarProps) {
  // Calculate daily total from products
  const dailyTotal = selectedProducts.reduce((sum, product) => {
    const dailyPrice = typeof product.rentalPrice === 'number' 
      ? product.rentalPrice 
      : parseFloat(product.rentalPrice) || 0;
    const quantity = product.quantity || 1;
    return sum + (dailyPrice * quantity);
  }, 0);

  return (
    <div className="w-96 border-r flex-shrink-0 flex flex-col bg-gray-50 overflow-hidden">
      {/* Header - Fixed */}
      <div className="flex-shrink-0 p-6 pb-4">
        <h3 className="font-semibold text-lg text-gray-900 flex items-center gap-2">
          <Building2 className="h-5 w-5 text-blue-600" />
          Nouvelle Location
        </h3>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-6 pb-6">
        {/* Step Progress */}
        <div className="space-y-2 mb-6">
          {steps?.map((step) => {
            const isActive = currentStep === step.id;
            const isCompleted = currentStep > step.id;
            
            return (
              <div key={step.id} className="flex items-center gap-3">
                <div className="flex-shrink-0">
                  {isCompleted ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  ) : isActive ? (
                    <div className="h-5 w-5 rounded-full border-2 border-blue-600 bg-blue-50 flex items-center justify-center text-blue-600 text-xs font-medium">
                      {step.id}
                    </div>
                  ) : (
                    <Circle className="h-5 w-5 text-gray-300" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className={cn(
                    "text-sm font-medium truncate",
                    isActive ? "text-blue-600" : isCompleted ? "text-green-600" : "text-gray-400"
                  )}>
                    {step.name}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Summary Card */}
        <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Check className="h-5 w-5 text-green-600" />
            Récapitulatif
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Client Summary */}
          {clientDetails && (
            <div className="p-3 bg-blue-50 rounded-md">
              <div className="font-medium text-blue-800 mb-1">Patient:</div>
              <div className="text-sm font-medium text-gray-900">
                {clientDetails.nomComplet || `${clientDetails.firstName} ${clientDetails.lastName}`}
              </div>
              {clientDetails.telephone && (
                <div className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                  <Phone className="h-3 w-3" />
                  {clientDetails.telephone}
                </div>
              )}
              {clientDetails.type === "patient" && clientDetails.cin && (
                <div className="text-sm text-gray-600 mt-1">
                  CIN: {clientDetails.cin}
                </div>
              )}
              {clientDetails.cnamId && (
                <Badge className="mt-2" variant="secondary">
                  <Shield className="h-3 w-3 mr-1" />
                  CNAM: {clientDetails.cnamId}
                </Badge>
              )}
            </div>
          )}

          {/* Equipment Summary */}
          {selectedProducts.length > 0 && (
            <>
              <Separator />
              <div>
                <div className="font-medium mb-2 flex items-center gap-2">
                  <Package className="h-4 w-4 text-blue-600" />
                  Équipements ({selectedProducts.length})
                </div>
                <div className="space-y-2">
                  {selectedProducts.map((product, index) => (
                    <div key={index} className="flex justify-between items-start text-sm p-2 bg-gray-50 rounded">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 truncate">{product.name}</div>
                        <div className="text-gray-500 text-xs">
                          {product.type === "MEDICAL_DEVICE" ? "Appareil médical" : "Accessoire"}
                          {product.quantity > 1 && ` × ${product.quantity}`}
                        </div>
                      </div>
                      <div className="font-medium text-blue-600 ml-2">
                        {((typeof product.rentalPrice === 'number' ? product.rentalPrice : parseFloat(product.rentalPrice) || 0) * (product.quantity || 1)).toFixed(2)} DT/jour
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}


          {/* Total Summary */}
          <Separator />
          <div className="space-y-2">
            {/* Daily Rate */}
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Tarif journalier:</span>
              <span className="font-semibold text-lg text-blue-600">{dailyTotal.toFixed(2)} DT/jour</span>
            </div>
            
            {currentStep === 3 && (
              <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
                La configuration détaillée sera disponible après création
              </div>
            )}
          </div>
        </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default RentStepperSidebar;