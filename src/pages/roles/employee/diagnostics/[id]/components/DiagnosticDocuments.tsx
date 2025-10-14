import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileUp, File as FileIcon, Download, Trash2, FileText, Image, FileArchive, Loader2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "@/components/ui/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { UploadDropzone } from "@/utils/uploadthing";

interface DiagnosticDocumentsProps {
  documents: any[];
  diagnosticId: string;
}

export function DiagnosticDocuments({ documents = [], diagnosticId }: DiagnosticDocumentsProps) {
  // Log documents for debugging
  console.log('Documents received in component:', documents);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Format date
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    return format(new Date(dateString), "PPP à HH:mm", { locale: fr });
  };

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Get file icon based on mime type or file extension
  const getFileIcon = (typeOrUrl: string) => {
    // Check if it's a MIME type
    if (typeOrUrl.includes('/')) {
      if (typeOrUrl.startsWith('image/')) {
        return <Image className="h-6 w-6 text-purple-600" />;
      } else if (typeOrUrl.startsWith('application/pdf')) {
        return <FileText className="h-6 w-6 text-red-600" />;
      } else if (typeOrUrl.startsWith('application/zip') || typeOrUrl.startsWith('application/x-rar')) {
        return <FileArchive className="h-6 w-6 text-yellow-600" />;
      }
    } 
    
    // Check file extension from URL
    const url = typeOrUrl.toLowerCase();
    if (url.endsWith('.jpg') || url.endsWith('.jpeg') || url.endsWith('.png') || url.endsWith('.gif')) {
      return <Image className="h-6 w-6 text-purple-600" />;
    } else if (url.endsWith('.pdf')) {
      return <FileText className="h-6 w-6 text-red-600" />;
    } else if (url.endsWith('.zip') || url.endsWith('.rar')) {
      return <FileArchive className="h-6 w-6 text-yellow-600" />;
    }
    
    // Default icon
    return <FileIcon className="h-6 w-6 text-blue-600" />;
  };

  // Handle successful upload
  const handleUploadComplete = (res: Array<any>) => {
    if (!res || res.length === 0) return;
    
    console.log('Upload complete response:', res);
    const fileData = res[0];
    
    // Now save the file reference in our database
    try {
      // Make API call to save the file reference
      fetch(`/api/diagnostics/${diagnosticId}/documents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileUrl: fileData.ufsUrl || fileData.url, // Use ufsUrl (v9) with fallback to url (v8)
          fileName: fileData.name,
          fileType: fileData.type,
          fileSize: fileData.size
        }),
      }).then(response => {
        if (!response.ok) {
          throw new Error('Failed to save file reference');
        }
        return response.json();
      }).then(() => {
        // Success
        queryClient.invalidateQueries({ queryKey: ["diagnostic", diagnosticId] });
        setIsUploading(false);
        setUploadError(null);
        toast({
          title: "Document téléchargé",
          description: "Le document a été téléchargé avec succès.",
          variant: "default",
        });
      }).catch(error => {
        console.error('Error saving file reference:', error);
        toast({
          title: "Erreur",
          description: "Le fichier a été téléchargé mais n'a pas pu être associé au diagnostic.",
          variant: "destructive",
        });
        setIsUploading(false);
        setUploadError(error.message);
      });
    } catch (error: any) {
      console.error('Error in upload process:', error);
      setIsUploading(false);
      setUploadError(error.message);
    }
  };
  
  // Handle upload error
  const handleUploadError = (error: Error) => {
    console.error('Upload error:', error);
    setUploadError(error.message || "Une erreur s'est produite lors du téléchargement du document.");
    setIsUploading(false);
    toast({
      title: "Erreur de téléchargement",
      description: error.message || "Une erreur s'est produite lors du téléchargement du document.",
      variant: "destructive",
    });
  };

  // Delete document mutation
  const deleteDocumentMutation = useMutation({
    mutationFn: async (documentId: string) => {
      const response = await fetch(`/api/diagnostics/${diagnosticId}/documents/${documentId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete document');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["diagnostic", diagnosticId] });
      toast({
        title: "Document supprimé",
        description: "Le document a été supprimé avec succès.",
        variant: "default",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erreur",
        description: error.message || "Une erreur s'est produite lors de la suppression du document.",
        variant: "destructive",
      });
    },
  });

  // Handle document deletion
  const handleDelete = (documentId: string) => {
    console.log('Deleting document with ID:', documentId);
    if (confirm('Êtes-vous sûr de vouloir supprimer ce document?')) {
      deleteDocumentMutation.mutate(documentId);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-xl font-bold">Documents</CardTitle>
          <CardDescription>Documents associés à ce diagnostic</CardDescription>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" className="flex items-center gap-2">
              <FileUp className="h-4 w-4" />
              Ajouter un document
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Ajouter un document</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {/* UploadThing Dropzone */}
              <UploadDropzone
                endpoint="documentUploader"
                onClientUploadComplete={(res) => {
                  handleUploadComplete(res);
                }}
                onUploadError={(error: Error) => {
                  handleUploadError(error);
                }}
                onUploadBegin={() => {
                  setIsUploading(true);
                  setUploadError(null);
                }}
                className="ut-label:text-lg ut-allowed-content:text-gray-500 ut-upload-icon:text-primary ut-button:bg-primary ut-button:ut-readying:bg-primary/80"
              />
              
              {/* Error display */}
              {uploadError && (
                <div className="text-red-500 text-sm mt-2 flex items-center">
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {uploadError}
                </div>
              )}
              
              {/* Loading indicator */}
              {isUploading && !uploadError && (
                <div className="text-blue-500 text-sm mt-2 flex items-center">
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Téléchargement en cours...
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      
      <CardContent className="p-6">
        {!documents || documents.length === 0 ? (
          <div className="text-gray-500 italic">Aucun document associé à ce diagnostic</div>
        ) : (
          <div className="space-y-4">
            {documents.map((doc: any) => (
              <div key={doc.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center gap-3">
                  {getFileIcon(doc.type || 'application/octet-stream')}
                  
                  <div>
                    <h3 className="font-medium text-gray-900">{doc.url?.split('/').pop() || 'Document'}</h3>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <span>Ajouté le {formatDate(doc.createdAt)}</span>
                      <span className="text-xs bg-gray-100 px-2 py-1 rounded">{formatFileSize(doc.fileSize || 0)}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="flex items-center gap-1"
                    onClick={() => window.open(doc.url || doc.ufsUrl, '_blank')}
                  >
                    <Download className="h-4 w-4" />
                    <span className="hidden sm:inline">Télécharger</span>
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="flex items-center gap-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => handleDelete(doc.id)}
                    disabled={false}
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="hidden sm:inline">Supprimer</span>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default DiagnosticDocuments;
