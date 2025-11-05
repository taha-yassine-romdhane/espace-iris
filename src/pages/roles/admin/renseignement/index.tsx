import React, { useState, useEffect, useCallback, Suspense, lazy } from 'react';
import { useRouter } from 'next/router';
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import PatientForm from '@/components/forms/PatientForm';
import SocieteForm from '@/components/forms/SocieteForm';
// Lazy load heavy components
const SimpleRenseignementTables = lazy(() => import('./components/SimpleRenseignementTables'));
const FileViewer = lazy(() => import('./components/FileViewer'));

// Loading fallback component
const LoadingFallback = () => (
  <div className="flex items-center justify-center h-64 w-full">
    <div className="flex flex-col items-center space-y-4">
      <div className="h-12 w-12 border-4 border-t-blue-500 border-b-blue-500 border-l-gray-200 border-r-gray-200 rounded-full animate-spin"></div>
      <p className="text-gray-500 font-medium">Chargement en cours...</p>
    </div>
  </div>
);
import { BeneficiaryType } from '@prisma/client';
import { CaisseAffiliation, Renseignement, RenseignementFormData } from '@/types/renseignement';
import { Building, Filter, Search, User, X, FileSpreadsheet } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ExistingFile } from '@/types/forms/PatientFormData';
import ImportExportModal from '@/components/forms/ImportExportModal';

