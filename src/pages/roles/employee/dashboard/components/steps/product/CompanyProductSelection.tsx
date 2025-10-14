import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  ChevronRight, 
  ChevronLeft,
  Stethoscope,
  Puzzle,
  Cog,
  Activity,
  Info,
  X,
  Minus,
  Search,
  Filter,
  LayoutGrid
} from "lucide-react";
import { cn } from "@/lib/utils";

// Function to safely format prices
const formatPrice = (price: any, quantity: any = 1): string => {
  const numericPrice = typeof price === 'number' ? price : parseFloat(price) || 0;
  const numericQuantity = typeof quantity === 'number' ? quantity : parseInt(quantity) || 1;
  return (numericPrice * numericQuantity).toFixed(2);
};

interface CompanyProductSelectionProps {
  selectedProducts: any[];
  onSelectProduct: (type: "medical-device" | "accessory" | "spare-part" | "diagnostic") => void;
  onCreateProduct: (type: "medical-device" | "accessory" | "spare-part" | "diagnostic") => void;
  onRemoveProduct: (index: number) => void;
  onUpdateProductQuantity?: (index: number, quantity: number) => void;
  onUpdateProduct?: (index: number, updatedProduct: any) => void;
  onBack: () => void;
  onNext: () => void;
  isRental?: boolean;
}

// Product Type Button Component
const ProductTypeButton = ({ type, onSelect, onCreateNew }: {
  type: {
    id: string;
    label: string;
    selectLabel: string;
    createLabel: string;
    icon: React.ElementType;
  };
  onSelect: () => void;
  onCreateNew: () => void;
}) => {
  return (
    <div className="space-y-2">
      <div className="flex flex-col gap-2">
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "w-full h-10 flex items-center gap-2 px-4",
            "border-green-600 border-opacity-20 hover:border-opacity-100",
            "bg-white text-green-600",
            "hover:bg-green-50 transition-all duration-200",
            "rounded-md"
          )}
          onClick={onSelect}
        >
          <type.icon className="h-4 w-4 flex-shrink-0" />
          <span className="text-sm font-medium flex-1 text-left">{type.selectLabel}</span>
          <Info className="h-4 w-4 text-green-600 opacity-50" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "w-full h-10 flex items-center gap-2 px-4",
            "border-green-600 border-opacity-20 hover:border-opacity-100",
            "bg-green-50/30 text-green-600",
            "hover:bg-green-50 transition-all duration-200",
            "rounded-md"
          )}
          onClick={onCreateNew}
        >
          <type.icon className="h-4 w-4 flex-shrink-0" />
          <span className="text-sm font-medium flex-1 text-left">{type.createLabel}</span>
          <Plus className="h-4 w-4 text-green-600 opacity-50" />
        </Button>
      </div>
    </div>
  );
};

