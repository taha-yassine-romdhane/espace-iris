import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus,
  Save,
  X,
  Trash2,
  Edit2,
  Search,
  DollarSign,
  CheckCircle,
  Clock,
  AlertCircle,
  CreditCard,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface Payment {
  id?: string;
  paymentCode?: string;
  rentalId: string;
  amount: number;
  paymentDate: string;
  periodStartDate?: string;
  periodEndDate?: string;
  periodNumber?: number;
  gapDays?: number;
  paymentMethod: string;
  status: string;
  paymentType?: string;
  notes?: string;
  isRentalPayment: boolean;
  rental?: {
    rentalCode: string;
    patient?: { id: string; firstName: string; lastName: string; patientCode?: string };
    company?: { companyName: string };
    medicalDevice?: { id: string; name: string; deviceCode: string };
  };
}

// Translation helpers
const getMethodLabel = (method: string) => {
  const methods: Record<string, string> = {
    CASH: 'Espèces',
    CHEQUE: 'Chèque',
    VIREMENT: 'Virement',
    CNAM: 'CNAM',
    BANK_TRANSFER: 'Virement Bancaire',
    TRAITE: 'Traite',
    MANDAT: 'Mandat',
  };
  return methods[method] || method;
};

const getTypeLabel = (type: string) => {
  const types: Record<string, string> = {
    DEPOSIT: 'Dépôt',
    RENTAL: 'Location',
    REFUND: 'Remboursement',
    PENALTY: 'Pénalité',
    ADJUSTMENT: 'Complément',
  };
  return types[type] || type;
};

const getStatusLabel = (status: string) => {
  const statuses: Record<string, string> = {
    PENDING: 'En attente',
    PAID: 'Payé',
    GUARANTEE: 'Garantie',
    PARTIAL: 'Partiel',
    CANCELLED: 'Annulé',
  };
  return statuses[status] || status;
};

