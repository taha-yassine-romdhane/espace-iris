import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Plus,
  Trash2,
  Save,
  X,
  ChevronLeft,
  ChevronRight,
  Search,
  Filter,
  Eye,
  Edit,
  CreditCard,
  Package,
  User,
  Building2,
  Calendar,
  DollarSign,
  FileText
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { formatCurrency } from '@/utils/priceUtils';
import { useRouter } from 'next/router';
import { SaleItemsDialog } from '@/components/sales/SaleItemsDialog';
import { SalePaymentsDialog } from '@/components/sales/SalePaymentsDialog';
import { PatientSelectorDialog } from '@/components/dialogs/PatientSelectorDialog';

interface Sale {
  id: string;
  saleCode: string;
  invoiceNumber?: string;
  saleDate: string;
  totalAmount: number;
  discount: number;
  finalAmount: number;
  status: string;
  notes: string;
  patientId?: string;
  companyId?: string;
  processedById: string;
  assignedToId?: string;
  patient?: {
    id: string;
    firstName: string;
    lastName: string;
    patientCode: string;
    telephone: string;
  };
  company?: {
    id: string;
    companyName: string;
    telephone: string;
  };
  processedBy?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  assignedTo?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  payment?: {
    id: string;
    paymentCode?: string;
    amount: number;
    remainingAmount?: number;
    status: string;
    method: string;
    paymentDetails?: Array<{
      id: string;
      paymentCode?: string;
      method: string;
      amount: number;
      status: string;
      paymentDate?: string;
      referenceNumber?: string;
      metadata?: any;
    }>;
  };
  payments?: Array<{
    id: string;
    paymentCode?: string;
    amount: number;
    status: string;
    method: string;
    paymentDate: string;
    referenceNumber?: string;
    chequeNumber?: string;
    bankName?: string;
    notes?: string;
  }>;
  cnamBons?: Array<{
    id: string;
    bonNumber: string;
    bonType: string;
    status: string;
    bonAmount: number;
    devicePrice: number;
    complementAmount: number;
    currentStep?: number;
    dossierNumber?: string;
    submissionDate?: string;
    approvalDate?: string;
    patient?: {
      id: string;
      patientCode: string;
      firstName: string;
      lastName: string;
      fullName: string;
    };
  }>;
  items?: SaleItem[];
}

interface SaleItem {
  id: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  itemTotal: number;
  serialNumber?: string;
  warranty?: string;
  productId?: string;
  product?: {
    id: string;
    productCode?: string;
    name: string;
    type: string;
    brand?: string;
    model?: string;
    sellingPrice?: number;
  };
  medicalDeviceId?: string;
  medicalDevice?: {
    id: string;
    deviceCode?: string;
    name: string;
    type: string;
    brand?: string;
    model?: string;
    serialNumber?: string;
    sellingPrice?: number;
  };
}