// Product Card Component
const ProductCard = ({
  product,
  index,
  onRemove,
  onQuantityChange,
  onUpdatePrice
}: {
  product: any;
  index: number;
  onRemove: () => void;
  onQuantityChange?: (index: number, quantity: number) => void;
  onUpdatePrice?: (index: number, price: number) => void;
}) => {
  return (
    <div className="p-4 flex items-center justify-between hover:bg-gray-50 border-b border-gray-100 last:border-0">
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <div className="flex-shrink-0">
            {product.type === "MEDICAL_DEVICE" && <Stethoscope className="h-5 w-5 text-green-500" />}
            {product.type === "ACCESSORY" && <Puzzle className="h-5 w-5 text-green-500" />}
            {product.type === "SPARE_PART" && <Cog className="h-5 w-5 text-amber-500" />}
            {product.type === "DIAGNOSTIC_DEVICE" && <Activity className="h-5 w-5 text-purple-500" />}
          </div>
          <div>
            <h4 className="font-medium text-gray-900">{product.name}</h4>
            <p className="text-sm text-gray-500">
              {product.type === "MEDICAL_DEVICE" ? "Appareil médical" :
               product.type === "ACCESSORY" ? "Accessoire" :
               product.type === "SPARE_PART" ? "Pièce détachée" :
               "Appareil diagnostique"}
            </p>
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        {onQuantityChange && !['MedicalDevice', 'Diagnostic'].includes(product.type) && (
          <div className="flex items-center">
            <Label htmlFor={`qty-${index}`} className="mr-2 text-sm text-gray-500">Qté:</Label>
            <div className="flex items-center">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-8 w-8 rounded-r-none border-gray-200"
                onClick={() => onQuantityChange(index, Math.max(1, (product.quantity || 1) - 1))}
                disabled={(product.quantity || 1) <= 1}
              >
                <Minus className="h-3 w-3" />
              </Button>
              <Input
                id={`qty-${index}`}
                type="number"
                value={product.quantity || 1}
                onChange={(e) => onQuantityChange(index, parseInt(e.target.value) || 1)}
                className="h-8 w-12 rounded-none border-x-0 text-center [-moz-appearance:_textfield] [&::-webkit-inner-spin-button]:m-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:m-0 [&::-webkit-outer-spin-button]:appearance-none"
                min={1}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-8 w-8 rounded-l-none border-gray-200"
                onClick={() => onQuantityChange(index, (product.quantity || 1) + 1)}
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          </div>
        )}
        
        <div className="min-w-[100px] text-right">
          {onUpdatePrice ? (
            <div className="flex items-center justify-end">
              <input
                type="number"
                className="w-20 text-right border border-gray-200 rounded px-2 py-1 text-sm"
                value={typeof product.sellingPrice === 'number' ? product.sellingPrice : parseFloat(product.sellingPrice) || 0}
                onChange={(e) => {
                  const newPrice = parseFloat(e.target.value);
                  if (!isNaN(newPrice) && newPrice >= 0 && onUpdatePrice) {
                    onUpdatePrice(index, newPrice);
                  }
                }}
                step="0.01"
                min="0"
              />
              <span className="ml-1 text-sm">DT</span>
            </div>
          ) : (
            <div className="font-medium">
              {formatPrice(product.sellingPrice, product.quantity)} DT
            </div>
          )}
        </div>
        
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 text-gray-400 hover:text-red-500 hover:bg-red-50 ml-2"
          onClick={onRemove}
        >
          <span className="sr-only">Supprimer</span>
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export function CompanyProductSelection({
  selectedProducts,
  onSelectProduct,
  onCreateProduct,
  onRemoveProduct,
  onUpdateProductQuantity,
  onUpdateProduct,
  onBack,
  onNext,
  isRental = false
}: CompanyProductSelectionProps) {
  const [searchTerm, setSearchTerm] = useState("");
  
  // Define the available product types for companies (all types)
  const productTypes = [
    { 
      id: "medical-device", 
      label: "Appareil", 
      selectLabel: "Select Appareil", 
      createLabel: "Créer Appareil",
      icon: Stethoscope
    },
    { 
      id: "accessory", 
      label: "Accessoire", 
      selectLabel: "Select Accessoire", 
      createLabel: "Créer Accessoire",
      icon: Puzzle
    },
    { 
      id: "spare-part", 
      label: "Pièce", 
      selectLabel: "Select Pièce", 
      createLabel: "Créer Pièce",
      icon: Cog
    },
    { 
      id: "diagnostic", 
      label: "Diagnostic", 
      selectLabel: "Select Diagnostic", 
      createLabel: "Créer Diagnostic",
      icon: Activity
    }
  ] as const;
  
  // Handle quantity change
  const handleQuantityChange = (index: number, newQuantity: number) => {
    if (onUpdateProductQuantity) {
      onUpdateProductQuantity(index, newQuantity);
    }
  };
  
  // Handle price change
  const handlePriceChange = (index: number, newPrice: number) => {
    if (onUpdateProduct) {
      const updatedProduct = {
        ...selectedProducts[index],
        sellingPrice: newPrice
      };
      onUpdateProduct(index, updatedProduct);
    }
  };
  
  
  // Calculate total price - ensure it's always a number
  const totalPrice = (selectedProducts || []).reduce((total, product) => {
    const price = typeof product.sellingPrice === 'number' ? product.sellingPrice : 
                   parseFloat(product.sellingPrice) || 0;
    const quantity = typeof product.quantity === 'number' ? product.quantity : 
                     parseInt(product.quantity) || 1;
    return total + (price * quantity);
  }, 0);

  return (
    <div className="space-y-6">
      {/* Search and Filter Bar */}
      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Rechercher des produits..."
            className="pl-9 border-green-200 focus:border-green-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button variant="outline" size="sm" className="gap-2 border-green-200">
          <Filter className="h-4 w-4 text-green-500" />
          <span>Filtres</span>
        </Button>
        <Button variant="outline" size="sm" className="gap-2 border-green-200">
          <LayoutGrid className="h-4 w-4 text-green-500" />
          <span>Catégories</span>
        </Button>
      </div>

      {/* Product Type Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {productTypes.map((type) => (
          <ProductTypeButton 
            key={type.id} 
            type={type} 
            onSelect={() => onSelectProduct(type.id as any)}
            onCreateNew={() => onCreateProduct(type.id as any)}
          />
        ))}
      </div>

      {/* Selected Products */}
      {(selectedProducts && selectedProducts.length > 0) && (
        <div className="mt-6 space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="text-base font-medium text-green-900">Produits Sélectionnés</h3>
            <Badge variant="secondary" className="bg-green-100 text-green-700 hover:bg-green-200">
              {selectedProducts?.length || 0} {(selectedProducts?.length || 0) > 1 ? 'produits' : 'produit'}
            </Badge>
          </div>
          
          <Card className="overflow-hidden border border-green-100">
            <div className="bg-green-50 px-4 py-2 border-b border-green-100 flex justify-between items-center">
              <div className="font-medium text-green-900">Récapitulatif des produits</div>
              <div className="text-sm text-green-700">Total: <span className="font-semibold">{typeof totalPrice === 'number' ? totalPrice.toFixed(2) : '0.00'} DT</span></div>
            </div>
            
            <div className="divide-y divide-gray-100">
              {selectedProducts.map((product, index) => (
                <ProductCard
                  key={`${product.id}-${index}`}
                  product={product}
                  index={index}
                  onRemove={() => onRemoveProduct(index)}
                  onQuantityChange={handleQuantityChange}
                  onUpdatePrice={handlePriceChange}
                />
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-6 border-t">
        <Button
          variant="outline"
          onClick={onBack}
          className="text-green-700 border-green-200 hover:bg-green-50 hover:border-green-300 flex items-center gap-2"
        >
          <ChevronLeft className="h-4 w-4" />
          Retour
        </Button>
        
        <div className="flex items-center gap-3">
          {(selectedProducts && selectedProducts.length > 0) && (
            <div className="text-sm text-gray-600">
              <span className="font-medium text-green-700">{selectedProducts.length}</span> produits pour un total de <span className="font-medium text-green-700">{typeof totalPrice === 'number' ? totalPrice.toFixed(2) : '0.00'} DT</span>
            </div>
          )}
          
          <Button
            onClick={onNext}
            disabled={!selectedProducts || selectedProducts.length === 0}
            className="bg-green-700 hover:bg-green-800 text-white flex items-center gap-2 disabled:opacity-50"
          >
            Continuer
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export default CompanyProductSelection;
