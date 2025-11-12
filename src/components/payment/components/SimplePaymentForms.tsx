import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ControlledDatePicker } from './ControlledDatePicker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { roundToCents } from '@/utils/priceUtils';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ProductAllocationControl } from './ProductAllocationControl';

interface SimplePaymentFormProps {
  onSubmit: (data: any) => void;
  onCancel: () => void;
  totalRequired: number;
  initialValues?: any;
  selectedProducts?: any[];
}

export const SimpleEspecesForm: React.FC<SimplePaymentFormProps> = ({ 
  onSubmit, 
  onCancel, 
  totalRequired,
  initialValues,
  selectedProducts = []
}) => {
  const [amount, setAmount] = useState(initialValues?.amount || totalRequired);
  const [received, setReceived] = useState(initialValues?.received || totalRequired);
  const [paymentDate, setPaymentDate] = useState(initialValues?.paymentDate || new Date());
  const [productAllocations, setProductAllocations] = useState<Record<string, number>>(
    initialValues?.productAllocations || {}
  );

  // Calculate total allocated and remaining
  const totalAllocated = Object.values(productAllocations).reduce((sum, amount) => sum + (amount || 0), 0);
  const isFullyAllocated = Math.abs(amount - totalAllocated) < 0.01;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate that allocations are complete if products are selected
    if (selectedProducts.length > 0 && !isFullyAllocated) {
      alert(`Veuillez allouer le montant complet du paiement. Reste à allouer: ${(amount - totalAllocated).toFixed(2)} DT`);
      return;
    }
    
    onSubmit({
      type: 'especes',
      amount,
      received,
      paymentDate: format(paymentDate, 'yyyy-MM-dd'),
      classification: 'principale',
      productAllocations: selectedProducts.length > 0 ? productAllocations : undefined
    });
  };

  const change = received - amount;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="amount">Montant à payer</Label>
        <Input
          id="amount"
          type="number"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
          className="mt-1"
          required
        />
      </div>

      <div>
        <Label htmlFor="received">Montant reçu</Label>
        <Input
          id="received"
          type="number"
          step="0.01"
          value={received}
          onChange={(e) => setReceived(parseFloat(e.target.value) || 0)}
          className="mt-1"
          required
        />
      </div>

      {change > 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Monnaie à rendre: <strong>{change.toFixed(2)} DT</strong>
          </AlertDescription>
        </Alert>
      )}

      <div>
        <Label>Date du paiement</Label>
        <div className="mt-1">
          <ControlledDatePicker
            value={paymentDate}
            onChange={(date) => {
              if (date) {
                setPaymentDate(date);
              }
            }}
          />
        </div>
      </div>

      {/* Product Allocation Section */}
      {selectedProducts.length > 0 && amount > 0 && (
        <ProductAllocationControl
          selectedProducts={selectedProducts}
          totalPaymentAmount={amount}
          productAllocations={productAllocations}
          onAllocationChange={setProductAllocations}
        />
      )}

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Annuler
        </Button>
        <Button type="submit">
          Valider le paiement
        </Button>
      </div>
    </form>
  );
};

