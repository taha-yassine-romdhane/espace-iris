import { cn } from "@/lib/utils";
import { CheckCircle2, Circle, Building2, User, Activity, ShoppingCart, CreditCard, FileCheck, Clock } from "lucide-react";
import { toNumber, formatPrice, formatCurrency, calculatePaymentsTotal, calculateRemainingAmount, isFullyPaid } from "@/utils/priceUtils";
import StepperErrorBoundary from "@/components/StepperErrorBoundary";

interface ClientDetails {
  id: string;
  firstName?: string;
  lastName?: string;
  nomComplet?: string;
  telephone?: string;
  address?: string;
  cin?: string;
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

interface SaleStepperSidebarProps {
  steps: ReadonlyArray<Step> | readonly {
    id: number;
    name: string;
    description: string;
  }[];
  currentStep: number;
  clientDetails: ClientDetails | null;
  selectedProducts: any[];
  totalPrice?: number;
  paymentData?: any;
}

export function SaleStepperSidebar({ 
  steps = [], 
  currentStep, 
  clientDetails,
  selectedProducts = [],
  totalPrice = 0,
  paymentData = null
}: SaleStepperSidebarProps) {
  return (
    <StepperErrorBoundary stepperType="sale">
      <div className="w-80 border-r flex-shrink-0 flex flex-col bg-gradient-to-b from-gray-50 to-white">
      <div className="p-4 border-b bg-blue-50 sticky top-0">
        <h3 className="font-semibold text-blue-800 flex items-center gap-2">
          <ShoppingCart className="h-5 w-5" />
          Nouvelle Vente
        </h3>
      </div>
      
      <div className="p-5 flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
        {/* Client Info Card - Show when a client is selected */}
        {clientDetails && (
          <div className="mb-6 overflow-hidden rounded-lg border border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100/50 shadow-sm">
            {/* Header with client name */}
            <div className="bg-blue-600 p-3 text-white">
              <div className="flex items-center gap-2">
                <div className="h-9 w-9 rounded-full bg-white/20 flex items-center justify-center">
                  {clientDetails.type === "patient" ? (
                    <User className="h-5 w-5" />
                  ) : (
                    <Building2 className="h-5 w-5" />
                  )}
                </div>
                <div>
                  <h4 className="font-medium text-lg">
                    {clientDetails.type === "patient" 
                      ? (clientDetails.nomComplet || `${clientDetails.firstName} ${clientDetails.lastName}`)
                      : clientDetails.nomSociete}
                  </h4>
                  <p className="text-xs text-blue-100">
                    {clientDetails.type === "patient" ? "Patient" : "Société"}
                  </p>
                </div>
              </div>
            </div>
            
            {/* Client details */}
            <div className="p-3 text-sm space-y-2">
              {clientDetails.telephone && (
                <div className="flex items-center gap-2 text-blue-800">
                  <span className="font-medium">Téléphone:</span> 
                  <span>{clientDetails.telephone}</span>
                </div>
              )}
              {clientDetails.type === "patient" && clientDetails.cin && (
                <div className="flex items-center gap-2 text-blue-800">
                  <span className="font-medium">CIN:</span> 
                  <span>{clientDetails.cin}</span>
                </div>
              )}
              {clientDetails.type === "societe" && clientDetails.matriculeFiscale && (
                <div className="flex items-center gap-2 text-blue-800">
                  <span className="font-medium">Matricule Fiscale:</span> 
                  <span>{clientDetails.matriculeFiscale}</span>
                </div>
              )}
              {clientDetails.address && (
                <div className="flex items-center gap-2 text-blue-800">
                  <span className="font-medium">Adresse:</span> 
                  <span className="truncate">{clientDetails.address}</span>
                </div>
              )}
            </div>
            
            {/* Status badge */}
            <div className="px-3 pb-3">
              <div className="flex items-center gap-1 text-xs bg-blue-100 text-blue-700 py-1 px-2 rounded-full w-fit">
                <Activity className="h-3 w-3" /> 
                <span>En cours de vente</span>
              </div>
            </div>
          </div>
        )}
        
        {/* Selected Products Summary - only when products are selected */}
        {selectedProducts.length > 0 && (
          <div className="mb-6 rounded-lg border border-gray-200 overflow-hidden">
            <div className="bg-gray-50 px-3 py-2 font-medium text-gray-700 border-b">
              Produits Sélectionnés ({selectedProducts.length})
            </div>
            <div className="p-3 space-y-2 max-h-40 overflow-y-auto">
              {selectedProducts.map((product, index) => (
                <div key={index} className="flex justify-between items-center text-sm border-b pb-2 last:border-0 last:pb-0">
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{product.name}</div>
                    <div className="text-gray-500 text-xs">
                      {product.type === "MEDICAL_DEVICE" ? "Appareil" :
                       product.type === "ACCESSORY" ? "Accessoire" :
                       product.type === "SPARE_PART" ? "Pièce" : "Diagnostic"}
                    </div>
                  </div>
                  <div className="font-medium">{formatCurrency(product.sellingPrice)}</div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Payment Summary - only when payment data exists */}
        {paymentData && Array.isArray(paymentData) && paymentData.length > 0 && (
          <div className="mb-6 rounded-lg border border-green-200 overflow-hidden bg-green-50/50">
            <div className="bg-green-600 px-3 py-2 font-medium text-white border-b flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Paiements ({paymentData.length})
            </div>
            <div className="p-3 space-y-2 max-h-40 overflow-y-auto">
              {paymentData.map((payment: any, index: number) => {
                const getPaymentIcon = (type: string) => {
                  switch (type) {
                    case 'especes': return <CreditCard className="h-4 w-4 text-green-600" />;
                    case 'cheque': return <FileCheck className="h-4 w-4 text-blue-600" />;
                    case 'virement': return <CreditCard className="h-4 w-4 text-purple-600" />;
                    case 'traite': return <Clock className="h-4 w-4 text-amber-600" />;
                    case 'mandat': return <FileCheck className="h-4 w-4 text-indigo-600" />;
                    case 'cnam': return <FileCheck className="h-4 w-4 text-red-600" />;
                    default: return <CreditCard className="h-4 w-4 text-gray-600" />;
                  }
                };

                const getPaymentLabel = (type: string) => {
                  switch (type) {
                    case 'especes': return 'Espèces';
                    case 'cheque': return 'Chèque';
                    case 'virement': return 'Virement';
                    case 'traite': return 'Traite';
                    case 'mandat': return 'Mandat';
                    case 'cnam': return 'CNAM';
                    default: return type;
                  }
                };

                return (
                  <div key={index} className="border-b pb-3 last:border-0 last:pb-0 bg-white rounded px-2 py-2">
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center gap-2 flex-1">
                        {getPaymentIcon(payment.type)}
                        <div>
                          <div className="font-medium text-gray-900">
                            {payment.metadata?.groupName || getPaymentLabel(payment.type)}
                          </div>
                          {payment.type === 'cnam' && payment.cnamInfo && (
                            <div className="text-xs text-gray-500">
                              {payment.cnamInfo.bonType === 'cpap' && 'Bond CPAP'}
                              {payment.cnamInfo.bonType === 'masque' && 'Bond Masque'}
                              {payment.cnamInfo.bonType === 'autre' && 'Autre Bond'}
                            </div>
                          )}
                          {payment.chequeNumber && (
                            <div className="text-xs text-gray-500">N° {payment.chequeNumber}</div>
                          )}
                          {payment.reference && (
                            <div className="text-xs text-gray-500">Ref: {payment.reference}</div>
                          )}
                        </div>
                      </div>
                      <div className="font-bold text-green-700">
                        {formatCurrency(payment.amount)}
                      </div>
                    </div>
                    
                    {/* Product allocation breakdown */}
                    {payment.metadata?.products && payment.metadata.products.length > 0 && (
                      <div className="space-y-1">
                        {payment.metadata.products.map((product: any, prodIndex: number) => {
                          if (!product) return null;
                          
                          // Calculate allocated amount for this product
                          let allocatedAmount = 0;
                          
                          if (payment.productAllocations && payment.productAllocations[product.id]) {
                            allocatedAmount = payment.productAllocations[product.id];
                          } else if (payment.cnamInfo?.productAllocations && payment.cnamInfo.productAllocations[product.id]) {
                            allocatedAmount = payment.cnamInfo.productAllocations[product.id];
                          } else {
                            // Fallback to proportional calculation
                            const totalProductsValue = payment.metadata.products.reduce((sum: number, p: any) => 
                              sum + (p ? (toNumber(p.sellingPrice) * toNumber(p.quantity || 1)) : 0), 0
                            );
                            const productValue = toNumber(product.sellingPrice) * toNumber(product.quantity || 1);
                            const paymentAmount = toNumber(payment.amount);
                            
                            allocatedAmount = totalProductsValue > 0 
                              ? (productValue / totalProductsValue) * paymentAmount
                              : paymentAmount / payment.metadata.products.length;
                          }
                          
                          return (
                            <div key={prodIndex} className="flex justify-between items-center text-xs bg-green-50 rounded px-2 py-1">
                              <span className="text-gray-600">{product.name}</span>
                              <span className="font-medium text-green-700">{formatCurrency(allocatedAmount)}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="px-3 py-2 bg-green-100 border-t text-sm">
              <div className="flex justify-between font-medium text-green-800">
                <span>Total Payé:</span>
                <span>
                  {formatCurrency(calculatePaymentsTotal(paymentData))}
                </span>
              </div>
            </div>
          </div>
        )}
        
        {/* Stepper */}
        <div className="relative space-y-6 mt-2">
          {steps?.map((step, index) => {
            const isActive = currentStep === step.id;
            const isCompleted = currentStep > step.id;
            
            return (
              <div key={step.id} className="relative">
                {/* Connecting line to previous step */}
                {index > 0 && (
                  <div
                    className={cn(
                      "absolute top-0 left-5 w-0.5",
                      "h-6 -translate-y-6", // Fixed height and position
                      isCompleted ? "bg-blue-600" : "bg-gray-200"
                    )}
                  />
                )}
                <div className="flex gap-4 relative">
                  <div className="flex-shrink-0 mt-0.5">
                    {isCompleted ? (
                      <CheckCircle2 className="h-10 w-10 text-blue-600 fill-blue-100" />
                    ) : isActive ? (
                      <div className="h-10 w-10 rounded-full border-2 border-blue-600 bg-blue-50 flex items-center justify-center text-blue-600 font-medium">
                        {step.id}
                      </div>
                    ) : (
                      <Circle className="h-10 w-10 text-gray-300" />
                    )}
                  </div>
                  <div className="space-y-1">
                    <h3
                      className={cn(
                        "font-medium",
                        isActive
                          ? "text-blue-600"
                          : isCompleted
                          ? "text-blue-700"
                          : "text-gray-400"
                      )}
                    >
                      {step.name}
                    </h3>
                    <p
                      className={cn(
                        "text-sm",
                        isActive || isCompleted
                          ? "text-gray-600"
                          : "text-gray-400"
                      )}
                    >
                      {step.description}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Total Price - Fixed at bottom */}
      <div className="p-4 border-t bg-gradient-to-r from-blue-50 to-indigo-50 sticky bottom-0">
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <div>
              <span className="text-sm text-gray-600">Montant Total</span>
              <div className="text-xl font-bold text-blue-700">
                {totalPrice > 0 ? formatCurrency(totalPrice) : "À calculer"}
              </div>
            </div>
          </div>
          
          {/* Payment Status */}
          {paymentData && Array.isArray(paymentData) && paymentData.length > 0 && totalPrice > 0 && (
            <div className="space-y-2 pt-2 border-t border-blue-200/50">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Payé:</span>
                <span className="font-medium text-green-700">
                  {formatCurrency(calculatePaymentsTotal(paymentData))}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Reste:</span>
                <span className={`font-medium ${
                  isFullyPaid(totalPrice, calculatePaymentsTotal(paymentData)) ? 'text-green-600' : 'text-amber-600'
                }`}>
                  {formatCurrency(calculateRemainingAmount(totalPrice, calculatePaymentsTotal(paymentData)))}
                </span>
              </div>
            </div>
          )}
          
          <div className="flex justify-center">
            <div className={`px-3 py-1 rounded-full text-xs font-medium ${
              paymentData && Array.isArray(paymentData) && paymentData.length > 0 && totalPrice > 0 && 
              isFullyPaid(totalPrice, calculatePaymentsTotal(paymentData))
                ? 'bg-green-600 text-white'
                : 'bg-blue-600 text-white'
            }`}>
              {paymentData && Array.isArray(paymentData) && paymentData.length > 0 && totalPrice > 0 && 
               isFullyPaid(totalPrice, calculatePaymentsTotal(paymentData)) ? 'Payé' : 'En cours'}
            </div>
          </div>
        </div>
      </div>
    </div>
    </StepperErrorBoundary>
  );
}

export default SaleStepperSidebar;