export default function PaymentsTable() {
  const { toast } = useToast();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newRow, setNewRow] = useState<Partial<Payment> | null>(null);
  const [editData, setEditData] = useState<Partial<Payment>>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [methodFilter, setMethodFilter] = useState<string>("all");
  const [monthFilter, setMonthFilter] = useState<string>("all");
  const [calculatedPeriodNumber, setCalculatedPeriodNumber] = useState<number | null>(null);
  const [calculatedGapDays, setCalculatedGapDays] = useState<number | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  // Fetch payments
  const { data: paymentsData, isLoading } = useQuery({
    queryKey: ['payments'],
    queryFn: async () => {
      const response = await fetch('/api/payments');
      if (!response.ok) throw new Error('Failed to fetch payments');
      const data = await response.json();
      return Array.isArray(data) ? data : (data.payments || []);
    },
  });

  // Fetch rentals for dropdown
  const { data: rentalsData } = useQuery({
    queryKey: ['rentals-for-payments'],
    queryFn: async () => {
      const response = await fetch('/api/rentals/comprehensive');
      if (!response.ok) throw new Error('Failed to fetch rentals');
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    },
  });

  const payments = paymentsData || [];
  const rentals = rentalsData || [];

  // Get unique months from payments
  const uniqueMonths = React.useMemo(() => {
    const months = new Set<string>();
    payments.forEach((payment: Payment) => {
      if (payment.paymentDate) {
        const date = new Date(payment.paymentDate);
        const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        months.add(month);
      }
    });
    return Array.from(months).sort().reverse(); // Most recent first
  }, [payments]);

  const getMonthLabel = (monthString: string) => {
    const [year, month] = monthString.split('-');
    const monthNames = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
    return `${monthNames[parseInt(month) - 1]} ${year}`;
  };

  // Filter payments
  const filteredPayments = payments.filter((payment: Payment) => {
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      const rentalCode = payment.rental?.rentalCode?.toLowerCase() || '';
      const paymentCode = payment.paymentCode?.toLowerCase() || '';
      if (!rentalCode.includes(search) && !paymentCode.includes(search)) {
        return false;
      }
    }
    if (statusFilter !== 'all' && payment.status !== statusFilter) {
      return false;
    }
    if (methodFilter !== 'all' && payment.paymentMethod !== methodFilter) {
      return false;
    }
    // Month filter
    if (monthFilter !== 'all' && payment.paymentDate) {
      const paymentDate = new Date(payment.paymentDate);
      const month = `${paymentDate.getFullYear()}-${String(paymentDate.getMonth() + 1).padStart(2, '0')}`;
      if (month !== monthFilter) {
        return false;
      }
    }
    return true;
  });

  // Pagination calculations
  const totalPages = Math.ceil(filteredPayments.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedPayments = filteredPayments.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, methodFilter, monthFilter]);

  // Calculate statistics
  const stats = {
    total: filteredPayments.length,
    totalAmount: filteredPayments.reduce((sum: number, p: Payment) => sum + Number(p.amount), 0),
    paid: filteredPayments.filter((p: Payment) => p.status === 'PAID').length,
    pending: filteredPayments.filter((p: Payment) => p.status === 'PENDING').length,
  };

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (payment: Partial<Payment>) => {
      const response = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payment, isRentalPayment: true }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create payment');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['rental-statistics'] });
      setNewRow(null);
      toast({ title: "Succès", description: "Paiement créé" });
    },
    onError: (error: Error) => {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Payment> }) => {
      const response = await fetch(`/api/payments/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['rental-statistics'] });
      setEditingId(null);
      setEditData({});
      toast({ title: "Succès", description: "Paiement mis à jour" });
    },
    onError: (error: Error) => {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/payments/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['rental-statistics'] });
      toast({ title: "Succès", description: "Paiement supprimé" });
    },
    onError: (error: Error) => {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    },
  });

  // Helper function to calculate period number and gap days
  const calculatePeriodData = (rentalId: string, periodStartDate: string, excludePaymentId?: string) => {
    if (!rentalId || !periodStartDate) {
      setCalculatedPeriodNumber(null);
      setCalculatedGapDays(null);
      return;
    }

    // Find the selected rental
    const selectedRental = rentals.find((r: any) => r.id === rentalId);
    if (!selectedRental) {
      setCalculatedPeriodNumber(null);
      setCalculatedGapDays(null);
      return;
    }

    // Get all existing payments for this rental, excluding the one being edited (if any)
    let rentalPayments = selectedRental.payments || [];
    if (excludePaymentId) {
      rentalPayments = rentalPayments.filter((p: any) => p.id !== excludePaymentId);
    }

    // Sort by period start date
    rentalPayments.sort((a: any, b: any) => {
      const dateA = new Date(a.periodStartDate || a.paymentDate);
      const dateB = new Date(b.periodStartDate || b.paymentDate);
      return dateA.getTime() - dateB.getTime();
    });

    // Calculate period number (next available period or current position)
    const periodNumber = rentalPayments.length + 1;
    setCalculatedPeriodNumber(periodNumber);

    // Calculate gap days
    let gapDays = 0;
    const currentPeriodStart = new Date(periodStartDate);

    if (periodNumber === 1) {
      // For P1: calculate gap between installation date (rental.startDate) and payment start date
      const installationDate = new Date(selectedRental.startDate);
      const msPerDay = 24 * 60 * 60 * 1000;
      const diffMs = currentPeriodStart.getTime() - installationDate.getTime();
      gapDays = Math.floor(diffMs / msPerDay);
    } else {
      // For P2, P3, etc.: calculate gap from previous period end date
      const lastPayment = rentalPayments[rentalPayments.length - 1];
      if (lastPayment && lastPayment.periodEndDate) {
        const previousEndDate = new Date(lastPayment.periodEndDate);
        const msPerDay = 24 * 60 * 60 * 1000;
        const diffMs = currentPeriodStart.getTime() - previousEndDate.getTime();
        gapDays = Math.floor(diffMs / msPerDay);
      }
    }

    setCalculatedGapDays(gapDays > 0 ? gapDays : 0);
  };

  const handleAddNew = () => {
    setCalculatedPeriodNumber(null);
    setCalculatedGapDays(null);
    setNewRow({
      rentalId: '',
      amount: 0,
      paymentDate: new Date().toISOString().split('T')[0],
      paymentMethod: 'CASH',
      status: 'PAID',
      paymentType: 'RENTAL',
      isRentalPayment: true,
    });
  };

  const handleSaveNew = () => {
    if (!newRow?.rentalId || !newRow?.amount) {
      toast({ title: "Erreur", description: "Remplissez tous les champs requis", variant: "destructive" });
      return;
    }
    // Include calculated period data in the payment
    const paymentData = {
      ...newRow,
      periodNumber: calculatedPeriodNumber ?? undefined,
      gapDays: calculatedGapDays ?? undefined,
    };
    createMutation.mutate(paymentData);
  };

  const handleEdit = (payment: Payment) => {
    setEditingId(payment.id!);
    setEditData(payment);
    // Initialize calculation with current payment data, excluding this payment from the count
    if (payment.rentalId && payment.periodStartDate) {
      calculatePeriodData(payment.rentalId, payment.periodStartDate, payment.id);
    } else {
      setCalculatedPeriodNumber(null);
      setCalculatedGapDays(null);
    }
  };

  const handleSaveEdit = () => {
    if (!editingId) return;

    // Recalculate to ensure we have the latest values
    if (editData.rentalId && editData.periodStartDate && calculatedPeriodNumber === null) {
      calculatePeriodData(editData.rentalId, editData.periodStartDate, editingId);
    }

    // Include calculated period data in the update
    const updatedData = {
      ...editData,
      periodNumber: calculatedPeriodNumber !== null ? calculatedPeriodNumber : editData.periodNumber,
      gapDays: calculatedGapDays !== null ? calculatedGapDays : editData.gapDays,
    };

    updateMutation.mutate({ id: editingId, data: updatedData });
  };

  const handleDelete = (id: string) => {
    if (confirm('Supprimer ce paiement ?')) {
      deleteMutation.mutate(id);
    }
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { color: string; icon: any; label: string }> = {
      PAID: {
        color: 'bg-green-100 text-green-800 border-green-200',
        icon: CheckCircle,
        label: 'Payé'
      },
      PENDING: {
        color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        icon: Clock,
        label: 'En attente'
      },
      PARTIAL: {
        color: 'bg-orange-100 text-orange-800 border-orange-200',
        icon: AlertCircle,
        label: 'Partiel'
      },
      GUARANTEE: {
        color: 'bg-blue-100 text-blue-800 border-blue-200',
        icon: DollarSign,
        label: 'Garantie'
      },
      CANCELLED: {
        color: 'bg-red-100 text-red-800 border-red-200',
        icon: X,
        label: 'Annulé'
      },
      REFUNDED: {
        color: 'bg-purple-100 text-purple-800 border-purple-200',
        icon: DollarSign,
        label: 'Remboursé'
      },
    };

    const cfg = config[status] || config.PENDING;
    const Icon = cfg.icon;

    return (
      <Badge variant="outline" className={`${cfg.color} flex items-center gap-1`}>
        <Icon className="h-3 w-3" />
        {cfg.label}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="text-sm text-blue-600 font-medium">Total Paiements</div>
          <div className="text-2xl font-bold text-blue-900">{stats.total}</div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="text-sm text-green-600 font-medium">Montant Total</div>
          <div className="text-2xl font-bold text-green-900">{stats.totalAmount.toFixed(2)} DT</div>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
          <div className="text-sm text-emerald-600 font-medium">Payés</div>
          <div className="text-2xl font-bold text-emerald-900">{stats.paid}</div>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="text-sm text-yellow-600 font-medium">En Attente</div>
          <div className="text-2xl font-bold text-yellow-900">{stats.pending}</div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between bg-white p-4 rounded-lg shadow-sm border">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Rechercher par code paiement ou location..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              <SelectItem value="PAID">Payé</SelectItem>
              <SelectItem value="PENDING">En attente</SelectItem>
              <SelectItem value="PARTIAL">Partiel</SelectItem>
              <SelectItem value="REFUNDED">Remboursé</SelectItem>
            </SelectContent>
          </Select>
          <Select value={methodFilter} onValueChange={setMethodFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Méthode" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes méthodes</SelectItem>
              <SelectItem value="CASH">Espèces</SelectItem>
              <SelectItem value="CHEQUE">Chèque</SelectItem>
              <SelectItem value="VIREMENT">Virement</SelectItem>
              <SelectItem value="CNAM">CNAM</SelectItem>
            </SelectContent>
          </Select>
          <Select value={monthFilter} onValueChange={setMonthFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Mois" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les mois</SelectItem>
              {uniqueMonths.map((month) => (
                <SelectItem key={month} value={month}>
                  {getMonthLabel(month)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            onClick={() => {
              setSearchTerm("");
              setStatusFilter("all");
              setMethodFilter("all");
              setMonthFilter("all");
            }}
            variant="outline"
          >
            Réinitialiser
          </Button>
          <Button onClick={handleAddNew} disabled={newRow !== null} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="h-4 w-4 mr-2" />
            Nouveau Paiement
          </Button>
        </div>
      </div>

      {/* Results count and Pagination Info */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6 text-sm">
          <span className="text-slate-600">
            <strong>{filteredPayments.length}</strong> paiement(s) trouvé(s)
          </span>
          {totalPages > 1 && (
            <span className="text-slate-500 text-xs">
              Page {currentPage} sur {totalPages} • Affichage {startIndex + 1}-{Math.min(endIndex, filteredPayments.length)} sur {filteredPayments.length}
            </span>
          )}
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="h-8"
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
                    className="h-8 w-8 p-0"
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
              className="h-8"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm border overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Code Paiement</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Location</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Client</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Appareil</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Montant</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Date Paiement</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Début Période</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Fin Période</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Période</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Jours d'écart</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Méthode</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Type</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Statut</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {/* New Row */}
            {newRow && (
              <tr className="bg-green-50 border-b-2 border-green-200">
                <td className="px-4 py-3">
                  <span className="text-xs text-slate-500">Auto</span>
                </td>
                <td className="px-4 py-3">
                  <Select
                    value={newRow.rentalId}
                    onValueChange={(value) => {
                      setNewRow({ ...newRow, rentalId: value });
                      calculatePeriodData(value, newRow.periodStartDate || '');
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Sélectionner" />
                    </SelectTrigger>
                    <SelectContent>
                      {rentals.map((rental: any) => (
                        <SelectItem key={rental.id} value={rental.id}>
                          {rental.rentalCode}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </td>
                <td className="px-4 py-3">
                  <span className="text-xs text-slate-500">Auto</span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-xs text-slate-500">Auto</span>
                </td>
                <td className="px-4 py-3">
                  <Input
                    type="number"
                    step="0.01"
                    value={newRow.amount}
                    onChange={(e) => setNewRow({ ...newRow, amount: parseFloat(e.target.value) })}
                    className="w-28"
                    placeholder="0.00"
                  />
                </td>
                <td className="px-4 py-3">
                  <Input
                    type="date"
                    value={newRow.paymentDate}
                    onChange={(e) => setNewRow({ ...newRow, paymentDate: e.target.value })}
                    className="text-xs"
                  />
                </td>
                <td className="px-4 py-3">
                  <Input
                    type="date"
                    value={newRow.periodStartDate}
                    onChange={(e) => {
                      setNewRow({ ...newRow, periodStartDate: e.target.value });
                      calculatePeriodData(newRow.rentalId || '', e.target.value);
                    }}
                    className="text-xs"
                    placeholder="Début"
                  />
                </td>
                <td className="px-4 py-3">
                  <Input
                    type="date"
                    value={newRow.periodEndDate}
                    onChange={(e) => setNewRow({ ...newRow, periodEndDate: e.target.value })}
                    className="text-xs"
                    placeholder="Fin"
                  />
                </td>
                <td className="px-4 py-3">
                  <div className="text-xs text-center font-semibold text-green-700">
                    {calculatedPeriodNumber ? `P${calculatedPeriodNumber}` : '-'}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="text-xs text-center font-semibold text-green-700">
                    {calculatedGapDays !== null ? `${calculatedGapDays} jour${calculatedGapDays > 1 ? 's' : ''}` : '-'}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <Select
                    value={newRow.paymentMethod}
                    onValueChange={(value) => setNewRow({ ...newRow, paymentMethod: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CASH">Espèces</SelectItem>
                      <SelectItem value="CHEQUE">Chèque</SelectItem>
                      <SelectItem value="VIREMENT">Virement</SelectItem>
                      <SelectItem value="CNAM">CNAM</SelectItem>
                    </SelectContent>
                  </Select>
                </td>
                <td className="px-4 py-3">
                  <Select
                    value={newRow.paymentType}
                    onValueChange={(value) => setNewRow({ ...newRow, paymentType: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DEPOSIT">Dépôt</SelectItem>
                      <SelectItem value="RENTAL">Location</SelectItem>
                      <SelectItem value="REFUND">Remboursement</SelectItem>
                      <SelectItem value="PENALTY">Pénalité</SelectItem>
                      <SelectItem value="ADJUSTMENT">Complément</SelectItem>
                    </SelectContent>
                  </Select>
                </td>
                <td className="px-4 py-3">
                  <Select
                    value={newRow.status}
                    onValueChange={(value) => setNewRow({ ...newRow, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PAID">Payé</SelectItem>
                      <SelectItem value="PENDING">En attente</SelectItem>
                      <SelectItem value="PARTIAL">Partiel</SelectItem>
                      <SelectItem value="REFUNDED">Remboursé</SelectItem>
                    </SelectContent>
                  </Select>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-2">
                    <Button size="sm" onClick={handleSaveNew} className="bg-green-600 hover:bg-green-700">
                      <Save className="h-3 w-3" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setNewRow(null)}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </td>
              </tr>
            )}

            {/* Existing Rows */}
            {paginatedPayments.map((payment: Payment) => {
              const isEditing = editingId === payment.id;
              const clientName = payment.rental?.patient
                ? `${payment.rental.patient.firstName} ${payment.rental.patient.lastName}`
                : payment.rental?.company?.companyName || 'N/A';

              if (isEditing) {
                return (
                  <tr key={payment.id} className="bg-blue-50 border-b-2 border-blue-200">
                    <td className="px-4 py-3">
                      <span className="text-xs text-slate-500">{payment.paymentCode || 'N/A'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <Select
                        value={editData.rentalId}
                        onValueChange={(value) => {
                          setEditData({ ...editData, rentalId: value });
                          calculatePeriodData(value, editData.periodStartDate || '', editingId || undefined);
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {rentals.map((rental: any) => (
                            <SelectItem key={rental.id} value={rental.id}>
                              {rental.rentalCode}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-slate-500">Auto</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-slate-500">Auto</span>
                    </td>
                    <td className="px-4 py-3">
                      <Input
                        type="number"
                        step="0.01"
                        value={editData.amount}
                        onChange={(e) => setEditData({ ...editData, amount: parseFloat(e.target.value) })}
                        className="w-28"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Input
                        type="date"
                        value={editData.paymentDate}
                        onChange={(e) => setEditData({ ...editData, paymentDate: e.target.value })}
                        className="text-xs"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Input
                        type="date"
                        value={editData.periodStartDate || ''}
                        onChange={(e) => {
                          setEditData({ ...editData, periodStartDate: e.target.value });
                          calculatePeriodData(editData.rentalId || '', e.target.value, editingId || undefined);
                        }}
                        className="text-xs"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Input
                        type="date"
                        value={editData.periodEndDate || ''}
                        onChange={(e) => setEditData({ ...editData, periodEndDate: e.target.value })}
                        className="text-xs"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-xs text-center font-semibold text-blue-700">
                        {calculatedPeriodNumber ? `P${calculatedPeriodNumber}` : (payment.periodNumber ? `P${payment.periodNumber}` : '-')}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-xs text-center font-semibold text-blue-700">
                        {calculatedGapDays !== null ? `${calculatedGapDays} jour${calculatedGapDays > 1 ? 's' : ''}` : (payment.gapDays ? `${payment.gapDays} jour${payment.gapDays > 1 ? 's' : ''}` : '-')}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Select
                        value={editData.paymentMethod}
                        onValueChange={(value) => setEditData({ ...editData, paymentMethod: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="CASH">Espèces</SelectItem>
                          <SelectItem value="CHEQUE">Chèque</SelectItem>
                          <SelectItem value="VIREMENT">Virement</SelectItem>
                          <SelectItem value="CNAM">CNAM</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-4 py-3">
                      <Select
                        value={editData.paymentType}
                        onValueChange={(value) => setEditData({ ...editData, paymentType: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="DEPOSIT">Dépôt</SelectItem>
                          <SelectItem value="RENTAL">Location</SelectItem>
                          <SelectItem value="REFUND">Remboursement</SelectItem>
                          <SelectItem value="PENALTY">Pénalité</SelectItem>
                          <SelectItem value="ADJUSTMENT">Complément</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-4 py-3">
                      <Select
                        value={editData.status}
                        onValueChange={(value) => setEditData({ ...editData, status: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="PAID">Payé</SelectItem>
                          <SelectItem value="PENDING">En attente</SelectItem>
                          <SelectItem value="PARTIAL">Partiel</SelectItem>
                          <SelectItem value="REFUNDED">Remboursé</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" onClick={handleSaveEdit} className="bg-blue-600 hover:bg-blue-700">
                          <Save className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingId(null);
                            setEditData({});
                          }}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              }

              return (
                <tr key={payment.id} className="border-b hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <Badge variant="outline" className="font-mono text-xs">
                      {payment.paymentCode || 'N/A'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="secondary">{payment.rental?.rentalCode}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    {payment.rental?.patient ? (
                      <div>
                        <div
                          className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline cursor-pointer transition-colors"
                          onClick={() => router.push(`/roles/admin/renseignement/patient/${payment.rental?.patient?.id}`)}
                        >
                          {clientName}
                        </div>
                        {payment.rental.patient.patientCode && (
                          <div
                            className="text-xs text-slate-500 font-mono cursor-pointer hover:text-blue-600 transition-colors"
                            onClick={() => router.push(`/roles/admin/renseignement/patient/${payment.rental?.patient?.id}`)}
                          >
                            {payment.rental.patient.patientCode}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-sm font-medium text-slate-900">{clientName}</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div
                      className="text-sm text-blue-600 hover:text-blue-800 hover:underline cursor-pointer transition-colors"
                      onClick={() => router.push(`/roles/admin/appareils/medical-device/${payment.rental?.medicalDevice?.id}`)}
                    >
                      {payment.rental?.medicalDevice?.name || 'N/A'}
                    </div>
                    <div
                      className="text-xs text-slate-500 font-mono cursor-pointer hover:text-blue-600 transition-colors"
                      onClick={() => router.push(`/roles/admin/appareils/medical-device/${payment.rental?.medicalDevice?.id}`)}
                    >
                      {payment.rental?.medicalDevice?.deviceCode}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm font-semibold text-green-700">
                      {Number(payment.amount).toFixed(2)} DT
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-xs text-slate-700">
                      {format(new Date(payment.paymentDate), 'dd/MM/yyyy', { locale: fr })}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-xs text-slate-700">
                      {payment.periodStartDate ? format(new Date(payment.periodStartDate), 'dd/MM/yyyy', { locale: fr }) : '-'}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-xs text-slate-700">
                      {payment.periodEndDate ? format(new Date(payment.periodEndDate), 'dd/MM/yyyy', { locale: fr }) : '-'}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-xs text-slate-700 text-center">
                      {payment.periodNumber ? `P${payment.periodNumber}` : '-'}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-xs text-slate-700 text-center">
                      {payment.gapDays !== null && payment.gapDays !== undefined ? `${payment.gapDays} jour${payment.gapDays > 1 ? 's' : ''}` : '-'}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className="text-xs">
                      <CreditCard className="h-3 w-3 mr-1" />
                      {getMethodLabel(payment.paymentMethod)}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="secondary" className="text-xs">
                      {payment.paymentType ? getTypeLabel(payment.paymentType) : 'N/A'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">{getStatusBadge(payment.status)}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleEdit(payment)}>
                        <Edit2 className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(payment.id!)}
                        className="text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}

            {filteredPayments.length === 0 && !newRow && (
              <tr>
                <td colSpan={14} className="px-4 py-12 text-center text-slate-500">
                  Aucun paiement trouvé. Cliquez sur "Nouveau Paiement" pour commencer.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
