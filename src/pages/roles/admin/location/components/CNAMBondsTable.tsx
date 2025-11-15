import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Shield, Plus, Save, X, Edit2, Trash2, CheckCircle, Clock, FileX, Info, ChevronLeft, ChevronRight, Search, Filter, DollarSign, Calendar as CalendarIcon2, Minus } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { PatientSelectorDialog } from '@/components/dialogs/PatientSelectorDialog';

interface CNAMBond {
  id?: string;
  bonNumber?: string;
  bonType: string;
  status: string;
  category?: string; // LOCATION or ACHAT
  dossierNumber?: string;
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
  CREATION: { label: 'Création', color: 'bg-blue-100 text-blue-800', icon: Plus },
  RENOUVELLEMENT: { label: 'Renouvellement', color: 'bg-purple-100 text-purple-800', icon: Clock },
};

export default function CNAMBondsTable({ rentalId, patientId, patientCnamId, deviceMonthlyRate, showGlobalView = false }: Props) {
  const { toast } = useToast();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [editData, setEditData] = useState<CNAMBond | null>(null);
  const [selectedPatientName, setSelectedPatientName] = useState<string>('');

  // Dialog states
  const [showFinancialDialog, setShowFinancialDialog] = useState(false);
  const [selectedBondFinancials, setSelectedBondFinancials] = useState<CNAMBond | null>(null);

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
      status: 'CREATION',
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
    const info = STATUS_LABELS[status] || STATUS_LABELS.CREATION;
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
                <TableHead className="sticky left-0 bg-white z-10 min-w-[140px]">Numéros</TableHead>
                {showGlobalView && <TableHead className="min-w-[150px]">Patient</TableHead>}
                {showGlobalView && <TableHead className="min-w-[120px]">Location</TableHead>}

                {/* Bond Details */}
                <TableHead className="min-w-[160px]">Type & Statut</TableHead>

                {/* Dates */}
                <TableHead className="min-w-[130px]">Dates</TableHead>

                {/* Financial */}
                <TableHead className="min-w-[130px]">Mois & Rappel</TableHead>
                <TableHead className="min-w-[180px]">Totaux (Auto calculé)</TableHead>

                {/* Progress */}
                <TableHead className="min-w-[200px]">Progression</TableHead>

                {/* Additional */}
                <TableHead className="min-w-[200px]">Notes</TableHead>
                <TableHead className="min-w-[150px]">Créé le</TableHead>

                {/* Actions */}
                <TableHead className="sticky right-0 bg-white z-10 min-w-[120px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isAddingNew && editData && (
                <TableRow className="bg-blue-50">
                  {/* Numéros (BL + Dossier combined) - Sticky Left */}
                  <TableCell className="sticky left-0 bg-blue-50 z-10">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-gray-500 whitespace-nowrap">BL (Auto):</span>
                        <Badge variant="outline" className="text-xs font-mono bg-blue-50 text-blue-700 border-blue-200">
                          {editData.bonNumber || 'Auto'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-gray-500 whitespace-nowrap">Dossier:</span>
                        <Input
                          type="text"
                          placeholder="DOSS-LOC-0001"
                          value={editData.dossierNumber || ''}
                          onChange={(e) => setEditData({ ...editData, dossierNumber: e.target.value })}
                          className="text-xs h-6 font-mono flex-1"
                        />
                      </div>
                    </div>
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

                  {/* Type & Statut (combined) */}
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-gray-500 whitespace-nowrap">Type:</span>
                        <Select value={editData.bonType} onValueChange={handleBondTypeChange}>
                          <SelectTrigger className="text-xs h-6 flex-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(BOND_TYPE_LABELS).map(([value, label]) => (
                              <SelectItem key={value} value={value}>{label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-gray-500 whitespace-nowrap">Statut:</span>
                        <Select value={editData.status} onValueChange={(v) => setEditData({ ...editData, status: v })}>
                          <SelectTrigger className="text-xs h-6 flex-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(STATUS_LABELS).map(([value, info]) => (
                              <SelectItem key={value} value={value}>{info.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </TableCell>

                  {/* Dates (Début + Fin combined) */}
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-gray-500 whitespace-nowrap">Début:</span>
                        <Input
                          type="date"
                          value={editData.startDate ? new Date(editData.startDate).toISOString().split('T')[0] : ''}
                          onChange={(e) => setEditData({ ...editData, startDate: e.target.value ? new Date(e.target.value).toISOString() : null })}
                          className="text-xs h-6 flex-1"
                        />
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-gray-500 whitespace-nowrap">Fin:</span>
                        <Input
                          type="date"
                          value={editData.endDate ? new Date(editData.endDate).toISOString().split('T')[0] : ''}
                          onChange={(e) => setEditData({ ...editData, endDate: e.target.value ? new Date(e.target.value).toISOString() : null })}
                          className="text-xs h-6 flex-1"
                        />
                      </div>
                    </div>
                  </TableCell>

                  {/* Mois Couverts & Rappel Renouvellement (combined) */}
                  <TableCell>
                    <div className="space-y-1">
                      {/* Months with navigation arrows */}
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-gray-500 whitespace-nowrap">Mois:</span>
                        <div className="flex items-center gap-0.5">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleMonthsChange(Math.max(1, (editData.coveredMonths || 1) - 1))}
                            disabled={(editData.coveredMonths || 1) <= 1}
                            className="h-6 w-6 p-0"
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <div className="h-6 px-2 flex items-center justify-center border rounded text-xs font-semibold min-w-[32px] bg-white">
                            {editData.coveredMonths || 1}
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleMonthsChange(Math.min(12, (editData.coveredMonths || 1) + 1))}
                            disabled={(editData.coveredMonths || 1) >= 12}
                            className="h-6 w-6 p-0"
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      {/* Reminder with date picker */}
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-gray-500 whitespace-nowrap">Rappel:</span>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-6 text-xs flex-1 justify-start font-normal"
                            >
                              <CalendarIcon2 className="h-3 w-3 mr-1" />
                              {editData.renewalReminderDays ? `${editData.renewalReminderDays}j` : '30j'}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={editData.startDate ? new Date(new Date(editData.startDate).getTime() + (editData.renewalReminderDays || 30) * 24 * 60 * 60 * 1000) : new Date(Date.now() + (editData.renewalReminderDays || 30) * 24 * 60 * 60 * 1000)}
                              onSelect={(date) => {
                                if (date) {
                                  const baseDate = editData.startDate ? new Date(editData.startDate) : new Date();
                                  const diffTime = date.getTime() - baseDate.getTime();
                                  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                                  setEditData({ ...editData, renewalReminderDays: Math.max(1, Math.min(90, diffDays)) });
                                }
                              }}
                              disabled={(date) => date < new Date()}
                              locale={fr}
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>
                  </TableCell>

                  {/* Totaux (button to show dialog with complement amount) */}
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedBondFinancials(editData);
                        setShowFinancialDialog(true);
                      }}
                      className="flex items-center gap-1 h-7 text-xs font-semibold text-orange-700 hover:text-orange-800 border-orange-200 hover:bg-orange-50"
                    >
                      <span className="text-[10px]">Complément:</span>
                      {Number(editData.complementAmount || 0).toFixed(2)} TND
                    </Button>
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

                  {/* Notes */}
                  <TableCell>
                    <Textarea
                      placeholder="Notes..."
                      value={editData.notes || ''}
                      onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
                      className="text-xs min-w-[200px] resize-none"
                      rows={2}
                    />
                  </TableCell>

                  {/* Créé le (not editable for new) */}
                  <TableCell>
                    <div className="text-xs text-gray-400">-</div>
                  </TableCell>

                  {/* Actions - Sticky Right */}
                  <TableCell className="sticky right-0 bg-blue-50 z-10">
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
                  <TableCell colSpan={showGlobalView ? 11 : 9} className="text-center text-gray-500 py-8">
                    Aucun bond CNAM. Cliquez sur "Nouveau Bond" pour commencer.
                  </TableCell>
                </TableRow>
              )}

              {paginatedBonds.map((bond) => {
                const isEditing = editingId === bond.id;
                const data = isEditing ? editData! : bond;

                return (
                  <TableRow key={bond.id} className={isEditing ? 'bg-blue-50' : ''}>
                    {/* Numéros (BL + Dossier combined) - Sticky Left */}
                    <TableCell className={`sticky left-0 z-10 ${isEditing ? 'bg-blue-50' : 'bg-white'}`}>
                      <div className="space-y-1">
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-gray-500 whitespace-nowrap">BL (Auto):</span>
                          <Badge variant="outline" className="text-xs font-mono bg-blue-50 text-blue-700 border-blue-200">
                            {bond.bonNumber || 'N/A'}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-gray-500 whitespace-nowrap">Dossier:</span>
                          {isEditing ? (
                            <Input
                              type="text"
                              placeholder="DOSS-LOC-0001"
                              value={data.dossierNumber || ''}
                              onChange={(e) => setEditData({ ...editData!, dossierNumber: e.target.value })}
                              className="text-xs h-6 font-mono flex-1"
                            />
                          ) : (
                            <span className="text-xs font-mono">{bond.dossierNumber || '-'}</span>
                          )}
                        </div>
                      </div>
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

                    {/* Type & Statut (combined) */}
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-gray-500 whitespace-nowrap">Type:</span>
                          {isEditing ? (
                            <Select value={data.bonType} onValueChange={handleBondTypeChange}>
                              <SelectTrigger className="text-xs h-6 flex-1">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {Object.entries(BOND_TYPE_LABELS).map(([value, label]) => (
                                  <SelectItem key={value} value={value}>{label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <span className="text-xs font-medium">{BOND_TYPE_LABELS[bond.bonType]}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-gray-500 whitespace-nowrap">Statut:</span>
                          {isEditing ? (
                            <Select value={data.status} onValueChange={(v) => setEditData({ ...editData!, status: v })}>
                              <SelectTrigger className="text-xs h-6 flex-1">
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
                        </div>
                      </div>
                    </TableCell>

                    {/* Dates (Début + Fin combined) */}
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-gray-500 whitespace-nowrap">Début:</span>
                          {isEditing ? (
                            <Input
                              type="date"
                              value={data.startDate ? new Date(data.startDate).toISOString().split('T')[0] : ''}
                              onChange={(e) => setEditData({ ...editData!, startDate: e.target.value ? new Date(e.target.value).toISOString() : null })}
                              className="text-xs h-6 flex-1"
                            />
                          ) : (
                            <span className="text-xs">
                              {bond.startDate ? new Date(bond.startDate).toLocaleDateString('fr-FR') : '-'}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-gray-500 whitespace-nowrap">Fin:</span>
                          {isEditing ? (
                            <Input
                              type="date"
                              value={data.endDate ? new Date(data.endDate).toISOString().split('T')[0] : ''}
                              onChange={(e) => setEditData({ ...editData!, endDate: e.target.value ? new Date(e.target.value).toISOString() : null })}
                              className="text-xs h-6 flex-1"
                            />
                          ) : (
                            <span className="text-xs">
                              {bond.endDate ? new Date(bond.endDate).toLocaleDateString('fr-FR') : '-'}
                            </span>
                          )}
                        </div>
                      </div>
                    </TableCell>

                    {/* Mois Couverts & Rappel Renouvellement (combined) */}
                    <TableCell>
                      <div className="space-y-1">
                        {/* Months */}
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-gray-500 whitespace-nowrap">Mois:</span>
                          {isEditing ? (
                            <div className="flex items-center gap-0.5">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => handleMonthsChange(Math.max(1, (data.coveredMonths || 1) - 1))}
                                disabled={(data.coveredMonths || 1) <= 1}
                                className="h-6 w-6 p-0"
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <div className="h-6 px-2 flex items-center justify-center border rounded text-xs font-semibold min-w-[32px] bg-white">
                                {data.coveredMonths || 1}
                              </div>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => handleMonthsChange(Math.min(12, (data.coveredMonths || 1) + 1))}
                                disabled={(data.coveredMonths || 1) >= 12}
                                className="h-6 w-6 p-0"
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : (
                            <span className="text-xs">{bond.coveredMonths}</span>
                          )}
                        </div>
                        {/* Reminder */}
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-gray-500 whitespace-nowrap">Rappel:</span>
                          {isEditing ? (
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-6 text-xs flex-1 justify-start font-normal"
                                >
                                  <CalendarIcon2 className="h-3 w-3 mr-1" />
                                  {data.renewalReminderDays ? `${data.renewalReminderDays}j` : '30j'}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                  mode="single"
                                  selected={data.startDate ? new Date(new Date(data.startDate).getTime() + (data.renewalReminderDays || 30) * 24 * 60 * 60 * 1000) : new Date(Date.now() + (data.renewalReminderDays || 30) * 24 * 60 * 60 * 1000)}
                                  onSelect={(date) => {
                                    if (date) {
                                      const baseDate = data.startDate ? new Date(data.startDate) : new Date();
                                      const diffTime = date.getTime() - baseDate.getTime();
                                      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                                      setEditData({ ...editData!, renewalReminderDays: Math.max(1, Math.min(90, diffDays)) });
                                    }
                                  }}
                                  disabled={(date) => date < new Date()}
                                  locale={fr}
                                />
                              </PopoverContent>
                            </Popover>
                          ) : (
                            <span className="text-xs">{bond.renewalReminderDays || 30}j</span>
                          )}
                        </div>
                      </div>
                    </TableCell>

                    {/* Totaux (button to show dialog with complement amount) */}
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedBondFinancials(bond);
                          setShowFinancialDialog(true);
                        }}
                        className="flex items-center gap-1 h-7 text-xs font-semibold text-orange-700 hover:text-orange-800 border-orange-200 hover:bg-orange-50"
                      >
                        <span className="text-[10px]">Complément:</span>
                        {Number(bond.complementAmount || 0).toFixed(2)} TND
                      </Button>
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

                    {/* Notes */}
                    <TableCell>
                      {isEditing ? (
                        <Textarea
                          placeholder="Notes..."
                          value={data.notes || ''}
                          onChange={(e) => setEditData({ ...editData!, notes: e.target.value })}
                          className="text-xs min-w-[200px] resize-none"
                          rows={2}
                        />
                      ) : (
                        <div className="text-xs min-w-[200px] max-w-[250px] whitespace-pre-wrap break-words">
                          {bond.notes || '-'}
                        </div>
                      )}
                    </TableCell>

                    {/* Créé le */}
                    <TableCell className="text-xs">{(bond as any).createdAt ? new Date((bond as any).createdAt).toLocaleString('fr-FR') : '-'}</TableCell>

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

      {/* Financial Details Dialog */}
      <Dialog open={showFinancialDialog} onOpenChange={setShowFinancialDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-blue-600" />
              Détails Financiers - Bon CNAM
            </DialogTitle>
          </DialogHeader>

          {selectedBondFinancials && (
            <div className="space-y-4">
              {/* Bond Number */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-xs text-blue-600 font-medium mb-1">Numéro de Bon</p>
                <p className="text-sm font-mono font-semibold text-blue-900">
                  {selectedBondFinancials.bonNumber || 'N/A'}
                </p>
              </div>

              {/* Monthly Rates */}
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-gray-700 border-b pb-1">Tarifs Mensuels</h4>
                <div className="flex justify-between items-center bg-gray-50 rounded p-2">
                  <span className="text-sm text-gray-600">Tarif CNAM/mois:</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {Number(selectedBondFinancials.cnamMonthlyRate || 0).toFixed(2)} TND
                  </span>
                </div>
                <div className="flex justify-between items-center bg-gray-50 rounded p-2">
                  <span className="text-sm text-gray-600">Tarif Appareil/mois:</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {Number(selectedBondFinancials.deviceMonthlyRate || 0).toFixed(2)} TND
                  </span>
                </div>
                <div className="flex justify-between items-center bg-gray-50 rounded p-2">
                  <span className="text-sm text-gray-600">Mois Couverts:</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {selectedBondFinancials.coveredMonths} mois
                  </span>
                </div>
              </div>

              {/* Totals */}
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-gray-700 border-b pb-1">Totaux Calculés</h4>
                <div className="flex justify-between items-center bg-blue-50 rounded p-2 border border-blue-200">
                  <span className="text-sm text-blue-700 font-medium">Montant Bon Total:</span>
                  <span className="text-base font-bold text-blue-700">
                    {Number(selectedBondFinancials.bonAmount || 0).toFixed(2)} TND
                  </span>
                </div>
                <div className="flex justify-between items-center bg-blue-50 rounded p-2 border border-blue-200">
                  <span className="text-sm text-blue-700 font-medium">Prix Appareil Total:</span>
                  <span className="text-base font-bold text-blue-700">
                    {Number(selectedBondFinancials.devicePrice || 0).toFixed(2)} TND
                  </span>
                </div>
                <div className="flex justify-between items-center bg-orange-50 rounded p-3 border-2 border-orange-300">
                  <span className="text-sm text-orange-700 font-bold">Complément Patient:</span>
                  <span className="text-lg font-bold text-orange-700">
                    {Number(selectedBondFinancials.complementAmount || 0).toFixed(2)} TND
                  </span>
                </div>
              </div>

              {/* Calculation Formula */}
              <div className="bg-gray-100 rounded p-3 text-xs text-gray-600">
                <p className="font-medium mb-1">Calcul:</p>
                <p>• Bon Total = Tarif CNAM × Mois</p>
                <p>• Prix Total = Tarif Appareil × Mois</p>
                <p className="font-semibold mt-1">• Complément = Prix Total - Bon Total</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
