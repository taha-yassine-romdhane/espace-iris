import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  ChevronLeft, 
  User, 
  Building2, 
  Package, 
  CreditCard,
  CheckCircle2,
  Clock,
  AlertCircle,
  Stethoscope,
  Puzzle,
  Cog,
  Activity,
  FileCheck,
  Phone,
  MapPin,
  IdCard
} from 'lucide-react';
import { cn } from '@/lib/utils';
import CNAMStepSelector from '@/components/payment/components/CNAMStepSelector';
import { toNumber, formatPrice, formatCurrency, calculatePaymentsTotal, calculateRemainingAmount, isFullyPaid } from '@/utils/priceUtils';
import StepperErrorBoundary from '@/components/StepperErrorBoundary';

interface RecapitulationStepProps {
  onBack: () => void;
  onFinalize: () => void;
  selectedClient: any;
  selectedProducts: any[];
  paymentData: any;
  notes: string;
  calculateTotal: () => number;
  isLoading?: boolean;
}

const getProductIcon = (type: string) => {
  switch (type) {
    case 'MEDICAL_DEVICE': return <Stethoscope className="h-4 w-4 text-blue-500" />;
    case 'ACCESSORY': return <Puzzle className="h-4 w-4 text-green-500" />;
    case 'SPARE_PART': return <Cog className="h-4 w-4 text-amber-500" />;
    case 'DIAGNOSTIC_DEVICE': return <Activity className="h-4 w-4 text-purple-500" />;
    default: return <Package className="h-4 w-4 text-gray-500" />;
  }
};

const getPaymentMethodIcon = (method: string) => {
  switch (method) {
    case 'especes': return <CreditCard className="h-4 w-4" />;
    case 'cheque': return <FileCheck className="h-4 w-4" />;
    case 'virement': return <CreditCard className="h-4 w-4" />;
    case 'cnam': return <FileCheck className="h-4 w-4" />;
    case 'traite': return <Clock className="h-4 w-4" />;
    case 'mandat': return <FileCheck className="h-4 w-4" />;
    default: return <CreditCard className="h-4 w-4" />;
  }
};

const getPaymentMethodLabel = (method: string) => {
  switch (method) {
    case 'especes': return 'Espèces';
    case 'cheque': return 'Chèque';
    case 'virement': return 'Virement';
    case 'cnam': return 'CNAM';
    case 'traite': return 'Traite';
    case 'mandat': return 'Mandat';
    default: return method;
  }
};

