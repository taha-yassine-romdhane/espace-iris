import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  Package
} from 'lucide-react';
import { cn } from '@/lib/utils';

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

interface ProductPaymentMatrixProps {
  products: Product[];
  paymentAssignments: PaymentAssignment[];
  onCreatePaymentGroup: (assignment: PaymentAssignment) => void;
  onUpdatePaymentGroup: (id: string, assignment: PaymentAssignment) => void;
  onDeletePaymentGroup: (id: string) => void;
  isCompany?: boolean;
}

const PAYMENT_METHODS = [
  { id: 'especes', label: 'Espèces', icon: <CreditCard className="h-4 w-4" /> },
  { id: 'cheque', label: 'Chèque', icon: <FileCheck className="h-4 w-4" /> },
  { id: 'virement', label: 'Virement', icon: <CreditCard className="h-4 w-4" /> },
  { id: 'cnam', label: 'CNAM', icon: <FileCheck className="h-4 w-4" /> },
];

const CNAM_BOND_TYPES = [
  { id: 'masque', label: 'Bond Masque', amount: 200 },
  { id: 'cpap', label: 'Bond CPAP', amount: 1475 },
  { id: 'autre', label: 'Autre', amount: 0 },
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

export const ProductPaymentMatrix: React.FC<ProductPaymentMatrixProps> = ({
  products,
  paymentAssignments,
  onCreatePaymentGroup,
  onUpdatePaymentGroup,
  onDeletePaymentGroup,
  isCompany = false
}) => {
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [newGroupData, setNewGroupData] = useState({
    groupName: '',
    selectedProducts: [] as string[],
    paymentMethod: '',
    amount: 0,
    cnamBonType: ''
  });

  // Calculate allocated and remaining amounts per product
  const getProductPaymentStatus = (productId: string) => {
    const product = products.find(p => p.id === productId);
    if (!product) return { allocated: 0, remaining: 0, totalPrice: 0 };

    const totalPrice = product.sellingPrice * (product.quantity || 1);
    const allocated = paymentAssignments
      .filter(assignment => assignment.productIds.includes(productId))
      .reduce((sum, assignment) => {
        const productShare = assignment.amount / assignment.productIds.length;
        return sum + productShare;
      }, 0);
    
    return {
      totalPrice,
      allocated,
      remaining: Math.max(0, totalPrice - allocated)
    };
  };

  // Get unallocated products
  const unallocatedProducts = products.filter(product => {
    const status = getProductPaymentStatus(product.id);
    return status.remaining > 0;
  });

  // Calculate totals
  const grandTotal = products.reduce((sum, product) => 
    sum + (product.sellingPrice * (product.quantity || 1)), 0
  );
  const totalAllocated = paymentAssignments.reduce((sum, assignment) => sum + assignment.amount, 0);
  const totalRemaining = grandTotal - totalAllocated;

  const handleCreateGroup = () => {
    if (!newGroupData.groupName || newGroupData.selectedProducts.length === 0) return;

    const newAssignment: PaymentAssignment = {
      id: Date.now().toString(),
      productIds: newGroupData.selectedProducts,
      groupName: newGroupData.groupName,
      paymentMethod: newGroupData.paymentMethod,
      amount: newGroupData.amount,
      ...(newGroupData.paymentMethod === 'cnam' && {
        cnamInfo: {
          bonType: newGroupData.cnamBonType,
          currentStep: 1,
          totalSteps: 9,
          status: 'en_attente_approbation' as const
        }
      })
    };

    onCreatePaymentGroup(newAssignment);
    
    // Reset form
    setNewGroupData({
      groupName: '',
      selectedProducts: [],
      paymentMethod: '',
      amount: 0,
      cnamBonType: ''
    });
    setIsCreatingGroup(false);
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
            const isFullyAllocated = status.remaining <= 0.01; // Allow for small floating point differences
            
            return (
              <div
                key={product.id}
                className={cn(
                  "flex items-center justify-between p-3 border rounded-lg",
                  isFullyAllocated ? "bg-green-50 border-green-200" : "bg-amber-50 border-amber-200"
                )}
              >
                <div className="flex items-center gap-3">
                  {getProductIcon(product.type)}
                  <div>
                    <div className="font-medium">{product.name}</div>
                    <div className="text-sm text-gray-500">
                      {product.quantity && product.quantity > 1 && `Qté: ${product.quantity} × `}
                      {Number(product.sellingPrice || 0).toFixed(2)} DT
                      {product.quantity && product.quantity > 1 && ` = ${status.totalPrice.toFixed(2)} DT`}
                    </div>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="flex items-center gap-2">
                    <Badge variant={isFullyAllocated ? "default" : "secondary"}>
                      {status.allocated.toFixed(2)} DT alloué
                    </Badge>
                    {status.remaining > 0.01 && (
                      <Badge variant="outline" className="text-amber-600">
                        {status.remaining.toFixed(2)} DT restant
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Summary */}
        <div className="mt-4 pt-4 border-t">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-lg font-bold text-blue-600">{grandTotal.toFixed(2)} DT</div>
              <div className="text-sm text-gray-500">Total</div>
            </div>
            <div>
              <div className="text-lg font-bold text-green-600">{totalAllocated.toFixed(2)} DT</div>
              <div className="text-sm text-gray-500">Alloué</div>
            </div>
            <div>
              <div className={cn(
                "text-lg font-bold",
                totalRemaining <= 0.01 ? "text-green-600" : "text-amber-600"
              )}>
                {totalRemaining.toFixed(2)} DT
              </div>
              <div className="text-sm text-gray-500">Restant</div>
            </div>
          </div>
        </div>
      </Card>

      {/* Payment Groups */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-lg flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Groupes de Paiement
          </h3>
          <Button
            onClick={() => setIsCreatingGroup(true)}
            disabled={unallocatedProducts.length === 0}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Créer un groupe
          </Button>
        </div>

        {/* Existing Payment Groups */}
        <div className="space-y-3">
          {paymentAssignments.map(assignment => (
            <div key={assignment.id} className="border rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-medium">{assignment.groupName}</h4>
                    <Badge variant="outline">
                      {PAYMENT_METHODS.find(m => m.id === assignment.paymentMethod)?.label}
                    </Badge>
                    {assignment.cnamInfo && (
                      <Badge variant="secondary" className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Étape {assignment.cnamInfo.currentStep}/{assignment.cnamInfo.totalSteps}
                      </Badge>
                    )}
                  </div>
                  
                  <div className="text-sm text-gray-600">
                    Produits: {assignment.productIds.map(id => 
                      products.find(p => p.id === id)?.name
                    ).join(', ')}
                  </div>
                  
                  {assignment.cnamInfo && (
                    <div className="text-sm text-blue-600 mt-1">
                      Bond CNAM: {CNAM_BOND_TYPES.find(b => b.id === assignment.cnamInfo?.bonType)?.label}
                    </div>
                  )}
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="font-semibold">{assignment.amount.toFixed(2)} DT</div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDeletePaymentGroup(assignment.id)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}

          {paymentAssignments.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <CreditCard className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Aucun groupe de paiement créé</p>
              <p className="text-sm">Créez un groupe pour commencer l'allocation des paiements</p>
            </div>
          )}
        </div>
      </Card>

      {/* Create New Payment Group Dialog */}
      {isCreatingGroup && (
        <Card className="p-4 border-blue-200 bg-blue-50">
          <h4 className="font-semibold mb-4">Créer un nouveau groupe de paiement</h4>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Nom du groupe</Label>
              <Input
                value={newGroupData.groupName}
                onChange={(e) => setNewGroupData(prev => ({ ...prev, groupName: e.target.value }))}
                placeholder="Ex: Équipement CPAP"
              />
            </div>
            
            <div>
              <Label>Méthode de paiement</Label>
              <Select
                value={newGroupData.paymentMethod}
                onValueChange={(value) => {
                  setNewGroupData(prev => ({ ...prev, paymentMethod: value }));
                  
                  // Auto-select appropriate bond type for CNAM
                  if (value === 'cnam' && newGroupData.selectedProducts.length > 0) {
                    const selectedProduct = products.find(p => newGroupData.selectedProducts.includes(p.id));
                    if (selectedProduct?.type === 'MEDICAL_DEVICE') {
                      setNewGroupData(prev => ({ ...prev, cnamBonType: 'cpap', amount: 1475 }));
                    } else if (selectedProduct?.name.toLowerCase().includes('masque')) {
                      setNewGroupData(prev => ({ ...prev, cnamBonType: 'masque', amount: 200 }));
                    }
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner" />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS
                    .filter(method => !isCompany || !['cnam'].includes(method.id))
                    .map(method => (
                    <SelectItem key={method.id} value={method.id}>
                      <div className="flex items-center gap-2">
                        {method.icon}
                        {method.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {newGroupData.paymentMethod === 'cnam' && (
              <div>
                <Label>Type de bond CNAM</Label>
                <Select
                  value={newGroupData.cnamBonType}
                  onValueChange={(value) => {
                    const bonType = CNAM_BOND_TYPES.find(b => b.id === value);
                    setNewGroupData(prev => ({ 
                      ...prev, 
                      cnamBonType: value, 
                      amount: bonType?.amount || 0 
                    }));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner le type de bond" />
                  </SelectTrigger>
                  <SelectContent>
                    {CNAM_BOND_TYPES.map(bond => (
                      <SelectItem key={bond.id} value={bond.id}>
                        {bond.label} {bond.amount > 0 && `(${bond.amount} DT)`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label>Montant</Label>
              <Input
                type="number"
                value={newGroupData.amount}
                onChange={(e) => setNewGroupData(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                step="0.01"
                min="0"
              />
            </div>
          </div>

          {/* Product Selection */}
          <div className="mt-4">
            <Label>Produits à inclure</Label>
            <div className="mt-2 space-y-2 max-h-40 overflow-y-auto">
              {unallocatedProducts.map(product => {
                const status = getProductPaymentStatus(product.id);
                const isSelected = newGroupData.selectedProducts.includes(product.id);
                
                return (
                  <div
                    key={product.id}
                    className={cn(
                      "flex items-center justify-between p-2 border rounded cursor-pointer",
                      isSelected ? "bg-blue-100 border-blue-300" : "hover:bg-gray-50"
                    )}
                    onClick={() => {
                      setNewGroupData(prev => ({
                        ...prev,
                        selectedProducts: isSelected
                          ? prev.selectedProducts.filter(id => id !== product.id)
                          : [...prev.selectedProducts, product.id]
                      }));
                    }}
                  >
                    <div className="flex items-center gap-2">
                      {getProductIcon(product.type)}
                      <span>{product.name}</span>
                    </div>
                    <span className="text-sm text-gray-600">
                      {status.remaining.toFixed(2)} DT restant
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => {
                setIsCreatingGroup(false);
                setNewGroupData({
                  groupName: '',
                  selectedProducts: [],
                  paymentMethod: '',
                  amount: 0,
                  cnamBonType: ''
                });
              }}
            >
              Annuler
            </Button>
            <Button
              onClick={handleCreateGroup}
              disabled={!newGroupData.groupName || newGroupData.selectedProducts.length === 0 || newGroupData.amount <= 0}
            >
              Créer le groupe
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
};

export default ProductPaymentMatrix;