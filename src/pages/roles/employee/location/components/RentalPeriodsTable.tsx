import { useState } from 'react';
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
  Calendar,
  AlertTriangle,
  DollarSign,
  CreditCard,
  CheckCircle,
  Clock,
  Shield,
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
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface RentalPeriod {
  id?: string;
  rentalId: string;
  startDate: string;
  endDate: string;
  expectedAmount: number;
  cnamExpectedAmount?: number | null;
  patientExpectedAmount?: number | null;
  cnamPaid?: number;
  patientPaid?: number;
  totalPaid?: number;
  isGapPeriod: boolean;
  gapReason?: string;
  notes?: string;
  cnamBonId?: string | null;
  rental?: {
    rentalCode: string;
    patient?: { firstName: string; lastName: string };
    medicalDevice?: { name: string };
  };
  cnamBon?: {
    bonType: string;
    bonAmount: number;
  };
  payments?: any[];
}

export default function RentalPeriodsTable() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newRow, setNewRow] = useState<Partial<RentalPeriod> | null>(null);
  const [editData, setEditData] = useState<Partial<RentalPeriod>>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [gapFilter, setGapFilter] = useState<string>("all");

  // Payment dialog state
  const [paymentDialog, setPaymentDialog] = useState<{
    open: boolean;
    periodId: string | null;
    paymentType: 'CNAM' | 'PATIENT' | null;
    amount: number;
    rentalId: string;
  }>({
    open: false,
    periodId: null,
    paymentType: null,
    amount: 0,
    rentalId: '',
  });

  // Fetch rental periods
  const { data: periodsData, isLoading } = useQuery({
    queryKey: ['rental-periods'],
    queryFn: async () => {
      const response = await fetch('/api/rental-periods');
      if (!response.ok) throw new Error('Failed to fetch periods');
      const data = await response.json();
      return Array.isArray(data) ? data : (data.periods || []);
    },
  });

  // Fetch rentals for dropdown
  const { data: rentalsData } = useQuery({
    queryKey: ['rentals-for-periods'],
    queryFn: async () => {
      const response = await fetch('/api/rentals/comprehensive');
      if (!response.ok) throw new Error('Failed to fetch rentals');
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    },
  });

  const periods = periodsData || [];
  const rentals = rentalsData || [];

  // Filter periods
  const filteredPeriods = periods.filter((period: RentalPeriod) => {
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      const rentalCode = period.rental?.rentalCode?.toLowerCase() || '';
      if (!rentalCode.includes(search)) {
        return false;
      }
    }
    if (gapFilter !== 'all') {
      const isGap = gapFilter === 'gap';
      if (period.isGapPeriod !== isGap) return false;
    }
    return true;
  });

  // Calculate statistics
  const stats = {
    total: filteredPeriods.length,
    totalExpected: filteredPeriods.reduce((sum: number, p: RentalPeriod) => sum + Number(p.expectedAmount), 0),
    totalPaid: filteredPeriods.reduce((sum: number, p: RentalPeriod) => sum + Number(p.totalPaid || 0), 0),
    gaps: filteredPeriods.filter((p: RentalPeriod) => p.isGapPeriod).length,
  };

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (data: Partial<RentalPeriod>) => {
      const response = await fetch('/api/rental-periods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create period');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rental-periods'] });
      setNewRow(null);
      toast({ title: "Succès", description: "Période créée" });
    },
    onError: (error: Error) => {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<RentalPeriod> }) => {
      const response = await fetch(`/api/rental-periods/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rental-periods'] });
      setEditingId(null);
      setEditData({});
      toast({ title: "Succès", description: "Période mise à jour" });
    },
    onError: (error: Error) => {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/rental-periods/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rental-periods'] });
      toast({ title: "Succès", description: "Période supprimée" });
    },
    onError: (error: Error) => {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    },
  });

  const createPaymentMutation = useMutation({
    mutationFn: async (data: { rentalId: string; rentalPeriodId: string; amount: number; paymentMethod: string }) => {
      const response = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          paymentDate: new Date().toISOString().split('T')[0],
          paymentType: 'RENTAL',
          status: 'PAID',
        }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create payment');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rental-periods'] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      setPaymentDialog({ open: false, periodId: null, paymentType: null, amount: 0, rentalId: '' });
      toast({ title: "Succès", description: "Paiement enregistré" });
    },
    onError: (error: Error) => {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    },
  });

  const handleAddNew = () => {
    setNewRow({
      rentalId: '',
      startDate: new Date().toISOString().split('T')[0],
      endDate: '',
      expectedAmount: 0,
      cnamExpectedAmount: null,
      patientExpectedAmount: null,
      isGapPeriod: false,
    });
  };

  const handleRecordPayment = (period: RentalPeriod, type: 'CNAM' | 'PATIENT') => {
    const amount = type === 'CNAM'
      ? (period.cnamExpectedAmount || 0) - (period.cnamPaid || 0)
      : (period.patientExpectedAmount || 0) - (period.patientPaid || 0);

    setPaymentDialog({
      open: true,
      periodId: period.id!,
      paymentType: type,
      amount,
      rentalId: period.rentalId,
    });
  };

  const handleConfirmPayment = () => {
    if (!paymentDialog.periodId || !paymentDialog.paymentType) return;

    const paymentMethod = paymentDialog.paymentType === 'CNAM' ? 'CNAM' : 'CASH';

    createPaymentMutation.mutate({
      rentalId: paymentDialog.rentalId,
      rentalPeriodId: paymentDialog.periodId,
      amount: paymentDialog.amount,
      paymentMethod,
    });
  };

  const handleSaveNew = () => {
    if (!newRow?.rentalId || !newRow?.startDate || !newRow?.endDate) {
      toast({ title: "Erreur", description: "Remplissez tous les champs requis", variant: "destructive" });
      return;
    }
    createMutation.mutate(newRow);
  };

  const handleEdit = (period: RentalPeriod) => {
    setEditingId(period.id!);
    setEditData(period);
  };

  const handleSaveEdit = () => {
    if (!editingId) return;
    updateMutation.mutate({ id: editingId, data: editData });
  };

  const handleDelete = (id: string) => {
    if (confirm('Supprimer cette période ?')) {
      deleteMutation.mutate(id);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="text-sm text-green-600 font-medium">Total Périodes</div>
          <div className="text-2xl font-bold text-green-900">{stats.total}</div>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="text-sm text-purple-600 font-medium">Montant Attendu</div>
          <div className="text-2xl font-bold text-purple-900">{stats.totalExpected.toFixed(2)} DT</div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="text-sm text-green-600 font-medium">Montant Payé</div>
          <div className="text-2xl font-bold text-green-900">{stats.totalPaid.toFixed(2)} DT</div>
        </div>
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="text-sm text-orange-600 font-medium">Périodes Gap</div>
          <div className="text-2xl font-bold text-orange-900">{stats.gaps}</div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between bg-white p-4 rounded-lg shadow-sm border">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Rechercher par code location..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Select value={gapFilter} onValueChange={setGapFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              <SelectItem value="normal">Normales</SelectItem>
              <SelectItem value="gap">Gaps</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleAddNew} disabled={newRow !== null} className="bg-green-600 hover:bg-green-700">
            <Plus className="h-4 w-4 mr-2" />
            Nouvelle Période
          </Button>
        </div>
      </div>

      {/* Results count */}
      <div className="text-sm text-slate-600">
        {filteredPeriods.length} période(s) trouvée(s)
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm border overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="px-3 py-2 text-left text-[10px] font-semibold text-slate-700">Location</th>
              <th className="px-3 py-2 text-left text-[10px] font-semibold text-slate-700">Client</th>
              <th className="px-3 py-2 text-left text-[10px] font-semibold text-slate-700">Période</th>
              <th className="px-3 py-2 text-center text-[10px] font-semibold text-green-700 border-l border-r border-green-200 bg-green-50" colSpan={3}>
                <div className="flex items-center justify-center gap-1">
                  <Shield className="h-3 w-3" />
                  CNAM
                </div>
              </th>
              <th className="px-3 py-2 text-center text-[10px] font-semibold text-green-700 border-l border-r border-green-200 bg-green-50" colSpan={3}>
                <div className="flex items-center justify-center gap-1">
                  <CreditCard className="h-3 w-3" />
                  Patient
                </div>
              </th>
              <th className="px-3 py-2 text-left text-[10px] font-semibold text-slate-700">Statut</th>
              <th className="px-3 py-2 text-right text-[10px] font-semibold text-slate-700">Actions</th>
            </tr>
            <tr className="bg-slate-100">
              <th className="px-3 py-1"></th>
              <th className="px-3 py-1"></th>
              <th className="px-3 py-1"></th>
              <th className="px-2 py-1 text-[9px] text-green-600 border-l border-green-200">Attendu</th>
              <th className="px-2 py-1 text-[9px] text-green-600">Payé</th>
              <th className="px-2 py-1 text-[9px] text-green-600 border-r border-green-200">Action</th>
              <th className="px-2 py-1 text-[9px] text-green-600 border-l border-green-200">Attendu</th>
              <th className="px-2 py-1 text-[9px] text-green-600">Payé</th>
              <th className="px-2 py-1 text-[9px] text-green-600 border-r border-green-200">Action</th>
              <th className="px-3 py-1"></th>
              <th className="px-3 py-1"></th>
            </tr>
          </thead>
          <tbody>
            {/* New Row */}
            {newRow && (
              <tr className="bg-green-50 border-b-2 border-green-200">
                <td className="px-4 py-3">
                  <Select
                    value={newRow.rentalId}
                    onValueChange={(value) => setNewRow({ ...newRow, rentalId: value })}
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
                  <Input
                    type="date"
                    value={newRow.startDate}
                    onChange={(e) => setNewRow({ ...newRow, startDate: e.target.value })}
                    className="text-xs"
                  />
                </td>
                <td className="px-4 py-3">
                  <Input
                    type="date"
                    value={newRow.endDate}
                    onChange={(e) => setNewRow({ ...newRow, endDate: e.target.value })}
                    className="text-xs"
                  />
                </td>
                <td className="px-4 py-3">
                  <span className="text-xs text-slate-500">Auto</span>
                </td>
                <td className="px-4 py-3">
                  <Input
                    type="number"
                    step="0.01"
                    value={newRow.expectedAmount ? Number(newRow.expectedAmount) : ''}
                    onChange={(e) => setNewRow({ ...newRow, expectedAmount: parseFloat(e.target.value) })}
                    className="w-24"
                  />
                </td>
                <td className="px-4 py-3">
                  <span className="text-xs text-muted-foreground">N/A</span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={newRow.isGapPeriod}
                      onCheckedChange={(checked) => setNewRow({ ...newRow, isGapPeriod: checked })}
                    />
                    <Label className="text-xs">{newRow.isGapPeriod ? 'Gap' : 'Normal'}</Label>
                  </div>
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
            {filteredPeriods.map((period: RentalPeriod) => {
              const isEditing = editingId === period.id;
              const clientName = period.rental?.patient
                ? `${period.rental.patient.firstName} ${period.rental.patient.lastName}`
                : 'N/A';

              // Calculate duration in days
              const start = new Date(period.startDate);
              const end = new Date(period.endDate);
              const durationDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

              if (isEditing) {
                return (
                  <tr key={period.id} className="bg-green-50 border-b-2 border-green-200">
                    <td className="px-4 py-3">
                      <Select
                        value={editData.rentalId}
                        onValueChange={(value) => setEditData({ ...editData, rentalId: value })}
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
                      <Input
                        type="date"
                        value={editData.startDate}
                        onChange={(e) => setEditData({ ...editData, startDate: e.target.value })}
                        className="text-xs"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Input
                        type="date"
                        value={editData.endDate}
                        onChange={(e) => setEditData({ ...editData, endDate: e.target.value })}
                        className="text-xs"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-slate-500">Auto</span>
                    </td>
                    <td className="px-4 py-3">
                      <Input
                        type="number"
                        step="0.01"
                        value={editData.expectedAmount ? Number(editData.expectedAmount) : ''}
                        onChange={(e) => setEditData({ ...editData, expectedAmount: parseFloat(e.target.value) })}
                        className="w-24"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-muted-foreground">N/A</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={editData.isGapPeriod}
                          onCheckedChange={(checked) => setEditData({ ...editData, isGapPeriod: checked })}
                        />
                        <Label className="text-xs">{editData.isGapPeriod ? 'Gap' : 'Normal'}</Label>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" onClick={handleSaveEdit} className="bg-green-600 hover:bg-green-700">
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

              // Calculate CNAM status
              const cnamExpected = period.cnamExpectedAmount || 0;
              const cnamPaid = period.cnamPaid || 0;
              const cnamRemaining = cnamExpected - cnamPaid;
              const cnamFullyPaid = cnamExpected > 0 && cnamRemaining <= 0.01;

              // Calculate Patient status
              const patientExpected = period.patientExpectedAmount || 0;
              const patientPaid = period.patientPaid || 0;
              const patientRemaining = patientExpected - patientPaid;
              const patientFullyPaid = patientExpected > 0 && patientRemaining <= 0.01;

              // Overall status
              const isFullyPaid = (cnamExpected === 0 || cnamFullyPaid) && (patientExpected === 0 || patientFullyPaid);
              const isPartiallyPaid = (cnamPaid > 0 || patientPaid > 0) && !isFullyPaid;

              return (
                <tr key={period.id} className={`border-b hover:bg-slate-50 transition-colors ${period.isGapPeriod ? 'bg-orange-50' : ''}`}>
                  {/* Location */}
                  <td className="px-3 py-2">
                    <Badge variant="outline" className="font-mono text-[10px]">
                      {period.rental?.rentalCode}
                    </Badge>
                  </td>

                  {/* Client */}
                  <td className="px-3 py-2">
                    <div className="text-[11px] font-medium text-slate-900">{clientName}</div>
                    {period.rental?.medicalDevice && (
                      <div className="text-[9px] text-slate-500">{period.rental.medicalDevice.name}</div>
                    )}
                  </td>

                  {/* Period Dates */}
                  <td className="px-3 py-2">
                    <div className="text-[10px] text-slate-700">
                      {format(new Date(period.startDate), 'dd/MM', { locale: fr })} - {format(new Date(period.endDate), 'dd/MM/yy', { locale: fr })}
                    </div>
                  </td>

                  {/* CNAM Expected */}
                  <td className="px-2 py-2 border-l border-green-200 bg-green-50/30">
                    <div className="text-[11px] font-semibold text-green-700">
                      {cnamExpected > 0 ? `${cnamExpected.toFixed(0)} DT` : '-'}
                    </div>
                  </td>

                  {/* CNAM Paid */}
                  <td className="px-2 py-2 bg-green-50/30">
                    <div className="text-[11px] font-semibold text-green-900">
                      {cnamPaid > 0 ? `${cnamPaid.toFixed(0)} DT` : '-'}
                    </div>
                  </td>

                  {/* CNAM Action */}
                  <td className="px-2 py-2 border-r border-green-200 bg-green-50/30">
                    {cnamExpected > 0 && !cnamFullyPaid && (
                      <Button
                        size="sm"
                        onClick={() => handleRecordPayment(period, 'CNAM')}
                        className="h-6 px-2 text-[9px] bg-green-600 hover:bg-green-700"
                      >
                        <CreditCard className="h-3 w-3 mr-1" />
                        {cnamRemaining.toFixed(0)} DT
                      </Button>
                    )}
                    {cnamFullyPaid && (
                      <Badge className="bg-green-100 text-green-800 border-blue-300 text-[9px]">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Payé
                      </Badge>
                    )}
                  </td>

                  {/* Patient Expected */}
                  <td className="px-2 py-2 border-l border-green-200 bg-green-50/30">
                    <div className="text-[11px] font-semibold text-green-700">
                      {patientExpected > 0 ? `${patientExpected.toFixed(0)} DT` : '-'}
                    </div>
                  </td>

                  {/* Patient Paid */}
                  <td className="px-2 py-2 bg-green-50/30">
                    <div className="text-[11px] font-semibold text-green-900">
                      {patientPaid > 0 ? `${patientPaid.toFixed(0)} DT` : '-'}
                    </div>
                  </td>

                  {/* Patient Action */}
                  <td className="px-2 py-2 border-r border-green-200 bg-green-50/30">
                    {patientExpected > 0 && !patientFullyPaid && (
                      <Button
                        size="sm"
                        onClick={() => handleRecordPayment(period, 'PATIENT')}
                        className="h-6 px-2 text-[9px] bg-green-600 hover:bg-green-700"
                      >
                        <CreditCard className="h-3 w-3 mr-1" />
                        {patientRemaining.toFixed(0)} DT
                      </Button>
                    )}
                    {patientFullyPaid && (
                      <Badge className="bg-green-100 text-green-800 border-green-300 text-[9px]">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Payé
                      </Badge>
                    )}
                  </td>

                  {/* Overall Status */}
                  <td className="px-3 py-2">
                    {isFullyPaid && (
                      <Badge className="bg-green-100 text-green-800 border-green-300 text-[9px]">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Complet
                      </Badge>
                    )}
                    {isPartiallyPaid && !isFullyPaid && (
                      <Badge className="bg-orange-100 text-orange-800 border-orange-300 text-[9px]">
                        <Clock className="h-3 w-3 mr-1" />
                        Partiel
                      </Badge>
                    )}
                    {!isPartiallyPaid && !isFullyPaid && (
                      <Badge variant="outline" className="text-[9px]">
                        <Clock className="h-3 w-3 mr-1" />
                        En attente
                      </Badge>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="px-3 py-2 text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="outline" onClick={() => handleEdit(period)} className="h-7 w-7 p-0">
                        <Edit2 className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(period.id!)}
                        className="text-red-600 hover:bg-red-50 h-7 w-7 p-0"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}

            {filteredPeriods.length === 0 && !newRow && (
              <tr>
                <td colSpan={11} className="px-4 py-12 text-center text-slate-500">
                  Aucune période trouvée. Cliquez sur "Nouvelle Période" pour commencer.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Payment Dialog */}
      <Dialog open={paymentDialog.open} onOpenChange={(open) => !open && setPaymentDialog({ ...paymentDialog, open: false })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Enregistrer Paiement {paymentDialog.paymentType === 'CNAM' ? 'CNAM' : 'Patient'}
            </DialogTitle>
            <DialogDescription>
              Confirmer la réception du paiement de {paymentDialog.amount.toFixed(2)} DT
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
              <div>
                <div className="text-sm font-medium text-slate-700">Montant</div>
                <div className="text-2xl font-bold text-slate-900">{paymentDialog.amount.toFixed(2)} DT</div>
              </div>
              <div>
                <Badge className={paymentDialog.paymentType === 'CNAM' ? 'bg-green-100 text-green-800' : 'bg-green-100 text-green-800'}>
                  {paymentDialog.paymentType === 'CNAM' ? (
                    <><Shield className="h-4 w-4 mr-1" /> CNAM</>
                  ) : (
                    <><CreditCard className="h-4 w-4 mr-1" /> Patient</>
                  )}
                </Badge>
              </div>
            </div>

            <div className="text-sm text-slate-600">
              Méthode de paiement: <span className="font-semibold">{paymentDialog.paymentType === 'CNAM' ? 'CNAM' : 'Espèces'}</span>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPaymentDialog({ ...paymentDialog, open: false })}
            >
              Annuler
            </Button>
            <Button
              onClick={handleConfirmPayment}
              className={paymentDialog.paymentType === 'CNAM' ? 'bg-green-600 hover:bg-green-700' : 'bg-green-600 hover:bg-green-700'}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Confirmer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
