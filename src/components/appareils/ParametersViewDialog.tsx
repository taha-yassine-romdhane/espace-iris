import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Product } from "@/types";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";

interface ParametersViewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
}

export function ParametersViewDialog({
  isOpen,
  onClose,
  product,
}: ParametersViewDialogProps) {
  const [parameters, setParameters] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && product?.id) {
      fetchParameters();
    }
  }, [isOpen, product]);

  const fetchParameters = async () => {
    if (!product?.id) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(`/api/diagnostic-parameters/${product.id}`);
      if (!response.ok) {
        throw new Error("Failed to fetch parameters");
      }
      const data = await response.json();
      
      // The API returns an array of parameters directly
      setParameters(data || []);
    } catch (error) {
      console.error("Error fetching parameters:", error);
      toast({
        title: "Erreur",
        description: "Impossible de récupérer les paramètres",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const renderParameterValue = (parameter: any) => {
    if (parameter.value === 'auto') {
      return <Badge variant="secondary">Auto</Badge>;
    }
    
    switch (parameter.type) {
      case 'CHECKBOX':
        return parameter.value ? 'Oui' : 'Non';
      case 'RANGE':
        return `${parameter.value || 0}${parameter.unit ? ` ${parameter.unit}` : ''}`;
      case 'NUMBER':
        return `${parameter.value || 0}${parameter.unit ? ` ${parameter.unit}` : ''}`;
      default:
        return parameter.value || '-';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="text-xl">
            Paramètres de {product?.name || 'l\'appareil'}
          </DialogTitle>
        </DialogHeader>

        <div className="py-4">
          {isLoading ? (
            <div className="text-center py-8">Chargement des paramètres...</div>
          ) : parameters.length > 0 ? (
            <div className="space-y-4">
              {parameters.map((param) => (
                <div key={param.id} className="bg-white rounded-lg border p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center">
                      <h3 className="text-base font-medium">{param.title}</h3>
                      {param.isRequired && (
                        <span className="text-red-500 ml-1">*</span>
                      )}
                    </div>
                    {param.isAutomatic && param.value === 'auto' && (
                      <Badge variant="outline">Mode Auto</Badge>
                    )}
                  </div>
                  <div className="text-sm text-gray-700">
                    <span className="font-medium">Valeur: </span>
                    {renderParameterValue(param)}
                  </div>
                  {(param.type === 'RANGE' || param.type === 'NUMBER') && param.value !== 'auto' && (
                    <div className="text-xs text-gray-500 mt-1">
                      Plage: {param.minValue || 0} - {param.maxValue || 100} 
                      {param.unit ? ` ${param.unit}` : ''}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              Aucun paramètre défini pour cet appareil
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default ParametersViewDialog;