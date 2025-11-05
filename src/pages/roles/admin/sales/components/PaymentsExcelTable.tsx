import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  Plus,
  Trash2,
  Save,
  X,
  ChevronLeft,
  ChevronRight,
  Search,
  Eye,
  Edit2,
  CreditCard,
  User,
  Building2,
  Calendar,
  FileText,
  Filter,
  DollarSign,
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { formatCurrency } from '@/utils/priceUtils';

interface Payment {
  id: string;
  paymentCode: string;
  amount: number;
  method: string;
  status: string;
  paymentDate: string;
  referenceNumber?: string;
  chequeNumber?: string;
  bankName?: string;
  cnamCardNumber?: string;
  cnamBonId?: string;
  dueDate?: string;
  notes?: string;
  saleId?: string;
  rentalId?: string;
  sale?: {
    id: string;
    saleCode: string;
    invoiceNumber: string;
    patient?: {
      firstName: string;
      lastName: string;
    };
    company?: {
      companyName: string;
    };
  };
  paymentDetails?: Array<{
    method: string;
    amount: number;
    classification: string;
    metadata?: any;
  }>;
}

export default function PaymentsExcelTable() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editedData, setEditedData] = useState<Partial<Payment>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [methodFilter, setMethodFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('SALE'); // Default to SALE only
  const [clientTypeFilter, setClientTypeFilter] = useState<string>('all');
  const [dateRangeFilter, setDateRangeFilter] = useState<string>('all');
  const [amountRangeFilter, setAmountRangeFilter] = useState<string>('all');

  // New payment states
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [clientDialogOpen, setClientDialogOpen] = useState(false);
  const [clientSearchTerm, setClientSearchTerm] = useState('');
  const [selectedClient, setSelectedClient] = useState<{type: 'patient' | 'company', id: string, name: string} | null>(null);
  const [clientSales, setClientSales] = useState<any[]>([]);
  const [newPayment, setNewPayment] = useState({
    saleId: '',
    amount: 0,
    method: 'CASH',
    status: 'PENDING',
    paymentDate: new Date().toISOString().split('T')[0],
    referenceNumber: '',
    chequeNumber: '',
    bankName: '',
    cnamCardNumber: '',
    cnamBonId: '',
    dueDate: '',
    notes: '',
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch payments from sales
  const { data: salesData, isLoading: salesLoading } = useQuery({
    queryKey: ['sales'],
    queryFn: async () => {
      const response = await fetch('/api/sales');
      if (!response.ok) throw new Error('Failed to fetch sales');
      const data = await response.json();
      return data.sales || [];
    },
  });

  // NOTE: We don't fetch rental payments here since this is the SALES page
  // Only fetch payments with source=SALE directly from database
  const { data: salePaymentsData, isLoading: salePaymentsLoading } = useQuery({
    queryKey: ['sale-payments'],
    queryFn: async () => {
      const response = await fetch('/api/payments/all?source=SALE');
      if (!response.ok) {
        // If endpoint doesn't exist yet, return empty array
        return [];
      }
      return response.json();
    },
  });

  // Fetch CNAM bons for sales (ACHAT category)
  const { data: cnamBonsData } = useQuery({
    queryKey: ['sale-cnam-bons'],
    queryFn: async () => {
      const response = await fetch('/api/cnam-bons?category=ACHAT');
      if (!response.ok) throw new Error('Failed to fetch CNAM bons');
      return response.json();
    },
  });

  // Fetch patients for client selector
  const { data: patients } = useQuery({
    queryKey: ['patients'],
    queryFn: async () => {
      const response = await fetch('/api/patients');
      if (!response.ok) throw new Error('Failed to fetch patients');
      return response.json();
    },
  });

  // Fetch companies for client selector
  const { data: companies } = useQuery({
    queryKey: ['societes'],
    queryFn: async () => {
      const response = await fetch('/api/societes');
      if (!response.ok) throw new Error('Failed to fetch companies');
      return response.json();
    },
  });

  // Combine payments from all sources
  useEffect(() => {
    const allPayments: Payment[] = [];
    const addedPaymentIds = new Set<string>(); // Track to avoid duplicates


    // PRIORITY 1: Add standalone sale payments first (they have complete data with paymentCode, source, etc.)
    if (salePaymentsData && Array.isArray(salePaymentsData)) {
      salePaymentsData.forEach((payment: any) => {
        if (payment.id && !addedPaymentIds.has(payment.id)) {
          // The API already includes sale info with patient/company, so use it directly
          // If payment.sale doesn't exist, try to find it from salesData as fallback
          if (!payment.sale && salesData && Array.isArray(salesData)) {
            const sale = salesData.find((s: any) => s.id === payment.saleId);
            if (sale) {
              payment.sale = {
                id: sale.id,
                saleCode: sale.saleCode,
                invoiceNumber: sale.invoiceNumber,
                patient: sale.patient,
                company: sale.company,
              };
            }
          }

          allPayments.push(payment);
          addedPaymentIds.add(payment.id);
        }
      });
    }

    // PRIORITY 2: Only add embedded payments from sales if they're NOT already added
    // (The embedded payment from sales API doesn't include paymentCode/source, so we prefer the standalone version)
    if (salesData && Array.isArray(salesData)) {
      salesData.forEach((sale: any) => {
        if (sale.payment && sale.payment.id && !addedPaymentIds.has(sale.payment.id)) {
          // Only add if it has a paymentCode (complete data)
          if (sale.payment.paymentCode) {
            const paymentWithSale = {
              ...sale.payment,
              sale: {
                id: sale.id,
                saleCode: sale.saleCode,
                invoiceNumber: sale.invoiceNumber,
                patient: sale.patient,
                company: sale.company,
              },
              saleId: sale.id,
            };
            allPayments.push(paymentWithSale);
            addedPaymentIds.add(sale.payment.id);
          } else {
          }
        }
      });
    }

    // NOTE: We don't add rental payments here since this is the SALES page

    setPayments(allPayments);
  }, [salesData, salePaymentsData]);

  const isLoading = salesLoading || salePaymentsLoading;

  // Filter sales when client is selected
  useEffect(() => {
    if (selectedClient && salesData) {
      // Handle both array format and { sales: [...] } object format
      const salesArray = Array.isArray(salesData) ? salesData : (salesData?.sales || []);

      const filtered = salesArray.filter((sale: any) => {
        if (selectedClient.type === 'patient') {
          return sale.patientId === selectedClient.id;
        } else {
          return sale.companyId === selectedClient.id;
        }
      });
      setClientSales(filtered);
    } else {
      setClientSales([]);
    }
  }, [selectedClient, salesData]);

  // Filter clients for search
  const filteredClients = useMemo(() => {
    const searchLower = clientSearchTerm.toLowerCase();
    const allClients: Array<{type: 'patient' | 'company', id: string, name: string, code: string}> = [];

    if (patients && Array.isArray(patients)) {
      patients.forEach((patient: any) => {
        const name = `${patient.firstName} ${patient.lastName}`;
        if (name.toLowerCase().includes(searchLower) || patient.patientCode?.toLowerCase().includes(searchLower)) {
          allClients.push({
            type: 'patient',
            id: patient.id,
            name,
            code: patient.patientCode || ''
          });
        }
      });
    }

    if (companies && Array.isArray(companies)) {
      companies.forEach((company: any) => {
        if (company.companyName?.toLowerCase().includes(searchLower) || company.companyCode?.toLowerCase().includes(searchLower)) {
          allClients.push({
            type: 'company',
            id: company.id,
            name: company.companyName,
            code: company.companyCode || ''
          });
        }
      });
    }

    return allClients;
  }, [patients, companies, clientSearchTerm]);

  // Filter and search payments
  const filteredPayments = useMemo(() => {
    if (!Array.isArray(payments)) return [];


    const filtered = payments.filter((payment) => {
      // Skip payments without basic data (incomplete/loading)
      if (!payment.id || !payment.paymentCode) {
        return false;
      }

      // Search filter
      const searchLower = searchTerm.toLowerCase();
      const clientName = payment.sale?.patient
        ? `${payment.sale.patient.firstName} ${payment.sale.patient.lastName}`
        : payment.sale?.company?.companyName || '';

      const matchesSearch =
        payment.paymentCode?.toLowerCase().includes(searchLower) ||
        clientName.toLowerCase().includes(searchLower) ||
        payment.referenceNumber?.toLowerCase().includes(searchLower) ||
        payment.chequeNumber?.toLowerCase().includes(searchLower) ||
        payment.cnamCardNumber?.toLowerCase().includes(searchLower);

      // Status filter
      const matchesStatus = statusFilter === 'all' || payment.status === statusFilter;

      // Method filter
      const matchesMethod = methodFilter === 'all' || payment.method === methodFilter;

      // Source filter - IMPORTANT: Only show SALE payments by default
      const paymentSource = (payment as any).source;
      const matchesSource = sourceFilter === 'all' || paymentSource === sourceFilter;

      // Client type filter
      const matchesClientType = (() => {
        if (clientTypeFilter === 'all') return true;
        if (clientTypeFilter === 'patient') return !!payment.sale?.patient;
        if (clientTypeFilter === 'company') return !!payment.sale?.company;
        return true;
      })();

      // Date range filter
      const matchesDateRange = (() => {
        if (dateRangeFilter === 'all') return true;
        const paymentDate = new Date(payment.paymentDate);
        const today = new Date();
        const thirtyDaysAgo = new Date(today);
        thirtyDaysAgo.setDate(today.getDate() - 30);
        const sixMonthsAgo = new Date(today);
        sixMonthsAgo.setMonth(today.getMonth() - 6);
        const oneYearAgo = new Date(today);
        oneYearAgo.setFullYear(today.getFullYear() - 1);

        if (dateRangeFilter === 'last-30-days') return paymentDate >= thirtyDaysAgo;
        if (dateRangeFilter === 'last-6-months') return paymentDate >= sixMonthsAgo;
        if (dateRangeFilter === 'last-year') return paymentDate >= oneYearAgo;
        if (dateRangeFilter === 'older-than-year') return paymentDate < oneYearAgo;
        return true;
      })();

      // Amount range filter
      const matchesAmountRange = (() => {
        if (amountRangeFilter === 'all') return true;
        const amount = Number(payment.amount);
        if (amountRangeFilter === 'less-100') return amount < 100;
        if (amountRangeFilter === '100-500') return amount >= 100 && amount < 500;
        if (amountRangeFilter === '500-1000') return amount >= 500 && amount < 1000;
        if (amountRangeFilter === '1000-5000') return amount >= 1000 && amount < 5000;
        if (amountRangeFilter === 'more-5000') return amount >= 5000;
        return true;
      })();


      return matchesSearch && matchesStatus && matchesMethod && matchesSource && matchesClientType && matchesDateRange && matchesAmountRange;
    });

    return filtered;
  }, [payments, searchTerm, statusFilter, methodFilter, sourceFilter, clientTypeFilter, dateRangeFilter, amountRangeFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredPayments.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedPayments = filteredPayments.slice(startIndex, endIndex);

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (updatedPayment: Partial<Payment>) => {
      const response = await fetch(`/api/payments/${updatedPayment.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedPayment),
      });
      if (!response.ok) throw new Error('Failed to update payment');
      const data = await response.json();
      return data;
    },
    onSuccess: (updatedPayment) => {

      // Update the local payments array immediately with the updated payment
      setPayments(prevPayments =>
        prevPayments.map(p =>
          p.id === updatedPayment.id
            ? { ...p, ...updatedPayment }
            : p
        )
      );

      // Then invalidate queries to get fresh data
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['sale-payments'] });

      toast({ title: 'Succès', description: 'Paiement mis à jour avec succès' });
      setEditingId(null);
      setEditedData({});
    },
    onError: () => {
      toast({
        title: 'Erreur',
        description: 'Impossible de mettre à jour le paiement',
        variant: 'destructive'
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/payments/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete payment');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['rentals-payments'] });
      queryClient.invalidateQueries({ queryKey: ['sale-payments'] });
      toast({ title: 'Succès', description: 'Paiement supprimé avec succès' });
    },
    onError: () => {
      toast({
        title: 'Erreur',
        description: 'Impossible de supprimer le paiement',
        variant: 'destructive'
      });
    },
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (paymentData: any) => {
      // Format payment data for the sales payment API
      const formattedPayment = {
        type: paymentData.method.toLowerCase(),
        amount: paymentData.amount,
        classification: 'principale',
        paymentDate: paymentData.paymentDate,
        notes: paymentData.notes || null,
        // Add method-specific fields
        ...(paymentData.method === 'CHEQUE' && {
          chequeNumber: paymentData.chequeNumber || paymentData.referenceNumber,
          bank: paymentData.bankName,
        }),
        ...(paymentData.method === 'VIREMENT' && {
          reference: paymentData.referenceNumber,
          bank: paymentData.bankName,
        }),
        ...(paymentData.method === 'TRAITE' && {
          traiteNumber: paymentData.referenceNumber,
          bank: paymentData.bankName,
          dueDate: paymentData.dueDate,
        }),
        ...(paymentData.method === 'MANDAT' && {
          mandatNumber: paymentData.referenceNumber,
        }),
        ...(paymentData.method === 'CNAM' && {
          dossierNumber: paymentData.referenceNumber,
          cnamCardNumber: paymentData.cnamCardNumber,
          cnamBonId: paymentData.cnamBonId,
        }),
        // For CASH or any other method, add reference if provided
        ...(paymentData.referenceNumber && !['CHEQUE', 'VIREMENT', 'TRAITE', 'MANDAT', 'CNAM'].includes(paymentData.method) && {
          reference: paymentData.referenceNumber,
        }),
      };

      const response = await fetch(`/api/sales/${paymentData.saleId}/payments`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payments: [formattedPayment] }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create payment');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['rentals-payments'] });
      queryClient.invalidateQueries({ queryKey: ['sale-payments'] });
      toast({ title: 'Succès', description: 'Paiement créé avec succès' });
      setIsAddingNew(false);
      setSelectedClient(null);
      setClientSales([]);
      setNewPayment({
        saleId: '',
        amount: 0,
        method: 'CASH',
        status: 'PENDING',
        paymentDate: new Date().toISOString().split('T')[0],
        referenceNumber: '',
        chequeNumber: '',
        bankName: '',
        cnamCardNumber: '',
        cnamBonId: '',
        dueDate: '',
        notes: '',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de créer le paiement',
        variant: 'destructive'
      });
    },
  });

  const handleClientSelect = (type: 'patient' | 'company', id: string, name: string) => {
    setSelectedClient({ type, id, name });
    setClientDialogOpen(false);
    setClientSearchTerm('');
  };

  const handleSaveNew = () => {
    if (!newPayment.saleId) {
      toast({
        title: 'Erreur',
        description: 'Veuillez sélectionner une vente',
        variant: 'destructive'
      });
      return;
    }

    if (!newPayment.amount || newPayment.amount <= 0) {
      toast({
        title: 'Erreur',
        description: 'Veuillez entrer un montant valide',
        variant: 'destructive'
      });
      return;
    }

    createMutation.mutate(newPayment);
  };

  const handleCancelNew = () => {
    setIsAddingNew(false);
    setSelectedClient(null);
    setClientSales([]);
    setNewPayment({
      saleId: '',
      amount: 0,
      method: 'CASH',
      status: 'PENDING',
      paymentDate: new Date().toISOString().split('T')[0],
      referenceNumber: '',
      chequeNumber: '',
      bankName: '',
      cnamCardNumber: '',
      cnamBonId: '',
      dueDate: '',
      notes: '',
    });
  };

  const handleEdit = (payment: Payment) => {
    setEditingId(payment.id);
    setEditedData(payment);
  };

  const handleSave = () => {
    if (editingId && editedData) {
      // Only send the fields that should be updated, not the entire object
      const updatePayload = {
        id: editingId,
        amount: editedData.amount,
        method: editedData.method,
        status: editedData.status,
        paymentDate: editedData.paymentDate,
        referenceNumber: editedData.referenceNumber,
        chequeNumber: editedData.chequeNumber,
        bankName: editedData.bankName,
        cnamCardNumber: editedData.cnamCardNumber,
        cnamBonId: editedData.cnamBonId,
        dueDate: editedData.dueDate,
        notes: editedData.notes,
      };

      updateMutation.mutate(updatePayload);
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditedData({});
  };

  const handleDelete = (id: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce paiement ?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleFieldChange = (field: string, value: any) => {
    setEditedData({ ...editedData, [field]: value });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string }> = {
      PAID: { label: 'Payé', className: 'bg-green-100 text-green-700 border-green-200' },
      PENDING: { label: 'En attente', className: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
      PARTIAL: { label: 'Partiel', className: 'bg-orange-100 text-orange-700 border-orange-200' },
      CANCELLED: { label: 'Annulé', className: 'bg-red-100 text-red-700 border-red-200' },
      GUARANTEE: { label: 'Garantie', className: 'bg-blue-100 text-blue-700 border-blue-200' },
    };
    const config = statusConfig[status] || statusConfig.PENDING;
    return <Badge variant="outline" className={`${config.className} text-xs`}>{config.label}</Badge>;
  };

  const getMethodBadge = (method: string) => {
    const methodConfig: Record<string, { label: string; className: string }> = {
      CASH: { label: 'Espèces', className: 'bg-emerald-100 text-emerald-700' },
      CHEQUE: { label: 'Chèque', className: 'bg-blue-100 text-blue-700' },
      VIREMENT: { label: 'Virement', className: 'bg-purple-100 text-purple-700' },
      CNAM: { label: 'CNAM', className: 'bg-red-100 text-red-700' },
      TRAITE: { label: 'Traite', className: 'bg-amber-100 text-amber-700' },
      MANDAT: { label: 'Mandat', className: 'bg-indigo-100 text-indigo-700' },
      MIXED: { label: 'Mixte', className: 'bg-gray-100 text-gray-700' },
    };
    const config = methodConfig[method] || { label: method, className: 'bg-gray-100 text-gray-700' };
    return <Badge variant="outline" className={`${config.className} text-xs`}>{config.label}</Badge>;
  };

  const getSourceBadge = (source: string) => {
    const sourceConfig: Record<string, { label: string; className: string }> = {
      SALE: { label: 'Vente', className: 'bg-green-100 text-green-700 border-green-200' },
      RENTAL: { label: 'Location', className: 'bg-blue-100 text-blue-700 border-blue-200' },
      DIAGNOSTIC: { label: 'Diagnostic', className: 'bg-purple-100 text-purple-700 border-purple-200' },
      AUTRE: { label: 'Autre', className: 'bg-gray-100 text-gray-700 border-gray-200' },
    };
    const config = sourceConfig[source] || sourceConfig.AUTRE;
    return <Badge variant="outline" className={`${config.className} text-xs font-semibold`}>{config.label}</Badge>;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-500">Chargement des paiements...</div>
      </div>
    );
  }

  // Calculate active filters count
  const activeFiltersCount = [
    sourceFilter !== 'SALE', // Only count if not default
    statusFilter !== 'all',
    methodFilter !== 'all',
    clientTypeFilter !== 'all',
    dateRangeFilter !== 'all',
    amountRangeFilter !== 'all',
    searchTerm !== '',
  ].filter(Boolean).length;

  // Reset all filters
  const handleResetFilters = () => {
    setSearchTerm('');
    setSourceFilter('SALE');
    setStatusFilter('all');
    setMethodFilter('all');
    setClientTypeFilter('all');
    setDateRangeFilter('all');
    setAmountRangeFilter('all');
  };

  return (
    <div className="space-y-4">
      {/* Add Payment Button */}
      <div className="flex justify-end mb-4">
        <Button
          className="bg-green-600 hover:bg-green-700 text-white gap-2"
          onClick={() => setIsAddingNew(true)}
        >
          <Plus className="h-4 w-4" />
          Ajouter Paiement
        </Button>
      </div>

      {/* Comprehensive Filter Panel */}
      <div className="bg-gradient-to-r from-blue-50 to-slate-50 border border-blue-200 rounded-lg p-6">
        {/* Filter Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg">
              <Filter className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Filtres de Recherche</h3>
              <p className="text-sm text-slate-600">
                {filteredPayments.length} paiement(s) sur {payments.length} au total
                {activeFiltersCount > 0 && (
                  <span className="ml-2 text-blue-600 font-medium">
                    ({activeFiltersCount} filtre{activeFiltersCount > 1 ? 's' : ''} actif{activeFiltersCount > 1 ? 's' : ''})
                  </span>
                )}
              </p>
            </div>
          </div>
          {activeFiltersCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetFilters}
              className="gap-2 text-red-600 border-red-300 hover:bg-red-50"
            >
              <X className="h-4 w-4" />
              Réinitialiser
            </Button>
          )}
        </div>

        {/* Search Bar */}
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Rechercher par code, client, référence..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-white"
            />
          </div>
        </div>

        {/* Filter Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
          {/* Source Filter */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-700 flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5" />
              Source
            </label>
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="h-9 text-sm bg-white">
                <SelectValue placeholder="Toutes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SALE">Ventes uniquement</SelectItem>
                <SelectItem value="all">Toutes les sources</SelectItem>
                <SelectItem value="RENTAL">Locations</SelectItem>
                <SelectItem value="DIAGNOSTIC">Diagnostics</SelectItem>
                <SelectItem value="AUTRE">Autres</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Status Filter */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-700 flex items-center gap-1.5">
              <CreditCard className="h-3.5 w-3.5" />
              Statut
            </label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 text-sm bg-white">
                <SelectValue placeholder="Tous" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="PAID">Payé</SelectItem>
                <SelectItem value="PENDING">En attente</SelectItem>
                <SelectItem value="PARTIAL">Partiel</SelectItem>
                <SelectItem value="CANCELLED">Annulé</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Method Filter */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-700 flex items-center gap-1.5">
              <DollarSign className="h-3.5 w-3.5" />
              Méthode
            </label>
            <Select value={methodFilter} onValueChange={setMethodFilter}>
              <SelectTrigger className="h-9 text-sm bg-white">
                <SelectValue placeholder="Toutes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les méthodes</SelectItem>
                <SelectItem value="CASH">Espèces</SelectItem>
                <SelectItem value="CHEQUE">Chèque</SelectItem>
                <SelectItem value="VIREMENT">Virement</SelectItem>
                <SelectItem value="CNAM">CNAM</SelectItem>
                <SelectItem value="TRAITE">Traite</SelectItem>
                <SelectItem value="MANDAT">Mandat</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Client Type Filter */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-700 flex items-center gap-1.5">
              <User className="h-3.5 w-3.5" />
              Type Client
            </label>
            <Select value={clientTypeFilter} onValueChange={setClientTypeFilter}>
              <SelectTrigger className="h-9 text-sm bg-white">
                <SelectValue placeholder="Tous" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les types</SelectItem>
                <SelectItem value="patient">Patients</SelectItem>
                <SelectItem value="company">Sociétés</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Date Range Filter */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-700 flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              Période
            </label>
            <Select value={dateRangeFilter} onValueChange={setDateRangeFilter}>
              <SelectTrigger className="h-9 text-sm bg-white">
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
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-700 flex items-center gap-1.5">
              <DollarSign className="h-3.5 w-3.5" />
              Montant
            </label>
            <Select value={amountRangeFilter} onValueChange={setAmountRangeFilter}>
              <SelectTrigger className="h-9 text-sm bg-white">
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

      {/* Excel-like Table */}
      <div className="border rounded-lg overflow-hidden bg-white">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead className="bg-slate-50 sticky top-0 z-10">
              <tr className="border-b border-slate-200">
                <th className="px-3 py-3 text-left text-xs font-semibold text-slate-700 border-r border-slate-200 min-w-[120px]">Code Paiement</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-slate-700 border-r border-slate-200 min-w-[120px]">Date</th>
                <th className="px-3 py-3 text-center text-xs font-semibold text-slate-700 border-r border-slate-200 min-w-[100px]">Source</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-slate-700 border-r border-slate-200 min-w-[200px]">Client</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-slate-700 border-r border-slate-200 min-w-[150px]">Vente</th>
                <th className="px-3 py-3 text-center text-xs font-semibold text-slate-700 border-r border-slate-200 min-w-[120px]">Méthode</th>
                <th className="px-3 py-3 text-right text-xs font-semibold text-slate-700 border-r border-slate-200 min-w-[120px]">Montant</th>
                <th className="px-3 py-3 text-center text-xs font-semibold text-slate-700 border-r border-slate-200 min-w-[100px]">Statut</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-slate-700 border-r border-slate-200 min-w-[120px]">N° CNAM</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-slate-700 border-r border-slate-200 min-w-[120px]">Échéance</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-slate-700 border-r border-slate-200 min-w-[200px]">Notes</th>
                <th className="px-3 py-3 text-center text-xs font-semibold text-slate-700 sticky right-0 bg-slate-50 shadow-[-2px_0_4px_rgba(0,0,0,0.05)] min-w-[120px]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {/* New Payment Row */}
              {isAddingNew && (
                <tr className="bg-green-50/50 border-b-2 border-green-200">
                  {/* Payment Code - Auto-generated */}
                  <td className="px-3 py-2.5 text-xs border-r border-slate-100">
                    <Badge variant="outline" className="text-xs font-mono bg-green-100 text-green-700 whitespace-nowrap">
                      AUTO
                    </Badge>
                  </td>

                  {/* Date */}
                  <td className="px-3 py-2.5 border-r border-slate-100">
                    <Input
                      type="date"
                      value={newPayment.paymentDate}
                      onChange={(e) => setNewPayment({ ...newPayment, paymentDate: e.target.value })}
                      className="h-8 text-xs"
                    />
                  </td>

                  {/* Source - Always SALE */}
                  <td className="px-3 py-2.5 text-center border-r border-slate-100">
                    {getSourceBadge('SALE')}
                  </td>

                  {/* Client */}
                  <td className="px-3 py-2.5 border-r border-slate-100">
                    {selectedClient ? (
                      <div className="flex items-center gap-2">
                        {selectedClient.type === 'patient' ? (
                          <User className="h-4 w-4 text-blue-600" />
                        ) : (
                          <Building2 className="h-4 w-4 text-purple-600" />
                        )}
                        <span className="text-sm font-medium">{selectedClient.name}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setClientDialogOpen(true)}
                          className="h-6 px-2 text-xs"
                        >
                          Changer
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setClientDialogOpen(true)}
                        className="h-8 text-xs w-full"
                      >
                        Sélectionner Client
                      </Button>
                    )}
                  </td>

                  {/* Sale */}
                  <td className="px-3 py-2.5 border-r border-slate-100">
                    <Select
                      value={newPayment.saleId}
                      onValueChange={(value) => setNewPayment({ ...newPayment, saleId: value })}
                      disabled={!selectedClient}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Sélectionner vente" />
                      </SelectTrigger>
                      <SelectContent>
                        {clientSales.map((sale: any) => (
                          <SelectItem key={sale.id} value={sale.id}>
                            {sale.saleCode} - {formatCurrency(Number(sale.finalAmount))}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>

                  {/* Method */}
                  <td className="px-3 py-2.5 border-r border-slate-100">
                    <Select
                      value={newPayment.method}
                      onValueChange={(value) => setNewPayment({ ...newPayment, method: value })}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CASH">Espèces</SelectItem>
                        <SelectItem value="CHEQUE">Chèque</SelectItem>
                        <SelectItem value="VIREMENT">Virement</SelectItem>
                        <SelectItem value="CNAM">CNAM</SelectItem>
                        <SelectItem value="TRAITE">Traite</SelectItem>
                        <SelectItem value="MANDAT">Mandat</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>

                  {/* Amount - or CNAM Bon Selector if method is CNAM */}
                  <td className="px-3 py-2.5 border-r border-slate-100">
                    {newPayment.method === 'CNAM' ? (
                      <Select
                        value={newPayment.cnamBonId}
                        onValueChange={(value) => {
                          const selectedBon = cnamBonsData?.find((bon: any) => bon.id === value);
                          setNewPayment({
                            ...newPayment,
                            cnamBonId: value,
                            amount: selectedBon ? parseFloat(selectedBon.bonAmount || selectedBon.bondAmount || 0) : 0
                          });
                        }}
                        disabled={!newPayment.saleId}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Sélectionner bon CNAM" />
                        </SelectTrigger>
                        <SelectContent>
                          {cnamBonsData?.filter((bon: any) => bon.saleId === newPayment.saleId).map((bon: any) => (
                            <SelectItem key={bon.id} value={bon.id}>
                              {bon.bonType} - {formatCurrency(bon.bonAmount || bon.bondAmount || 0)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        type="number"
                        step="0.01"
                        value={newPayment.amount || ''}
                        onChange={(e) => setNewPayment({ ...newPayment, amount: parseFloat(e.target.value) || 0 })}
                        className="h-8 text-xs text-right"
                        placeholder="0.00"
                      />
                    )}
                  </td>

                  {/* Status */}
                  <td className="px-3 py-2.5 border-r border-slate-100">
                    <Select
                      value={newPayment.status}
                      onValueChange={(value) => setNewPayment({ ...newPayment, status: value })}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PAID">Payé</SelectItem>
                        <SelectItem value="PENDING">En attente</SelectItem>
                        <SelectItem value="PARTIAL">Partiel</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>

                  {/* Reference */}
                  {/* CNAM Bon - show the selected bon number */}
                  <td className="px-3 py-2.5 border-r border-slate-100">
                    {newPayment.method === 'CNAM' && newPayment.cnamBonId ? (
                      <Badge variant="outline" className="text-xs font-mono bg-blue-50 text-blue-700 border-blue-200 whitespace-nowrap">
                        {(() => {
                          const bon = cnamBonsData?.find((b: any) => b.id === newPayment.cnamBonId);
                          return bon?.bonNumber || bon?.dossierNumber || 'N/A';
                        })()}
                      </Badge>
                    ) : (
                      <div className="text-xs text-slate-400">-</div>
                    )}
                  </td>

                  {/* Due Date */}
                  <td className="px-3 py-2.5 border-r border-slate-100">
                    <Input
                      type="date"
                      value={newPayment.dueDate || ''}
                      onChange={(e) => setNewPayment({ ...newPayment, dueDate: e.target.value })}
                      className="h-8 text-xs"
                      disabled={newPayment.method !== 'TRAITE'}
                    />
                  </td>

                  {/* Notes */}
                  <td className="px-3 py-2.5 border-r border-slate-100">
                    <Input
                      value={newPayment.notes}
                      onChange={(e) => setNewPayment({ ...newPayment, notes: e.target.value })}
                      className="h-8 text-xs"
                      placeholder="Notes..."
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

              {paginatedPayments.map((payment, index) => {
                const isEditing = editingId === payment.id;
                const currentData = isEditing ? editedData : payment;
                const clientName = payment.sale?.patient
                  ? `${payment.sale.patient.firstName} ${payment.sale.patient.lastName}`
                  : payment.sale?.company?.companyName || 'N/A';

                return (
                  <tr
                    key={payment.id}
                    className={`border-b border-slate-100 hover:bg-blue-50/50 transition-colors ${
                      index % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'
                    }`}
                  >
                    {/* Payment Code */}
                    <td className="px-3 py-2.5 text-xs border-r border-slate-100">
                      <Badge variant="outline" className="text-xs font-mono whitespace-nowrap">
                        {payment.paymentCode || 'N/A'}
                      </Badge>
                    </td>

                    {/* Date */}
                    <td className="px-3 py-2.5 text-xs text-slate-600 border-r border-slate-100">
                      {isEditing ? (
                        <Input
                          type="date"
                          value={currentData.paymentDate ? new Date(currentData.paymentDate).toISOString().split('T')[0] : ''}
                          onChange={(e) => handleFieldChange('paymentDate', e.target.value)}
                          className="h-8 text-xs"
                        />
                      ) : (
                        <div className="flex items-center gap-2">
                          <Calendar className="h-3 w-3 text-slate-400" />
                          {new Date(payment.paymentDate).toLocaleDateString('fr-FR')}
                        </div>
                      )}
                    </td>

                    {/* Source */}
                    <td className="px-3 py-2.5 text-center border-r border-slate-100">
                      {getSourceBadge((payment as any).source || 'AUTRE')}
                    </td>

                    {/* Client */}
                    <td className="px-3 py-2.5 text-sm font-medium text-slate-900 border-r border-slate-100">
                      {payment.sale?.patient ? (
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-blue-600" />
                          <span>{clientName}</span>
                        </div>
                      ) : payment.sale?.company ? (
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-purple-600" />
                          <span>{clientName}</span>
                        </div>
                      ) : (
                        '-'
                      )}
                    </td>

                    {/* Sale */}
                    <td className="px-3 py-2.5 text-xs border-r border-slate-100">
                      {payment.sale ? (
                        <div className="flex items-center gap-2">
                          <FileText className="h-3 w-3 text-emerald-600" />
                          <Badge variant="outline" className="text-xs whitespace-nowrap">
                            {payment.sale.saleCode}
                          </Badge>
                        </div>
                      ) : (
                        '-'
                      )}
                    </td>

                    {/* Method */}
                    <td className="px-3 py-2.5 text-center border-r border-slate-100">
                      {isEditing ? (
                        <Select
                          value={currentData.method || payment.method}
                          onValueChange={(value) => handleFieldChange('method', value)}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="CASH">Espèces</SelectItem>
                            <SelectItem value="CHEQUE">Chèque</SelectItem>
                            <SelectItem value="VIREMENT">Virement</SelectItem>
                            <SelectItem value="CNAM">CNAM</SelectItem>
                            <SelectItem value="TRAITE">Traite</SelectItem>
                            <SelectItem value="MANDAT">Mandat</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <>
                          {getMethodBadge(payment.method)}
                          {payment.paymentDetails && payment.paymentDetails.length > 1 && (
                            <div className="text-xs text-slate-500 mt-1">
                              +{payment.paymentDetails.length - 1} autre(s)
                            </div>
                          )}
                        </>
                      )}
                    </td>

                    {/* Amount */}
                    <td className="px-3 py-2.5 text-right border-r border-slate-100">
                      {isEditing ? (
                        <Input
                          type="number"
                          step="0.01"
                          value={currentData.amount || payment.amount}
                          onChange={(e) => handleFieldChange('amount', parseFloat(e.target.value))}
                          className="h-8 text-xs text-right"
                        />
                      ) : (
                        <span className="text-sm font-bold text-green-700">
                          {formatCurrency(Number(payment.amount))}
                        </span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-3 py-2.5 text-center border-r border-slate-100">
                      {isEditing ? (
                        <Select
                          value={currentData.status || payment.status}
                          onValueChange={(value) => handleFieldChange('status', value)}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="PAID">Payé</SelectItem>
                            <SelectItem value="PENDING">En attente</SelectItem>
                            <SelectItem value="PARTIAL">Partiel</SelectItem>
                            <SelectItem value="CANCELLED">Annulé</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        getStatusBadge(payment.status)
                      )}
                    </td>

                    {/* CNAM Bon */}
                    <td className="px-3 py-2.5 text-xs text-slate-600 border-r border-slate-100">
                      {isEditing && payment.method === 'CNAM' ? (
                        <Select
                          value={currentData.cnamBonId || payment.cnamBonId || ''}
                          onValueChange={(value) => {
                            const selectedBon = cnamBonsData?.find((bon: any) => bon.id === value);
                            handleFieldChange('cnamBonId', value);
                            if (selectedBon) {
                              handleFieldChange('amount', parseFloat(selectedBon.bonAmount || selectedBon.bondAmount || 0));
                            }
                          }}
                          disabled={!payment.saleId}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Sélectionner bon" />
                          </SelectTrigger>
                          <SelectContent>
                            {cnamBonsData?.filter((bon: any) => bon.saleId === payment.saleId).map((bon: any) => (
                              <SelectItem key={bon.id} value={bon.id}>
                                {bon.bonNumber || bon.dossierNumber} - {bon.bonType}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : payment.method === 'CNAM' && payment.cnamBonId ? (
                        <Badge variant="outline" className="text-xs font-mono bg-blue-50 text-blue-700 border-blue-200 whitespace-nowrap">
                          {(() => {
                            const bon = cnamBonsData?.find((b: any) => b.id === payment.cnamBonId);
                            return bon?.bonNumber || bon?.dossierNumber || 'N/A';
                          })()}
                        </Badge>
                      ) : (
                        <div className="text-slate-400">-</div>
                      )}
                    </td>

                    {/* Due Date */}
                    <td className="px-3 py-2.5 text-xs text-slate-600 border-r border-slate-100">
                      {isEditing ? (
                        <Input
                          type="date"
                          value={currentData.dueDate ? new Date(currentData.dueDate).toISOString().split('T')[0] : (payment as any).dueDate ? new Date((payment as any).dueDate).toISOString().split('T')[0] : ''}
                          onChange={(e) => handleFieldChange('dueDate', e.target.value)}
                          className="h-8 text-xs"
                          disabled={payment.method !== 'TRAITE'}
                        />
                      ) : (
                        <div className="text-xs">
                          {(payment as any).dueDate ? new Date((payment as any).dueDate).toLocaleDateString('fr-FR') : '-'}
                        </div>
                      )}
                    </td>

                    {/* Notes */}
                    <td className="px-3 py-2.5 text-xs text-slate-600 border-r border-slate-100">
                      {isEditing ? (
                        <Input
                          value={currentData.notes || payment.notes || ''}
                          onChange={(e) => handleFieldChange('notes', e.target.value)}
                          className="h-8 text-xs"
                          placeholder="Notes..."
                        />
                      ) : (
                        <div className="truncate max-w-[200px]" title={payment.notes || ''}>
                          {payment.notes || '-'}
                        </div>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-3 py-2.5 sticky right-0 bg-inherit shadow-[-2px_0_4px_rgba(0,0,0,0.05)]">
                      <div className="flex items-center justify-center gap-1">
                        {isEditing ? (
                          <>
                            <Button
                              size="sm"
                              onClick={handleSave}
                              disabled={updateMutation.isPending}
                              className="h-8 w-8 p-0 bg-green-600 hover:bg-green-700 text-white"
                              title="Enregistrer"
                            >
                              <Save className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={handleCancel}
                              disabled={updateMutation.isPending}
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
                              onClick={() => handleEdit(payment)}
                              className="h-8 w-8 p-0 hover:bg-blue-100 hover:text-blue-700"
                              title="Modifier"
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(payment.id)}
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
            <span className="font-semibold text-slate-900">{filteredPayments.length}</span> paiement(s) au total
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

      {/* Client Selection Dialog */}
      <Dialog open={clientDialogOpen} onOpenChange={setClientDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[600px]">
          <DialogHeader>
            <DialogTitle>Sélectionner un Client</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Rechercher par nom ou code..."
                value={clientSearchTerm}
                onChange={(e) => setClientSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="border rounded-lg overflow-hidden max-h-[400px] overflow-y-auto">
              <table className="w-full">
                <thead className="bg-slate-50 sticky top-0">
                  <tr className="border-b">
                    <th className="px-4 py-2 text-left text-xs font-semibold text-slate-700">Type</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-slate-700">Code</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-slate-700">Nom</th>
                    <th className="px-4 py-2 text-center text-xs font-semibold text-slate-700">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredClients.map((client) => (
                    <tr
                      key={`${client.type}-${client.id}`}
                      className="border-b hover:bg-blue-50 transition-colors"
                    >
                      <td className="px-4 py-2">
                        {client.type === 'patient' ? (
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                            <User className="h-3 w-3 mr-1" />
                            Patient
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                            <Building2 className="h-3 w-3 mr-1" />
                            Société
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-2 text-xs font-mono text-slate-600">
                        {client.code}
                      </td>
                      <td className="px-4 py-2 text-sm font-medium text-slate-900">
                        {client.name}
                      </td>
                      <td className="px-4 py-2 text-center">
                        <Button
                          size="sm"
                          onClick={() => handleClientSelect(client.type, client.id, client.name)}
                          className="h-7 text-xs"
                        >
                          Sélectionner
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {filteredClients.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                        Aucun client trouvé
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
