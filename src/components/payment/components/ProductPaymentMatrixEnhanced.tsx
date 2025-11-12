import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Stethoscope, 
  Puzzle, 
  Cog, 
  Activity, 
  Plus, 
  Trash2,
  CreditCard,
  FileCheck,
  Clock,
  Package,
  ChevronRight,
  Edit2
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Import simple payment forms
import { 
  SimpleEspecesForm, 
  SimpleChequeForm, 
  SimpleVirementForm, 
  SimpleCNAMForm,
  SimpleTraiteForm,
  SimpleMandatForm 
} from './SimplePaymentForms';
import CNAMStepSelector from './CNAMStepSelector';

interface Product {
  id: string;
  name: string;
  type: string;
  sellingPrice: number;
  quantity?: number;
}

interface PaymentAssignment {
  id: string;
  productIds: string[];
  groupName: string;
  paymentMethod: string;
  amount: number;
  paymentDetails?: any;
  cnamInfo?: {
    bonType: string;
    currentStep: number;
    totalSteps: number;
    status: 'en_attente_approbation' | 'approuve' | 'termine' | 'refuse';
    notes?: string;
    bonAmount?: number;
    devicePrice?: number;
    complementAmount?: number;
  };
}

interface ProductPaymentMatrixEnhancedProps {
  products: Product[];
  paymentAssignments: PaymentAssignment[];
  onCreatePaymentGroup: (assignment: PaymentAssignment) => void;
  onUpdatePaymentGroup: (id: string, assignment: PaymentAssignment) => void;
  onDeletePaymentGroup: (id: string) => void;
  isCompany?: boolean;
  selectedClient?: any;
}

const getPaymentMethods = (isCompany: boolean) => [
  { id: 'especes', label: 'Espèces', icon: <CreditCard className="h-4 w-4" /> },
  { id: 'cheque', label: 'Chèque', icon: <FileCheck className="h-4 w-4" /> },
  { id: 'virement', label: 'Virement', icon: <CreditCard className="h-4 w-4" /> },
  { id: 'traite', label: 'Traite', icon: <Clock className="h-4 w-4" /> },
  { id: 'mandat', label: 'Mandat', icon: <FileCheck className="h-4 w-4" /> },
  // CNAM is only available for patients (not companies)
  ...(!isCompany ? [{ id: 'cnam', label: 'CNAM', icon: <FileCheck className="h-4 w-4" /> }] : []),
];

const getProductIcon = (type: string) => {
  switch (type) {
    case 'MEDICAL_DEVICE': return <Stethoscope className="h-4 w-4 text-blue-500" />;
    case 'ACCESSORY': return <Puzzle className="h-4 w-4 text-green-500" />;
    case 'SPARE_PART': return <Cog className="h-4 w-4 text-amber-500" />;
    case 'DIAGNOSTIC_DEVICE': return <Activity className="h-4 w-4 text-purple-500" />;
    default: return <CreditCard className="h-4 w-4 text-gray-500" />;
  }
};

