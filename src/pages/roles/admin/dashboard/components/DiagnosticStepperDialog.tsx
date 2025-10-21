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
  preSelectedPatientId?: string;
  appointmentId?: string;
  scheduledDate?: Date;
}

const steps = [
  { id: 1, name: "Type de Renseignement", description: "Sélectionner le patient" },
  { id: 2, name: "Création Diagnostic", description: "Sélectionner l'équipement et finaliser" },
] as const;

export function DiagnosticStepperDialog({
  isOpen,
  onClose,
  preSelectedPatientId,
  appointmentId,
  scheduledDate
}: DiagnosticStepperDialogProps) {
  const queryClient = useQueryClient();

  // Form for file uploads
  const form = useForm();

  // Step Management - Start at step 2 if patient is pre-selected
  const [currentStep, setCurrentStep] = useState(preSelectedPatientId ? 2 : 1);

  // Patient Selection State (diagnostics are only for patients)
  const [selectedPatient, setSelectedPatient] = useState<string | null>(preSelectedPatientId || null);
  const [patients, setPatients] = useState<[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [manualPatientDetails, setManualPatientDetails] = useState<any>(null);

  // Auto-set result due date to tomorrow if coming from RDV
  const [resultDueDate, setResultDueDate] = useState<Date | undefined>(
    new Date(Date.now() + 24 * 60 * 60 * 1000) // Tomorrow
  );

  // Product Selection State
  const [selectedProducts, setSelectedProducts] = useState<any[]>([]);

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
        diagnosticType: 'IN_CLINIC', // Default to in-clinic
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
        appointmentId: appointmentId || null, // Link to RDV if coming from appointment
        reservationDate: new Date().toISOString(), // Today
        resultDueDate: resultDueDate ? resultDueDate.toISOString() : null,
        followUpDate: followUpDate,
        totalPrice: 0, // Diagnostics are always free
        notes: notes,
        // Include patient information if available
        patientInfo: patientDetails ? {
          name: patientDetails.name || '',
          phone: patientDetails.phone || '',
          email: patientDetails.email || ''
        } : null,
        // Include file URLs (empty for now, files moved to patient page)
        fileUrls: []
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
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-5xl p-0 overflow-hidden" onInteractOutside={(e) => e.preventDefault()}>
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
              <div className="space-y-4">
                {/* Warning if creating diagnostic before scheduled RDV date */}
                {scheduledDate && new Date() < new Date(scheduledDate) && (
                  <Alert className="border-orange-200 bg-orange-50">
                    <AlertCircle className="h-4 w-4 text-orange-600" />
                    <AlertDescription className="text-orange-800">
                      <strong>Attention:</strong> Le rendez-vous est prévu pour le{' '}
                      {new Date(scheduledDate).toLocaleDateString('fr-FR', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                      . Vous créez ce diagnostic avant la date prévue.
                    </AlertDescription>
                  </Alert>
                )}

                <NewDiagnosticProductStep
                  onBack={preSelectedPatientId ? undefined : handleBack}
                  onNext={handleSubmit}
                  selectedProducts={selectedProducts}
                  onRemoveProduct={handleRemoveProduct}
                  onSelectProduct={handleProductSelect}
                  onUpdateProductParameters={() => {}} // Not used for diagnostics
                  patientId={selectedPatient || undefined}
                  resultDueDate={resultDueDate}
                  onResultDueDateChange={setResultDueDate}
                  notes={notes}
                  onNotesChange={setNotes}
                  isLoading={submitting}
                />
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