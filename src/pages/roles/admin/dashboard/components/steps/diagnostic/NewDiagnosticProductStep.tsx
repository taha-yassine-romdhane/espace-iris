import { Button } from "@/components/ui/button";
import { 
  Plus, 
  ChevronRight, 
  ChevronLeft,
  Stethoscope
} from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DiagnosticDeviceForm } from "@/components/appareils/forms/DiagnosticDeviceForm";
import { useQuery } from "@tanstack/react-query";

// Import our new components
import { DiagnosticProductDialog } from "./DiagnosticProductDialog";
import { ParameterConfigurationDialog } from "./ParameterConfigurationDialog";
import { ProductCard } from "../ProductCard";

interface DiagnosticProductStepProps {
  onBack: () => void;
  onNext: () => void;
  selectedProducts?: any[];
  onRemoveProduct: (index: number) => void;
  onSelectProduct: (product: any) => void;
  onUpdateProductParameters?: (productIndex: number, parameters: any) => void;
  patientId?: string;
  resultDueDate?: Date;
  onResultDueDateChange?: (date: Date | undefined) => void;
}

export function NewDiagnosticProductStep({
  onBack,
  onNext,
  selectedProducts = [],
  onRemoveProduct,
  onSelectProduct,
  resultDueDate,
  onResultDueDateChange = () => {}
}: DiagnosticProductStepProps) {
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [isCreateFormOpen, setIsCreateFormOpen] = useState(false);
  const [isParameterDialogOpen, setIsParameterDialogOpen] = useState(false);
  const [selectedProductIndex, setSelectedProductIndex] = useState<number | null>(null);
  
  // Fetch stock locations for forms
  const { data: stockLocations } = useQuery({
    queryKey: ["stock-locations"],
    queryFn: async () => {
      const response = await fetch("/api/stock-locations");
      if (!response.ok) {
        throw new Error("Failed to fetch stock locations");
      }
      return response.json();
    },
  });

  // Fetch ONLY diagnostic devices
  const { data: diagnosticProducts, isLoading } = useQuery({
    queryKey: ["products", "diagnostic"],
    queryFn: async () => {
      const response = await fetch(`/api/medical-devices?type=DIAGNOSTIC_DEVICE`);
      if (!response.ok) {
        throw new Error("Failed to fetch diagnostic devices");
      }
      const data = await response.json();
      // Additional filter to ensure only DIAGNOSTIC_DEVICE types are included
      return data.filter((device: any) => device.type === "DIAGNOSTIC_DEVICE");
    },
  });

  const handleOpenProductDialog = () => {
    setProductDialogOpen(true);
  };

  const handleCreateProduct = () => {
    setIsCreateFormOpen(true);
  };

  const handleOpenParameterDialog = async (index: number) => {
    setSelectedProductIndex(index);
    
    // In the new approach, we don't need to fetch parameters
    // Just open the dialog to configure the result date
    setIsParameterDialogOpen(true);
  };

  const handleParameterSubmit = (date: Date) => {
    if (selectedProductIndex !== null && selectedProducts[selectedProductIndex]) {
      // Update the selected product with the new configuration
      const updatedProduct = {
        ...selectedProducts[selectedProductIndex],
        reservedUntil: date.toISOString(),
        resultDueDate: date.toISOString()
      };
      
      // Update the selected products array
      const updatedProducts = [...selectedProducts];
      updatedProducts[selectedProductIndex] = updatedProduct;
      onSelectProduct(updatedProduct); // This will replace the single selected product
      
      // Update the result due date
      onResultDueDateChange(date);
      setIsParameterDialogOpen(false);
      setSelectedProductIndex(null);
    }
  };

  const handleCloseParameterDialog = () => {
    setIsParameterDialogOpen(false);
    setSelectedProductIndex(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold text-gray-900">Équipements de Diagnostic</h2>
        <Button
          onClick={handleCreateProduct}
          variant="outline"
          className="flex items-center gap-1 text-blue-700 border-blue-200 hover:bg-blue-50"
        >
          <Plus className="h-4 w-4" />
          <span>Créer un Équipement</span>
        </Button>
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          <ChevronLeft className="h-4 w-4 mr-2" />
          Retour
        </Button>
        <Button 
          onClick={onNext}
          disabled={selectedProducts.length === 0}
          className="bg-[#1e3a8a] hover:bg-[#1e3a8a]/90 text-white"
        >
          Suivant
          <ChevronRight className="h-4 w-4 ml-2" />
        </Button>
      </div>

      {/* Selected Products */}
      <div className="space-y-4 mt-6">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium">Équipements Sélectionnés</h3>
        </div>

        {selectedProducts.length === 0 ? (
          <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
            <Stethoscope className="h-12 w-12 mx-auto text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Aucun équipement sélectionné</h3>
            <p className="mt-1 text-sm text-gray-500">Commencez par ajouter un équipement de diagnostic</p>
            <div className="mt-6">
              <Button
                variant="outline"
                onClick={handleOpenProductDialog}
                className="flex items-center gap-1 mx-auto"
              >
                <Plus className="h-4 w-4" />
                <span>Ajouter un Équipement</span>
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {selectedProducts.map((product, index) => (
              <ProductCard 
                key={`${product.id}-${index}`}
                product={product}
                index={index}
                onRemove={onRemoveProduct}
                onConfigure={(idx) => handleOpenParameterDialog(idx)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Product Selection Dialog */}
      <DiagnosticProductDialog
        isOpen={productDialogOpen}
        onClose={() => setProductDialogOpen(false)}
        onSelect={onSelectProduct}
        products={diagnosticProducts || []}
        isLoading={isLoading}
      />

      {/* Create Form Dialog */}
      {isCreateFormOpen && (
        <Dialog open={isCreateFormOpen} onOpenChange={() => setIsCreateFormOpen(false)}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Créer un Équipement de Diagnostic</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <DiagnosticDeviceForm
                onSubmit={async (data) => {
                  try {
                    // First save the device to the database
                    const response = await fetch('/api/medical-devices', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({ ...data, type: "DIAGNOSTIC_DEVICE" }),
                    });
                    
                    if (!response.ok) {
                      // Handle specific error cases
                      const errorData = await response.json();
                      
                      if (response.status === 409 && errorData.code === 'P2002') {
                        // Handle duplicate serial number
                        const field = errorData.field || 'serialNumber';
                        const fieldName = field === 'serialNumber' ? 'Numéro de série' : field;
                        
                        // Show user-friendly error message
                        alert(`${fieldName} déjà utilisé. Veuillez utiliser une valeur unique.`);
                        return;
                      }
                      
                      throw new Error(errorData.error || 'Failed to create diagnostic device');
                    }
                    
                    // Get the newly created device with its ID from the response
                    const savedDevice = await response.json();
                    
                    // Now select the device with its database ID
                    onSelectProduct(savedDevice);
                    setIsCreateFormOpen(false);
                  } catch (error) {
                    console.error('Error creating diagnostic device:', error);
                    alert('Échec de la création de l\'appareil de diagnostic. Veuillez réessayer.');
                  }
                }}
                stockLocations={stockLocations || []}
              />
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Parameter Form Dialog */}
      {isParameterDialogOpen && selectedProductIndex !== null && (
        <ParameterConfigurationDialog
          isOpen={isParameterDialogOpen}
          onClose={handleCloseParameterDialog}
          onSubmit={handleParameterSubmit}
          deviceId={selectedProducts[selectedProductIndex]?.id}
          deviceName={selectedProducts[selectedProductIndex]?.name}
          resultDueDate={resultDueDate}
          onResultDueDateChange={onResultDueDateChange}
        />
      )}
    </div>
  );
}

export default NewDiagnosticProductStep;