export const ProductPaymentMatrixEnhanced: React.FC<ProductPaymentMatrixEnhancedProps> = ({
  products,
  paymentAssignments,
  onCreatePaymentGroup,
  onUpdatePaymentGroup,
  onDeletePaymentGroup,
  isCompany = false,
  selectedClient
}) => {
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [groupName, setGroupName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [paymentFormData, setPaymentFormData] = useState<any>(null);

  // Calculate allocated amounts with proper cascading redistribution
  const calculateAllocationForAssignment = (assignment: any) => {
    // If custom product allocations exist, use those
    if (assignment.paymentDetails?.productAllocations) {
      return assignment.paymentDetails.productAllocations;
    }

    // Otherwise, calculate smart proportional allocation with cascading
    const assignmentProducts = assignment.productIds
      .map((id: string) => products.find(p => p.id === id))
      .filter(Boolean) as any[];
    
    if (assignmentProducts.length === 0) return {};

    const allocations: Record<string, number> = {};
    let remainingAmount = assignment.amount;

    // First pass: Calculate ideal proportional shares
    const totalValue = assignmentProducts.reduce((sum, product) => 
      sum + (Number(product.sellingPrice || 0) * (product.quantity || 1)), 0
    );

    const idealShares: Record<string, number> = {};
    assignmentProducts.forEach(product => {
      const productPrice = Number(product.sellingPrice || 0) * (product.quantity || 1);
      idealShares[product.id] = totalValue > 0 
        ? (productPrice / totalValue) * assignment.amount
        : assignment.amount / assignmentProducts.length;
    });

    // Second pass: Apply caps and redistribute excess
    const unfulfilledProducts = [...assignmentProducts];
    
    while (remainingAmount > 0.01 && unfulfilledProducts.length > 0) {
      let redistributed = false;
      
      for (let i = unfulfilledProducts.length - 1; i >= 0; i--) {
        const product = unfulfilledProducts[i];
        const productPrice = Number(product.sellingPrice || 0) * (product.quantity || 1);
        const currentAllocation = allocations[product.id] || 0;
        const availableCapacity = productPrice - currentAllocation;
        
        if (availableCapacity <= 0.01) {
          // Product is fully allocated, remove from unfulfilled list
          unfulfilledProducts.splice(i, 1);
          continue;
        }
        
        // Calculate fair share for this iteration
        const remainingProducts = unfulfilledProducts.length;
        const shareForThisProduct = Math.min(
          remainingAmount / remainingProducts, // Equal share of remaining
          availableCapacity, // Product's remaining capacity
          idealShares[product.id] - currentAllocation // Don't exceed ideal share unless redistributing
        );
        
        if (shareForThisProduct > 0.01) {
          allocations[product.id] = currentAllocation + shareForThisProduct;
          remainingAmount -= shareForThisProduct;
          redistributed = true;
        }
      }
      
      // If no redistribution happened but we still have unfulfilled products,
      // distribute remaining amount equally among products with capacity
      if (!redistributed && unfulfilledProducts.length > 0) {
        const productsWithCapacity = unfulfilledProducts.filter(product => {
          const productPrice = Number(product.sellingPrice || 0) * (product.quantity || 1);
          const currentAllocation = allocations[product.id] || 0;
          return productPrice - currentAllocation > 0.01;
        });
        
        if (productsWithCapacity.length > 0) {
          const equalShare = remainingAmount / productsWithCapacity.length;
          productsWithCapacity.forEach(product => {
            const productPrice = Number(product.sellingPrice || 0) * (product.quantity || 1);
            const currentAllocation = allocations[product.id] || 0;
            const availableCapacity = productPrice - currentAllocation;
            const allocation = Math.min(equalShare, availableCapacity);
            
            allocations[product.id] = currentAllocation + allocation;
            remainingAmount -= allocation;
          });
        } else {
          // No products have capacity, break to avoid infinite loop
          break;
        }
      }
    }

    return allocations;
  };

  // Calculate allocated and remaining amounts per product
  const getProductPaymentStatus = (productId: string) => {
    const product = products.find(p => p.id === productId);
    if (!product) return { allocated: 0, remaining: 0, totalPrice: 0 };

    const totalPrice = Number(product.sellingPrice || 0) * (product.quantity || 1);
    
    // Calculate total allocated from all assignments
    const allocated = paymentAssignments
      .filter(assignment => assignment.productIds.includes(productId))
      .reduce((sum, assignment) => {
        const allocations = calculateAllocationForAssignment(assignment);
        return sum + (allocations[productId] || 0);
      }, 0);
    
    // Ensure allocated never exceeds product price
    const cappedAllocated = Math.min(allocated, totalPrice);
    
    return {
      totalPrice,
      allocated: cappedAllocated,
      remaining: Math.max(0, totalPrice - cappedAllocated)
    };
  };

  // Get unallocated products
  const unallocatedProducts = products.filter(product => {
    const status = getProductPaymentStatus(product.id);
    return status.remaining > 0;
  });

  // Calculate total for selected products
  const calculateSelectedTotal = () => {
    return selectedProducts.reduce((sum, productId) => {
      const product = products.find(p => p.id === productId);
      if (!product) return sum;
      const status = getProductPaymentStatus(productId);
      return sum + Number(status.remaining || 0);
    }, 0);
  };

  // Handle creating new payment group
  const handleStartNewGroup = () => {
    setSelectedProducts([]);
    setGroupName('');
    setPaymentMethod('');
    setPaymentFormData(null);
    setEditingGroupId(null);
    setShowPaymentForm(true);
  };

  // Handle editing existing group
  const handleEditGroup = (assignment: PaymentAssignment) => {
    setSelectedProducts(assignment.productIds);
    setGroupName(assignment.groupName);
    setPaymentMethod(assignment.paymentMethod);
    setPaymentFormData(assignment.paymentDetails || null);
    setEditingGroupId(assignment.id);
    setShowPaymentForm(true);
  };

  // Handle form submission from payment forms
  const handlePaymentFormSubmit = (formData: any) => {
    const amount = formData.amount || calculateSelectedTotal();
    
    const assignment: PaymentAssignment = {
      id: editingGroupId || Date.now().toString(),
      productIds: selectedProducts,
      groupName: groupName || `Paiement ${paymentMethod}`,
      paymentMethod,
      amount,
      paymentDetails: formData,
      ...(paymentMethod === 'cnam' && formData.cnamInfo && {
        cnamInfo: formData.cnamInfo
      })
    };

    if (editingGroupId) {
      onUpdatePaymentGroup(editingGroupId, assignment);
    } else {
      onCreatePaymentGroup(assignment);
    }

    setShowPaymentForm(false);
    setPaymentFormData(null);
  };

  // Render payment form based on selected method
  const renderPaymentForm = () => {
    const selectedProductsData = selectedProducts.map(id => 
      products.find(p => p.id === id)
    ).filter(Boolean);

    const commonProps = {
      onSubmit: handlePaymentFormSubmit,
      totalRequired: calculateSelectedTotal(),
      onCancel: () => setShowPaymentForm(false),
      initialValues: paymentFormData,
      selectedProducts: selectedProductsData
    };

    switch (paymentMethod) {
      case 'especes':
        return <SimpleEspecesForm {...commonProps} />;
      case 'cheque':
        return <SimpleChequeForm {...commonProps} />;
      case 'virement':
        return <SimpleVirementForm {...commonProps} />;
      case 'traite':
        return <SimpleTraiteForm {...commonProps} />;
      case 'mandat':
        return <SimpleMandatForm {...commonProps} />;
      case 'cnam':
        return <SimpleCNAMForm {...commonProps} />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Products Overview */}
      <Card className="p-4">
        <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
          <Package className="h-5 w-5" />
          Produits et Allocation des Paiements
        </h3>
        
        <div className="space-y-3">
          {products.map(product => {
            const status = getProductPaymentStatus(product.id);
            const isFullyAllocated = status.remaining <= 0.01;
            
            return (
              <div
                key={product.id}
                className={cn(
                  "flex items-center justify-between p-3 border rounded-lg transition-colors",
                  isFullyAllocated ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-200"
                )}
              >
                <div className="flex items-center gap-3 flex-1">
                  {getProductIcon(product.type)}
                  <div className="flex-1">
                    <div className="font-medium">{product.name}</div>
                    <div className="text-sm text-gray-500">
                      {product.quantity && product.quantity > 1 && `Qté: ${product.quantity} × `}
                      {Number(product.sellingPrice || 0).toFixed(2)} DT
                      {product.quantity && product.quantity > 1 && ` = ${Number(status.totalPrice).toFixed(2)} DT`}
                    </div>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="flex items-center gap-2">
                    {status.allocated > 0 && (
                      <Badge variant="secondary" className="bg-blue-100">
                        {Number(status.allocated).toFixed(2)} DT payé
                      </Badge>
                    )}
                    {status.remaining > 0.01 && (
                      <Badge variant="outline" className="text-amber-600 border-amber-300">
                        {Number(status.remaining).toFixed(2)} DT restant
                      </Badge>
                    )}
                    {isFullyAllocated && (
                      <Badge className="bg-green-500">
                        Payé
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Payment Groups */}
      <Card className="p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold text-lg">Groupes de Paiement</h3>
          {unallocatedProducts.length > 0 && (
            <Button onClick={handleStartNewGroup} size="sm" className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Nouveau Paiement
            </Button>
          )}
        </div>

        {paymentAssignments.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>Aucun paiement configuré</p>
            <p className="text-sm mt-1">Cliquez sur "Nouveau Paiement" pour commencer</p>
          </div>
        ) : (
          <div className="space-y-3">
            {paymentAssignments.map(assignment => (
              <div key={assignment.id} className="border rounded-lg p-4 bg-gray-50">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="font-medium">{assignment.groupName}</h4>
                    <p className="text-sm text-gray-500">
                      {getPaymentMethods(isCompany).find(m => m.id === assignment.paymentMethod)?.label}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="text-lg px-3 py-1">
                      {Number(assignment.amount).toFixed(2)} DT
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditGroup(assignment)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDeletePaymentGroup(assignment.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-xs text-gray-500 font-medium">Répartition par produit:</p>
                  <div className="space-y-1">
                    {assignment.productIds.map(productId => {
                      const product = products.find(p => p.id === productId);
                      if (!product) return null;

                      // Calculate the allocated amount for this product
                      let allocatedAmount = 0;
                      
                      if (assignment.paymentDetails?.productAllocations && assignment.paymentDetails.productAllocations[productId]) {
                        // Use custom allocation if available
                        allocatedAmount = assignment.paymentDetails.productAllocations[productId];
                      } else {
                        // Fall back to proportional calculation
                        const assignmentProducts = assignment.productIds.map(id => products.find(p => p.id === id)).filter(Boolean) as any[];
                        const totalAssignmentValue = assignmentProducts.reduce((total, prod) => {
                          return total + (Number(prod?.sellingPrice || 0) * (prod?.quantity || 1));
                        }, 0);
                        
                        const productValue = Number(product.sellingPrice || 0) * (product.quantity || 1);
                        allocatedAmount = totalAssignmentValue > 0 
                          ? (productValue / totalAssignmentValue) * assignment.amount
                          : assignment.amount / assignment.productIds.length;
                      }

                      return (
                        <div key={productId} className="flex justify-between items-center text-xs bg-gray-50 rounded px-2 py-1">
                          <span className="font-medium text-gray-700">{product.name}</span>
                          <span className="font-bold text-blue-600">{allocatedAmount.toFixed(2)} DT</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {assignment.paymentDetails && (
                  <div className="mt-3 pt-3 border-t text-sm text-gray-600">
                    {assignment.paymentMethod === 'cheque' && (
                      <p>Chèque N° {assignment.paymentDetails.chequeNumber}</p>
                    )}
                    {assignment.paymentMethod === 'virement' && (
                      <p>Référence: {assignment.paymentDetails.reference}</p>
                    )}
                  </div>
                )}

                {assignment.cnamInfo && (
                  <div className="mt-3 pt-3 border-t">
                    <CNAMStepSelector
                      cnamInfo={assignment.cnamInfo}
                      onUpdate={(updatedCnamInfo) => {
                        const updatedAssignment = {
                          ...assignment,
                          cnamInfo: updatedCnamInfo
                        };
                        onUpdatePaymentGroup(assignment.id, updatedAssignment);
                      }}
                      editable={true}
                      className="border-0 shadow-none"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Payment Form Dialog */}
      <Dialog open={showPaymentForm} onOpenChange={setShowPaymentForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingGroupId ? 'Modifier le Paiement' : 'Nouveau Paiement'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 mt-4">
            {/* Product Selection */}
            <div>
              <Label className="text-base font-medium mb-3 block">
                1. Sélectionnez les produits à payer
              </Label>
              <div className="space-y-2 max-h-48 overflow-y-auto border rounded-lg p-3">
                {products.map(product => {
                  const status = getProductPaymentStatus(product.id);
                  const isDisabled = editingGroupId 
                    ? !paymentAssignments.find(a => a.id === editingGroupId)?.productIds.includes(product.id) && status.remaining <= 0
                    : status.remaining <= 0;
                  
                  return (
                    <div key={product.id} className="flex items-center space-x-3">
                      <Checkbox
                        id={product.id}
                        checked={selectedProducts.includes(product.id)}
                        disabled={isDisabled}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedProducts([...selectedProducts, product.id]);
                          } else {
                            setSelectedProducts(selectedProducts.filter(id => id !== product.id));
                          }
                        }}
                      />
                      <label
                        htmlFor={product.id}
                        className={cn(
                          "flex-1 cursor-pointer flex justify-between items-center",
                          isDisabled && "opacity-50 cursor-not-allowed"
                        )}
                      >
                        <span>{product.name}</span>
                        <span className="text-sm text-gray-500">
                          {status.remaining > 0 ? `${Number(status.remaining).toFixed(2)} DT` : 'Payé'}
                        </span>
                      </label>
                    </div>
                  );
                })}
              </div>
              {selectedProducts.length > 0 && (
                <p className="mt-2 text-sm text-gray-600">
                  Total sélectionné: <strong>{Number(calculateSelectedTotal()).toFixed(2)} DT</strong>
                </p>
              )}
            </div>

            {/* Group Name */}
            <div>
              <Label htmlFor="groupName">2. Nom du groupe (optionnel)</Label>
              <Input
                id="groupName"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="Ex: Paiement initial, Acompte..."
                className="mt-1"
              />
            </div>

            {/* Payment Method Selection */}
            <div>
              <Label className="text-base font-medium mb-3 block">
                3. Choisissez le mode de paiement
              </Label>
              <div className="grid grid-cols-2 gap-3">
                {getPaymentMethods(isCompany).map(method => (
                  <Button
                    key={method.id}
                    variant={paymentMethod === method.id ? "default" : "outline"}
                    className="justify-start"
                    onClick={() => setPaymentMethod(method.id)}
                    disabled={selectedProducts.length === 0}
                  >
                    {method.icon}
                    <span className="ml-2">{method.label}</span>
                  </Button>
                ))}
              </div>
            </div>

            {/* Payment Form */}
            {paymentMethod && selectedProducts.length > 0 && (
              <div className="border-t pt-4">
                <Label className="text-base font-medium mb-3 block">
                  4. Détails du paiement
                </Label>
                {renderPaymentForm()}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProductPaymentMatrixEnhanced;