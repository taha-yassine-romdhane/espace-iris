import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { ArrowLeft, FileText, Printer, Phone, CreditCard, Building2, MapPin, Stethoscope, Wrench, Ruler, Weight, Edit } from 'lucide-react';
import { FileViewer } from '../../components/FileViewer';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import PatientForm from '@/components/forms/PatientForm';
import { RenseignementFormData } from '@/types/renseignement';
import { BeneficiaryType } from '@prisma/client';

// Import custom components
import {
  PatientBasicInfo,
  PatientContactInfo,
  PatientMedicalInfo,
  PatientStaffInfo,
  PatientHistory,
  PatientDiagnostics,
  PatientPayments,
  PatientRentals,
  PatientSales,
  PatientAppointments,
  PatientCNAMBonds,
  PatientPrintDialog
} from '@/components/patient';

export default function PatientDetailsPage() {
  const router = useRouter();
  const { id } = router.query;
  const queryClient = useQueryClient();
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [showFilesDialog, setShowFilesDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showPrintDialog, setShowPrintDialog] = useState(false);
  const { toast } = useToast();
  const [editFormData, setEditFormData] = useState<RenseignementFormData>({
    type: 'Patient',
    nomComplet: '',
    telephonePrincipale: '',
    telephoneSecondaire: '',
    detailedAddress: '',
    cin: '',
    identifiantCNAM: '',
    technicienResponsable: '',
    superviseur: '',
    antecedant: '',
    taille: '',
    poids: '',
    medecin: '',
    dateNaissance: '',
    beneficiaire: BeneficiaryType.ASSURE_SOCIAL,
    caisseAffiliation: 'CNSS',
    cnam: false,
    generalNote: '',
    nomSociete: '',
    matriculeFiscale: '',
    images: [],
    files: [],
    existingFiles: [],
  });

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

  // Populate form data when patient loads
  useEffect(() => {
    if (patient) {
      setEditFormData({
        type: 'Patient',
        id: patient.id,
        nomComplet: patient.nom || '',
        telephonePrincipale: patient.telephone || '',
        telephoneSecondaire: patient.telephoneSecondaire || '',
        detailedAddress: patient.adresse || '',
        governorate: patient.governorate || '',
        delegation: patient.delegation || '',
        cin: patient.cin || '',
        identifiantCNAM: patient.identifiantCNAM || '',
        technicienResponsable: patient.technicianId || '',
        superviseur: patient.assignedToId || '',
        antecedant: patient.antecedant || '',
        taille: patient.taille?.toString() || '',
        poids: patient.poids?.toString() || '',
        medecin: patient.doctorId || '',
        dateNaissance: patient.dateNaissance ? new Date(patient.dateNaissance).toISOString().split('T')[0] : '',
        beneficiaire: patient.beneficiaire || BeneficiaryType.ASSURE_SOCIAL,
        caisseAffiliation: patient.caisseAffiliation || 'CNSS',
        cnam: patient.cnam || false,
        generalNote: patient.generalNote || '',
        nomSociete: '',
        matriculeFiscale: '',
        images: [],
        files: [],
        existingFiles: patient.files || [],
      });
    }
  }, [patient]);

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
    setShowPrintDialog(true);
  };

  const handleEdit = () => {
    setShowEditDialog(true);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setEditFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const handleFileChange = (files: File[]) => {
    setEditFormData(prev => ({
      ...prev,
      files: files
    }));
  };

  const handleSavePatient = async () => {
    try {
      const endpoint = '/api/renseignements/patients';
      const formDataObj = new FormData();

      // Add all form fields
      Object.entries(editFormData).forEach(([key, value]) => {
        if (value !== undefined && value !== null && key !== 'files' && key !== 'images' && key !== 'existingFiles') {
          formDataObj.append(key, value.toString());
        }
      });

      // Add files if present
      if (editFormData.files && editFormData.files.length > 0) {
        editFormData.files.forEach((file: File) => {
          formDataObj.append('files', file);
        });
      }

      // Add existing files
      if (editFormData.existingFiles && editFormData.existingFiles.length > 0) {
        formDataObj.append('existingFiles', JSON.stringify(editFormData.existingFiles));
      }

      // Add ID for editing
      if (editFormData.id) {
        formDataObj.append('id', editFormData.id);
      }

      const response = await fetch(endpoint, {
        method: 'PUT',
        body: formDataObj,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update patient');
      }

      // Refresh patient data after successful save
      await queryClient.invalidateQueries({ queryKey: ['patient', id] });
      setShowEditDialog(false);
      toast({
        title: "Succès",
        description: "Les informations du patient ont été mises à jour.",
      });
    } catch (error) {
      console.error('Error updating patient:', error);
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Une erreur est survenue lors de la mise à jour",
        variant: "destructive",
      });
    }
  };

  const handleCancelEdit = () => {
    setShowEditDialog(false);
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
    <div className="min-h-screen bg-gray-50 px-2 py-4 md:px-4 md:py-6">
      {/* Back button */}
      <div className="mb-4">
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
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 md:p-4 mb-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{patient.nom}</h1>
              {patient.patientCode && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium font-mono bg-blue-100 text-blue-800">
                  {patient.patientCode}
                </span>
              )}
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                Patient
              </span>
            </div>

            {/* Patient Quick Info */}
            <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-2 text-sm">
              {patient.telephone && (
                <div className="flex items-center gap-2 text-gray-700">
                  <Phone className="h-4 w-4 text-blue-500" />
                  <span>{patient.telephone}</span>
                </div>
              )}
              {patient.cin && (
                <div className="flex items-center gap-2 text-gray-700">
                  <CreditCard className="h-4 w-4 text-blue-500" />
                  <span>{patient.cin}</span>
                </div>
              )}
              {patient.identifiantCNAM && (
                <div className="flex items-center gap-2 text-gray-700">
                  <Building2 className="h-4 w-4 text-blue-500" />
                  <span>CNAM: {patient.identifiantCNAM}</span>
                </div>
              )}
              {(patient.governorate || patient.delegation) && (
                <div className="flex items-center gap-2 text-gray-700">
                  <MapPin className="h-4 w-4 text-blue-500" />
                  <span>{[patient.governorate, patient.delegation].filter(Boolean).join(', ')}</span>
                </div>
              )}
              {patient.doctor?.name && (
                <div className="flex items-center gap-2 text-gray-700">
                  <Stethoscope className="h-4 w-4 text-blue-500" />
                  <span>Dr. {patient.doctor.name}</span>
                </div>
              )}
              {patient.technician?.name && (
                <div className="flex items-center gap-2 text-gray-700">
                  <Wrench className="h-4 w-4 text-blue-500" />
                  <span>{patient.technician.name}</span>
                </div>
              )}
              {patient.taille && (
                <div className="flex items-center gap-2 text-gray-700">
                  <Ruler className="h-4 w-4 text-blue-500" />
                  <span>{patient.taille} cm</span>
                </div>
              )}
              {patient.poids && (
                <div className="flex items-center gap-2 text-gray-700">
                  <Weight className="h-4 w-4 text-blue-500" />
                  <span>{patient.poids} kg</span>
                </div>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleEdit}
              className="flex items-center gap-2"
            >
              <Edit className="h-4 w-4" />
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

      {/* Main Content - All sections in one scrollable page */}
      <div className="space-y-6">
        {/* Patient Information Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <PatientBasicInfo patient={patient} />
          <PatientContactInfo patient={patient} />
          <PatientMedicalInfo patient={patient} />
          <PatientStaffInfo patient={patient} />
        </div>

        {/* General Note Section */}
        {patient.generalNote && (
          <Card>
            <CardContent className="pt-6">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Note générale</p>
                <p className="text-base text-gray-900 leading-relaxed whitespace-pre-wrap">
                  {patient.generalNote}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Diagnostics Section */}
        <PatientDiagnostics
          diagnostics={patient.diagnostics || []}
          isLoading={false}
        />

        {/* Manual Tasks Section */}
        <PatientAppointments
          manualTasks={patient.manualTasks || []}
          isLoading={false}
        />

        {/* Sales Section */}
        <PatientSales
          sales={patient.sales || []}
          saleItems={patient.saleItems || []}
          isLoading={false}
        />

        {/* Rentals Section */}
        <PatientRentals
          rentals={patient.rentals || []}
          isLoading={false}
        />

        {/* CNAM Bonds Section */}
        <PatientCNAMBonds
          cnamBonds={[
            ...(patient.rentals?.flatMap((rental: any) =>
              (rental.cnamBons || []).map((bon: any) => ({
                ...bon,
                sourceType: 'Location',
                sourceCode: rental.rentalCode
              }))
            ) || []),
            ...(patient.sales?.flatMap((sale: any) =>
              (sale.cnamBons || []).map((bon: any) => ({
                ...bon,
                sourceType: 'Vente',
                sourceCode: sale.saleCode
              }))
            ) || [])
          ]}
          isLoading={false}
        />

        {/* Payments Section */}
        <PatientPayments
          payments={patient.payments || []}
          isLoading={false}
        />

        {/* History Section */}
        <PatientHistory
          history={patient.history || []}
          isLoading={false}
        />
      </div>

      {/* File Viewer Dialog */}
      <FileViewer
        files={selectedFiles}
        isOpen={showFilesDialog}
        onClose={() => setShowFilesDialog(false)}
      />

      {/* Edit Patient Dialog */}
      {patient && (
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl">
                <Edit className="h-5 w-5 text-blue-500" />
                Modifier les informations du patient
              </DialogTitle>
            </DialogHeader>
            <PatientForm
              formData={editFormData}
              onInputChange={handleInputChange}
              onFileChange={handleFileChange}
              onBack={handleCancelEdit}
              onNext={handleSavePatient}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Print Dialog */}
      {patient && (
        <PatientPrintDialog
          open={showPrintDialog}
          onOpenChange={setShowPrintDialog}
          patientId={patient.id}
          patientName={patient.nom}
        />
      )}
    </div>
  );
}
