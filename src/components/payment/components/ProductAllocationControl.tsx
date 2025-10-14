import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { roundToCents } from '@/utils/priceUtils';

interface Product {
  id: string;
  name: string;
  type: string;
  sellingPrice: number;
  quantity?: number;
}

interface ProductAllocationControlProps {
  selectedProducts: Product[];
  totalPaymentAmount: number;
  productAllocations: Record<string, number>;
  onAllocationChange: (allocations: Record<string, number>) => void;
  className?: string;
}

export const ProductAllocationControl: React.FC<ProductAllocationControlProps> = ({
  selectedProducts,
  totalPaymentAmount,
  productAllocations,
  onAllocationChange,
  className = ""
}) => {
  // Calculate total allocated and remaining
  const totalAllocated = Object.values(productAllocations).reduce((sum, amount) => sum + (amount || 0), 0);
  const remainingToAllocate = totalPaymentAmount - totalAllocated;
  const isFullyAllocated = Math.abs(remainingToAllocate) < 0.01;

  const handleProductAllocationChange = (productId: string, amount: number) => {
    const newAllocations = {
      ...productAllocations,
      [productId]: amount
    };
    onAllocationChange(newAllocations);
  };

  const distributeEqually = () => {
    if (selectedProducts.length === 0) return;
    const equalAmount = totalPaymentAmount / selectedProducts.length;
    const newAllocations: Record<string, number> = {};
    selectedProducts.forEach(product => {
      const productPrice = Number(product.sellingPrice || 0) * (product.quantity || 1);
      // Don't allocate more than the product price
      newAllocations[product.id] = roundToCents(Math.min(equalAmount, productPrice));
    });
    onAllocationChange(newAllocations);
  };

  const distributeProportionally = () => {
    if (selectedProducts.length === 0) return;
    
    // Use cascading allocation algorithm
    const newAllocations: Record<string, number> = {};
    let remainingAmount = totalPaymentAmount;
    
    // Calculate total value for proportional distribution
    const totalValue = selectedProducts.reduce((sum, product) => 
      sum + (Number(product.sellingPrice || 0) * (product.quantity || 1)), 0
    );
    
    if (totalValue === 0) return;

    // First pass: ideal proportional shares
    const idealShares: Record<string, number> = {};
    selectedProducts.forEach(product => {
      const productPrice = Number(product.sellingPrice || 0) * (product.quantity || 1);
      idealShares[product.id] = (productPrice / totalValue) * totalPaymentAmount;
    });

    // Cascading allocation to handle caps and redistribution
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
    
    // Final adjustment to ensure total exactly matches totalPaymentAmount
    const totalAllocated = Object.values(newAllocations).reduce((sum, amount) => sum + amount, 0);
    const difference = roundToCents(totalPaymentAmount - totalAllocated);
    
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
    
    onAllocationChange(newAllocations);
  };

  const distributeByRemaining = () => {
    // Distribute based on remaining amount needed for each product
    if (selectedProducts.length === 0) return;
    
    // For now, we'll distribute proportionally - this can be enhanced later
    // to consider already paid amounts per product
    distributeProportionally();
  };

  const clearAllocations = () => {
    onAllocationChange({});
  };

  if (selectedProducts.length === 0 || totalPaymentAmount <= 0) {
    return null;
  }

  return (
    <div className={`border rounded-lg p-4 bg-gray-50 ${className}`}>
      <div className="flex justify-between items-center mb-4">
        <Label className="text-base font-medium">
          Répartition du paiement sur les produits
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
            onClick={distributeByRemaining}
          >
            Par Besoin
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
          const isAtMaxAllocation = Math.abs(allocatedAmount - productPrice) < 0.01;
          const isOverAllocated = allocatedAmount > productPrice;
          
          return (
            <div key={product.id} className={`flex items-center justify-between p-3 bg-white rounded border ${
              isOverAllocated ? 'border-red-300 bg-red-50' : isAtMaxAllocation ? 'border-green-300 bg-green-50' : ''
            }`}>
              <div className="flex-1">
                <div className="font-medium">{product.name}</div>
                <div className="text-sm text-gray-500">
                  Prix: {productPrice.toFixed(2)} DT
                  {product.quantity && product.quantity > 1 && ` (${product.quantity} × ${Number(product.sellingPrice || 0).toFixed(2)} DT)`}
                </div>
                {isAtMaxAllocation && (
                  <div className="text-xs text-green-600 mt-1">✓ Montant maximum alloué</div>
                )}
                {isOverAllocated && (
                  <div className="text-xs text-red-600 mt-1">⚠️ Allocation dépasse le prix du produit</div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  max={Math.min(productPrice, totalPaymentAmount)}
                  value={allocatedAmount}
                  onChange={(e) => {
                    const newValue = parseFloat(e.target.value) || 0;
                    // Validate that the allocation doesn't exceed product price
                    if (newValue > productPrice) {
                      handleProductAllocationChange(product.id, productPrice);
                    } else {
                      handleProductAllocationChange(product.id, newValue);
                    }
                  }}
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
          <span>Total du paiement:</span>
          <span className="font-medium">{totalPaymentAmount.toFixed(2)} DT</span>
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
            Veuillez allouer le montant complet du paiement avant de continuer.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default ProductAllocationControl;