import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, X, Edit2, Plus, Trash2, Search, ChevronLeft, ChevronRight, User } from "lucide-react";
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  name: string;
  telephone?: string;
}

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
}

interface Appointment {
  id?: string;
  appointmentCode?: string;
  patientId: string;
  patient?: {
    id: string;
    firstName: string;
    lastName: string;
    telephone?: string;
  };
  appointmentType: string;
  scheduledDate: Date | string;
  location: string;
  notes?: string;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  status: 'SCHEDULED' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';
  assignedToId?: string;
  assignedTo?: Employee;
}

const APPOINTMENT_TYPES = [
  { value: 'POLYGRAPHIE', label: 'Polygraphie' },
  { value: 'CONSULTATION', label: 'Consultation' },
  { value: 'LOCATION', label: 'Location' },
  { value: 'VENTE', label: 'Vente' },
  { value: 'MAINTENANCE', label: 'Maintenance' },
  { value: 'RECUPERATION', label: 'Récupération' }
];

const STATUSES = ['SCHEDULED', 'CONFIRMED', 'CANCELLED', 'COMPLETED'];
const PRIORITIES = ['LOW', 'NORMAL', 'HIGH', 'URGENT'];

const getStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    SCHEDULED: 'Planifié',
    CONFIRMED: 'Confirmé',
    CANCELLED: 'Annulé',
    COMPLETED: 'Terminé'
  };
  return labels[status] || status;
};

const getPriorityLabel = (priority: string): string => {
  const labels: Record<string, string> = {
    LOW: 'Faible',
    NORMAL: 'Normal',
    HIGH: 'Élevée',
    URGENT: 'Urgent'
  };
  return labels[priority] || priority;
};

const getStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    SCHEDULED: 'bg-blue-100 text-blue-800',
    CONFIRMED: 'bg-green-100 text-green-800',
    CANCELLED: 'bg-red-100 text-red-800',
    COMPLETED: 'bg-gray-100 text-gray-800'
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
};

const getPriorityColor = (priority: string): string => {
  const colors: Record<string, string> = {
    LOW: 'bg-green-100 text-green-800',
    NORMAL: 'bg-blue-100 text-blue-800',
    HIGH: 'bg-orange-100 text-orange-800',
    URGENT: 'bg-red-100 text-red-800'
  };
  return colors[priority] || 'bg-gray-100 text-gray-800';
};

const getAppointmentTypeColor = (type: string): string => {
  const colors: Record<string, string> = {
    POLYGRAPHIE: 'bg-purple-100 text-purple-800 border-purple-200',
    CONSULTATION: 'bg-blue-100 text-blue-800 border-blue-200',
    LOCATION: 'bg-green-100 text-green-800 border-green-200',
    VENTE: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    MAINTENANCE: 'bg-orange-100 text-orange-800 border-orange-200',
    RECUPERATION: 'bg-teal-100 text-teal-800 border-teal-200'
  };
  return colors[type] || 'bg-gray-100 text-gray-800 border-gray-200';
};

// Patient Selection Dialog Component
interface PatientSelectionDialogProps {
  patients: Patient[];
  selectedPatientId: string | undefined;
  onSelect: (patientId: string) => void;
  trigger?: React.ReactNode;
}

