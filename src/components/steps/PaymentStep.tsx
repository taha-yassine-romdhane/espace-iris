import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

// Import the new payment system
import { PaymentData } from "@/components/payment/paymentForms";
import { transformPaymentData, validatePaymentData } from "@/lib/payment-utils";
// Import ProductPaymentMatrix
import { ProductPaymentMatrix } from "@/components/payment/components/ProductPaymentMatrix";
import { ProductPaymentMatrixEnhanced } from "@/components/payment/components/ProductPaymentMatrixEnhanced";
import { cn } from "@/lib/utils";

interface PaymentAssignment {
  id: string;
  productIds: string[];
  groupName: string;
  paymentMethod: string;
  amount: number;
  paymentDetails?: any;
  cnamInfo?: {
    bondType: string;
    currentStep: number;
    totalSteps: number;
    status: 'en_attente_approbation' | 'approuve' | 'termine' | 'refuse';
    notes?: string;
    bondAmount?: number;
    devicePrice?: number;
    complementAmount?: number;
  };
}

interface PaymentStepProps {
  onBack: () => void;
  onComplete: (paymentData: any) => void;
  selectedClient: any;
  selectedProducts: any[];
  calculateTotal: () => number;
  isRental?: boolean;
  initialPaymentData?: any; // Add support for initial payment data
}

export function PaymentStep({
  onBack,
  onComplete,
  selectedClient,
  selectedProducts,
  calculateTotal,
  isRental = false,
  initialPaymentData
}: PaymentStepProps) {
  // Initialize paymentAssignments with existing data if available
  const [paymentAssignments, setPaymentAssignments] = useState<PaymentAssignment[]>(
    initialPaymentData && Array.isArray(initialPaymentData) ? initialPaymentData : []
  );
  const [useEnhancedMatrix, setUseEnhancedMatrix] = useState(true);
  const { toast } = useToast();

  // Check if selected client is a patient
  const isPatient = selectedClient?.type === "patient";

  // Transform products for ProductPaymentMatrix
  const transformedProducts = selectedProducts.map(product => ({
    id: product.id || product.productId || product.medicalDeviceId,
    name: product.name || product.product?.name || product.medicalDevice?.name,
    type: product.type || product.product?.type || 'UNKNOWN',
    sellingPrice: Number(product.sellingPrice || product.product?.sellingPrice || product.medicalDevice?.sellingPrice || 0),
    quantity: Number(product.quantity || 1)
  }));

  // Calculate payment totals
  const totalAmount = calculateTotal();
  const paidAmount = paymentAssignments.reduce((sum, assignment) => sum + assignment.amount, 0);
  const remainingAmount = Math.max(0, totalAmount - paidAmount);
  const isComplete = paidAmount >= totalAmount;


  // Payment assignment handlers
  const handleCreatePaymentGroup = (assignment: PaymentAssignment) => {
    setPaymentAssignments(prev => [...prev, assignment]);
  };

  const handleUpdatePaymentGroup = (id: string, assignment: PaymentAssignment) => {
    setPaymentAssignments(prev => 
      prev.map(p => p.id === id ? assignment : p)
    );
  };

  const handleDeletePaymentGroup = (id: string) => {
    setPaymentAssignments(prev => prev.filter(p => p.id !== id));
  };

  // Handle payment completion for product matrix
  const handleCompleteProductPayments = async () => {
    try {
      if (paymentAssignments.length === 0) {
        toast({
          title: "Aucun paiement configuré",
          description: "Veuillez créer au moins un groupe de paiement",
          variant: "destructive"
        });
        return;
      }

      // Check CNAM payments for required step information
      const cnamPayments = paymentAssignments.filter(a => a.paymentMethod === 'cnam');
      for (const cnamPayment of cnamPayments) {
        if (!cnamPayment.cnamInfo || !cnamPayment.cnamInfo.currentStep || cnamPayment.cnamInfo.currentStep < 1) {
          toast({
            title: "Étape CNAM manquante",
            description: `Veuillez sélectionner l'étape actuelle pour le paiement CNAM "${cnamPayment.groupName}"`,
            variant: "destructive"
          });
          return;
        }
      }

      // Convert payment assignments to PaymentData format
      const payments: PaymentData[] = paymentAssignments.map(assignment => ({
        type: assignment.paymentMethod as any,
        amount: assignment.amount,
        classification: 'principale',
        timestamp: new Date().toISOString(),
        ...assignment.paymentDetails, // Include payment-specific details (cheque number, reference, etc.)
        ...(assignment.cnamInfo && {
          cnamInfo: assignment.cnamInfo,
          isPending: assignment.cnamInfo.status !== 'approuve'
        }),
        metadata: {
          groupName: assignment.groupName,
          productIds: assignment.productIds,
          products: assignment.productIds.map(id => 
            transformedProducts.find(p => p.id === id)
          ).filter(Boolean)
        }
      }));

      // Process the payments using existing logic
      onComplete(payments);
    } catch (error) {
      console.error('Error completing product payments:', error);
      toast({
        title: "Erreur lors de la finalisation",
        description: "Une erreur est survenue lors de la finalisation des paiements",
        variant: "destructive"
      });
    }
  };


  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <Button variant="outline" onClick={onBack} className="flex items-center gap-2">
          <ChevronLeft className="h-4 w-4" /> Retour
        </Button>
        <h2 className="text-2xl font-bold text-center">Paiement</h2>
        <div className="w-[100px]"></div> {/* Spacer for alignment */}
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-medium">Détails du Paiement</h3>
          
          {/* Payment status indicator */}
          <div className="flex items-center gap-2">
            <div className={cn(
              "w-2 h-2 rounded-full", 
              isComplete ? "bg-green-500" : "bg-amber-500"
            )}></div>
            <span className={cn(
              "text-sm", 
              isComplete ? "text-green-700" : "text-amber-700"
            )}>
              {isComplete ? 'Paiement complet' : `Reste à payer: ${remainingAmount.toFixed(2)} DT`}
            </span>
          </div>
        </div>

        <div className="text-center mb-4">
          <p className="text-gray-500">Montant total: {totalAmount.toFixed(2)} DT</p>
        </div>

        {/* Product Payment Mode Header */}
        <div className="mb-6 text-center">
          <h3 className="text-lg font-medium text-gray-900">Paiement par Produit</h3>
          <p className="text-sm text-gray-500">Configurez les paiements pour chaque produit individuellement</p>
        </div>

        {/* Product Payment Matrix Mode */}
        <div className="space-y-6">
          {useEnhancedMatrix ? (
            <ProductPaymentMatrixEnhanced
              products={transformedProducts}
              paymentAssignments={paymentAssignments}
              onCreatePaymentGroup={handleCreatePaymentGroup}
              onUpdatePaymentGroup={handleUpdatePaymentGroup}
              onDeletePaymentGroup={handleDeletePaymentGroup}
              isCompany={!isPatient}
              selectedClient={selectedClient}
            />
          ) : (
            <ProductPaymentMatrix
              products={transformedProducts}
              paymentAssignments={paymentAssignments}
              onCreatePaymentGroup={handleCreatePaymentGroup}
              onUpdatePaymentGroup={handleUpdatePaymentGroup}
              onDeletePaymentGroup={handleDeletePaymentGroup}
              isCompany={!isPatient}
            />
          )}

          {/* Complete button for product matrix */}
          {isComplete && (
            <div className="mt-6 flex justify-end">
              <Button 
                onClick={handleCompleteProductPayments}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                Terminer le Paiement
              </Button>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}

export default PaymentStep;