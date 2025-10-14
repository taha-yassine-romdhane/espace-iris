import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  ChevronRight, 
  ChevronLeft,
  Stethoscope,
  Puzzle,
  Cog,
  Activity,
  Search,
  X,
  Minus,
  PlusCircle,
  Info
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/use-toast";

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
const ProductTypeButton = ({ type, onSelect, onCreateNew, isSelected = false }: {
  type: {
    id: string;
    label: string;
    selectLabel: string;
    createLabel: string;
    icon: React.ElementType;
  };
  onSelect: () => void;
  onCreateNew: () => void;
  isSelected?: boolean;
}) => {
  return (
    <div className="space-y-3">
      {/* Header with category */}
      <div className="flex items-center gap-2 px-2">
        <type.icon className="h-5 w-5 text-blue-600" />
        <span className="font-semibold text-blue-800">{type.label}</span>
      </div>
      
      <div className="flex flex-col gap-2">
        {/* Select Button - Primary Action */}
        <Button
          variant="default"
          size="sm"
          className={cn(
            "w-full h-12 flex items-center gap-3 px-4",
            "bg-blue-600 hover:bg-blue-700 text-white",
            "shadow-sm hover:shadow-md transition-all duration-200",
            "rounded-lg font-medium",
            isSelected && "ring-2 ring-blue-300"
          )}
          onClick={onSelect}
        >
          <Search className="h-5 w-5 flex-shrink-0" />
          <div className="flex-1 text-left">
            <div className="text-sm font-semibold">{type.selectLabel}</div>
            <div className="text-xs text-blue-100">Choisir depuis le stock</div>
          </div>
        </Button>
        
        {/* Create Button - Secondary Action */}
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "w-full h-12 flex items-center gap-3 px-4",
            "border-2 border-blue-300 hover:border-blue-500",
            "bg-white hover:bg-blue-50 text-blue-700",
            "transition-all duration-200",
            "rounded-lg font-medium"
          )}
          onClick={onCreateNew}
        >
          <PlusCircle className="h-5 w-5 flex-shrink-0" />
          <div className="flex-1 text-left">
            <div className="text-sm font-semibold">{type.createLabel}</div>
            <div className="text-xs text-blue-500">Ajouter nouveau produit</div>
          </div>
        </Button>
      </div>
    </div>
  );
};