export default function SalesExcelTable() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editedData, setEditedData] = useState<Partial<Sale>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [clientFilter, setClientFilter] = useState<string>('all');
  const [dateRangeFilter, setDateRangeFilter] = useState<string>('all');
  const [amountRangeFilter, setAmountRangeFilter] = useState<string>('all');
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showItemsDialog, setShowItemsDialog] = useState(false);
  const [showCnamBonsDialog, setShowCnamBonsDialog] = useState(false);
  const [showItemsManagementDialog, setShowItemsManagementDialog] = useState(false);
  const [showPaymentsManagementDialog, setShowPaymentsManagementDialog] = useState(false);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [managingSaleId, setManagingSaleId] = useState<string | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [selectedClientName, setSelectedClientName] = useState<string>('');
  const [selectedClientType, setSelectedClientType] = useState<'patient' | 'company' | ''>('');
  const [newSaleData, setNewSaleData] = useState<Partial<Sale> & { items?: any[]; payments?: any[] }>({
    saleDate: new Date().toISOString().split('T')[0],
    status: 'PENDING',
    totalAmount: 0,
    discount: 0,
    finalAmount: 0,
    notes: '',
    items: [],
    payments: []
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const router = useRouter();
  const { data: session } = useSession();

  // Fetch sales with full details and no pagination (get all sales for filtering/searching)
  const { data: salesResponse, isLoading } = useQuery({
    queryKey: ['sales'],
    queryFn: async () => {
      const response = await fetch('/api/sales?details=true&paginate=false');
      if (!response.ok) throw new Error('Failed to fetch sales');
      return response.json();
    },
  });

  const salesData = salesResponse?.sales || [];

  // Fetch patients for dropdown
  const { data: patients } = useQuery({
    queryKey: ['patients'],
    queryFn: async () => {
      const response = await fetch('/api/patients');
      if (!response.ok) throw new Error('Failed to fetch patients');
      return response.json();
    },
  });

  // Fetch companies for dropdown
  const { data: companies } = useQuery({
    queryKey: ['companies'],
    queryFn: async () => {
      const response = await fetch('/api/societes');
      if (!response.ok) throw new Error('Failed to fetch companies');
      return response.json();
    },
  });

  // Fetch users for dropdown
  const { data: usersData } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const response = await fetch('/api/users');
      if (!response.ok) throw new Error('Failed to fetch users');
      return response.json();
    },
  });

  const users = usersData?.users || [];

  useEffect(() => {
    if (salesData && Array.isArray(salesData)) {
      setSales(salesData);
    }
  }, [salesData]);

  // Filter and search sales
  const filteredSales = useMemo(() => {
    if (!Array.isArray(sales)) return [];
    return sales.filter((sale) => {
      // Search filter
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch =
        sale.saleCode?.toLowerCase().includes(searchLower) ||
        sale.invoiceNumber?.toLowerCase().includes(searchLower) ||
        sale.patient?.firstName?.toLowerCase().includes(searchLower) ||
        sale.patient?.lastName?.toLowerCase().includes(searchLower) ||
        sale.company?.companyName?.toLowerCase().includes(searchLower) ||
        sale.notes?.toLowerCase().includes(searchLower);

      // Status filter
      const matchesStatus = statusFilter === 'all' || sale.status === statusFilter;

      // Client filter
      const matchesClient =
        clientFilter === 'all' ||
        (clientFilter === 'patient' && sale.patientId) ||
        (clientFilter === 'company' && sale.companyId);

      // Date range filter
      const matchesDateRange = (() => {
        if (dateRangeFilter === 'all') return true;
        const saleDate = new Date(sale.saleDate);
        const today = new Date();
        const thirtyDaysAgo = new Date(today);
        thirtyDaysAgo.setDate(today.getDate() - 30);
        const sixMonthsAgo = new Date(today);
        sixMonthsAgo.setMonth(today.getMonth() - 6);
        const oneYearAgo = new Date(today);
        oneYearAgo.setFullYear(today.getFullYear() - 1);

        if (dateRangeFilter === 'last-30-days') return saleDate >= thirtyDaysAgo;
        if (dateRangeFilter === 'last-6-months') return saleDate >= sixMonthsAgo;
        if (dateRangeFilter === 'last-year') return saleDate >= oneYearAgo;
        if (dateRangeFilter === 'older-than-year') return saleDate < oneYearAgo;
        return true;
      })();

      // Amount range filter
      const matchesAmountRange = (() => {
        if (amountRangeFilter === 'all') return true;
        const amount = Number(sale.finalAmount || sale.totalAmount);
        if (amountRangeFilter === 'less-100') return amount < 100;
        if (amountRangeFilter === '100-500') return amount >= 100 && amount < 500;
        if (amountRangeFilter === '500-1000') return amount >= 500 && amount < 1000;
        if (amountRangeFilter === '1000-5000') return amount >= 1000 && amount < 5000;
        if (amountRangeFilter === 'more-5000') return amount >= 5000;
        return true;
      })();

      return matchesSearch && matchesStatus && matchesClient && matchesDateRange && matchesAmountRange;
    });
  }, [sales, searchTerm, statusFilter, clientFilter, dateRangeFilter, amountRangeFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredSales.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedSales = filteredSales.slice(startIndex, endIndex);

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (updatedSale: Partial<Sale>) => {
      const response = await fetch(`/api/sales/${updatedSale.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedSale),
      });
      if (!response.ok) throw new Error('Failed to update sale');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      toast({ title: 'Succès', description: 'Vente mise à jour avec succès' });
      setEditingId(null);
      setEditedData({});
    },
    onError: (error) => {
      toast({
        title: 'Erreur',
        description: 'Impossible de mettre à jour la vente',
        variant: 'destructive'
      });
    },
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (newSale: Partial<Sale>) => {
      const response = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSale),
      });
      if (!response.ok) throw new Error('Failed to create sale');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      toast({ title: 'Succès', description: 'Vente créée avec succès' });
      setIsAddingNew(false);
      setSelectedClientName('');
      setSelectedClientType('');
      setNewSaleData({
        saleDate: new Date().toISOString().split('T')[0],
        status: 'PENDING',
        totalAmount: 0,
        discount: 0,
        finalAmount: 0,
        notes: '',
        items: [],
        payments: []
      });
    },
    onError: (error) => {
      toast({
        title: 'Erreur',
        description: 'Impossible de créer la vente',
        variant: 'destructive'
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/sales/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete sale');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      toast({ title: 'Succès', description: 'Vente supprimée avec succès' });
    },
    onError: (error) => {
      toast({
        title: 'Erreur',
        description: 'Impossible de supprimer la vente',
        variant: 'destructive'
      });
    },
  });

  const handleEdit = (sale: Sale) => {
    setEditingId(sale.id);
    setEditedData(sale);
  };

  const handleSave = () => {
    if (editingId && editedData) {
      updateMutation.mutate({ ...editedData, id: editingId });
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditedData({});
  };

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [saleToDelete, setSaleToDelete] = useState<string | null>(null);

  const handleDelete = (id: string) => {
    setSaleToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (saleToDelete) {
      deleteMutation.mutate(saleToDelete);
      setDeleteDialogOpen(false);
      setSaleToDelete(null);
    }
  };

  const cancelDelete = () => {
    setDeleteDialogOpen(false);
    setSaleToDelete(null);
  };

  const handleFieldChange = (field: string, value: any) => {
    setEditedData({ ...editedData, [field]: value });
  };

  const handleNewFieldChange = (field: string, value: any) => {
    setNewSaleData({ ...newSaleData, [field]: value });
  };

  const handleStartAddNew = () => {
    setIsAddingNew(true);
    setEditingId(null); // Cancel any existing edits
  };

  const handleSaveNew = () => {
    // No validation - allow creating sales without client, items, or payments
    // They can be added later through the management dialogs

    // Prepare the data in the format the API expects
    const salePayload = {
      ...newSaleData,
      saleDate: newSaleData.saleDate || new Date().toISOString().split('T')[0],
      totalAmount: newSaleData.totalAmount || 0,
      discount: newSaleData.discount || 0,
      finalAmount: newSaleData.finalAmount || newSaleData.totalAmount || 0,
      assignedToId: newSaleData.assignedToId || undefined,
      patientId: newSaleData.patientId || undefined,
      companyId: newSaleData.companyId || undefined,
      payment: newSaleData.payments && newSaleData.payments.length > 0 ? newSaleData.payments : undefined,
      items: newSaleData.items && newSaleData.items.length > 0 ? newSaleData.items : undefined,
    };

    createMutation.mutate(salePayload);
  };

  const handleCancelNew = () => {
    setIsAddingNew(false);
    setSelectedClientName('');
    setSelectedClientType('');
    setNewSaleData({
      saleDate: new Date().toISOString().split('T')[0],
      status: 'PENDING',
      totalAmount: 0,
      discount: 0,
      finalAmount: 0,
      notes: '',
      items: [],
      payments: []
    });
  };

  const handleViewDetails = (sale: Sale) => {
    router.push(`/roles/admin/sales/${sale.id}`);
  };

  const handleViewPayments = (sale: Sale) => {
    setSelectedSale(sale);
    setShowPaymentDialog(true);
  };

  const handleViewItems = (sale: Sale) => {
    setSelectedSale(sale);
    setShowItemsDialog(true);
  };

  const handleManageItems = (saleId: string) => {
    const sale = sales.find(s => s.id === saleId);
    if (sale) {
      setSelectedSale(sale);
      setShowItemsDialog(true);
    }
  };

  const handleManageNewSaleItems = () => {
    setShowItemsManagementDialog(true);
    setManagingSaleId('new');
  };

  const handleSaveItems = (items: any[]) => {
    if (managingSaleId === 'new') {
      // For new sale
      const totalAmount = items.reduce((sum, item) => sum + item.itemTotal, 0);
      setNewSaleData({
        ...newSaleData,
        items,
        totalAmount,
        finalAmount: totalAmount - (newSaleData.discount || 0)
      });
    } else if (managingSaleId) {
      // For existing sale - update via API
      updateMutation.mutate({
        id: managingSaleId,
        items
      });
    }
    setShowItemsManagementDialog(false);
    setManagingSaleId(null);
  };

  const handleManagePayments = (saleId: string) => {
    const sale = sales.find(s => s.id === saleId);
    if (sale) {
      setSelectedSale(sale);
      setShowPaymentDialog(true);
    }
  };

  const handleManageNewSalePayments = () => {
    // Allow adding payments without items - more flexible workflow
    setShowPaymentsManagementDialog(true);
    setManagingSaleId('new');
  };

  const handleSavePayments = (payments: any[]) => {
    if (managingSaleId === 'new') {
      // For new sale
      setNewSaleData({
        ...newSaleData,
        payments
      });
    } else if (managingSaleId) {
      // For existing sale - update via API
      updateMutation.mutate({
        id: managingSaleId,
        payment: payments
      });
    }
    setShowPaymentsManagementDialog(false);
    setManagingSaleId(null);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      COMPLETED: { label: 'Terminé', className: 'bg-green-100 text-green-700 border-green-200' },
      PENDING: { label: 'En attente', className: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
      CANCELLED: { label: 'Annulé', className: 'bg-red-100 text-red-700 border-red-200' },
    };
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.PENDING;
    return <Badge variant="outline" className={`${config.className} text-xs`}>{config.label}</Badge>;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-500">Chargement...</div>
      </div>
    );
  }

  // Count active filters
  const activeFiltersCount = [
    searchTerm !== '',
    statusFilter !== 'all',
    clientFilter !== 'all',
    dateRangeFilter !== 'all',
    amountRangeFilter !== 'all',
  ].filter(Boolean).length;

  // Clear all filters function
  const clearAllFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setClientFilter('all');
    setDateRangeFilter('all');
    setAmountRangeFilter('all');
  };

  return (
    <div className="space-y-4">
      {/* Central Filter Panel */}
      <div className="bg-gradient-to-r from-blue-50 to-slate-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg">
              <Filter className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Filtres de Recherche</h3>
              <p className="text-sm text-slate-600">
                {filteredSales.length} vente(s) sur {sales.length} au total
                {activeFiltersCount > 0 && (
                  <span className="ml-2 text-blue-600 font-medium">
                    ({activeFiltersCount} filtre{activeFiltersCount > 1 ? 's' : ''} actif{activeFiltersCount > 1 ? 's' : ''})
                  </span>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={handleStartAddNew}
              disabled={isAddingNew}
              className="gap-2 bg-green-600 hover:bg-green-700"
            >
              <Plus className="h-4 w-4" />
              Ajouter une Vente
            </Button>
            {activeFiltersCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={clearAllFilters}
                className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
              >
                <X className="h-4 w-4 mr-2" />
                Réinitialiser les filtres
              </Button>
            )}
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Rechercher par code vente, client, facture, notes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-11 bg-white border-slate-300 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Filter Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Status Filter */}
          <div>
            <label className="text-xs font-medium text-slate-700 mb-1.5 block">Statut</label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full bg-white border-slate-300">
                <SelectValue placeholder="Tous" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="COMPLETED">Terminé</SelectItem>
                <SelectItem value="PENDING">En attente</SelectItem>
                <SelectItem value="CANCELLED">Annulé</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Client Type Filter */}
          <div>
            <label className="text-xs font-medium text-slate-700 mb-1.5 block">Type de Client</label>
            <Select value={clientFilter} onValueChange={setClientFilter}>
              <SelectTrigger className="w-full bg-white border-slate-300">
                <SelectValue placeholder="Tous" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les clients</SelectItem>
                <SelectItem value="patient">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-blue-600" />
                    Patients
                  </div>
                </SelectItem>
                <SelectItem value="company">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-purple-600" />
                    Sociétés
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Date Range Filter */}
          <div>
            <label className="text-xs font-medium text-slate-700 mb-1.5 block">Période de Vente</label>
            <Select value={dateRangeFilter} onValueChange={setDateRangeFilter}>
              <SelectTrigger className="w-full bg-white border-slate-300">
                <SelectValue placeholder="Toutes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les périodes</SelectItem>
                <SelectItem value="last-30-days">30 derniers jours</SelectItem>
                <SelectItem value="last-6-months">6 derniers mois</SelectItem>
                <SelectItem value="last-year">Dernière année</SelectItem>
                <SelectItem value="older-than-year">Plus d'un an</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Amount Range Filter */}
          <div>
            <label className="text-xs font-medium text-slate-700 mb-1.5 block">Montant</label>
            <Select value={amountRangeFilter} onValueChange={setAmountRangeFilter}>
              <SelectTrigger className="w-full bg-white border-slate-300">
                <SelectValue placeholder="Tous" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les montants</SelectItem>
                <SelectItem value="less-100">&lt; 100 DT</SelectItem>
                <SelectItem value="100-500">100 - 500 DT</SelectItem>
                <SelectItem value="500-1000">500 - 1000 DT</SelectItem>
                <SelectItem value="1000-5000">1000 - 5000 DT</SelectItem>
                <SelectItem value="more-5000">&gt; 5000 DT</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Pagination - Top */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border border-slate-200 rounded-lg mb-3">
        <div className="flex items-center space-x-4">
          <div className="text-sm text-slate-600">
            <span className="font-semibold text-slate-900">{filteredSales.length}</span> vente(s) au total
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

        <div className="flex items-center space-x-3">
          {/* First Page Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(1)}
            disabled={currentPage === 1}
            className="h-9 px-2"
            title="Première page"
          >
            <ChevronLeft className="h-4 w-4" />
            <ChevronLeft className="h-4 w-4 -ml-2" />
          </Button>

          {/* Previous Page Button */}
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

          {/* Page Numbers */}
          <div className="flex items-center space-x-1">
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

          {/* Next Page Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="h-9 px-3"
          >
            Suivant
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>

          {/* Last Page Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(totalPages)}
            disabled={currentPage === totalPages}
            className="h-9 px-2"
            title="Dernière page"
          >
            <ChevronRight className="h-4 w-4" />
            <ChevronRight className="h-4 w-4 -ml-2" />
          </Button>

          {/* Page Jump Input */}
          <div className="flex items-center space-x-2 ml-2 pl-2 border-l border-slate-300">
            <span className="text-sm text-slate-600">Aller à:</span>
            <Input
              type="number"
              min="1"
              max={totalPages}
              value={currentPage}
              onChange={(e) => {
                const page = parseInt(e.target.value);
                if (page >= 1 && page <= totalPages) {
                  setCurrentPage(page);
                }
              }}
              className="h-9 w-16 text-sm text-center"
            />
            <span className="text-sm text-slate-600">/ {totalPages}</span>
          </div>
        </div>
      </div>

      {/* Excel-like Table */}
      <div className="border rounded-lg overflow-hidden bg-white">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead className="bg-slate-50 sticky top-0 z-10">
              <tr className="border-b border-slate-200">
                <th className="px-3 py-3 text-left text-xs font-semibold text-slate-700 border-r border-slate-200 min-w-[120px]">Code Vente</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-slate-700 border-r border-slate-200 min-w-[120px]">Facture</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-slate-700 border-r border-slate-200 min-w-[120px]">Date</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-slate-700 border-r border-slate-200 min-w-[200px]">Client</th>
                <th className="px-3 py-3 text-center text-xs font-semibold text-slate-700 border-r border-slate-200 min-w-[100px]">Type</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-slate-700 border-r border-slate-200 min-w-[150px]">Assigné à</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-slate-700 border-r border-slate-200 min-w-[150px]">Créé par</th>
                <th className="px-3 py-3 text-right text-xs font-semibold text-slate-700 border-r border-slate-200 min-w-[120px]">Montant Total</th>
                <th className="px-3 py-3 text-right text-xs font-semibold text-slate-700 border-r border-slate-200 min-w-[100px]">Remise</th>
                <th className="px-3 py-3 text-right text-xs font-semibold text-slate-700 border-r border-slate-200 min-w-[120px]">Montant Final</th>
                <th className="px-3 py-3 text-center text-xs font-semibold text-slate-700 border-r border-slate-200 min-w-[100px]">Statut</th>
                <th className="px-3 py-3 text-center text-xs font-semibold text-slate-700 border-r border-slate-200 min-w-[100px]">Articles</th>
                <th className="px-3 py-3 text-center text-xs font-semibold text-slate-700 border-r border-slate-200 min-w-[100px]">Paiements</th>
                <th className="px-3 py-3 text-center text-xs font-semibold text-slate-700 border-r border-slate-200 min-w-[120px]">Bons CNAM</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-slate-700 border-r border-slate-200 min-w-[300px]">Notes</th>
                <th className="px-3 py-3 text-center text-xs font-semibold text-slate-700 sticky right-0 bg-slate-50 shadow-[-2px_0_4px_rgba(0,0,0,0.05)] min-w-[150px]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {/* New Row for Adding Sale */}
              {isAddingNew && (
                <tr className="bg-green-50 border-b-2 border-green-200">
                  {/* Sale Code */}
                  <td className="px-3 py-2.5 text-xs border-r border-slate-100">
                    <Badge variant="outline" className="text-xs font-mono bg-gray-200">
                      Auto
                    </Badge>
                  </td>

                  {/* Invoice Number */}
                  <td className="px-3 py-2.5 text-xs border-r border-slate-100">
                    <Badge variant="outline" className="text-xs font-mono bg-gray-200">
                      Auto
                    </Badge>
                  </td>

                  {/* Date */}
                  <td className="px-3 py-2.5 text-xs border-r border-slate-100">
                    <Input
                      type="date"
                      value={newSaleData.saleDate || ''}
                      onChange={(e) => handleNewFieldChange('saleDate', e.target.value)}
                      className="h-8 text-xs"
                    />
                  </td>

                  {/* Client */}
                  <td className="px-3 py-2.5 border-r border-slate-100">
                    <PatientSelectorDialog
                      onSelect={(type, id, name) => {
                        setSelectedClientName(name);
                        setSelectedClientType(type);
                        setNewSaleData({
                          ...newSaleData,
                          patientId: type === 'patient' ? id : undefined,
                          companyId: type === 'company' ? id : undefined,
                        });
                      }}
                      selectedId={newSaleData.patientId || newSaleData.companyId}
                      selectedName={selectedClientName}
                      trigger={
                        <Button variant="outline" className="h-8 w-full justify-start text-xs">
                          {selectedClientName || 'Sélectionner un client'}
                        </Button>
                      }
                    />
                  </td>

                  {/* Type */}
                  <td className="px-3 py-2.5 text-center border-r border-slate-100">
                    {selectedClientType === 'patient' ? (
                      <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 text-xs">
                        <User className="h-3 w-3 mr-1" />
                        Patient
                      </Badge>
                    ) : selectedClientType === 'company' ? (
                      <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 text-xs">
                        <Building2 className="h-3 w-3 mr-1" />
                        Société
                      </Badge>
                    ) : (
                      '-'
                    )}
                  </td>

                  {/* Assigned To */}
                  <td className="px-3 py-2.5 border-r border-slate-100">
                    <Select
                      value={newSaleData.assignedToId || ''}
                      onValueChange={(value) => handleNewFieldChange('assignedToId', value)}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Sélectionner..." />
                      </SelectTrigger>
                      <SelectContent>
                        {users?.filter((u: any) => u.role === 'EMPLOYEE').map((user: any) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.firstName} {user.lastName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>

                  {/* Created By */}
                  <td className="px-3 py-2.5 text-xs text-slate-600 border-r border-slate-100">
                    <Badge variant="outline" className="text-xs bg-slate-100">
                      {(() => {
                        const currentUser = users?.find((u: any) => u.id === session?.user?.id);
                        return currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : session?.user?.id || '-';
                      })()}
                    </Badge>
                  </td>

                  {/* Total Amount */}
                  <td className="px-3 py-2.5 text-right text-sm font-medium border-r border-slate-100">
                    {formatCurrency(newSaleData.totalAmount || 0)}
                  </td>

                  {/* Discount */}
                  <td className="px-3 py-2.5 border-r border-slate-100">
                    <Input
                      type="number"
                      value={newSaleData.discount || 0}
                      onChange={(e) => handleNewFieldChange('discount', parseFloat(e.target.value) || 0)}
                      className="h-8 text-xs text-right"
                      step="0.01"
                    />
                  </td>

                  {/* Final Amount */}
                  <td className="px-3 py-2.5 text-right text-sm font-bold text-green-700 border-r border-slate-100">
                    {formatCurrency((newSaleData.totalAmount || 0) - (newSaleData.discount || 0))}
                  </td>

                  {/* Status */}
                  <td className="px-3 py-2.5 border-r border-slate-100">
                    <Select
                      value={newSaleData.status || 'PENDING'}
                      onValueChange={(value) => handleNewFieldChange('status', value)}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="COMPLETED">Terminé</SelectItem>
                        <SelectItem value="PENDING">En attente</SelectItem>
                        <SelectItem value="CANCELLED">Annulé</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>

                  {/* Items Count */}
                  <td className="px-3 py-2.5 text-center border-r border-slate-100">
                    <Badge variant="secondary" className="text-xs">
                      0
                    </Badge>
                  </td>

                  {/* Payments Count */}
                  <td className="px-3 py-2.5 text-center border-r border-slate-100">
                    <Badge variant="secondary" className="text-xs">
                      0
                    </Badge>
                  </td>

                  {/* CNAM Bons Count */}
                  <td className="px-3 py-2.5 text-center border-r border-slate-100">
                    <Badge variant="secondary" className="text-xs text-slate-400">
                      0
                    </Badge>
                  </td>

                  {/* Notes */}
                  <td className="px-3 py-2.5 border-r border-slate-100">
                    <Input
                      value={newSaleData.notes || ''}
                      onChange={(e) => handleNewFieldChange('notes', e.target.value)}
                      className="h-8 text-xs"
                      placeholder="Notes..."
                    />
                  </td>

                  {/* Actions */}
                  <td className="px-3 py-2.5 sticky right-0 bg-green-50 shadow-[-2px_0_4px_rgba(0,0,0,0.05)]">
                    <div className="flex items-center justify-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleSaveNew}
                        className="h-8 w-8 p-0 hover:bg-green-100 hover:text-green-700"
                        title="Sauvegarder"
                      >
                        <Save className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleCancelNew}
                        className="h-8 w-8 p-0 hover:bg-red-100 hover:text-red-700"
                        title="Annuler"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              )}

              {paginatedSales.map((sale, index) => {
                const isEditing = editingId === sale.id;
                const currentData = isEditing ? editedData : sale;

                return (
                  <tr
                    key={sale.id}
                    className={`border-b border-slate-100 hover:bg-blue-50/50 transition-colors ${
                      index % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'
                    }`}
                  >
                    {/* Sale Code */}
                    <td className="px-3 py-2.5 text-xs border-r border-slate-100">
                      <Badge variant="outline" className="text-xs font-mono">
                        {sale.saleCode || 'N/A'}
                      </Badge>
                    </td>

                    {/* Invoice Number */}
                    <td className="px-3 py-2.5 text-xs border-r border-slate-100 whitespace-nowrap">
                      <Badge variant="outline" className="text-xs font-mono bg-blue-50 text-blue-700 border-blue-200">
                        {sale.invoiceNumber || 'N/A'}
                      </Badge>
                    </td>

                    {/* Date */}
                    <td className="px-3 py-2.5 text-xs text-slate-600 border-r border-slate-100">
                      {isEditing ? (
                        <Input
                          type="date"
                          value={currentData.saleDate ? new Date(currentData.saleDate).toISOString().split('T')[0] : ''}
                          onChange={(e) => handleFieldChange('saleDate', e.target.value)}
                          className="h-8 text-xs"
                        />
                      ) : (
                        new Date(sale.saleDate).toLocaleDateString('fr-FR')
                      )}
                    </td>

                    {/* Client */}
                    <td className="px-3 py-2.5 text-sm font-medium text-slate-900 border-r border-slate-100">
                      {isEditing ? (
                        <PatientSelectorDialog
                          onSelect={(type, id, name) => {
                            setEditedData({
                              ...editedData,
                              patientId: type === 'patient' ? id : undefined,
                              companyId: type === 'company' ? id : undefined,
                            });
                          }}
                          selectedId={currentData.patientId || currentData.companyId}
                          selectedName={
                            currentData.patient
                              ? `${currentData.patient.firstName} ${currentData.patient.lastName}`
                              : currentData.company?.companyName || ''
                          }
                          trigger={
                            <Button variant="outline" className="h-8 w-full justify-start text-xs">
                              {currentData.patient
                                ? `${currentData.patient.firstName} ${currentData.patient.lastName}`
                                : currentData.company?.companyName || 'Sélectionner un client'}
                            </Button>
                          }
                        />
                      ) : (
                        sale.patient ? (
                          <div className="flex flex-col gap-1">
                            <div
                              className="flex items-center gap-2 text-blue-600 hover:text-blue-800 hover:underline cursor-pointer transition-colors"
                              onClick={() => router.push(`/roles/admin/renseignement/patient/${sale.patient.id}`)}
                            >
                              <User className="h-4 w-4" />
                              <span>{`${sale.patient.firstName} ${sale.patient.lastName}`}</span>
                            </div>
                            {sale.patient.patientCode && (
                              <div
                                className="text-xs text-slate-500 font-mono cursor-pointer hover:text-blue-600 transition-colors ml-6"
                                onClick={() => router.push(`/roles/admin/renseignement/patient/${sale.patient.id}`)}
                              >
                                {sale.patient.patientCode}
                              </div>
                            )}
                          </div>
                        ) : sale.company ? (
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-purple-600" />
                            <span>{sale.company.companyName}</span>
                          </div>
                        ) : (
                          '-'
                        )
                      )}
                    </td>

                    {/* Type */}
                    <td className="px-3 py-2.5 text-center border-r border-slate-100">
                      {sale.patientId ? (
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
                          Patient
                        </Badge>
                      ) : sale.companyId ? (
                        <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 text-xs">
                          Société
                        </Badge>
                      ) : (
                        '-'
                      )}
                    </td>

                    {/* Assigned To */}
                    <td className="px-3 py-2.5 text-xs text-slate-600 border-r border-slate-100">
                      {isEditing ? (
                        <Select
                          value={currentData.assignedToId || ''}
                          onValueChange={(value) => handleFieldChange('assignedToId', value)}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Sélectionner..." />
                          </SelectTrigger>
                          <SelectContent>
                            {users?.filter((u: any) => u.role === 'EMPLOYEE').map((user: any) => (
                              <SelectItem key={user.id} value={user.id}>
                                {user.firstName} {user.lastName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        sale.assignedTo ? `${sale.assignedTo.firstName} ${sale.assignedTo.lastName}` : '-'
                      )}
                    </td>

                    {/* Created By */}
                    <td className="px-3 py-2.5 text-xs text-slate-600 border-r border-slate-100">
                      {sale.processedBy ? `${sale.processedBy.firstName} ${sale.processedBy.lastName}` : '-'}
                    </td>

                    {/* Total Amount */}
                    <td className="px-3 py-2.5 text-right text-sm font-medium text-slate-900 border-r border-slate-100">
                      {formatCurrency(Number(sale.totalAmount))}
                    </td>

                    {/* Discount */}
                    <td className="px-3 py-2.5 text-right text-xs text-slate-600 border-r border-slate-100">
                      {sale.discount ? formatCurrency(Number(sale.discount)) : '-'}
                    </td>

                    {/* Final Amount */}
                    <td className="px-3 py-2.5 text-right text-sm font-bold text-green-700 border-r border-slate-100">
                      {formatCurrency(Number(sale.finalAmount))}
                    </td>

                    {/* Status */}
                    <td className="px-3 py-2.5 text-center border-r border-slate-100 whitespace-nowrap">
                      {isEditing ? (
                        <Select
                          value={currentData.status}
                          onValueChange={(value) => handleFieldChange('status', value)}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="COMPLETED">Terminé</SelectItem>
                            <SelectItem value="PENDING">En attente</SelectItem>
                            <SelectItem value="CANCELLED">Annulé</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        getStatusBadge(sale.status)
                      )}
                    </td>

                    {/* Items Count */}
                    <td className="px-3 py-2.5 text-center border-r border-slate-100">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleManageItems(sale.id)}
                        className={`h-8 px-2 ${(sale.items?.length || 0) > 0 ? 'bg-blue-50 text-blue-700 hover:bg-blue-100' : 'text-slate-500 hover:bg-slate-100'}`}
                      >
                        <Package className="h-4 w-4 mr-1" />
                        <Badge variant="secondary" className="text-xs">
                          {sale.items?.length || 0}
                        </Badge>
                      </Button>
                    </td>

                    {/* Payments Count */}
                    <td className="px-3 py-2.5 text-center border-r border-slate-100">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleManagePayments(sale.id)}
                        className={`h-8 px-2 ${(sale.payment?.paymentDetails && sale.payment.paymentDetails.length > 0) ? 'bg-green-50 text-green-700 hover:bg-green-100' : 'text-slate-500 hover:bg-slate-100'}`}
                      >
                        <CreditCard className="h-4 w-4 mr-1" />
                        <Badge variant="secondary" className="text-xs">
                          {sale.payment?.paymentDetails?.length || 0}
                        </Badge>
                      </Button>
                    </td>

                    {/* CNAM Bons Count */}
                    <td className="px-3 py-2.5 text-center border-r border-slate-100">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedSale(sale);
                          setShowCnamBonsDialog(true);
                        }}
                        className={`h-8 px-2 ${(sale.cnamBons?.length || 0) > 0 ? 'bg-purple-50 text-purple-700 hover:bg-purple-100' : 'text-slate-400 hover:bg-slate-100'}`}
                      >
                        <FileText className="h-4 w-4 mr-1" />
                        <Badge variant="secondary" className="text-xs">
                          {sale.cnamBons?.length || 0}
                        </Badge>
                      </Button>
                    </td>

                    {/* Notes */}
                    <td className="px-3 py-2.5 text-xs text-slate-600 border-r border-slate-100">
                      {isEditing ? (
                        <Input
                          value={currentData.notes || ''}
                          onChange={(e) => handleFieldChange('notes', e.target.value)}
                          className="h-8 text-xs"
                          placeholder="Notes..."
                        />
                      ) : (
                        <div className="truncate max-w-[200px]" title={sale.notes || ''}>
                          {sale.notes || '-'}
                        </div>
                      )}
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
                              className="h-8 w-8 p-0 hover:bg-green-100 hover:text-green-700"
                              title="Sauvegarder"
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
                              onClick={() => handleEdit(sale)}
                              className="h-8 w-8 p-0 hover:bg-blue-100 hover:text-blue-700"
                              title="Modifier"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewDetails(sale)}
                              className="h-8 w-8 p-0 hover:bg-green-100 hover:text-green-700"
                              title="Voir détails"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(sale.id)}
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

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Paiements - {selectedSale?.saleCode}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedSale?.payment ? (
              <div className="space-y-3">
                {/* Payment Summary */}
                <div className="border rounded-lg p-4 bg-gradient-to-br from-blue-50 to-indigo-50">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <CreditCard className="h-6 w-6 text-blue-600" />
                      <div>
                        <div className="font-semibold text-sm text-slate-700">Résumé des Paiements</div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          {selectedSale.payment.paymentDetails?.length || 0} paiement(s) enregistré(s)
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-slate-600">Montant de la vente</div>
                      <div className="text-lg font-bold text-slate-800">
                        {formatCurrency(Number(selectedSale.finalAmount || 0))}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 mt-3 pt-3 border-t border-indigo-200">
                    <div className="text-center">
                      <div className="text-xs text-slate-600 mb-1">Total Payé</div>
                      <div className="text-base font-bold text-green-700">
                        {formatCurrency(Number(selectedSale.payment.amount || 0))}
                      </div>
                    </div>
                    <div className="text-center border-x border-indigo-200">
                      <div className="text-xs text-slate-600 mb-1">Reste à Payer</div>
                      <div className="text-base font-bold text-orange-600">
                        {formatCurrency(Number(selectedSale.payment.remainingAmount || 0))}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-slate-600 mb-1">Statut</div>
                      <Badge
                        variant="outline"
                        className={`text-xs ${
                          selectedSale.payment.status === 'PAID'
                            ? 'bg-green-100 text-green-700 border-green-300'
                            : selectedSale.payment.status === 'PARTIAL'
                            ? 'bg-yellow-100 text-yellow-700 border-yellow-300'
                            : 'bg-slate-100 text-slate-700 border-slate-300'
                        }`}
                      >
                        {selectedSale.payment.status || 'N/A'}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Individual Payments List */}
                {selectedSale.payment.paymentDetails && selectedSale.payment.paymentDetails.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      Liste des Paiements
                    </h4>
                    <div className="space-y-2">
                      {selectedSale.payment.paymentDetails.map((detail, index) => {
                        const isCNAM = detail.method?.toUpperCase() === 'CNAM';
                        const cnamInfo = detail.metadata?.cnamInfo;
                        const dossierNumber = detail.metadata?.dossierNumber || cnamInfo?.dossierNumber;
                        const bonType = cnamInfo?.bonType;
                        const dueDate = detail.metadata?.dueDate;

                        return (
                          <div key={detail.id || index} className={`border rounded-lg p-3 transition-colors ${isCNAM ? 'bg-blue-50 hover:bg-blue-100 border-blue-200' : 'bg-slate-50 hover:bg-slate-100'}`}>
                            <div className="flex justify-between items-start mb-2">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className={`font-medium ${isCNAM ? 'bg-blue-100 text-blue-700 border-blue-300' : ''}`}>
                                  {detail.method}
                                </Badge>
                                {detail.paymentCode && (
                                  <span className="text-xs font-mono text-slate-500">#{detail.paymentCode}</span>
                                )}
                              </div>
                              <div className="font-semibold text-green-700">
                                {formatCurrency(Number(detail.amount))}
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-3 text-xs text-slate-600">
                              {detail.paymentDate && (
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {new Date(detail.paymentDate).toLocaleDateString('fr-FR')}
                                </div>
                              )}
                              {isCNAM && dossierNumber && (
                                <div className="flex items-center gap-1">
                                  <FileText className="h-3 w-3" />
                                  <span className="font-medium text-blue-700">N° CNAM: {dossierNumber}</span>
                                </div>
                              )}
                              {isCNAM && bonType && (
                                <div className="flex items-center gap-1">
                                  <Badge variant="secondary" className="text-[10px] h-5">
                                    {bonType}
                                  </Badge>
                                </div>
                              )}
                              {!isCNAM && detail.referenceNumber && (
                                <div className="flex items-center gap-1">
                                  <FileText className="h-3 w-3" />
                                  Réf: {detail.referenceNumber}
                                </div>
                              )}
                              {dueDate && (
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  <span className="font-medium text-orange-600">Échéance: {new Date(dueDate).toLocaleDateString('fr-FR')}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500">
                <CreditCard className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                <p>Aucun paiement enregistré pour cette vente.</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Items Dialog - Shows device/product codes and details */}
      <Dialog open={showItemsDialog} onOpenChange={setShowItemsDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Articles - {selectedSale?.saleCode}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedSale?.items && selectedSale.items.length > 0 ? (
              <div className="space-y-3">
                {selectedSale.items.map((item, index) => (
                  <div key={item.id} className="border rounded-lg p-4 bg-slate-50">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="font-mono text-xs">
                          #{index + 1}
                        </Badge>
                        {item.medicalDeviceId ? (
                          <div className="flex items-center gap-2">
                            <Package className="h-4 w-4 text-blue-600" />
                            <div>
                              <Badge className="font-mono bg-blue-100 text-blue-700 border-blue-300">
                                {item.medicalDevice?.deviceCode || 'N/A'}
                              </Badge>
                              <div className="text-xs text-slate-600 mt-1">
                                {item.medicalDevice?.name || 'Appareil médical'}
                              </div>
                            </div>
                          </div>
                        ) : item.productId ? (
                          <div className="flex items-center gap-2">
                            <Package className="h-4 w-4 text-green-600" />
                            <div>
                              <Badge className="font-mono bg-green-100 text-green-700 border-green-300">
                                {item.product?.productCode || 'N/A'}
                              </Badge>
                              <div className="text-xs text-slate-600 mt-1">
                                {item.product?.name || 'Produit'}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="text-sm text-slate-500">Article non lié</div>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold text-slate-900">
                          {formatCurrency(Number(item.itemTotal))}
                        </div>
                        <div className="text-xs text-slate-500">
                          {item.quantity} × {formatCurrency(Number(item.unitPrice))}
                        </div>
                      </div>
                    </div>
                    {item.medicalDevice?.serialNumber && (
                      <div className="flex items-center gap-2 mt-2 text-xs text-slate-600">
                        <span className="font-medium">SN:</span>
                        <code className="bg-slate-200 px-2 py-0.5 rounded">{item.medicalDevice.serialNumber}</code>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-slate-500 py-8">
                Aucun article trouvé
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* CNAM Bons Dialog */}
      <Dialog open={showCnamBonsDialog} onOpenChange={setShowCnamBonsDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Bons CNAM - {selectedSale?.saleCode}</DialogTitle>
            <p className="text-sm text-slate-600">
              Bons de prise en charge CNAM liés à cette vente
            </p>
          </DialogHeader>
          <div className="space-y-4">
            {selectedSale?.cnamBons && selectedSale.cnamBons.length > 0 ? (
              <div className="space-y-3">
                {selectedSale.cnamBons.map((bon, index) => (
                  <div key={bon.id} className="border rounded-lg p-4 bg-gradient-to-r from-purple-50 to-blue-50">
                    {/* Header Section */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="font-mono text-xs bg-white">
                          #{index + 1}
                        </Badge>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <FileText className="h-4 w-4 text-purple-600" />
                            <Badge className="font-mono bg-purple-100 text-purple-700 border-purple-300">
                              {bon.dossierNumber || bon.bonNumber || 'N/A'}
                            </Badge>
                          </div>
                          <div className="text-xs text-slate-600 flex items-center gap-2">
                            <span>Type: <span className="font-medium">{bon.bonType}</span></span>
                            {bon.patient && (
                              <>
                                <span className="text-slate-400">•</span>
                                <span className="flex items-center gap-1">
                                  <User className="h-3 w-3" />
                                  <span className="font-medium">{bon.patient.fullName}</span>
                                  <code className="text-xs bg-slate-200 px-1 rounded">{bon.patient.patientCode}</code>
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge
                          variant="outline"
                          className={`${
                            bon.status === 'VALIDE'
                              ? 'bg-green-100 text-green-700 border-green-300'
                              : bon.status === 'EN_ATTENTE_APPROBATION'
                              ? 'bg-yellow-100 text-yellow-700 border-yellow-300'
                              : bon.status === 'REJETE'
                              ? 'bg-red-100 text-red-700 border-red-300'
                              : 'bg-slate-100 text-slate-700 border-slate-300'
                          }`}
                        >
                          {bon.status}
                        </Badge>
                      </div>
                    </div>

                    {/* Progress Steps Section */}
                    {bon.currentStep && (
                      <div className="mb-3 p-3 bg-white rounded-md border border-slate-200">
                        <div className="text-xs font-semibold text-slate-700 mb-2">Progression du dossier:</div>
                        <div className="w-full">
                          {(() => {
                            const currentStep = bon.currentStep || 1;
                            const totalSteps = 7;
                            const percentage = (currentStep / totalSteps) * 100;

                            const stepNames: { [key: number]: string } = {
                              1: 'En attente approbation CNAM',
                              2: 'Accord avec patient',
                              3: 'Technicien reçoit',
                              4: 'Config Auto PPC',
                              5: 'Livraison au Technicien',
                              6: 'Signature Médecin',
                              7: 'Livraison finale Admin',
                            };

                            const stepName = stepNames[currentStep] || `Étape ${currentStep}`;

                            return (
                              <>
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-xs text-slate-600 truncate" title={stepName}>
                                    Étape {currentStep}/{totalSteps} - {stepName}
                                  </span>
                                  <span className="text-xs font-semibold text-purple-700 ml-2">{Math.round(percentage)}%</span>
                                </div>
                                <div className="w-full bg-slate-200 rounded-full h-2">
                                  <div
                                    className="bg-gradient-to-r from-purple-500 to-purple-600 h-2 rounded-full transition-all duration-300"
                                    style={{ width: `${percentage}%` }}
                                  ></div>
                                </div>
                              </>
                            );
                          })()}
                        </div>
                      </div>
                    )}

                    {/* Dossier Info */}
                    {bon.dossierNumber && (
                      <div className="mb-3 p-2 bg-white rounded border border-slate-200">
                        <span className="text-xs text-slate-600">Numéro de dossier: </span>
                        <code className="text-xs bg-slate-100 px-2 py-0.5 rounded font-mono">{bon.dossierNumber}</code>
                      </div>
                    )}

                    {/* Dates */}
                    {(bon.submissionDate || bon.approvalDate) && (
                      <div className="mb-3 p-2 bg-white rounded border border-slate-200 flex gap-4 text-xs">
                        {bon.submissionDate && (
                          <div>
                            <span className="text-slate-600">Date de soumission: </span>
                            <span className="font-medium">{new Date(bon.submissionDate).toLocaleDateString('fr-FR')}</span>
                          </div>
                        )}
                        {bon.approvalDate && (
                          <div>
                            <span className="text-slate-600">Date d'approbation: </span>
                            <span className="font-medium">{new Date(bon.approvalDate).toLocaleDateString('fr-FR')}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Financial Details */}
                    <div className="grid grid-cols-3 gap-4 mt-3 p-3 bg-white rounded-md border border-slate-200">
                      <div>
                        <div className="text-xs text-slate-500 mb-1">Prix Appareil</div>
                        <div className="text-sm font-semibold text-slate-900">
                          {formatCurrency(Number(bon.devicePrice))}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-500 mb-1">Montant CNAM</div>
                        <div className="text-sm font-semibold text-blue-700">
                          {formatCurrency(Number(bon.bonAmount))}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-500 mb-1">Complément Patient</div>
                        <div className="text-sm font-semibold text-orange-700">
                          {formatCurrency(Number(bon.complementAmount))}
                        </div>
                      </div>
                    </div>

                    {/* Calculation breakdown */}
                    <div className="mt-2 text-xs text-slate-600 bg-white px-3 py-2 rounded border border-slate-200">
                      <span className="font-medium">Répartition:</span> Prix Total ({formatCurrency(Number(bon.devicePrice))}) =
                      CNAM ({formatCurrency(Number(bon.bonAmount))}) +
                      Patient ({formatCurrency(Number(bon.complementAmount))})
                    </div>
                  </div>
                ))}

                {/* Summary Section */}
                <div className="border-t-2 border-purple-200 pt-4 mt-4">
                  <div className="bg-purple-50 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-purple-900 mb-3">Récapitulatif</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-xs text-slate-600 mb-1">Nombre de bons</div>
                        <div className="text-lg font-bold text-purple-700">
                          {selectedSale.cnamBons.length}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-600 mb-1">Total pris en charge CNAM</div>
                        <div className="text-lg font-bold text-blue-700">
                          {formatCurrency(
                            selectedSale.cnamBons.reduce((sum, bon) => sum + Number(bon.bonAmount), 0)
                          )}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-600 mb-1">Total prix appareils</div>
                        <div className="text-lg font-bold text-slate-900">
                          {formatCurrency(
                            selectedSale.cnamBons.reduce((sum, bon) => sum + Number(bon.devicePrice), 0)
                          )}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-600 mb-1">Total complément patient</div>
                        <div className="text-lg font-bold text-orange-700">
                          {formatCurrency(
                            selectedSale.cnamBons.reduce((sum, bon) => sum + Number(bon.complementAmount), 0)
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center text-slate-500 py-12">
                <FileText className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                <p className="text-sm font-medium">Aucun bon CNAM trouvé</p>
                <p className="text-xs text-slate-400 mt-1">Cette vente n'a pas de bons CNAM associés</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Items Management Dialog */}
      <SaleItemsDialog
        isOpen={showItemsManagementDialog}
        onClose={() => {
          setShowItemsManagementDialog(false);
          setManagingSaleId(null);
        }}
        items={managingSaleId === 'new' ? (newSaleData.items || []) : (selectedSale?.items || [])}
        onSave={handleSaveItems}
      />

      {/* Payments Management Dialog */}
      <SalePaymentsDialog
        isOpen={showPaymentsManagementDialog}
        onClose={() => {
          setShowPaymentsManagementDialog(false);
          setManagingSaleId(null);
        }}
        saleItems={managingSaleId === 'new' ? (newSaleData.items || []) : (selectedSale?.items || [])}
        payments={managingSaleId === 'new' ? (newSaleData.payments || []) : (selectedSale?.payment || [])}
        onSave={handleSavePayments}
        clientType={managingSaleId === 'new' ? (newSaleData.patientId ? 'patient' : 'company') : (selectedSale?.patientId ? 'patient' : 'company')}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="h-5 w-5" />
              Confirmer la suppression
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <Trash2 className="h-5 w-5 text-red-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-900 mb-2">
                  Êtes-vous sûr de vouloir supprimer cette vente ?
                </p>
                <p className="text-sm text-slate-600 mb-3">
                  Cette action est irréversible et supprimera également :
                </p>
                <ul className="text-sm text-slate-600 space-y-1 ml-4">
                  <li className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-slate-400" />
                    Tous les articles de la vente
                  </li>
                  <li className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-slate-400" />
                    Tous les paiements associés
                  </li>
                  <li className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-slate-400" />
                    Tous les bons CNAM liés
                  </li>
                </ul>
                <p className="text-sm text-amber-600 mt-3 font-medium">
                  ⚠️ Les stocks seront restaurés automatiquement
                </p>
              </div>
            </div>
          </div>
          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={cancelDelete}
              className="flex-1"
            >
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              className="flex-1 bg-red-600 hover:bg-red-700"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Supprimer définitivement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
