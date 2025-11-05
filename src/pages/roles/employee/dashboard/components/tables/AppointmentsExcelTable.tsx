import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, X, Edit2, Plus, Trash2, Search, ChevronLeft, ChevronRight, Calendar as CalendarIcon, User, MapPin, Clock, AlertCircle } from "lucide-react";
import { DatePicker } from "@/components/ui/date-picker";
import { TimePicker } from "@/components/ui/time-picker";
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

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

export default function EmployeeAppointmentsExcelTable() {
  const router = useRouter();
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

  // Fetch appointments (filtered by API based on role)
  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ["employee-appointments"],
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
      queryClient.invalidateQueries({ queryKey: ["employee-appointments"] });
      toast({ title: "Succès", description: "Rendez-vous mis à jour avec succès" });
      setEditingId(null);
      setEditedAppointment(null);
    },
    onError: () => {
      toast({ title: "Erreur", description: "Erreur lors de la mise à jour", variant: "destructive" });
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

  const updateEditedField = (field: keyof Appointment, value: any) => {
    if (editedAppointment) {
      setEditedAppointment({ ...editedAppointment, [field]: value });
    }
  };

  const renderCell = (appointment: Appointment, field: keyof Appointment, isEditing: boolean) => {
    const value = isEditing && editedAppointment ? editedAppointment[field] : appointment[field];

    if (isEditing && editedAppointment) {
      switch (field) {
        case 'appointmentCode':
          return (
            <Badge variant="outline" className="text-xs font-mono bg-green-50 text-green-700 border-green-200">
              {appointment.appointmentCode || 'N/A'}
            </Badge>
          );

        case 'patientId':
          return (
            <Select
              value={editedAppointment.patientId || ''}
              onValueChange={(val) => updateEditedField('patientId', val)}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Patient" />
              </SelectTrigger>
              <SelectContent>
                {patients.map((patient: any) => (
                  <SelectItem key={patient.id} value={patient.id}>
                    {patient.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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

        default:
          return <span className="text-xs">{String(value || '-')}</span>;
      }
    }

    // Display mode
    switch (field) {
      case 'appointmentCode':
        return (
          <Badge variant="outline" className="text-xs font-mono bg-green-50 text-green-700 border-green-200">
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

      default:
        return <span className="text-xs">{String(value || '-')}</span>;
    }
  };

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
                <th className="px-2 py-3 text-left font-medium text-xs">Notes</th>
                <th className="px-2 py-3 text-center font-medium text-xs sticky right-0 bg-gray-100">Actions</th>
              </tr>
            </thead>
            <tbody>
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
