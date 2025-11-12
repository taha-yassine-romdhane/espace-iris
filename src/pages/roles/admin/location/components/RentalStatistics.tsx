import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  BarChart3,
  Save,
  X,
  Edit2,
  Search,
  Calendar,
  User,
  Stethoscope,
  Package,
  Users,
  Bell,
  Maximize2,
  Minimize2,
  Filter,
  XCircle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface PatientStatistic {
  id: string;
  patientId?: string;
  patientName: string;
  patientCode?: string;
  patientPhone?: string;
  patientPhoneTwo?: string | null;
  doctorName?: string;
  rentalCode?: string;
  deviceId?: string;
  deviceName?: string;
  deviceCode?: string;
  employeeName?: string;
  startDate?: string;
  endDate?: string;
  alertDate?: string;
  titrationReminderDate?: string;
  appointmentDate?: string;
  notes?: string;
  status?: string;
  monthlyRate?: number | null;
  lastPaymentDate?: string | null;
  lastPaymentPeriodStartDate?: string | null;
  lastPaymentPeriodEndDate?: string | null;
  lastPaymentAmount?: number | null;
  lastPaymentMethod?: string | null;
  lastPaymentType?: string | null;
  lastPaymentStatus?: string | null;
  daysSinceLastPayment?: number | null;
}

