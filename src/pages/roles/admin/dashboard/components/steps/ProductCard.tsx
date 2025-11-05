import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Activity, 
  Sliders, 
  X, 
  CircleAlert, 
  CheckCircle2 
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ProductCardProps {
  product: any;
  index: number;
  onRemove: (index: number) => void;
  onConfigure: (index: number) => void;
}

export function ProductCard({ product, index, onRemove, onConfigure }: ProductCardProps) {
  // Helper function to determine if parameters are configured
  const isParametersConfigured = (product: any) => {
    // In the new simplified approach, we only check for the resultDueDate directly on the product
    // or from the MedicalDevice.reservedUntil field
    return product?.resultDueDate || product?.reservedUntil;
  };

  const renderParameterStatus = () => {
    const configured = isParametersConfigured(product);
    
    if (configured) {
      // Format the date if available
      const dateStr = product?.resultDueDate || product?.reservedUntil;
      const dateDisplay = dateStr ? new Date(dateStr).toLocaleDateString() : '';
      
      return (
        <div className="flex items-center text-green-600 text-sm mt-1">
          <CheckCircle2 className="h-4 w-4 mr-1" />
          <span>Date des résultats configurée: {dateDisplay}</span>
        </div>
      );
    } else {
      return (
        <div className="flex items-center text-yellow-600 text-sm mt-1">
          <CircleAlert className="h-4 w-4 mr-1" />
          <span>Date des résultats non configurée</span>
        </div>
      );
    }
  };

  return (
    <Card className="mb-3">
      <div className="p-4">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-blue-600" />
              <h3 className="font-medium">{product?.name || 'Produit sans nom'}</h3>
            </div>
            
            {product?.brand && (
              <p className="text-sm text-gray-600 mt-1">
                Marque: {product.brand}
              </p>
            )}
            
            {product?.model && (
              <p className="text-sm text-gray-600">
                Modèle: {product.model}
              </p>
            )}
            
            {renderParameterStatus()}
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-2"
              onClick={() => onConfigure(index)}
            >
              <Sliders className="h-4 w-4 mr-1" />
              <span>Configurer</span>
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-2 border-red-200 text-red-600 hover:bg-red-50"
              onClick={() => onRemove(index)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}

export default ProductCard;
