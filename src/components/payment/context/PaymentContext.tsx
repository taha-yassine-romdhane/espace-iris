import React, { createContext, useState, useContext, useEffect } from 'react';

/**
 * Payment data structure
 */
export interface PaymentData {
  id?: string;
  type: string;
  classification: 'principale' | 'garantie' | 'complement';
  amount: number;
  reference?: string;
  chequeNumber?: string;
  bankName?: string;
  dueDate?: string;
  echeance?: string;
  timestamp?: string;
  createdBy?: string;
  description?: string;
  
  // CNAM specific fields
  cnamBonType?: 'masque' | 'cpap' | 'autre';
  relatedMedicalDeviceIds?: string[];
  relatedProductIds?: string[];
  
  // CNAM dossier fields
  etatDossier?: 'en_attente' | 'en_cours' | 'complement_dossier' | 'accepte' | 'refuse';
  dateDepose?: string;
  dateRappel?: string;
  dateAcceptation?: string;
  dateExpiration?: string;
  statusHistory?: Array<{
    date: string;
    status: string;
    note?: string;
    user: string;
  }>;
  
  // Payment tracking fields
  isPending?: boolean;
  requiresFollowUp?: boolean;
  dossierReference?: string;
  metadata?: {
    bonType?: string;
    originalAmount?: number;
    pendingStatus?: boolean;
    lastUpdated?: string;
    expectedCompletionDate?: string | null;
    [key: string]: any;
  };
}

/**
 * Payment context type
 */
export interface PaymentContextType {
  payments: PaymentData[];
  addPayment: (payment: PaymentData) => void;
  updatePayment: (index: number, payment: PaymentData) => void;
  removePayment: (index: number) => void;
  totalAmount: number;
  remainingAmount: number;
  requiredAmount: number;
  isComplete: boolean;
}

/**
 * Payment provider props
 */
export interface PaymentProviderProps {
  children: React.ReactNode;
  requiredAmount: number;
}

// Create the context with default values
const PaymentContext = createContext<PaymentContextType>({
  payments: [],
  addPayment: () => { },
  updatePayment: () => { },
  removePayment: () => { },
  totalAmount: 0,
  remainingAmount: 0,
  requiredAmount: 0,
  isComplete: false
});

/**
 * Hook to use the payment context
 */
export const usePayment = () => {
  const context = useContext(PaymentContext);
  if (!context) {
    throw new Error('usePayment must be used within a PaymentProvider');
  }
  return context;
};

/**
 * Provider component to wrap around components that need access to payment data
 */
export const PaymentProvider = ({ children, requiredAmount }: PaymentProviderProps) => {
  const [payments, setPayments] = useState<PaymentData[]>([]);

  // Calculate the total amount from all payments
  const totalAmount = payments.reduce((sum, payment) => {
    const amount = payment.amount || 0;
    console.log(`Payment: ${payment.type}, Amount: ${amount}`);
    return sum + amount;
  }, 0);
  
  // Log the current state of payments for debugging
  useEffect(() => {
    console.log('Current payments state:', payments);
    console.log('Total amount:', totalAmount);
    console.log('Required amount:', requiredAmount);
  }, [payments, totalAmount, requiredAmount]);

  // Calculate remaining amount
  const remainingAmount = Math.max(0, requiredAmount - totalAmount);

  // Check if payment is complete
  const isComplete = totalAmount >= requiredAmount;

  // Add a new payment
  const addPayment = (payment: PaymentData) => {
    // Ensure payment has all required fields
    const validatedPayment = {
      ...payment,
      id: `payment-${Date.now()}`,
      timestamp: new Date().toISOString(),
      createdBy: 'Admin', // In a real app, this would be the current user
      amount: typeof payment.amount === 'string' ? parseFloat(payment.amount) : payment.amount
    };

    console.log('Adding validated payment:', validatedPayment);

    // Important: Create a completely new array to trigger React's state update
    setPayments(currentPayments => {
      const newPayments = [...currentPayments, validatedPayment];
      console.log('New payments array:', newPayments);
      return newPayments;
    });
  };

  // Update an existing payment
  const updatePayment = (index: number, payment: PaymentData) => {
    const newPayments = [...payments];
    newPayments[index] = payment;
    setPayments(newPayments);
  };

  // Remove a payment
  const removePayment = (index: number) => {
    setPayments(payments.filter((_, i) => i !== index));
  };

  return (
    <PaymentContext.Provider value={{
      payments,
      addPayment,
      updatePayment,
      removePayment,
      totalAmount,
      remainingAmount,
      requiredAmount,
      isComplete
    }}>
      {children}
    </PaymentContext.Provider>
  );
};

export default PaymentContext;
