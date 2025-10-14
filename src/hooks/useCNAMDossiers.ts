import { useState, useCallback, useEffect } from 'react';
import { PaymentData } from '@/components/payment/context/PaymentContext';
import { useToast } from '@/components/ui/use-toast';

interface UseCNAMDossiersOptions {
  saleId?: string;
  initialPayments?: PaymentData[];
}

interface UseCNAMDossiersResult {
  payments: PaymentData[];
  cnamPayments: PaymentData[];
  pendingDossiers: PaymentData[];
  completedDossiers: PaymentData[];
  isLoading: boolean;
  error: string | null;
  loadPayments: () => Promise<void>;
  updateDossierStatus: (payment: PaymentData) => Promise<boolean>;
}

// Legacy payment from notes JSON
interface LegacyPayment {
  id: string;
  amount: number;
  method: string;
  type: string;
  classification: string;
  reference?: string;
  etatDossier?: string;
  isPending?: boolean;
  metadata?: any;
  createdAt: string | Date;
  createdBy?: string;
}

export function useCNAMDossiers({ 
  saleId, 
  initialPayments = [] 
}: UseCNAMDossiersOptions): UseCNAMDossiersResult {
  const [payments, setPayments] = useState<PaymentData[]>(initialPayments);
  const [isLoading, setIsLoading] = useState<boolean>(initialPayments.length === 0);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Process initial payments if provided
  useEffect(() => {
    if (initialPayments.length > 0) {
      // Process initial payments
    }
  }, [initialPayments]);

  // Process all payments to include both modern and legacy CNAM payments
  const processPayments = useCallback((rawPayments: any[]): PaymentData[] => {
    const processedPayments: PaymentData[] = [];
    
    // Process each payment
    for (const payment of rawPayments) {
      // Add the main payment
      processedPayments.push(payment);
      
      // If the payment has legacy payments, add them too
      if (payment.legacyPayments && Array.isArray(payment.legacyPayments)) {
        for (const legacyPayment of payment.legacyPayments) {
          
          // Convert legacy payment to PaymentData format
          processedPayments.push({
            ...legacyPayment,
            // Ensure required fields are present
            id: legacyPayment.id,
            amount: Number(legacyPayment.amount) || 0,
            method: legacyPayment.method || 'unknown',
            type: legacyPayment.type || 'standard',
            // Add CNAM-specific fields
            isPending: legacyPayment.isPending !== false,
            etatDossier: legacyPayment.etatDossier || null,
            numeroDossier: legacyPayment.reference || null,
            // Mark as legacy for UI purposes
            isLegacy: true
          });
        }
      }
    }
    
    return processedPayments;
  }, []);

  // Filter CNAM payments
  const cnamPayments = payments.filter(payment => payment.type === 'cnam');
  
  // Separate pending and completed dossiers
  const pendingDossiers = cnamPayments.filter(
    payment => payment.isPending !== false && !['accepte', 'refuse'].includes(payment.etatDossier || '')
  );
  
  const completedDossiers = cnamPayments.filter(
    payment => payment.isPending === false || ['accepte', 'refuse'].includes(payment.etatDossier || '')
  );
  
  console.log(`[useCNAMDossiers] Found ${pendingDossiers.length} pending and ${completedDossiers.length} completed CNAM dossiers`);

  // Load payments for a sale
  const loadPayments = useCallback(async () => {
    if (!saleId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // First try to get payments from the payments API endpoint
      const response = await fetch(`/api/sales/${saleId}/payments`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch payments: ${response.status} ${response.statusText}`);
      }
      
      const rawData = await response.json();
      
      // If we got no payments, try to get the sale data directly to check for CNAM payments
      if (rawData.length === 0) {
        // Fetch the sale data to check for CNAM payments in the sale notes
        const saleResponse = await fetch(`/api/sales/${saleId}`);
        
        if (saleResponse.ok) {
          const saleData = await saleResponse.json();
          
          // Check if the sale has payment data
          if (saleData.paymentDetails && Array.isArray(saleData.paymentDetails)) {
            // Look for CNAM payments
            const cnamPayments = saleData.paymentDetails.filter((p: any) => 
              p.method?.toLowerCase() === 'cnam' || p.type?.toLowerCase() === 'cnam'
            );
            
            if (cnamPayments.length > 0) {
              
              // Create a synthetic payment to hold the CNAM payment details
              rawData.push({
                id: `synthetic-sale-${Date.now()}`,
                amount: cnamPayments.reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0),
                method: 'CNAM',
                status: 'PAID',
                type: 'cnam',
                paymentDate: new Date(),
                legacyPayments: cnamPayments
              });
              
              console.log(`[useCNAMDossiers] Added synthetic payment with ${cnamPayments.length} CNAM payments`);
            }
          }
        }
      }
      
      // Process payments to include legacy CNAM payments
      const processedData = processPayments(rawData);
      
      setPayments(processedData);
    } catch (err) {
      setError('Impossible de charger les paiements CNAM');
    } finally {
      setIsLoading(false);
    }
  }, [saleId]);

  // Update a CNAM dossier status
  const updateDossierStatus = useCallback(async (updatedPayment: PaymentData): Promise<boolean> => {
    if (!updatedPayment.id) {
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour un paiement sans identifiant",
        variant: "destructive",
      });
      return false;
    }
    
    try {
      const response = await fetch(`/api/payments/cnam/${updatedPayment.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedPayment)
      });
      
      if (!response.ok) {
        throw new Error('Failed to update payment');
      }
      
      const updatedData = await response.json();
      
      // Update local state
      setPayments(prevPayments => 
        prevPayments.map(payment => 
          payment.id === updatedPayment.id ? updatedData : payment
        )
      );
      
      toast({
        title: "Dossier CNAM mis à jour",
        description: `Le statut du dossier a été mis à jour avec succès.`,
      });
      
      return true;
    } catch (err) {
      console.error('Error updating payment:', err);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le dossier CNAM",
        variant: "destructive",
      });
      return false;
    }
  }, [toast]);

  return {
    payments,
    cnamPayments,
    pendingDossiers,
    completedDossiers,
    isLoading,
    error,
    loadPayments,
    updateDossierStatus
  };
}
