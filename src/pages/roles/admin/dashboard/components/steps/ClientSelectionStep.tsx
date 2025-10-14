import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, User, Building2, Users, Building, ChevronRight, X, UserPlus, BuildingIcon, Search, Calendar, Shield, Import } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import PatientForm from "@/components/forms/PatientForm";
import SocieteForm from "@/components/forms/SocieteForm";
import { BeneficiaryType } from "@/types";
import { cn } from "@/lib/utils";
import { ExistingFile } from "@/types/forms/PatientFormData";
import { toast } from "@/components/ui/use-toast";

interface Client {
  id: string;
  name: string;
  hasOngoingDiagnostic?: boolean;
  ongoingDiagnosticId?: string | null;
  // Additional fields for patient details
  firstName?: string;
  lastName?: string;
  telephone?: string;
  address?: string;
  dateOfBirth?: string;
  cin?: string;
}

interface ExistingRentalData {
  isExistingRental: boolean;
  importDate?: Date;
  hasActiveCnam?: boolean;
  cnamExpirationDate?: Date;
  cnamMonthlyAmount?: number;
  currentUnpaidAmount?: number;
}

interface ClientSelectionStepProps {
  onNext: () => void;
  onClose: () => void;
  onClientTypeChange: (type: "patient" | "societe") => void;
  onClientSelect: (clientId: string) => void;
  onClientAdd?: (newClient: Client) => void;
  clientType: "patient" | "societe" | null;
  selectedClient: string | null;
  action: "location" | "vente" | "diagnostique" | null;
  onExistingRentalDataChange?: (data: ExistingRentalData) => void;
}

