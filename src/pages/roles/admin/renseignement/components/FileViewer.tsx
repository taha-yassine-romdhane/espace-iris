import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileText, FileSpreadsheet, File, FileType, FileImage } from "lucide-react";
import Image from 'next/image';

interface FileViewerProps {
  files: Array<string | { url: string; name?: string; type?: string }>;
  isOpen: boolean;
  onClose: () => void;
}

export function FileViewer({ files, isOpen, onClose }: FileViewerProps) {
  if (!isOpen) return null;

  // Helper function to determine if a file is an image type
  const isImageFile = (file: string | { url: string; name?: string; type?: string }): boolean => {
    const fileUrl = typeof file === 'string' ? file : file.url;
    
    // First check by file extension if available
    if (/\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(fileUrl)) {
      return true;
    }
    
    // Check by MIME type if available for object-type files
    if (typeof file !== 'string' && file.type && file.type.startsWith('image/')) {
      return true;
    }
    
    // Special handling for UploadThing URLs
    // Example: https://1q2z9d946v.ufs.sh/f/Df43Y0C0ioj8z83FcUdg2jRxTuZ3O8SqtDEPakiedmLXKo4f
    if (fileUrl.includes('.ufs.sh/f/')) {
      if (typeof file !== 'string') {
        // If we have a file object with name, check name extension
        if (file.name && /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(file.name)) {
          return true;
        }
        
        // For UploadThing, if the type isn't specified, we'll try to display as image
        // as most uploads are likely images
        return !file.type || file.type.startsWith('image/') || file.type === 'IMAGE';
      }
      
      // For plain string URLs with UploadThing domain, try to display as image
      return true; 
    }
    
    return false;
  };

  // Helper function to get file URL from either string or object
  const getFileUrl = (file: string | { url: string; name?: string; type?: string }): string => {
    return typeof file === 'string' ? file : file.url;
  };

  // Helper function to get file name from either string or object
  const getFileName = (file: string | { url: string; name?: string; type?: string }): string => {
    if (typeof file === 'string') {
      const urlParts = file.split('/');
      return urlParts[urlParts.length - 1] || 'Fichier';
    }
    
    if (file.name) return file.name;
    
    const urlParts = file.url.split('/');
    return urlParts[urlParts.length - 1] || 'Fichier';
  };

  // Helper function to get file type
  const getFileType = (file: string | { url: string; name?: string; type?: string }): string => {
    const fileName = typeof file === 'string' ? file : (file.name || file.url);
    const fileType = typeof file !== 'string' ? file.type : '';
    
    // Check by MIME type first
    if (fileType) {
      if (fileType.startsWith('image/')) return 'image';
      if (fileType === 'application/pdf') return 'pdf';
      if (fileType.includes('spreadsheet') || fileType.includes('excel')) return 'excel';
      if (fileType.includes('word')) return 'word';
      if (fileType.includes('text')) return 'text';
    }
    
    // Check by file extension
    const ext = fileName.toLowerCase().split('.').pop() || '';
    
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].includes(ext)) return 'image';
    if (ext === 'pdf') return 'pdf';
    if (['xls', 'xlsx', 'csv'].includes(ext)) return 'excel';
    if (['doc', 'docx'].includes(ext)) return 'word';
    if (['txt'].includes(ext)) return 'text';
    if (['ppt', 'pptx'].includes(ext)) return 'powerpoint';
    
    return 'other';
  };

  // Helper function to get the appropriate icon
  const getFileIcon = (fileType: string) => {
    const iconClass = "h-24 w-24 text-gray-400";
    
    switch (fileType) {
      case 'pdf':
        return <FileText className={iconClass + " text-red-500"} />;
      case 'excel':
        return <FileSpreadsheet className={iconClass + " text-green-600"} />;
      case 'word':
        return <FileType className={iconClass + " text-blue-600"} />;
      case 'powerpoint':
        return <FileType className={iconClass + " text-orange-600"} />;
      case 'text':
        return <FileText className={iconClass} />;
      case 'image':
        return <FileImage className={iconClass + " text-purple-600"} />;
      default:
        return <File className={iconClass} />;
    }
  };

  // Helper function to get file type label
  const getFileTypeLabel = (fileType: string): string => {
    switch (fileType) {
      case 'pdf':
        return 'PDF';
      case 'excel':
        return 'Excel';
      case 'word':
        return 'Word';
      case 'powerpoint':
        return 'PowerPoint';
      case 'text':
        return 'Texte';
      case 'image':
        return 'Image';
      default:
        return 'Document';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Fichiers attachés</DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          {files.map((file, index) => {
            const fileUrl = getFileUrl(file);
            const fileName = getFileName(file);
            const fileType = getFileType(file);
            const isImage = fileType === 'image';
            
            return (
              <div key={index} className="relative border border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                <a 
                  href={fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center justify-center p-4 h-full hover:bg-gray-50 transition-colors"
                >
                  {isImage ? (
                    <div className="w-full aspect-square bg-gray-50 rounded-md mb-3 flex items-center justify-center overflow-hidden">
                      <Image 
                        src={fileUrl} 
                        alt={fileName}
                        className="max-w-full max-h-full object-contain"
                        width={500}
                        height={500}
                        loading="lazy"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          
                          // Add a document icon as fallback
                          const parent = target.parentElement;
                          if (parent) {
                            const fallback = document.createElement('div');
                            fallback.className = 'flex flex-col items-center justify-center w-full h-full';
                            fallback.innerHTML = `
                              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-purple-600">
                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                                <circle cx="8.5" cy="8.5" r="1.5"></circle>
                                <polyline points="21 15 16 10 5 21"></polyline>
                              </svg>
                              <span class="text-xs text-gray-500 mt-2">Image non disponible</span>
                            `;
                            parent.appendChild(fallback);
                          }
                        }}
                      />
                    </div>
                  ) : (
                    <div className="w-full aspect-square bg-gray-50 rounded-md mb-3 flex flex-col items-center justify-center">
                      {getFileIcon(fileType)}
                      <span className="text-sm font-medium text-gray-600 mt-2">
                        {getFileTypeLabel(fileType)}
                      </span>
                    </div>
                  )}
                  
                  <div className="w-full text-center">
                    <p className="text-xs text-gray-700 font-medium break-all max-w-full truncate" title={fileName}>
                      {fileName}
                    </p>
                    {typeof file !== 'string' && file.type && (
                      <p className="text-xs text-gray-500 mt-1">
                        {file.type}
                      </p>
                    )}
                  </div>
                </a>
              </div>
            );
          })}
        </div>
        
        {files.length === 0 && (
          <div className="py-8 text-center">
            <p className="text-gray-500">Aucun fichier attaché</p>
          </div>
        )}
        
        <div className="mt-4 flex justify-end">
          <Button variant="outline" onClick={onClose}>
            Fermer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default FileViewer;
