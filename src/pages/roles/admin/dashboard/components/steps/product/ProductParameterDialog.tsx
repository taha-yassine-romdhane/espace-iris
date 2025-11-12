import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Settings } from "lucide-react";
import {
  ParametreCPAPForm,
  ParametreVNIForm,
  ParametreConcentrateurForm,
  ParametreBouteilleForm,
  ParametreVIForm
} from "@/components/MedicaleDevicesParametreForms";

interface ProductParameterDialogProps {
  isOpen: boolean;
  onClose: () => void;
  product: any;
  onSaveParameters: (productId: string, parameters: any) => void;
  initialParameters?: any;
}

export default function ProductParameterDialog({
  isOpen,
  onClose,
  product,
  onSaveParameters,
  initialParameters
}: ProductParameterDialogProps) {
  const [parameters, setParameters] = useState<any>(initialParameters || product?.parameters || {});

  useEffect(() => {
    // Update parameters when product changes or initialParameters are provided
    console.log('[ProductParameterDialog] Updating parameters:', { initialParameters, productParameters: product?.parameters });
    if (initialParameters) {
      setParameters(initialParameters);
    } else if (product?.parameters) {
      setParameters(product.parameters);
    } else if (product?.configuration) {
      // If configuration object is passed (from database)
      setParameters(product.configuration);
    } else {
      setParameters({});
    }
  }, [product, initialParameters]);

  const handleSubmit = (values: any) => {
    if (product?.id) {
      onSaveParameters(product.id, values);
      onClose();
    }
  };

  const getFormByType = () => {
    if (!product) return null;

    // For debugging
    
    // Extract device type from various possible properties
    // Check all possible locations where the device type might be stored
    const deviceType = product.deviceType || 
                      (product.device?.type) || 
                      (product.type === "MEDICAL_DEVICE" && product.name) || 
                      product.type || 
                      '';
    
    
    // Normalize the device type for matching
    const normalizedType = deviceType.toUpperCase();
    
    // Check if the type contains any of our known device types
    if (normalizedType.includes('CPAP')) {
      return <ParametreCPAPForm onSubmit={handleSubmit} initialValues={parameters} />;
    } else if (normalizedType.includes('VNI')) {
      return <ParametreVNIForm onSubmit={handleSubmit} initialValues={parameters} />;
    } else if (normalizedType.includes('CONCENTRATEUR') || normalizedType.includes('O2') || normalizedType.includes('OXYGENE')) {
      return <ParametreConcentrateurForm onSubmit={handleSubmit} initialValues={parameters} />;
    } else if (normalizedType.includes('BOUTEILLE')) {
      return <ParametreBouteilleForm onSubmit={handleSubmit} initialValues={parameters} />;
    } else if (normalizedType.includes('VI')) {
      return <ParametreVIForm onSubmit={handleSubmit} initialValues={parameters} />;
    }
    
    // If we couldn't match a type, show a debug message with the product info
    return (
      <div className="p-6 text-center space-y-4">
        <p className="text-gray-500">Aucun paramètre disponible pour ce type d'appareil.</p>
        <div className="text-xs text-left bg-gray-50 p-3 rounded border">
          <p className="font-semibold">Détails du produit (debug):</p>
          <pre className="whitespace-pre-wrap overflow-auto max-h-40">
            {JSON.stringify(product, null, 2)}
          </pre>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configuration des paramètres
          </DialogTitle>
        </DialogHeader>
        <div className="mt-4">
          {getFormByType()}
        </div>
      </DialogContent>
    </Dialog>
  );
}
