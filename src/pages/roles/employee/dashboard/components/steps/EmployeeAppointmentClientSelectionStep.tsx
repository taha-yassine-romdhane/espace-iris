import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, User, Search, UserPlus, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import PatientForm from '@/components/forms/PatientForm';

interface Client {
  id: string;
  name: string;
  type: 'patient';
  telephone?: string;
  firstName?: string;
  lastName?: string;
}

interface EmployeeAppointmentClientSelectionStepProps {
  selectedClient: Client | null;
  onClientSelect: (client: Client) => void;
}

export function EmployeeAppointmentClientSelectionStep({ 
  selectedClient, 
  onClientSelect 
}: EmployeeAppointmentClientSelectionStepProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateFormOpen, setIsCreateFormOpen] = useState(false);
  
  // Form state for patient creation
  const [patientFormData, setPatientFormData] = useState({
    nomComplet: '',
    telephonePrincipale: '',
    telephoneSecondaire: '',
    governorate: '',
    delegation: '',
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
    beneficiaire: null as any,
    caisseAffiliation: 'CNSS' as any,
    cnam: false,
    generalNote: '',
    files: [] as File[],
    existingFiles: [] as any[]
  });

  // Fetch patients assigned to the employee
  const { data: patients, isLoading: patientsLoading, error: patientsError } = useQuery({
    queryKey: ['patients', 'assignedToMe'],
    queryFn: async () => {
      console.log('Fetching assigned patients for appointment...');
      const response = await fetch('/api/renseignements/patients?assignedToMe=true');
      if (!response.ok) {
        console.error('Failed to fetch patients:', response.status, response.statusText);
        throw new Error('Failed to fetch patients');
      }
      const data = await response.json();
      console.log('Assigned patients data:', data);
      return data.patients || [];
    },
  });

  // Format patients for appointment selection
  const formatPatients = (rawPatients: any[]): Client[] => {
    if (!rawPatients) {
      console.log('No rawPatients data received');
      return [];
    }
    
    console.log('Raw patients data received:', rawPatients);
    console.log('First patient structure:', rawPatients[0]);
    
    return rawPatients.map(patient => {
      console.log('Processing patient:', patient);
      
      // Use the name from API, or fallback to constructing it
      let patientName = patient.name;
      if (!patientName || patientName.trim() === '') {
        patientName = `${patient.firstName || ''} ${patient.lastName || ''}`.trim();
        if (!patientName) {
          patientName = `Patient ${patient.id}`;
        }
      }
      
      const formattedPatient = {
        id: patient.id,
        name: patientName,
        type: 'patient' as const,
        telephone: patient.telephone,
        firstName: patient.firstName,
        lastName: patient.lastName,
      };
      console.log('Formatted patient:', formattedPatient);
      return formattedPatient;
    });
  };

  const currentClients = formatPatients(patients);

  // Filter clients based on search
  const filteredClients = currentClients.filter(client =>
    client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (client.telephone && client.telephone.includes(searchQuery))
  );

  console.log('Current clients after formatting:', currentClients);
  console.log('Filtered clients:', filteredClients);
  console.log('Search query:', searchQuery);

  const handleClientSelect = (clientId: string) => {
    const client = currentClients.find(c => c.id === clientId);
    if (client) {
      onClientSelect(client);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setPatientFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const handleFileChange = (files: File[]) => {
    setPatientFormData(prev => ({
      ...prev,
      files
    }));
  };

  const handleCreatePatient = async () => {
    try {
      console.log('Creating patient with data:', patientFormData);
      
      // Validate required fields
      if (!patientFormData.nomComplet || !patientFormData.telephonePrincipale) {
        toast({
          title: 'Erreur',
          description: 'Veuillez remplir au moins le nom complet et le téléphone principal',
          variant: 'destructive',
        });
        return;
      }
      
      const apiFormData = new FormData();
      
      // Add form data to FormData object
      Object.entries(patientFormData).forEach(([key, value]) => {
        if (key === 'files' && Array.isArray(value)) {
          // Handle files separately
          value.forEach((file: File) => {
            apiFormData.append('files', file);
          });
        } else if (key === 'existingFiles') {
          // Skip existing files for new patient creation
          return;
        } else if (key === 'beneficiaire' && (value === null || value === '' || value === undefined)) {
          // Skip empty beneficiaire to let API handle it as null
          return;
        } else if (value !== null && value !== undefined && value !== '') {
          apiFormData.append(key, String(value));
        }
      });

      console.log('Sending FormData:', Array.from(apiFormData.entries()));

      const response = await fetch('/api/renseignements/patients', {
        method: 'POST',
        body: apiFormData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const newPatient = await response.json();
      console.log('Created patient:', newPatient);
      
      // Format the new patient for selection
      const formattedPatient: Client = {
        id: newPatient.id,
        name: newPatient.nom || patientFormData.nomComplet,
        type: 'patient',
        telephone: newPatient.telephone || patientFormData.telephonePrincipale,
        firstName: newPatient.firstName,
        lastName: newPatient.lastName,
      };

      // Select the new patient
      onClientSelect(formattedPatient);
      
      // Reset form and close dialog
      setPatientFormData({
        nomComplet: '',
        telephonePrincipale: '',
        telephoneSecondaire: '',
        governorate: '',
        delegation: '',
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
        beneficiaire: null as any,
        caisseAffiliation: 'CNSS' as any,
        cnam: false,
        generalNote: '',
        files: [] as File[],
        existingFiles: [] as any[]
      });
      setIsCreateFormOpen(false);
      
      toast({
        title: 'Succès',
        description: 'Patient créé avec succès',
      });

      // Invalidate and refetch patients list
      await queryClient.invalidateQueries({ queryKey: ['patients'] });

    } catch (error) {
      console.error('Error creating patient:', error);
      toast({
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Erreur lors de la création du patient',
        variant: 'destructive',
      });
    }
  };

  const isLoading = patientsLoading;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Sélection du Patient</h3>
        
        {/* Info about appointment being for patients only */}
        <div className="mb-6 p-4 bg-green-50 rounded-lg border border-green-100">
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-green-600" />
            <div>
              <div className="font-medium text-green-800">Vos Patients Assignés</div>
              <div className="text-sm text-green-600">
                Créez des rendez-vous pour les patients qui vous sont assignés
              </div>
            </div>
          </div>
        </div>

        {/* Patient Selection */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">
              Sélectionner le Patient
            </Label>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCreateFormOpen(true)}
              className="flex items-center gap-2 border-green-200 text-green-600 hover:bg-green-50"
            >
              <Plus className="h-4 w-4" />
              Nouveau Patient
            </Button>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-green-600" />
              <span className="ml-2">Chargement...</span>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Rechercher un patient..."
                  className="pl-10 focus:ring-green-500 focus:border-green-500"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Patient Select */}
              <Select
                value={selectedClient?.id || ''}
                onValueChange={handleClientSelect}
              >
                <SelectTrigger className="focus:ring-green-500 focus:border-green-500">
                  <SelectValue placeholder="Sélectionner un patient" />
                </SelectTrigger>
                <SelectContent className="max-h-[200px]">
                  {filteredClients.length > 0 ? (
                    filteredClients.map((client) => {
                      console.log('Rendering client:', client);
                      return (
                        <SelectItem key={client.id} value={client.id}>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-green-600" />
                            <span>{client.name || 'Nom non disponible'}</span>
                            {client.telephone && (
                              <span className="text-sm text-gray-500">- {client.telephone}</span>
                            )}
                          </div>
                        </SelectItem>
                      );
                    })
                  ) : (
                    <div className="px-2 py-4 text-center text-sm text-gray-500">
                      {searchQuery ? 'Aucun résultat trouvé' : 'Aucun patient assigné trouvé'}
                    </div>
                  )}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Selected Patient Display */}
          {selectedClient && (
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center gap-3">
                <User className="h-5 w-5 text-green-600" />
                <div>
                  <div className="font-medium">{selectedClient.name}</div>
                  <div className="text-sm text-gray-600">
                    Patient{selectedClient.telephone && ` - ${selectedClient.telephone}`}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Error Display */}
          {patientsError && (
            <div className="p-4 bg-red-50 rounded-lg border border-red-200">
              <div className="text-sm text-red-600">
                Erreur lors du chargement des patients: {patientsError.message}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create Patient Dialog */}
      <Dialog open={isCreateFormOpen} onOpenChange={setIsCreateFormOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-green-600" />
              Nouveau Patient
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto py-4">
            <PatientForm 
              formData={patientFormData}
              onInputChange={handleInputChange}
              onFileChange={handleFileChange}
              onBack={() => setIsCreateFormOpen(false)}
              onNext={handleCreatePatient}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default EmployeeAppointmentClientSelectionStep;