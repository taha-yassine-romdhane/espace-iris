import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Trash2, Package, Stethoscope, Puzzle, Cog } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { formatCurrency } from '@/utils/priceUtils';
import { ProductDialog } from '@/pages/roles/admin/dashboard/components/dialogs/ProductDialog';

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

interface SaleItemsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  items: SaleItem[];
  onSave: (items: SaleItem[]) => void;
}

export function SaleItemsDialog({ isOpen, onClose, items: initialItems, onSave }: SaleItemsDialogProps) {
  const [items, setItems] = useState<SaleItem[]>(initialItems || []);
  const [showProductDialog, setShowProductDialog] = useState(false);
  const [currentProductType, setCurrentProductType] = useState<'medical-device' | 'accessory' | 'spare-part' | 'diagnostic' | null>(null);
  const { toast } = useToast();

  const handleAddProduct = (type: 'medical-device' | 'accessory' | 'spare-part' | 'diagnostic') => {
    setCurrentProductType(type);
    setShowProductDialog(true);
  };

  const handleProductSelect = (product: any) => {
    const newItem: SaleItem = {
      quantity: 1,
      unitPrice: product.sellingPrice || 0,
      discount: 0,
      itemTotal: product.sellingPrice || 0,
    };

    if (currentProductType === 'medical-device' || currentProductType === 'diagnostic') {
      newItem.medicalDeviceId = product.id;
      newItem.medicalDevice = {
        id: product.id,
        name: product.name,
        type: product.type,
        sellingPrice: product.sellingPrice
      };
    } else {
      newItem.productId = product.id;
      newItem.product = {
        id: product.id,
        name: product.name,
        type: product.type,
        sellingPrice: product.sellingPrice
      };
    }

    setItems([...items, newItem]);
    setShowProductDialog(false);
    setCurrentProductType(null);

    toast({
      title: 'Produit ajouté',
      description: 'Le produit a été ajouté avec succès'
    });
  };

  const handleUpdateItem = (index: number, field: string, value: any) => {
    const updatedItems = [...items];
    const item = updatedItems[index];

    if (field === 'quantity' || field === 'unitPrice' || field === 'discount') {
      item[field] = parseFloat(value) || 0;
      item.itemTotal = (item.quantity * item.unitPrice) - item.discount;
    }

    setItems(updatedItems);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    onSave(items);
    onClose();
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + item.itemTotal, 0);
  };

  const getItemIcon = (item: SaleItem) => {
    const type = item.product?.type || item.medicalDevice?.type;
    switch (type) {
      case 'MEDICAL_DEVICE': return <Stethoscope className="h-4 w-4 text-blue-500" />;
      case 'DIAGNOSTIC_DEVICE': return <Stethoscope className="h-4 w-4 text-purple-500" />;
      case 'ACCESSORY': return <Puzzle className="h-4 w-4 text-green-500" />;
      case 'SPARE_PART': return <Cog className="h-4 w-4 text-amber-500" />;
      default: return <Package className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Gérer les Articles de la Vente</DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-4">
            {/* Add Product Buttons */}
            <div className="flex gap-2 flex-wrap">
              <Button
                onClick={() => handleAddProduct('medical-device')}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <Stethoscope className="h-4 w-4" />
                Ajouter Appareil Médical
              </Button>
              <Button
                onClick={() => handleAddProduct('diagnostic')}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <Stethoscope className="h-4 w-4" />
                Ajouter Appareil Diagnostic
              </Button>
              <Button
                onClick={() => handleAddProduct('accessory')}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <Puzzle className="h-4 w-4" />
                Ajouter Accessoire
              </Button>
              <Button
                onClick={() => handleAddProduct('spare-part')}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <Cog className="h-4 w-4" />
                Ajouter Pièce Détachée
              </Button>
            </div>

            {/* Items Table */}
            {items.length > 0 ? (
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-semibold">Type</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold">Produit</th>
                      <th className="px-4 py-2 text-center text-xs font-semibold">Quantité</th>
                      <th className="px-4 py-2 text-right text-xs font-semibold">Prix Unitaire</th>
                      <th className="px-4 py-2 text-right text-xs font-semibold">Remise</th>
                      <th className="px-4 py-2 text-right text-xs font-semibold">Total</th>
                      <th className="px-4 py-2 text-center text-xs font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, index) => (
                      <tr key={index} className="border-t hover:bg-slate-50">
                        <td className="px-4 py-2">
                          <div className="flex items-center gap-2">
                            {getItemIcon(item)}
                          </div>
                        </td>
                        <td className="px-4 py-2 text-sm">
                          {item.product?.name || item.medicalDevice?.name}
                        </td>
                        <td className="px-4 py-2">
                          <Input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => handleUpdateItem(index, 'quantity', e.target.value)}
                            className="h-8 text-xs text-center w-20"
                            min="1"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <Input
                            type="number"
                            value={item.unitPrice}
                            onChange={(e) => handleUpdateItem(index, 'unitPrice', e.target.value)}
                            className="h-8 text-xs text-right w-28"
                            step="0.01"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <Input
                            type="number"
                            value={item.discount}
                            onChange={(e) => handleUpdateItem(index, 'discount', e.target.value)}
                            className="h-8 text-xs text-right w-24"
                            step="0.01"
                          />
                        </td>
                        <td className="px-4 py-2 text-right text-sm font-medium">
                          {formatCurrency(item.itemTotal)}
                        </td>
                        <td className="px-4 py-2 text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveItem(index)}
                            className="h-8 w-8 p-0 hover:bg-red-100 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-50 border-t-2">
                    <tr>
                      <td colSpan={5} className="px-4 py-3 text-right font-semibold">
                        Total:
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-green-700 text-lg">
                        {formatCurrency(calculateTotal())}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : (
              <div className="text-center py-12 text-slate-500">
                <Package className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                <p>Aucun article ajouté</p>
                <p className="text-sm mt-2">Cliquez sur les boutons ci-dessus pour ajouter des produits</p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button onClick={handleSave} className="bg-blue-900 hover:bg-blue-700">
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Product Selection Dialog */}
      {currentProductType && (
        <ProductDialog
          isOpen={showProductDialog}
          onClose={() => {
            setShowProductDialog(false);
            setCurrentProductType(null);
          }}
          type={currentProductType}
          onSelect={handleProductSelect}
        />
      )}
    </>
  );
}
