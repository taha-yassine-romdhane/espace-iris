import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus,
  Save,
  X,
  Trash2,
  Edit2,
  Search,
  Filter,
  SortAsc,
  SortDesc,
  CheckCircle,
  Clock,
  Shield,
  User,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { PatientSelectorDialog } from "@/components/dialogs/PatientSelectorDialog";
import { MedicalDeviceSelectorDialog } from "@/components/dialogs/MedicalDeviceSelectorDialog";
import { EmployeeSelectorDialog } from "@/components/dialogs/EmployeeSelectorDialog";

interface Rental {
  id?: string;
  rentalCode?: string;
  patientId: string;
  medicalDeviceId: string;
  startDate: string;
  endDate?: string | null;
  status: string;
  createdById?: string;
  assignedToId?: string;
  patient?: { id: string; firstName: string; lastName: string; patientCode?: string; cnamId?: string; telephone?: string };
  medicalDevice?: { id: string; name: string; deviceCode: string; serialNumber?: string; rentalPrice: number };
  createdBy?: { id: string; firstName: string; lastName: string };
  assignedTo?: { id: string; firstName: string; lastName: string };
  configuration?: {
    rentalRate: number;
    billingCycle: 'DAILY' | 'MONTHLY' | 'WEEKLY';
    isGlobalOpenEnded: boolean;
    cnamEligible: boolean;
    deliveryNotes?: string;
    internalNotes?: string;
  };
}

