import React, { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import FileUpload from './components/FileUpload';
import { useToast } from "@/components/ui/use-toast";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin } from 'lucide-react';
import { ExistingFile } from '@/types/forms/PatientFormData';
import { TUNISIA_GOVERNORATES, getDelegationsByGovernorate } from '@/data/tunisia-locations';

interface Technician {
  id: string;
  name: string;
  role: string;
}

// Tunisian validation patterns
const TUNISIAN_PHONE_REGEX = /^(\+216|216)?[2-9]\d{7}$/;
const TUNISIAN_TAX_ID_REGEX = /^\d{7}[A-Z]{3}\d{3}$/; // Tunisian tax ID format: 7 digits + 3 letters + 3 digits

// Define validation schema with Tunisian-specific rules
const formSchema = z.object({
  id: z.string().optional(), // Add ID field for entity identification
  nomSociete: z.string().min(1, "Le nom de la société est requis"),
  telephonePrincipale: z.string()
    .min(8, "Le numéro de téléphone doit contenir au moins 8 chiffres")
    .regex(TUNISIAN_PHONE_REGEX, "Format invalide. Utilisez le format tunisien (+216xxxxxxxx ou 216xxxxxxxx)"),
  governorate: z.string().min(1, "Le gouvernorat est requis"),
  delegation: z.string().min(1, "La délégation est requise"),
  detailedAddress: z.string().optional(),
  telephoneSecondaire: z.string()
    .optional()
    .refine((val) => !val || val === '' || TUNISIAN_PHONE_REGEX.test(val), {
      message: "Format invalide. Utilisez le format tunisien (+216xxxxxxxx ou 216xxxxxxxx)"
    }),
  matriculeFiscale: z.string()
    .optional()
    .refine((val) => !val || val === '' || TUNISIAN_TAX_ID_REGEX.test(val), {
      message: "Matricule fiscal invalide. Format attendu: 1234567ABC123"
    }),
  technicienResponsable: z.string().optional(),
  generalNote: z.string().optional(),
  // Add file fields to the schema (keeping as-is per instructions)
  files: z.any().optional(),
  existingFiles: z.any().optional(),
}).passthrough(); // Allow additional properties

export interface SocieteFormProps {
  formData: {
    nomSociete?: string;
    matriculeFiscale?: string;
    telephonePrincipale?: string;
    telephoneSecondaire?: string;
    governorate?: string;
    delegation?: string;
    detailedAddress?: string;
    technicienResponsable?: string;
    generalNote?: string;
    files?: File[];
    existingFiles?: ExistingFile[];
    id?: string; // Include ID if available for the entity
  };
  onInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  onFileChange: (files: ExistingFile[] | File[]) => void;
  onBack: () => void;
  onNext: () => void;
}

