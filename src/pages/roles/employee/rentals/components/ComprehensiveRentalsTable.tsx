import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
  patient?: { id: string; firstName: string; lastName: string; cnamId?: string; telephone?: string };
  medicalDevice?: { id: string; name: string; deviceCode: string; rentalPrice: number };
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

  // State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newRow, setNewRow] = useState<Partial<Rental> | null>(null);
  const [editData, setEditData] = useState<Partial<Rental>>({});

  // Search and Filter State
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [cnamFilter, setCnamFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<string>("startDate");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

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

  // Fetch devices
  const { data: devicesData } = useQuery({
    queryKey: ['devices-for-rentals'],
    queryFn: async () => {
      const response = await fetch('/api/medical-devices');
      const data = await response.json();
      return Array.isArray(data) ? data : (data.devices || []);
    },
  });

  // Fetch users
  const { data: usersData } = useQuery({
    queryKey: ['users-for-rentals'],
    queryFn: async () => {
      const response = await fetch('/api/users');
      if (!response.ok) throw new Error('Failed to fetch users');
      return response.json();
    },
  });

  const rentals = rentalsData || [];
  const patients = patientsData || [];
  const devices = devicesData || [];
  const users = usersData || [];

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

        if (!patientName.includes(search) && !deviceName.includes(search) && !rentalCode.includes(search)) {
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

      return true;
    })
    .sort((a: Rental, b: Rental) => {
      let aValue: any, bValue: any;

      switch (sortField) {
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
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between bg-white p-4 rounded-lg shadow-sm border">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Rechercher par client, appareil, code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Filters */}
        <div className="flex gap-2 flex-wrap">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]">
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
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="CNAM" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous CNAM</SelectItem>
              <SelectItem value="eligible">Éligible</SelectItem>
              <SelectItem value="not_eligible">Non éligible</SelectItem>
            </SelectContent>
          </Select>

          <Button onClick={handleAddNew} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="h-4 w-4 mr-2" />
            Nouvelle Location
          </Button>
        </div>
      </div>

      {/* Results count */}
      <div className="text-sm text-slate-600">
        {filteredRentals.length} location(s) trouvée(s)
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
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Appareil</th>
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
            {filteredRentals.map((rental: Rental) => (
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
  const patientName = rental.patient
    ? `${rental.patient.firstName} ${rental.patient.lastName}`
    : 'N/A';

  return (
    <tr className="border-b hover:bg-slate-50 transition-colors">
      <td className="px-4 py-3">
        <div className="text-sm font-medium text-slate-900">{rental.rentalCode || 'N/A'}</div>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-slate-400" />
          <div>
            <div className="text-sm font-medium text-slate-900">{patientName}</div>
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
        <div className="text-sm font-medium text-slate-900">{rental.medicalDevice?.name || 'N/A'}</div>
        <div className="text-xs text-slate-500">{rental.medicalDevice?.deviceCode || ''}</div>
      </td>
      <td className="px-4 py-3">
        <div className="text-xs text-slate-700">
          <div>Début: {format(new Date(rental.startDate), 'dd/MM/yyyy', { locale: fr })}</div>
          <div className="text-slate-500">
            Fin: {rental.endDate ? format(new Date(rental.endDate), 'dd/MM/yyyy', { locale: fr }) : 'Ouvert'}
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
  return (
    <tr className="bg-green-50 border-b-2 border-green-200">
      <td className="px-4 py-3">
        <span className="text-xs text-slate-500">Auto</span>
      </td>
      <td className="px-4 py-3">
        <Select
          value={data.patientId}
          onValueChange={(value) => onChange({ ...data, patientId: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Sélectionner patient" />
          </SelectTrigger>
          <SelectContent>
            {patients.map((p: any) => (
              <SelectItem key={p.id} value={p.id}>
                {p.firstName} {p.lastName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </td>
      <td className="px-4 py-3">
        <Select
          value={data.medicalDeviceId}
          onValueChange={(value) => onChange({ ...data, medicalDeviceId: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Sélectionner appareil" />
          </SelectTrigger>
          <SelectContent>
            {devices.map((d: any) => (
              <SelectItem key={d.id} value={d.id}>
                {d.name} - {d.deviceCode}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
        <Select
          value={data.createdById || ''}
          onValueChange={(value) => onChange({ ...data, createdById: value || undefined })}
        >
          <SelectTrigger className="text-xs">
            <SelectValue placeholder="Créé par (auto)" />
          </SelectTrigger>
          <SelectContent>
            {users.map((u: any) => (
              <SelectItem key={u.id} value={u.id}>
                {u.firstName} {u.lastName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </td>
      <td className="px-4 py-3">
        <Select
          value={data.assignedToId || 'none'}
          onValueChange={(value) => onChange({ ...data, assignedToId: value === 'none' ? undefined : value })}
        >
          <SelectTrigger className="text-xs">
            <SelectValue placeholder="Non assigné" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Non assigné</SelectItem>
            {users.map((u: any) => (
              <SelectItem key={u.id} value={u.id}>
                {u.firstName} {u.lastName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
  return (
    <tr className="bg-blue-50 border-b-2 border-blue-200">
      <td className="px-4 py-3">
        <span className="text-xs text-slate-500">{data.rentalCode || 'N/A'}</span>
      </td>
      <td className="px-4 py-3">
        <Select
          value={data.patientId}
          onValueChange={(value) => onChange({ ...data, patientId: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Sélectionner patient" />
          </SelectTrigger>
          <SelectContent>
            {patients.map((p: any) => (
              <SelectItem key={p.id} value={p.id}>
                {p.firstName} {p.lastName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </td>
      <td className="px-4 py-3">
        <Select
          value={data.medicalDeviceId}
          onValueChange={(value) => onChange({ ...data, medicalDeviceId: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Sélectionner appareil" />
          </SelectTrigger>
          <SelectContent>
            {devices.map((d: any) => (
              <SelectItem key={d.id} value={d.id}>
                {d.name} - {d.deviceCode}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
        <Select
          value={data.createdById || ''}
          onValueChange={(value) => onChange({ ...data, createdById: value || undefined })}
        >
          <SelectTrigger className="text-xs">
            <SelectValue placeholder="Sélectionner" />
          </SelectTrigger>
          <SelectContent>
            {users.map((u: any) => (
              <SelectItem key={u.id} value={u.id}>
                {u.firstName} {u.lastName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </td>
      <td className="px-4 py-3">
        <Select
          value={data.assignedToId || 'none'}
          onValueChange={(value) => onChange({ ...data, assignedToId: value === 'none' ? null : value })}
        >
          <SelectTrigger className="text-xs">
            <SelectValue placeholder="Non assigné" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Non assigné</SelectItem>
            {users.map((u: any) => (
              <SelectItem key={u.id} value={u.id}>
                {u.firstName} {u.lastName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