export default function RenseignementPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [isLoading, setIsLoading] = useState(true); // Add loading state
  const [formData, setFormData] = useState<RenseignementFormData>({
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

  const [renseignements, setRenseignements] = useState<Renseignement[]>([]);
  const [filteredRenseignements, setFilteredRenseignements] = useState<Renseignement[]>([]);
  const [showFilesDialog, setShowFilesDialog] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [showImportExportModal, setShowImportExportModal] = useState(false);
  const [importExportType, setImportExportType] = useState<'patients' | 'companies'>('patients');

  // Search and filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    doctor: 'all',
    technician: 'all',
    supervisor: 'all',
    type: 'all',
    cnam: 'all',
    ageRange: 'all',
    city: 'all',
    hasFiles: 'all'
  });
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [availableDoctors, setAvailableDoctors] = useState<{ id: string, name: string }[]>([]);
  const [availableTechnicians, setAvailableTechnicians] = useState<{ id: string, name: string }[]>([]);
  const [availableSupervisors, setAvailableSupervisors] = useState<{ id: string, name: string }[]>([]);
  const [availableCities, setAvailableCities] = useState<string[]>([]);

  // Use a single useEffect for initial data loading
  useEffect(() => {
    // Only fetch on component mount, not on filter changes
    fetchRenseignements();
  }, []); // Empty dependency array for initial load only

  // Add fetchRenseignements function
  const fetchRenseignements = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/renseignements');
      
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      const data = await response.json();
      setRenseignements(data);
    } catch (error) {
      console.error('Error fetching renseignements:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les données",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

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

      const supervisors = renseignements
        .filter(item => item.supervisor)
        .map(item => item.supervisor!)
        .filter((supervisor, index, self) =>
          index === self.findIndex(s => s.id === supervisor.id)
        );

      // Extract unique cities from addresses
      const cities = renseignements
        .map(item => {
          if (item.governorate) return item.governorate;
          if (item.adresse) {
            // Try to extract city from address
            const addressParts = item.adresse.split(',');
            return addressParts[addressParts.length - 1]?.trim();
          }
          return null;
        })
        .filter((city, index, self) => city && city.length > 0 && self.indexOf(city) === index)
        .sort();

      setAvailableDoctors(doctors);
      setAvailableTechnicians(technicians);
      setAvailableSupervisors(supervisors);
      setAvailableCities(cities as string[]);
    }
  }, [renseignements]);

  const applyFiltersAndSearch = useCallback(() => {
    let filtered = [...renseignements];

    // Apply search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(item =>
        (item.nom && item.nom.toLowerCase().includes(query)) ||
        (item.patientCode && item.patientCode.toLowerCase().includes(query)) ||
        (item.companyCode && item.companyCode.toLowerCase().includes(query)) ||
        (item.telephone && item.telephone.includes(query)) ||
        (item.cin && item.cin.includes(query)) ||
        (item.matriculeFiscale && item.matriculeFiscale.includes(query))
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

    // Apply supervisor filter
    if (filters.supervisor && filters.supervisor !== 'all') {
      filtered = filtered.filter(item =>
        item.supervisor && item.supervisor.id === filters.supervisor
      );
    }

    // Apply type filter
    if (filters.type && filters.type !== 'all') {
      filtered = filtered.filter(item => item.type === filters.type);
    }

    // Apply CNAM filter
    if (filters.cnam && filters.cnam !== 'all') {
      if (filters.cnam === 'with') {
        filtered = filtered.filter(item => item.identifiantCNAM && item.identifiantCNAM.trim().length > 0);
      } else if (filters.cnam === 'without') {
        filtered = filtered.filter(item => !item.identifiantCNAM || item.identifiantCNAM.trim().length === 0);
      }
    }

    // Apply age range filter
    if (filters.ageRange && filters.ageRange !== 'all' && filters.ageRange !== '') {
      filtered = filtered.filter(item => {
        if (!item.dateNaissance) return false;
        const birthDate = new Date(item.dateNaissance);
        const today = new Date();
        const age = today.getFullYear() - birthDate.getFullYear();
        
        switch (filters.ageRange) {
          case 'under18': return age < 18;
          case '18-30': return age >= 18 && age <= 30;
          case '31-50': return age >= 31 && age <= 50;
          case '51-70': return age >= 51 && age <= 70;
          case 'over70': return age > 70;
          default: return true;
        }
      });
    }

    // Apply city filter
    if (filters.city && filters.city !== 'all') {
      filtered = filtered.filter(item => {
        if (item.governorate && item.governorate.includes(filters.city)) return true;
        if (item.adresse && item.adresse.includes(filters.city)) return true;
        return false;
      });
    }

    // Apply files filter
    if (filters.hasFiles && filters.hasFiles !== 'all') {
      if (filters.hasFiles === 'with') {
        filtered = filtered.filter(item => item.files && item.files.length > 0);
      } else if (filters.hasFiles === 'without') {
        filtered = filtered.filter(item => !item.files || item.files.length === 0);
      }
    }

    // Update active filters for display
    const newActiveFilters: string[] = [];
    if (filters.doctor && filters.doctor !== 'all') {
      const doctor = availableDoctors.find(d => d.id === filters.doctor);
      if (doctor) newActiveFilters.push(`Dr: ${doctor.name}`);
    }
    if (filters.technician && filters.technician !== 'all') {
      const technician = availableTechnicians.find(t => t.id === filters.technician);
      if (technician) newActiveFilters.push(`Tech: ${technician.name}`);
    }
    if (filters.supervisor && filters.supervisor !== 'all') {
      const supervisor = availableSupervisors.find(s => s.id === filters.supervisor);
      if (supervisor) newActiveFilters.push(`Sup: ${supervisor.name}`);
    }
    if (filters.type && filters.type !== 'all') {
      newActiveFilters.push(`Type: ${filters.type}`);
    }
    if (filters.cnam && filters.cnam !== 'all') {
      newActiveFilters.push(`CNAM: ${filters.cnam === 'with' ? 'Avec' : 'Sans'}`);
    }
    if (filters.ageRange && filters.ageRange !== 'all') {
      const ageLabels = {
        'under18': 'Moins de 18 ans',
        '18-30': '18-30 ans',
        '31-50': '31-50 ans',
        '51-70': '51-70 ans',
        'over70': 'Plus de 70 ans'
      };
      newActiveFilters.push(`Âge: ${ageLabels[filters.ageRange as keyof typeof ageLabels]}`);
    }
    if (filters.city && filters.city !== 'all') {
      newActiveFilters.push(`Ville: ${filters.city}`);
    }
    if (filters.hasFiles && filters.hasFiles !== 'all') {
      newActiveFilters.push(`Documents: ${filters.hasFiles === 'with' ? 'Avec' : 'Sans'}`);
    }

    setActiveFilters(newActiveFilters);
    setFilteredRenseignements(filtered);
  }, [renseignements, searchQuery, filters, availableDoctors, availableTechnicians, availableSupervisors, availableCities]);

  // Apply filters and search whenever the memoized function changes
  useEffect(() => {
    applyFiltersAndSearch();
  }, [applyFiltersAndSearch]);



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

    if (filterKey === 'dr') {
      setFilters(prev => ({ ...prev, doctor: 'all' }));
    } else if (filterKey === 'tech') {
      setFilters(prev => ({ ...prev, technician: 'all' }));
    } else if (filterKey === 'sup') {
      setFilters(prev => ({ ...prev, supervisor: 'all' }));
    } else if (filterKey === 'type') {
      setFilters(prev => ({ ...prev, type: 'all' }));
    } else if (filterKey === 'cnam') {
      setFilters(prev => ({ ...prev, cnam: 'all' }));
    } else if (filterKey === 'âge') {
      setFilters(prev => ({ ...prev, ageRange: 'all' }));
    } else if (filterKey === 'ville') {
      setFilters(prev => ({ ...prev, city: 'all' }));
    } else if (filterKey === 'documents') {
      setFilters(prev => ({ ...prev, hasFiles: 'all' }));
    }
  };

  const clearAllFilters = () => {
    setFilters({
      doctor: 'all',
      technician: 'all',
      supervisor: 'all',
      type: 'all',
      cnam: 'all',
      ageRange: 'all',
      city: 'all',
      hasFiles: 'all'
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
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleEdit = (item: Renseignement) => {

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

  // Handler for viewing details of a patient or company
  const handleViewDetails = (item: Renseignement) => {
    if (item.type === 'Patient') {
      router.push(`/roles/admin/renseignement/patient/${item.id}`);
    } else {
      router.push(`/roles/admin/renseignement/societe/${item.id}`);
    }
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

      const response = await fetch(endpoint, {
        method: isEdit ? 'PUT' : 'POST',
        body: formDataObj,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || `Failed to ${isEdit ? 'update' : 'create'} renseignement`);
      }

      const result = await response.json();

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
     return (
     <div className="container mx-auto py-6 space-y-6">
       {/* Header */}
       <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg p-6 text-white">
         <h1 className="text-3xl font-bold">Renseignements</h1>
       </div>
       
       <div className="bg-white rounded-lg shadow-sm border p-4">
         <div className="flex flex-wrap justify-between items-center gap-4">
           <div className="flex flex-wrap gap-2">
             <Button
               onClick={() => {
                 resetForm();
                 setFormData(prev => ({ ...prev, type: 'Patient' }));
                 setIsOpen(true);
               }}
               className="bg-blue-600 hover:bg-blue-700"
             >
               <User className="mr-2 h-4 w-4" />
               Nouveau Patient
             </Button>
             <Button
               onClick={() => {
                 resetForm();
                 setFormData(prev => ({ ...prev, type: 'Société' }));
                 setIsOpen(true);
               }}
               className="bg-indigo-600 hover:bg-indigo-700"
             >
               <Building className="mr-2 h-4 w-4" />
               Nouvelle Société
             </Button>
             
             {/* Import/Export Buttons */}
             <Button
               onClick={() => {
                 setImportExportType('patients');
                 setShowImportExportModal(true);
               }}
               variant="outline"
               className="border-green-600 text-green-600 hover:bg-green-50"
               size="sm"
             >
               <FileSpreadsheet className="mr-1 h-4 w-4" />
               Excel Patients
             </Button>
             <Button
               onClick={() => {
                 setImportExportType('companies');
                 setShowImportExportModal(true);
               }}
               variant="outline"
               className="border-green-600 text-green-600 hover:bg-green-50"
               size="sm"
             >
               <FileSpreadsheet className="mr-1 h-4 w-4" />
               Excel Sociétés
             </Button>
           </div>
         </div>
       </div>

       <div className="bg-white rounded-lg shadow-sm border p-4">
         <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
           <div className="flex flex-col md:flex-row items-start md:items-center gap-4 flex-1">
             <div className="relative w-full max-w-md">
               <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
               <Input
                 type="search"
                 value={searchQuery}
                 onChange={handleSearchChange}
                 placeholder="Rechercher par nom, téléphone, CIN..."
                 className="w-full pl-10 pr-4"
               />
             </div>
             <Popover>
               <PopoverTrigger asChild>
                 <Button variant="outline" className="h-10 whitespace-nowrap">
                   <Filter className="h-4 w-4 mr-2" />
                   Filtres {activeFilters.length > 0 && `(${activeFilters.length})`}
                 </Button>
               </PopoverTrigger>
            <PopoverContent className="w-96 max-h-[600px] overflow-y-auto">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Type</h4>
                    <Select
                      value={filters.type}
                      onValueChange={(value) => handleFilterChange('type', value)}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue placeholder="Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tous</SelectItem>
                        <SelectItem value="Patient">Patient</SelectItem>
                        <SelectItem value="Société">Société</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">CNAM</h4>
                    <Select
                      value={filters.cnam}
                      onValueChange={(value) => handleFilterChange('cnam', value)}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue placeholder="CNAM" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tous</SelectItem>
                        <SelectItem value="with">Avec CNAM</SelectItem>
                        <SelectItem value="without">Sans CNAM</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Tranche d'âge</h4>
                    <Select
                      value={filters.ageRange}
                      onValueChange={(value) => handleFilterChange('ageRange', value)}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue placeholder="Âge" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tous</SelectItem>
                        <SelectItem value="under18">Moins de 18</SelectItem>
                        <SelectItem value="18-30">18-30 ans</SelectItem>
                        <SelectItem value="31-50">31-50 ans</SelectItem>
                        <SelectItem value="51-70">51-70 ans</SelectItem>
                        <SelectItem value="over70">Plus de 70</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Documents</h4>
                    <Select
                      value={filters.hasFiles}
                      onValueChange={(value) => handleFilterChange('hasFiles', value)}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue placeholder="Documents" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tous</SelectItem>
                        <SelectItem value="with">Avec documents</SelectItem>
                        <SelectItem value="without">Sans documents</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Médecin responsable</h4>
                  <Select
                    value={filters.doctor}
                    onValueChange={(value) => handleFilterChange('doctor', value)}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue placeholder="Médecin" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous</SelectItem>
                      {availableDoctors.map(doctor => (
                        <SelectItem key={doctor.id} value={doctor.id}>
                          {doctor.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Technicien responsable</h4>
                  <Select
                    value={filters.technician}
                    onValueChange={(value) => handleFilterChange('technician', value)}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue placeholder="Technicien" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous</SelectItem>
                      {availableTechnicians.map(technician => (
                        <SelectItem key={technician.id} value={technician.id}>
                          {technician.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Superviseur</h4>
                  <Select
                    value={filters.supervisor}
                    onValueChange={(value) => handleFilterChange('supervisor', value)}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue placeholder="Superviseur" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous</SelectItem>
                      {availableSupervisors.map(supervisor => (
                        <SelectItem key={supervisor.id} value={supervisor.id}>
                          {supervisor.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {availableCities.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Ville/Région</h4>
                    <Select
                      value={filters.city}
                      onValueChange={(value) => handleFilterChange('city', value)}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue placeholder="Ville" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Toutes</SelectItem>
                        {availableCities.map(city => (
                          <SelectItem key={city} value={city}>
                            {city}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="flex justify-between pt-2 border-t">
                  <Button variant="outline" size="sm" onClick={clearAllFilters}>
                    Réinitialiser
                  </Button>
                  <span className="text-sm text-gray-500">
                    {filteredRenseignements.length} résultat{filteredRenseignements.length > 1 ? 's' : ''}
                  </span>
                </div>
              </div>
            </PopoverContent>
          </Popover>
           </div>
           
           <div className="flex flex-wrap gap-2">
             {activeFilters.map(filter => (
               <Badge key={filter} variant="secondary" className="cursor-pointer flex items-center gap-1 text-xs">
                 {filter}
                 <X className="h-3 w-3" onClick={() => clearFilter(filter)} />
               </Badge>
             ))}
             {activeFilters.length > 0 && (
               <Button variant="ghost" size="sm" onClick={clearAllFilters} className="h-6 text-xs">
                 Effacer tous
               </Button>
             )}
           </div>
         </div>
       </div>

       <div className="bg-white rounded-lg shadow-sm border">
         {isLoading ? (
           <div className="p-8">
             <LoadingFallback />
           </div>
         ) : (
           <Suspense fallback={<div className="p-8"><LoadingFallback /></div>}>
             <SimpleRenseignementTables
               data={filteredRenseignements}
               onEdit={handleEdit}
               onDelete={handleDelete}
               onViewDetails={handleViewDetails}
               isLoading={isLoading}
               initialItemsPerPage={100}
             />
           </Suspense>
         )}
       </div>

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

      <Suspense fallback={<LoadingFallback />}>
        <FileViewer
          files={selectedFiles}
          isOpen={showFilesDialog}
          onClose={() => setShowFilesDialog(false)}
        />
      </Suspense>

      <ImportExportModal
        isOpen={showImportExportModal}
        onClose={() => setShowImportExportModal(false)}
        type={importExportType}
        onImportComplete={fetchRenseignements}
      />
    </div>
  );
}