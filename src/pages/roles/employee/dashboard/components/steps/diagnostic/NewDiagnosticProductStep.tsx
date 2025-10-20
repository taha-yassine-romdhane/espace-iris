import { Button } from "@/components/ui/button";
import {
  Plus,
  ChevronRight,
  ChevronLeft,
  Stethoscope
} from "lucide-react";
import { useState } from "react";
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
  const [isParameterDialogOpen, setIsParameterDialogOpen] = useState(false);
  const [selectedProductIndex, setSelectedProductIndex] = useState<number | null>(null);

  // Fetch ONLY diagnostic devices assigned to employee's stock locations
  const { data: diagnosticProducts, isLoading } = useQuery({
    queryKey: ["products", "diagnostic", "employee"],
    queryFn: async () => {
      // For employees, fetch only devices in their assigned stock locations
      const response = await fetch(`/api/medical-devices?type=DIAGNOSTIC_DEVICE&assignedToMe=true`);
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

  const handleOpenParameterDialog = async (index: number) => {
    setSelectedProductIndex(index);
    
    // In the new approach, we don't need to fetch parameters
    // Just open the dialog to configure the result date
    setIsParameterDialogOpen(true);
  };

  const handleParameterSubmit = (date: Date) => {
    if (selectedProductIndex !== null) {
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
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          <ChevronLeft className="h-4 w-4 mr-2" />
          Retour
        </Button>
        <Button 
          onClick={onNext}
          disabled={selectedProducts.length === 0}
          className="bg-green-600 hover:bg-green-700 text-white"
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
                className="flex items-center gap-1 mx-auto text-green-700 border-green-200 hover:bg-green-50"
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