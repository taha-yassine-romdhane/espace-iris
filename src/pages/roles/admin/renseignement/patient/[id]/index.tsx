import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { ArrowLeft, FileText, Printer } from 'lucide-react';
import { FileViewer } from '../../components/FileViewer';

// Import custom components
import {
  PatientBasicInfo,
  PatientContactInfo,
  PatientMedicalInfo,
  PatientStaffInfo,
  PatientFiles,
  PatientHistory,
  PatientDiagnostics,
  PatientDevices,
  PatientPayments,
  PatientRentals,
  PatientAppointments
} from '@/components/patient';

export default function PatientDetailsPage() {
  const router = useRouter();
  const { id } = router.query;
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [showFilesDialog, setShowFilesDialog] = useState(false);
  const { toast } = useToast();

  // Fetch patient data
  const { data: patient, isLoading, error } = useQuery({
    queryKey: ['patient', id],
    queryFn: async () => {
      if (id) {
        const response = await fetch(`/api/renseignements/${id}`);
        if (!response.ok) {
          throw new Error('Failed to fetch patient data');
        }
        return response.json();
      }
    },
    enabled: !!id
  });

  // Handler for viewing files
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

  const handleBack = () => {
    router.push('/roles/admin/renseignement');
  };

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-red-600">Error loading patient data</h2>
          <p className="text-gray-500">{(error as Error).message}</p>
          <Button variant="outline" onClick={handleBack} className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Renseignement
          </Button>
        </div>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-5xl mx-auto bg-white rounded-lg shadow p-8">
          <h2 className="text-xl font-semibold mb-4">Patient non trouvé</h2>
          <p className="text-gray-700 mb-4">
            Le patient que vous recherchez n'existe pas ou a été supprimé.
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
            <h1 className="text-2xl font-bold text-gray-900">{patient.nom}</h1>
            <p className="text-gray-500">Patient ID: {patient.id}</p>
            <div className="mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              Patient
            </div>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => router.push(`/roles/admin/renseignement?edit=${patient.id}`)}
            >
              Modifier
            </Button>
            <Button
              variant="outline"
              onClick={handlePrint}
              className="flex items-center gap-2"
            >
              <Printer className="h-4 w-4" />
              Imprimer
            </Button>
            {patient.files && patient.files.length > 0 && (
              <Button 
                variant="secondary"
                onClick={() => handleViewFiles(patient.files)}
                className="flex items-center gap-2"
              >
                <FileText className="h-4 w-4" />
                Voir les fichiers ({patient.files.length})
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto">
        <Tabs defaultValue="info" className="w-full">
          <TabsList className="grid w-full md:w-auto md:inline-grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 h-auto">
            <TabsTrigger value="info">Informations</TabsTrigger>
            <TabsTrigger value="medical">Médical</TabsTrigger>
            <TabsTrigger value="history">Historique</TabsTrigger>
            <TabsTrigger value="diagnostics">Diagnostics</TabsTrigger>
            <TabsTrigger value="devices">Appareils</TabsTrigger>
            <TabsTrigger value="payments">Paiements</TabsTrigger>
            <TabsTrigger value="rentals">Locations</TabsTrigger>
          </TabsList>

          {/* Basic Information Tab */}
          <TabsContent value="info" className="space-y-6 mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <PatientBasicInfo patient={patient} />
              <PatientContactInfo patient={patient} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <PatientMedicalInfo patient={patient} />
              <PatientStaffInfo patient={patient} />
            </div>
          </TabsContent>

          {/* Medical Tab */}
          <TabsContent value="medical" className="space-y-6 mt-6">
            <PatientMedicalInfo patient={patient} />
            <PatientAppointments 
              appointments={patient.appointments || []} 
              isLoading={false}
            />
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="space-y-6 mt-6">
            <PatientHistory 
              history={patient.history || []} 
              isLoading={false}
            />
          </TabsContent>

          {/* Diagnostics Tab */}
          <TabsContent value="diagnostics" className="space-y-6 mt-6">
            <PatientDiagnostics 
              diagnostics={patient.diagnostics || []} 
              isLoading={false}
            />
          </TabsContent>

          {/* Devices Tab */}
          <TabsContent value="devices" className="space-y-6 mt-6">
            <PatientDevices 
              devices={patient.devices || []} 
              isLoading={false}
            />
          </TabsContent>

          {/* Payments Tab */}
          <TabsContent value="payments" className="space-y-6 mt-6">
            <PatientPayments 
              payments={patient.payments || []} 
              isLoading={false}
            />
          </TabsContent>

          {/* Rentals Tab */}
          <TabsContent value="rentals" className="space-y-6 mt-6">
            <PatientRentals 
              rentals={patient.rentals || []} 
              isLoading={false}
            />
          </TabsContent>

          {/* Additional Tab for Files */}
          <TabsContent value="files" className="space-y-6 mt-6">
            <PatientFiles 
              files={patient.files || []} 
              onViewFile={(file) => handleViewFiles([file as any])}
            />
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
