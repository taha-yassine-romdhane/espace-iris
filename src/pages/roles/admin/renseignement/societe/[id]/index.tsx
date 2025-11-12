import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { ArrowLeft, Building, FileText, Phone, MapPin, Briefcase, FileImage } from 'lucide-react';
import { FileViewer } from '../../components/FileViewer';

export default function SocieteDetailsPage() {
  const router = useRouter();
  const { id } = router.query;
  const { toast } = useToast();
  const [showFilesDialog, setShowFilesDialog] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);

  // Fetch company details
  const { data: societe, isLoading, error } = useQuery({
    queryKey: ['societe', id],
    queryFn: async () => {
      if (!id) return null;
      const response = await fetch(`/api/renseignements/${id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch company details');
      }
      return response.json();
    },
    enabled: !!id,
  });

  const handleViewFiles = (files: { url: string; type: string }[]) => {
    if (files && files.length > 0) {
      const fileUrls = files.map(file => file.url);
      setSelectedFiles(fileUrls);
      setShowFilesDialog(true);
    } else {
      toast({
        title: "Aucun fichier",
        description: "Il n'y a aucun fichier à afficher.",
        variant: "destructive",
      });
    }
  };

  // Handle loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-700 mx-auto mb-4"></div>
          <h3 className="text-lg font-medium text-gray-700">Chargement des détails de la société...</h3>
        </div>
      </div>
    );
  }

  // Handle error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-5xl mx-auto bg-white rounded-lg shadow p-8">
          <h2 className="text-xl font-semibold mb-4 text-red-600">Erreur</h2>
          <p className="text-gray-700 mb-4">
            Une erreur s'est produite lors du chargement des détails de la société.
          </p>
          <Button
            variant="outline"
            onClick={() => router.push("/roles/admin/renseignement")}
            className="flex items-center"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour à la liste des renseignements
          </Button>
        </div>
      </div>
    );
  }

  // Handle not found
  if (!societe) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-5xl mx-auto bg-white rounded-lg shadow p-8">
          <h2 className="text-xl font-semibold mb-4">Société non trouvée</h2>
          <p className="text-gray-700 mb-4">
            La société que vous recherchez n'existe pas ou a été supprimée.
          </p>
          <Button
            variant="outline"
            onClick={() => router.push("/roles/admin/renseignement")}
            className="flex items-center"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour à la liste des renseignements
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      {/* Back button */}
      <div className="max-w-7xl mx-auto mb-6">
        <Button
          variant="outline"
          onClick={() => router.push("/roles/admin/renseignement")}
          className="flex items-center"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour à la liste des renseignements
        </Button>
      </div>

      {/* Page Header */}
      <div className="max-w-7xl mx-auto bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{societe.nomSociete || societe.nom}</h1>
            <div className="mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              Société
            </div>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => router.push(`/roles/admin/renseignement?edit=${societe.id}`)}
            >
              Modifier
            </Button>
            {societe.files && societe.files.length > 0 && (
              <Button 
                variant="secondary"
                onClick={() => handleViewFiles(societe.files)}
                className="flex items-center gap-2"
              >
                <FileText className="h-4 w-4" />
                Voir les fichiers ({societe.files.length})
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto">
        <Tabs defaultValue="details" className="w-full">
          <TabsList className="grid w-full md:w-auto md:inline-grid grid-cols-2 h-auto">
            <TabsTrigger value="details">Informations générales</TabsTrigger>
            <TabsTrigger value="files">Documents & Fichiers</TabsTrigger>
          </TabsList>

          {/* Company Details Tab */}
          <TabsContent value="details" className="space-y-6 mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Company Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building className="h-5 w-5 text-green-500" />
                    Informations de la société
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Nom de la société</p>
                    <p className="text-base">{societe.nomSociete || societe.nom}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium text-gray-500">Matricule fiscale</p>
                    <p className="text-base flex items-center gap-2">
                      <Briefcase className="h-4 w-4 text-gray-400" />
                      {societe.matriculeFiscale || 'Non spécifié'}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-gray-500">Description</p>
                    <p className="text-base">{societe.descriptionNom || 'Aucune description'}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Contact Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Phone className="h-5 w-5 text-green-500" />
                    Coordonnées
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Téléphone principal</p>
                    <p className="text-base flex items-center gap-2">
                      <Phone className="h-4 w-4 text-gray-400" />
                      {societe.telephone}
                    </p>
                    {societe.descriptionTelephone && (
                      <p className="text-sm text-gray-500 mt-1">{societe.descriptionTelephone}</p>
                    )}
                  </div>
                  
                  {societe.telephoneSecondaire && (
                    <div>
                      <p className="text-sm font-medium text-gray-500">Téléphone secondaire</p>
                      <p className="text-base flex items-center gap-2">
                        <Phone className="h-4 w-4 text-gray-400" />
                        {societe.telephoneSecondaire}
                      </p>
                    </div>
                  )}
                  
                  <div>
                    <p className="text-sm font-medium text-gray-500">Adresse</p>
                    <p className="text-base flex items-start gap-2">
                      <MapPin className="h-4 w-4 text-gray-400 mt-1" />
                      {societe.adresse || 'Non spécifiée'}
                    </p>
                    {societe.descriptionAdresse && (
                      <p className="text-sm text-gray-500 mt-1">{societe.descriptionAdresse}</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Technical Contact */}
              <Card>
                <CardHeader>
                  <CardTitle>Responsables techniques</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Technicien responsable</p>
                    <p className="text-base">{societe.technician ? societe.technician.name : 'Non assigné'}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium text-gray-500">Date de création</p>
                    <p className="text-base">{new Date(societe.createdAt).toLocaleDateString()}</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Files Tab */}
          <TabsContent value="files" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileImage className="h-5 w-5 text-green-500" />
                  Documents et fichiers
                </CardTitle>
                <CardDescription>
                  Tous les documents associés à cette société
                </CardDescription>
              </CardHeader>
              <CardContent>
                {societe.files && societe.files.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {societe.files.map((file: { url: string; type: string }, index: number) => (
                      <div 
                        key={index} 
                        className="border border-gray-200 rounded-md p-4 hover:bg-gray-50 cursor-pointer"
                        onClick={() => handleViewFiles([file])}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <FileText className="h-5 w-5 text-green-500" />
                          <span className="text-sm font-medium truncate">
                            {file.url.split('/').pop()}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500">
                          {file.type}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <FileText className="h-10 w-10 mx-auto mb-2 text-gray-300" />
                    <p>Aucun fichier associé à cette société</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* File Viewer Dialog */}
      <FileViewer
        files={selectedFiles}
        isOpen={showFilesDialog}
        onClose={() => setShowFilesDialog(false)}
      />
    </div>
  );
}
