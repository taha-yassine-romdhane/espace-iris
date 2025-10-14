import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  ChevronRight, 
  ChevronLeft,
  Stethoscope,
  Puzzle,
  Search,
  X,
  Settings,
  PlusCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/use-toast";
import ProductParameterDialog from "./ProductParameterDialog";

interface PatientProductSelectionProps {
  selectedProducts: any[];
  onSelectProduct: (type: "medical-device" | "accessory") => void;
  onCreateProduct: (type: "medical-device" | "accessory") => void;
  onRemoveProduct: (index: number) => void;
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
            "rounded-lg font-medium"
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

// Product Card Component
const ProductCard = ({
  product,
  onRemove,
  onConfigure,
  onUpdatePrice,
  isRental = false
}: {
  product: any;
  onRemove: () => void;
  onConfigure?: () => void;
  onUpdatePrice?: (price: number) => void;
  isRental?: boolean;
}) => {
  // Only show configure button for medical devices
  const showConfigureButton = product.type === "MEDICAL_DEVICE" && onConfigure;
  
  // Check if parameters are configured
  const hasParameters = product.parameters && Object.keys(product.parameters).length > 0;
  
  // Get the appropriate price field based on rental vs sale
  const priceField = isRental ? 'rentalPrice' : 'sellingPrice';
  const currentPrice = typeof product[priceField] === 'number' ? 
    product[priceField] : 
    parseFloat(product[priceField]) || 0;
  
  // Function to format parameters for display
  const formatParameters = (params: any) => {
    if (!params) return [];
    
    const formattedParams = [];
    
    // CPAP parameters
    if (params.pressionRampe) formattedParams.push(`Pression Rampe: ${params.pressionRampe}`);
    if (params.dureeRampe) formattedParams.push(`Durée Rampe: ${params.dureeRampe} min`);
    if (params.pression) formattedParams.push(`Pression: ${params.pression}`);
    if (params.epr) formattedParams.push(`EPR: ${params.epr}`);
    
    // VNI parameters
    if (params.ipap) formattedParams.push(`IPAP: ${params.ipap}`);
    if (params.epap) formattedParams.push(`EPAP: ${params.epap}`);
    if (params.aid) formattedParams.push(`AID: ${params.aid}`);
    if (params.frequenceRespiratoire) formattedParams.push(`Fréq. Resp.: ${params.frequenceRespiratoire}`);
    if (params.volumeCourant) formattedParams.push(`Vol. Courant: ${params.volumeCourant}`);
    if (params.mode) formattedParams.push(`Mode: ${params.mode}`);
    
    // Concentrateur & Bouteille parameters
    if (params.debit) formattedParams.push(`Débit: ${params.debit}`);
    
    return formattedParams;
  };
  
  // Get formatted parameters
  const parametersList = formatParameters(product.parameters);
  
  return (
    <div className="p-4 flex flex-col hover:bg-gray-50 border-b border-gray-100 last:border-0">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <div className="flex-shrink-0">
              {product.type === "MEDICAL_DEVICE" && <Stethoscope className="h-5 w-5 text-blue-500" />}
              {product.type === "ACCESSORY" && <Puzzle className="h-5 w-5 text-green-500" />}
            </div>
            <div>
              <h4 className="font-medium text-gray-900">{product.name}</h4>
              <p className="text-sm text-gray-500">
                {product.type === "MEDICAL_DEVICE" ? "Appareil médical" : "Accessoire"}
              </p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="min-w-[100px] text-right">
            {onUpdatePrice ? (
              <div className="flex items-center justify-end">
                <input
                  type="number"
                  className="w-20 text-right border border-gray-200 rounded px-2 py-1 text-sm"
                  value={currentPrice}
                  onChange={(e) => {
                    const newPrice = parseFloat(e.target.value);
                    if (!isNaN(newPrice) && newPrice >= 0) {
                      onUpdatePrice(newPrice);
                    }
                  }}
                  step="0.01"
                  min="0"
                />
                <span className="ml-1 text-sm">{isRental ? 'TND/jour' : 'TND'}</span>
              </div>
            ) : (
              <div className="font-medium">{currentPrice.toFixed(2)} {isRental ? 'TND/jour' : 'TND'}</div>
            )}
          </div>
          
          {showConfigureButton && (
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "h-8 w-8 p-0 hover:bg-blue-50 border-blue-200",
                hasParameters ? "text-green-500 hover:text-green-700" : "text-blue-500 hover:text-blue-700"
              )}
              onClick={onConfigure}
              title={hasParameters ? "Modifier les paramètres" : "Configurer les paramètres"}
            >
              <Settings className="h-4 w-4" />
            </Button>
          )}
          
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-gray-400 hover:text-red-500 hover:bg-red-50"
            onClick={onRemove}
          >
            <span className="sr-only">Supprimer</span>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      {/* Display configured parameters if they exist */}
      {hasParameters && parametersList.length > 0 && (
        <div className="mt-2 ml-7 pl-2 border-l-2 border-blue-100">
          <div className="text-xs text-gray-500 font-medium mb-1">Paramètres configurés:</div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            {parametersList.map((param, index) => (
              <div key={index} className="text-xs text-gray-600">{param}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export function PatientProductSelection({
  selectedProducts,
  onSelectProduct,
  onCreateProduct,
  onRemoveProduct,
  onUpdateProduct,
  onBack,
  onNext,
  isRental = false
}: PatientProductSelectionProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [parameterDialogOpen, setParameterDialogOpen] = useState(false);
  const [selectedProductIndex, setSelectedProductIndex] = useState<number | null>(null);
  
  // Define the available product types for patients
  const productTypes = [
    { 
      id: "medical-device", 
      label: "Appareils Médicaux", 
      selectLabel: "Sélectionner un appareil", 
      createLabel: "Créer un nouvel appareil",
      icon: Stethoscope
    },
    { 
      id: "accessory", 
      label: "Accessoires", 
      selectLabel: "Sélectionner un accessoire", 
      createLabel: "Créer un nouvel accessoire",
      icon: Puzzle
    }
  ] as const;
  
  // Get the currently selected product for parameter configuration
  const selectedProduct = selectedProductIndex !== null ? selectedProducts[selectedProductIndex] : null;
  
  // Handle opening the parameter dialog for a product
  const handleConfigureProduct = (index: number) => {
    setSelectedProductIndex(index);
    setParameterDialogOpen(true);
  };
  
  // Handle saving parameters for a product
  const handleSaveParameters = (productId: string, parameters: any) => {
    // Find the product index in the selected products array
    const selectedProductIndex = selectedProducts.findIndex(p => p.id === productId);
    
    // If product found and onUpdateProduct is provided, update the product
    if (selectedProductIndex !== -1 && onUpdateProduct) {
      const updatedProduct = {
        ...selectedProducts[selectedProductIndex],
        parameters
      };
      onUpdateProduct(selectedProductIndex, updatedProduct);
    }
  };
  
  // Handle updating product price
  const handleUpdatePrice = (index: number, price: number) => {
    if (onUpdateProduct) {
      const priceField = isRental ? 'rentalPrice' : 'sellingPrice';
      const updatedProduct = {
        ...selectedProducts[index],
        [priceField]: price
      };
      onUpdateProduct(index, updatedProduct);
    }
  };
  
  // Calculate total price - ensure it's always a number
  const totalPrice = (selectedProducts || []).reduce((total, product) => {
    const priceField = isRental ? 'rentalPrice' : 'sellingPrice';
    const price = typeof product[priceField] === 'number' ? product[priceField] : 
                  parseFloat(product[priceField]) || 0;
    return total + price;
  }, 0);

  return (
    <div className="space-y-6">


      {/* Product Type Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {productTypes.map((type) => (
          <ProductTypeButton 
            key={type.id} 
            type={type} 
            onSelect={() => onSelectProduct(type.id as "medical-device" | "accessory")}
            onCreateNew={() => onCreateProduct(type.id as "medical-device" | "accessory")}
          />
        ))}
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
              <div className="text-sm text-blue-700">Total: <span className="font-semibold">{typeof totalPrice === 'number' ? totalPrice.toFixed(2) : '0.00'} {isRental ? 'TND/jour' : 'TND'}</span></div>
            </div>
            
            <div className="divide-y divide-gray-100">
              {selectedProducts.map((product, index) => (
                <ProductCard
                  key={`${product.id}-${index}`}
                  product={product}
                  onRemove={() => onRemoveProduct(index)}
                  onConfigure={product.type === "MEDICAL_DEVICE" ? () => handleConfigureProduct(index) : undefined}
                  onUpdatePrice={(price) => handleUpdatePrice(index, price)}
                  isRental={isRental}
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
          className="text-blue-700 border-blue-200 hover:bg-blue-50 hover:border-blue-300 flex items-center gap-2"
        >
          <ChevronLeft className="h-4 w-4" />
          Retour
        </Button>
        
        <div className="flex items-center gap-3">
          {(selectedProducts && selectedProducts.length > 0) && (
            <div className="text-sm text-gray-600">
              <span className="font-medium text-blue-700">{selectedProducts.length}</span> produits pour un total de <span className="font-medium text-blue-700">{typeof totalPrice === 'number' ? totalPrice.toFixed(2) : '0.00'} {isRental ? 'TND/jour' : 'TND'}</span>
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
      
      {/* Parameter Configuration Dialog */}
      <ProductParameterDialog
        isOpen={parameterDialogOpen}
        onClose={() => setParameterDialogOpen(false)}
        product={selectedProduct}
        onSaveParameters={handleSaveParameters}
      />
    </div>
  );
}

export default PatientProductSelection;