export default function SocieteForm({ formData, onInputChange, onFileChange, onBack, onNext }: SocieteFormProps) {
  const { toast } = useToast();
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [existingFiles, setExistingFiles] = useState<ExistingFile[]>(
    (formData.existingFiles as ExistingFile[]) || []
  );

  // Initialize existing files from formData and maintain persistence
  useEffect(() => {
    if (formData.existingFiles && formData.existingFiles.length > 0) {
      setExistingFiles(formData.existingFiles);
      // Also set in form
      form?.setValue?.('existingFiles', formData.existingFiles);
    }
  }, [formData.existingFiles]);

   
  useEffect(() => {
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

    fetchTechnicians();
  }, [toast]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      id: formData.id || '', // Include ID for file association
      nomSociete: formData.nomSociete || '',
      telephonePrincipale: formData.telephonePrincipale || '',
      governorate: formData.governorate || '',
      delegation: formData.delegation || '',
      detailedAddress: formData.detailedAddress || '',
      telephoneSecondaire: formData.telephoneSecondaire || '',
      matriculeFiscale: formData.matriculeFiscale || '',
      technicienResponsable: formData.technicienResponsable || '',
      generalNote: formData.generalNote || '',
      existingFiles: formData.existingFiles || [],
    },
  });

  // Handle form submission
  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    // Ensure files are included in the form data
    data.existingFiles = existingFiles;
    
    // Call the parent's onNext function to proceed
    try {
      await onNext();
    } catch (error) {
      console.error('Error submitting form:', error);
      toast({
        title: "Error",
        description: "Failed to submit form",
        variant: "destructive",
      });
    }
  };

  // Handle file removal
  const handleRemoveFile = (fileUrl: string) => {
    const updatedExistingFiles = existingFiles.filter(file => file.url !== fileUrl);
    setExistingFiles(updatedExistingFiles);
    
    // Update form state
    form.setValue('existingFiles', updatedExistingFiles);
    
    // Notify parent component
    onFileChange(updatedExistingFiles);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
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
              <div className="space-y-6">
                <FormField
                  control={form.control}
                  name="nomSociete"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nom Société</FormLabel>
                      <FormControl>
                        <Input {...field} onChange={(e) => {
                          field.onChange(e);
                          onInputChange(e);
                        }} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="matriculeFiscale"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Matricule Fiscale</FormLabel>
                      <FormControl>
                        <Input {...field} onChange={(e) => {
                          field.onChange(e);
                          onInputChange(e);
                        }} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="telephonePrincipale"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Téléphone Principale</FormLabel>
                      <FormControl>
                        <Input {...field} onChange={(e) => {
                          field.onChange(e);
                          onInputChange(e);
                        }} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="telephoneSecondaire"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Téléphone Secondaire</FormLabel>
                      <FormControl>
                        <Input {...field} onChange={(e) => {
                          field.onChange(e);
                          onInputChange(e);
                        }} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Tunisia Address Fields */}
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Governorate Dropdown */}
                    <FormField
                      control={form.control}
                      name="governorate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Gouvernorat *</FormLabel>
                          <Select
                            onValueChange={(value) => {
                              field.onChange(value);
                              form.setValue('delegation', ''); // Reset delegation when governorate changes
                              onInputChange({ target: { name: 'governorate', value } } as any);
                            }}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Sélectionner un gouvernorat" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {TUNISIA_GOVERNORATES.map((gov) => (
                                <SelectItem key={gov.id} value={gov.id}>
                                  {gov.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Delegation Dropdown */}
                    <FormField
                      control={form.control}
                      name="delegation"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Délégation *</FormLabel>
                          <Select
                            onValueChange={(value) => {
                              field.onChange(value);
                              onInputChange({ target: { name: 'delegation', value } } as any);
                            }}
                            value={field.value}
                            disabled={!form.watch('governorate')}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Sélectionner une délégation" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {form.watch('governorate') && getDelegationsByGovernorate(form.watch('governorate')).map((del) => (
                                <SelectItem key={del.id} value={del.id}>
                                  {del.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Detailed Address */}
                  <FormField
                    control={form.control}
                    name="detailedAddress"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Adresse détaillée</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              {...field}
                              placeholder="Rue, numéro, bâtiment, etc."
                              onChange={(e) => {
                                field.onChange(e);
                                onInputChange(e);
                              }}
                            />
                            <MapPin className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-500" size={20} />
                        </div>
                      </FormControl>
                      <FormMessage />
                      <p className="text-xs text-gray-500">
                        Exemple: Avenue Habib Bourguiba, Immeuble Carthage, 2ème étage, Bureau 15
                      </p>
                    </FormItem>
                  )}
                />
                </div>

                <FormField
                  control={form.control}
                  name="technicienResponsable"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Technicien Responsable</FormLabel>
                      <Select 
                        onValueChange={(value) => {
                          field.onChange(value);
                          onInputChange({ target: { name: 'technicienResponsable', value } } as any);
                        }} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner un technicien" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {technicians.map(tech => (
                            <SelectItem key={tech.id} value={tech.id}>
                              {tech.name} ({tech.role})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-6">
                <FormField
                  control={form.control}
                  name="generalNote"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes Générales</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field} 
                          placeholder="Ajouter des notes générales pour cette société..."
                          rows={4}
                          onChange={(e) => {
                            field.onChange(e);
                            onInputChange(e);
                          }} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-4">
                  <label className="block text-sm font-medium text-gray-700">
                    Documents
                  </label>
                  {/* File Upload Section */}
                  <FileUpload 
                    form={form} 
                    existingFiles={existingFiles as any}
                    onFileChange={setExistingFiles}
                    onRemoveExistingFile={handleRemoveFile}
                    maxFiles={5}
                    maxFileSize={16}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-between mt-8 p-4 bg-gray-50 border-t border-gray-200">
            <Button type="button" variant="outline" onClick={onBack}>
              Retour
            </Button>
            <Button type="submit">
              Sauvegarder
            </Button>
          </div>
        </div>
      </form>
    </Form>
  );
}