export default function ComprehensiveRentalsTable() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: session } = useSession();

  // State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newRow, setNewRow] = useState<Partial<Rental> | null>(null);
  const [editData, setEditData] = useState<Partial<Rental>>({});

  // Search and Filter State
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [cnamFilter, setCnamFilter] = useState<string>("all");
  const [deviceFilter, setDeviceFilter] = useState<string>("all");
  const [createdByFilter, setCreatedByFilter] = useState<string>("all");
  const [assignedToFilter, setAssignedToFilter] = useState<string>("all");
  const [dateRangeFilter, setDateRangeFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<string>("startDate");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);

  // Fetch rentals with complete data
  const { data: rentalsData, isLoading } = useQuery({
    queryKey: ['rentals-comprehensive'],
    queryFn: async () => {
      const response = await fetch('/api/rentals/comprehensive');
      if (!response.ok) throw new Error('Failed to fetch rentals');
      const data = await response.json();
      return Array.isArray(data) ? data : (data.rentals || []);
    },
  });

  // Fetch patients
  const { data: patientsData } = useQuery({
    queryKey: ['patients-for-rentals'],
    queryFn: async () => {
      const response = await fetch('/api/renseignements/patients');
      const data = await response.json();
      return data.patients || [];
    },
  });

  // Fetch medical devices
  const { data: devicesData } = useQuery({
    queryKey: ['medical-devices-for-rentals'],
    queryFn: async () => {
      const response = await fetch('/api/medical-devices');
      if (!response.ok) throw new Error('Failed to fetch devices');
      const data = await response.json();
      return data.devices || data || [];
    },
  });

  // Fetch users (employees)
  const { data: usersData } = useQuery({
    queryKey: ['users-for-rentals'],
    queryFn: async () => {
      const response = await fetch('/api/users');
      if (!response.ok) throw new Error('Failed to fetch users');
      const data = await response.json();
      return data.users || data || [];
    },
  });

  const rentals = rentalsData || [];
  const patients = patientsData || [];
  const devices = devicesData || [];
  const users = usersData || [];

  // Extract unique devices from rental data (by device name)
  const uniqueDevices = Array.from(
    new Map(
      rentals
        .filter((r: Rental) => r.medicalDevice?.name)
        .map((r: Rental) => [r.medicalDevice!.name, r.medicalDevice!.name])
    ).values()
  ).sort();

  // Extract unique users from rental data (createdBy and assignedTo)
  const uniqueCreatedByUsers = Array.from(
    new Map(
      rentals
        .filter((r: Rental) => r.createdBy)
        .map((r: Rental) => [r.createdBy!.id, r.createdBy])
    ).values()
  );

  const uniqueAssignedToUsers = Array.from(
    new Map(
      rentals
        .filter((r: Rental) => r.assignedTo)
        .map((r: Rental) => [r.assignedTo!.id, r.assignedTo])
    ).values()
  );

  // Filter and sort rentals
  const filteredRentals = rentals
    .filter((rental: Rental) => {
      // Search filter
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const patientName = rental.patient
          ? `${rental.patient.firstName} ${rental.patient.lastName}`.toLowerCase()
          : '';
        const deviceName = rental.medicalDevice?.name?.toLowerCase() || '';
        const rentalCode = rental.rentalCode?.toLowerCase() || '';
        const deviceCode = rental.medicalDevice?.deviceCode || ''; // Case-sensitive
        const patientCode = rental.patient?.patientCode || ''; // Case-sensitive

        if (!patientName.includes(search) && !deviceName.includes(search) && !rentalCode.includes(search) && !deviceCode.includes(searchTerm) && !patientCode.includes(searchTerm)) {
          return false;
        }
      }

      // Status filter
      if (statusFilter !== 'all' && rental.status !== statusFilter) {
        return false;
      }

      // CNAM filter
      if (cnamFilter !== 'all') {
        if (cnamFilter === 'eligible' && !rental.configuration?.cnamEligible) return false;
        if (cnamFilter === 'not_eligible' && rental.configuration?.cnamEligible) return false;
      }

      // Device filter (by device name)
      if (deviceFilter !== 'all' && rental.medicalDevice?.name !== deviceFilter) {
        return false;
      }

      // Created by filter
      if (createdByFilter !== 'all' && rental.createdById !== createdByFilter) {
        return false;
      }

      // Assigned to filter
      if (assignedToFilter !== 'all' && rental.assignedToId !== assignedToFilter) {
        return false;
      }

      // Date range filter
      if (dateRangeFilter !== 'all') {
        const now = new Date();
        const startDate = new Date(rental.startDate);

        switch (dateRangeFilter) {
          case 'today':
            if (startDate.toDateString() !== now.toDateString()) return false;
            break;
          case 'this_week':
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            if (startDate < weekAgo) return false;
            break;
          case 'this_month':
            if (startDate.getMonth() !== now.getMonth() || startDate.getFullYear() !== now.getFullYear()) return false;
            break;
          case 'this_year':
            if (startDate.getFullYear() !== now.getFullYear()) return false;
            break;
        }
      }

      return true;
    })
    .sort((a: Rental, b: Rental) => {
      let aValue: any, bValue: any;

      switch (sortField) {
        case 'rentalCode':
          aValue = a.rentalCode || '';
          bValue = b.rentalCode || '';
          break;
        case 'client':
          aValue = a.patient ? `${a.patient.firstName} ${a.patient.lastName}` : '';
          bValue = b.patient ? `${b.patient.firstName} ${b.patient.lastName}` : '';
          break;
        case 'startDate':
          aValue = new Date(a.startDate).getTime();
          bValue = new Date(b.startDate).getTime();
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        case 'device':
          aValue = a.medicalDevice?.name || '';
          bValue = b.medicalDevice?.name || '';
          break;
        default:
          aValue = a.id;
          bValue = b.id;
      }

      if (typeof aValue === 'string') {
        return sortOrder === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }
      return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
    });

  // Pagination calculations
  const totalItems = filteredRentals.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedRentals = filteredRentals.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, cnamFilter, deviceFilter, createdByFilter, assignedToFilter, dateRangeFilter]);

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (data: Partial<Rental>) => {
      const response = await fetch('/api/rentals/comprehensive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create rental');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rentals-comprehensive'] });
      queryClient.invalidateQueries({ queryKey: ['rental-statistics'] });
      setNewRow(null);
      toast({ title: "Succès", description: "Location créée avec succès" });
    },
    onError: (error: Error) => {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Rental> }) => {
      const response = await fetch(`/api/rentals/comprehensive/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update rental');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rentals-comprehensive'] });
      queryClient.invalidateQueries({ queryKey: ['rental-statistics'] });
      setEditingId(null);
      setEditData({});
      toast({ title: "Succès", description: "Location mise à jour" });
    },
    onError: (error: Error) => {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/rentals/comprehensive/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete rental');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rentals-comprehensive'] });
      queryClient.invalidateQueries({ queryKey: ['rental-statistics'] });
      toast({ title: "Succès", description: "Location supprimée" });
    },
    onError: (error: Error) => {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    },
  });

  // Handlers
  const handleAddNew = () => {
    setNewRow({
      patientId: '',
      medicalDeviceId: '',
      status: 'PENDING',
      startDate: new Date().toISOString().split('T')[0],
      configuration: {
        rentalRate: 0,
        billingCycle: 'DAILY',
        cnamEligible: false,
        isGlobalOpenEnded: false,
      },
    });
  };

  const handleSaveNew = () => {
    if (!newRow) return;
    createMutation.mutate(newRow);
  };

  const handleEdit = (rental: Rental) => {
    setEditingId(rental.id!);
    setEditData(rental);
  };

  const handleSaveEdit = () => {
    if (!editingId) return;
    updateMutation.mutate({ id: editingId, data: editData });
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette location ?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  // Status badge renderer
  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { color: string; icon: any; label: string }> = {
      ACTIVE: { color: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle, label: 'Actif' },
      PENDING: { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: Clock, label: 'En attente' },
      PAUSED: { color: 'bg-orange-100 text-orange-800 border-orange-200', icon: Clock, label: 'Suspendu' },
      COMPLETED: { color: 'bg-blue-100 text-blue-800 border-blue-200', icon: CheckCircle, label: 'Terminé' },
      CANCELLED: { color: 'bg-red-100 text-red-800 border-red-200', icon: X, label: 'Annulé' },
    };

    const config = statusConfig[status] || statusConfig.PENDING;
    const Icon = config.icon;

    return (
      <Badge variant="outline" className={`${config.color} flex items-center gap-1`}>
        <Icon className="h-3 w-3" />
        {config.label}
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
      {/* Toolbar */}
      <div className="flex flex-col gap-4 bg-white p-4 rounded-lg shadow-sm border">
        {/* Search and Action Button */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Rechercher par client, appareil, code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button onClick={handleAddNew} className="bg-blue-600 hover:bg-blue-700 whitespace-nowrap">
            <Plus className="h-4 w-4 mr-2" />
            Nouvelle Location
          </Button>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              <SelectItem value="ACTIVE">Actif</SelectItem>
              <SelectItem value="PENDING">En attente</SelectItem>
              <SelectItem value="PAUSED">Suspendu</SelectItem>
              <SelectItem value="COMPLETED">Terminé</SelectItem>
              <SelectItem value="CANCELLED">Annulé</SelectItem>
            </SelectContent>
          </Select>

          <Select value={cnamFilter} onValueChange={setCnamFilter}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="CNAM" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous CNAM</SelectItem>
              <SelectItem value="eligible">Éligible</SelectItem>
              <SelectItem value="not_eligible">Non éligible</SelectItem>
            </SelectContent>
          </Select>

          <Select value={deviceFilter} onValueChange={setDeviceFilter}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Appareil" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les appareils</SelectItem>
              {uniqueDevices.map((deviceName) => (
                <SelectItem key={deviceName as string} value={deviceName as string}>
                  {deviceName as string}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={createdByFilter} onValueChange={setCreatedByFilter}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Créé par" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              {uniqueCreatedByUsers.map((user: any) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.firstName} {user.lastName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={assignedToFilter} onValueChange={setAssignedToFilter}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Assigné à" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              {uniqueAssignedToUsers.map((user: any) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.firstName} {user.lastName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={dateRangeFilter} onValueChange={setDateRangeFilter}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Période" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les périodes</SelectItem>
              <SelectItem value="today">Aujourd'hui</SelectItem>
              <SelectItem value="this_week">Cette semaine</SelectItem>
              <SelectItem value="this_month">Ce mois</SelectItem>
              <SelectItem value="this_year">Cette année</SelectItem>
            </SelectContent>
          </Select>

          <Button
            onClick={() => {
              setStatusFilter("all");
              setCnamFilter("all");
              setDeviceFilter("all");
              setCreatedByFilter("all");
              setAssignedToFilter("all");
              setDateRangeFilter("all");
              setSearchTerm("");
            }}
            variant="outline"
            className="w-full"
          >
            <Filter className="h-4 w-4 mr-2" />
            Réinitialiser
          </Button>
        </div>
      </div>

      {/* Pagination Controls - Top */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border border-slate-200 rounded-lg shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-600">
            Affichage de {startIndex + 1} à {Math.min(endIndex, totalItems)} sur {totalItems} résultats
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
              {totalPages <= 5 ? (
                // Show all pages if 5 or less
                Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <Button
                    key={page}
                    variant={currentPage === page ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(page)}
                    className="h-9 w-9 p-0"
                  >
                    {page}
                  </Button>
                ))
              ) : (
                // Show smart pagination for many pages
                <>
                  <Button
                    variant={currentPage === 1 ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(1)}
                    className="h-9 w-9 p-0"
                  >
                    1
                  </Button>

                  {currentPage > 3 && <span className="px-2">...</span>}

                  {currentPage > 2 && currentPage < totalPages - 1 && (
                    <>
                      {currentPage > 3 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(currentPage - 1)}
                          className="h-9 w-9 p-0"
                        >
                          {currentPage - 1}
                        </Button>
                      )}
                      <Button
                        variant="default"
                        size="sm"
                        className="h-9 w-9 p-0"
                      >
                        {currentPage}
                      </Button>
                      {currentPage < totalPages - 2 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(currentPage + 1)}
                          className="h-9 w-9 p-0"
                        >
                          {currentPage + 1}
                        </Button>
                      )}
                    </>
                  )}

                  {currentPage < totalPages - 2 && <span className="px-2">...</span>}

                  <Button
                    variant={currentPage === totalPages ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(totalPages)}
                    className="h-9 w-9 p-0"
                  >
                    {totalPages}
                  </Button>
                </>
              )}
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

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm border overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left">
                <button
                  onClick={() => handleSort('rentalCode')}
                  className="flex items-center gap-1 text-xs font-semibold text-slate-700 hover:text-blue-600"
                >
                  Code
                  {sortField === 'rentalCode' && (
                    sortOrder === 'asc' ? <SortAsc className="h-3 w-3" /> : <SortDesc className="h-3 w-3" />
                  )}
                </button>
              </th>
              <th className="px-4 py-3 text-left">
                <button
                  onClick={() => handleSort('client')}
                  className="flex items-center gap-1 text-xs font-semibold text-slate-700 hover:text-blue-600"
                >
                  Client
                  {sortField === 'client' && (
                    sortOrder === 'asc' ? <SortAsc className="h-3 w-3" /> : <SortDesc className="h-3 w-3" />
                  )}
                </button>
              </th>
              <th className="px-4 py-3 text-left">
                <button
                  onClick={() => handleSort('device')}
                  className="flex items-center gap-1 text-xs font-semibold text-slate-700 hover:text-blue-600"
                >
                  Appareil
                  {sortField === 'device' && (
                    sortOrder === 'asc' ? <SortAsc className="h-3 w-3" /> : <SortDesc className="h-3 w-3" />
                  )}
                </button>
              </th>
              <th className="px-4 py-3 text-left">
                <button
                  onClick={() => handleSort('startDate')}
                  className="flex items-center gap-1 text-xs font-semibold text-slate-700 hover:text-blue-600"
                >
                  Dates
                  {sortField === 'startDate' && (
                    sortOrder === 'asc' ? <SortAsc className="h-3 w-3" /> : <SortDesc className="h-3 w-3" />
                  )}
                </button>
              </th>
              <th className="px-4 py-3 text-left">
                <button
                  onClick={() => handleSort('status')}
                  className="flex items-center gap-1 text-xs font-semibold text-slate-700 hover:text-blue-600"
                >
                  Statut
                  {sortField === 'status' && (
                    sortOrder === 'asc' ? <SortAsc className="h-3 w-3" /> : <SortDesc className="h-3 w-3" />
                  )}
                </button>
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Tarif</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Flags</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Créé par</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Assigné à</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {/* New Row */}
            {newRow && (
              <NewRowComponent
                data={newRow}
                onChange={setNewRow}
                onSave={handleSaveNew}
                onCancel={() => setNewRow(null)}
                patients={patients}
                devices={devices}
                users={users}
              />
            )}

            {/* Existing Rows */}
            {paginatedRentals.map((rental: Rental) => (
              editingId === rental.id ? (
                <EditRowComponent
                  key={rental.id}
                  data={editData}
                  onChange={setEditData}
                  onSave={handleSaveEdit}
                  onCancel={() => {
                    setEditingId(null);
                    setEditData({});
                  }}
                  patients={patients}
                  devices={devices}
                  users={users}
                />
              ) : (
                <ViewRowComponent
                  key={rental.id}
                  rental={rental}
                  onEdit={() => handleEdit(rental)}
                  onDelete={() => handleDelete(rental.id!)}
                  getStatusBadge={getStatusBadge}
                />
              )
            ))}

            {filteredRentals.length === 0 && !newRow && (
              <tr>
                <td colSpan={9} className="px-4 py-12 text-center text-slate-500">
                  Aucune location trouvée. Cliquez sur "Nouvelle Location" pour commencer.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// View Row Component
function ViewRowComponent({ rental, onEdit, onDelete, getStatusBadge }: any) {
  const router = useRouter();
  const patientName = rental.patient
    ? `${rental.patient.firstName} ${rental.patient.lastName}`
    : 'N/A';

  return (
    <tr className="border-b hover:bg-slate-50 transition-colors">
      <td className="px-4 py-3">
        <Badge variant="outline" className="text-xs font-mono bg-indigo-50 text-indigo-700 border-indigo-200">
          {rental.rentalCode || 'N/A'}
        </Badge>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-slate-400" />
          <div>
            <div
              className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline cursor-pointer transition-colors"
              onClick={() => router.push(`/roles/admin/renseignement/patient/${rental.patient.id}`)}
            >
              {patientName}
            </div>
            {rental.patient?.patientCode && (
              <div
                className="text-xs text-slate-500 font-mono cursor-pointer hover:text-blue-600 transition-colors"
                onClick={() => router.push(`/roles/admin/renseignement/patient/${rental.patient.id}`)}
              >
                {rental.patient.patientCode}
              </div>
            )}
            {rental.patient?.cnamId && (
              <Badge variant="outline" className="text-xs mt-1">
                <Shield className="h-3 w-3 mr-1" />
                CNAM: {rental.patient.cnamId}
              </Badge>
            )}
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <div
          className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline cursor-pointer transition-colors"
          onClick={() => router.push(`/roles/admin/appareils/medical-device/${rental.medicalDevice?.id}`)}
        >
          {rental.medicalDevice?.name || 'N/A'}
        </div>
        <div
          className="text-xs text-slate-500 font-mono cursor-pointer hover:text-blue-600 transition-colors"
          onClick={() => router.push(`/roles/admin/appareils/medical-device/${rental.medicalDevice?.id}`)}
        >
          {rental.medicalDevice?.deviceCode || ''}
        </div>
        {rental.medicalDevice?.serialNumber && (
          <div className="text-xs text-slate-500 font-mono">
            SN: {rental.medicalDevice.serialNumber}
          </div>
        )}
      </td>
      <td className="px-4 py-3">
        <div className="text-xs text-slate-700">
          <div>Début: {format(new Date(rental.startDate), 'dd/MM/yyyy', { locale: fr })}</div>
          <div className="text-slate-500">
            Fin: {rental.endDate ? (
              new Date(rental.endDate).getFullYear() >= 2099 ? 'Ouvert' : format(new Date(rental.endDate), 'dd/MM/yyyy', { locale: fr })
            ) : 'Ouvert'}
          </div>
        </div>
      </td>
      <td className="px-4 py-3">{getStatusBadge(rental.status)}</td>
      <td className="px-4 py-3">
        {rental.configuration?.rentalRate ? (
          <div className="text-xs">
            <div className="font-medium">{rental.configuration.rentalRate} DT</div>
            <div className="text-slate-500">
              {rental.configuration.billingCycle === 'DAILY' && 'Par jour'}
              {rental.configuration.billingCycle === 'MONTHLY' && 'Par mois'}
              {rental.configuration.billingCycle === 'WEEKLY' && 'Par semaine'}
            </div>
          </div>
        ) : (
          <span className="text-xs text-slate-400">Non défini</span>
        )}
      </td>
      <td className="px-4 py-3">
        <div className="flex gap-1">
          {rental.configuration?.cnamEligible && (
            <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700">
              <Shield className="h-3 w-3" />
              CNAM
            </Badge>
          )}
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="text-xs text-slate-600">
          {rental.createdBy ? `${rental.createdBy.firstName} ${rental.createdBy.lastName}` : 'N/A'}
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="text-xs text-slate-600">
          {rental.assignedTo ? `${rental.assignedTo.firstName} ${rental.assignedTo.lastName}` : '-'}
        </div>
      </td>
      <td className="px-4 py-3 text-right">
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="outline" onClick={onEdit}>
            <Edit2 className="h-3 w-3" />
          </Button>
          <Button size="sm" variant="outline" onClick={onDelete} className="text-red-600 hover:bg-red-50">
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </td>
    </tr>
  );
}

// New/Edit Row Components would be similar but with input fields
// Due to length, I'll create them as separate components

function NewRowComponent({ data, onChange, onSave, onCancel, patients, devices, users }: any) {
  const { data: session } = useSession();

  const [selectedPatientName, setSelectedPatientName] = useState<string>(
    data.patientId
      ? patients.find((p: any) => p.id === data.patientId)
        ? `${patients.find((p: any) => p.id === data.patientId).firstName} ${patients.find((p: any) => p.id === data.patientId).lastName}`
        : ''
      : ''
  );

  const [selectedDeviceName, setSelectedDeviceName] = useState<string>(
    data.medicalDeviceId
      ? devices.find((d: any) => d.id === data.medicalDeviceId)?.name || ''
      : ''
  );

  const [selectedAssignedToName, setSelectedAssignedToName] = useState<string>(
    data.assignedToId
      ? users.find((u: any) => u.id === data.assignedToId)
        ? `${users.find((u: any) => u.id === data.assignedToId).firstName} ${users.find((u: any) => u.id === data.assignedToId).lastName}`
        : ''
      : ''
  );

  // Get current user name from session
  const currentUserName = session?.user?.name || 'Utilisateur actuel';

  return (
    <tr className="bg-green-50 border-b-2 border-green-200">
      <td className="px-4 py-3">
        <span className="text-xs text-slate-500">Auto</span>
      </td>
      <td className="px-4 py-3">
        <PatientSelectorDialog
          onSelect={(type, id, name) => {
            onChange({ ...data, patientId: id });
            setSelectedPatientName(name);
          }}
          selectedId={data.patientId}
          selectedName={selectedPatientName}
        />
      </td>
      <td className="px-4 py-3">
        <MedicalDeviceSelectorDialog
          onSelect={(id, name) => {
            onChange({ ...data, medicalDeviceId: id });
            setSelectedDeviceName(name);
          }}
          selectedId={data.medicalDeviceId}
          selectedName={selectedDeviceName}
          excludeRented={true}
        />
      </td>
      <td className="px-4 py-3">
        <div className="space-y-1">
          <Input
            type="date"
            value={data.startDate}
            onChange={(e) => onChange({ ...data, startDate: e.target.value })}
            className="text-xs"
          />
          <Input
            type="date"
            value={data.endDate || ''}
            onChange={(e) => onChange({ ...data, endDate: e.target.value })}
            className="text-xs"
            placeholder="Ouvert"
          />
        </div>
      </td>
      <td className="px-4 py-3">
        <Select
          value={data.status}
          onValueChange={(value) => onChange({ ...data, status: value })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="PENDING">En attente</SelectItem>
            <SelectItem value="ACTIVE">Actif</SelectItem>
            <SelectItem value="PAUSED">Suspendu</SelectItem>
            <SelectItem value="COMPLETED">Terminé</SelectItem>
            <SelectItem value="CANCELLED">Annulé</SelectItem>
          </SelectContent>
        </Select>
      </td>
      <td className="px-4 py-3">
        <div className="space-y-1">
          <Input
            type="number"
            value={data.configuration?.rentalRate || ''}
            onChange={(e) => onChange({
              ...data,
              configuration: { ...data.configuration, rentalRate: parseFloat(e.target.value) }
            })}
            placeholder="Tarif"
            className="text-xs"
          />
          <Select
            value={data.configuration?.billingCycle || 'DAILY'}
            onValueChange={(value) => onChange({
              ...data,
              configuration: { ...data.configuration, billingCycle: value }
            })}
          >
            <SelectTrigger className="text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="DAILY">Par jour</SelectItem>
              <SelectItem value="MONTHLY">Par mois</SelectItem>
              <SelectItem value="WEEKLY">Par semaine</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </td>
      <td className="px-4 py-3">
        <label className="flex items-center gap-1 text-xs">
          <Switch
            checked={data.configuration?.cnamEligible || false}
            onCheckedChange={(checked) => onChange({
              ...data,
              configuration: { ...data.configuration, cnamEligible: checked }
            })}
          />
          <span>CNAM</span>
        </label>
      </td>
      <td className="px-4 py-3">
        <div className="text-xs text-slate-600 bg-slate-50 px-3 py-2 rounded border border-slate-200">
          {currentUserName}
        </div>
      </td>
      <td className="px-4 py-3">
        <EmployeeSelectorDialog
          onSelect={(id, name) => {
            onChange({ ...data, assignedToId: id || undefined });
            setSelectedAssignedToName(name);
          }}
          selectedId={data.assignedToId}
          selectedName={selectedAssignedToName}
          placeholder="Non assigné"
          allowNone={true}
        />
      </td>
      <td className="px-4 py-3 text-right">
        <div className="flex justify-end gap-2">
          <Button size="sm" onClick={onSave} className="bg-green-600 hover:bg-green-700">
            <Save className="h-3 w-3" />
          </Button>
          <Button size="sm" variant="outline" onClick={onCancel}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      </td>
    </tr>
  );
}

function EditRowComponent({ data, onChange, onSave, onCancel, patients, devices, users }: any) {
  const [selectedPatientName, setSelectedPatientName] = useState<string>(
    data.patientId
      ? patients.find((p: any) => p.id === data.patientId)
        ? `${patients.find((p: any) => p.id === data.patientId).firstName} ${patients.find((p: any) => p.id === data.patientId).lastName}`
        : ''
      : ''
  );

  const [selectedDeviceName, setSelectedDeviceName] = useState<string>(
    data.medicalDeviceId
      ? devices.find((d: any) => d.id === data.medicalDeviceId)?.name || ''
      : ''
  );

  const [selectedAssignedToName, setSelectedAssignedToName] = useState<string>(
    data.assignedToId
      ? users.find((u: any) => u.id === data.assignedToId)
        ? `${users.find((u: any) => u.id === data.assignedToId).firstName} ${users.find((u: any) => u.id === data.assignedToId).lastName}`
        : ''
      : ''
  );

  // Get the creator name from the data (already set when rental was created)
  const createdByName = data.createdBy
    ? `${data.createdBy.firstName} ${data.createdBy.lastName}`
    : users.find((u: any) => u.id === data.createdById)
    ? `${users.find((u: any) => u.id === data.createdById).firstName} ${users.find((u: any) => u.id === data.createdById).lastName}`
    : 'N/A';

  return (
    <tr className="bg-blue-50 border-b-2 border-blue-200">
      <td className="px-4 py-3">
        <Badge variant="outline" className="text-xs font-mono bg-indigo-50 text-indigo-700 border-indigo-200">
          {data.rentalCode || 'N/A'}
        </Badge>
      </td>
      <td className="px-4 py-3">
        <PatientSelectorDialog
          onSelect={(type, id, name) => {
            onChange({ ...data, patientId: id });
            setSelectedPatientName(name);
          }}
          selectedId={data.patientId}
          selectedName={selectedPatientName}
        />
      </td>
      <td className="px-4 py-3">
        <MedicalDeviceSelectorDialog
          onSelect={(id, name) => {
            onChange({ ...data, medicalDeviceId: id });
            setSelectedDeviceName(name);
          }}
          selectedId={data.medicalDeviceId}
          selectedName={selectedDeviceName}
          excludeRented={false}
        />
      </td>
      <td className="px-4 py-3">
        <div className="space-y-1">
          <Input
            type="date"
            value={data.startDate}
            onChange={(e) => onChange({ ...data, startDate: e.target.value })}
            className="text-xs"
          />
          <Input
            type="date"
            value={data.endDate || ''}
            onChange={(e) => onChange({ ...data, endDate: e.target.value })}
            className="text-xs"
            placeholder="Ouvert"
          />
        </div>
      </td>
      <td className="px-4 py-3">
        <Select
          value={data.status}
          onValueChange={(value) => onChange({ ...data, status: value })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="PENDING">En attente</SelectItem>
            <SelectItem value="ACTIVE">Actif</SelectItem>
            <SelectItem value="PAUSED">Suspendu</SelectItem>
            <SelectItem value="COMPLETED">Terminé</SelectItem>
            <SelectItem value="CANCELLED">Annulé</SelectItem>
          </SelectContent>
        </Select>
      </td>
      <td className="px-4 py-3">
        <div className="space-y-1">
          <Input
            type="number"
            value={data.configuration?.rentalRate || ''}
            onChange={(e) => onChange({
              ...data,
              configuration: { ...data.configuration, rentalRate: parseFloat(e.target.value) }
            })}
            placeholder="Tarif"
            className="text-xs"
          />
          <Select
            value={data.configuration?.billingCycle || 'DAILY'}
            onValueChange={(value) => onChange({
              ...data,
              configuration: { ...data.configuration, billingCycle: value }
            })}
          >
            <SelectTrigger className="text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="DAILY">Par jour</SelectItem>
              <SelectItem value="MONTHLY">Par mois</SelectItem>
              <SelectItem value="WEEKLY">Par semaine</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </td>
      <td className="px-4 py-3">
        <label className="flex items-center gap-1 text-xs">
          <Switch
            checked={data.configuration?.cnamEligible || false}
            onCheckedChange={(checked) => onChange({
              ...data,
              configuration: { ...data.configuration, cnamEligible: checked }
            })}
          />
          <span>CNAM</span>
        </label>
      </td>
      <td className="px-4 py-3">
        <div className="text-xs text-slate-600 bg-slate-50 px-3 py-2 rounded border border-slate-200">
          {createdByName}
        </div>
      </td>
      <td className="px-4 py-3">
        <EmployeeSelectorDialog
          onSelect={(id, name) => {
            onChange({ ...data, assignedToId: id || undefined });
            setSelectedAssignedToName(name);
          }}
          selectedId={data.assignedToId}
          selectedName={selectedAssignedToName}
          placeholder="Non assigné"
          allowNone={true}
        />
      </td>
      <td className="px-4 py-3 text-right">
        <div className="flex justify-end gap-2">
          <Button size="sm" onClick={onSave} className="bg-blue-600 hover:bg-blue-700">
            <Save className="h-3 w-3" />
          </Button>
          <Button size="sm" variant="outline" onClick={onCancel}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      </td>
    </tr>
  );
}
