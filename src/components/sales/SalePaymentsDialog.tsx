import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { formatCurrency } from '@/utils/priceUtils';
import { ProductPaymentMatrixEnhanced } from '@/components/payment/components/ProductPaymentMatrixEnhanced';

interface SaleItem {
  id?: string;
  productId?: string;
  medicalDeviceId?: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  itemTotal: number;
  product?: {
    id: string;
    name: string;
    type: string;
    sellingPrice: number;
  };
  medicalDevice?: {
    id: string;
    name: string;
    type: string;
    sellingPrice: number;
  };
}

interface SalePaymentsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  saleItems: SaleItem[];
  payments: any[];
  onSave: (payments: any[]) => void;
  clientType: 'patient' | 'company' | null;
}

export function SalePaymentsDialog({
  isOpen,
  onClose,
  saleItems,
  payments: initialPayments,
  onSave,
  clientType
}: SalePaymentsDialogProps) {
  const [payments, setPayments] = useState<any[]>(initialPayments || []);
  const { toast } = useToast();

  // Transform sale items to match ProductPaymentMatrix format
  const transformedProducts = saleItems.map(item => ({
    id: item.productId || item.medicalDeviceId || '',
    name: item.product?.name || item.medicalDevice?.name || '',
    type: item.product?.type || item.medicalDevice?.type || '',
    sellingPrice: item.unitPrice,
    quantity: item.quantity
  }));

  const totalAmount = saleItems.reduce((sum, item) => sum + item.itemTotal, 0);
  const paidAmount = payments.reduce((sum, payment) => sum + (payment.amount || 0), 0);
  const remainingAmount = totalAmount - paidAmount;

  const handlePaymentsChange = (newPayments: any[]) => {
    setPayments(newPayments);
  };

  const handleSave = () => {
    onSave(payments);
    onClose();
    toast({
      title: 'Succès',
      description: 'Les paiements ont été enregistrés'
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Gérer les Paiements de la Vente</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          {saleItems.length > 0 ? (
            <div className="space-y-4">
              {/* Payment Summary */}
              <div className="grid grid-cols-3 gap-4 p-4 bg-slate-50 rounded-lg">
                <div>
                  <div className="text-xs text-slate-600">Montant Total</div>
                  <div className="text-xl font-bold text-slate-900">
                    {formatCurrency(totalAmount)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-600">Montant Payé</div>
                  <div className="text-xl font-bold text-green-700">
                    {formatCurrency(paidAmount)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-600">Reste à Payer</div>
                  <div className={`text-xl font-bold ${remainingAmount > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                    {formatCurrency(remainingAmount)}
                  </div>
                </div>
              </div>

              {/* Payment Matrix - Temporarily disabled due to prop mismatch */}
              {/* TODO: Fix ProductPaymentMatrixEnhanced props or use different component */}
              <div className="p-4 border rounded bg-yellow-50">
                <p className="text-sm text-yellow-800">
                  Payment matrix temporarily disabled. Component props need to be updated.
                </p>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-slate-500">
              <p>Veuillez d'abord ajouter des articles à la vente</p>
              <p className="text-sm mt-2">Les paiements seront répartis sur les articles</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button
            onClick={handleSave}
            className="bg-blue-900 hover:bg-blue-700"
            disabled={saleItems.length === 0}
          >
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