export function ClientSelectionStep({
  onNext,
  onClose,
  onClientTypeChange,
  onClientSelect,
  onClientAdd,
  clientType,
  selectedClient,
  action,
  onExistingRentalDataChange,
}: ClientSelectionStepProps) {
  const [isCreateFormOpen, setIsCreateFormOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Existing rental state
  const [existingRentalData, setExistingRentalData] = useState<ExistingRentalData>({
    isExistingRental: false,
    importDate: new Date(),
    hasActiveCnam: false,
    cnamExpirationDate: undefined,
    cnamMonthlyAmount: 0,
    currentUnpaidAmount: 0,
  });
  
  // Patient form state
  const [patientFormData, setPatientFormData] = useState({
    nomComplet: "",
    telephonePrincipale: "",
    telephoneSecondaire: "",
    adresseComplete: "",
    cin: "",
    identifiantCNAM: "",
    technicienResponsable: "",
    antecedant: "",
    taille: "",
    poids: "",
    medecin: "",
    dateNaissance: "",
    beneficiaire: "" as BeneficiaryType,
    caisseAffiliation: "CNSS" as "CNSS" | "CNRPS",
    cnam: false,
    description1: "",
    description2: "",
  });

  // Societe form state
  const [societeFormData, setSocieteFormData] = useState({
    nomSociete: "",
    telephonePrincipale: "",
    telephoneSecondaire: "",
    adresseComplete: "",
    matriculeFiscale: "",
    technicienResponsable: "",
    descriptionNom: "",
    descriptionTelephone: "",
    descriptionAdresse: "",
  });

  const handlePatientInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setPatientFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSocieteInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setSocieteFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePatientFileChange = (files: File[] | ExistingFile[]) => {
    if (files && files.length > 0) {
      // Set the first file as the image regardless of type
      setPatientFormData(prev => ({ ...prev, img: files[0] }));
    }
  };

  const handleSocieteFileChange = (files: File[] | ExistingFile[]) => {
    if (files && files.length > 0) {
      // Type guard to check if we're dealing with File[] or ExistingFile[]
      const isExistingFile = (file: any): file is ExistingFile => {
        return 'url' in file;
      };

      // Set the first file as the image regardless of type
      setSocieteFormData(prev => ({ 
        ...prev, 
        img: files[0] 
      }));
    }
  };

  // Custom handler for client selection that prevents selecting patients with ongoing diagnostics
  const handleClientSelect = (clientId: string) => {
    // For diagnostic stepper, check if patient has ongoing diagnostic
    if (action === "diagnostique" && clientType === "patient") {
      const selectedPatient = clients.find(client => client.id === clientId);
      
      if (selectedPatient?.hasOngoingDiagnostic) {
        // Show error or toast message
        return; // Prevent selection
      }
    }
    
    // If not diagnostic stepper or patient doesn't have ongoing diagnostic, proceed with selection
    onClientSelect(clientId);
  };
  
  const handleCreateSuccess = async (formData: any) => {
    try {
      // Create FormData object as the API expects multipart form data
      const apiFormData = new FormData();
      
      if (clientType === "patient") {
        // Map patient form data to API expected fields
        Object.entries(formData).forEach(([key, value]) => {
          if (value !== null && value !== undefined && value !== "") {
            apiFormData.append(key, value as string);
          }
        });
        
        const response = await fetch('/api/renseignements/patients', {
          method: 'POST',
          body: apiFormData
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to create patient');
        }
        
        const newPatient = await response.json();
        
        // Update the clients list with the new patient
        const newClientData = {
          id: newPatient.id,
          name: `${newPatient.lastName} ${newPatient.firstName}`,
          hasOngoingDiagnostic: false,
          ongoingDiagnosticId: null,
          // Pass additional patient details for immediate display
          firstName: newPatient.firstName,
          lastName: newPatient.lastName,
          telephone: newPatient.telephone,
          address: newPatient.detailedAddress,
          dateOfBirth: newPatient.dateOfBirth,
          cin: newPatient.cin
        };
        
        // Add to local clients list
        setClients(prevClients => [...prevClients, newClientData]);
        
        // Add to clients list via callback
        if (onClientAdd) {
          onClientAdd(newClientData);
        }
        
        // Select the new client
        handleClientSelect(newPatient.id);
        
        // Show success message
        toast({
          title: "Succès",
          description: "Patient créé avec succès",
        });
        
      } else if (clientType === "societe") {
        // Map company form data to API expected fields
        Object.entries(formData).forEach(([key, value]) => {
          if (value !== null && value !== undefined && value !== "") {
            apiFormData.append(key, value as string);
          }
        });
        
        const response = await fetch('/api/renseignements/companies', {
          method: 'POST',
          body: apiFormData
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to create company');
        }
        
        const newCompany = await response.json();
        
        // Update the clients list with the new company
        const newClientData = {
          id: newCompany.id,
          name: newCompany.companyName,
          // For companies, we might want different fields
          companyName: newCompany.companyName,
          telephone: newCompany.telephone,
          address: newCompany.detailedAddress
        };
        
        // Add to local clients list
        setClients(prevClients => [...prevClients, newClientData]);
        
        // Add to clients list via callback
        if (onClientAdd) {
          onClientAdd(newClientData);
        }
        
        // Select the new client
        handleClientSelect(newCompany.id);
        
        // Show success message
        toast({
          title: "Succès",
          description: "Société créée avec succès",
        });
      }
      
      setIsCreateFormOpen(false);
      setSearchQuery(""); // Reset search query
      
      // Reset form data
      if (clientType === "patient") {
        setPatientFormData({
          nomComplet: "",
          telephonePrincipale: "",
          telephoneSecondaire: "",
          adresseComplete: "",
          cin: "",
          identifiantCNAM: "",
          technicienResponsable: "",
          antecedant: "",
          taille: "",
          poids: "",
          medecin: "",
          dateNaissance: "",
          beneficiaire: "" as BeneficiaryType,
          caisseAffiliation: "CNSS",
          cnam: false,
          description1: "",
          description2: "",
        });
      } else {
        setSocieteFormData({
          nomSociete: "",
          telephonePrincipale: "",
          telephoneSecondaire: "",
          adresseComplete: "",
          matriculeFiscale: "",
          technicienResponsable: "",
          descriptionNom: "",
          descriptionTelephone: "",
          descriptionAdresse: "",
        });
      }
      
    } catch (error) {
      console.error('Error creating client:', error);
      toast({
        title: "Erreur",
        description: `Erreur lors de la création`,
        variant: "destructive"
      });
    }
  };

  // Fetch clients when client type changes
  const fetchClients = async (type: "patient" | "societe") => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/clients?type=${type}`);
      if (!response.ok) {
        throw new Error("Failed to fetch clients");
      }
      const data = await response.json();
      // Ensure data is an array
      const clientsArray = Array.isArray(data) ? data : (data.clients || data.data || []);
      setClients(clientsArray);
    } catch (error) {
      console.error("Error fetching clients:", error);
      setError("Erreur lors du chargement des données");
      setClients([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch clients when clientType changes
  useEffect(() => {
    if (clientType) {
      fetchClients(clientType);
    }
  }, [clientType]);

  // Filter clients based on search query
  const filteredClients = useMemo(() => {
    return clients.filter((client) => {
      if (!client) return false;
      if (!searchQuery.trim()) return true;
      
      return client.name.toLowerCase().includes(searchQuery.toLowerCase());
    });
  }, [clients, searchQuery]);
  
  // For diagnostic stepper, show all clients but mark those with ongoing diagnostics
  // For display purposes only - actual selection will be prevented in onClientSelect handler

  // Determine if we should show the client type selection
  // For location and diagnostic, we only allow patient selection
  const showClientTypeSelection = action === "vente";

  // If it's a location or diagnostic, automatically select patient type
  useEffect(() => {
    if ((action === "location" || action === "diagnostique") && clientType !== "patient") {
      onClientTypeChange("patient");
    }
  }, [action, clientType, onClientTypeChange]);

  // Notify parent component when existing rental data changes
  useEffect(() => {
    if (onExistingRentalDataChange) {
      onExistingRentalDataChange(existingRentalData);
    }
  }, [existingRentalData, onExistingRentalDataChange]);

  // Handle existing rental data changes
  const handleExistingRentalDataChange = (field: keyof ExistingRentalData, value: any) => {
    setExistingRentalData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <>
      <div className="space-y-6">
        {showClientTypeSelection ? (
          <div>
            <Label className="text-base font-semibold text-[#1e3a8a]">Type de Client</Label>
            <RadioGroup
              className="grid grid-cols-2 gap-4 mt-4"
              value={clientType || ""}
              onValueChange={(value) => onClientTypeChange(value as "patient" | "societe")}
            >
              <div className={cn(
                "flex items-center space-x-3 border rounded-lg p-4 cursor-pointer transition-all",
                "hover:border-[#1e3a8a] hover:bg-blue-50",
                clientType === "patient" ? "border-[#1e3a8a] bg-blue-50" : "border-gray-200"
              )}>
                <RadioGroupItem value="patient" id="patient" className="text-[#1e3a8a]" />
                <Label htmlFor="patient" className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <User className="h-5 w-5 text-[#1e3a8a]" />
                    <div>
                      <div className="font-medium text-[#1e3a8a]">Patient</div>
                      <div className="text-sm text-gray-500">Particulier</div>
                    </div>
                  </div>
                </Label>
              </div>
              <div className={cn(
                "flex items-center space-x-3 border rounded-lg p-4 cursor-pointer transition-all",
                "hover:border-[#1e3a8a] hover:bg-blue-50",
                clientType === "societe" ? "border-[#1e3a8a] bg-blue-50" : "border-gray-200"
              )}>
                <RadioGroupItem value="societe" id="societe" className="text-[#1e3a8a]" />
                <Label htmlFor="societe" className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-[#1e3a8a]" />
                    <div>
                      <div className="font-medium text-[#1e3a8a]">Société</div>
                      <div className="text-sm text-gray-500">Entreprise</div>
                    </div>
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </div>
        ) : (
          // For location , just show a message indicating patient selection
          <div>
            <Label className="text-base font-semibold text-[#1e3a8a]">Type de Client</Label>
            <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-100">
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-[#1e3a8a]" />
                <div>
                  <div className="font-medium text-[#1e3a8a]">Patient</div>
                  <div className="text-sm text-gray-600">
                    {action === "location" ? 
                      "Les locations sont uniquement disponibles pour les patients" : 
                      "Les services de diagnostic sont uniquement disponibles pour les patients"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Existing Rental Section - Only show for locations */}
        {action === "location" && (
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="existing-rental"
                checked={existingRentalData.isExistingRental}
                onCheckedChange={(checked) => 
                  handleExistingRentalDataChange('isExistingRental', checked)
                }
              />
              <Label htmlFor="existing-rental" className="text-base font-semibold text-[#1e3a8a] flex items-center gap-2">
                <Import className="h-5 w-5" />
                Il s'agit d'une location existante
              </Label>
            </div>
            
            {existingRentalData.isExistingRental && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-4">
                <p className="text-sm text-blue-800 mb-4">
                  Configurez les détails de cette location existante pour commencer le suivi depuis une date spécifique.
                </p>
                
                {/* Import Date */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Commencer le suivi à partir de</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start">
                          <Calendar className="mr-2 h-4 w-4" />
                          {existingRentalData.importDate ? 
                            format(existingRentalData.importDate, "dd/MM/yyyy", { locale: fr }) : 
                            "Sélectionner une date"
                          }
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <CalendarComponent
                          mode="single"
                          selected={existingRentalData.importDate}
                          onSelect={(date) => handleExistingRentalDataChange('importDate', date)}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  
                  {/* Current Unpaid Amount */}
                  <div className="space-y-2">
                    <Label>Montant impayé actuel (DT)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={existingRentalData.currentUnpaidAmount || ''}
                      onChange={(e) => handleExistingRentalDataChange('currentUnpaidAmount', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                </div>
                
                {/* CNAM Section */}
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="has-active-cnam"
                      checked={existingRentalData.hasActiveCnam}
                      onCheckedChange={(checked) => 
                        handleExistingRentalDataChange('hasActiveCnam', checked)
                      }
                    />
                    <Label htmlFor="has-active-cnam" className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-blue-600" />
                      Cette location a une couverture CNAM active
                    </Label>
                  </div>
                  
                  {existingRentalData.hasActiveCnam && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 ml-6">
                      <div className="space-y-2">
                        <Label>Date d'expiration CNAM</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className="w-full justify-start">
                              <Calendar className="mr-2 h-4 w-4" />
                              {existingRentalData.cnamExpirationDate ? 
                                format(existingRentalData.cnamExpirationDate, "dd/MM/yyyy", { locale: fr }) : 
                                "Sélectionner une date"
                              }
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <CalendarComponent
                              mode="single"
                              selected={existingRentalData.cnamExpirationDate}
                              onSelect={(date) => handleExistingRentalDataChange('cnamExpirationDate', date)}
                              disabled={(date) => 
                                existingRentalData.importDate ? date < existingRentalData.importDate : false
                              }
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Montant mensuel CNAM (DT)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="190.00"
                          value={existingRentalData.cnamMonthlyAmount || ''}
                          onChange={(e) => handleExistingRentalDataChange('cnamMonthlyAmount', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {clientType && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold text-[#1e3a8a] flex items-center gap-2">
                {clientType === "patient" ? (
                  <>
                    <Users className="h-5 w-5" />
                    Sélectionner le Patient
                  </>
                ) : (
                  <>
                    <Building className="h-5 w-5" />
                    Sélectionner la Société
                  </>
                )}
              </Label>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsCreateFormOpen(true)}
                className="flex items-center gap-2 text-[#1e3a8a] border-[#1e3a8a] hover:bg-blue-50"
              >
                <Plus className="h-4 w-4" />
                {clientType === "patient" ? "Nouveau Patient" : "Nouvelle Société"}
              </Button>
            </div>

            <div className="relative">
              <Select
                value={selectedClient || ""}
                onValueChange={handleClientSelect}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={clientType === "patient" ? "Sélectionner un patient" : "Sélectionner une société"} />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  <div className="sticky top-0 z-10 bg-white px-3 py-2 border-b">
                    <div className="relative">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                      <Input
                        type="text"
                        placeholder={clientType === "patient" ? "Rechercher un patient..." : "Rechercher une société..."}
                        className="pl-8 h-9 w-full border-[#1e3a8a] focus:ring-[#1e3a8a]"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onClick={(e) => e.stopPropagation()} // Prevent closing dropdown when clicking input
                      />
                    </div>
                  </div>
                  <div className="max-h-[200px] overflow-y-auto py-1">
                    {isLoading ? (
                      <div className="px-2 py-4 text-center text-sm text-gray-500">
                        Chargement...
                      </div>
                    ) : filteredClients.length > 0 ? (
                      filteredClients.map((client) => {
                        // Check if this is a patient with an ongoing diagnostic
                        const hasOngoingDiagnostic = clientType === "patient" && client.hasOngoingDiagnostic;
                        const isDiagnosticStepper = action === "diagnostique";
                        
                        // For diagnostic stepper, show patients with ongoing diagnostics as non-selectable
                        if (hasOngoingDiagnostic && isDiagnosticStepper) {
                          return (
                            <div key={client.id} className="px-2 py-2 text-sm text-gray-400 flex items-center justify-between cursor-not-allowed">
                              <span>{client.name}</span>
                              <span className="text-xs text-red-500">(Diagnostic en cours)</span>
                            </div>
                          );
                        }
                        
                        // For rental/sales steppers, show all patients as selectable
                        return (
                          <SelectItem key={client.id} value={client.id}>
                            {client.name}
                            {hasOngoingDiagnostic && !isDiagnosticStepper && (
                              <span className="ml-2 text-xs text-amber-500">(Diagnostic en cours)</span>
                            )}
                          </SelectItem>
                        );
                      })
                    ) : (
                      <div className="px-2 py-4 text-center text-sm text-gray-500">
                        {searchQuery ? "Aucun résultat trouvé" : "Aucun client disponible"}
                      </div>
                    )}
                  </div>
                </SelectContent>
              </Select>
            </div>

            {error && (
              <p className="text-sm text-red-500">{error}</p>
            )}
          </div>
        )}

        <div className="flex justify-between pt-6 border-t">
          <Button 
            variant="outline" 
            onClick={onClose}
            className="text-gray-600 hover:text-gray-800 flex items-center gap-2"
          >
            <X className="h-4 w-4" />
            Annuler
          </Button>
          <Button
            onClick={() => {
              if (!clientType) {
                toast({
                  title: "Type de client requis",
                  description: "Veuillez sélectionner un type de client (Patient ou Société)",
                  variant: "destructive"
                });
                return;
              }
              if (!selectedClient) {
                toast({
                  title: "Client requis",
                  description: "Veuillez sélectionner un client",
                  variant: "destructive"
                });
                return;
              }
              onNext();
            }}
            disabled={!selectedClient || !clientType}
            className="bg-[#1e3a8a] hover:bg-[#1e3a8a]/90 text-white flex items-center gap-2"
          >
            Continuer
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Create Client Form Dialog */}
      <Dialog open={isCreateFormOpen} onOpenChange={setIsCreateFormOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0 border-b pb-4">
            <DialogTitle className="flex items-center gap-2 text-[#1e3a8a]">
              {clientType === "patient" ? (
                <>
                  <UserPlus className="h-5 w-5" />
                  Nouveau Patient
                </>
              ) : (
                <>
                  <BuildingIcon className="h-5 w-5" />
                  Nouvelle Société
                </>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto py-4">
            {clientType === "patient" ? (
              <PatientForm 
                formData={patientFormData}
                onInputChange={handlePatientInputChange}
                onFileChange={handlePatientFileChange}
                onBack={() => setIsCreateFormOpen(false)}
                onNext={() => {
                  handleCreateSuccess(patientFormData);
                }}
              />
            ) : (
              <SocieteForm 
                formData={societeFormData}
                onInputChange={handleSocieteInputChange}
                onFileChange={handleSocieteFileChange}
                onBack={() => setIsCreateFormOpen(false)}
                onNext={() => {
                  handleCreateSuccess(societeFormData);
                }}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default ClientSelectionStep;