function PatientSelectionDialog({ patients, selectedPatientId, onSelect, trigger }: PatientSelectionDialogProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const selectedPatient = patients.find(p => p.id === selectedPatientId);

  const filteredPatients = patients.filter(patient => {
    const searchLower = searchQuery.toLowerCase();
    const fullName = `${patient.firstName || ''} ${patient.lastName || ''}`.toLowerCase();
    const telephone = patient.telephone?.toLowerCase() || '';
    return fullName.includes(searchLower) || telephone.includes(searchLower);
  });

  const handleSelect = (patientId: string) => {
    onSelect(patientId);
    setOpen(false);
    setSearchQuery('');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="h-8 text-xs justify-start w-full">
            <User className="h-3 w-3 mr-2" />
            {selectedPatient ? selectedPatient.name : "Sélectionner un patient"}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Sélectionner un patient</DialogTitle>
          <DialogDescription>
            Recherchez et sélectionnez un patient pour le rendez-vous
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par nom ou téléphone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>
          <ScrollArea className="h-[400px] rounded-md border">
            <div className="p-2 space-y-1">
              {filteredPatients.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  Aucun patient trouvé
                </div>
              ) : (
                filteredPatients.map((patient) => (
                  <Button
                    key={patient.id}
                    variant={patient.id === selectedPatientId ? "secondary" : "ghost"}
                    className="w-full justify-start h-auto py-3 px-3"
                    onClick={() => handleSelect(patient.id)}
                  >
                    <div className="flex flex-col items-start w-full">
                      <div className="flex items-center gap-2 w-full">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{patient.name}</span>
                        {patient.id === selectedPatientId && (
                          <Check className="h-4 w-4 ml-auto text-green-600" />
                        )}
                      </div>
                      {patient.telephone && (
                        <span className="text-xs text-muted-foreground ml-6">
                          {patient.telephone}
                        </span>
                      )}
                    </div>
                  </Button>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function AppointmentsExcelTable() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editedAppointment, setEditedAppointment] = useState<Appointment | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newAppointment, setNewAppointment] = useState<Partial<Appointment>>({
    appointmentType: 'CONSULTATION',
    priority: 'NORMAL',
    status: 'SCHEDULED',
    location: ''
  });

  // Pagination & Filters
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');

  // Fetch appointments
  const { data: appointments = [],  } = useQuery({
    queryKey: ["appointments"],
    queryFn: async () => {
      const response = await fetch("/api/appointments");
      if (!response.ok) throw new Error("Failed to fetch appointments");
      const data = await response.json();
      return Array.isArray(data) ? data : (data.appointments || []);
    },
  });

  // Fetch patients
  const { data: patients = [] } = useQuery({
    queryKey: ["patients"],
    queryFn: async () => {
      const response = await fetch("/api/renseignements/patients");
      if (!response.ok) throw new Error("Failed to fetch patients");
      const data = await response.json();
      return data.patients || [];
    },
  });

  // Fetch employees
  const { data: employees = [] } = useQuery({
    queryKey: ["employees"],
    queryFn: async () => {
      const response = await fetch("/api/users/employees-stats");
      if (!response.ok) throw new Error("Failed to fetch employees");
      return response.json();
    },
  });

  // Apply filters
  const filteredAppointments = appointments.filter((apt: Appointment) => {
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      const patientName = apt.patient ? `${apt.patient.firstName || ''} ${apt.patient.lastName || ''}`.toLowerCase() : '';
      const location = apt.location?.toLowerCase() || '';
      const type = apt.appointmentType?.toLowerCase() || '';

      if (!patientName.includes(search) && !location.includes(search) && !type.includes(search)) {
        return false;
      }
    }

    if (statusFilter !== 'ALL' && apt.status !== statusFilter) return false;
    if (typeFilter !== 'ALL' && apt.appointmentType !== typeFilter) return false;
    if (priorityFilter !== 'ALL' && apt.priority !== priorityFilter) return false;

    return true;
  });

  // Pagination
  const totalPages = Math.ceil(filteredAppointments.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedAppointments = filteredAppointments.slice(startIndex, endIndex);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, typeFilter, priorityFilter]);

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: Partial<Appointment>) => {
      const response = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to create appointment");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      toast({ title: "Succès", description: "Rendez-vous créé avec succès" });
      handleCancelNew();
    },
    onError: () => {
      toast({ title: "Erreur", description: "Erreur lors de la création", variant: "destructive" });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data: Appointment) => {
      const response = await fetch(`/api/appointments/${data.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to update appointment");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      toast({ title: "Succès", description: "Rendez-vous mis à jour avec succès" });
      setEditingId(null);
      setEditedAppointment(null);
    },
    onError: () => {
      toast({ title: "Erreur", description: "Erreur lors de la mise à jour", variant: "destructive" });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/appointments/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Failed to delete appointment");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      toast({ title: "Succès", description: "Rendez-vous supprimé avec succès" });
    },
    onError: () => {
      toast({ title: "Erreur", description: "Erreur lors de la suppression", variant: "destructive" });
    },
  });

  const handleEdit = (appointment: Appointment) => {
    setEditingId(appointment.id || null);
    setEditedAppointment({ ...appointment });
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditedAppointment(null);
  };

  const handleSave = async () => {
    if (!editedAppointment || !editedAppointment.id) return;

    if (!editedAppointment.patientId || !editedAppointment.scheduledDate || !editedAppointment.location) {
      toast({ title: "Erreur", description: "Patient, date et lieu sont requis", variant: "destructive" });
      return;
    }

    await updateMutation.mutateAsync(editedAppointment);
  };

  const handleDelete = async (appointment: Appointment) => {
    if (!appointment.id) return;
    if (confirm("Êtes-vous sûr de vouloir supprimer ce rendez-vous ?")) {
      await deleteMutation.mutateAsync(appointment.id);
    }
  };

  const handleAddNew = () => setIsAddingNew(true);

  const handleCancelNew = () => {
    setIsAddingNew(false);
    setNewAppointment({
      appointmentType: 'CONSULTATION',
      priority: 'NORMAL',
      status: 'SCHEDULED',
      location: ''
    });
  };

  const handleSaveNew = async () => {
    if (!newAppointment.patientId || !newAppointment.scheduledDate || !newAppointment.location) {
      toast({ title: "Erreur", description: "Patient, date et lieu sont requis", variant: "destructive" });
      return;
    }

    await createMutation.mutateAsync(newAppointment);
  };

  const updateEditedField = (field: keyof Appointment, value: any) => {
    if (editedAppointment) {
      setEditedAppointment({ ...editedAppointment, [field]: value });
    }
  };

  const updateNewField = (field: keyof Appointment, value: any) => {
    setNewAppointment(prev => ({ ...prev, [field]: value }));
  };

  const renderCell = (appointment: Appointment, field: keyof Appointment, isEditing: boolean) => {
    const value = isEditing && editedAppointment ? editedAppointment[field] : appointment[field];

    if (isEditing && editedAppointment) {
      switch (field) {
        case 'appointmentCode':
          // AppointmentCode is not editable, just display it
          return (
            <Badge variant="outline" className="text-xs font-mono bg-blue-50 text-blue-700 border-blue-200">
              {appointment.appointmentCode || 'N/A'}
            </Badge>
          );

        case 'patientId':
          return (
            <PatientSelectionDialog
              patients={patients}
              selectedPatientId={editedAppointment.patientId}
              onSelect={(val) => updateEditedField('patientId', val)}
            />
          );

        case 'appointmentType':
          return (
            <Select
              value={editedAppointment.appointmentType}
              onValueChange={(val) => updateEditedField('appointmentType', val)}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {APPOINTMENT_TYPES.map(type => (
                  <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          );

        case 'scheduledDate':
          const editScheduledDateValue = editedAppointment.scheduledDate
            ? new Date(editedAppointment.scheduledDate).toISOString().slice(0, 16)
            : '';
          return (
            <Input
              type="datetime-local"
              value={editScheduledDateValue}
              onChange={(e) => updateEditedField('scheduledDate', e.target.value ? new Date(e.target.value) : null)}
              className="h-8 text-xs"
            />
          );

        case 'location':
        case 'notes':
          return (
            <Input
              value={(editedAppointment[field] as string) || ''}
              onChange={(e) => updateEditedField(field, e.target.value)}
              className="h-8 text-xs"
            />
          );

        case 'priority':
          return (
            <Select
              value={editedAppointment.priority}
              onValueChange={(val) => updateEditedField('priority', val)}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRIORITIES.map(priority => (
                  <SelectItem key={priority} value={priority}>{getPriorityLabel(priority)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          );

        case 'status':
          return (
            <Select
              value={editedAppointment.status}
              onValueChange={(val) => updateEditedField('status', val)}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUSES.map(status => (
                  <SelectItem key={status} value={status}>{getStatusLabel(status)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          );

        case 'assignedToId':
          return (
            <Select
              value={editedAppointment.assignedToId || 'none'}
              onValueChange={(val) => updateEditedField('assignedToId', val === 'none' ? null : val)}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Technicien" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Aucun</SelectItem>
                {employees.map((emp: any) => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.firstName} {emp.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          );

        default:
          return <span className="text-xs">{String(value || '-')}</span>;
      }
    }

    // Display mode
    switch (field) {
      case 'appointmentCode':
        return (
          <Badge variant="outline" className="text-xs font-mono bg-blue-50 text-blue-700 border-blue-200">
            {appointment.appointmentCode || 'N/A'}
          </Badge>
        );

      case 'patientId':
        const patientFullName = appointment.patient
          ? `${appointment.patient.firstName || ''} ${appointment.patient.lastName || ''}`.trim()
          : '-';
        return <span className="text-xs">{patientFullName || '-'}</span>;

      case 'appointmentType':
        const typeLabel = APPOINTMENT_TYPES.find(t => t.value === appointment.appointmentType)?.label || appointment.appointmentType;
        return (
          <Badge variant="outline" className={`text-xs ${getAppointmentTypeColor(appointment.appointmentType)}`}>
            {typeLabel}
          </Badge>
        );

      case 'scheduledDate':
        if (!appointment.scheduledDate) return <span className="text-xs">-</span>;
        const date = new Date(appointment.scheduledDate);
        return (
          <div className="text-xs">
            <div>{format(date, 'dd/MM/yyyy', { locale: fr })}</div>
            <div className="text-gray-500">{format(date, 'HH:mm', { locale: fr })}</div>
          </div>
        );

      case 'priority':
        return (
          <Badge className={`text-xs ${getPriorityColor(appointment.priority)}`}>
            {getPriorityLabel(appointment.priority)}
          </Badge>
        );

      case 'status':
        return (
          <Badge className={`text-xs ${getStatusColor(appointment.status)}`}>
            {getStatusLabel(appointment.status)}
          </Badge>
        );

      case 'assignedToId':
        return (
          <span className="text-xs">
            {appointment.assignedTo ? `${appointment.assignedTo.firstName} ${appointment.assignedTo.lastName}` : '-'}
          </span>
        );

      default:
        return <span className="text-xs">{String(value || '-')}</span>;
    }
  };

  const renderNewRow = () => (
    <tr className="bg-blue-50 border-b">
      <td className="px-2 py-2">
        <span className="text-xs text-gray-500 italic">Auto-généré</span>
      </td>
      <td className="px-2 py-2">
        <PatientSelectionDialog
          patients={patients}
          selectedPatientId={newAppointment.patientId}
          onSelect={(val) => updateNewField('patientId', val)}
        />
      </td>
      <td className="px-2 py-2">
        <Select
          value={newAppointment.appointmentType || 'CONSULTATION'}
          onValueChange={(val) => updateNewField('appointmentType', val)}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {APPOINTMENT_TYPES.map(type => (
              <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </td>
      <td className="px-2 py-2">
        <Input
          type="datetime-local"
          value={newAppointment.scheduledDate ? new Date(newAppointment.scheduledDate).toISOString().slice(0, 16) : ''}
          onChange={(e) => updateNewField('scheduledDate', e.target.value ? new Date(e.target.value) : null)}
          className="h-8 text-xs"
        />
      </td>
      <td className="px-2 py-2">
        <Input
          value={newAppointment.location || ''}
          onChange={(e) => updateNewField('location', e.target.value)}
          placeholder="Lieu"
          className="h-8 text-xs"
        />
      </td>
      <td className="px-2 py-2">
        <Select
          value={newAppointment.priority || 'NORMAL'}
          onValueChange={(val) => updateNewField('priority', val as any)}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PRIORITIES.map(priority => (
              <SelectItem key={priority} value={priority}>{getPriorityLabel(priority)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </td>
      <td className="px-2 py-2">
        <Select
          value={newAppointment.status || 'SCHEDULED'}
          onValueChange={(val) => updateNewField('status', val as any)}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUSES.map(status => (
              <SelectItem key={status} value={status}>{getStatusLabel(status)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </td>
      <td className="px-2 py-2">
        <Select
          value={newAppointment.assignedToId || 'none'}
          onValueChange={(val) => updateNewField('assignedToId', val === 'none' ? undefined : val)}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Aucun" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Aucun</SelectItem>
            {employees.map((emp: any) => (
              <SelectItem key={emp.id} value={emp.id}>
                {emp.firstName} {emp.lastName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </td>
      <td className="px-2 py-2">
        <Input
          value={newAppointment.notes || ''}
          onChange={(e) => updateNewField('notes', e.target.value)}
          placeholder="Notes"
          className="h-8 text-xs"
        />
      </td>
      <td className="px-2 py-2 sticky right-0 bg-blue-50">
        <div className="flex gap-1 justify-center">
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={handleSaveNew}>
            <Check className="h-4 w-4 text-green-600" />
          </Button>
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={handleCancelNew}>
            <X className="h-4 w-4 text-red-600" />
          </Button>
        </div>
      </td>
    </tr>
  );

  return (
    <div className="space-y-4">

      {/* Filters */}
      <div className="space-y-3 bg-gray-50 p-4 rounded-lg border">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par patient, lieu, type..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
          <Button onClick={handleAddNew} disabled={isAddingNew}>
            <Plus className="h-4 w-4 mr-2" />
            Ajouter
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs font-medium text-muted-foreground">Filtres:</span>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px] h-9">
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tous les statuts</SelectItem>
              {STATUSES.map(status => (
                <SelectItem key={status} value={status}>{getStatusLabel(status)}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[180px] h-9">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tous les types</SelectItem>
              {APPOINTMENT_TYPES.map(type => (
                <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-[160px] h-9">
              <SelectValue placeholder="Priorité" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Toutes priorités</SelectItem>
              {PRIORITIES.map(priority => (
                <SelectItem key={priority} value={priority}>{getPriorityLabel(priority)}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {(statusFilter !== 'ALL' || typeFilter !== 'ALL' || priorityFilter !== 'ALL' || searchTerm) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setStatusFilter('ALL');
                setTypeFilter('ALL');
                setPriorityFilter('ALL');
                setSearchTerm('');
              }}
              className="h-9"
            >
              <X className="h-4 w-4 mr-1" />
              Réinitialiser
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 border-b sticky top-0">
              <tr>
                <th className="px-2 py-3 text-left font-medium text-xs">Code</th>
                <th className="px-2 py-3 text-left font-medium text-xs">Patient</th>
                <th className="px-2 py-3 text-left font-medium text-xs">Type</th>
                <th className="px-2 py-3 text-left font-medium text-xs">Date/Heure</th>
                <th className="px-2 py-3 text-left font-medium text-xs">Lieu</th>
                <th className="px-2 py-3 text-left font-medium text-xs">Priorité</th>
                <th className="px-2 py-3 text-left font-medium text-xs">Statut</th>
                <th className="px-2 py-3 text-left font-medium text-xs">Technicien</th>
                <th className="px-2 py-3 text-left font-medium text-xs">Notes</th>
                <th className="px-2 py-3 text-center font-medium text-xs sticky right-0 bg-gray-100">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isAddingNew && renderNewRow()}

              {paginatedAppointments.map((appointment: Appointment) => {
                const isEditing = editingId === appointment.id;
                return (
                  <tr key={appointment.id} className={`border-b ${isEditing ? 'bg-yellow-50' : 'hover:bg-gray-50'}`}>
                    <td className="px-2 py-2">{renderCell(appointment, 'appointmentCode', isEditing)}</td>
                    <td className="px-2 py-2">{renderCell(appointment, 'patientId', isEditing)}</td>
                    <td className="px-2 py-2">{renderCell(appointment, 'appointmentType', isEditing)}</td>
                    <td className="px-2 py-2">{renderCell(appointment, 'scheduledDate', isEditing)}</td>
                    <td className="px-2 py-2">{renderCell(appointment, 'location', isEditing)}</td>
                    <td className="px-2 py-2">{renderCell(appointment, 'priority', isEditing)}</td>
                    <td className="px-2 py-2">{renderCell(appointment, 'status', isEditing)}</td>
                    <td className="px-2 py-2">{renderCell(appointment, 'assignedToId', isEditing)}</td>
                    <td className="px-2 py-2">{renderCell(appointment, 'notes', isEditing)}</td>
                    <td className="px-2 py-2 sticky right-0 bg-white">
                      {isEditing ? (
                        <div className="flex gap-1 justify-center">
                          <Button onClick={handleSave} size="icon" variant="ghost" className="h-7 w-7 text-green-600 hover:bg-green-50">
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button onClick={handleCancel} size="icon" variant="ghost" className="h-7 w-7 text-red-600 hover:bg-red-50">
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex gap-1 justify-center">
                          <Button onClick={() => handleEdit(appointment)} size="icon" variant="ghost" className="h-7 w-7">
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button onClick={() => handleDelete(appointment)} size="icon" variant="ghost" className="h-7 w-7 text-red-600 hover:bg-red-50">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Afficher</span>
          <Select value={itemsPerPage.toString()} onValueChange={(val) => setItemsPerPage(Number(val))}>
            <SelectTrigger className="w-[100px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground">
            {startIndex + 1}-{Math.min(endIndex, filteredAppointments.length)} sur {filteredAppointments.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            size="sm"
            variant="outline"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm">
            Page {currentPage} sur {totalPages || 1}
          </span>
          <Button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            size="sm"
            variant="outline"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
