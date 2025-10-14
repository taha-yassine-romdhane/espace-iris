import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ClientSelectionStep } from "./steps/ClientSelectionStep";
import { NewDiagnosticProductStep } from "./steps/diagnostic/NewDiagnosticProductStep";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { CalendarIcon, AlertCircle, Loader2, PlusCircle, FileUp, Clock } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { DiagnosticStepperSidebar } from "./DiagnosticStepperSidebar";
import { AddTaskButton } from "@/components/tasks/AddTaskButton";
import { useToast } from "@/components/ui/use-toast";
import FileUpload from "@/components/forms/components/FileUpload";
import { useForm } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

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
  const { toast } = useToast();
  
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
      // Fetch only patients assigned to this employee
      const response = await fetch('/api/renseignements/patients?assignedToMe=true');
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

  // Handle updating product parameters
  const handleUpdateProductParameters = (productIndex: number, parameters: any) => {
    // In the new approach, we don't update parameters directly
    // This function is kept for compatibility but may not be needed anymore
    console.log('Product parameters update called, but using simplified approach now');
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
                <h2 className="text-xl font-semibold text-green-600">Sélection du Patient</h2>
                <p className="text-gray-600">Les diagnostics sont uniquement disponibles pour les patients assignés à vous.</p>
                
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
                <h2 className="text-xl font-semibold text-green-600">Finaliser le Diagnostic</h2>
                
                {/* Summary of selected products */}
                <div className="bg-green-50 rounded-lg border border-green-100 p-4 space-y-3">
                  <h4 className="font-medium text-green-600">Récapitulatif du Diagnostic</h4>
                  
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
                  
                  <div className="pt-2 border-t border-green-200 flex justify-between font-medium">
                    <span>Total</span>
                    <span>{calculateTotalPrice()} DT</span>
                  </div>
                </div>
                
                {/* Notes Section */}
                <div className="mt-6">
                  <div className="p-6 border border-gray-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-4">
                      <AlertCircle className="h-5 w-5 text-green-600" />
                      <h3 className="font-medium text-lg">Notes</h3>
                    </div>
                    <p className="text-sm text-gray-600 mb-4">
                      Ajoutez des notes ou commentaires concernant ce diagnostic.
                    </p>
                    <textarea
                      className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
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
                        <FileUp className="h-5 w-5 text-green-600" />
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
                        <PlusCircle className="h-5 w-5 text-green-600" />
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
                    <div className="bg-green-50 p-4 rounded-md border border-green-100">
                      <div className="flex items-center gap-2 text-green-700">
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
                    className="bg-green-600 hover:bg-green-700"
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

// Employee-specific Task Form Dialog with proper patient filtering
import { TaskFormDialog as BaseTaskFormDialog, TaskFormData } from "@/components/tasks/TaskFormDialog";

export function DiagnosticTaskFormDialog({ isOpen, onClose, patientId, followUpDate }: { isOpen: boolean, onClose: () => void, patientId?: string, followUpDate?: Date }) {
  const { toast } = useToast();
  
  // Get current user session for auto-assignment
  const { data: session } = useQuery({
    queryKey: ['session'],
    queryFn: async () => {
      const response = await fetch('/api/auth/session');
      if (!response.ok) throw new Error('Failed to fetch session');
      return response.json();
    }
  });

  return (
    <EmployeeTaskFormDialog
      open={isOpen}
      onClose={onClose}
      onSubmit={async (data) => {
        try {
          // Patient ID is already included in the data from the form
          // No need to add it again since it's preselected
          
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
      preselectedAssigneeId={session?.user?.id} // Pass current user ID
    />
  );
}

// Employee-specific Task Form Dialog component
function EmployeeTaskFormDialog({ 
  open, 
  onClose, 
  onSubmit, 
  task, 
  initialDate,
  preselectedPatientId,
  preselectedAssigneeId
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: TaskFormData) => Promise<void>;
  task?: any;
  initialDate?: Date;
  preselectedPatientId?: string;
  preselectedAssigneeId?: string;
}) {
  const [startDateOpen, setStartDateOpen] = useState(false);
  const [endDateOpen, setEndDateOpen] = useState(false);
  
  // Get current user session FIRST before using it
  const { data: session } = useQuery({
    queryKey: ['session'],
    queryFn: async () => {
      const response = await fetch('/api/auth/session');
      if (!response.ok) throw new Error('Failed to fetch session');
      return response.json();
    }
  });
  
  // Set default dates based on props or current date
  const defaultStartDate = initialDate || new Date();
  const defaultEndDate = initialDate || new Date();
  
  // Format default dates for form
  const formattedStartDate = format(defaultStartDate, 'yyyy-MM-dd');
  const formattedEndDate = format(defaultEndDate, 'yyyy-MM-dd');

  const { register, handleSubmit, setValue, watch, reset, formState: { errors, isSubmitting } } = useForm<TaskFormData>({
    defaultValues: task ? {
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      startDate: format(new Date(task.startDate), 'yyyy-MM-dd'),
      startTime: format(new Date(task.startDate), 'HH:mm'),
      endDate: format(new Date(task.endDate), 'yyyy-MM-dd'),
      endTime: format(new Date(task.endDate), 'HH:mm'),
      assignedToId: task.assignedTo?.id,
      patientId: task.patientId
    } : {
      title: '',
      description: '',
      status: 'TODO',
      priority: 'MEDIUM',
      startDate: formattedStartDate,
      startTime: '09:00',
      endDate: formattedEndDate,
      endTime: '17:00',
      assignedToId: preselectedAssigneeId || '', // Will be set via useEffect when session loads
      patientId: preselectedPatientId // This is already passed from the parent component
    }
  });

  // Auto-assign to current user when session loads
  useEffect(() => {
    if (session?.user?.id && !preselectedAssigneeId && !task) {
      setValue('assignedToId', session.user.id);
    }
  }, [session, setValue, preselectedAssigneeId, task]);

  // Fetch users for assignment - only employees
  const { data: users } = useQuery<any[]>({
    queryKey: ['users-employees'],
    queryFn: async () => {
      const response = await fetch('/api/users');
      if (!response.ok) throw new Error('Failed to fetch users');
      const allUsers = await response.json();
      // Filter to only show employees
      return allUsers.filter((user: any) => user.role === 'EMPLOYEE');
    }
  });

  // Fetch ONLY ASSIGNED patients for employees
  const { data: patients } = useQuery({
    queryKey: ['patients-assigned'],
    queryFn: async () => {
      // Use the same endpoint with assignedToMe parameter to get only assigned patients
      const response = await fetch('/api/renseignements/patients?assignedToMe=true');
      if (!response.ok) throw new Error('Failed to fetch patients');
      const data = await response.json();
      // Transform the data to match expected format
      return data.map((patient: any) => ({
        id: patient.id,
        name: `${patient.firstName} ${patient.lastName}`
      }));
    },
    enabled: open // Only fetch when dialog is open
  });

  const handleFormSubmit = async (data: TaskFormData) => {
    try {
      const startDateTime = new Date(`${data.startDate}T${data.startTime}`);
      const endDateTime = new Date(`${data.endDate}T${data.endTime}`);
      
      await onSubmit({
        ...data,
        startDate: startDateTime.toISOString(),
        endDate: endDateTime.toISOString()
      });
      
      reset();
      onClose();
    } catch (error) {
      console.error('Error submitting task:', error);
    }
  };

  const watchStartDate = watch('startDate');
  const watchEndDate = watch('endDate');

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) onClose();
    }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-green-600">{task ? 'Modifier la tâche' : 'Nouvelle tâche - Diagnostic'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="title">Titre</Label>
            <Input
              id="title"
              {...register("title", { required: "Le titre est requis" })}
              className="focus:ring-green-500 focus:border-green-500"
            />
            {errors.title && (
              <span className="text-sm text-red-500">{errors.title.message}</span>
            )}
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              {...register("description")}
              placeholder="Description de la tâche..."
              className="focus:ring-green-500 focus:border-green-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Date de début</Label>
              <Popover open={startDateOpen} onOpenChange={setStartDateOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal hover:border-green-500"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4 text-green-600" />
                    {watchStartDate ? format(new Date(watchStartDate), 'PPP', { locale: fr }) : "Sélectionner"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={watchStartDate ? new Date(watchStartDate) : undefined}
                    onSelect={(date) => {
                      if (date) {
                        setValue("startDate", format(date, 'yyyy-MM-dd'));
                        setStartDateOpen(false);
                      }
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <input type="hidden" {...register("startDate", { required: true })} />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="startTime">Heure de début</Label>
              <div className="relative">
                <Clock className="absolute left-3 top-3 h-4 w-4 text-green-600" />
                <Input
                  id="startTime"
                  type="time"
                  className="pl-10 focus:ring-green-500 focus:border-green-500"
                  {...register("startTime", { required: true })}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Date de fin</Label>
              <Popover open={endDateOpen} onOpenChange={setEndDateOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal hover:border-green-500"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4 text-green-600" />
                    {watchEndDate ? format(new Date(watchEndDate), 'PPP', { locale: fr }) : "Sélectionner"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={watchEndDate ? new Date(watchEndDate) : undefined}
                    onSelect={(date) => {
                      if (date) {
                        setValue("endDate", format(date, 'yyyy-MM-dd'));
                        setEndDateOpen(false);
                      }
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <input type="hidden" {...register("endDate", { required: true })} />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="endTime">Heure de fin</Label>
              <div className="relative">
                <Clock className="absolute left-3 top-3 h-4 w-4 text-green-600" />
                <Input
                  id="endTime"
                  type="time"
                  className="pl-10 focus:ring-green-500 focus:border-green-500"
                  {...register("endTime", { required: true })}
                />
              </div>
            </div>
          </div>

          <div>
            <Label htmlFor="status">Statut</Label>
            <Select
              onValueChange={(value) => setValue("status", value as 'TODO' | 'IN_PROGRESS' | 'COMPLETED')}
              defaultValue={task?.status || 'TODO'}
            >
              <SelectTrigger className="focus:ring-green-500">
                <SelectValue placeholder="Sélectionner le statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODO">À faire</SelectItem>
                <SelectItem value="IN_PROGRESS">En cours</SelectItem>
                <SelectItem value="COMPLETED">Terminé</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="priority">Priorité</Label>
            <Select
              onValueChange={(value) => setValue("priority", value as 'LOW' | 'MEDIUM' | 'HIGH')}
              defaultValue={task?.priority || 'MEDIUM'}
            >
              <SelectTrigger className="focus:ring-green-500">
                <SelectValue placeholder="Sélectionner la priorité" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="LOW">Basse</SelectItem>
                <SelectItem value="MEDIUM">Moyenne</SelectItem>
                <SelectItem value="HIGH">Haute</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="assignedToId">Assigné à</Label>
            <Select
              onValueChange={(value) => setValue("assignedToId", value)}
              defaultValue={task?.assignedTo?.id || preselectedAssigneeId || session?.user?.id || ''}
              value={watch('assignedToId')}
            >
              <SelectTrigger className="focus:ring-green-500">
                <SelectValue placeholder="Sélectionner un utilisateur" />
              </SelectTrigger>
              <SelectContent>
                {users?.map((user: any) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.name} {user.id === session?.user?.id ? '(Moi)' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Patient selection - Auto-selected when coming from diagnostic */}
          {preselectedPatientId ? (
            <div>
              <Label htmlFor="patientId">Patient</Label>
              <div className="p-2 bg-green-50 border border-green-200 rounded-md">
                <p className="text-sm text-green-700">
                  Patient sélectionné: {patients?.find((p: any) => p.id === preselectedPatientId)?.name || 'Chargement...'}
                </p>
                <p className="text-xs text-green-600 mt-1">
                  Cette tâche sera automatiquement liée au patient du diagnostic en cours
                </p>
              </div>
            </div>
          ) : (
            patients && (
              <div>
                <Label htmlFor="patientId">Patient (optionnel)</Label>
                <Select
                  onValueChange={(value) => setValue("patientId", value === 'none' ? '' : value)}
                  defaultValue={task?.patientId || 'none'}
                >
                  <SelectTrigger className="focus:ring-green-500">
                    <SelectValue placeholder="Sélectionner un patient" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Aucun patient</SelectItem>
                    {patients.map((patient: any) => (
                      <SelectItem key={patient.id} value={patient.id}>
                        {patient.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" disabled={isSubmitting} className="bg-green-600 hover:bg-green-700">
              {isSubmitting ? 'Chargement...' : task ? 'Mettre à jour' : 'Créer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default DiagnosticStepperDialog;