export default function RentalStatistics() {
  const { toast } = useToast();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<PatientStatistic>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Filter states
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>('ALL');
  const [dateFromFilter, setDateFromFilter] = useState<string>('');
  const [dateToFilter, setDateToFilter] = useState<string>('');
  const [daysFilter, setDaysFilter] = useState<string>('ALL');
  const [employeeFilter, setEmployeeFilter] = useState<string>('ALL');
  const [doctorFilter, setDoctorFilter] = useState<string>('ALL');
  const [monthFilter, setMonthFilter] = useState<string>('ALL');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  // Prevent losing focus when editing - use callback to update editData
  const handleEditDataChange = React.useCallback((field: keyof PatientStatistic, value: any) => {
    setEditData(prev => ({ ...prev, [field]: value }));
  }, []);

  // Fetch rental statistics with all relationships
  const { data: statisticsData, isLoading } = useQuery({
    queryKey: ['rental-statistics-table'],
    queryFn: async () => {
      const response = await fetch('/api/rentals/comprehensive');
      if (!response.ok) throw new Error('Failed to fetch statistics');
      const data = await response.json();

      // Transform data to include all relationships
      return Array.isArray(data) ? data.map((rental: any) => {
        // Calculate days until/since period end date
        // Negative = period not ended yet (days remaining, green)
        // Positive = days since period ended (overdue, red/orange)
        let daysSinceLastPayment: number | null = null;
        if (rental.lastPaymentPeriodEndDate) {
          const periodEndDate = new Date(rental.lastPaymentPeriodEndDate);
          const today = new Date();

          // Calculate days from today to period end date
          // If period end is in future: negative (days remaining)
          // If period end is in past: positive (days overdue)
          const diffTime = today.getTime() - periodEndDate.getTime();
          daysSinceLastPayment = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        }

        // Auto-calculate Titration Reminder: 3 months from last rental payment end date
        let calculatedTitrationDate = rental.titrationReminderDate || '';
        if (!rental.titrationReminderDate && rental.lastPaymentPeriodEndDate) {
          const periodEndDate = new Date(rental.lastPaymentPeriodEndDate);
          periodEndDate.setMonth(periodEndDate.getMonth() + 3);
          calculatedTitrationDate = periodEndDate.toISOString().split('T')[0];
        }

        return {
          id: rental.id,
          patientId: rental.patient?.id || undefined,
          patientName: rental.patient
            ? `${rental.patient.firstName} ${rental.patient.lastName}`
            : rental.company?.companyName || 'N/A',
          patientCode: rental.patient?.patientCode || undefined,
          patientPhone: rental.patient?.telephone || '-',
          patientPhoneTwo: rental.patient?.telephoneTwo || null,
          doctorName: rental.patient?.doctor?.user
            ? `Dr. ${rental.patient.doctor.user.firstName} ${rental.patient.doctor.user.lastName}`
            : '-',
          rentalCode: rental.rentalCode || '-',
          deviceId: rental.medicalDevice?.id || undefined,
          deviceName: rental.medicalDevice?.name || '-',
          deviceCode: rental.medicalDevice?.deviceCode || '-',
          employeeName: rental.assignedTo
            ? `${rental.assignedTo.firstName} ${rental.assignedTo.lastName}`
            : '-',
          startDate: rental.startDate,
          endDate: rental.endDate,
          monthlyRate: rental.monthlyRate,
          status: rental.status,
          alertDate: rental.alertDate || '',
          titrationReminderDate: calculatedTitrationDate,
          appointmentDate: rental.appointmentDate || '',
          notes: rental.notes || '',
          lastPaymentDate: rental.lastPaymentDate,
          lastPaymentPeriodStartDate: rental.lastPaymentPeriodStartDate,
          lastPaymentPeriodEndDate: rental.lastPaymentPeriodEndDate,
          lastPaymentAmount: rental.lastPaymentAmount,
          lastPaymentMethod: rental.lastPaymentMethod,
          lastPaymentType: rental.lastPaymentType,
          lastPaymentStatus: rental.lastPaymentStatus,
          daysSinceLastPayment: daysSinceLastPayment,
        };
      }) : [];
    },
  });

  // Update mutation for notes and all date fields
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<PatientStatistic> }) => {
      const response = await fetch(`/api/rentals/comprehensive/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          alertDate: data.alertDate,
          titrationReminderDate: data.titrationReminderDate,
          appointmentDate: data.appointmentDate,
          notes: data.notes,
        }),
      });
      if (!response.ok) throw new Error('Failed to update');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rental-statistics-table'] });
      setEditingId(null);
      setEditData({});
      toast({ title: 'Succès', description: 'Informations mises à jour' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    },
  });

  const statistics = statisticsData || [];

  // Filter statistics with all filters
  const filteredStats = statistics.filter((stat: PatientStatistic) => {
    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      const matchesSearch = (
        stat.patientName?.toLowerCase().includes(search) ||
        stat.rentalCode?.toLowerCase().includes(search) ||
        stat.deviceName?.toLowerCase().includes(search) ||
        stat.employeeName?.toLowerCase().includes(search) ||
        stat.doctorName?.toLowerCase().includes(search)
      );
      if (!matchesSearch) return false;
    }

    // Status filter
    if (statusFilter !== 'ALL' && stat.status !== statusFilter) {
      return false;
    }

    // Payment status filter
    if (paymentStatusFilter !== 'ALL' && stat.lastPaymentStatus !== paymentStatusFilter) {
      return false;
    }

    // Date range filter (start date)
    if (dateFromFilter && stat.startDate) {
      if (new Date(stat.startDate) < new Date(dateFromFilter)) {
        return false;
      }
    }

    if (dateToFilter && stat.startDate) {
      if (new Date(stat.startDate) > new Date(dateToFilter)) {
        return false;
      }
    }

    // Days filter
    if (daysFilter !== 'ALL' && stat.daysSinceLastPayment !== null && stat.daysSinceLastPayment !== undefined) {
      if (daysFilter === 'OVERDUE' && stat.daysSinceLastPayment < 0) return false;
      if (daysFilter === 'DUE_SOON' && (stat.daysSinceLastPayment < 0 || stat.daysSinceLastPayment > 15)) return false;
      if (daysFilter === 'ON_TIME' && stat.daysSinceLastPayment >= 0) return false;
    }

    // Employee filter
    if (employeeFilter !== 'ALL' && stat.employeeName !== employeeFilter) {
      return false;
    }

    // Doctor filter
    if (doctorFilter !== 'ALL' && stat.doctorName !== doctorFilter) {
      return false;
    }

    // Month filter
    if (monthFilter !== 'ALL' && stat.startDate) {
      const startDate = new Date(stat.startDate);
      const month = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}`;
      if (month !== monthFilter) {
        return false;
      }
    }

    return true;
  });

  // Pagination calculations
  const totalPages = Math.ceil(filteredStats.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedStats = filteredStats.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, paymentStatusFilter, dateFromFilter, dateToFilter, daysFilter, employeeFilter, doctorFilter, monthFilter]);

  // Get unique employees, doctors, and months for filter dropdowns
  const uniqueEmployees = useMemo(() => {
    const employees = new Set<string>();
    statistics.forEach((stat: PatientStatistic) => {
      if (stat.employeeName && stat.employeeName !== '-') {
        employees.add(stat.employeeName);
      }
    });
    return Array.from(employees).sort();
  }, [statistics]);

  const uniqueDoctors = useMemo(() => {
    const doctors = new Set<string>();
    statistics.forEach((stat: PatientStatistic) => {
      if (stat.doctorName && stat.doctorName !== '-') {
        doctors.add(stat.doctorName);
      }
    });
    return Array.from(doctors).sort();
  }, [statistics]);

  const uniqueMonths = useMemo(() => {
    const months = new Set<string>();
    statistics.forEach((stat: PatientStatistic) => {
      if (stat.startDate) {
        const date = new Date(stat.startDate);
        const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        months.add(month);
      }
    });
    return Array.from(months).sort().reverse(); // Most recent first
  }, [statistics]);

  const handleEdit = (stat: PatientStatistic) => {
    setEditingId(stat.id);
    setEditData(stat);
  };

  const handleSaveEdit = () => {
    if (!editingId) return;
    updateMutation.mutate({ id: editingId, data: editData });
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditData({});
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; color: string }> = {
      ACTIVE: { label: 'Actif', color: 'bg-green-100 text-green-700' },
      PENDING: { label: 'En attente', color: 'bg-yellow-100 text-yellow-700' },
      COMPLETED: { label: 'Terminé', color: 'bg-gray-100 text-gray-700' },
      CANCELLED: { label: 'Annulé', color: 'bg-red-100 text-red-700' },
    };
    const info = statusMap[status] || statusMap.PENDING;
    return <Badge className={info.color}>{info.label}</Badge>;
  };

  const getPaymentMethodLabel = (method: string) => {
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

  const tableContent = useMemo(() => (
    <>

      {/* Table */}
      <div className="rounded-lg border-2 border-blue-200 overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="min-w-max w-full">
            <thead className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Patient
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <Stethoscope className="h-4 w-4" />
                    Médecin
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase whitespace-nowrap">Location</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Appareil
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Employé
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase whitespace-nowrap">Dates</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Jours depuis paiement
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase whitespace-nowrap">Période Paiement</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase whitespace-nowrap">Montant</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase whitespace-nowrap">Méthode Paiement</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase whitespace-nowrap">Tarif Mensuel</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase whitespace-nowrap">Statut</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <Bell className="h-4 w-4" />
                    Date Rappel
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Rappel Titration
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Rendez-vous
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase whitespace-nowrap">Notes</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {paginatedStats.length === 0 ? (
                <tr>
                  <td colSpan={17} className="px-4 py-12 text-center text-slate-500">
                    Aucune location trouvée
                  </td>
                </tr>
              ) : (
                paginatedStats.map((stat: PatientStatistic) => {
                  const isEditing = editingId === stat.id;

                  return (
                    <tr
                      key={stat.id}
                      className={`hover:bg-blue-50 transition-colors ${
                        isEditing ? 'bg-blue-100 border-2 border-blue-300' : ''
                      }`}
                    >
                      {/* Patient */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm">
                          {stat.patientId ? (
                            <div
                              className="font-medium text-blue-600 hover:text-blue-800 hover:underline cursor-pointer transition-colors"
                              onClick={() => router.push(`/roles/admin/renseignement/patient/${stat.patientId}`)}
                            >
                              {stat.patientName}
                            </div>
                          ) : (
                            <div className="font-medium text-slate-900">{stat.patientName}</div>
                          )}
                          {stat.patientCode && (
                            <div
                              className="text-xs text-slate-500 font-mono cursor-pointer hover:text-blue-600 transition-colors"
                              onClick={() => router.push(`/roles/admin/renseignement/patient/${stat.patientId}`)}
                            >
                              {stat.patientCode}
                            </div>
                          )}
                          {stat.patientPhone !== '-' && (
                            <div className="text-xs text-blue-600">Tel: {stat.patientPhone}</div>
                          )}
                          {stat.patientPhoneTwo && (
                            <div className="text-xs text-green-600">Tel 2: {stat.patientPhoneTwo}</div>
                          )}
                        </div>
                      </td>

                      {/* Doctor */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm text-slate-700">{stat.doctorName}</div>
                      </td>

                      {/* Rental */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Badge variant="outline" className="text-xs">
                          {stat.rentalCode}
                        </Badge>
                      </td>

                      {/* Device */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm">
                          {stat.deviceId ? (
                            <div
                              className="font-medium text-blue-600 hover:text-blue-800 hover:underline cursor-pointer transition-colors"
                              onClick={() => router.push(`/roles/admin/appareils/medical-device/${stat.deviceId}`)}
                            >
                              {stat.deviceName}
                            </div>
                          ) : (
                            <div className="font-medium text-slate-900">{stat.deviceName}</div>
                          )}
                          {stat.deviceCode && stat.deviceCode !== '-' && (
                            <div
                              className="text-xs text-slate-500 font-mono cursor-pointer hover:text-blue-600 transition-colors"
                              onClick={() => router.push(`/roles/admin/appareils/medical-device/${stat.deviceId}`)}
                            >
                              {stat.deviceCode}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Employee */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm text-slate-700">{stat.employeeName}</div>
                      </td>

                      {/* Dates */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-xs">
                          <div className="text-slate-600">
                            Début: {stat.startDate ? format(new Date(stat.startDate), 'dd/MM/yy', { locale: fr }) : '-'}
                          </div>
                        </div>
                      </td>

                      {/* Days Until/Since Period End */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-xs">
                          {stat.daysSinceLastPayment !== null && stat.daysSinceLastPayment !== undefined ? (
                            <Badge
                              className={`${
                                stat.daysSinceLastPayment < 0
                                  ? 'bg-green-100 text-green-700'
                                  : stat.daysSinceLastPayment >= 0 && stat.daysSinceLastPayment <= 15
                                  ? 'bg-orange-100 text-orange-700'
                                  : 'bg-red-100 text-red-700'
                              }`}
                            >
                              {stat.daysSinceLastPayment < 0
                                ? `Reste ${Math.abs(stat.daysSinceLastPayment)}j`
                                : stat.daysSinceLastPayment === 0
                                ? 'Aujourd\'hui'
                                : `Retard ${stat.daysSinceLastPayment}j`
                              }
                            </Badge>
                          ) : (
                            <span className="text-slate-400">Aucun paiement</span>
                          )}
                        </div>
                      </td>

                      {/* Payment Period (Start & End Dates with Status) */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-xs space-y-1">
                          {stat.lastPaymentPeriodStartDate && stat.lastPaymentPeriodEndDate ? (
                            <>
                              <div className="text-slate-600">
                                Début: {format(new Date(stat.lastPaymentPeriodStartDate), 'dd/MM/yy', { locale: fr })}
                              </div>
                              <div className="text-slate-600">
                                Fin: {format(new Date(stat.lastPaymentPeriodEndDate), 'dd/MM/yy', { locale: fr })}
                              </div>
                              {stat.lastPaymentStatus && (
                                <Badge
                                  variant="outline"
                                  className={`${
                                    stat.lastPaymentStatus === 'PAID'
                                      ? 'bg-green-50 text-green-700'
                                      : 'bg-yellow-50 text-yellow-700'
                                  }`}
                                >
                                  {stat.lastPaymentStatus === 'PAID' ? 'Payé' : stat.lastPaymentStatus}
                                </Badge>
                              )}
                            </>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </div>
                      </td>

                      {/* Payment Amount */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-xs">
                          {stat.lastPaymentAmount ? (
                            <span className="font-semibold text-green-700">
                              {Number(stat.lastPaymentAmount).toFixed(2)} DT
                            </span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </div>
                      </td>

                      {/* Payment Method */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-xs">
                          {stat.lastPaymentMethod ? (
                            <Badge variant="outline" className="bg-blue-50 text-blue-700">
                              {getPaymentMethodLabel(stat.lastPaymentMethod)}
                            </Badge>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </div>
                      </td>

                      {/* Monthly Rate */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-xs">
                          {stat.monthlyRate ? (
                            <span className="font-semibold text-purple-700">
                              {Number(stat.monthlyRate).toFixed(2)} DT
                            </span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {getStatusBadge(stat.status || 'PENDING')}
                      </td>

                      {/* Alert Date (DATE RAPPEL) */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {isEditing ? (
                          <Input
                            type="date"
                            value={editData.alertDate || ''}
                            onChange={(e) => handleEditDataChange('alertDate', e.target.value)}
                            className="text-xs"
                          />
                        ) : (
                          <div className="text-xs">
                            {stat.alertDate ? (
                              <Badge className="bg-orange-100 text-orange-700">
                                <Calendar className="h-3 w-3 mr-1" />
                                {format(new Date(stat.alertDate), 'dd/MM/yyyy', { locale: fr })}
                              </Badge>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Titration Reminder Date (DATE RAPPEL TITRATION) */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {isEditing ? (
                          <Input
                            type="date"
                            value={editData.titrationReminderDate || ''}
                            onChange={(e) => handleEditDataChange('titrationReminderDate', e.target.value)}
                            className="text-xs"
                          />
                        ) : (
                          <div className="text-xs">
                            {stat.titrationReminderDate ? (
                              <Badge className="bg-blue-100 text-blue-700">
                                <Calendar className="h-3 w-3 mr-1" />
                                {format(new Date(stat.titrationReminderDate), 'dd/MM/yyyy', { locale: fr })}
                              </Badge>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Appointment Date (RENDEZ-VOUS) */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {isEditing ? (
                          <Input
                            type="date"
                            value={editData.appointmentDate || ''}
                            onChange={(e) => handleEditDataChange('appointmentDate', e.target.value)}
                            className="text-xs"
                          />
                        ) : (
                          <div className="text-xs">
                            {stat.appointmentDate ? (
                              <Badge className="bg-green-100 text-green-700">
                                <Calendar className="h-3 w-3 mr-1" />
                                {format(new Date(stat.appointmentDate), 'dd/MM/yyyy', { locale: fr })}
                              </Badge>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Notes */}
                      <td className="px-4 py-3 align-top">
                        {isEditing ? (
                          <Textarea
                            value={editData.notes || ''}
                            onChange={(e) => handleEditDataChange('notes', e.target.value)}
                            placeholder="Ajouter des notes..."
                            className="text-xs min-h-[60px] w-64"
                          />
                        ) : (
                          <div className="text-xs text-slate-600 max-w-xs">
                            {stat.notes || <span className="text-slate-400 italic">Aucune note</span>}
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {isEditing ? (
                          <div className="flex items-center justify-center gap-2">
                            <Button
                              size="sm"
                              onClick={handleSaveEdit}
                              className="h-8 px-3 bg-blue-600 hover:bg-blue-700"
                            >
                              <Save className="h-3 w-3 mr-1" />
                              Sauvegarder
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={handleCancel}
                              className="h-8 px-3"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEdit(stat)}
                              className="h-8 px-3 hover:bg-blue-50 hover:border-blue-300"
                            >
                              <Edit2 className="h-3 w-3 mr-1" />
                              Éditer
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ), [paginatedStats, editingId, editData, handleEditDataChange, getStatusBadge, getPaymentMethodLabel]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const clearAllFilters = () => {
    setSearchTerm('');
    setStatusFilter('ALL');
    setPaymentStatusFilter('ALL');
    setDateFromFilter('');
    setDateToFilter('');
    setDaysFilter('ALL');
    setEmployeeFilter('ALL');
    setDoctorFilter('ALL');
    setMonthFilter('ALL');
  };

  const getMonthLabel = (monthString: string) => {
    const [year, month] = monthString.split('-');
    const monthNames = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
    return `${monthNames[parseInt(month) - 1]} ${year}`;
  };

  return (
    <>
      <div className="space-y-4">
        {/* Search Bar */}
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Rechercher par patient, location, appareil, employé ou médecin..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <Button
            onClick={() => setIsFullscreen(true)}
            variant="outline"
            className="whitespace-nowrap"
          >
            <Maximize2 className="h-4 w-4 mr-2" />
            Plein Écran
          </Button>
        </div>

        {/* Filter Panel */}
        <Card className="p-3 bg-blue-50 border-blue-200">
          <div className="flex items-center gap-2 mb-2">
            <Filter className="h-3 w-3 text-blue-600" />
            <h3 className="text-sm font-semibold text-blue-900">Filtres</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
              className="ml-auto text-blue-600 hover:text-blue-700 h-7 px-2 text-xs"
            >
              <XCircle className="h-3 w-3 mr-1" />
              Réinitialiser
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-8 gap-2">
            {/* Rental Status Filter */}
            <div>
              <label className="text-[10px] font-medium text-slate-700 mb-0.5 block">Statut Location</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="bg-white h-8 text-xs">
                  <SelectValue placeholder="Tous" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Tous</SelectItem>
                  <SelectItem value="ACTIVE">Actif</SelectItem>
                  <SelectItem value="PENDING">En attente</SelectItem>
                  <SelectItem value="COMPLETED">Terminé</SelectItem>
                  <SelectItem value="CANCELLED">Annulé</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Payment Status Filter */}
            <div>
              <label className="text-[10px] font-medium text-slate-700 mb-0.5 block">Statut Paiement</label>
              <Select value={paymentStatusFilter} onValueChange={setPaymentStatusFilter}>
                <SelectTrigger className="bg-white h-8 text-xs">
                  <SelectValue placeholder="Tous" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Tous</SelectItem>
                  <SelectItem value="PAID">Payé</SelectItem>
                  <SelectItem value="PENDING">En attente</SelectItem>
                  <SelectItem value="OVERDUE">En retard</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Days Filter */}
            <div>
              <label className="text-[10px] font-medium text-slate-700 mb-0.5 block">État Paiement</label>
              <Select value={daysFilter} onValueChange={setDaysFilter}>
                <SelectTrigger className="bg-white h-8 text-xs">
                  <SelectValue placeholder="Tous" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Tous</SelectItem>
                  <SelectItem value="ON_TIME">À jour</SelectItem>
                  <SelectItem value="DUE_SOON">Échéance proche</SelectItem>
                  <SelectItem value="OVERDUE">En retard</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Employee Filter */}
            <div>
              <label className="text-[10px] font-medium text-slate-700 mb-0.5 block">Employé</label>
              <Select value={employeeFilter} onValueChange={setEmployeeFilter}>
                <SelectTrigger className="bg-white h-8 text-xs">
                  <SelectValue placeholder="Tous" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Tous</SelectItem>
                  {uniqueEmployees.map((employee) => (
                    <SelectItem key={employee} value={employee}>
                      {employee}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Doctor Filter */}
            <div>
              <label className="text-[10px] font-medium text-slate-700 mb-0.5 block">Médecin</label>
              <Select value={doctorFilter} onValueChange={setDoctorFilter}>
                <SelectTrigger className="bg-white h-8 text-xs">
                  <SelectValue placeholder="Tous" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Tous</SelectItem>
                  {uniqueDoctors.map((doctor) => (
                    <SelectItem key={doctor} value={doctor}>
                      {doctor}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Month Filter */}
            <div>
              <label className="text-[10px] font-medium text-slate-700 mb-0.5 block">Mois</label>
              <Select value={monthFilter} onValueChange={setMonthFilter}>
                <SelectTrigger className="bg-white h-8 text-xs">
                  <SelectValue placeholder="Tous" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Tous</SelectItem>
                  {uniqueMonths.map((month) => (
                    <SelectItem key={month} value={month}>
                      {getMonthLabel(month)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date From Filter */}
            <div>
              <label className="text-[10px] font-medium text-slate-700 mb-0.5 block">Date Début</label>
              <Input
                type="date"
                value={dateFromFilter}
                onChange={(e) => setDateFromFilter(e.target.value)}
                className="bg-white h-8 text-xs"
              />
            </div>

            {/* Date To Filter */}
            <div>
              <label className="text-[10px] font-medium text-slate-700 mb-0.5 block">Date Fin</label>
              <Input
                type="date"
                value={dateToFilter}
                onChange={(e) => setDateToFilter(e.target.value)}
                className="bg-white h-8 text-xs"
              />
            </div>
          </div>
        </Card>

        {/* Statistics Count and Pagination Info */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
              <span className="text-slate-600">
                <strong>{filteredStats.length}</strong> location(s) trouvée(s)
              </span>
            </div>
            {totalPages > 1 && (
              <span className="text-slate-500 text-xs">
                Page {currentPage} sur {totalPages} • Affichage {startIndex + 1}-{Math.min(endIndex, filteredStats.length)} sur {filteredStats.length}
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

        {tableContent}
      </div>

      {/* Fullscreen Modal */}
      {isFullscreen && (
        <div className="fixed inset-0 z-50 bg-white overflow-auto">
          <div className="min-h-screen p-8">
            {/* Fullscreen Search and Exit */}
            <div className="flex items-center gap-4 mb-6 sticky top-0 bg-white py-4 border-b-2 border-blue-200 z-10">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Rechercher par patient, location, appareil, employé ou médecin..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Button
                onClick={() => setIsFullscreen(false)}
                variant="outline"
                className="whitespace-nowrap"
              >
                <Minimize2 className="h-4 w-4 mr-2" />
                Quitter Plein Écran
              </Button>
            </div>

            {/* Statistics Count and Pagination Info */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                  <span className="text-slate-600">
                    <strong>{filteredStats.length}</strong> location(s) trouvée(s)
                  </span>
                </div>
                {totalPages > 1 && (
                  <span className="text-slate-500 text-xs">
                    Page {currentPage} sur {totalPages} • Affichage {startIndex + 1}-{Math.min(endIndex, filteredStats.length)} sur {filteredStats.length}
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

            {tableContent}
          </div>
        </div>
      )}
    </>
  );
}
