import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  ChevronLeft,
  ChevronRight,
  Search,
  User,
  Building2,
  Calendar,
  Bell,
  BellOff,
  CheckCircle,
  AlertCircle,
  FileText,
  Clock,
  RefreshCw,
  Filter,
  X,
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatCurrency } from '@/utils/priceUtils';
import { useRouter } from 'next/router';

// Helper function for rappel badges - moved outside component
const getRappelBadge = (status: 'passed' | 'upcoming' | 'distant', daysUntil: number, type: '2years' | '7years') => {
  const typeLabel = type === '2years' ? 'Accessoires' : 'Appareil';

  if (status === 'passed') {
    return (
      <Badge variant="outline" className="bg-red-100 text-red-700 border-red-200 text-xs">
        <AlertCircle className="h-3 w-3 mr-1" />
        Dépassé ({Math.abs(daysUntil)}j)
      </Badge>
    );
  }

  if (status === 'upcoming') {
    return (
      <Badge variant="outline" className="bg-orange-100 text-orange-700 border-orange-200 text-xs">
        <Bell className="h-3 w-3 mr-1" />
        Dans {daysUntil}j
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="bg-slate-100 text-slate-600 border-slate-200 text-xs">
      <Clock className="h-3 w-3 mr-1" />
      {Math.floor(daysUntil / 365)}a {Math.floor((daysUntil % 365) / 30)}m
    </Badge>
  );
};

// Helper function for payment method badges - moved outside component
const getMethodBadge = (method?: string) => {
  if (!method) return <span className="text-xs text-slate-400">-</span>;

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

interface CNAMRappelRow {
  // Sale data
  saleId: string;
  saleCode: string;
  invoiceNumber?: string;
  saleDate: string;
  notes?: string;

  // Client data
  clientType: 'patient' | 'company';
  clientId: string;
  clientName: string;
  clientCode: string;
  clientPhone?: string;

  // Payment data - MULTIPLE PAYMENTS SUPPORT
  payments?: Array<{
    paymentCode: string;
    amount: number;
    method: string;
  }>;
  totalPaid?: number;
  saleAmount?: number; // Total sale amount (finalAmount)
  remainingAmount?: number; // Amount still to be paid

  // CNAM data
  cnamBonNumber?: string;
  cnamBonType?: string;
  cnamBonAmount?: number;

  // Calculated rappel dates (not in DB)
  rappel2Years?: string; // Date when accessories can be replaced (2 years from sale)
  rappel7Years?: string; // Date when device can be replaced (7 years from sale)
  rappel2YearsStatus?: 'passed' | 'upcoming' | 'distant';
  rappel7YearsStatus?: 'passed' | 'upcoming' | 'distant';
  daysUntil2Years?: number;
  daysUntil7Years?: number;
}

export default function CNAMRappelsTable() {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [searchTerm, setSearchTerm] = useState('');
  const [rappelFilter, setRappelFilter] = useState<string>('all');
  const [clientTypeFilter, setClientTypeFilter] = useState<string>('all');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>('all');
  const [dateRangeFilter, setDateRangeFilter] = useState<string>('all');
  const [hasCNAMBonFilter, setHasCNAMBonFilter] = useState<string>('all');
  const router = useRouter();

  // Fetch sales with related data - UNIQUE KEY for CNAMRappelsTable
  // Disable pagination to get all sales for rappel calculations
  const { data: salesData, isLoading: salesLoading } = useQuery({
    queryKey: ['cnam-rappels-sales'],
    queryFn: async () => {
      const response = await fetch('/api/sales?paginate=false&details=true');
      if (!response.ok) throw new Error('Failed to fetch sales');
      const data = await response.json();
      return data.sales || [];
    },
  });

  // Fetch CNAM bons for sales (category: ACHAT) - UNIQUE KEY
  const { data: cnamBonsData, isLoading: bonsLoading } = useQuery({
    queryKey: ['cnam-rappels-bons'],
    queryFn: async () => {
      const response = await fetch('/api/cnam-bons?category=ACHAT');
      if (!response.ok) return [];
      return response.json();
    },
  });

  // Fetch ALL sale payments (source: SALE) - UNIQUE KEY
  const { data: salePaymentsData, isLoading: paymentsLoading } = useQuery({
    queryKey: ['cnam-rappels-payments'],
    queryFn: async () => {
      const response = await fetch('/api/payments/all?source=SALE');
      if (!response.ok) return [];
      return response.json();
    },
  });

  const isLoading = salesLoading || bonsLoading || paymentsLoading;

  // Calculate rappel dates and status
  const calculateRappelInfo = (saleDate: string) => {
    const sale = new Date(saleDate);
    const today = new Date();

    // Calculate rappel dates
    const rappel2Years = new Date(sale);
    rappel2Years.setFullYear(sale.getFullYear() + 2);

    const rappel7Years = new Date(sale);
    rappel7Years.setFullYear(sale.getFullYear() + 7);

    // Calculate days until rappel
    const daysUntil2Years = Math.floor((rappel2Years.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    const daysUntil7Years = Math.floor((rappel7Years.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    // Determine status (passed, upcoming within 90 days, distant)
    const get2YearsStatus = (): 'passed' | 'upcoming' | 'distant' => {
      if (daysUntil2Years < 0) return 'passed';
      if (daysUntil2Years <= 90) return 'upcoming';
      return 'distant';
    };

    const get7YearsStatus = (): 'passed' | 'upcoming' | 'distant' => {
      if (daysUntil7Years < 0) return 'passed';
      if (daysUntil7Years <= 90) return 'upcoming';
      return 'distant';
    };

    return {
      rappel2Years: rappel2Years.toISOString().split('T')[0],
      rappel7Years: rappel7Years.toISOString().split('T')[0],
      rappel2YearsStatus: get2YearsStatus(),
      rappel7YearsStatus: get7YearsStatus(),
      daysUntil2Years,
      daysUntil7Years,
    };
  };

  // Transform sales data into rappel rows
  const rappelRows: CNAMRappelRow[] = useMemo(() => {
    if (!salesData || !Array.isArray(salesData)) return [];

    return salesData.map((sale: any) => {
      const rappelInfo = calculateRappelInfo(sale.saleDate);

      // Get primary CNAM bon for this sale
      const cnamBon = cnamBonsData?.find((bon: any) => bon.saleId === sale.id);

      // Get ALL payments for this sale
      const salePayments: Array<{ paymentCode: string; amount: number; method: string }> = [];

      // PRIORITY 1: Use sale.payments array if it exists (from API with details=true)
      if (sale.payments && Array.isArray(sale.payments) && sale.payments.length > 0) {
        sale.payments.forEach((payment: any) => {
          if (payment.paymentCode) {
            salePayments.push({
              paymentCode: payment.paymentCode,
              amount: Number(payment.amount) || 0,
              method: payment.method || 'N/A',
            });
          }
        });
      }
      // PRIORITY 2: Use the aggregated payment.paymentDetails from sale.payment if it exists
      else if (sale.payment && sale.payment.paymentDetails && Array.isArray(sale.payment.paymentDetails)) {
        sale.payment.paymentDetails.forEach((detail: any) => {
          salePayments.push({
            paymentCode: detail.paymentCode || sale.payment.paymentCode || 'N/A',
            amount: Number(detail.amount) || 0,
            method: detail.method || sale.payment.method || 'N/A',
          });
        });
      }
      // PRIORITY 3: Use standalone payments data if available
      else if (salePaymentsData && Array.isArray(salePaymentsData)) {
        const standalonePayments = salePaymentsData.filter((payment: any) =>
          payment.saleId === sale.id
        );

        standalonePayments.forEach((payment: any) => {
          if (payment.paymentCode) {
            salePayments.push({
              paymentCode: payment.paymentCode,
              amount: Number(payment.amount) || 0,
              method: payment.method || 'N/A',
            });
          }
        });
      }

      // Calculate total paid
      const totalPaid = salePayments.reduce((sum, p) => sum + Number(p.amount), 0);
      const saleAmount = Number(sale.finalAmount) || 0;
      const remainingAmount = saleAmount - totalPaid;

      return {
        saleId: sale.id,
        saleCode: sale.saleCode,
        invoiceNumber: sale.invoiceNumber,
        saleDate: sale.saleDate,
        notes: sale.notes,

        clientType: sale.patientId ? 'patient' : 'company',
        clientId: sale.patientId || sale.companyId,
        clientName: sale.patient
          ? `${sale.patient.firstName} ${sale.patient.lastName}`
          : sale.company?.companyName || 'N/A',
        clientCode: sale.patient?.patientCode || sale.company?.companyCode || 'N/A',
        clientPhone: sale.patient?.telephone || sale.company?.telephone,

        payments: salePayments,
        totalPaid,
        saleAmount,
        remainingAmount,

        cnamBonNumber: cnamBon?.bonNumber || cnamBon?.dossierNumber,
        cnamBonType: cnamBon?.bonType,
        cnamBonAmount: cnamBon?.bonAmount || cnamBon?.bondAmount,

        ...rappelInfo,
      };
    });
  }, [salesData, cnamBonsData, salePaymentsData]);

  // Filter and search
  const filteredRows = useMemo(() => {
    if (!Array.isArray(rappelRows)) return [];

    return rappelRows.filter((row) => {
      // Search filter
      const searchLower = searchTerm.toLowerCase();

      // Check if any payment code matches
      const paymentCodesMatch = row.payments?.some(
        (payment) => payment.paymentCode?.toLowerCase().includes(searchLower)
      ) || false;

      const matchesSearch =
        row.saleCode?.toLowerCase().includes(searchLower) ||
        row.clientName?.toLowerCase().includes(searchLower) ||
        row.clientCode?.toLowerCase().includes(searchLower) ||
        paymentCodesMatch ||
        row.cnamBonNumber?.toLowerCase().includes(searchLower) ||
        row.invoiceNumber?.toLowerCase().includes(searchLower);

      // Client type filter
      const matchesClientType =
        clientTypeFilter === 'all' ||
        row.clientType === clientTypeFilter;

      // Rappel filter
      const matchesRappel = (() => {
        if (rappelFilter === 'all') return true;
        if (rappelFilter === '2years-upcoming') return row.rappel2YearsStatus === 'upcoming';
        if (rappelFilter === '2years-passed') return row.rappel2YearsStatus === 'passed';
        if (rappelFilter === '7years-upcoming') return row.rappel7YearsStatus === 'upcoming';
        if (rappelFilter === '7years-passed') return row.rappel7YearsStatus === 'passed';
        if (rappelFilter === 'any-upcoming')
          return row.rappel2YearsStatus === 'upcoming' || row.rappel7YearsStatus === 'upcoming';
        return true;
      })();

      // Payment method filter
      const matchesPaymentMethod = (() => {
        if (paymentMethodFilter === 'all') return true;
        return row.payments?.some(payment => payment.method === paymentMethodFilter) || false;
      })();

      // Date range filter
      const matchesDateRange = (() => {
        if (dateRangeFilter === 'all') return true;
        const saleDate = new Date(row.saleDate);
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

      // CNAM Bon filter
      const matchesCNAMBon = (() => {
        if (hasCNAMBonFilter === 'all') return true;
        if (hasCNAMBonFilter === 'with-bon') return !!row.cnamBonNumber;
        if (hasCNAMBonFilter === 'without-bon') return !row.cnamBonNumber;
        return true;
      })();

      return matchesSearch && matchesClientType && matchesRappel && matchesPaymentMethod && matchesDateRange && matchesCNAMBon;
    });
  }, [rappelRows, searchTerm, clientTypeFilter, rappelFilter, paymentMethodFilter, dateRangeFilter, hasCNAMBonFilter]);

  // Calculate statistics - MUST be before early return to avoid hook ordering issues
  const stats = useMemo(() => {
    const upcoming2Years = rappelRows.filter(r => r.rappel2YearsStatus === 'upcoming').length;
    const upcoming7Years = rappelRows.filter(r => r.rappel7YearsStatus === 'upcoming').length;
    const passed2Years = rappelRows.filter(r => r.rappel2YearsStatus === 'passed').length;
    const passed7Years = rappelRows.filter(r => r.rappel7YearsStatus === 'passed').length;

    return { upcoming2Years, upcoming7Years, passed2Years, passed7Years };
  }, [rappelRows]);

  // Pagination
  const totalPages = Math.ceil(filteredRows.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedRows = filteredRows.slice(startIndex, endIndex);

  const handleViewSale = (saleId: string) => {
    router.push(`/roles/admin/sales/${saleId}`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-500">Chargement des rappels CNAM...</div>
      </div>
    );
  }

  // Count active filters
  const activeFiltersCount = [
    searchTerm !== '',
    rappelFilter !== 'all',
    clientTypeFilter !== 'all',
    paymentMethodFilter !== 'all',
    dateRangeFilter !== 'all',
    hasCNAMBonFilter !== 'all',
  ].filter(Boolean).length;

  // Clear all filters function
  const clearAllFilters = () => {
    setSearchTerm('');
    setRappelFilter('all');
    setClientTypeFilter('all');
    setPaymentMethodFilter('all');
    setDateRangeFilter('all');
    setHasCNAMBonFilter('all');
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
                {filteredRows.length} vente(s) sur {rappelRows.length} au total
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
              onClick={clearAllFilters}
              className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
            >
              <X className="h-4 w-4 mr-2" />
              Réinitialiser les filtres
            </Button>
          )}
        </div>

        {/* Search Bar */}
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Rechercher par code vente, client, paiement, facture, bon CNAM..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-11 bg-white border-slate-300 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Filter Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Rappel Status Filter */}
          <div>
            <label className="text-xs font-medium text-slate-700 mb-1.5 block">Statut Rappel</label>
            <Select value={rappelFilter} onValueChange={setRappelFilter}>
              <SelectTrigger className="w-full bg-white border-slate-300">
                <SelectValue placeholder="Tous" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les rappels</SelectItem>
                <SelectItem value="any-upcoming">Tous à venir (90j)</SelectItem>
                <SelectItem value="2years-upcoming">Accessoires à venir</SelectItem>
                <SelectItem value="2years-passed">Accessoires dépassés</SelectItem>
                <SelectItem value="7years-upcoming">Appareils à venir</SelectItem>
                <SelectItem value="7years-passed">Appareils dépassés</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Client Type Filter */}
          <div>
            <label className="text-xs font-medium text-slate-700 mb-1.5 block">Type de Client</label>
            <Select value={clientTypeFilter} onValueChange={setClientTypeFilter}>
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

          {/* Payment Method Filter */}
          <div>
            <label className="text-xs font-medium text-slate-700 mb-1.5 block">Méthode de Paiement</label>
            <Select value={paymentMethodFilter} onValueChange={setPaymentMethodFilter}>
              <SelectTrigger className="w-full bg-white border-slate-300">
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
                <SelectItem value="MIXED">Mixte</SelectItem>
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

          {/* CNAM Bon Filter */}
          <div>
            <label className="text-xs font-medium text-slate-700 mb-1.5 block">Bon CNAM</label>
            <Select value={hasCNAMBonFilter} onValueChange={setHasCNAMBonFilter}>
              <SelectTrigger className="w-full bg-white border-slate-300">
                <SelectValue placeholder="Tous" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                <SelectItem value="with-bon">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Avec bon CNAM
                  </div>
                </SelectItem>
                <SelectItem value="without-bon">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-orange-600" />
                    Sans bon CNAM
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Pagination - Top */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border border-slate-200 rounded-lg mb-3">
        <div className="flex items-center space-x-4">
          <div className="text-sm text-slate-600">
            <span className="font-semibold text-slate-900">{filteredRows.length}</span> rappel(s) au total
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
            <span className="text-sm text-slate-600">/ {totalPages || 1}</span>
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
                <th className="px-3 py-3 text-left text-xs font-semibold text-slate-700 border-r border-slate-200 min-w-[100px]">Date Vente</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-slate-700 border-r border-slate-200 min-w-[200px]">Client</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-slate-700 border-r border-slate-200 min-w-[120px]">Code Paiement</th>
                <th className="px-3 py-3 text-center text-xs font-semibold text-slate-700 border-r border-slate-200 min-w-[100px]">Méthode</th>
                <th className="px-3 py-3 text-right text-xs font-semibold text-slate-700 border-r border-slate-200 min-w-[100px]">Montant Payé</th>
                <th className="px-3 py-3 text-right text-xs font-semibold text-slate-700 border-r border-slate-200 min-w-[100px]">Prix Appareil</th>
                <th className="px-3 py-3 text-right text-xs font-semibold text-slate-700 border-r border-slate-200 min-w-[100px]">Reste à Payer</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-slate-700 border-r border-slate-200 min-w-[120px]">N° Bon CNAM</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-slate-700 border-r border-slate-200 min-w-[180px]">Rappel Accessoires (2 ans)</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-slate-700 border-r border-slate-200 min-w-[180px]">Rappel Appareil (7 ans)</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-slate-700 border-r border-slate-200 min-w-[250px]">Notes</th>
                <th className="px-3 py-3 text-center text-xs font-semibold text-slate-700 sticky right-0 bg-slate-50 shadow-[-2px_0_4px_rgba(0,0,0,0.05)] min-w-[100px]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedRows.length === 0 ? (
                <tr>
                  <td colSpan={14} className="px-3 py-12 text-center">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <AlertCircle className="h-12 w-12 text-slate-300" />
                      <div className="text-slate-500 font-medium">Aucune vente trouvée</div>
                      <div className="text-sm text-slate-400">
                        {filteredRows.length === 0 && rappelRows.length > 0
                          ? 'Essayez de modifier vos filtres de recherche'
                          : 'Aucune vente avec données CNAM disponible'}
                      </div>
                      <div className="text-xs text-slate-400 mt-2">
                        Total ventes: {salesData?.length || 0} |
                        Avec client: {rappelRows.length} |
                        Après filtres: {filteredRows.length}
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedRows.map((row, index) => (
                <tr
                  key={row.saleId}
                  className={`border-b border-slate-100 hover:bg-blue-50/50 transition-colors ${
                    index % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'
                  } ${
                    row.rappel2YearsStatus === 'upcoming' || row.rappel7YearsStatus === 'upcoming'
                      ? 'bg-orange-50/30'
                      : ''
                  }`}
                >
                  {/* Sale Code */}
                  <td className="px-3 py-2.5 text-xs border-r border-slate-100">
                    <Badge variant="outline" className="text-xs font-mono whitespace-nowrap">
                      {row.saleCode}
                    </Badge>
                  </td>

                  {/* Invoice Number */}
                  <td className="px-3 py-2.5 text-xs border-r border-slate-100">
                    <Badge variant="outline" className="text-xs font-mono bg-blue-50 text-blue-700 border-blue-200 whitespace-nowrap">
                      {row.invoiceNumber || 'N/A'}
                    </Badge>
                  </td>

                  {/* Sale Date */}
                  <td className="px-3 py-2.5 text-xs text-slate-600 border-r border-slate-100">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3 w-3 text-slate-400" />
                      {new Date(row.saleDate).toLocaleDateString('fr-FR')}
                    </div>
                  </td>

                  {/* Client */}
                  <td className="px-3 py-2.5 text-sm font-medium text-slate-900 border-r border-slate-100">
                    <div className="flex items-center gap-2">
                      {row.clientType === 'patient' ? (
                        <User className="h-4 w-4 text-blue-600" />
                      ) : (
                        <Building2 className="h-4 w-4 text-purple-600" />
                      )}
                      <div className="flex flex-col gap-1">
                        <div
                          className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer transition-colors"
                          onClick={() => {
                            if (row.clientType === 'patient') {
                              router.push(`/roles/admin/renseignement/patient/${row.clientId}`);
                            }
                          }}
                        >
                          {row.clientName}
                        </div>
                        <div
                          className="text-xs text-slate-500 font-mono cursor-pointer hover:text-blue-600 transition-colors"
                          onClick={() => {
                            if (row.clientType === 'patient') {
                              router.push(`/roles/admin/renseignement/patient/${row.clientId}`);
                            }
                          }}
                        >
                          {row.clientCode}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Payment Codes - Show all payments */}
                  <td className="px-3 py-2.5 text-xs border-r border-slate-100">
                    {row.payments && row.payments.length > 0 ? (
                      <div className="space-y-1">
                        {row.payments.map((payment, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs font-mono mr-1 whitespace-nowrap">
                            {payment.paymentCode}
                          </Badge>
                        ))}
                        {row.payments.length > 1 && (
                          <div className="text-xs text-slate-500 mt-1">
                            ({row.payments.length} paiements)
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">-</span>
                    )}
                  </td>

                  {/* Payment Methods - Show all */}
                  <td className="px-3 py-2.5 text-center border-r border-slate-100">
                    {row.payments && row.payments.length > 0 ? (
                      <div className="space-y-1">
                        {row.payments.map((payment, idx) => (
                          <div key={idx}>{getMethodBadge(payment.method)}</div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">-</span>
                    )}
                  </td>

                  {/* Total Payment Amount */}
                  <td className="px-3 py-2.5 text-right text-sm font-medium text-slate-900 border-r border-slate-100">
                    {row.totalPaid ? (
                      <div>
                        <div className="font-bold text-green-700">
                          {formatCurrency(Number(row.totalPaid))}
                        </div>
                        {row.payments && row.payments.length > 1 && (
                          <div className="text-xs text-slate-500 mt-1">
                            {row.payments.length} paiements
                          </div>
                        )}
                      </div>
                    ) : (
                      '-'
                    )}
                  </td>

                  {/* Sale Amount (Device Price) */}
                  <td className="px-3 py-2.5 text-right text-sm font-medium border-r border-slate-100">
                    {row.saleAmount ? (
                      <div className="font-bold text-blue-700">
                        {formatCurrency(Number(row.saleAmount))}
                      </div>
                    ) : (
                      '-'
                    )}
                  </td>

                  {/* Remaining Amount */}
                  <td className="px-3 py-2.5 text-right text-sm font-medium border-r border-slate-100">
                    {row.remainingAmount !== undefined ? (
                      <div className={`font-bold ${
                        row.remainingAmount > 0
                          ? 'text-red-700'
                          : row.remainingAmount === 0
                            ? 'text-green-700'
                            : 'text-orange-700'
                      }`}>
                        {formatCurrency(Number(row.remainingAmount))}
                      </div>
                    ) : (
                      '-'
                    )}
                  </td>

                  {/* CNAM Bon Number */}
                  <td className="px-3 py-2.5 text-xs border-r border-slate-100">
                    {row.cnamBonNumber ? (
                      <div>
                        <Badge variant="outline" className="text-xs font-mono bg-red-50 text-red-700 border-red-200 whitespace-nowrap">
                          {row.cnamBonNumber}
                        </Badge>
                        {row.cnamBonType && (
                          <div className="text-xs text-slate-500 mt-1">{row.cnamBonType}</div>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">-</span>
                    )}
                  </td>

                  {/* Rappel 2 Years (Accessories) */}
                  <td className="px-3 py-2.5 border-r border-slate-100">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <RefreshCw className="h-3 w-3 text-slate-400" />
                        <span className="text-xs text-slate-600">
                          {row.rappel2Years ? new Date(row.rappel2Years).toLocaleDateString('fr-FR') : '-'}
                        </span>
                      </div>
                      {row.rappel2YearsStatus && row.daysUntil2Years !== undefined && (
                        getRappelBadge(row.rappel2YearsStatus, row.daysUntil2Years, '2years')
                      )}
                    </div>
                  </td>

                  {/* Rappel 7 Years (Device) */}
                  <td className="px-3 py-2.5 border-r border-slate-100">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <RefreshCw className="h-3 w-3 text-slate-400" />
                        <span className="text-xs text-slate-600">
                          {row.rappel7Years ? new Date(row.rappel7Years).toLocaleDateString('fr-FR') : '-'}
                        </span>
                      </div>
                      {row.rappel7YearsStatus && row.daysUntil7Years !== undefined && (
                        getRappelBadge(row.rappel7YearsStatus, row.daysUntil7Years, '7years')
                      )}
                    </div>
                  </td>

                  {/* Notes */}
                  <td className="px-3 py-2.5 text-xs text-slate-600 border-r border-slate-100">
                    <div className="truncate max-w-[200px]" title={row.notes || ''}>
                      {row.notes || '-'}
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="px-3 py-2.5 sticky right-0 bg-inherit shadow-[-2px_0_4px_rgba(0,0,0,0.05)]">
                    <div className="flex items-center justify-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewSale(row.saleId)}
                        className="h-8 w-8 p-0 hover:bg-blue-100 hover:text-blue-700"
                        title="Voir la vente"
                      >
                        <FileText className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
