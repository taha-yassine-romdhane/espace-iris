import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PaymentProvider, usePayment } from '../context/PaymentContext';
import { PAYMENT_TYPES } from '../config/paymentTypes';
import PaymentTypeCard from './PaymentTypeCard';
import PaymentSummary from './PaymentSummary';
import CNAMStepTracker from './CNAMStepTracker';

/**
 * Props for the PaymentDialog component
 */
export interface PaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  totalAmount: number;
  onComplete: (payments: any[]) => void;
  selectedProducts?: any[];
  isRental?: boolean;
  isCompany?: boolean;
}

/**
 * The inner content of the payment dialog that uses the payment context
 */
const PaymentDialogContent = ({ 
  onOpenChange, 
  onComplete,
  selectedProducts = [],
  isRental = false,
  isCompany = false
}: { 
  onOpenChange: (open: boolean) => void;
  onComplete: (payments: any[]) => void;
  selectedProducts?: any[];
  isRental?: boolean;
  isCompany?: boolean;
}) => {
  // State for the payment form
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState<"types" | "summary">("types");
  const [initialValues, setInitialValues] = useState<any>(null);

  // Get payment context
  const paymentContext = usePayment();

  // Find the selected payment type configuration
  const selectedPaymentType = PAYMENT_TYPES.find(type => type.id === selectedType);

  // Handle payment type selection
  const handleTypeSelect = (typeId: string) => {
    // If selecting the same type, do nothing
    if (typeId === selectedType && showForm) return;

    // Otherwise, update the selected type and reset the form
    setSelectedType(typeId);
    setFormKey(prevKey => prevKey + 1); // Increment key to force form reset
    setShowForm(true);
  };

  // Handle form submission
  const handleFormSubmit = (data: any) => {
    setIsSubmitting(true);

    try {
      // Make sure we have the payment context and valid data
      if (paymentContext && data) {
        // Log the payment data for debugging
        console.log('Adding payment:', data);

        // Make sure we have the required fields
        if (!data.amount && data.amount !== 0) {
          console.error('Payment data missing amount');
          return;
        }

        // Convert amount to number if it's a string
        const paymentData = {
          ...data,
          amount: typeof data.amount === 'string' ? parseFloat(data.amount) : data.amount
        };

        console.log('Processed payment data:', paymentData);

        // Add the payment to the context
        paymentContext.addPayment(paymentData);
        
        // Reset the form state
        setShowForm(false);
        setInitialValues(null);
        
        if (selectedType !== 'cnam') {
          // For other payment types, reset the selected type to allow selecting another payment method
          setSelectedType(null);
        }
        
        setFormKey(prevKey => prevKey + 1);
        
        // Use setTimeout to ensure state updates have completed before changing tabs
        setTimeout(() => {
          // Always show the summary tab after adding a payment
          setActiveTab("summary");
        }, 100);
      }
      // The reset code has already been executed inside the if block above
    } catch (error) {
      console.error('Error submitting payment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle dialog close
  const handleDialogClose = () => {
    if (paymentContext.isComplete) {
      onComplete(paymentContext.payments);
    }
    onOpenChange(false);
  };

  return (
    <>
      {activeTab === "summary" && selectedType === 'cnam' ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-lg">Suivi du Dossier CNAM</h3>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setActiveTab("types");
                  setShowForm(false);
                }}
              >
                Ajouter un autre paiement
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowForm(false);
                  setActiveTab("types");
                }}
              >
                Retour aux types de paiement
              </Button>
            </div>
          </div>

          <CNAMStepTracker
            steps={[
              { id: 1, name: "Accord est avec patient", description: "Accord est avec le patient", completed: true },
              { id: 2, name: "Dossier déposé", description: "Dossier déposé à la CNAM", completed: false },
              { id: 3, name: "Paiement reçu", description: "Paiement reçu de la CNAM", completed: false }
            ]}
            currentStep={2}
            onStepComplete={(stepId) => {
              console.log("Step completed:", stepId);
            }}
          />

          {/* Show payment summary for CNAM */}
          <div className="mt-4">
            <PaymentSummary />
          </div>
        </div>
      ) : activeTab === "summary" ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-lg">Récapitulatif des Paiements</h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setActiveTab("types");
                setShowForm(false);
              }}
            >
              Retour aux types de paiement
            </Button>
          </div>

          {/* Show payment summary */}
          <PaymentSummary />
        </div>
      ) : showForm && selectedPaymentType?.component ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-lg">
              {selectedPaymentType.title}
            </h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setShowForm(false);
              }}
            >
              Retour aux types de paiement
            </Button>
          </div>

          {/* Render the selected payment form component */}
          {React.createElement(selectedPaymentType.component, {
            key: formKey,
            onSubmit: handleFormSubmit,
            initialValues: initialValues,
            isSubmitting: isSubmitting,
            selectedProducts: selectedType === 'cnam' ? selectedProducts : undefined,
            isRental: selectedType === 'cnam' ? isRental : undefined,
          })}
        </div>
      ) : (
        <div className="space-y-4">
          <Tabs value={activeTab} onValueChange={(value) => {
            console.log('Tab changed to:', value);
            setActiveTab(value as "types" | "summary");
          }} 
          className="w-full">
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="types">Types de Paiement</TabsTrigger>
              <TabsTrigger value="summary">Récapitulatif</TabsTrigger>
            </TabsList>

            <TabsContent value="types" className="space-y-4 pt-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {PAYMENT_TYPES.filter(type => {
                  // For companies, only show especes, virement, cheque, and traite
                  if (isCompany) {
                    return ['especes', 'virement', 'cheque', 'traite'].includes(type.id);
                  }
                  // For patients, show all payment types
                  return true;
                }).map((type) => (
                  <PaymentTypeCard
                    key={type.id}
                    id={type.id}
                    title={type.title}
                    description={type.description}
                    icon={type.icon}
                    onClick={() => handleTypeSelect(type.id)}
                    isActive={selectedType === type.id}
                  />
                ))}
              </div>
            </TabsContent>

            <TabsContent value="summary" className="space-y-4 pt-2">
              <PaymentSummary />
            </TabsContent>
          </Tabs>
        </div>
      )}

      {/* Action buttons */}
      <div className="mt-6 flex justify-between">
        {!showForm && activeTab === "summary" && (
          <Button
            variant="outline"
            onClick={() => {
              setActiveTab("types");
              setShowForm(false);
            }}
          >
            Ajouter un paiement
          </Button>
        )}
        <Button
          onClick={handleDialogClose}
          className={!showForm && activeTab === "summary" ? "ml-auto" : ""}
        >
          Terminer
        </Button>
      </div>
    </>
  );
};

/**
 * Main payment dialog component
 */
const PaymentDialog: React.FC<PaymentDialogProps> = ({ 
  open, 
  onOpenChange, 
  totalAmount, 
  onComplete,
  selectedProducts = [],
  isRental = false,
  isCompany = false
}) => {
  // No need for reset logic here as it's handled in the inner component

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gestion des Paiements</DialogTitle>
        </DialogHeader>

        <PaymentProvider requiredAmount={totalAmount}>
          <PaymentDialogContent 
            onOpenChange={onOpenChange} 
            onComplete={onComplete}
            selectedProducts={selectedProducts}
            isRental={isRental}
            isCompany={isCompany}
          />
        </PaymentProvider>
      </DialogContent>
    </Dialog>
  );
};

export default PaymentDialog;