export function RecapitulationStep({
  onBack,
  onFinalize,
  selectedClient,
  selectedProducts,
  paymentData,
  notes,
  calculateTotal,
  isLoading = false
}: RecapitulationStepProps) {
  const totalAmount = calculateTotal();
  const paidAmount = paymentData ? calculatePaymentsTotal(Array.isArray(paymentData) ? paymentData : [paymentData]) : 0;
  const remainingAmount = calculateRemainingAmount(totalAmount, paidAmount);
  const fullyPaid = isFullyPaid(totalAmount, paidAmount);

  // Process payment data - handle both array and individual payment formats
  const payments = Array.isArray(paymentData) ? paymentData : (paymentData ? [paymentData] : []);

  return (
    <StepperErrorBoundary stepperType="sale" onGoBack={onBack}>
      <div className="space-y-6">
      <div className="flex justify-between items-center">
        <Button variant="outline" onClick={onBack} className="flex items-center gap-2">
          <ChevronLeft className="h-4 w-4" /> Retour
        </Button>
        <h2 className="text-2xl font-bold text-center">Récapitulatif de la Vente</h2>
        <div className="w-[100px]"></div> {/* Spacer for alignment */}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Client Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {selectedClient?.type === 'patient' ? (
                <User className="h-5 w-5 text-blue-500" />
              ) : (
                <Building2 className="h-5 w-5 text-green-500" />
              )}
              {selectedClient?.type === 'patient' ? 'Informations Patient' : 'Informations Société'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {selectedClient?.type === 'patient' ? (
              <>
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-gray-500" />
                  <span className="font-medium">{selectedClient.nomComplet}</span>
                </div>
                {selectedClient.cin && (
                  <div className="flex items-center gap-2">
                    <IdCard className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">CIN: {selectedClient.cin}</span>
                  </div>
                )}
                {selectedClient.telephone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">{selectedClient.telephone}</span>
                  </div>
                )}
                {selectedClient.address && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">{selectedClient.address}</span>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-gray-500" />
                  <span className="font-medium">{selectedClient.nomSociete}</span>
                </div>
                {selectedClient.matriculeFiscale && (
                  <div className="flex items-center gap-2">
                    <IdCard className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">Matricule: {selectedClient.matriculeFiscale}</span>
                  </div>
                )}
                {selectedClient.telephone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">{selectedClient.telephone}</span>
                  </div>
                )}
                {selectedClient.address && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">{selectedClient.address}</span>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Products Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-blue-500" />
              Produits ({selectedProducts.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {selectedProducts.map((product, index) => {
              const quantity = toNumber(product.quantity) || 1;
              const unitPrice = toNumber(product.sellingPrice);
              const totalPrice = quantity * unitPrice;
              
              return (
                <div key={index} className="border rounded-lg p-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-1">
                      {getProductIcon(product.type)}
                      <div className="flex-1">
                        <div className="font-medium text-sm">{product.name}</div>
                        <div className="text-xs text-gray-500">
                          {quantity > 1 && `Qté: ${quantity} × `}
                          {formatCurrency(unitPrice)}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium text-sm">{formatCurrency(totalPrice)}</div>
                    </div>
                  </div>
                  
                  {/* Display product parameters/configuration if present */}
                  {product.parameters && Object.keys(product.parameters).length > 0 && (
                    <div className="mt-2 ml-7 pl-2 border-l-2 border-blue-100">
                      <div className="text-xs text-gray-500 font-medium mb-1">Configuration:</div>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                        {/* CPAP parameters */}
                        {product.parameters.pressionRampe && (
                          <div className="text-xs text-gray-600">Pression Rampe: {product.parameters.pressionRampe}</div>
                        )}
                        {product.parameters.dureeRampe && (
                          <div className="text-xs text-gray-600">Durée Rampe: {product.parameters.dureeRampe} min</div>
                        )}
                        {product.parameters.pression && (
                          <div className="text-xs text-gray-600">Pression: {product.parameters.pression}</div>
                        )}
                        {product.parameters.epr && (
                          <div className="text-xs text-gray-600">EPR: {product.parameters.epr}</div>
                        )}
                        
                        {/* VNI parameters */}
                        {product.parameters.ipap && (
                          <div className="text-xs text-gray-600">IPAP: {product.parameters.ipap}</div>
                        )}
                        {product.parameters.epap && (
                          <div className="text-xs text-gray-600">EPAP: {product.parameters.epap}</div>
                        )}
                        {product.parameters.aid && (
                          <div className="text-xs text-gray-600">AID: {product.parameters.aid}</div>
                        )}
                        {product.parameters.frequenceRespiratoire && (
                          <div className="text-xs text-gray-600">Fréq. Resp.: {product.parameters.frequenceRespiratoire}</div>
                        )}
                        {product.parameters.volumeCourant && (
                          <div className="text-xs text-gray-600">Vol. Courant: {product.parameters.volumeCourant}</div>
                        )}
                        {product.parameters.mode && (
                          <div className="text-xs text-gray-600">Mode: {product.parameters.mode}</div>
                        )}
                        
                        {/* Concentrateur & Bouteille parameters */}
                        {product.parameters.debit && (
                          <div className="text-xs text-gray-600">Débit: {product.parameters.debit}</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            
            <Separator />
            <div className="flex justify-between items-center font-bold">
              <span>Total:</span>
              <span className="text-lg">{formatCurrency(totalAmount)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payment Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-green-500" />
            Informations de Paiement
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Payment Status Overview */}
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2">
              {fullyPaid ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : (
                <Clock className="h-5 w-5 text-amber-500" />
              )}
              <span className="font-medium">
                {fullyPaid ? 'Paiement Complet' : 'Paiement Partiel'}
              </span>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500">
                Payé: {formatCurrency(paidAmount)} / {formatCurrency(totalAmount)}
              </div>
              {!fullyPaid && (
                <div className="text-sm text-amber-600 font-medium">
                  Reste: {formatCurrency(remainingAmount)}
                </div>
              )}
            </div>
          </div>

          {/* Individual Payments */}
          {payments.length > 0 ? (
            <div className="space-y-3">
              <h4 className="font-medium text-gray-700">Détails des Paiements:</h4>
              {payments.map((payment: any, index: number) => (
                <div key={index} className="border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getPaymentMethodIcon(payment.type)}
                      <span className="font-medium">
                        {getPaymentMethodLabel(payment.type)}
                      </span>
                      {payment.metadata?.groupName && (
                        <Badge variant="outline" className="text-xs">
                          {payment.metadata.groupName}
                        </Badge>
                      )}
                    </div>
                    <Badge className="bg-green-100 text-green-800">
                      {formatCurrency(payment.amount)}
                    </Badge>
                  </div>

                  {/* Payment Details */}
                  <div className="text-sm text-gray-600 space-y-1">
                    {payment.type === 'cheque' && payment.chequeNumber && (
                      <p>Numéro de chèque: {payment.chequeNumber}</p>
                    )}
                    {payment.type === 'cheque' && payment.bank && (
                      <p>Banque: {payment.bank}</p>
                    )}
                    {payment.type === 'virement' && payment.reference && (
                      <p>Référence: {payment.reference}</p>
                    )}
                    {payment.type === 'virement' && payment.bank && (
                      <p>Banque: {payment.bank}</p>
                    )}
                    {payment.type === 'cnam' && payment.dossierNumber && (
                      <p>Dossier CNAM: {payment.dossierNumber}</p>
                    )}
                    {payment.type === 'traite' && payment.traiteNumber && (
                      <p>Numéro de traite: {payment.traiteNumber}</p>
                    )}
                    {payment.type === 'traite' && payment.dueDate && (
                      <p>Date d'échéance: {new Date(payment.dueDate).toLocaleDateString('fr-FR')}</p>
                    )}
                    {payment.type === 'mandat' && payment.mandatNumber && (
                      <p>Numéro de mandat: {payment.mandatNumber}</p>
                    )}
                    {payment.paymentDate && payment.type !== 'traite' && (
                      <p>Date: {new Date(payment.paymentDate).toLocaleDateString('fr-FR')}</p>
                    )}
                  </div>

                  {/* Products covered by this payment */}
                  {payment.metadata?.products && payment.metadata.products.length > 0 && (
                    <div className="mt-2 pt-2 border-t">
                      <p className="text-xs text-gray-500 mb-1">Produits couverts:</p>
                      <div className="flex flex-wrap gap-1">
                        {payment.metadata.products.map((product: any, idx: number) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {product.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* CNAM Step Tracking */}
                  {payment.cnamInfo && (
                    <div className="mt-3">
                      <CNAMStepSelector
                        cnamInfo={payment.cnamInfo}
                        onUpdate={() => {}} // Read-only in recap
                        editable={false}
                        className="border-0 shadow-none bg-transparent"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 text-gray-500">
              <AlertCircle className="h-8 w-8 mx-auto mb-2 text-amber-500" />
              <p>Aucun paiement configuré</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notes */}
      {notes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700 whitespace-pre-wrap">{notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex justify-end gap-3 pt-4">
        <Button variant="outline" onClick={onBack}>
          Modifier
        </Button>
        <Button 
          onClick={onFinalize} 
          disabled={isLoading}
          className="bg-green-600 hover:bg-green-700 text-white"
        >
          {isLoading ? 'Finalisation...' : 'Finaliser la Vente'}
        </Button>
      </div>
      </div>
    </StepperErrorBoundary>
  );
}

export default RecapitulationStep;