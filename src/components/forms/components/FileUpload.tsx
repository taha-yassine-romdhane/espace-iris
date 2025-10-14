import React, { useState, useRef } from 'react';
import { X, FileUp, Upload, AlertCircle, CheckCircle } from 'lucide-react';
import { UseFormReturn } from 'react-hook-form';
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Image from 'next/image';

interface UploadedFile {
  id?: string;
  url: string;
  name: string;
  type: string;
  size: number;
  key?: string;
}

interface FileUploadProps {
  form: UseFormReturn<any>;
  existingFiles?: UploadedFile[];
  accept?: string;
  onFileChange: (files: UploadedFile[]) => void;
  onRemoveExistingFile: (fileUrl: string) => void;
  className?: string;
  maxFiles?: number;
  maxFileSize?: number; // in MB
}

export default function FileUpload({
  form,
  existingFiles = [],
  onFileChange,
  onRemoveExistingFile,
  className,
  maxFiles = 10,
  maxFileSize = 16 // 16MB default
}: FileUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  // Get entity ID from form
  const formValues = form.getValues();
  const entityId = formValues?.id;
  const isCompanyForm = formValues?.nomSociete !== undefined;

  // Allowed file types
  const allowedTypes = [
    'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf', 'application/msword', 
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain', 'text/csv'
  ];

  const validateFile = (file: File): string | null => {
    if (!allowedTypes.includes(file.type)) {
      return `Type de fichier non autorisé: ${file.type}`;
    }
    if (file.size > maxFileSize * 1024 * 1024) {
      return `Fichier trop volumineux: ${(file.size / 1024 / 1024).toFixed(1)}MB (maximum: ${maxFileSize}MB)`;
    }
    return null;
  };

  const handleFileSelect = async (files: FileList) => {
    setUploadError(null);
    setUploadSuccess(false);

    if (existingFiles.length + files.length > maxFiles) {
      setUploadError(`Nombre maximum de fichiers dépassé (${maxFiles} fichiers maximum)`);
      return;
    }

    // Validate files
    const fileArray = Array.from(files);
    for (const file of fileArray) {
      const error = validateFile(file);
      if (error) {
        setUploadError(error);
        return;
      }
    }

    setIsUploading(true);

    try {
      // Create FormData
      const formData = new FormData();
      fileArray.forEach(file => {
        formData.append('files', file);
      });

      // Determine which upload endpoint to use
      let uploadUrl = '/api/files/upload-temp'; // Default to temp upload
      
      if (entityId) {
        // If entity exists, use direct upload
        uploadUrl = '/api/files/upload';
        
        // Add entity information
        if (isCompanyForm) {
          formData.append('companyId', entityId);
        } else {
          formData.append('patientId', entityId);
        }
      }

      // Upload files
      const response = await fetch(uploadUrl, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur lors de l\'upload');
      }

      const uploadedFiles: UploadedFile[] = await response.json();
      
      // Combine with existing files
      const combinedFiles = [...existingFiles, ...uploadedFiles];
      
      // Update parent component
      onFileChange(combinedFiles);
      
      // Update form
      form.setValue('existingFiles', combinedFiles);
      
      setUploadSuccess(true);
      setTimeout(() => setUploadSuccess(false), 3000);

      console.log(`Successfully uploaded ${uploadedFiles.length} files${!entityId ? ' (temporary)' : ''}`);

    } catch (error) {
      console.error('Upload error:', error);
      setUploadError(error instanceof Error ? error.message : 'Erreur lors de l\'upload');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    if (e.dataTransfer.files) {
      handleFileSelect(e.dataTransfer.files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFileSelect(e.target.files);
    }
  };

  const handleRemoveFile = (fileUrl: string) => {
    onRemoveExistingFile(fileUrl);
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex justify-between items-center">
        <label className="block text-sm font-medium text-gray-700">
          Fichiers ({existingFiles.length}/{maxFiles})
        </label>
      </div>

      {/* Success message */}
      {uploadSuccess && (
        <div className="p-3 bg-green-100 text-green-800 rounded-md text-sm flex items-center gap-2">
          <CheckCircle className="h-5 w-5" />
          <span>Fichiers uploadés avec succès!</span>
        </div>
      )}

      {/* Error message */}
      {uploadError && (
        <div className="p-3 bg-red-100 text-red-800 rounded-md text-sm flex items-start gap-2">
          <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Erreur d'upload</p>
            <p>{uploadError}</p>
          </div>
        </div>
      )}

      {/* Display existing files */}
      {existingFiles.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
          {existingFiles.map((file, index) => (
            <div key={file.url || index} className="relative group">
              {file.type.startsWith('image/') ? (
                <div className="relative">
                  <Image
                    src={file.url}
                    alt={file.name || `Document ${index + 1}`}
                    width={256}
                    height={128}
                    className="w-full h-32 object-cover rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveFile(file.url)}
                    className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="w-full h-32 flex flex-col items-center justify-center bg-gray-100 rounded-lg relative">
                  <FileUp className="h-8 w-8 text-gray-400 mb-2" />
                  <span className="text-xs text-gray-600 text-center px-2 break-words">
                    {file.name || `Document ${index + 1}`}
                  </span>
                  {file.size && (
                    <span className="text-xs text-gray-500 mt-1">
                      {formatFileSize(file.size)}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => handleRemoveFile(file.url)}
                    className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Upload area */}
      {existingFiles.length < maxFiles ? (
        <div
          className={cn(
            "border-2 border-dashed rounded-lg p-6 text-center transition-colors",
            isDragOver ? "border-blue-500 bg-blue-50" : "border-gray-300",
            isUploading ? "opacity-50 pointer-events-none" : "cursor-pointer hover:border-blue-400 hover:bg-gray-50"
          )}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={openFileDialog}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            accept={allowedTypes.join(',')}
            onChange={handleInputChange}
          />
          
          {isUploading ? (
            <div className="flex flex-col items-center gap-2">
              <Upload className="h-8 w-8 text-blue-500 animate-pulse" />
              <p className="text-sm text-gray-600">Upload en cours...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <FileUp className="h-8 w-8 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-700">
                  Cliquez pour sélectionner ou glissez-déposez vos fichiers
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Images, PDF, documents Office (max {maxFileSize}MB par fichier)
                </p>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="p-4 border border-gray-200 rounded-lg bg-gray-50 text-center">
          <p className="text-sm text-gray-500">Nombre maximum de fichiers atteint ({maxFiles})</p>
          <Button 
            variant="outline" 
            size="sm" 
            className="mt-2"
            onClick={() => onFileChange([])}
            type="button"
          >
            Supprimer tous les fichiers
          </Button>
        </div>
      )}
    </div>
  );
}