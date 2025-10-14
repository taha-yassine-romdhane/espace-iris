import React, { useState } from 'react';
import { X, FileUp, Upload, AlertCircle } from 'lucide-react';
import { UseFormReturn } from 'react-hook-form';
import { UploadDropzone } from "@/utils/uploadthing";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Image from 'next/image';
import { ExistingFile } from '@/types/forms/PatientFormData';

interface FileManagerProps {
  // Use a more flexible form type to ensure compatibility
  form: UseFormReturn<any>;
  existingFiles?: ExistingFile[];
  accept?: string;
  onFileChange: (files: ExistingFile[]) => void;
  onRemoveExistingFile: (fileUrl: string) => void;
  className?: string;
  endpoint?: "imageUploader" | "multiUploader" | "documentUploader";
  maxFiles?: number;
}

export default function FileManager({
  form,
  existingFiles = [],
  onFileChange,
  onRemoveExistingFile,
  className,
  endpoint = "imageUploader" as "imageUploader" | "multiUploader" | "documentUploader",
  maxFiles = 5
}: FileManagerProps) {
  // Add state for entity ID from form
  const formValues = form.getValues();
  const entityId = formValues?.id; // Get entity ID if it exists
  const isCompanyForm = formValues?.nomSociete !== undefined; // Check if this is a company form
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [savedFileUrls, setSavedFileUrls] = useState<string[]>([]);
  
  // Track initial files to detect changes
  const [initialFileUrls, setInitialFileUrls] = useState<string[]>([]);
  
  // Initialize the initial file URLs when component mounts or existingFiles changes
  React.useEffect(() => {
    if (existingFiles?.length > 0) {
      const urls = existingFiles.map(file => file.url);
      // Only set initial files if they haven't been set yet
      if (initialFileUrls.length === 0) {
        setInitialFileUrls(urls);
      }
      
      // Determine if current files differ from saved files
      const fileUrlsSet = new Set(urls);
      const savedUrlsSet = new Set(savedFileUrls);
      
      // Files are different if their lengths are different or if any URLs don't match
      const filesAreDifferent = fileUrlsSet.size !== savedUrlsSet.size || 
        urls.some(url => !savedUrlsSet.has(url)) || 
        savedFileUrls.some(url => !fileUrlsSet.has(url));
        
      setHasChanges(filesAreDifferent);
    } else {
      setHasChanges(savedFileUrls.length > 0);
    }
  }, [entityId, existingFiles, savedFileUrls, initialFileUrls.length]);

  // Preserve form values after upload
  const preserveFormValues = (): void => {
    const currentFormValues = form.getValues();
    setTimeout(() => {
      Object.keys(currentFormValues).forEach(key => {
        if (key !== 'files' && key !== 'images') {
          // Use string type for the key to avoid keyof type issues
          form.setValue(key as string, currentFormValues[key]);
        }
      });
    }, 0);
  };

  // Handle successful upload
  // Accept the actual UploadThing client return type
  const handleUploadComplete = (res: Array<Record<string, unknown>>): void => {
    if (!res || res.length === 0) return;
    
    console.log('Upload complete response:', res);
    
    // Format the uploaded files to match our ExistingFile interface
    const uploadedFiles: ExistingFile[] = res.map(file => ({
      url: String((file).ufsUrl || file.url || ''),
      type: String(file.type || "image/jpeg"),
      name: String(file.name),
      id: (typeof file.key === 'string' ? file.key : undefined),
    }));
    
    console.log('Formatted uploaded files:', uploadedFiles);
    
    // Combine with existing files
    const combinedFiles = [...existingFiles, ...uploadedFiles];
    
    console.log('Updated files array:', combinedFiles);
    
    // Update parent component state with the new files
    onFileChange(combinedFiles);
    
    // CRITICAL FIX: Update form values in multiple ways to ensure they're saved
    try {
      // 1. Set the existingFiles value directly
      console.log('Setting form existingFiles value:', combinedFiles);
      form.setValue('existingFiles', combinedFiles);
      
      // 2. Also update global window object to ensure data persists
      if (typeof window !== 'undefined') {
        // @ts-expect-error - Adding a temporary property to window
        window.__PATIENT_FILES = combinedFiles;
      }
      
      // 3. Update hidden input in the DOM to ensure it's included in form submission
      setTimeout(() => {
        const formElement = document.querySelector('form');
        if (formElement) {
          // Create a JSON string for the hidden inputs
          const filesJsonString = JSON.stringify(combinedFiles);
          
          // Create or find hidden input
          let hiddenInput = formElement.querySelector('input[name="existingFilesData"]') as HTMLInputElement;
          if (!hiddenInput) {
            hiddenInput = document.createElement('input');
            hiddenInput.type = 'hidden';
            hiddenInput.name = 'existingFilesData';
            formElement.appendChild(hiddenInput);
          }
          
          // Set the value and ensure it's properly attached to the input
          hiddenInput.value = filesJsonString;
          
          // Also create a backup input with a different name
          let backupInput = formElement.querySelector('input[name="_uploadedFiles"]') as HTMLInputElement;
          if (!backupInput) {
            backupInput = document.createElement('input');
            backupInput.type = 'hidden';
            backupInput.name = '_uploadedFiles';
            formElement.appendChild(backupInput);
          }
          backupInput.value = filesJsonString;
          
          console.log('Updated hidden inputs with files data:', filesJsonString);
          console.log('Form has hidden inputs:', !!hiddenInput, !!backupInput);
        }
      }, 100);
      
      console.log('Successfully set form values with files:', combinedFiles);
    } catch (error) {
      console.error('Error setting form values:', error);
    }
    
    setIsUploading(false);
    preserveFormValues();
  };

  // Handle upload error
  const handleError = (error: Error) => {
    console.error('Upload error:', error);
    setUploadError(error.message || 'An error occurred during upload');
    setIsUploading(false);
    preserveFormValues();
  };
  
  // Function to handle file deletion (when X button is clicked)
  const handleRemoveFile = async (fileUrl: string, fileId?: string) => {
    setUploadError(null);
    
    try {
      const patientId = form.getValues()?.id;
      
      // Only attempt database deletion if we have a patient ID (meaning the record exists)
      if (patientId) {
        console.log(`Deleting file from database: ${fileId ? `ID: ${fileId}` : `URL: ${fileUrl}`}`);
        
        // Call the API to delete the file from the database
        const response = await fetch('/api/files', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(
            fileId 
              ? { fileId } // If we have an ID, use that for precise deletion
              : { fileUrl } // Otherwise fall back to using the URL
          ),
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          console.error('Error deleting file:', errorData);
          // Continue with UI update even if API call fails
        } else {
          console.log('File successfully deleted from database');
        }
      }
      
      // Update UI regardless of API success
      onRemoveExistingFile(fileUrl);
      
    } catch (error) {
      console.error('Error in file deletion:', error);
      setUploadError('Failed to delete file. Please try again.');
    }
  };
  
  // Function to save files directly to the database
  const saveFilesToDatabase = async () => {
    if (!existingFiles || existingFiles.length === 0) {
      setUploadError('No files to save');
      return;
    }
    
    // Check if there are any changes to save
    if (!hasChanges) {
      console.log('No changes to save');
      return;
    }
    
    // Reset states
    setIsSaving(true);
    setSaveSuccess(false);
    setUploadError(null);
    
    try {
      // Get entity ID from form values - needed to link files to patient or company
      const formValues = form.getValues();
      const entityId = formValues.id;
      
      // Determine if this is a patient or company form
      const isCompanyForm = formValues.nomSociete !== undefined;
      
      if (!entityId) {
        setUploadError(`Veuillez d'abord enregistrer la ${isCompanyForm ? 'société' : 'fiche patient'} en cliquant sur le bouton "Sauvegarder" en bas du formulaire`);
        setIsSaving(false);
        return;
      }
      
      console.log('Saving files directly to database for entity:', entityId);
      console.log('Files to save:', existingFiles);
      
      // First, delete existing files for this entity from the database
      // This ensures we don't have duplicates
      if (savedFileUrls.length > 0) {
        console.log('Removing existing files before saving new ones');
        const deleteResponse = await fetch('/api/files', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            // Use the appropriate ID field based on entity type
            ...(isCompanyForm ? { companyId: entityId } : { patientId: entityId }),
          }),
        });
        
        if (!deleteResponse.ok) {
          console.warn('Could not delete existing files, but continuing with save');
        }
      }
      
      // Make API call to save files
      const response = await fetch('/api/files', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          files: existingFiles,
          // Use the appropriate ID field based on entity type
          ...(isCompanyForm ? { companyId: entityId } : { patientId: entityId }),
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save files');
      }
      
      const savedFiles = await response.json();
      console.log('Files saved successfully:', savedFiles);
      
      // Update tracking of saved files to prevent double saves
      const newSavedUrls = existingFiles.map(file => file.url);
      setSavedFileUrls(newSavedUrls);
      setHasChanges(false);
      
      // Update UI
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000); // Hide success message after 3 seconds
    } catch (error) {
      console.error('Error saving files:', error);
      setUploadError(error instanceof Error ? error.message : 'Failed to save files');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex justify-between items-center">
        <label className="block text-sm font-medium text-gray-700">
          Fichiers
        </label>
        
        {/* Add Save Files button */}
        {existingFiles.length > 0 && (
          <button
            type="button"
            onClick={saveFilesToDatabase}
            disabled={isSaving || (!hasChanges && existingFiles.length > 0)}
            className={`px-3 py-1 text-xs rounded-md ${isSaving ? 'bg-gray-400' : !hasChanges ? 'bg-gray-500' : 'bg-blue-600'} text-white`}
          >
            {isSaving ? 'Enregistrement...' : !hasChanges ? 'Aucun changement' : 'Enregistrer les fichiers'}
          </button>
        )}
      </div>
      
      {/* Success message */}
      {saveSuccess && (
        <div className="p-2 bg-green-100 text-green-800 rounded-md text-sm">
          Fichiers enregistrés avec succès dans la base de données!
        </div>
      )}
      
      {/* Error message */}
      {uploadError && (
        <div className="p-2 bg-red-100 text-red-800 rounded-md text-sm">
          {uploadError}
        </div>
      )}

      {/* Display existing files */}
      {existingFiles && existingFiles.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
          {existingFiles.map((file, index) => (
            <div key={index} className="relative group">
              {file.type.startsWith('image/') ? (
                <Image
                  src={file.url}
                  alt={file.name || `Document ${index + 1}`}
                  width={256}
                  height={128}
                  className="w-full h-32 object-cover rounded-lg"
                />
              ) : (
                <div className="w-full h-32 flex items-center justify-center bg-gray-100 rounded-lg">
                  <FileUp className="h-10 w-10 text-gray-400" />
                  <span className="text-xs text-gray-600 mt-2">{file.name || `Document ${index + 1}`}</span>
                </div>
              )}
              <button
                type="button"
                onClick={() => handleRemoveFile(file.url, file.id)}
                className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* UploadThing UI */}
      <div className="mt-4">
        {existingFiles.length < maxFiles ? (
          <>
            <UploadDropzone
              endpoint={endpoint}
              onClientUploadComplete={(res) => {
                if (!res) return;
                handleUploadComplete(res as any);
              }}
              onUploadError={(error: Error) => {
                handleError(error);
              }}
              onUploadBegin={() => {
                setIsUploading(true);
                setUploadError(null);
              }}
              className="ut-label:text-lg ut-allowed-content:text-gray-500 ut-upload-icon:text-primary ut-button:bg-primary ut-button:ut-readying:bg-primary/80"
            />
          </>
        ) : (
          <div className="p-4 border border-gray-200 rounded-lg bg-gray-50 text-center">
            <p className="text-sm text-gray-500">Nombre maximum de fichiers atteint ({maxFiles})</p>
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-2"
              onClick={() => {
                // Allow user to remove files before adding more
                onFileChange([]);
              }}
            >
              Supprimer tous les fichiers
            </Button>
          </div>
        )}

        {uploadError && (
          <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-md flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-800">Erreur d&apos;upload</p>
              <p className="text-xs text-red-700">{uploadError}</p>
            </div>
          </div>
        )}

        {isUploading && (
          <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-md flex items-center gap-2">
            <Upload className="h-5 w-5 text-blue-500 animate-pulse" />
            <p className="text-sm text-blue-700">Upload en cours...</p>
          </div>
        )}
      </div>
    </div>
  );
}
