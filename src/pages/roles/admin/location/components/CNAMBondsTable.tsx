import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Shield, Plus, Save, X, Edit2, Trash2, CheckCircle, Clock, FileX, Info, ChevronLeft, ChevronRight, Search, Filter } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PatientSelectorDialog } from '@/components/dialogs/PatientSelectorDialog';

interface CNAMBond {
  id?: string;
  bonNumber?: string;
  bonType: string;
  status: string;
  category?: string; // LOCATION or ACHAT
  dossierNumber?: string;
  submissionDate?: string | null;
  approvalDate?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  cnamMonthlyRate: number;
  deviceMonthlyRate: number;
  coveredMonths: number;
  bonAmount: number;
  devicePrice: number;
  complementAmount: number;
  currentStep?: number; // Progress step (1-7)
  totalSteps?: number; // Total steps (default 7)
  renewalReminderDays?: number;
  notes?: string;
  rentalId?: string;
  saleId?: string; // For bons linked to sales
  patientId: string;
  createdAt?: string; // NEW - Added for display
  updatedAt?: string; // NEW - Added for display
  patient?: {
    id: string;
    firstName: string;
    lastName: string;
    patientCode?: string;
    cnamId?: string;
  };
  rental?: {
    id: string;
    rentalCode?: string;
    medicalDevice?: {
      id: string;
      name: string;
      deviceCode?: string;
    };
  };
}

interface CNAMNomenclature {
  bonType: string;
  monthlyRate: number;
  description?: string;
}

interface Props {
  rentalId?: string;
  patientId?: string;
  patientCnamId?: string;
  deviceMonthlyRate?: number;
  showGlobalView?: boolean; // When true, shows all bonds from all rentals
}

const BOND_TYPE_LABELS: Record<string, string> = {
  CONCENTRATEUR_OXYGENE: 'Concentrateur Oxygène',
  VNI: 'VNI',
  CPAP: 'CPAP',
  MASQUE: 'Masque',
  AUTRE: 'Autre',
};

