import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ClientSelectionStep } from "./steps/ClientSelectionStep";
import { NewDiagnosticProductStep } from "./steps/diagnostic/NewDiagnosticProductStep";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { CalendarIcon, AlertCircle, Loader2, PlusCircle, FileUp } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { DiagnosticStepperSidebar } from "./DiagnosticStepperSidebar";
import { AddTaskButton } from "@/components/tasks/AddTaskButton";
import { TaskFormDialog } from "@/components/tasks/TaskFormDialog";
import { useToast } from "@/components/ui/use-toast";
import FileUpload from "@/components/forms/components/FileUpload";
import { useForm } from "react-hook-form";
import { useQueryClient } from "@tanstack/react-query";

interface DiagnosticStepperDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const steps = [
  { id: 1, name: "Type de Renseignement", description: "Sélectionner le patient" },
  { id: 2, name: "Ajout Équipement", description: "Sélectionner ou créer un équipement de diagnostic" },
  { id: 3, name: "Création de Tâches", description: "Ajouter des tâches pour le suivi du diagnostic" },
] as const;

export function DiagnosticStepperDialog({ isOpen, onClose }: DiagnosticStepperDialogProps) {
  const queryClient = useQueryClient();
  
  // Form for file uploads
  const form = useForm();
  
  // Step Management
  const [currentStep, setCurrentStep] = useState(1);

  // Patient Selection State (diagnostics are only for patients)
  const [selectedPatient, setSelectedPatient] = useState<string | null>(null);
  const [patients, setPatients] = useState<[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [manualPatientDetails, setManualPatientDetails] = useState<any>(null);

  // Product Selection State
  const [selectedProducts, setSelectedProducts] = useState<any[]>([]);
  
  // Result Due Date State - for when results are expected
  const [resultDueDate, setResultDueDate] = useState<Date | undefined>(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // Default to 7 days from now
  );

  // Final Step State
  const [followUpDate, setFollowUpDate] = useState<Date | undefined>(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // Default to 7 days from now
  );
  const [notes, setNotes] = useState<string>(""); // Add notes state
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  
  // File upload state management
  const [existingFiles, setExistingFiles] = useState<any[]>([]);
  
  // File upload handlers
  const handleFileChange = (files: any[]) => {
    setExistingFiles(files);
    form.setValue('existingFiles', files);
  };

  const handleRemoveFile = (fileUrl: string) => {
    const updatedFiles = existingFiles.filter(file => file.url !== fileUrl);
    setExistingFiles(updatedFiles);
    form.setValue('existingFiles', updatedFiles);
  };
  


  // Fetch patient details when a patient is selected
  const { data: fetchedPatientDetails, refetch: refetchPatientDetails } = useQuery({
    queryKey: ["patient-details", selectedPatient],
    queryFn: async () => {
      if (!selectedPatient) return null;
      const response = await fetch(`/api/renseignements/patients/${selectedPatient}`);
      if (!response.ok) {
        throw new Error("Failed to fetch patient details");
      }
      return response.json();
    },
    enabled: !!selectedPatient && !manualPatientDetails,
  });
  
  // Use manual details if available, otherwise use fetched details
  const patientDetails = manualPatientDetails || fetchedPatientDetails;

  // Patient Selection Handlers
  const fetchPatients = async () => {
    setError(null);
    try {
      const response = await fetch('/api/renseignements/patients');
      if (!response.ok) {
        throw new Error("Failed to fetch patients");
      }
      const data = await response.json();
      setPatients(data);
    } catch (error) {
      console.error("Error fetching patients:", error);
      setError("Erreur lors du chargement des patients");
      setPatients([]);
    }
  };

  // Auto-fetch patients when dialog opens
  useEffect(() => {
    if (isOpen) {
      fetchPatients();
    }
  }, [isOpen]);

  // Product Selection Handlers
  const handleProductSelect = (product: any) => {
    // Replace the entire array with just the new product (only one device allowed)
    setSelectedProducts([product]);
  };

  const handleRemoveProduct = (index: number) => {
    setSelectedProducts((prev) => prev.filter((_, i) => i !== index));
  };


  // Create diagnostic record mutation
  const { mutate: createDiagnostic } = useMutation({
    mutationFn: async (diagnosticData: any) => {
      if (!diagnosticData.clientId || diagnosticData.products.length === 0) {
        throw new Error("Client and products are required");
      }

      console.log('Submitting diagnostic data:', diagnosticData);

      // Send JSON data instead of FormData for better handling of complex objects
      const response = await fetch("/api/diagnostics", {
        method: "POST",
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          clientId: diagnosticData.clientId,
          clientType: diagnosticData.clientType,
          // Important: Pass the medical device ID directly
          medicalDeviceId: diagnosticData.medicalDeviceId,
          products: diagnosticData.products,
          followUpDate: diagnosticData.followUpDate ? diagnosticData.followUpDate.toISOString() : null,
          totalPrice: diagnosticData.totalPrice,
          patientInfo: diagnosticData.patientInfo,
          notes: diagnosticData.notes,
          fileUrls: diagnosticData.fileUrls
        }),
      });

      // Clone the response so we can read the body twice if needed
      const responseClone = response.clone();

      try {
        // Try to parse the response as JSON
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || "Failed to create diagnostic record");
        }
        
        return data;
      } catch (error) {
        // If JSON parsing fails, try to get the text
        const textResponse = await responseClone.text();
        console.error('Error response:', textResponse);
        
        if (!response.ok) {
          throw new Error("Failed to create diagnostic record");
        }
        
        return { success: response.ok };
      }
    },
    onSuccess: async (data) => {
      console.log('Diagnostic created successfully:', data);
      
      // Invalidate relevant queries to refresh the diagnostics table
      await queryClient.invalidateQueries({
        queryKey: ["diagnostics"]
      });
      
      // Also invalidate any dashboard-related queries
      await queryClient.invalidateQueries({
        queryKey: ["dashboard"]
      });
      
      setSubmitting(false);
      // Close the dialog
      onClose();
    },
    onError: (error: Error) => {
      console.error('Error creating diagnostic:', error);
      setSubmitError(error.message || "Une erreur est survenue lors de la création du diagnostic");
      setSubmitting(false);
    }
  });

  // Navigation Handlers
  const handleNext = () => {
    setCurrentStep((prev) => Math.min(prev + 1, steps.length));
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleClose = () => {
    setCurrentStep(1);
    setSelectedPatient(null);
    setPatients([]);
    setError(null);
    setSelectedProducts([]);
    setFollowUpDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
    setSubmitError(null);
    setExistingFiles([]);
    setManualPatientDetails(null);
    onClose();
  };

  // Diagnostics are always free
  const calculateTotalPrice = () => {
    return "0.00";
  };




  // Handle form submission
  const handleSubmit = async () => {
    setSubmitting(true);
    setSubmitError(null);
    
    // Validate required fields
    if (!selectedPatient) {
      setSubmitError("Veuillez sélectionner un patient");
      setSubmitting(false);
      return;
    }
    
    if (selectedProducts.length === 0) {
      setSubmitError("Veuillez sélectionner au moins un équipement");
      setSubmitting(false);
      return;
    }
    
    try {
      // Get uploaded file URLs from the existingFiles state
      const uploadedFileUrls = existingFiles.map(file => file.url);
      
      // Prepare data for submission
      // Make sure we have at least one selected product for the diagnostic
      if (selectedProducts.length === 0) {
        setSubmitError("Veuillez sélectionner au moins un équipement de diagnostic");
        setSubmitting(false);
        return;
      }

      // Use the first selected product as the medical device for the diagnostic
      // This is important because the Prisma schema expects a single medicalDeviceId
      const selectedDevice = selectedProducts[0];
      
      const diagnosticData = {
        clientId: selectedPatient,
        clientType: 'patient', // Always patient for diagnostics
        // Important: Pass the medical device ID directly instead of in a products array
        medicalDeviceId: selectedDevice.id,
        // Still keep the products array for any additional information
        products: selectedProducts.map(product => {
          return {
            id: product.id,
            resultDueDate: resultDueDate ? resultDueDate.toISOString() : null,
            type: product.type,
            name: product.name,
            sellingPrice: 0 // Diagnostics are free
          };
        }),
        followUpDate: followUpDate,
        totalPrice: 0, // Diagnostics are always free
        notes: notes,
        // Include patient information if available
        patientInfo: patientDetails ? {
          name: patientDetails.name || '',
          phone: patientDetails.phone || '',
          email: patientDetails.email || ''
        } : null,
        // Include file URLs if any were uploaded
        fileUrls: uploadedFileUrls
      };
      
      // Submit the data
      createDiagnostic(diagnosticData);
    } catch (error) {
      console.error('Error during submission:', error);
      setSubmitError("Une erreur est survenue lors de la création du diagnostic");
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-5xl p-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle>Nouveau Diagnostic</DialogTitle>
        </DialogHeader>

        <div className="flex h-[80vh]">
          <DiagnosticStepperSidebar 
            steps={steps}
            currentStep={currentStep}
            clientDetails={patientDetails}
            totalPrice={undefined} // Remove price display for free diagnostics
          />

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {currentStep === 1 && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-[#1e3a8a]">Sélection du Patient</h2>
                <p className="text-gray-600">Les diagnostics sont uniquement disponibles pour les patients.</p>
                
                <ClientSelectionStep
                  onNext={handleNext}
                  onClose={handleClose}
                  onClientTypeChange={() => {}} // Not used anymore
                  onClientSelect={(clientId) => {
                    setSelectedPatient(clientId);
                    // Clear manual details when selecting a different patient
                    setManualPatientDetails(null);
                  }}
                  onClientAdd={(newClient) => {
                    // When a new patient is created, we need to set their details manually
                    // until the API can fetch them
                    if (newClient && newClient.id) {
                      setSelectedPatient(newClient.id);
                      
                      // Use the patient details directly from the newClient object
                      setManualPatientDetails({
                        id: newClient.id,
                        firstName: newClient.firstName || '',
                        lastName: newClient.lastName || '',
                        telephone: newClient.telephone || '',
                        address: newClient.address || '',
                        dateOfBirth: newClient.dateOfBirth || '',
                        cin: newClient.cin || '',
                        // Add other fields as needed for PatientInfoCard
                      });
                      
                      // Trigger a refetch after a short delay to get full details
                      setTimeout(() => {
                        refetchPatientDetails();
                        setManualPatientDetails(null);
                      }, 2000);
                    }
                  }}
                  clientType="patient" // Always patient
                  selectedClient={selectedPatient}
                  action="diagnostique"
                />
              </div>
            )}

            {currentStep === 2 && (
              <NewDiagnosticProductStep
                onBack={handleBack}
                onNext={handleNext}
                selectedProducts={selectedProducts}
                onRemoveProduct={handleRemoveProduct}
                onSelectProduct={handleProductSelect}
                onUpdateProductParameters={() => {}} // Not used for diagnostics
                patientId={selectedPatient || undefined}
                resultDueDate={resultDueDate}
                onResultDueDateChange={setResultDueDate}
              />
            )}

            {currentStep === 3 && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-[#1e3a8a]">Finaliser le Diagnostic</h2>
                
                {/* Summary of selected products */}
                <div className="bg-blue-50 rounded-lg border border-blue-100 p-4 space-y-3">
                  <h4 className="font-medium text-[#1e3a8a]">Récapitulatif du Diagnostic</h4>
                  
                  <div className="space-y-2">
                    {selectedProducts.map((product, index) => (
                      <div key={index} className="flex justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{product.name}</span>
                          {product.resultDueDate && (
                            <div className="text-sm text-gray-600">
                              Résultats attendus le: {new Date(product.resultDueDate).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                        <span className="text-green-600 font-medium">Gratuit</span>
                      </div>
                    ))}
                  </div>
                  
                  <div className="pt-2 border-t border-blue-200 flex justify-between font-medium">
                    <span>Total</span>
                    <span>{calculateTotalPrice()} DT</span>
                  </div>
                </div>
                
                {/* Notes Section */}
                <div className="mt-6">
                  <div className="p-6 border border-gray-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-4">
                      <AlertCircle className="h-5 w-5 text-blue-600" />
                      <h3 className="font-medium text-lg">Notes</h3>
                    </div>
                    <p className="text-sm text-gray-600 mb-4">
                      Ajoutez des notes ou commentaires concernant ce diagnostic.
                    </p>
                    <textarea
                      className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows={4}
                      placeholder="Saisissez vos notes ici..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                  </div>
                </div>
                
                {/* File Upload Section */}
                <div className="mt-6">
                  <div className="p-6 border border-gray-200 rounded-lg">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <FileUp className="h-5 w-5 text-blue-600" />
                        <h3 className="font-medium text-lg">Documents du Patient</h3>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mb-4">
                      Ajoutez des documents liés à ce diagnostic. Les documents seront automatiquement associés au patient.
                    </p>
                    
                    {selectedPatient ? (
                      <>
                        <FileUpload
                          form={form}
                          existingFiles={existingFiles}
                          onFileChange={handleFileChange}
                          onRemoveExistingFile={handleRemoveFile}
                          className="w-full"
                          maxFiles={5}
                        />
                        <div className="mt-4 text-sm text-gray-600">
                          <p>Les fichiers seront automatiquement associés au diagnostic et au patient lors de la soumission.</p>
                        </div>
                      </>
                    ) : (
                      <div className="bg-yellow-50 p-4 rounded-md border border-yellow-100">
                        <p className="text-sm text-yellow-700">Vous devez sélectionner un patient pour ajouter des documents.</p>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Task Creation Section */}
                <div className="mt-6">
                  <div className="p-6 border border-gray-200 rounded-lg">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <PlusCircle className="h-5 w-5 text-blue-600" />
                        <h3 className="font-medium text-lg">Tâches de Suivi</h3>
                      </div>
                      <AddTaskButton 
                        onClick={() => setIsTaskModalOpen(true)} 
                        variant="outline"
                        label="Créer une tâche"
                      />
                    </div>
                    <p className="text-sm text-gray-600 mb-4">
                      Créez des tâches associées à ce diagnostic pour suivre les actions à réaliser. 
                      Les tâches seront automatiquement associées au patient et apparaîtront dans votre calendrier.
                    </p>
                    <div className="bg-blue-50 p-4 rounded-md border border-blue-100">
                      <div className="flex items-center gap-2 text-blue-700">
                        <CalendarIcon className="h-4 w-4" />
                        <p className="text-sm font-medium">Conseil: Utilisez les tâches pour planifier les rendez-vous de suivi et les rappels pour les résultats.</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                {submitError && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{submitError}</AlertDescription>
                  </Alert>
                )}
                
                <div className="flex justify-between pt-6 border-t">
                  <Button variant="outline" onClick={handleBack}>
                    ← Retour
                  </Button>
                  <Button 
                    onClick={handleSubmit} 
                    disabled={submitting}
                    className="bg-[#1e3a8a] hover:bg-[#1e3a8a]/90"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Traitement...
                      </>
                    ) : (
                      "Terminer"
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
      <DiagnosticTaskFormDialog 
        isOpen={isTaskModalOpen} 
        onClose={() => setIsTaskModalOpen(false)}
        patientId={selectedPatient || undefined} 
        followUpDate={followUpDate} 
      />
    </Dialog>
  );
}

export function DiagnosticTaskFormDialog({ isOpen, onClose, patientId, followUpDate }: { isOpen: boolean, onClose: () => void, patientId?: string, followUpDate?: Date }) {
  const { toast } = useToast();

  return (
    <TaskFormDialog
      open={isOpen}
      onClose={onClose}
      onSubmit={async (data) => {
        try {
          // Add patient ID if available
          if (patientId) {
            data.patientId = patientId;
          }
          
          // Call your API to create the task
          const response = await fetch('/api/tasks', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
          });
          
          if (!response.ok) {
            throw new Error('Failed to create task');
          }
          
          toast({
            title: "Succès",
            description: "La tâche a été créée avec succès",
          });
          
          // Close the dialog after successful task creation
          onClose();
          
        } catch (error) {
          console.error('Error creating task:', error);
          toast({
            title: "Erreur",
            description: "Impossible de créer la tâche",
            variant: "destructive",
          });
        }
      }}
      initialDate={followUpDate}
      preselectedPatientId={patientId || ''}
    />
  );
}

export default DiagnosticStepperDialog;