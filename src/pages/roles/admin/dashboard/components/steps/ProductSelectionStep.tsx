import PatientProductSelection from "./product/PatientProductSelection";
import CompanyProductSelection from "./product/CompanyProductSelection";

interface ProductSelectionStepProps {
  onSelectProduct: (type: "medical-device" | "accessory" | "spare-part" | "diagnostic") => void;
  onCreateProduct: (type: "medical-device" | "accessory" | "spare-part" | "diagnostic") => void;
  selectedProducts?: any[];
  onRemoveProduct: (index: number) => void;
  onUpdateProduct?: (index: number, updatedProduct: any) => void;
  onBack: () => void;
  onNext: () => void;
  clientType?: "patient" | "societe" | null;
  isRental?: boolean;
}

/**
 * ProductSelectionStep - A router component that delegates to the appropriate
 * client-specific component based on the clientType prop.
 * 
 * This component is kept for backward compatibility and routes to either
 * PatientProductSelection or CompanyProductSelection based on the client type.
 */
export function ProductSelectionStep({
  selectedProducts = [],
  onSelectProduct,
  onCreateProduct,
  onRemoveProduct,
  onUpdateProduct,
  onBack,
  onNext,
  clientType,
  isRental = false
}: ProductSelectionStepProps) {
  // Handler for company product quantity updates
  const handleQuantityChange = (index: number, quantity: number) => {
    // Create a copy of the selected products array
    const updatedProducts = [...selectedProducts];
    // Update the quantity of the product at the specified index
    updatedProducts[index] = {
      ...updatedProducts[index],
      quantity: quantity
    };
    // NOTE: This doesn't update the state as it would need to be passed from parent
    // This functionality is now handled in the parent component (NewStepperDialog)
  };

  // Route to the appropriate component based on client type
  // For rentals, only allow patients
  if (isRental) {
    if (clientType === "patient") {
      return (
        <PatientProductSelection 
          selectedProducts={selectedProducts}
          onSelectProduct={onSelectProduct}
          onCreateProduct={onCreateProduct}
          onRemoveProduct={onRemoveProduct}
          onUpdateProduct={onUpdateProduct}
          onBack={onBack}
          onNext={onNext}
          isRental={isRental}
        />
      );
    } else if (clientType === "societe") {
      // Show error message for company rentals
      return (
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <div className="text-red-500 mb-4">
            <svg className="w-12 h-12 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.316 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Location non disponible pour les entreprises</h3>
          <p className="text-gray-600 mb-4">
            Les locations d'équipements médicaux ne sont disponibles que pour les patients individuels.
          </p>
          <button
            onClick={onBack}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Retour à la sélection client
          </button>
        </div>
      );
    }
  } else {
    // For sales, allow both patients and companies
    if (clientType === "patient") {
      return (
        <PatientProductSelection 
          selectedProducts={selectedProducts}
          onSelectProduct={onSelectProduct}
          onCreateProduct={onCreateProduct}
          onRemoveProduct={onRemoveProduct}
          onUpdateProduct={onUpdateProduct}
          onBack={onBack}
          onNext={onNext}
          isRental={isRental}
        />
      );
    } else if (clientType === "societe") {
      return (
        <CompanyProductSelection
          selectedProducts={selectedProducts}
          onSelectProduct={onSelectProduct}
          onCreateProduct={onCreateProduct}
          onRemoveProduct={onRemoveProduct}
          onUpdateProductQuantity={handleQuantityChange}
          onUpdateProduct={onUpdateProduct}
          onBack={onBack}
          onNext={onNext}
          isRental={isRental}
        />
      );
    }
  }
  
  // Fallback for unspecified client type
  return (
    <div className="flex items-center justify-center h-64">
      <p className="text-gray-500">
        Veuillez d'abord sélectionner un type de client pour continuer.
      </p>
    </div>
  );
}

export default ProductSelectionStep;