const STATUS_LABELS: Record<string, { label: string; color: string; icon: any }> = {
  EN_ATTENTE_APPROBATION: { label: 'En attente', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  APPROUVE: { label: 'Approuvé', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  EN_COURS: { label: 'En cours', color: 'bg-blue-100 text-blue-800', icon: Info },
  TERMINE: { label: 'Terminé', color: 'bg-gray-100 text-gray-800', icon: CheckCircle },
  REFUSE: { label: 'Refusé', color: 'bg-red-100 text-red-800', icon: FileX },
};

export default function CNAMBondsTable({ rentalId, patientId, patientCnamId, deviceMonthlyRate, showGlobalView = false }: Props) {
  const { toast } = useToast();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [editData, setEditData] = useState<CNAMBond | null>(null);
  const [selectedPatientName, setSelectedPatientName] = useState<string>('');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [patientFilter, setPatientFilter] = useState<string>('all');

  // Fetch CNAM nomenclature
  const { data: nomenclature = [] } = useQuery<CNAMNomenclature[]>({
    queryKey: ['cnam-nomenclature'],
    queryFn: async () => {
      const response = await fetch('/api/cnam-nomenclature?isActive=true');
      if (!response.ok) throw new Error('Failed to fetch nomenclature');
      return response.json();
    },
  });

  // Fetch patients for dropdown (only in global view)
  const { data: patients = [] } = useQuery<any[]>({
    queryKey: ['patients-for-bonds'],
    queryFn: async () => {
      const response = await fetch('/api/renseignements/patients');
      if (!response.ok) return [];
      const data = await response.json();
      return data.patients || [];
    },
    enabled: showGlobalView,
  });

  // Fetch rentals for dropdown (only in global view)
  const { data: rentals = [] } = useQuery<any[]>({
    queryKey: ['rentals-for-bonds'],
    queryFn: async () => {
      const response = await fetch('/api/rentals/comprehensive');
      if (!response.ok) return [];
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    },
    enabled: showGlobalView,
  });

  // Fetch CNAM bons (only RENTAL bons - category=LOCATION)
  const { data: bonds = [] } = useQuery<CNAMBond[]>({
    queryKey: ['cnam-bonds', rentalId, patientId],
    queryFn: async () => {
      const params = new URLSearchParams();
      // Filter to only show RENTAL bons (category=LOCATION), not SALE bons (category=ACHAT)
      params.append('category', 'LOCATION');
      if (rentalId) params.append('rentalId', rentalId);
      if (patientId) params.append('patientId', patientId);

      const response = await fetch(`/api/cnam-bons?${params}`);
      if (!response.ok) throw new Error('Failed to fetch bonds');
      const data = await response.json();

      // Ensure all bons have currentStep and totalSteps
      return data.map((bon: any) => ({
        ...bon,
        currentStep: bon.currentStep || (bon.status === 'TERMINE' ? 7 : bon.status === 'APPROUVE' ? 5 : 3),
        totalSteps: bon.totalSteps || 7,
      }));
    },
  });

  // Filter bonds
  const filteredBonds = bonds.filter((bond) => {
    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      const bonNumber = (bond.bonNumber || bond.dossierNumber || '').toLowerCase();
      const patientName = bond.patient
        ? `${bond.patient.firstName} ${bond.patient.lastName}`.toLowerCase()
        : '';
      const rentalCode = bond.rental?.rentalCode?.toLowerCase() || '';

      if (!bonNumber.includes(search) && !patientName.includes(search) && !rentalCode.includes(search)) {
        return false;
      }
    }

    // Status filter
    if (statusFilter !== 'all' && bond.status !== statusFilter) {
      return false;
    }

    // Type filter
    if (typeFilter !== 'all' && bond.bonType !== typeFilter) {
      return false;
    }

    // Patient filter (only in global view)
    if (showGlobalView && patientFilter !== 'all' && bond.patientId !== patientFilter) {
      return false;
    }

    return true;
  });

  // Pagination calculations
  const totalPages = Math.ceil(filteredBonds.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedBonds = filteredBonds.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, typeFilter, patientFilter]);

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: async (bond: CNAMBond) => {
      const url = bond.id ? `/api/cnam-bons/${bond.id}` : '/api/cnam-bons';
      const method = bond.id ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bond),
      });

      if (!response.ok) throw new Error('Failed to save bond');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cnam-bonds'] });
      queryClient.invalidateQueries({ queryKey: ['rentals'] });
      setEditingId(null);
      setIsAddingNew(false);
      setEditData(null);
      toast({ title: 'Succès', description: 'Bond CNAM enregistré avec succès' });
    },
    onError: () => {
      toast({ variant: 'destructive', title: 'Erreur', description: 'Échec de l\'enregistrement' });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (bondId: string) => {
      const response = await fetch(`/api/cnam-bons/${bondId}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete bond');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cnam-bonds'] });
      toast({ title: 'Succès', description: 'Bond CNAM supprimé' });
    },
    onError: (error: any) => {
      toast({ variant: 'destructive', title: 'Erreur', description: error.message });
    },
  });

  const handleAddNew = async () => {
    // Fetch next bond number for LOCATION category (rentals)
    let nextBondNumber = '';
    try {
      const response = await fetch('/api/cnam-bons/next-number?category=LOCATION');
      if (response.ok) {
        const data = await response.json();
        nextBondNumber = data.bonNumber;
      } else {
        // Fallback: generate a temporary number
        const year = new Date().getFullYear();
        const timestamp = Date.now().toString().slice(-4);
        nextBondNumber = `BL-${year}-TMP${timestamp}`;
        toast({
          title: 'Avertissement',
          description: 'Numéro de bond temporaire généré. Veuillez vérifier.',
          variant: 'default',
        });
      }
    } catch (error) {
      console.error('Failed to fetch next bond number:', error);
      // Fallback: generate a temporary number
      const year = new Date().getFullYear();
      const timestamp = Date.now().toString().slice(-4);
      nextBondNumber = `BL-${year}-TMP${timestamp}`;
      toast({
        title: 'Avertissement',
        description: 'Numéro de bond temporaire généré. Veuillez vérifier.',
        variant: 'default',
      });
    }

    const defaultBondType = 'CONCENTRATEUR_OXYGENE';
    const cnamRate = nomenclature.find(n => n.bonType === defaultBondType)?.monthlyRate || 190;
    const deviceRate = deviceMonthlyRate || 0;

    setEditData({
      bonNumber: nextBondNumber,
      bonType: defaultBondType,
      status: 'EN_ATTENTE_APPROBATION',
      category: 'LOCATION', // Default category for rental bonds
      cnamMonthlyRate: Number(cnamRate),
      deviceMonthlyRate: Number(deviceRate),
      coveredMonths: 1,
      bonAmount: Number(cnamRate) * 1,
      devicePrice: Number(deviceRate) * 1,
      complementAmount: (Number(deviceRate) - Number(cnamRate)) * 1,
      renewalReminderDays: 30,
      currentStep: 1, // Start at step 1
      patientId: patientId || '', // Will be selected in the form if in global view
      rentalId,
    });

    // Reset patient name - will be set when patient is selected via dialog
    setSelectedPatientName('');
    setIsAddingNew(true);
  };

  const handleEdit = (bond: CNAMBond) => {
    setEditData({ ...bond });
    setEditingId(bond.id!);
  };

  const handleCancel = () => {
    setEditingId(null);
    setIsAddingNew(false);
    setEditData(null);
    setSelectedPatientName('');
  };

  const handleSave = () => {
    if (!editData) return;

    // Validate required fields
    if (!editData.patientId || editData.patientId === '') {
      toast({ variant: 'destructive', title: 'Erreur', description: 'Veuillez sélectionner un patient' });
      return;
    }

    if (!editData.bonType) {
      toast({ variant: 'destructive', title: 'Erreur', description: 'Veuillez sélectionner un type de bond' });
      return;
    }

    if (!editData.deviceMonthlyRate || editData.deviceMonthlyRate === 0) {
      toast({ variant: 'destructive', title: 'Erreur', description: 'Veuillez entrer le prix mensuel de l\'appareil' });
      return;
    }

    const bonAmount = editData.cnamMonthlyRate * editData.coveredMonths;
    const devicePrice = editData.deviceMonthlyRate * editData.coveredMonths;
    const complementAmount = devicePrice - bonAmount;

    saveMutation.mutate({
      ...editData,
      bonAmount,
      devicePrice,
      complementAmount,
    });
  };

  const handleDelete = (bondId: string) => {
    if (confirm('Supprimer ce bond CNAM ?')) {
      deleteMutation.mutate(bondId);
    }
  };

  const handleBondTypeChange = (bonType: string) => {
    if (!editData) return;

    const cnamRate = nomenclature.find(n => n.bonType === bonType)?.monthlyRate || 0;
    const bonAmount = cnamRate * editData.coveredMonths;
    const devicePrice = editData.deviceMonthlyRate * editData.coveredMonths;

    setEditData({
      ...editData,
      bonType,
      cnamMonthlyRate: cnamRate,
      bonAmount,
      complementAmount: devicePrice - bonAmount,
    });
  };

  const handleMonthsChange = (months: number) => {
    if (!editData) return;

    const bonAmount = editData.cnamMonthlyRate * months;
    const devicePrice = editData.deviceMonthlyRate * months;

    setEditData({
      ...editData,
      coveredMonths: months,
      bonAmount,
      devicePrice,
      complementAmount: devicePrice - bonAmount,
    });
  };

  // Handler for patient selection - filters rentals
  const handlePatientChange = (selectedPatientId: string) => {
    if (!editData) return;

    setEditData({
      ...editData,
      patientId: selectedPatientId,
      rentalId: undefined, // Reset rental when patient changes
    });
  };

  // Handler for rental selection - auto-populates bond type based on device
  const handleRentalChange = (selectedRentalId: string) => {
    if (!editData) return;

    if (selectedRentalId === 'none') {
      setEditData({ ...editData, rentalId: undefined });
      return;
    }

    // Find the selected rental
    const selectedRental = rentals.find((r: any) => r.id === selectedRentalId);

    if (selectedRental?.medicalDevice) {
      const deviceName = selectedRental.medicalDevice.name?.toUpperCase() || '';
      const deviceRate = selectedRental.monthlyRate || selectedRental.deviceMonthlyRate || 0;

      // Auto-detect bond type based on device name
      let detectedBondType = 'AUTRE';
      if (deviceName.includes('CONCENTRATEUR') || deviceName.includes('OXYGENE') || deviceName.includes('O2')) {
        detectedBondType = 'CONCENTRATEUR_OXYGENE';
      } else if (deviceName.includes('VNI')) {
        detectedBondType = 'VNI';
      } else if (deviceName.includes('CPAP')) {
        detectedBondType = 'CPAP';
      } else if (deviceName.includes('MASQUE')) {
        detectedBondType = 'MASQUE';
      }

      // Get CNAM rate for the detected type
      const cnamRate = nomenclature.find(n => n.bonType === detectedBondType)?.monthlyRate || 0;
      const bonAmount = cnamRate * editData.coveredMonths;
      const devicePrice = deviceRate * editData.coveredMonths;

      setEditData({
        ...editData,
        rentalId: selectedRentalId,
        bonType: detectedBondType,
        cnamMonthlyRate: cnamRate,
        deviceMonthlyRate: deviceRate,
        bonAmount,
        devicePrice,
        complementAmount: devicePrice - bonAmount,
      });
    } else {
      setEditData({ ...editData, rentalId: selectedRentalId });
    }
  };

  // Filter rentals to show only selected patient's rentals
  const filteredRentals = editData?.patientId
    ? rentals.filter((rental: any) => rental.patientId === editData.patientId)
    : rentals;

  const getStatusBadge = (status: string) => {
    const info = STATUS_LABELS[status] || STATUS_LABELS.EN_ATTENTE_APPROBATION;
    const Icon = info.icon;

    return (
      <Badge variant="outline" className={info.color}>
        <Icon className="h-3 w-3 mr-1" />
        {info.label}
      </Badge>
    );
  };

  // Progress bar function
  const getProgressBar = (currentStep: number, totalSteps: number = 7) => {
    const percentage = (currentStep / totalSteps) * 100;

    // CNAM step names for rentals
    const stepNames: { [key: number]: string } = {
      1: 'En attente approbation CNAM',
      2: 'Accord avec patient',
      3: 'Documents reçus de CNAM',
      4: 'Préparation appareil',
      5: 'Livraison au Technicien',
      6: 'Signature Médecin',
      7: 'Livraison finale Admin',
    };

    const stepName = stepNames[currentStep] || `Étape ${currentStep}`;

    return (
      <div className="w-full">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-slate-600 truncate" title={stepName}>
            Étape {currentStep}/{totalSteps}
          </span>
          <span className="text-xs font-semibold text-blue-700 ml-2">{Math.round(percentage)}%</span>
        </div>
        <div className="w-full bg-slate-200 rounded-full h-2">
          <div
            className="h-2 rounded-full transition-all duration-300 bg-gradient-to-r from-blue-500 to-blue-600"
            style={{ width: `${percentage}%` }}
          />
        </div>
        <div className="text-xs text-slate-500 mt-0.5 truncate">{stepName}</div>
      </div>
    );
  };

  // In global view or when patient is not CNAM eligible, show alert but still allow viewing
  const showCnamWarning = !showGlobalView && !patientCnamId;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-blue-600" />
          Bons CNAM
        </CardTitle>
      </CardHeader>
      <CardContent>
        {showCnamWarning && (
          <Alert className="mb-4 border-yellow-200 bg-yellow-50">
            <Info className="h-4 w-4 text-yellow-600" />
            <AlertDescription>
              Patient non éligible CNAM - Impossible d'ajouter des bonds
            </AlertDescription>
          </Alert>
        )}

        {/* Search and Filters */}
        <div className="space-y-3 mb-4">
          {/* Search Bar and Action Button */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Rechercher par numéro, patient, location..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button
              onClick={handleAddNew}
              disabled={isAddingNew || (!showGlobalView && showCnamWarning)}
              className="bg-blue-600 hover:bg-blue-700 whitespace-nowrap"
            >
              <Plus className="h-4 w-4 mr-2" />
              Nouveau Bond
            </Button>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 bg-slate-50 p-3 rounded-lg border">
            <div>
              <label className="text-[10px] font-medium text-slate-700 mb-0.5 block">Statut</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-8 text-xs bg-white">
                  <SelectValue placeholder="Tous" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  {Object.entries(STATUS_LABELS).map(([value, info]) => (
                    <SelectItem key={value} value={value}>{info.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-[10px] font-medium text-slate-700 mb-0.5 block">Type</label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="h-8 text-xs bg-white">
                  <SelectValue placeholder="Tous" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les types</SelectItem>
                  {Object.entries(BOND_TYPE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {showGlobalView && (
              <div>
                <label className="text-[10px] font-medium text-slate-700 mb-0.5 block">Patient</label>
                <Select value={patientFilter} onValueChange={setPatientFilter}>
                  <SelectTrigger className="h-8 text-xs bg-white">
                    <SelectValue placeholder="Tous" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les patients</SelectItem>
                    {patients.map((patient: any) => (
                      <SelectItem key={patient.id} value={patient.id}>
                        {patient.firstName} {patient.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex items-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('all');
                  setTypeFilter('all');
                  setPatientFilter('all');
                }}
                className="h-8 w-full text-xs"
              >
                <Filter className="h-3 w-3 mr-1" />
                Réinitialiser
              </Button>
            </div>
          </div>
        </div>

        {/* Pagination Controls */}
        {totalPages > 0 && (
          <div className="flex items-center justify-between px-4 py-3 bg-white border border-slate-200 rounded-lg shadow-sm mb-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-600">
                Affichage de {startIndex + 1} à {Math.min(endIndex, filteredBonds.length)} sur {filteredBonds.length} résultats
              </span>
            </div>

            <div className="flex items-center gap-4">
              {/* Items per page selector */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-600">Par page:</span>
                <Select
                  value={itemsPerPage.toString()}
                  onValueChange={(value) => {
                    setItemsPerPage(Number(value));
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="w-[100px] h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                    <SelectItem value="200">200</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Page navigation */}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="h-9 w-9 p-0"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }

                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(pageNum)}
                        className="h-9 w-9 p-0"
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="h-9 w-9 p-0"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}

        <div className="rounded-md border overflow-x-auto">
          <Table className="min-w-max">
            <TableHeader>
              <TableRow>
                {/* Basic Info */}
                <TableHead className="sticky left-0 bg-white z-10 min-w-[120px]">Numéro BL</TableHead>
                <TableHead className="min-w-[100px]">Numéro Dossier</TableHead>
                {showGlobalView && <TableHead className="min-w-[150px]">Patient</TableHead>}
                {showGlobalView && <TableHead className="min-w-[120px]">Location</TableHead>}

                {/* Bond Details */}
                <TableHead className="min-w-[150px]">Type</TableHead>
                <TableHead className="min-w-[100px]">Catégorie</TableHead>
                <TableHead className="min-w-[120px]">Statut</TableHead>

                {/* Dates */}
                <TableHead className="min-w-[130px]">Date Soumission</TableHead>
                <TableHead className="min-w-[130px]">Date Approbation</TableHead>
                <TableHead className="min-w-[130px]">Date Début</TableHead>
                <TableHead className="min-w-[130px]">Date Fin</TableHead>

                {/* Financial */}
                <TableHead className="min-w-[100px]">Tarif CNAM/mois</TableHead>
                <TableHead className="min-w-[100px]">Tarif Appareil/mois</TableHead>
                <TableHead className="min-w-[80px]">Mois Couverts</TableHead>
                <TableHead className="min-w-[100px]">Montant Bon Total</TableHead>
                <TableHead className="min-w-[100px]">Prix Appareil Total</TableHead>
                <TableHead className="min-w-[100px]">Complément Patient</TableHead>

                {/* Progress */}
                <TableHead className="min-w-[200px]">Progression</TableHead>

                {/* Additional */}
                <TableHead className="min-w-[100px]">Rappel Renouvellement (jours)</TableHead>
                <TableHead className="min-w-[200px]">Notes</TableHead>
                <TableHead className="min-w-[150px]">Créé le</TableHead>
                <TableHead className="min-w-[150px]">Mis à jour le</TableHead>

                {/* Actions */}
                <TableHead className="sticky right-0 bg-white z-10 min-w-[120px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isAddingNew && editData && (
                <TableRow className="bg-green-50">
                  {/* Numéro BL - Sticky Left */}
                  <TableCell className="sticky left-0 bg-green-50 z-10">
                    <Badge variant="outline" className="text-xs font-mono bg-blue-50 text-blue-700 border-blue-200">
                      {editData.bonNumber || 'Auto-généré'}
                    </Badge>
                  </TableCell>

                  {/* Numéro Dossier */}
                  <TableCell>
                    <Input
                      type="text"
                      placeholder="DOSS-LOC-0001"
                      value={editData.dossierNumber || ''}
                      onChange={(e) => setEditData({ ...editData, dossierNumber: e.target.value })}
                      className="text-xs w-32"
                    />
                  </TableCell>

                  {/* Patient (only in global view) */}
                  {showGlobalView && (
                    <TableCell>
                      <PatientSelectorDialog
                        selectedId={editData.patientId}
                        selectedName={selectedPatientName}
                        onSelect={(type, id, name) => {
                          if (type === 'patient') {
                            setEditData({ ...editData, patientId: id, rentalId: undefined });
                            setSelectedPatientName(name);
                          }
                        }}
                        trigger={
                          <Button variant="outline" className="h-8 text-xs w-full justify-start">
                            {selectedPatientName || 'Sélectionner patient'}
                          </Button>
                        }
                      />
                    </TableCell>
                  )}

                  {/* Location (only in global view) */}
                  {showGlobalView && (
                    <TableCell>
                      <Select
                        value={editData.rentalId || 'none'}
                        onValueChange={handleRentalChange}
                        disabled={!editData.patientId}
                      >
                        <SelectTrigger className="text-xs">
                          <SelectValue placeholder={!editData.patientId ? "Sélectionner patient d'abord" : "Optionnel"} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Aucune location</SelectItem>
                          {filteredRentals.map((rental: any) => (
                            <SelectItem key={rental.id} value={rental.id}>
                              <div className="text-xs">
                                <div>{rental.rentalCode}</div>
                                {rental.medicalDevice && <div className="text-gray-500">{rental.medicalDevice.name}</div>}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                  )}

                  {/* Type */}
                  <TableCell>
                    <Select value={editData.bonType} onValueChange={handleBondTypeChange}>
                      <SelectTrigger className="text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(BOND_TYPE_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>

                  {/* Catégorie */}
                  <TableCell>
                    <Badge variant="outline" className="text-xs bg-indigo-50 text-indigo-700 border-indigo-200">
                      LOCATION
                    </Badge>
                  </TableCell>

                  {/* Statut */}
                  <TableCell>
                    <Select value={editData.status} onValueChange={(v) => setEditData({ ...editData, status: v })}>
                      <SelectTrigger className="text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(STATUS_LABELS).map(([value, info]) => (
                          <SelectItem key={value} value={value}>{info.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>

                  {/* Date Soumission */}
                  <TableCell>
                    <Input
                      type="date"
                      value={editData.submissionDate ? new Date(editData.submissionDate).toISOString().split('T')[0] : ''}
                      onChange={(e) => setEditData({ ...editData, submissionDate: e.target.value ? new Date(e.target.value).toISOString() : null })}
                      className="text-xs w-32"
                    />
                  </TableCell>

                  {/* Date Approbation */}
                  <TableCell>
                    <Input
                      type="date"
                      value={editData.approvalDate ? new Date(editData.approvalDate).toISOString().split('T')[0] : ''}
                      onChange={(e) => setEditData({ ...editData, approvalDate: e.target.value ? new Date(e.target.value).toISOString() : null })}
                      className="text-xs w-32"
                    />
                  </TableCell>

                  {/* Date Début */}
                  <TableCell>
                    <Input
                      type="date"
                      value={editData.startDate ? new Date(editData.startDate).toISOString().split('T')[0] : ''}
                      onChange={(e) => setEditData({ ...editData, startDate: e.target.value ? new Date(e.target.value).toISOString() : null })}
                      className="text-xs w-32"
                    />
                  </TableCell>

                  {/* Date Fin */}
                  <TableCell>
                    <Input
                      type="date"
                      value={editData.endDate ? new Date(editData.endDate).toISOString().split('T')[0] : ''}
                      onChange={(e) => setEditData({ ...editData, endDate: e.target.value ? new Date(e.target.value).toISOString() : null })}
                      className="text-xs w-32"
                    />
                  </TableCell>

                  {/* Tarif CNAM/mois (auto from bond type) */}
                  <TableCell>
                    <div className="text-xs font-medium text-green-700">
                      {Number(editData.cnamMonthlyRate || 0).toFixed(2)} TND
                    </div>
                    <div className="text-[10px] text-gray-500">Auto (Type)</div>
                  </TableCell>

                  {/* Tarif Appareil/mois */}
                  <TableCell>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="670.00"
                      value={editData.deviceMonthlyRate || ''}
                      onChange={(e) => {
                        const rate = parseFloat(e.target.value) || 0;
                        const devicePrice = rate * editData.coveredMonths;
                        const bonAmount = editData.cnamMonthlyRate * editData.coveredMonths;
                        setEditData({
                          ...editData,
                          deviceMonthlyRate: rate,
                          devicePrice,
                          complementAmount: devicePrice - bonAmount,
                        });
                      }}
                      className="text-xs w-24"
                    />
                  </TableCell>

                  {/* Mois Couverts */}
                  <TableCell>
                    <Input
                      type="number"
                      min="1"
                      max="12"
                      value={editData.coveredMonths}
                      onChange={(e) => handleMonthsChange(parseInt(e.target.value) || 1)}
                      className="text-xs w-16"
                    />
                  </TableCell>

                  {/* Montant Bon Total (calculated) */}
                  <TableCell>
                    <div className="text-xs font-semibold text-green-700">
                      {Number(editData.bonAmount || 0).toFixed(2)} TND
                    </div>
                    <div className="text-[10px] text-gray-500">Auto calculé</div>
                  </TableCell>

                  {/* Prix Appareil Total (calculated) */}
                  <TableCell>
                    <div className="text-xs font-semibold text-blue-700">
                      {Number(editData.devicePrice || 0).toFixed(2)} TND
                    </div>
                    <div className="text-[10px] text-gray-500">Auto calculé</div>
                  </TableCell>

                  {/* Complément Patient (calculated) */}
                  <TableCell>
                    <div className="text-xs font-semibold text-orange-700">
                      {Number(editData.complementAmount || 0).toFixed(2)} TND
                    </div>
                    <div className="text-[10px] text-gray-500">Auto calculé</div>
                  </TableCell>

                  {/* Progression */}
                  <TableCell>
                    <Select
                      value={editData.currentStep?.toString() || '1'}
                      onValueChange={(value) => setEditData({ ...editData, currentStep: parseInt(value) })}
                    >
                      <SelectTrigger className="text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Étape 1 - En attente</SelectItem>
                        <SelectItem value="2">Étape 2 - Accord patient</SelectItem>
                        <SelectItem value="3">Étape 3 - Documents CNAM</SelectItem>
                        <SelectItem value="4">Étape 4 - Préparation</SelectItem>
                        <SelectItem value="5">Étape 5 - Livraison tech</SelectItem>
                        <SelectItem value="6">Étape 6 - Signature médecin</SelectItem>
                        <SelectItem value="7">Étape 7 - Livraison finale</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>

                  {/* Rappel Renouvellement */}
                  <TableCell>
                    <Input
                      type="number"
                      min="1"
                      max="90"
                      value={editData.renewalReminderDays || 30}
                      onChange={(e) => setEditData({ ...editData, renewalReminderDays: parseInt(e.target.value) || 30 })}
                      className="text-xs w-16"
                    />
                  </TableCell>

                  {/* Notes */}
                  <TableCell>
                    <Input
                      type="text"
                      placeholder="Notes..."
                      value={editData.notes || ''}
                      onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
                      className="text-xs w-40"
                    />
                  </TableCell>

                  {/* Créé le (not editable for new) */}
                  <TableCell>
                    <div className="text-xs text-gray-400">-</div>
                  </TableCell>

                  {/* Mis à jour le (not editable for new) */}
                  <TableCell>
                    <div className="text-xs text-gray-400">-</div>
                  </TableCell>

                  {/* Actions - Sticky Right */}
                  <TableCell className="sticky right-0 bg-green-50 z-10">
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" onClick={handleSave} className="h-7 px-2 bg-white">
                        <Save className="h-3 w-3" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={handleCancel} className="h-7 px-2 bg-white">
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )}

              {bonds.length === 0 && !isAddingNew && (
                <TableRow>
                  <TableCell colSpan={showGlobalView ? 9 : 7} className="text-center text-gray-500 py-8">
                    Aucun bond CNAM. Cliquez sur "Nouveau Bond" pour commencer.
                  </TableCell>
                </TableRow>
              )}

              {paginatedBonds.map((bond) => {
                const isEditing = editingId === bond.id;
                const data = isEditing ? editData! : bond;

                return (
                  <TableRow key={bond.id} className={isEditing ? 'bg-blue-50' : ''}>
                    {/* Numéro BL - Sticky Left (Read-only, auto-generated) */}
                    <TableCell className={`sticky left-0 z-10 ${isEditing ? 'bg-blue-50' : 'bg-white'}`}>
                      <Badge variant="outline" className="text-xs font-mono bg-blue-50 text-blue-700 border-blue-200">
                        {bond.bonNumber || 'N/A'}
                      </Badge>
                      {isEditing && <div className="text-[10px] text-gray-500 mt-0.5">Auto-généré</div>}
                    </TableCell>

                    {/* Numéro Dossier */}
                    <TableCell>
                      {isEditing ? (
                        <Input
                          type="text"
                          placeholder="DOSS-LOC-0001"
                          value={data.dossierNumber || ''}
                          onChange={(e) => setEditData({ ...editData!, dossierNumber: e.target.value })}
                          className="text-xs w-32 font-mono"
                        />
                      ) : (
                        <div className="text-xs font-mono">{bond.dossierNumber || 'N/A'}</div>
                      )}
                    </TableCell>

                    {/* Patient (Read-only - use dialog for selection) */}
                    {showGlobalView && (
                      <TableCell>
                        <div className="text-xs">
                          <div
                            className="font-medium text-blue-600 hover:text-blue-800 hover:underline cursor-pointer transition-colors"
                            onClick={() => router.push(`/roles/admin/renseignement/patient/${bond.patient?.id}`)}
                          >
                            {bond.patient?.firstName} {bond.patient?.lastName}
                          </div>
                          {bond.patient?.patientCode && (
                            <div className="text-slate-500 font-mono">{bond.patient.patientCode}</div>
                          )}
                        </div>
                      </TableCell>
                    )}

                    {/* Location */}
                    {showGlobalView && (
                      <TableCell>
                        {isEditing ? (
                          <Select
                            value={data.rentalId || 'none'}
                            onValueChange={handleRentalChange}
                            disabled={!data.patientId}
                          >
                            <SelectTrigger className="text-xs">
                              <SelectValue placeholder={!data.patientId ? "Sélectionner patient d'abord" : "Optionnel"} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Aucune location</SelectItem>
                              {filteredRentals.map((rental: any) => (
                                <SelectItem key={rental.id} value={rental.id}>
                                  <div className="text-xs">
                                    <div>{rental.rentalCode}</div>
                                    {rental.medicalDevice && <div className="text-gray-500">{rental.medicalDevice.name}</div>}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <div className="text-xs">
                            <div className="font-medium">{bond.rental?.rentalCode || '-'}</div>
                            {bond.rental?.medicalDevice && (
                              <div className="text-gray-500">{bond.rental.medicalDevice.name}</div>
                            )}
                          </div>
                        )}
                      </TableCell>
                    )}

                    {/* Type */}
                    <TableCell>
                      {isEditing ? (
                        <Select value={data.bonType} onValueChange={handleBondTypeChange}>
                          <SelectTrigger className="text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(BOND_TYPE_LABELS).map(([value, label]) => (
                              <SelectItem key={value} value={value}>{label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <div className="text-xs font-medium">{BOND_TYPE_LABELS[bond.bonType]}</div>
                      )}
                    </TableCell>

                    {/* Catégorie */}
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {bond.category || (bond.rentalId ? 'LOCATION' : 'ACHAT')}
                      </Badge>
                    </TableCell>

                    {/* Statut */}
                    <TableCell>
                      {isEditing ? (
                        <Select value={data.status} onValueChange={(v) => setEditData({ ...editData!, status: v })}>
                          <SelectTrigger className="text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(STATUS_LABELS).map(([value, info]) => (
                              <SelectItem key={value} value={value}>{info.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        getStatusBadge(bond.status)
                      )}
                    </TableCell>

                    {/* Date Soumission */}
                    <TableCell>
                      {isEditing ? (
                        <Input
                          type="date"
                          value={data.submissionDate ? new Date(data.submissionDate).toISOString().split('T')[0] : ''}
                          onChange={(e) => setEditData({ ...editData!, submissionDate: e.target.value ? new Date(e.target.value).toISOString() : null })}
                          className="text-xs w-32"
                        />
                      ) : (
                        <div className="text-xs">
                          {bond.submissionDate ? new Date(bond.submissionDate).toLocaleDateString('fr-FR') : '-'}
                        </div>
                      )}
                    </TableCell>

                    {/* Date Approbation */}
                    <TableCell>
                      {isEditing ? (
                        <Input
                          type="date"
                          value={data.approvalDate ? new Date(data.approvalDate).toISOString().split('T')[0] : ''}
                          onChange={(e) => setEditData({ ...editData!, approvalDate: e.target.value ? new Date(e.target.value).toISOString() : null })}
                          className="text-xs w-32"
                        />
                      ) : (
                        <div className="text-xs">
                          {bond.approvalDate ? new Date(bond.approvalDate).toLocaleDateString('fr-FR') : '-'}
                        </div>
                      )}
                    </TableCell>

                    {/* Date Début */}
                    <TableCell>
                      {isEditing ? (
                        <Input
                          type="date"
                          value={data.startDate ? new Date(data.startDate).toISOString().split('T')[0] : ''}
                          onChange={(e) => setEditData({ ...editData!, startDate: e.target.value ? new Date(e.target.value).toISOString() : null })}
                          className="text-xs w-32"
                        />
                      ) : (
                        <div className="text-xs">
                          {bond.startDate ? new Date(bond.startDate).toLocaleDateString('fr-FR') : '-'}
                        </div>
                      )}
                    </TableCell>

                    {/* Date Fin */}
                    <TableCell>
                      {isEditing ? (
                        <Input
                          type="date"
                          value={data.endDate ? new Date(data.endDate).toISOString().split('T')[0] : ''}
                          onChange={(e) => setEditData({ ...editData!, endDate: e.target.value ? new Date(e.target.value).toISOString() : null })}
                          className="text-xs w-32"
                        />
                      ) : (
                        <div className="text-xs">
                          {bond.endDate ? new Date(bond.endDate).toLocaleDateString('fr-FR') : '-'}
                        </div>
                      )}
                    </TableCell>

                    {/* Tarif CNAM/mois */}
                    <TableCell>
                      <div className="text-xs font-medium text-green-700">
                        {Number(data.cnamMonthlyRate).toFixed(2)} TND
                      </div>
                      {isEditing && <div className="text-[10px] text-gray-500">Auto (Type)</div>}
                    </TableCell>

                    {/* Tarif Appareil/mois */}
                    <TableCell>
                      {isEditing ? (
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={data.deviceMonthlyRate || ''}
                          onChange={(e) => {
                            const rate = parseFloat(e.target.value) || 0;
                            const devicePrice = rate * data.coveredMonths;
                            const bonAmount = data.cnamMonthlyRate * data.coveredMonths;
                            setEditData({
                              ...editData!,
                              deviceMonthlyRate: rate,
                              devicePrice,
                              complementAmount: devicePrice - bonAmount,
                            });
                          }}
                          className="text-xs w-24"
                        />
                      ) : (
                        <div className="text-xs font-medium">{Number(bond.deviceMonthlyRate).toFixed(2)} TND</div>
                      )}
                    </TableCell>

                    {/* Mois Couverts */}
                    <TableCell>
                      {isEditing ? (
                        <Input
                          type="number"
                          min="1"
                          max="12"
                          value={data.coveredMonths}
                          onChange={(e) => handleMonthsChange(parseInt(e.target.value) || 1)}
                          className="text-xs w-16"
                        />
                      ) : (
                        <div className="text-xs text-center">{bond.coveredMonths}</div>
                      )}
                    </TableCell>

                    {/* Montant Bon Total */}
                    <TableCell>
                      <div className="text-xs font-semibold text-green-700">
                        {Number(data.bonAmount).toFixed(2)} TND
                      </div>
                      {isEditing && <div className="text-[10px] text-gray-500">Auto calculé</div>}
                    </TableCell>

                    {/* Prix Appareil Total */}
                    <TableCell>
                      <div className="text-xs font-semibold text-blue-700">
                        {Number(data.devicePrice).toFixed(2)} TND
                      </div>
                      {isEditing && <div className="text-[10px] text-gray-500">Auto calculé</div>}
                    </TableCell>

                    {/* Complément Patient */}
                    <TableCell>
                      <div className="text-xs font-semibold text-orange-700">
                        {Number(data.complementAmount).toFixed(2)} TND
                      </div>
                      {isEditing && <div className="text-[10px] text-gray-500">Auto calculé</div>}
                    </TableCell>

                    {/* Progression */}
                    <TableCell>
                      {isEditing ? (
                        <Select
                          value={data.currentStep?.toString() || '1'}
                          onValueChange={(value) => setEditData({ ...editData!, currentStep: parseInt(value) })}
                        >
                          <SelectTrigger className="text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">Étape 1 - En attente</SelectItem>
                            <SelectItem value="2">Étape 2 - Accord patient</SelectItem>
                            <SelectItem value="3">Étape 3 - Documents CNAM</SelectItem>
                            <SelectItem value="4">Étape 4 - Préparation</SelectItem>
                            <SelectItem value="5">Étape 5 - Livraison tech</SelectItem>
                            <SelectItem value="6">Étape 6 - Signature médecin</SelectItem>
                            <SelectItem value="7">Étape 7 - Livraison finale</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        getProgressBar(bond.currentStep || 1, bond.totalSteps || 7)
                      )}
                    </TableCell>

                    {/* Rappel Renouvellement */}
                    <TableCell>
                      {isEditing ? (
                        <Input
                          type="number"
                          min="1"
                          max="90"
                          value={data.renewalReminderDays || 30}
                          onChange={(e) => setEditData({ ...editData!, renewalReminderDays: parseInt(e.target.value) || 30 })}
                          className="text-xs w-16"
                        />
                      ) : (
                        <div className="text-xs text-center">{bond.renewalReminderDays || 30}</div>
                      )}
                    </TableCell>

                    {/* Notes */}
                    <TableCell>
                      {isEditing ? (
                        <Input
                          type="text"
                          placeholder="Notes..."
                          value={data.notes || ''}
                          onChange={(e) => setEditData({ ...editData!, notes: e.target.value })}
                          className="text-xs w-40"
                        />
                      ) : (
                        <div className="text-xs max-w-[200px] truncate">{bond.notes || '-'}</div>
                      )}
                    </TableCell>

                    {/* Créé le */}
                    <TableCell className="text-xs">{(bond as any).createdAt ? new Date((bond as any).createdAt).toLocaleString('fr-FR') : '-'}</TableCell>

                    {/* Mis à jour le */}
                    <TableCell className="text-xs">{(bond as any).updatedAt ? new Date((bond as any).updatedAt).toLocaleString('fr-FR') : '-'}</TableCell>

                    {/* Actions - Sticky Right */}
                    <TableCell className={`sticky right-0 z-10 ${isEditing ? 'bg-blue-50' : 'bg-white'}`}>
                      {isEditing ? (
                        <div className="flex gap-1">
                          <Button size="sm" variant="outline" onClick={handleSave} className="h-7 px-2 bg-white">
                            <Save className="h-3 w-3" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={handleCancel} className="h-7 px-2 bg-white">
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex gap-1">
                          <Button size="sm" variant="outline" onClick={() => handleEdit(bond)} className="h-7 px-2">
                            <Edit2 className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDelete(bond.id!)}
                            className="h-7 px-2 text-red-600"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
