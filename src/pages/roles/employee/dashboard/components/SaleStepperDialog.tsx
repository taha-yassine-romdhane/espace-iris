import { useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ClientSelectionStep } from "./steps/ClientSelectionStep";
import { PaymentStep } from "@/components/steps/PaymentStep";
import { ProductDialog } from "./dialogs/ProductDialog";
import { useQuery } from "@tanstack/react-query";
import { MedicalDeviceForm } from "@/components/appareils/forms/MedicalDeviceForm";
import { AccessoryForm } from "@/components/appareils/forms/AccessoryForm";
import { SparePartForm } from "@/components/appareils/forms/SparePartForm";
import { DiagnosticDeviceForm } from "@/components/appareils/forms/DiagnosticDeviceForm";
import SaleStepperSidebar from "./SaleStepperSidebar";
import { toast } from "@/components/ui/use-toast";

// Import the product selection components
import { ProductSelectionStep } from "./steps/ProductSelectionStep";

interface StepperDialogProps {
  isOpen: boolean;
  onClose: () => void;
  action: "location" | "vente" | "diagnostique" | null;
}

const steps = [
  { id: 1, name: "Type de Renseignement", description: "Sélectionner le type de client et le client" },
  { id: 2, name: "Ajout Produits", description: "Sélectionner ou créer des produits" },
  { id: 3, name: "Ajout Paiement", description: "Configurer les détails du paiement" },
] as const;

