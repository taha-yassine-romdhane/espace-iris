import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Info, Calendar } from "lucide-react";

interface PaymentFormProps {
  paymentType: string;
  formData: {
    amount: number;
    deposit?: number;
    balance?: number;
    bankName?: string;
    checkNumber?: string;
    owner?: string;
    dueDate?: string;
    transactionId?: string;
    mandateNumber?: string;
    amountCovered?: number;
    depositDate?: string;
    [key: string]: any;
  };
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function PaymentDetailsForm({ paymentType, formData, onInputChange }: PaymentFormProps) {
  return (
    <div className="space-y-4">
      {/* Common Fields */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="amount">Montant Total</Label>
          <Input
            id="amount"
            name="amount"
            type="number"
            value={formData.amount || ""}
            onChange={onInputChange}
            className="border-blue-200 focus:border-blue-500"
          />
        </div>
        
        {/* Cash Payment Fields */}
        {paymentType === 'cash' && (
          <>
            <div className="space-y-2">
              <Label htmlFor="deposit">Acompte</Label>
              <Input
                id="deposit"
                name="deposit"
                type="number"
                value={formData.deposit || ""}
                onChange={onInputChange}
                className="border-blue-200 focus:border-blue-500"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="balance">Reste</Label>
              <Input
                id="balance"
                name="balance"
                type="number"
                value={formData.balance || ""}
                onChange={onInputChange}
                disabled
                className="bg-gray-50"
              />
            </div>
          </>
        )}
        
        {/* Check Payment Fields */}
        {(paymentType === 'check' || paymentType === 'draft') && (
          <>
            <div className="space-y-2">
              <Label htmlFor="bankName">Banque</Label>
              <Input
                id="bankName"
                name="bankName"
                type="text"
                value={formData.bankName || ""}
                onChange={onInputChange}
                className="border-blue-200 focus:border-blue-500"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="checkNumber">
                {paymentType === 'check' ? "Numéro Chèque" : "Numéro Traite"}
              </Label>
              <Input
                id="checkNumber"
                name="checkNumber"
                type="text"
                value={formData.checkNumber || ""}
                onChange={onInputChange}
                className="border-blue-200 focus:border-blue-500"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="owner">Propriétaire</Label>
              <Input
                id="owner"
                name="owner"
                type="text"
                value={formData.owner || ""}
                onChange={onInputChange}
                className="border-blue-200 focus:border-blue-500"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dueDate">Date Échéance</Label>
              <div className="relative">
                <Input
                  id="dueDate"
                  name="dueDate"
                  type="date"
                  value={formData.dueDate || ""}
                  onChange={onInputChange}
                  className="border-blue-200 focus:border-blue-500"
                />
                <Calendar className="absolute right-3 top-2.5 h-4 w-4 text-gray-400" />
              </div>
            </div>
          </>
        )}
        
        {/* Bank Transfer Fields */}
        {paymentType === 'transfer' && (
          <>
            <div className="space-y-2">
              <Label htmlFor="bankName">Banque</Label>
              <Input
                id="bankName"
                name="bankName"
                type="text"
                value={formData.bankName || ""}
                onChange={onInputChange}
                className="border-blue-200 focus:border-blue-500"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="transactionId">ID Transaction</Label>
              <Input
                id="transactionId"
                name="transactionId"
                type="text"
                value={formData.transactionId || ""}
                onChange={onInputChange}
                className="border-blue-200 focus:border-blue-500"
              />
            </div>
          </>
        )}
        
        {/* Mandate Fields */}
        {paymentType === 'mandate' && (
          <div className="space-y-2">
            <Label htmlFor="mandateNumber">Numéro Mandat</Label>
            <Input
              id="mandateNumber"
              name="mandateNumber"
              type="text"
              value={formData.mandateNumber || ""}
              onChange={onInputChange}
              className="border-blue-200 focus:border-blue-500"
            />
          </div>
        )}
        
        {/* CNAM Fields */}
        {paymentType === 'cnam' && (
          <>
            <div className="space-y-2">
              <Label htmlFor="amountCovered">Montant Prise en Charge</Label>
              <Input
                id="amountCovered"
                name="amountCovered"
                type="number"
                value={formData.amountCovered || ""}
                onChange={onInputChange}
                className="border-blue-200 focus:border-blue-500"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="depositDate">Date Déposé</Label>
              <div className="relative">
                <Input
                  id="depositDate"
                  name="depositDate"
                  type="date"
                  value={formData.depositDate || ""}
                  onChange={onInputChange}
                  className="border-blue-200 focus:border-blue-500"
                />
                <Calendar className="absolute right-3 top-2.5 h-4 w-4 text-gray-400" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="balance">Contribution Patient</Label>
              <Input
                id="balance"
                name="balance"
                type="number"
                value={formData.balance || ""}
                onChange={onInputChange}
                disabled
                className="bg-gray-50"
              />
            </div>
          </>
        )}
      </div>
      
      {/* Information Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mt-4">
        <div className="flex gap-3">
          <Info className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div>
            <h5 className="font-medium text-blue-700 mb-1">Information sur le paiement</h5>
            <p className="text-sm text-blue-600">
              Vous pouvez suivre l'état d'avancement de ce paiement même après avoir terminé cette vente. 
              Les étapes non complétées resteront accessibles dans le système pour être finalisées ultérieurement.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PaymentDetailsForm;
