import React, { useState, useEffect, lazy, Suspense } from 'react';
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import PatientForm from '@/components/forms/PatientForm';
import SocieteForm from '@/components/forms/SocieteForm';
import EmployeeSimpleRenseignementTables from './components/EmployeeSimpleRenseignementTables';
import { FileViewer } from './components/FileViewer';
import { BeneficiaryType } from '@prisma/client';
import { CaisseAffiliation, Renseignement, RenseignementFormData } from '@/types/renseignement';
import { Building, Filter, Search, User, X } from 'lucide-react';
import { ExistingFile } from '@/types/forms/PatientFormData';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import EmployeeLayout from '../EmployeeLayout';
import { useSession } from 'next-auth/react';


export default function RenseignementPage() {
  const { toast } = useToast();
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [formData, setFormData] = useState<RenseignementFormData>({
    type: 'Patient',
    nomComplet: '',
    telephonePrincipale: '',
    telephoneSecondaire: '',
    detailedAddress: '',
    cin: '',
    identifiantCNAM: '',
    technicienResponsable: '',
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

  const [renseignements, setRenseignements] = useState<Renseignement[]>([]);
  const [filteredRenseignements, setFilteredRenseignements] = useState<Renseignement[]>([]);
  const [showFilesDialog, setShowFilesDialog] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  
  // Search and filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    doctor: 'all',
    technician: 'all'
  });
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [availableDoctors, setAvailableDoctors] = useState<{id: string, name: string}[]>([]);
  const [availableTechnicians, setAvailableTechnicians] = useState<{id: string, name: string}[]>([]);

  useEffect(() => {
    if (session) {
      fetchRenseignements();
    }
  }, [searchQuery, filters, session]);

  // Apply filters and search whenever renseignements, searchQuery, or filters change
  useEffect(() => {
    applyFiltersAndSearch();
  }, [renseignements, searchQuery, filters]);

  // Extract unique doctors and technicians from renseignements
  useEffect(() => {
    if (renseignements.length > 0) {
      const doctors = renseignements
        .filter(item => item.doctor)
        .map(item => item.doctor!)
        .filter((doctor, index, self) => 
          index === self.findIndex(d => d.id === doctor.id)
        );
      
      const technicians = renseignements
        .filter(item => item.technician)
        .map(item => item.technician!)
        .filter((technician, index, self) => 
          index === self.findIndex(t => t.id === technician.id)
        );
      
      setAvailableDoctors(doctors);
      setAvailableTechnicians(technicians);
    }
  }, [renseignements]);

  const applyFiltersAndSearch = () => {
    let filtered = [...renseignements];
    
    // Apply search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(item => 
        item.nom.toLowerCase().includes(query) || 
        item.telephone.toLowerCase().includes(query) ||
        (item.adresse && item.adresse.toLowerCase().includes(query)) ||
        (item.type === 'Patient' && item.cin && item.cin.toLowerCase().includes(query)) ||
        (item.type === 'Société' && item.matriculeFiscale && item.matriculeFiscale.toLowerCase().includes(query)) ||
        (item.detailedAddress && item.detailedAddress.toLowerCase().includes(query)) ||
        (item.telephoneSecondaire && item.telephoneSecondaire.toLowerCase().includes(query))
      );
    }
    
    // Apply doctor filter
    if (filters.doctor && filters.doctor !== 'all') {
      filtered = filtered.filter(item => 
        item.doctor && item.doctor.id === filters.doctor
      );
    }
    
    // Apply technician filter
    if (filters.technician && filters.technician !== 'all') {
      filtered = filtered.filter(item => 
        item.technician && item.technician.id === filters.technician
      );
    }
    
    // Update active filters for display
    const newActiveFilters: string[] = [];
    if (filters.doctor && filters.doctor !== 'all') {
      const doctor = availableDoctors.find(d => d.id === filters.doctor);
      if (doctor) newActiveFilters.push(`Dr. ${doctor.name}`);
    }
    if (filters.technician && filters.technician !== 'all') {
      const technician = availableTechnicians.find(t => t.id === filters.technician);
      if (technician) newActiveFilters.push(`Tech: ${technician.name}`);
    }
    
    setActiveFilters(newActiveFilters);
    setFilteredRenseignements(filtered);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleFilterChange = (key: keyof typeof filters, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const clearFilter = (filter: string) => {
    const filterKey = filter.split(':')[0].trim().toLowerCase();
    
    if (filterKey === 'dr' || filterKey === 'dr.') {
      setFilters(prev => ({ ...prev, doctor: 'all' }));
    } else if (filterKey === 'tech') {
      setFilters(prev => ({ ...prev, technician: 'all' }));
    }
  };

  const clearAllFilters = () => {
    setFilters({
      doctor: 'all',
      technician: 'all'
    });
    setSearchQuery('');
  };

  const handleFileChange = (files: File[] | ExistingFile[]) => {
    // Type guard to check if we're dealing with File[] or ExistingFile[]
    const isFileArray = (files: any[]): files is File[] => {
      return files.length > 0 && 'lastModified' in files[0];
    };

    if (isFileArray(files)) {
      // Handle standard File objects (new uploads)
      setFormData(prevFormData => ({
        ...prevFormData,
        files: files,
        images: files // Only assign File[] to images
      }));
    } else {
      // Handle ExistingFile objects
      setFormData(prevFormData => ({
        ...prevFormData,
        existingFiles: files
      }));
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    console.log(`Updating form field: ${name} = ${value}`);
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleEdit = (item: Renseignement) => {
    console.log('Editing item:', item); // Debug log

    if (item.type === 'Société') {
      const formData: RenseignementFormData = {
        id: item.id,
        type: 'Société' as const,
        nomComplet: '',
        cin: '',
        identifiantCNAM: '',
        antecedant: '',
        taille: '',
        poids: '',
        medecin: '',
        dateNaissance: '',
        beneficiaire: undefined,
        caisseAffiliation: undefined,
        cnam: false,
        nomSociete: item.nom,
        matriculeFiscale: item.matriculeFiscale || '',
        telephonePrincipale: item.telephone,
        telephoneSecondaire: item.telephoneSecondaire || '',
        governorate: item.governorate || '',
        delegation: item.delegation || '',
        detailedAddress: item.detailedAddress || '',
        technicienResponsable: item.technician?.id || '',
        generalNote: (item as any).generalNote || '',
        images: [],
        files: [],
        existingFiles: item.files || [],
      };
      
      console.log('Setting société form data:', formData);
      setFormData(formData);
    } else {
      // Map patient data to form fields
      const formData: RenseignementFormData = {
        id: item.id,
        type: 'Patient',
        // Map the fields using the correct names from the API
        nomComplet: item.nom || '',
        telephonePrincipale: item.telephone || '',
        telephoneSecondaire: item.telephoneSecondaire || '',
        governorate: item.governorate || '',
        delegation: item.delegation || '',
        detailedAddress: item.detailedAddress || '',
        cin: item.cin || '',
        identifiantCNAM: item.identifiantCNAM || '',
        technicienResponsable: item.technician?.id || '',
        superviseur: (item as any).supervisor?.id || '',
        antecedant: item.antecedant || '',
        taille: item.taille?.toString() || '',
        poids: item.poids?.toString() || '',
        medecin: item.doctor?.id || '',
        dateNaissance: item.dateNaissance || '',
        beneficiaire: item.beneficiaire || BeneficiaryType.ASSURE_SOCIAL,
        caisseAffiliation: item.caisseAffiliation as CaisseAffiliation,
        cnam: !!item.cnam,
        generalNote: (item as any).generalNote || '',
        addressCoordinates: (item as any).addressCoordinates ? JSON.stringify((item as any).addressCoordinates) : '',
        // Files
        images: [],
        files: [],
        existingFiles: item.files || []
      };
      
      console.log('Patient data from API:', item);
      console.log('Transformed form data:', formData);
      setFormData(formData);
    }
    setIsEdit(true);
    setIsOpen(true);
  };

  const handleDelete = async (ids: string[]) => {
    // Get the first ID's type since we're currently only handling single deletes
    const itemToDelete = renseignements.find(item => item.id === ids[0]);
    if (!itemToDelete) return;

    try {
      const response = await fetch(`/api/renseignements/${itemToDelete.type === 'Patient' ? 'patients' : 'companies'}/${ids[0]}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete');
      }

      // Remove the deleted item from the state
      setRenseignements(prev => prev.filter(item => !ids.includes(item.id)));
      
      toast({
        title: "Supprimé avec succès",
        description: `${itemToDelete.type} a été supprimé avec succès.`,
      });
    } catch (error) {
      console.error('Error deleting:', error);
      toast({
        title: "Erreur",
        description: "Une erreur s'est produite lors de la suppression.",
        variant: "destructive",
      });
    }
  };


  const handleViewFiles = (files: { url: string; type: string }[]) => {
    if (!files || files.length === 0) {
      toast({
        title: "Aucun fichier",
        description: "Aucun fichier n'est disponible pour cet élément.",
      });
      return;
    }
    setSelectedFiles(files.map(file => file.url));
    setShowFilesDialog(true);
  };

  const resetForm = () => {
    setFormData({
      type: 'Patient',
      nomComplet: '',
      telephonePrincipale: '',
      telephoneSecondaire: '',
      detailedAddress: '',
      cin: '',
      identifiantCNAM: '',
      technicienResponsable: '',
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
    setIsEdit(false);
  };

  const handleSubmit = async () => {
    try {
      // Determine which endpoint to use based on the type
      const endpoint = formData.type === 'Patient' 
        ? '/api/renseignements/patients'
        : '/api/renseignements/companies';
      
      // Create FormData instance for file upload
      const formDataObj = new FormData();
      
      // Add all form fields
      Object.entries(formData).forEach(([key, value]) => {
        if (value !== undefined && value !== null && key !== 'files' && key !== 'images' && key !== 'existingFiles') {
          formDataObj.append(key, value.toString());
        }
      });

      // Add files if present
      if (formData.files && formData.files.length > 0) {
        formData.files.forEach((file: File) => {
          formDataObj.append('files', file);
        });
      }

      // Add existing files (includes temporary files for new patients/companies)
      if (formData.existingFiles && formData.existingFiles.length > 0) {
        formDataObj.append('existingFiles', JSON.stringify(formData.existingFiles));
      }
      
      // Add ID if editing
      if (isEdit && formData.id) {
        formDataObj.append('id', formData.id);
      }

      console.log('Submitting form data:', {
        ...formData,
        files: formData.files?.length || 0,
        existingFiles: formData.existingFiles?.length || 0
      });

      const response = await fetch(endpoint, {
        method: isEdit ? 'PUT' : 'POST',
        body: formDataObj,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || `Failed to ${isEdit ? 'update' : 'create'} renseignement`);
      }

      const result = await response.json();
      console.log('Server response:', result);

      toast({
        title: "Succès",
        description: `Renseignement ${isEdit ? 'mis à jour' : 'créé'} avec succès`,
      });

      setIsOpen(false);
      await fetchRenseignements();
    } catch (error) {
      console.error('Error submitting form:', error);
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Une erreur est survenue lors de l'enregistrement",
        variant: "destructive",
      });
    }
  };

  const fetchRenseignements = async () => {
    try {
      const response = await fetch('/api/renseignements');
      const data = await response.json();

      // API now filters by employee role server-side
      setRenseignements(data);
    } catch (error) {
      console.error('Error fetching renseignements:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les renseignements",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Renseignements</h1>
          <p className="text-sm text-gray-600 mt-1">
            Patients et sociétés qui vous sont assignés
          </p>
        </div>
        <div className="space-x-2">
          <Button 
            onClick={() => {
              resetForm();
              setFormData(prev => ({ ...prev, type: 'Patient' }));
              setIsOpen(true);
            }}
            className="bg-green-900 hover:bg-green-700"
          >
            <User className="mr-2 h-4 w-4" />
            Ajouter Patient
          </Button>
          <Button 
            onClick={() => {
              resetForm();
              setFormData(prev => ({ ...prev, type: 'Société' }));
              setIsOpen(true);
            }}
            className="bg-green-900  hover:bg-green-700"
          >
            <Building className="mr-2 h-4 w-4" />
            Ajouter Société
          </Button>
        </div>
      </div>

      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-4">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="search"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Rechercher par nom, téléphone, CIN, adresse..."
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
            />
          </div>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="h-10 border-green-200 hover:bg-green-50">
                <Filter className="h-4 w-4 mr-2 text-green-600" />
                Filtres
                {activeFilters.length > 0 && (
                  <Badge variant="secondary" className="ml-2 bg-green-100 text-green-800">
                    {activeFilters.length}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <div className="space-y-4">
                <div className="space-y-2">
                  <h4 className="font-medium text-gray-900">Médecin responsable</h4>
                  <Select
                    value={filters.doctor}
                    onValueChange={(value) => handleFilterChange('doctor', value)}
                  >
                    <SelectTrigger className="border-gray-200 focus:border-green-500 focus:ring-green-500">
                      <SelectValue placeholder="Tous les médecins" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous les médecins</SelectItem>
                      {availableDoctors.map(doctor => (
                        <SelectItem key={doctor.id} value={doctor.id}>
                          Dr. {doctor.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <h4 className="font-medium text-gray-900">Technicien responsable</h4>
                  <Select
                    value={filters.technician}
                    onValueChange={(value) => handleFilterChange('technician', value)}
                  >
                    <SelectTrigger className="border-gray-200 focus:border-green-500 focus:ring-green-500">
                      <SelectValue placeholder="Tous les techniciens" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous les techniciens</SelectItem>
                      {availableTechnicians.map(technician => (
                        <SelectItem key={technician.id} value={technician.id}>
                          {technician.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex justify-end pt-2 border-t border-gray-100">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={clearAllFilters}
                    className="text-green-600 border-green-200 hover:bg-green-50"
                  >
                    Réinitialiser
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
        
        {/* Active Filters Display */}
        {activeFilters.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {activeFilters.map(filter => (
              <Badge 
                key={filter} 
                variant="secondary" 
                className="cursor-pointer flex items-center gap-1 bg-green-100 text-green-800 hover:bg-green-200"
              >
                {filter} 
                <X className="h-3 w-3" onClick={() => clearFilter(filter)} />
              </Badge>
            ))}
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={clearAllFilters}
              className="text-green-600 hover:bg-green-50"
            >
              Effacer tous
            </Button>
          </div>
        )}
      </div>

      <EmployeeSimpleRenseignementTables
        data={filteredRenseignements}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onViewDetails={(item) => {
          // Navigate to details page
          if (item.type === 'Patient') {
            window.location.href = `/roles/employee/renseignement/patient/${item.id}`;
          } else {
            window.location.href = `/roles/employee/renseignement/societe/${item.id}`;
          }
        }}
        isLoading={false}
        initialItemsPerPage={100}
      />

      {isOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          {/* Modal backdrop with blur effect */}
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsOpen(false)}></div>

          {/* Modal container */}
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col m-4">
            {/* Modal header */}
            <div className="flex justify-between items-center border-b border-gray-200 p-4 bg-gray-50">
              <h3 className="text-lg font-medium">
                {isEdit 
                  ? `Modifier ${formData.type === 'Patient' ? 'un patient' : 'une société'}`
                  : `Ajouter ${formData.type === 'Patient' ? 'un patient' : 'une société'}`
                }
              </h3>
              <button 
                onClick={() => setIsOpen(false)}
                className="text-gray-500 hover:text-gray-700 focus:outline-none"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            {/* Modal content - direct container for the form */}
            <div className="flex-1 overflow-auto">
              {formData.type === 'Patient' ? (
                <PatientForm
                  formData={formData}
                  onInputChange={handleInputChange}
                  onFileChange={handleFileChange}
                  onBack={() => setIsOpen(false)}
                  onNext={handleSubmit}
                />
              ) : (
                <SocieteForm
                  formData={formData}
                  onInputChange={handleInputChange}
                  onFileChange={handleFileChange}
                  onBack={() => setIsOpen(false)}
                  onNext={handleSubmit}
                />
              )}
            </div>
          </div>
        </div>
      )}

      <FileViewer
        files={selectedFiles}
        isOpen={showFilesDialog}
        onClose={() => setShowFilesDialog(false)}
      />
    </div>
  );
}

RenseignementPage.getLayout = function getLayout(page: React.ReactElement) {
  return <EmployeeLayout>{page}</EmployeeLayout>;
};