export const SimpleChequeForm: React.FC<SimplePaymentFormProps> = ({ 
  onSubmit, 
  onCancel, 
  totalRequired,
  initialValues,
  selectedProducts = []
}) => {
  const [amount, setAmount] = useState(initialValues?.amount || totalRequired);
  const [chequeNumber, setChequeNumber] = useState(initialValues?.chequeNumber || '');
  const [bank, setBank] = useState(initialValues?.bank || '');
  const [paymentDate, setPaymentDate] = useState(initialValues?.paymentDate || new Date());
  const [notes, setNotes] = useState(initialValues?.notes || '');
  const [productAllocations, setProductAllocations] = useState<Record<string, number>>(
    initialValues?.productAllocations || {}
  );

  // Calculate total allocated and remaining
  const totalAllocated = Object.values(productAllocations).reduce((sum, amount) => sum + (amount || 0), 0);
  const isFullyAllocated = Math.abs(amount - totalAllocated) < 0.01;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate that allocations are complete if products are selected
    if (selectedProducts.length > 0 && !isFullyAllocated) {
      alert(`Veuillez allouer le montant complet du paiement. Reste à allouer: ${(amount - totalAllocated).toFixed(2)} DT`);
      return;
    }
    
    onSubmit({
      type: 'cheque',
      amount,
      chequeNumber,
      bank,
      paymentDate: format(paymentDate, 'yyyy-MM-dd'),
      notes,
      classification: 'principale',
      productAllocations: selectedProducts.length > 0 ? productAllocations : undefined
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="amount">Montant</Label>
        <Input
          id="amount"
          type="number"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
          className="mt-1"
          required
        />
      </div>

      <div>
        <Label htmlFor="chequeNumber">Numéro de chèque</Label>
        <Input
          id="chequeNumber"
          value={chequeNumber}
          onChange={(e) => setChequeNumber(e.target.value)}
          className="mt-1"
          placeholder="Ex: 123456"
          required
        />
      </div>

      <div>
        <Label htmlFor="bank">Banque</Label>
        <Input
          id="bank"
          value={bank}
          onChange={(e) => setBank(e.target.value)}
          className="mt-1"
          placeholder="Ex: BNA, UIB, STB..."
          required
        />
      </div>

      <div>
        <Label>Date du chèque</Label>
        <div className="mt-1">
          <ControlledDatePicker
            value={paymentDate}
            onChange={(date) => {
              if (date) {
                setPaymentDate(date);
              }
            }}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="notes">Notes (optionnel)</Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="mt-1"
          rows={2}
        />
      </div>

      {/* Product Allocation Section */}
      {selectedProducts.length > 0 && amount > 0 && (
        <ProductAllocationControl
          selectedProducts={selectedProducts}
          totalPaymentAmount={amount}
          productAllocations={productAllocations}
          onAllocationChange={setProductAllocations}
        />
      )}

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Annuler
        </Button>
        <Button type="submit">
          Valider le paiement
        </Button>
      </div>
    </form>
  );
};

export const SimpleVirementForm: React.FC<SimplePaymentFormProps> = ({ 
  onSubmit, 
  onCancel, 
  totalRequired,
  initialValues,
  selectedProducts = []
}) => {
  const [amount, setAmount] = useState(initialValues?.amount || totalRequired);
  const [reference, setReference] = useState(initialValues?.reference || '');
  const [bank, setBank] = useState(initialValues?.bank || '');
  const [paymentDate, setPaymentDate] = useState(initialValues?.paymentDate || new Date());
  const [productAllocations, setProductAllocations] = useState<Record<string, number>>(
    initialValues?.productAllocations || {}
  );

  // Calculate total allocated and remaining
  const totalAllocated = Object.values(productAllocations).reduce((sum, amount) => sum + (amount || 0), 0);
  const isFullyAllocated = Math.abs(amount - totalAllocated) < 0.01;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate that allocations are complete if products are selected
    if (selectedProducts.length > 0 && !isFullyAllocated) {
      alert(`Veuillez allouer le montant complet du paiement. Reste à allouer: ${(amount - totalAllocated).toFixed(2)} DT`);
      return;
    }
    
    onSubmit({
      type: 'virement',
      amount,
      reference,
      bank,
      paymentDate: format(paymentDate, 'yyyy-MM-dd'),
      classification: 'principale',
      productAllocations: selectedProducts.length > 0 ? productAllocations : undefined
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="amount">Montant</Label>
        <Input
          id="amount"
          type="number"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
          className="mt-1"
          required
        />
      </div>

      <div>
        <Label htmlFor="reference">Référence du virement</Label>
        <Input
          id="reference"
          value={reference}
          onChange={(e) => setReference(e.target.value)}
          className="mt-1"
          placeholder="Ex: VIR123456"
          required
        />
      </div>

      <div>
        <Label htmlFor="bank">Banque</Label>
        <Input
          id="bank"
          value={bank}
          onChange={(e) => setBank(e.target.value)}
          className="mt-1"
          placeholder="Ex: BNA, UIB, STB..."
          required
        />
      </div>

      <div>
        <Label>Date du virement</Label>
        <div className="mt-1">
          <ControlledDatePicker
            value={paymentDate}
            onChange={(date) => {
              if (date) {
                setPaymentDate(date);
              }
            }}
          />
        </div>
      </div>

      {/* Product Allocation Section */}
      {selectedProducts.length > 0 && amount > 0 && (
        <ProductAllocationControl
          selectedProducts={selectedProducts}
          totalPaymentAmount={amount}
          productAllocations={productAllocations}
          onAllocationChange={setProductAllocations}
        />
      )}

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Annuler
        </Button>
        <Button type="submit">
          Valider le paiement
        </Button>
      </div>
    </form>
  );
};

export const SimpleTraiteForm: React.FC<SimplePaymentFormProps> = ({ 
  onSubmit, 
  onCancel, 
  totalRequired,
  initialValues,
  selectedProducts = []
}) => {
  const [amount, setAmount] = useState(initialValues?.amount || totalRequired);
  const [traiteNumber, setTraiteNumber] = useState(initialValues?.traiteNumber || '');
  const [bank, setBank] = useState(initialValues?.bank || '');
  const [dueDate, setDueDate] = useState(initialValues?.dueDate || new Date());
  const [notes, setNotes] = useState(initialValues?.notes || '');
  const [productAllocations, setProductAllocations] = useState<Record<string, number>>(
    initialValues?.productAllocations || {}
  );

  // Calculate total allocated and remaining
  const totalAllocated = Object.values(productAllocations).reduce((sum, amount) => sum + (amount || 0), 0);
  const isFullyAllocated = Math.abs(amount - totalAllocated) < 0.01;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate that allocations are complete if products are selected
    if (selectedProducts.length > 0 && !isFullyAllocated) {
      alert(`Veuillez allouer le montant complet du paiement. Reste à allouer: ${(amount - totalAllocated).toFixed(2)} DT`);
      return;
    }
    
    onSubmit({
      type: 'traite',
      amount,
      traiteNumber,
      bank,
      dueDate: format(dueDate, 'yyyy-MM-dd'),
      notes,
      classification: 'principale',
      productAllocations: selectedProducts.length > 0 ? productAllocations : undefined
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="amount">Montant</Label>
        <Input
          id="amount"
          type="number"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
          className="mt-1"
          required
        />
      </div>

      <div>
        <Label htmlFor="traiteNumber">Numéro de traite</Label>
        <Input
          id="traiteNumber"
          value={traiteNumber}
          onChange={(e) => setTraiteNumber(e.target.value)}
          className="mt-1"
          placeholder="Ex: TR123456"
          required
        />
      </div>

      <div>
        <Label htmlFor="bank">Banque</Label>
        <Input
          id="bank"
          value={bank}
          onChange={(e) => setBank(e.target.value)}
          className="mt-1"
          placeholder="Ex: BNA, UIB, STB..."
          required
        />
      </div>

      <div>
        <Label>Date d'échéance</Label>
        <div className="mt-1">
          <ControlledDatePicker
            value={dueDate}
            onChange={(date) => {
              if (date) {
                setDueDate(date);
              }
            }}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="notes">Notes (optionnel)</Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="mt-1"
          rows={2}
        />
      </div>

      {/* Product Allocation Section */}
      {selectedProducts.length > 0 && amount > 0 && (
        <ProductAllocationControl
          selectedProducts={selectedProducts}
          totalPaymentAmount={amount}
          productAllocations={productAllocations}
          onAllocationChange={setProductAllocations}
        />
      )}

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Annuler
        </Button>
        <Button type="submit">
          Valider le paiement
        </Button>
      </div>
    </form>
  );
};

export const SimpleMandatForm: React.FC<SimplePaymentFormProps> = ({ 
  onSubmit, 
  onCancel, 
  totalRequired,
  initialValues,
  selectedProducts = []
}) => {
  const [amount, setAmount] = useState(initialValues?.amount || totalRequired);
  const [mandatNumber, setMandatNumber] = useState(initialValues?.mandatNumber || '');
  const [paymentDate, setPaymentDate] = useState(initialValues?.paymentDate || new Date());
  const [productAllocations, setProductAllocations] = useState<Record<string, number>>(
    initialValues?.productAllocations || {}
  );

  // Calculate total allocated and remaining
  const totalAllocated = Object.values(productAllocations).reduce((sum, amount) => sum + (amount || 0), 0);
  const isFullyAllocated = Math.abs(amount - totalAllocated) < 0.01;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate that allocations are complete if products are selected
    if (selectedProducts.length > 0 && !isFullyAllocated) {
      alert(`Veuillez allouer le montant complet du paiement. Reste à allouer: ${(amount - totalAllocated).toFixed(2)} DT`);
      return;
    }
    
    onSubmit({
      type: 'mandat',
      amount,
      mandatNumber,
      paymentDate: format(paymentDate, 'yyyy-MM-dd'),
      classification: 'principale',
      productAllocations: selectedProducts.length > 0 ? productAllocations : undefined
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="amount">Montant</Label>
        <Input
          id="amount"
          type="number"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
          className="mt-1"
          required
        />
      </div>

      <div>
        <Label htmlFor="mandatNumber">Numéro de mandat</Label>
        <Input
          id="mandatNumber"
          value={mandatNumber}
          onChange={(e) => setMandatNumber(e.target.value)}
          className="mt-1"
          placeholder="Ex: MD123456"
          required
        />
      </div>

      <div>
        <Label>Date du mandat</Label>
        <div className="mt-1">
          <ControlledDatePicker
            value={paymentDate}
            onChange={(date) => {
              if (date) {
                setPaymentDate(date);
              }
            }}
          />
        </div>
      </div>

      {/* Product Allocation Section */}
      {selectedProducts.length > 0 && amount > 0 && (
        <ProductAllocationControl
          selectedProducts={selectedProducts}
          totalPaymentAmount={amount}
          productAllocations={productAllocations}
          onAllocationChange={setProductAllocations}
        />
      )}

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Annuler
        </Button>
        <Button type="submit">
          Valider le paiement
        </Button>
      </div>
    </form>
  );
};

export const SimpleCNAMForm: React.FC<SimplePaymentFormProps & { selectedProducts?: any[] }> = ({ 
  onSubmit, 
  onCancel, 
  totalRequired,
  initialValues,
  selectedProducts = []
}) => {
  const [bonType, setBondType] = useState(initialValues?.bonType || '');
  const [dossierNumber, setDossierNumber] = useState(initialValues?.dossierNumber || '');
  const [bonAmount, setBondAmount] = useState(initialValues?.bonAmount || 0);
  const [productAllocations, setProductAllocations] = useState<Record<string, number>>(
    initialValues?.productAllocations || {}
  );

  const BOND_TYPES = [
    { id: 'masque', label: 'Bond Masque', amount: 200 },
    { id: 'cpap', label: 'Bond CPAP', amount: 1475 },
    { id: 'autre', label: 'Autre', amount: 0 }
  ];

  // Calculate total allocated and remaining
  const totalAllocated = Object.values(productAllocations).reduce((sum, amount) => sum + (amount || 0), 0);
  const remainingToAllocate = bonAmount - totalAllocated;
  const isFullyAllocated = Math.abs(remainingToAllocate) < 0.01;

  // Calculate if complement is needed
  const needsComplement = totalRequired > bonAmount;
  const complementAmount = needsComplement ? totalRequired - bonAmount : 0;

  const handleBondTypeChange = (type: string) => {
    setBondType(type);
    const bond = BOND_TYPES.find(b => b.id === type);
    if (bond && bond.amount > 0) {
      setBondAmount(bond.amount);
      // Reset allocations when bond type changes
      setProductAllocations({});
    }
  };

  const handleProductAllocationChange = (productId: string, amount: number) => {
    setProductAllocations(prev => ({
      ...prev,
      [productId]: amount
    }));
  };

  const distributeEqually = () => {
    if (selectedProducts.length === 0) return;
    
    // Use cascading allocation algorithm
    const newAllocations: Record<string, number> = {};
    let remainingAmount = bonAmount;
    const unfulfilledProducts = [...selectedProducts];
    
    while (remainingAmount > 0.01 && unfulfilledProducts.length > 0) {
      let redistributed = false;
      const equalShare = remainingAmount / unfulfilledProducts.length;
      
      for (let i = unfulfilledProducts.length - 1; i >= 0; i--) {
        const product = unfulfilledProducts[i];
        const productPrice = Number(product.sellingPrice || 0) * (product.quantity || 1);
        const currentAllocation = newAllocations[product.id] || 0;
        const availableCapacity = productPrice - currentAllocation;
        
        if (availableCapacity <= 0.01) {
          unfulfilledProducts.splice(i, 1);
          continue;
        }
        
        const allocation = Math.min(equalShare, availableCapacity);
        if (allocation > 0.01) {
          newAllocations[product.id] = roundToCents(currentAllocation + allocation);
          remainingAmount = roundToCents(remainingAmount - allocation);
          redistributed = true;
        }
      }
      
      if (!redistributed) break;
    }
    
    // Final adjustment to ensure total exactly matches bonAmount
    const totalAllocated = Object.values(newAllocations).reduce((sum, amount) => sum + amount, 0);
    const difference = roundToCents(bonAmount - totalAllocated);
    
    if (Math.abs(difference) > 0.001 && selectedProducts.length > 0) {
      // Find the product with the most room to absorb the difference
      const adjustableProducts = selectedProducts
        .map(product => ({
          id: product.id,
          productPrice: Number(product.sellingPrice || 0) * (product.quantity || 1),
          currentAllocation: newAllocations[product.id] || 0
        }))
        .filter(p => {
          if (difference > 0) {
            // Need to add more: find products with room
            return p.currentAllocation + difference <= p.productPrice;
          } else {
            // Need to subtract: find products with enough allocation
            return p.currentAllocation + difference >= 0;
          }
        })
        .sort((a, b) => b.currentAllocation - a.currentAllocation); // Sort by highest allocation first
      
      if (adjustableProducts.length > 0) {
        const targetProduct = adjustableProducts[0];
        newAllocations[targetProduct.id] = roundToCents(targetProduct.currentAllocation + difference);
      }
    }
    
    setProductAllocations(newAllocations);
  };

  const distributeProportionally = () => {
    if (selectedProducts.length === 0) return;
    const totalValue = selectedProducts.reduce((sum, product) => 
      sum + (Number(product.sellingPrice || 0) * (product.quantity || 1)), 0
    );
    if (totalValue === 0) return;

    // Use cascading allocation algorithm
    const newAllocations: Record<string, number> = {};
    let remainingAmount = bonAmount;
    
    // Calculate ideal proportional shares
    const idealShares: Record<string, number> = {};
    selectedProducts.forEach(product => {
      const productPrice = Number(product.sellingPrice || 0) * (product.quantity || 1);
      idealShares[product.id] = (productPrice / totalValue) * bonAmount;
    });

    // Cascading allocation
    const unfulfilledProducts = [...selectedProducts];
    
    while (remainingAmount > 0.01 && unfulfilledProducts.length > 0) {
      let redistributed = false;
      
      for (let i = unfulfilledProducts.length - 1; i >= 0; i--) {
        const product = unfulfilledProducts[i];
        const productPrice = Number(product.sellingPrice || 0) * (product.quantity || 1);
        const currentAllocation = newAllocations[product.id] || 0;
        const availableCapacity = productPrice - currentAllocation;
        
        if (availableCapacity <= 0.01) {
          unfulfilledProducts.splice(i, 1);
          continue;
        }
        
        const shareForThisProduct = Math.min(
          remainingAmount / unfulfilledProducts.length,
          availableCapacity,
          Math.max(0, idealShares[product.id] - currentAllocation)
        );
        
        if (shareForThisProduct > 0.01) {
          newAllocations[product.id] = roundToCents(currentAllocation + shareForThisProduct);
          remainingAmount = roundToCents(remainingAmount - shareForThisProduct);
          redistributed = true;
        }
      }
      
      // Final redistribution if no progress made
      if (!redistributed && unfulfilledProducts.length > 0) {
        const productsWithCapacity = unfulfilledProducts.filter(product => {
          const productPrice = Number(product.sellingPrice || 0) * (product.quantity || 1);
          return (productPrice - (newAllocations[product.id] || 0)) > 0.01;
        });
        
        if (productsWithCapacity.length > 0) {
          const equalShare = remainingAmount / productsWithCapacity.length;
          productsWithCapacity.forEach(product => {
            const productPrice = Number(product.sellingPrice || 0) * (product.quantity || 1);
            const currentAllocation = newAllocations[product.id] || 0;
            const allocation = Math.min(equalShare, productPrice - currentAllocation);
            
            newAllocations[product.id] = roundToCents(currentAllocation + allocation);
            remainingAmount = roundToCents(remainingAmount - allocation);
          });
        } else {
          break;
        }
      }
    }
    
    // Final adjustment to ensure total exactly matches bonAmount
    const totalAllocated = Object.values(newAllocations).reduce((sum, amount) => sum + amount, 0);
    const difference = roundToCents(bonAmount - totalAllocated);
    
    if (Math.abs(difference) > 0.001 && selectedProducts.length > 0) {
      // Find the product with the most room to absorb the difference
      const adjustableProducts = selectedProducts
        .map(product => ({
          id: product.id,
          productPrice: Number(product.sellingPrice || 0) * (product.quantity || 1),
          currentAllocation: newAllocations[product.id] || 0
        }))
        .filter(p => {
          if (difference > 0) {
            // Need to add more: find products with room
            return p.currentAllocation + difference <= p.productPrice;
          } else {
            // Need to subtract: find products with enough allocation
            return p.currentAllocation + difference >= 0;
          }
        })
        .sort((a, b) => b.currentAllocation - a.currentAllocation); // Sort by highest allocation first
      
      if (adjustableProducts.length > 0) {
        const targetProduct = adjustableProducts[0];
        newAllocations[targetProduct.id] = roundToCents(targetProduct.currentAllocation + difference);
      }
    }
    
    setProductAllocations(newAllocations);
  };

  const clearAllocations = () => {
    setProductAllocations({});
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate that allocations are complete
    if (!isFullyAllocated) {
      alert(`Veuillez allouer le montant complet du bond. Reste à allouer: ${remainingToAllocate.toFixed(2)} DT`);
      return;
    }
    
    onSubmit({
      type: 'cnam',
      amount: bonAmount, // CNAM payment is the bond amount
      bonType,
      dossierNumber,
      classification: 'principale',
      productAllocations, // Include the custom allocations
      cnamInfo: {
        bonType,
        currentStep: 1, // Step 1 = En attente d'approbation CNAM
        totalSteps: 7,
        status: 'en_attente_approbation', // Waiting for CNAM approval
        bonAmount,
        devicePrice: totalRequired,
        complementAmount: needsComplement ? complementAmount : 0,
        productAllocations // Store allocations in CNAM info as well
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Le paiement CNAM couvre le montant du bond. Le dossier sera en attente d'approbation CNAM.
        </AlertDescription>
      </Alert>

      {needsComplement && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-1">
              <p><strong>Complément requis:</strong></p>
              <p>Prix total: {totalRequired.toFixed(2)} DT</p>
              <p>Bond CNAM: {bonAmount.toFixed(2)} DT</p>
              <p className="font-medium text-amber-800">Complément: {complementAmount.toFixed(2)} DT</p>
              <p className="text-sm">Un paiement supplémentaire sera nécessaire.</p>
            </div>
          </AlertDescription>
        </Alert>
      )}

      <div>
        <Label htmlFor="bonType">Type de bond</Label>
        <Select value={bonType} onValueChange={handleBondTypeChange}>
          <SelectTrigger className="mt-1">
            <SelectValue placeholder="Sélectionnez un type de bond" />
          </SelectTrigger>
          <SelectContent>
            {BOND_TYPES.map(bond => (
              <SelectItem key={bond.id} value={bond.id}>
                {bond.label} {bond.amount > 0 && `(${bond.amount} DT)`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="dossierNumber">Numéro de dossier CNAM</Label>
        <Input
          id="dossierNumber"
          value={dossierNumber}
          onChange={(e) => setDossierNumber(e.target.value)}
          className="mt-1"
          placeholder="Ex: CNAM-2024-001"
          required
        />
      </div>

      <div>
        <Label htmlFor="bonAmount">Montant du bond CNAM</Label>
        <Input
          id="bonAmount"
          type="number"
          step="0.01"
          value={bonAmount}
          onChange={(e) => setBondAmount(parseFloat(e.target.value) || 0)}
          className="mt-1"
          required
          disabled={bonType && bonType !== 'autre'}
        />
        <p className="text-xs text-gray-500 mt-1">
          Ce montant sera payé maintenant. {needsComplement && `Le complément de ${complementAmount.toFixed(2)} DT sera payé séparément.`}
        </p>
      </div>

      {/* Product Allocation Section */}
      {bonAmount > 0 && selectedProducts.length > 0 && (
        <div className="border rounded-lg p-4 bg-gray-50">
          <div className="flex justify-between items-center mb-4">
            <Label className="text-base font-medium">
              Répartition du bond sur les produits
            </Label>
            <div className="flex gap-2">
              <Button 
                type="button" 
                variant="outline" 
                size="sm"
                onClick={distributeEqually}
              >
                Égal
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                size="sm"
                onClick={distributeProportionally}
              >
                Proportionnel
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                size="sm"
                onClick={clearAllocations}
              >
                Effacer
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            {selectedProducts.map(product => {
              const productPrice = Number(product.sellingPrice || 0) * (product.quantity || 1);
              const allocatedAmount = productAllocations[product.id] || 0;
              
              return (
                <div key={product.id} className="flex items-center justify-between p-3 bg-white rounded border">
                  <div className="flex-1">
                    <div className="font-medium">{product.name}</div>
                    <div className="text-sm text-gray-500">
                      Prix: {productPrice.toFixed(2)} DT
                      {product.quantity > 1 && ` (${product.quantity} × ${Number(product.sellingPrice || 0).toFixed(2)} DT)`}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      max={bonAmount}
                      value={allocatedAmount}
                      onChange={(e) => handleProductAllocationChange(product.id, parseFloat(e.target.value) || 0)}
                      className="w-24 text-right"
                      placeholder="0.00"
                    />
                    <span className="text-sm text-gray-500">DT</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Allocation Summary */}
          <div className="mt-4 p-3 bg-white rounded border">
            <div className="flex justify-between items-center text-sm">
              <span>Total du bond:</span>
              <span className="font-medium">{bonAmount.toFixed(2)} DT</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span>Total alloué:</span>
              <span className="font-medium">{totalAllocated.toFixed(2)} DT</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span>Reste à allouer:</span>
              <span className={`font-medium ${Math.abs(remainingToAllocate) < 0.01 ? 'text-green-600' : 'text-amber-600'}`}>
                {remainingToAllocate.toFixed(2)} DT
              </span>
            </div>
          </div>

          {!isFullyAllocated && (
            <Alert className="mt-3">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Veuillez allouer le montant complet du bond avant de continuer.
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Annuler
        </Button>
        <Button type="submit">
          Créer le dossier CNAM
        </Button>
      </div>
    </form>
  );
};