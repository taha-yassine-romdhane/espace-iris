import React from 'react';
import { Button } from '@/components/ui/button';
import { usePayment } from '../context/PaymentContext';
import type { PaymentData } from '../context/PaymentContext';

/**
 * Component for displaying payment summary
 */
export const PaymentSummary: React.FC = () => {
  const { payments, removePayment, totalAmount, remainingAmount, requiredAmount, isComplete } = usePayment();
  

  if (payments.length === 0) {
    return (
      <div className="text-center p-6">
        <p className="text-gray-500">Aucun paiement ajouté</p>
      </div>
    );
  }

  // Group payments by method
  const groupedPayments = payments.reduce((acc, payment) => {
    if (!acc[payment.type]) {
      acc[payment.type] = [];
    }
    acc[payment.type].push(payment);
    return acc;
  }, {} as Record<string, PaymentData[]>);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-blue-500"></span>
          <span className="font-medium">
            État du paiement: {isComplete ? 'Complet' : 'Incomplet'}
          </span>
        </div>
      </div>

      {/* Payment methods summary */}
      <div className="mt-4 bg-white rounded-lg border p-4">
        <div className="space-y-4">
          {Object.entries(groupedPayments).map(([method, methodPayments]) => {
            const methodTotal = methodPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

            return (
              <div key={method} className="border-b pb-3 last:border-0">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-medium capitalize">{method}</h4>
                  <span className="font-medium text-blue-600">
                    {methodTotal.toFixed(2)} DT
                  </span>
                </div>

                {/* List individual payments within this method */}
                <div className="space-y-1 pl-4">
                  {methodPayments.map((payment, idx) => {
                    // Format additional details based on payment type
                    let details = '';
                    if (payment.type === 'cheque' && payment.chequeNumber) {
                      details = ` - N° ${payment.chequeNumber}`;
                    } else if (payment.type === 'virement' && payment.reference) {
                      details = ` - Ref: ${payment.reference}`;
                    } else if (payment.type === 'traite' && payment.echeance) {
                      details = ` - Échéance: ${payment.echeance}`;
                    }

                    return (
                      <div key={idx} className="flex justify-between text-sm group">
                        <span className="text-gray-600">
                          {payment.classification === 'principale' ? 'Principal' :
                            payment.classification === 'garantie' ? 'Garantie' : 'Complément'}
                          {details}
                          {payment.timestamp && (
                            <span className="text-xs text-gray-400 ml-2">
                              {new Date(payment.timestamp).toLocaleDateString()}
                            </span>
                          )}
                          {payment.description && (
                            <span className="text-xs text-blue-500 ml-2">
                              ({payment.description})
                            </span>
                          )}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{typeof payment.amount === 'number' ? payment.amount.toFixed(2) : Number(payment.amount || 0).toFixed(2)} DT</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => removePayment(idx)}
                          >
                            <span className="sr-only">Supprimer</span>
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg>
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-4 pt-3 border-t">
          <div className="flex justify-between font-medium">
            <span>Total des paiements:</span>
            <span className="text-blue-700">{totalAmount.toFixed(2)} DT</span>
          </div>

          <div className="flex justify-between mt-1">
            <span>Montant Total:</span>
            <span className="font-medium">{requiredAmount.toFixed(2)} DT</span>
          </div>

          {remainingAmount > 0 && (
            <div className="flex justify-between mt-1 text-amber-600">
              <span>Reste à Payer:</span>
              <span className="font-bold">{remainingAmount.toFixed(2)} DT</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaymentSummary;
