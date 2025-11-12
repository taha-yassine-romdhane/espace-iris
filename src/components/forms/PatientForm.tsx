import React, { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { BeneficiaryType } from '@prisma/client';
import { z } from 'zod';
import { Resolver, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

// Import custom components
import PersonalInfoBlock from './patientSections/PersonalInfoBlock';
import InsuranceDetailsBlock from './patientSections/InsuranceDetailsBlock';
import BiometricsBlock from './patientSections/BiometricsBlock';
import AdditionalInfoBlock from './patientSections/AdditionalInfoBlock';
import ResponsiblePersonBlock from './patientSections/ResponsiblePersonBlock';
import FileUpload from './components/FileUpload';
import { Doctor } from '@/types/models/Doctor';
import { Technician } from '@/types/models/Technician';
import { PatientFormProps } from '@/types/forms/PatientFormProps';
import { PatientFormData, ExistingFile } from '@/types/forms/PatientFormData';
import { Patient } from '@/types';

// Tunisian validation patterns
const TUNISIAN_PHONE_REGEX = /^(\+216|216)?[2-9]\d{7}$/;
const TUNISIAN_CIN_REGEX = /^\d{8}$/;

// Create validation schema with Tunisian-specific rules
const formSchema = z.object({
  // Required fields with validation
  nomComplet: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
  telephonePrincipale: z.string()
    .min(8, "Le numéro doit contenir au moins 8 chiffres")
    .regex(TUNISIAN_PHONE_REGEX, "Format invalide. Utilisez le format tunisien (+216xxxxxxxx ou 216xxxxxxxx)"),
  
  // Optional fields with specific validations
  telephoneSecondaire: z.string()
    .optional()
    .refine((val) => !val || val === '' || TUNISIAN_PHONE_REGEX.test(val), {
      message: "Format invalide. Utilisez le format tunisien (+216xxxxxxxx ou 216xxxxxxxx)"
    }),
  governorate: z.string().optional(),
  delegation: z.string().optional(),
  detailedAddress: z.string().optional(),
  longitude: z.number().optional(),
  latitude: z.number().optional(),
  cin: z.string()
    .optional()
    .refine((val) => !val || val === '' || TUNISIAN_CIN_REGEX.test(val), {
      message: "Le CIN doit contenir exactement 8 chiffres"
    }),
  identifiantCNAM: z.string().optional(),
  technicienResponsable: z.string().optional(),
  superviseur: z.string().optional(),
  antecedant: z.string().optional(),
  taille: z.string()
    .optional()
    .refine((val) => !val || val === '' || (!isNaN(Number(val)) && Number(val) > 0 && Number(val) < 300), {
      message: "La taille doit être un nombre valide entre 1 et 300 cm"
    }),
  poids: z.string()
    .optional()
    .refine((val) => !val || val === '' || (!isNaN(Number(val)) && Number(val) > 0 && Number(val) < 500), {
      message: "Le poids doit être un nombre valide entre 1 et 500 kg"
    }),
  medecin: z.string().optional(),
  dateNaissance: z.string().optional(),
  beneficiaire: z.nativeEnum(BeneficiaryType).nullable().optional(),
  caisseAffiliation: z.enum(['CNSS', 'CNRPS']).optional(),
  cnam: z.boolean().optional(),
  generalNote: z.string().optional(),
  
  // File fields (keeping as-is per instructions)
  files: z.any().optional(),
  existingFiles: z.any().optional(),
  
  // Address coordinates field
  addressCoordinates: z.string().optional(),
  
  // Allow any additional fields
}).passthrough(); // Allow additional properties

// Use a simple type alias for our form values


export default function PatientForm({ formData, onInputChange, onFileChange, onBack, onNext, onError }: PatientFormProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [files, setFiles] = useState<File[]>(formData.files || []);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [existingFiles, setExistingFiles] = useState<ExistingFile[]>(
    (formData.existingFiles as ExistingFile[]) || []
  );
  const formInitializedRef = React.useRef(false);

  // Debug log for form data
  useEffect(() => {
    console.log('PatientForm received formData:', formData);
  }, [formData]);

  // Initialize files from formData and maintain persistence
  useEffect(() => {
    if (formData.files && formData.files.length > 0) {
      setFiles(formData.files);
      // Also set in form
      form?.setValue?.('files', formData.files);
    }
  }, [formData.files ]);

  // Initialize existing files from formData and maintain persistence
  useEffect(() => {
    if (formData.existingFiles && formData.existingFiles.length > 0) {
      setExistingFiles(formData.existingFiles);
      // Also set in form
      form?.setValue?.('existingFiles', formData.existingFiles);
    }
  }, [formData.existingFiles]);

  const form = useForm({
    resolver: zodResolver(formSchema) as unknown as Resolver<PatientFormData>, // Type assertion to avoid resolver type errors
    defaultValues: {
      nomComplet: formData.nomComplet || '',
      telephonePrincipale: formData.telephonePrincipale || '',
      telephoneSecondaire: formData.telephoneSecondaire || '',
      governorate: (formData as any).governorate || '',
      delegation: (formData as any).delegation || '',
      detailedAddress: ( formData as any ).detailedAddress || '',
      longitude: (formData as any).longitude || undefined,
      latitude: (formData as any).latitude || undefined,
      cin: formData.cin || '',
      identifiantCNAM: formData.identifiantCNAM || '',
      technicienResponsable: formData.technicienResponsable || '',
      superviseur: (formData as any).superviseur || '',
      antecedant: formData.antecedant || '',
      taille: formData.taille || '',
      poids: formData.poids || '',
      medecin: formData.medecin || '',
      addressCoordinates: (formData as any).addressCoordinates || '',
      dateNaissance: formData.dateNaissance || '',
      beneficiaire: formData.beneficiaire,
      caisseAffiliation: formData.caisseAffiliation,
      cnam: formData.cnam || false,
      generalNote: (formData as any).generalNote || '',
      files: formData.files || [],
      existingFiles: formData.existingFiles || []
    }
  });

  useEffect(() => {
    // Only initialize form once
    if (formData && !formInitializedRef.current) {
      console.log('Initializing form with default values:', formData);
      formInitializedRef.current = true;
      
      // Format date if it exists (could be in various formats)
      let formattedDate = formData.dateNaissance || '';
      if (formattedDate) {
        // Try to parse and format the date
        try {
          // Handle string format
          if (typeof formattedDate === 'string') {
            // Check if it's already in YYYY-MM-DD format
            if (!/^\d{4}-\d{2}-\d{2}$/.test(formattedDate)) {
              const date = new Date(formattedDate);
              if (!isNaN(date.getTime())) {
                formattedDate = date.toISOString().split('T')[0];
              }
            }
          }
        } catch (error) {
          console.error('Error formatting date:', error);
        }
      }
      
      // Set all form values
      Object.entries(formData).forEach(([key, value]) => {
        if (key === 'dateNaissance') {
          form.setValue('dateNaissance', formattedDate);
        } else if (value !== undefined && value !== null) {
          // Use type assertion to handle the dynamic key
          form.setValue(key as string, value);
        }
      });
    }
  }, [formData, form]);

  useEffect(() => {
    fetchTechnicians();
    fetchDoctors();
  }, []);

  const fetchTechnicians = async () => {
    try {
      const response = await fetch('/api/users/technicians');
      if (!response.ok) throw new Error('Failed to fetch technicians');
      const data = await response.json();
      setTechnicians(data);
    } catch (error) {
      console.error('Error fetching technicians:', error);
      toast({
        title: "Error",
        description: "Failed to fetch technicians",
        variant: "destructive",
      });
    }
  };

  const fetchDoctors = async () => {
    try {
      const response = await fetch('/api/users/doctors');
      if (!response.ok) throw new Error('Failed to fetch doctors');
      const data = await response.json();
      setDoctors(data);
    } catch (error) {
      console.error('Error fetching doctors:', error);
      toast({
        title: "Error",
        description: "Failed to fetch doctors",
        variant: "destructive",
      });
    }
  };
  const handleRemoveFile = (fileUrl: string) => {
    // Remove from existing files
    const updatedExistingFiles = formData.existingFiles?.filter(file => file.url !== fileUrl) || [];
    setExistingFiles(updatedExistingFiles);

    // Always store as array in form state
    form.setValue('existingFiles', updatedExistingFiles);

    // Update parent component
    onInputChange({
      target: {
        name: 'existingFiles',
        value: updatedExistingFiles
      }
    } as unknown as React.ChangeEvent<HTMLInputElement>);
  };

  // Handle patient selection from search
  const handlePatientSelect = (patient: Patient) => {
    console.log('Patient selected:', patient);
    
    // Handle files if they exist
    if (patient.files && Array.isArray(patient.files) && patient.files.length > 0) {
      try {
        const mappedFiles: ExistingFile[] = patient.files.map((file: ExistingFile) => ({
          url: file.url || '',
          type: file.type || 'application/octet-stream',
          name: file.name || 'file',
          id: file.id || undefined
        }));
        setExistingFiles(mappedFiles);
        form.setValue('existingFiles', mappedFiles);
      } catch (err) {
        console.error('Error mapping files:', err);
      }
    }
    
    // Update doctor field if it exists
    if (patient.doctorId) {
      form.setValue('medecin', patient.doctorId);
    }
    
    // Update technician field if it exists
    if (patient.technicianId) {
      form.setValue('technicienResponsable', patient.technicianId);
    }
    
    // Update supervisor field if it exists
    if ((patient as any).supervisorId) {
      form.setValue('superviseur', (patient as any).supervisorId);
    }
    
    // Set basic patient information
    form.setValue('nomComplet', `${patient.firstName} ${patient.lastName}`);
    form.setValue('telephonePrincipale', patient.telephone);
    if (patient.telephoneTwo) form.setValue('telephoneSecondaire', patient.telephoneTwo);
    if (patient.address) form.setValue('adresseComplete', patient.address);
    if (patient.addressCoordinates) form.setValue('adresseCoordinates', JSON.stringify(patient.addressCoordinates));
    if (patient.cin) form.setValue('cin', patient.cin);
    if (patient.dateOfBirth) form.setValue('dateNaissance', patient.dateOfBirth.toISOString().split('T')[0]);
    
    // Set medical information
    if (patient.antecedant) form.setValue('antecedant', patient.antecedant);
    if (patient.weight) form.setValue('poids', patient.weight.toString());
    if (patient.height) form.setValue('taille', patient.height.toString());
    
    // Set insurance information
    if (patient.cnamId) {
      form.setValue('cnam', true);
      form.setValue('identifiantCNAM', patient.cnamId);
    }
    if (patient.beneficiaryType) form.setValue('beneficiaire', patient.beneficiaryType);
    if (patient.affiliation) form.setValue('caisseAffiliation', patient.affiliation);
    
    // Set general note field
    if ((patient as any).generalNote) form.setValue('generalNote', (patient as any).generalNote);
    
    // Ensure all form values are reflected in the UI
    // This forces a re-render of all form fields with the new values
    Object.keys(form.getValues()).forEach(key => {
      const value = form.getValues(key as string);
      if (value !== undefined) {
        form.setValue(key as string, value);
      }
    });
    
    // Show a toast notification that patient data was loaded
    toast({
      title: "Patient existant sélectionné",
      description: `Les données du patient ${patient.firstName} ${patient.lastName} ont été chargées`,
      variant: "default",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Explicitly handle file data before form validation
    console.log('Files before form submission:', existingFiles);
    if (existingFiles && existingFiles.length > 0) {
      form.setValue('existingFiles', existingFiles);
      console.log('Set existingFiles in form:', JSON.stringify(existingFiles));
    } else {
      form.setValue('existingFiles', []);
      console.log('Set empty existingFiles in form');
    }
    
    // Clear any previous validation errors
    setValidationErrors({});
    
    // Trigger validation manually
    await form.trigger();
    
    // Check for validation errors
    if (Object.keys(form.formState.errors).length > 0) {
      console.log('Form validation errors:', form.formState.errors);
      
      // Filter out beneficiaire errors if CNAM is disabled
      const filteredErrors = Object.entries(form.formState.errors).filter(([field]) => {
        if (field === 'beneficiaire' && !form.getValues('cnam')) {
          return false; // Skip beneficiaire errors when CNAM is disabled
        }
        return true;
      });
      
      if (filteredErrors.length > 0) {
        // Show toast with validation errors
        const errorMessages = filteredErrors
          .map(([field, error]) => `${field}: ${error?.message || 'Champ invalide'}`)
          .join('\n');
        
        toast({
          title: "Erreur de validation",
          description: errorMessages || "Veuillez vérifier les champs du formulaire",
          variant: "destructive",
        });
        
        return;
      }
    }

    try {
      setIsLoading(true);
      
      // Get current form values
      const formValues = form.getValues();
      console.log('Form values before submission:', formValues);
      
      // Update all form values in parent component
      Object.entries(formValues).forEach(([key, value]) => {
        if (key !== 'files' && key !== 'existingFiles') {
          console.log(`Updating parent with: ${key} = ${value}`);
          // Create a synthetic event
          const syntheticEvent = {
            target: {
              name: key,
              value: value
            }
          };
          // Call the parent's onInputChange with our synthetic event
          onInputChange(syntheticEvent as unknown as React.ChangeEvent<HTMLInputElement>);
        }
      });
      
      // Handle files separately
      if (files.length > 0) {
        console.log(`Updating parent with ${files.length} files`);
        onFileChange(files);
      }
      
      // Small delay to ensure state updates are processed
      setTimeout(async () => {
        try {
          // Proceed to next step
          await onNext();
        } catch (error: unknown) {
          // Handle API errors, especially unique constraint violations
          console.error('Error during form submission:', error);
          
          if (error instanceof Error && error instanceof Response) {
            const errorData = await error.json();
            
            if (error.status === 409) {
              // Handle unique constraint violations
              if (errorData.field === 'telephonePrincipale') {
                setValidationErrors({
                  telephonePrincipale: errorData.message || 'Ce numéro de téléphone est déjà utilisé par un autre patient'
                });
                
                form.setError('telephonePrincipale', {
                  type: 'manual',
                  message: errorData.message || 'Ce numéro de téléphone est déjà utilisé par un autre patient'
                });
                
                toast({
                  title: "Erreur de duplication",
                  description: errorData.message || 'Ce numéro de téléphone est déjà utilisé par un autre patient',
                  variant: "destructive",
                });
                
                // If we have an existing patient ID, we could suggest linking to that patient
                if (errorData.patientId) {
                  // This could be handled by the parent through the onError callback
                  if (onError) {
                    onError(errorData);
                  }
                }
              } else if (errorData.field === 'cin') {
                setValidationErrors({
                  cin: errorData.message || 'Ce numéro CIN est déjà utilisé par un autre patient'
                });
                
                form.setError('cin', {
                  type: 'manual',
                  message: errorData.message || 'Ce numéro CIN est déjà utilisé par un autre patient'
                });
                
                toast({
                  title: "Erreur de duplication",
                  description: errorData.message || 'Ce numéro CIN est déjà utilisé par un autre patient',
                  variant: "destructive",
                });
              } else {
                toast({
                  title: "Erreur de duplication",
                  description: errorData.message || 'Une valeur unique est déjà utilisée par un autre patient',
                  variant: "destructive",
                });
              }
            } else {
              // Handle other error types
              toast({
                title: "Erreur",
                description: errorData.error || "Erreur lors de la soumission du formulaire",
                variant: "destructive",
              });
            }
          } else {
            toast({
              title: "Erreur",
              description: "Erreur lors de la soumission du formulaire",
              variant: "destructive",
            });
          }
          
          // Pass the error to the parent component if callback exists
          if (onError) {
            onError(error as Error);
          }
        } finally {
          setIsLoading(false);
        }
      }, 100);
    } catch (error) {
      console.error('Error submitting form:', error);
      toast({
        title: "Error",
        description: "Failed to submit form",
        variant: "destructive",
      });
      setIsLoading(false);
      
      // Pass the error to the parent component if callback exists
      if (onError) {
        onError(error as Error);
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Hidden inputs to pass files data - multiple approaches for reliability */}
      <input 
        type="hidden" 
        name="existingFilesData" 
        value={JSON.stringify(existingFiles)} 
      />
      <input 
        type="hidden" 
        name="existingFiles" 
        value={JSON.stringify(existingFiles)} 
      />
      {/* Backup field */}
      <input 
        type="hidden" 
        name="_uploadedFiles" 
        value={JSON.stringify(existingFiles)} 
      />
      <div className="bg-white rounded-lg">
        <div className="p-5">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-6">
              <PersonalInfoBlock 
                form={form} 
                onInputChange={onInputChange} 
                validationErrors={validationErrors}
                onPatientSelect={handlePatientSelect}
              />
                <InsuranceDetailsBlock 
                form={form} 
                onInputChange={onInputChange} 
              />
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              <AdditionalInfoBlock 
                form={form} 
                onInputChange={onInputChange} 
              />
              
            
              
              <ResponsiblePersonBlock 
                form={form} 
                doctors={doctors} 
                technicians={technicians} 
                onInputChange={onInputChange}
              />
              
              <BiometricsBlock 
                form={form} 
                onInputChange={onInputChange} 
              />

              {/* File Upload Section */}
              <FileUpload 
                form={form} 
                existingFiles={existingFiles as any}
                onFileChange={setExistingFiles}
                onRemoveExistingFile={handleRemoveFile}
                maxFiles={10}
                maxFileSize={16}
              />
            </div>
          </div>
        </div>

        <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={onBack}
          >
            Retour
          </Button>
          <Button
            type="submit"
            disabled={isLoading}
          >
            {isLoading ? 
              <div className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Sauvegarde...
              </div>
              : 'Sauvegarder'
            }
          </Button>
        </div>
      </div>
    </form>
  );
}