// Product Card Component for grouped products (for devices with serial numbers)
const GroupedProductCard = ({
  groupName,
  products,
  onRemove,
  onUpdateProduct,
}: {
  groupName: string;
  products: any[];
  onRemove: (index: number) => void;
  onQuantityChange?: (index: number, quantity: number) => void;
  onUpdateProduct?: (index: number, updatedProduct: any) => void;
}) => {
  const totalPrice = products.reduce((total, product) => {
    const price = parseFloat(product.sellingPrice) || 0;
    const quantity = parseInt(product.quantity) || 1;
    return total + (price * quantity);
  }, 0);

  // Get the appropriate icon based on product type
  const getProductIcon = (type: string) => {
    switch (type) {
      case "MEDICAL_DEVICE": return <Stethoscope className="h-5 w-5 text-blue-500" />;
      case "ACCESSORY": return <Puzzle className="h-5 w-5 text-green-500" />;
      case "SPARE_PART": return <Cog className="h-5 w-5 text-amber-500" />;
      case "DIAGNOSTIC_DEVICE": return <Activity className="h-5 w-5 text-purple-500" />;
      default: return <Info className="h-5 w-5 text-gray-500" />;
    }
  };
  
  // Handle price change for individual products
  const handlePriceChange = (product: any, newPrice: string) => {
    if (!onUpdateProduct) return;
    
    // Find the index within the products array passed to this component
    const productIndex = products.indexOf(product);
    if (productIndex === -1) return;
    
    const numericPrice = parseFloat(newPrice) || 0;
    const updatedProduct = { ...product, sellingPrice: numericPrice };
    
    // Use the index from the products array passed to this component
    onUpdateProduct(productIndex, updatedProduct);
  };

  return (
    <div className="p-3 hover:bg-gray-50 border-b border-gray-100 last:border-0">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0">
            {getProductIcon(products[0]?.type)}
          </div>
          <div>
            <h4 className="font-medium text-gray-900">{groupName}</h4>
            <p className="text-sm text-gray-500">
              {products[0]?.brand} {products[0]?.model} 
              <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                {products.length} {products.length > 1 ? 'unités' : 'unité'}
              </span>
            </p>
          </div>
        </div>
        <div className="font-semibold text-gray-800 text-right">
          {totalPrice.toFixed(2)} DT
        </div>
      </div>

      {/* Serial numbers list with price editing - more compact layout */}
      <div className="ml-8 mt-1 grid grid-cols-3 gap-1">
        {products.map((product, idx) => (
          <div key={`${product.id}-${idx}`} className="flex flex-col bg-gray-50 rounded-md p-1">
            <div className="flex items-center justify-between">
              <Badge variant="outline" className="text-xs bg-white flex-1 justify-center">
                N° {product.serialNumber || 'N/A'}
              </Badge>
              <Button 
                size="icon" 
                variant="ghost" 
                className="h-5 w-5 text-gray-400 hover:text-red-500 ml-1" 
                onClick={() => onRemove(products.indexOf(product))}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
            
            {/* Price editing field */}
            <div className="flex items-center mt-1 justify-between">
              <div className="flex items-center">
                <Input
                  type="number"
                  className="h-5 w-16 text-center text-xs p-0 border-gray-200"
                  value={product.sellingPrice || 0}
                  onChange={(e) => handlePriceChange(product, e.target.value)}
                  min="0"
                  step="0.01"
                />
                <span className="text-xs ml-1">DT</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Individual Product Card Component (kept for compatibility)
const ProductCard = ({
  product,
  index,
  onRemove,
  onQuantityChange,
  onUpdateProduct,
}: {
  product: any;
  index: number;
  onRemove: () => void;
  onQuantityChange?: (index: number, quantity: number) => void;
  onUpdateProduct?: (index: number, updatedProduct: any) => void;
}) => {
  const isStockable = product.type === "ACCESSORY" || product.type === "SPARE_PART";

  const handleQuantityInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!onQuantityChange) return;
    let newQuantity = parseInt(e.target.value) || 1;
    if (isStockable) {
      if (newQuantity > product.stockQuantity) {
        newQuantity = product.stockQuantity;
      }
      if (newQuantity < 1) {
        newQuantity = 1;
      }
    }
    onQuantityChange(index, newQuantity);
  };
  
  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!onUpdateProduct) return;
    const newPrice = parseFloat(e.target.value) || 0;
    const updatedProduct = { ...product, sellingPrice: newPrice };
    onUpdateProduct(index, updatedProduct);
  };

  return (
    <div className="p-4 flex items-center justify-between hover:bg-gray-50 border-b border-gray-100 last:border-0">
      <div className="flex-1">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0">
            {product.type === "MEDICAL_DEVICE" && <Stethoscope className="h-5 w-5 text-blue-500" />}
            {product.type === "ACCESSORY" && <Puzzle className="h-5 w-5 text-green-500" />}
            {product.type === "SPARE_PART" && <Cog className="h-5 w-5 text-amber-500" />}
            {product.type === "DIAGNOSTIC_DEVICE" && <Activity className="h-5 w-5 text-purple-500" />}
          </div>
          <div>
            <h4 className="font-medium text-gray-900">{product.name}</h4>
            <p className="text-sm text-gray-500">
              {product.brand} {product.model}
              {product.serialNumber && (
                <span className="ml-2 text-xs bg-gray-100 px-1.5 py-0.5 rounded">
                  N° {product.serialNumber}
                </span>
              )}
            </p>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {isStockable && onQuantityChange ? (
          <div className="flex items-center gap-2">
            <Button
              size="icon"
              variant="outline"
              className="h-7 w-7"
              onClick={() => onQuantityChange(index, (product.quantity || 1) - 1)}
              disabled={(product.quantity || 1) <= 1}
            >
              <Minus className="h-4 w-4" />
            </Button>
            <div className="flex items-center border rounded-md h-7">
              <Input
                type="number"
                className="h-full w-12 text-center border-none focus-visible:ring-0 p-0"
                value={product.quantity || 1}
                onChange={handleQuantityInputChange}
                min="1"
              />
              <span className="pr-2 text-sm text-gray-400">
                / {product.stockQuantity}
              </span>
            </div>
            <Button
              size="icon"
              variant="outline"
              className="h-7 w-7"
              onClick={() => onQuantityChange(index, (product.quantity || 1) + 1)}
              disabled={(product.quantity || 1) >= product.stockQuantity}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <Badge variant="outline" className="text-xs">
            {product.serialNumber ? `N° ${product.serialNumber}` : "Pièce unique"}
          </Badge>
        )}
        <div className="flex items-center gap-2 w-28">
          <Input
            type="number"
            className="h-7 w-16 text-center text-xs border-gray-200"
            value={product.sellingPrice || 0}
            onChange={handlePriceChange}
            min="0"
            step="0.01"
          />
          <span className="text-xs font-medium">DT</span>
        </div>
        <Button size="icon" variant="ghost" className="h-7 w-7 text-gray-400 hover:text-red-500" onClick={onRemove}>
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export const CompanyProductSelection = ({
  selectedProducts = [],
  onSelectProduct = () => {},
  onCreateProduct = () => {},
  onRemoveProduct = () => {},
  onUpdateProductQuantity = () => {},
  onUpdateProduct = () => {},
  onBack = () => {},
  onNext = () => {},
  isRental = false,
}: CompanyProductSelectionProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDevices, setSelectedDevices] = useState<Set<string>>(new Set());
  
  // Track selected devices by serial number for visual indication
  useEffect(() => {
    const deviceSerials = new Set<string>();
    selectedProducts.forEach(product => {
      if (product.serialNumber) {
        deviceSerials.add(product.serialNumber);
      }
    });
    setSelectedDevices(deviceSerials);
  }, [selectedProducts]);
  
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
    if (onUpdateProduct) {
      const productToUpdate = selectedProducts[index];
      const validatedQuantity = Math.max(1, newQuantity || 1);
      const updatedProduct = { ...productToUpdate, quantity: validatedQuantity };
      onUpdateProduct(index, updatedProduct);
    } else if (onUpdateProductQuantity) {
      onUpdateProductQuantity(index, newQuantity);
    }
  };
  
  const totalPrice = (selectedProducts || []).reduce((total, product) => {
    const price = typeof product.sellingPrice === 'number' ? product.sellingPrice : 
                   parseFloat(product.sellingPrice) || 0;
    const quantity = typeof product.quantity === 'number' ? product.quantity : 
                     parseInt(product.quantity) || 1;
    return total + (price * quantity);
  }, 0);

  return (
    <div className="space-y-6">
      {/* Product Type Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {productTypes.map((type) => {
          // Check if any products of this type are selected
          const hasSelectedProducts = selectedProducts.some(product => {
            if (type.id === "medical-device" && product.type === "MEDICAL_DEVICE") return true;
            if (type.id === "accessory" && product.type === "ACCESSORY") return true;
            if (type.id === "spare-part" && product.type === "SPARE_PART") return true;
            if (type.id === "diagnostic" && product.type === "DIAGNOSTIC_DEVICE") return true;
            return false;
          });
          
          return (
            <ProductTypeButton 
              key={type.id} 
              type={type} 
              onSelect={() => onSelectProduct(type.id as any)}
              onCreateNew={() => onCreateProduct(type.id as any)}
              isSelected={hasSelectedProducts}
            />
          );
        })}
      </div>

      {/* Selected Products */}
      {(selectedProducts && selectedProducts.length > 0) && (
        <div className="mt-6 space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="text-base font-medium text-blue-900">Produits Sélectionnés</h3>
            <Badge variant="secondary" className="bg-blue-100 text-blue-700 hover:bg-blue-200">
              {selectedProducts?.length || 0} {(selectedProducts?.length || 0) > 1 ? 'produits' : 'produit'}
            </Badge>
          </div>
          
          <Card className="overflow-hidden border border-blue-100">
            <div className="bg-blue-50 px-4 py-2 border-b border-blue-100 flex justify-between items-center">
              <div className="font-medium text-blue-900">Récapitulatif des produits</div>
              <div className="text-sm text-blue-700">Total: <span className="font-semibold">{typeof totalPrice === 'number' ? totalPrice.toFixed(2) : '0.00'} DT</span></div>
            </div>
            
            <div className="divide-y divide-gray-100">
              {/* Render products based on their type */}
              {(() => {
                // Separate products by type
                const deviceProducts = selectedProducts.filter(product => 
                  product.type === "MEDICAL_DEVICE" || product.type === "DIAGNOSTIC_DEVICE"
                );
                
                const nonDeviceProducts = selectedProducts.filter(product => 
                  product.type === "ACCESSORY" || product.type === "SPARE_PART"
                );
                
                // Group device products by category, brand and model
                const groupedDevices: Record<string, any[]> = {};
                
                deviceProducts.forEach(product => {
                  const groupKey = `${product.name}-${product.brand}-${product.model}`;
                  if (!groupedDevices[groupKey]) {
                    groupedDevices[groupKey] = [];
                  }
                  groupedDevices[groupKey].push(product);
                });
                
                return (
                  <>
                    {/* Render grouped devices */}
                    {Object.entries(groupedDevices).map(([groupKey, products]) => (
                      <GroupedProductCard
                        key={groupKey}
                        groupName={products[0].name}
                        products={products}
                        onRemove={(idx) => {
                          // Find the actual index in the selectedProducts array
                          const actualIndex = selectedProducts.indexOf(products[idx]);
                          onRemoveProduct(actualIndex);
                        }}
                        onQuantityChange={(idx, quantity) => {
                          // Find the actual index in the selectedProducts array
                          const actualIndex = selectedProducts.indexOf(products[idx]);
                          handleQuantityChange(actualIndex, quantity);
                        }}
                        onUpdateProduct={(idx, updatedProduct) => {
                          // Find the actual index in the selectedProducts array
                          const actualIndex = selectedProducts.indexOf(products[idx]);
                          if (onUpdateProduct && actualIndex !== -1) {
                            onUpdateProduct(actualIndex, updatedProduct);
                          }
                        }}
                      />
                    ))}
                    
                    {/* Render accessories and spare parts with original style */}
                    {nonDeviceProducts.map((product, index) => {
                      const originalIndex = selectedProducts.indexOf(product);
                      return (
                        <ProductCard
                          key={`${product.id}-${originalIndex}`}
                          product={product}
                          index={originalIndex}
                          onRemove={() => onRemoveProduct(originalIndex)}
                          onQuantityChange={handleQuantityChange}
                          onUpdateProduct={onUpdateProduct}
                        />
                      );
                    })}
                  </>
                );
              })()}
            </div>
          </Card>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-6 border-t">
        <Button
          variant="outline"
          onClick={onBack}
          className="text-blue-700 border-blue-200 hover:bg-blue-50 hover:border-blue-300 flex items-center gap-2"
        >
          <ChevronLeft className="h-4 w-4" />
          Retour
        </Button>
        
        <div className="flex items-center gap-3">
          {(selectedProducts && selectedProducts.length > 0) && (
            <div className="text-sm text-gray-600">
              <span className="font-medium text-blue-700">{selectedProducts.length}</span> produits pour un total de <span className="font-medium text-blue-700">{typeof totalPrice === 'number' ? totalPrice.toFixed(2) : '0.00'} DT</span>
            </div>
          )}
          
          <Button
            onClick={() => {
              if (!selectedProducts || selectedProducts.length === 0) {
                toast({
                  title: "Produits requis",
                  description: "Veuillez sélectionner au moins un produit pour continuer",
                  variant: "destructive"
                });
                return;
              }
              onNext();
            }}
            disabled={!selectedProducts || selectedProducts.length === 0}
            className="bg-blue-700 hover:bg-blue-800 text-white flex items-center gap-2 disabled:opacity-50"
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