export function SaleStepperDialog({ isOpen, onClose, action }: StepperDialogProps) {
  // Step Management
  const [currentStep, setCurrentStep] = useState(1);

  // Client Selection State
  const [clientType, setClientType] = useState<"patient" | "societe" | null>(null);
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [clientDetails, setClientDetails] = useState<any | null>(null);

  // Product Selection State
  const [selectedProducts, setSelectedProducts] = useState<any[]>([]);
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [isCreateFormOpen, setIsCreateFormOpen] = useState(false);
  const [currentProductType, setCurrentProductType] = useState<
    "medical-device" | "accessory" | "spare-part" | "diagnostic" | null
  >(null);

  // Calculate total price
  const calculateTotalPrice = useCallback(() => {
    return selectedProducts.reduce((total, product) => {
      // Ensure price and quantity are valid numbers
      const price = typeof product.sellingPrice === 'number' ? product.sellingPrice : 
                   (parseFloat(product.sellingPrice) || 0);
      const quantity = typeof product.quantity === 'number' ? product.quantity : 
                      (parseInt(product.quantity) || 1);
      return total + (price * quantity);
    }, 0);
  }, [selectedProducts]);

  // Ensure totalPrice is always a valid number
  const totalPrice = calculateTotalPrice();

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


  // Fetch client details when client is selected
  const fetchClientDetails = useCallback(async (id: string, type: "patient" | "societe") => {
    if (!id) return;

    try {
      // Fix: Use societes endpoint instead of companies for company data
      const endpoint = type === "patient" ? "patients" : "societes";
      const response = await fetch(`/api/${endpoint}/${id}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch ${type} details`);
      }
      const data = await response.json();

      setClientDetails({
        ...data,
        type,
        // Normalize fields for display
        firstName: data.firstName || data.prenom || "",
        lastName: data.lastName || data.nom || "",
        nomComplet: data.nomComplet || `${data.firstName || ""} ${data.lastName || ""}`,
        nomSociete: data.companyName || data.nomSociete || data.name || "",
        telephone: data.telephone || data.telephonePrincipale || "",
        address: data.address || data.adresseComplete || "",
        cin: data.cin || "",
        matriculeFiscale: data.matriculeFiscale || data.fiscalNumber || ""
      });
    } catch (error) {
      console.error(`Error fetching ${type} details:`, error);
      toast({
        title: "Erreur",
        description: `Impossible de charger les détails du ${type === "patient" ? "patient" : "société"}.`,
        variant: "destructive"
      });
    }
  }, []);

  const handleClientTypeChange = (type: "patient" | "societe") => {
    setClientType(type);
    setSelectedClient(null);
    setClientDetails(null);
  };

  // Product Selection Handlers
  const handleProductSelect = (products: any | any[]) => {
    // Handle both single product and array of products
    if (Array.isArray(products)) {
      // Filter out products that are already selected to prevent duplicates
      const newProducts = products.filter(product => 
        !selectedProducts.some(selected => selected.id === product.id)
      );
      setSelectedProducts([...selectedProducts, ...newProducts]);
    } else {
      // Check if single product is already selected
      if (!selectedProducts.some(selected => selected.id === products.id)) {
        setSelectedProducts([...selectedProducts, products]);
      }
    }
  };

  const handleRemoveProduct = (index: number) => {
    setSelectedProducts(selectedProducts.filter((_, i) => i !== index));
  };

  const handleUpdateProduct = (index: number, updatedProduct: any) => {
    const newProducts = [...selectedProducts];
    newProducts[index] = updatedProduct;
    setSelectedProducts(newProducts);
  };

  const handleOpenProductDialog = (type: "medical-device" | "accessory" | "spare-part" | "diagnostic") => {
    setCurrentProductType(type);
    setProductDialogOpen(true);
  };

  const handleOpenCreateForm = (type: "medical-device" | "accessory" | "spare-part" | "diagnostic") => {
    setCurrentProductType(type);
    setIsCreateFormOpen(true);
  };

  // Navigation Handlers
  const handleNext = () => {
    // If moving from client selection to product selection and we have a client selected,
    // fetch the client details for display in the sidebar
    if (currentStep === 1 && selectedClient && clientType) {
      fetchClientDetails(selectedClient, clientType);
    }
    setCurrentStep((prev) => Math.min(prev + 1, steps.length));
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleClose = () => {
    setCurrentStep(1);
    setClientType(null);
    setSelectedClient(null);
    setSelectedProducts([]);
    setCurrentProductType(null);
    setProductDialogOpen(false);
    setIsCreateFormOpen(false);
    onClose();
  };

  // Handle payment completion
  const handlePaymentComplete = async (paymentData: any) => {
    try {
      // Calculate totals
      const totalAmount = calculateTotalPrice();
      const discount = 0; // You could add discount handling in the future
      const finalAmount = totalAmount - discount;
      
      // Process all payments
      let paymentDetails = null;
      if (paymentData.payments && paymentData.payments.length > 0) {
        // Get the primary payment if available
        const primaryPayment = paymentData.payments.find((p: any) => p.classification === 'principale') || paymentData.payments[0];
        
        // Create payment reference string with details from all payments
        const paymentReferences = paymentData.payments.map((p: any) => {
          let details = '';
          
          // Add payment-specific details
          switch (p.type) {
            case 'especes':
              details = `Espèces: ${p.amount} DT`;
              break;
            case 'cheque':
              details = `Chèque N°${p.chequeNumber || ''} ${p.bankName || ''}: ${p.amount} DT`;
              break;
            case 'virement':
              details = `Virement Réf:${p.reference || ''}: ${p.amount} DT`;
              break;
            case 'mondat':
              details = `Mandat N°${p.mondatNumber || ''}: ${p.amount} DT`;
              break;
            case 'cnam':
              details = `CNAM Dossier N°${p.fileNumber || ''}: ${p.amount} DT`;
              break;
            case 'traite':
              details = `Traite Échéance:${p.echeance || ''}: ${p.amount} DT`;
              break;
            default:
              details = `${p.type}: ${p.amount} DT`;
          }
          
          // Add classification
          return `${details} (${p.classification === 'principale' ? 'Principal' : 
                           p.classification === 'garantie' ? 'Garantie' : 'Complément'})`;
        }).join(' | ');
        
        // Create payment object for the database
        paymentDetails = {
          amount: paymentData.paidAmount,
          method: primaryPayment.type,
          status: paymentData.status === 'COMPLETED' ? 'PAID' : 'PARTIAL',
          reference: paymentReferences,
          notes: JSON.stringify({
            payments: paymentData.payments,
            totalAmount: paymentData.totalAmount,
            paidAmount: paymentData.paidAmount,
            remainingAmount: paymentData.remainingAmount,
            status: paymentData.status
          }),
        };
      }
      
      // Prepare sale data
      const saleData = {
        saleDate: new Date(),
        totalAmount,
        discount,
        finalAmount,
        status: paymentData.status === 'COMPLETED' ? 'COMPLETED' : 'PENDING',
        notes: `Created via ${action === 'location' ? 'rental' : 'sale'} stepper`,
        processedById: '', // Will be filled by the API with the current user's ID
        patientId: clientType === 'patient' ? clientDetails?.id : null,
        companyId: clientType === 'societe' ? clientDetails?.id : null,
        payment: paymentDetails,
        items: selectedProducts.map(product => ({
          quantity: product.quantity || 1,
          unitPrice: product.sellingPrice || 0,
          discount: 0,
          itemTotal: (product.quantity || 1) * (product.sellingPrice || 0),
          serialNumber: product.serialNumber,
          warranty: product.warranty,
          productId: product.type === 'ACCESSORY' || product.type === 'SPARE_PART' ? product.id : null,
          medicalDeviceId: product.type === 'MEDICAL_DEVICE' ? product.id : null,
        }))
      };
      
      // Send the data to the API
      const response = await fetch('/api/sales', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(saleData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create sale');
      }
      
      const result = await response.json();
      
      // Show success message
      toast({
        title: "Opération terminée",
        description: "La vente a été enregistrée avec succès.",
      });
      
      // Close the dialog
      onClose();
    } catch (error: any) {
      console.error('Error creating sale:', error);
      toast({
        title: "Erreur",
        description: `Une erreur est survenue: ${error.message || 'Erreur inconnue'}`,
        variant: "destructive",
      });
    }
  };

  const getActionTitle = () => {
    switch (action) {
      case "location":
        return "Nouvelle Location";
      case "vente":
        return "Nouvelle Vente";
      case "diagnostique":
        return "Nouveau Diagnostic";
      default:
        return "";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-[95vw] w-full min-h-[85vh] max-h-[95vh] overflow-hidden p-0 flex flex-col">
        <div className="flex h-full overflow-hidden">
          {/* Sale Stepper Sidebar */}
          {action === "vente" && (
            <SaleStepperSidebar
              steps={steps}
              currentStep={currentStep}
              clientDetails={clientDetails}
              selectedProducts={selectedProducts}
              totalPrice={totalPrice}
            />
          )}

          <div className="flex-1 overflow-hidden flex flex-col">
            <DialogHeader className="flex-shrink-0 p-4 pb-4 border-b">
              <DialogTitle>{getActionTitle()}</DialogTitle>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto">
              <div className="p-6 space-y-6">
                {currentStep === 1 && (
                  <ClientSelectionStep
                    onNext={handleNext}
                    onClose={handleClose}
                    onClientTypeChange={handleClientTypeChange}
                    onClientSelect={setSelectedClient}
                    clientType={clientType}
                    selectedClient={selectedClient}
                    action={action}
                  />
                )}

                {currentStep === 2 && (
                  <ProductSelectionStep
                    clientType={clientType}
                    onSelectProduct={handleOpenProductDialog}
                    onCreateProduct={handleOpenCreateForm}
                    selectedProducts={selectedProducts}
                    onRemoveProduct={handleRemoveProduct}
                    onUpdateProduct={handleUpdateProduct}
                    onBack={handleBack}
                    onNext={handleNext}
                  />
                )}

                {currentStep === 3 && (
                  <PaymentStep
                    onBack={handleBack}
                    onComplete={handlePaymentComplete}
                    selectedClient={clientDetails}
                    selectedProducts={selectedProducts}
                    calculateTotal={calculateTotalPrice}
                  />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Product Selection Dialog */}
        {currentProductType && (
          <ProductDialog
            isOpen={productDialogOpen}
            onClose={() => {
              setProductDialogOpen(false);
              setCurrentProductType(null);
            }}
            type={currentProductType}
            onSelect={handleProductSelect}
          />
        )}

        {/* Create Form Dialog */}
        {currentProductType && isCreateFormOpen && (
          <Dialog open={isCreateFormOpen} onOpenChange={() => setIsCreateFormOpen(false)}>
            <DialogContent className="max-w-4xl">
              <DialogHeader>
                <DialogTitle>
                  {currentProductType === "medical-device" && "Créer un Appareil"}
                  {currentProductType === "accessory" && "Créer un Accessoire"}
                  {currentProductType === "spare-part" && "Créer une Pièce"}
                  {currentProductType === "diagnostic" && "Créer un Diagnostic"}
                </DialogTitle>
              </DialogHeader>
              <div className="py-4">
                {currentProductType === "medical-device" && (
                  <MedicalDeviceForm
                    onSubmit={(data) => {
                      handleProductSelect({ ...data, type: "MEDICAL_DEVICE" });
                      setIsCreateFormOpen(false);
                    }}
                    stockLocations={stockLocations || []}
                  />
                )}
                {currentProductType === "accessory" && (
                  <AccessoryForm
                    onSubmit={ (data) => {
                       handleProductSelect({ ...data, type: "ACCESSORY" });
                      setIsCreateFormOpen(false);
                    }}
                    stockLocations={stockLocations || []}
                  />
                )}
                {currentProductType === "spare-part" && (
                  <SparePartForm
                    onSubmit={(data) => {
                      handleProductSelect({ ...data, type: "SPARE_PART" });
                      setIsCreateFormOpen(false);
                    }}
                    stockLocations={stockLocations || []}
                  />
                )}
                {currentProductType === "diagnostic" && (
                  <DiagnosticDeviceForm
                    onSubmit={async (data) => {
                      await handleProductSelect({ ...data, type: "DIAGNOSTIC_DEVICE" });
                      setIsCreateFormOpen(false);
                    }}
                    stockLocations={stockLocations || []}
                  />
                )}
              </div>
            </DialogContent>
          </Dialog>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default SaleStepperDialog;
