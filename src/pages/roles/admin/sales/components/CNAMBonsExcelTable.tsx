import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Trash2,
  ChevronLeft,
  ChevronRight,
  Search,
  User,
  FileText,
  Calendar,
  TrendingUp,
  CheckCircle,
  Clock,
  AlertCircle,
  XCircle,
  Plus,
  Save,
  X,
  Edit2,
  Building2,
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { formatCurrency } from '@/utils/priceUtils';
import { useRouter } from 'next/router';
import { PatientSelectorDialog } from '@/components/dialogs/PatientSelectorDialog';

interface CNAMDossier {
  id: string;
  dossierNumber: string;
  bonType: string;
  bondAmount: number;
  devicePrice: number;
  complementAmount: number;
  currentStep: number;
  totalSteps: number;
  status: string;
  notes?: string;
  saleId: string;
  patientId: string;
  createdAt: string;
  updatedAt: string;
  patient?: {
    id: string;
    firstName: string;
    lastName: string;
    patientCode: string;
    telephone: string;
  };
  sale?: {
    id: string;
    saleCode: string;
    invoiceNumber: string;
  };
}

export default function CNAMBonsExcelTable() {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [bonTypeFilter, setBonTypeFilter] = useState<string>('all');
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editedData, setEditedData] = useState<any>({});
  const [selectedClient, setSelectedClient] = useState<{type: 'patient' | 'company', id: string, name: string} | null>(null);
  const [clientSales, setClientSales] = useState<any[]>([]);
  const [newBon, setNewBon] = useState({
    saleId: '',
    bonType: 'CPAP',
    status: 'EN_ATTENTE_APPROBATION',
    cnamMonthlyRate: 0,
    deviceMonthlyRate: 0,
    coveredMonths: 1, // For ACHAT, default to 1 (one-time purchase, not rental)
    dossierNumber: '',
    submissionDate: new Date().toISOString().split('T')[0],
    approvalDate: '',
    startDate: '',
    endDate: '',
    renewalReminderDays: 30,
    notes: '',
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const router = useRouter();

  // Fetch CNAM dossiers from sales
  const { data: salesData, isLoading: salesLoading } = useQuery({
    queryKey: ['sales'],
    queryFn: async () => {
      const response = await fetch('/api/sales');
      if (!response.ok) throw new Error('Failed to fetch sales');
      const data = await response.json();
      return data.sales || [];
    },
  });

  // Fetch CNAM bons for SALES only (category: ACHAT)
  const { data: saleBonsData, isLoading: saleBonsLoading } = useQuery({
    queryKey: ['sale-cnam-bons'],
    queryFn: async () => {
      const response = await fetch('/api/cnam-bons?category=ACHAT');
      if (!response.ok) throw new Error('Failed to fetch sale CNAM bons');
      const data = await response.json();
      return data;
    },
  });

  // Fetch CNAM nomenclature (fixed rates)
  const { data: cnamNomenclature } = useQuery({
    queryKey: ['cnam-nomenclature'],
    queryFn: async () => {
      const response = await fetch('/api/cnam-nomenclature');
      if (!response.ok) throw new Error('Failed to fetch CNAM nomenclature');
      return response.json();
    },
  });

  const isLoading = salesLoading || saleBonsLoading;

  // Combine CNAM dossiers from sales and sale CNAM bons
  const dossiers = useMemo(() => {
    const combined: any[] = [];

    // Ensure salesData is an array
    const salesArray = Array.isArray(salesData) ? salesData : (salesData?.sales || []);


    // Extract CNAM dossiers from sales (CNAMDossier model)
    if (salesArray && Array.isArray(salesArray)) {
      salesArray.forEach((sale: any) => {
        if (sale.cnamDossiers && Array.isArray(sale.cnamDossiers)) {
          sale.cnamDossiers.forEach((dossier: any) => {
            combined.push({
              ...dossier,
              sale: {
                id: sale.id,
                saleCode: sale.saleCode,
                invoiceNumber: sale.invoiceNumber,
              },
              source: 'cnam-dossier',
            });
          });
        }

        // Also extract CNAM bons from sales (CNAMBonRental with category ACHAT)
        if (sale.cnamBons && Array.isArray(sale.cnamBons)) {
          sale.cnamBons.forEach((bon: any) => {
            combined.push({
              id: bon.id,
              dossierNumber: bon.bonNumber || bon.dossierNumber || 'N/A',
              bonType: bon.bonType,
              bondAmount: bon.bonAmount,
              devicePrice: bon.devicePrice,
              complementAmount: bon.complementAmount,
              currentStep: bon.currentStep || (bon.status === 'TERMINE' ? 7 : bon.status === 'APPROUVE' ? 5 : 3),
              totalSteps: 7,
              status: bon.status,
              notes: bon.notes,
              patientId: bon.patientId,
              patient: bon.patient,
              saleId: bon.saleId,
              sale: {
                id: sale.id,
                saleCode: sale.saleCode,
                invoiceNumber: sale.invoiceNumber,
              },
              createdAt: bon.createdAt,
              updatedAt: bon.updatedAt,
              source: 'cnam-bon-sale',
            });
          });
        }
      });
    }

    // Add standalone sale CNAM bons (category: ACHAT) if not already included
    if (saleBonsData && Array.isArray(saleBonsData)) {
      saleBonsData.forEach((bon: any) => {
        // Only add if category is ACHAT (sale) not LOCATION (rental)
        if (bon.category === 'ACHAT' || bon.bondCategory === 'ACHAT') {
          combined.push({
            id: bon.id,
            dossierNumber: bon.bonNumber || bon.dossierNumber || 'N/A',
            bonType: bon.bonType,
            bondAmount: bon.bonAmount,
            devicePrice: bon.devicePrice,
            complementAmount: bon.complementAmount,
            currentStep: bon.currentStep || (bon.status === 'TERMINE' ? 7 : bon.status === 'APPROUVE' ? 5 : 3),
            totalSteps: 7,
            status: bon.status,
            notes: bon.notes,
            patientId: bon.patientId,
            patient: bon.patient,
            saleId: bon.saleId,
            sale: bon.sale, // Include sale object from API response
            createdAt: bon.createdAt,
            updatedAt: bon.updatedAt,
            source: 'cnam-bon-sale',
          });
        }
      });
    }

    return combined;
  }, [salesData, saleBonsData]);

  // Filter and search dossiers
  const filteredDossiers = useMemo(() => {
    if (!Array.isArray(dossiers)) return [];
    return dossiers.filter((dossier: CNAMDossier) => {
      // Search filter
      const searchLower = searchTerm.toLowerCase();
      const patientName = dossier.patient
        ? `${dossier.patient.firstName} ${dossier.patient.lastName}`
        : '';

      const matchesSearch =
        dossier.dossierNumber?.toLowerCase().includes(searchLower) ||
        patientName.toLowerCase().includes(searchLower) ||
        dossier.patient?.patientCode?.toLowerCase().includes(searchLower) ||
        dossier.sale?.saleCode?.toLowerCase().includes(searchLower);

      // Status filter
      const matchesStatus = statusFilter === 'all' || dossier.status === statusFilter;

      // Bond type filter
      const matchesBonType = bonTypeFilter === 'all' || dossier.bonType === bonTypeFilter;

      return matchesSearch && matchesStatus && matchesBonType;
    });
  }, [dossiers, searchTerm, statusFilter, bonTypeFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredDossiers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedDossiers = filteredDossiers.slice(startIndex, endIndex);

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (bonData: any) => {
      const response = await fetch('/api/cnam-bons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...bonData,
          category: 'ACHAT', // Sales category
        }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create CNAM bon');
      }
      return response.json();
    },
    onSuccess: async (data) => {
      // Refetch both queries to get the latest data
      await queryClient.refetchQueries({ queryKey: ['sales'] });
      await queryClient.refetchQueries({ queryKey: ['sale-cnam-bons'] });
      toast({ title: 'Succès', description: 'Bon CNAM créé avec succès' });
      setIsAddingNew(false);
      setSelectedClient(null);
      setClientSales([]);
      setNewBon({
        saleId: '',
        bonType: 'CPAP',
        status: 'EN_ATTENTE_APPROBATION',
        cnamMonthlyRate: 0,
        deviceMonthlyRate: 0,
        coveredMonths: 1,
        dossierNumber: '',
        submissionDate: new Date().toISOString().split('T')[0],
        approvalDate: '',
        startDate: '',
        endDate: '',
        renewalReminderDays: 30,
        notes: '',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de créer le bon CNAM',
        variant: 'destructive'
      });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (updatedBon: Partial<CNAMDossier>) => {
      const response = await fetch(`/api/cnam-bons/${updatedBon.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedBon),
      });
      if (!response.ok) throw new Error('Failed to update CNAM bon');
      return response.json();
    },
    onSuccess: (updatedBon) => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['sale-cnam-bons'] });
      toast({ title: 'Succès', description: 'Bon CNAM mis à jour avec succès' });
      setEditingId(null);
      setEditedData({});
    },
    onError: () => {
      toast({
        title: 'Erreur',
        description: 'Impossible de mettre à jour le bon CNAM',
        variant: 'destructive'
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/cnam-bons/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete CNAM dossier');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cnam-dossiers'] });
      toast({ title: 'Succès', description: 'Dossier CNAM supprimé avec succès' });
    },
    onError: () => {
      toast({
        title: 'Erreur',
        description: 'Impossible de supprimer le dossier CNAM',
        variant: 'destructive'
      });
    },
  });

  const handleDelete = (id: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce dossier CNAM ?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleViewDetails = (dossier: CNAMDossier) => {
    if (dossier.saleId) {
      router.push(`/roles/admin/sales/${dossier.saleId}`);
    }
  };

  const handleSaveNew = () => {
    if (!selectedClient || !newBon.saleId) {
      toast({
        title: 'Erreur',
        description: 'Veuillez sélectionner un client et une vente',
        variant: 'destructive'
      });
      return;
    }

    createMutation.mutate({
      ...newBon,
      patientId: selectedClient.type === 'patient' ? selectedClient.id : null,
    });
  };

  const handleCancelNew = () => {
    setIsAddingNew(false);
    setSelectedClient(null);
    setClientSales([]);
    setNewBon({
      saleId: '',
      bonType: 'CPAP',
      status: 'EN_ATTENTE_APPROBATION',
      cnamMonthlyRate: 0,
      deviceMonthlyRate: 0,
      coveredMonths: 1,
      dossierNumber: '',
      submissionDate: new Date().toISOString().split('T')[0],
      approvalDate: '',
      startDate: '',
      endDate: '',
      renewalReminderDays: 30,
      notes: '',
    });
  };

  const handleEdit = (dossier: CNAMDossier) => {
    setEditingId(dossier.id);
    setEditedData(dossier);
  };

  const handleSave = () => {
    if (editingId && editedData) {
      updateMutation.mutate({
        id: editingId,
        bonType: editedData.bonType,
        status: editedData.status,
        currentStep: editedData.currentStep,
        bondAmount: editedData.bondAmount,
        devicePrice: editedData.devicePrice,
        complementAmount: editedData.complementAmount,
        dossierNumber: editedData.dossierNumber,
        notes: editedData.notes,
      });
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditedData({});
  };

  const handleFieldChange = (field: string, value: any) => {
    setEditedData({ ...editedData, [field]: value });
  };

  const handleSelectClient = (type: 'patient' | 'company', id: string, name: string) => {
    const client = { type, id, name };
    setSelectedClient(client);


    // Fetch sales for this client - ensure salesData is an array
    // Handle both array format and { sales: [...] } object format
    const salesArray = Array.isArray(salesData) ? salesData : (salesData?.sales || []);

    const clientSales = salesArray.filter((sale: any) => {
      if (type === 'patient') {
        const matches = sale.patientId === id;
        return matches;
      } else {
        const matches = sale.companyId === id;
        return matches;
      }
    });

    setClientSales(clientSales);
  };

  const handleBonTypeChange = (bonType: string) => {
    // Get CNAM fixed rate from nomenclature based on bon type
    const nomenclatureEntry = cnamNomenclature?.find(
      (entry: any) => entry.bonType === bonType && entry.category === 'ACHAT'
    );

    // Use the fixed CNAM rate from nomenclature
    const cnamMonthlyRate = nomenclatureEntry?.amount || nomenclatureEntry?.monthlyRate || 0;

    setNewBon(prev => ({
      ...prev,
      bonType,
      cnamMonthlyRate: parseFloat(cnamMonthlyRate.toString()),
    }));
  };

  const handleSaleChange = (saleId: string) => {
    // Find the selected sale and auto-calculate amounts from items
    const selectedSale = clientSales.find((sale: any) => sale.id === saleId);
    if (selectedSale && selectedSale.items && selectedSale.items.length > 0) {
      // For ACHAT (purchase), calculate the TOTAL device price, not monthly
      // The sale total already includes all items (e.g., CPAP 1475 + Masque 200 = 1675)
      const totalDevicePrice = selectedSale.items.reduce((sum: number, item: any) => {
        return sum + (parseFloat(item.itemTotal) || 0);
      }, 0);

      // For ACHAT, we set coveredMonths to 1 (one-time purchase)
      // So deviceMonthlyRate is actually the total device price
      setNewBon(prev => ({
        ...prev,
        saleId,
        deviceMonthlyRate: parseFloat(totalDevicePrice.toFixed(2)),
        coveredMonths: 1, // One-time purchase
      }));
    } else {
      setNewBon({ ...newBon, saleId });
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string; icon: any }> = {
      EN_ATTENTE_APPROBATION: { label: 'En attente', className: 'bg-yellow-100 text-yellow-700 border-yellow-200', icon: Clock },
      APPROUVE: { label: 'Approuvé', className: 'bg-green-100 text-green-700 border-green-200', icon: CheckCircle },
      EN_COURS: { label: 'En cours', className: 'bg-blue-100 text-blue-700 border-blue-200', icon: TrendingUp },
      TERMINE: { label: 'Terminé', className: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: CheckCircle },
      REFUSE: { label: 'Refusé', className: 'bg-red-100 text-red-700 border-red-200', icon: XCircle },
    };
    const config = statusConfig[status] || { label: status, className: 'bg-gray-100 text-gray-700', icon: AlertCircle };
    const Icon = config.icon;

    return (
      <Badge variant="outline" className={`${config.className} text-xs flex items-center gap-1`}>
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const getBonTypeBadge = (bonType: string) => {
    const typeConfig: Record<string, { label: string; className: string }> = {
      CPAP: { label: 'CPAP', className: 'bg-blue-100 text-blue-700' },
      MASQUE: { label: 'Masque', className: 'bg-purple-100 text-purple-700' },
      AUTRE: { label: 'Autre', className: 'bg-gray-100 text-gray-700' },
    };
    const config = typeConfig[bonType] || typeConfig.AUTRE;
    return <Badge variant="outline" className={`${config.className} text-xs font-semibold`}>{config.label}</Badge>;
  };

  const getProgressBar = (currentStep: number, totalSteps: number) => {
    const percentage = (currentStep / totalSteps) * 100;

    // CNAM step names
    const stepNames: { [key: number]: string } = {
      1: 'En attente approbation CNAM',
      2: 'Accord avec patient',
      3: 'Tech récupère Bon CNAM',
      4: 'Livraison Bon à Admin',
      5: 'Livraison au Technicien',
      6: 'Signature Médecin',
      7: 'Livraison finale Admin',
    };

    const stepName = stepNames[currentStep] || `Étape ${currentStep}`;

    return (
      <div className="w-full">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-slate-600 truncate" title={stepName}>
            Étape {currentStep}/{totalSteps} - {stepName}
          </span>
          <span className="text-xs font-semibold text-blue-700 ml-2">{Math.round(percentage)}%</span>
        </div>
        <div className="w-full bg-slate-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-500">Chargement des dossiers CNAM...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters and Search */}
      <div className="flex items-center gap-4 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Rechercher par dossier, patient, code patient..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filtrer par statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="EN_ATTENTE_APPROBATION">En attente</SelectItem>
            <SelectItem value="APPROUVE">Approuvé</SelectItem>
            <SelectItem value="EN_COURS">En cours</SelectItem>
            <SelectItem value="TERMINE">Terminé</SelectItem>
            <SelectItem value="REFUSE">Refusé</SelectItem>
          </SelectContent>
        </Select>
        <Select value={bonTypeFilter} onValueChange={setBonTypeFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filtrer par type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les types</SelectItem>
            <SelectItem value="CPAP">CPAP</SelectItem>
            <SelectItem value="MASQUE">Masque</SelectItem>
            <SelectItem value="AUTRE">Autre</SelectItem>
          </SelectContent>
        </Select>
        <Button
          onClick={() => setIsAddingNew(true)}
          className="bg-green-600 hover:bg-green-700 text-white gap-2"
        >
          <Plus className="h-4 w-4" />
          Ajouter Bon CNAM
        </Button>
      </div>

      {/* Excel-like Table */}
      <div className="border rounded-lg overflow-hidden bg-white">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead className="bg-slate-50 sticky top-0 z-10">
              <tr className="border-b border-slate-200">
                <th className="px-3 py-3 text-left text-xs font-semibold text-slate-700 border-r border-slate-200 min-w-[140px]">N° Dossier</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-slate-700 border-r border-slate-200 min-w-[200px]">Patient</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-slate-700 border-r border-slate-200 min-w-[120px]">Vente</th>
                <th className="px-3 py-3 text-center text-xs font-semibold text-slate-700 border-r border-slate-200 min-w-[100px]">Type Bon</th>
                <th className="px-3 py-3 text-right text-xs font-semibold text-slate-700 border-r border-slate-200 min-w-[120px]">Montant Bon</th>
                <th className="px-3 py-3 text-right text-xs font-semibold text-slate-700 border-r border-slate-200 min-w-[120px]">Prix Appareil</th>
                <th className="px-3 py-3 text-right text-xs font-semibold text-slate-700 border-r border-slate-200 min-w-[120px]">Complément</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-slate-700 border-r border-slate-200 min-w-[180px]">Progression</th>
                <th className="px-3 py-3 text-center text-xs font-semibold text-slate-700 border-r border-slate-200 min-w-[140px]">Statut</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-slate-700 border-r border-slate-200 min-w-[120px]">Date Création</th>
                <th className="px-3 py-3 text-center text-xs font-semibold text-slate-700 sticky right-0 bg-slate-50 shadow-[-2px_0_4px_rgba(0,0,0,0.05)] min-w-[120px]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {/* New Bon Row */}
              {isAddingNew && (
                <tr className="bg-green-50/50 border-b-2 border-green-200">
                  {/* Dossier Number */}
                  <td className="px-3 py-2.5 text-xs border-r border-slate-100">
                    <Input
                      value={newBon.dossierNumber}
                      onChange={(e) => setNewBon({ ...newBon, dossierNumber: e.target.value })}
                      className="h-8 text-xs"
                      placeholder="N° Dossier"
                    />
                  </td>

                  {/* Patient/Client */}
                  <td className="px-3 py-2.5 border-r border-slate-100">
                    {selectedClient ? (
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {selectedClient.name}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedClient(null)}
                          className="h-6 w-6 p-0"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <PatientSelectorDialog
                        onSelect={handleSelectClient}
                        selectedId={undefined}
                        selectedName={undefined}
                        trigger={
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs w-full"
                          >
                            <User className="h-3 w-3 mr-1" />
                            Sélectionner client
                          </Button>
                        }
                      />
                    )}
                  </td>

                  {/* Sale */}
                  <td className="px-3 py-2.5 border-r border-slate-100">
                    <Select
                      value={newBon.saleId}
                      onValueChange={handleSaleChange}
                      disabled={!selectedClient}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Sélectionner vente" />
                      </SelectTrigger>
                      <SelectContent>
                        {clientSales.map((sale: any) => (
                          <SelectItem key={sale.id} value={sale.id}>
                            {sale.saleCode} - {formatCurrency(sale.totalAmount || 0)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>

                  {/* Bon Type */}
                  <td className="px-3 py-2.5 border-r border-slate-100">
                    <Select
                      value={newBon.bonType}
                      onValueChange={handleBonTypeChange}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CPAP">CPAP ({cnamNomenclature?.find((e:any) => e.bonType === 'CPAP' && e.category === 'ACHAT')?.amount || 0} DT)</SelectItem>
                        <SelectItem value="MASQUE">Masque ({cnamNomenclature?.find((e:any) => e.bonType === 'MASQUE' && e.category === 'ACHAT')?.amount || 0} DT)</SelectItem>
                        <SelectItem value="VNI">VNI ({cnamNomenclature?.find((e:any) => e.bonType === 'VNI' && e.category === 'ACHAT')?.amount || 0} DT)</SelectItem>
                        <SelectItem value="CONCENTRATEUR_OXYGENE">Concentrateur ({cnamNomenclature?.find((e:any) => e.bonType === 'CONCENTRATEUR_OXYGENE' && e.category === 'ACHAT')?.amount || 0} DT)</SelectItem>
                        <SelectItem value="AUTRE">Autre ({cnamNomenclature?.find((e:any) => e.bonType === 'AUTRE' && e.category === 'ACHAT')?.amount || 0} DT)</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>

                  {/* CNAM Monthly Rate */}
                  <td className="px-3 py-2.5 border-r border-slate-100">
                    <Input
                      type="number"
                      step="0.01"
                      value={newBon.cnamMonthlyRate || ''}
                      onChange={(e) => setNewBon({ ...newBon, cnamMonthlyRate: parseFloat(e.target.value) || 0 })}
                      className="h-8 text-xs text-right bg-green-50"
                      placeholder="Auto-calculé"
                      title="Auto-calculé depuis la vente (modifiable)"
                    />
                  </td>

                  {/* Device Monthly Rate */}
                  <td className="px-3 py-2.5 border-r border-slate-100">
                    <Input
                      type="number"
                      step="0.01"
                      value={newBon.deviceMonthlyRate || ''}
                      onChange={(e) => setNewBon({ ...newBon, deviceMonthlyRate: parseFloat(e.target.value) || 0 })}
                      className="h-8 text-xs text-right bg-green-50"
                      placeholder="Auto-calculé"
                      title="Auto-calculé depuis la vente (modifiable)"
                    />
                  </td>

                  {/* Complément - Display calculated (devicePrice - bonAmount) */}
                  <td className="px-3 py-2.5 border-r border-slate-100">
                    <div className="text-xs text-right font-semibold text-slate-700">
                      {formatCurrency((newBon.deviceMonthlyRate * newBon.coveredMonths) - (newBon.cnamMonthlyRate * newBon.coveredMonths))}
                    </div>
                  </td>

                  {/* Progression - Display calculated */}
                  <td className="px-3 py-2.5 border-r border-slate-100">
                    <div className="text-xs text-slate-600">Auto-calculé</div>
                  </td>

                  {/* Status */}
                  <td className="px-3 py-2.5 border-r border-slate-100">
                    <Select
                      value={newBon.status}
                      onValueChange={(value) => setNewBon({ ...newBon, status: value })}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="EN_ATTENTE_APPROBATION">En attente</SelectItem>
                        <SelectItem value="APPROUVE">Approuvé</SelectItem>
                        <SelectItem value="EN_COURS">En cours</SelectItem>
                        <SelectItem value="TERMINE">Terminé</SelectItem>
                        <SelectItem value="REFUSE">Refusé</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>

                  {/* Created Date */}
                  <td className="px-3 py-2.5 border-r border-slate-100">
                    <Input
                      type="date"
                      value={newBon.submissionDate}
                      onChange={(e) => setNewBon({ ...newBon, submissionDate: e.target.value })}
                      className="h-8 text-xs"
                    />
                  </td>

                  {/* Actions */}
                  <td className="px-3 py-2.5 sticky right-0 bg-green-50/50 shadow-[-2px_0_4px_rgba(0,0,0,0.05)]">
                    <div className="flex items-center justify-center gap-1">
                      <Button
                        size="sm"
                        onClick={handleSaveNew}
                        disabled={createMutation.isPending}
                        className="h-8 w-8 p-0 bg-green-600 hover:bg-green-700 text-white"
                        title="Enregistrer"
                      >
                        <Save className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleCancelNew}
                        disabled={createMutation.isPending}
                        className="h-8 w-8 p-0 hover:bg-red-100 hover:text-red-700"
                        title="Annuler"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              )}

              {paginatedDossiers.map((dossier: CNAMDossier, index: number) => {
                const patientName = dossier.patient
                  ? `${dossier.patient.firstName} ${dossier.patient.lastName}`
                  : 'N/A';

                const isEditing = editingId === dossier.id;
                const currentData = isEditing ? editedData : dossier;

                return (
                  <tr
                    key={dossier.id}
                    className={`border-b border-slate-100 hover:bg-blue-50/50 transition-colors ${
                      index % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'
                    } ${isEditing ? 'bg-blue-50' : ''}`}
                  >
                    {/* Dossier Number */}
                    <td className="px-3 py-2.5 text-xs border-r border-slate-100">
                      <div className="flex items-center gap-2">
                        <FileText className="h-3 w-3 text-red-600" />
                        <Badge variant="outline" className="text-xs font-mono font-semibold">
                          {dossier.dossierNumber}
                        </Badge>
                      </div>
                    </td>

                    {/* Patient */}
                    <td className="px-3 py-2.5 text-sm font-medium text-slate-900 border-r border-slate-100">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-blue-600" />
                        <div>
                          <div>{patientName}</div>
                          {dossier.patient?.patientCode && (
                            <Badge variant="outline" className="text-xs mt-1">
                              {dossier.patient.patientCode}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Sale */}
                    <td className="px-3 py-2.5 text-xs border-r border-slate-100">
                      {dossier.sale ? (
                        <Badge variant="outline" className="text-xs">
                          {dossier.sale.saleCode}
                        </Badge>
                      ) : (
                        '-'
                      )}
                    </td>

                    {/* Bon Type */}
                    <td className="px-3 py-2.5 text-center border-r border-slate-100">
                      {getBonTypeBadge(dossier.bonType)}
                    </td>

                    {/* Bond Amount */}
                    <td className="px-3 py-2.5 text-right text-sm font-semibold text-red-700 border-r border-slate-100">
                      {formatCurrency(Number(dossier.bondAmount))}
                    </td>

                    {/* Device Price */}
                    <td className="px-3 py-2.5 text-right text-sm font-medium text-slate-900 border-r border-slate-100">
                      {formatCurrency(Number(dossier.devicePrice))}
                    </td>

                    {/* Complement Amount */}
                    <td className="px-3 py-2.5 text-right text-sm font-semibold text-orange-700 border-r border-slate-100">
                      {formatCurrency(Number(dossier.complementAmount))}
                    </td>

                    {/* Progress - Editable current step */}
                    <td className="px-3 py-2.5 border-r border-slate-100">
                      {isEditing ? (
                        <div className="flex items-center gap-2">
                          <Select
                            value={currentData.currentStep?.toString() || '1'}
                            onValueChange={(value) => handleFieldChange('currentStep', parseInt(value))}
                          >
                            <SelectTrigger className="h-8 text-xs w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="1">Étape 1 - En attente approbation CNAM</SelectItem>
                              <SelectItem value="2">Étape 2 - Accord avec patient</SelectItem>
                              <SelectItem value="3">Étape 3 - Tech récupère Bon CNAM</SelectItem>
                              <SelectItem value="4">Étape 4 - Livraison Bon à Admin</SelectItem>
                              <SelectItem value="5">Étape 5 - Livraison au Technicien</SelectItem>
                              <SelectItem value="6">Étape 6 - Signature Médecin</SelectItem>
                              <SelectItem value="7">Étape 7 - Livraison finale Admin</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      ) : (
                        getProgressBar(dossier.currentStep, 7)
                      )}
                    </td>

                    {/* Status - Editable */}
                    <td className="px-3 py-2.5 text-center border-r border-slate-100">
                      {isEditing ? (
                        <Select
                          value={currentData.status || 'EN_ATTENTE_APPROBATION'}
                          onValueChange={(value) => handleFieldChange('status', value)}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="EN_ATTENTE_APPROBATION">En attente</SelectItem>
                            <SelectItem value="APPROUVE">Approuvé</SelectItem>
                            <SelectItem value="TERMINE">Terminé</SelectItem>
                            <SelectItem value="REFUSE">Refusé</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        getStatusBadge(dossier.status)
                      )}
                    </td>

                    {/* Created At */}
                    <td className="px-3 py-2.5 text-xs text-slate-600 border-r border-slate-100">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3 w-3 text-slate-400" />
                        {new Date(dossier.createdAt).toLocaleDateString('fr-FR')}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-3 py-2.5 sticky right-0 bg-inherit shadow-[-2px_0_4px_rgba(0,0,0,0.05)]">
                      <div className="flex items-center justify-center gap-1">
                        {isEditing ? (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={handleSave}
                              className="h-8 w-8 p-0 bg-green-600 hover:bg-green-700 text-white"
                              title="Enregistrer"
                            >
                              <Save className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={handleCancel}
                              className="h-8 w-8 p-0 hover:bg-red-100 hover:text-red-700"
                              title="Annuler"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewDetails(dossier)}
                              className="h-8 w-8 p-0 hover:bg-blue-100 hover:text-blue-700"
                              title="Voir détails"
                            >
                              <FileText className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(dossier)}
                              className="h-8 w-8 p-0 hover:bg-orange-100 hover:text-orange-700"
                              title="Modifier"
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(dossier.id)}
                              className="h-8 w-8 p-0 hover:bg-red-100 hover:text-red-700"
                              title="Supprimer"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-slate-200 rounded-b-lg">
        <div className="flex items-center space-x-4">
          <div className="text-sm text-slate-600">
            <span className="font-semibold text-slate-900">{filteredDossiers.length}</span> dossier(s) CNAM au total
          </div>
          <Select value={itemsPerPage.toString()} onValueChange={(value) => setItemsPerPage(Number(value))}>
            <SelectTrigger className="w-[140px] h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="25">25 par page</SelectItem>
              <SelectItem value="50">50 par page</SelectItem>
              <SelectItem value="100">100 par page</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="h-9 px-3"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Précédent
          </Button>

          <div className="text-sm text-slate-600">
            Page {currentPage} sur {totalPages || 1}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages || totalPages === 0}
            className="h-9 px-3"
          >
            Suivant
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
}
