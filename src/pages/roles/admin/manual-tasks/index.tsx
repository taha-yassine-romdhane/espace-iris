import React, { useState, useEffect } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, X, Edit2, Plus, Trash2, Search, ChevronLeft, ChevronRight, ClipboardList, User, Phone } from "lucide-react";
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import Link from 'next/link';

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  telephone: string;
  patientCode?: string;
}

interface ManualTask {
  id: string;
  taskCode?: string;
  taskType: string;
  patientId: string;
  patient?: Patient;
  assignedToId: string;
  assignedTo?: Employee;
  createdById: string;
  createdBy?: {
    firstName: string;
    lastName: string;
  };
  adminNotes?: string;
  employeeNotes?: string;
  status: 'PENDING' | 'COMPLETED' | 'CANCELLED';
  completedAt?: Date | string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

const TASK_TYPES = [
  { value: 'POLYGRAPHIE', label: 'Polygraphie' },
  { value: 'CONSULTATION', label: 'Consultation' },
  { value: 'LOCATION', label: 'Location' },
  { value: 'VENTE', label: 'Vente' },
  { value: 'MAINTENANCE', label: 'Maintenance' },
  { value: 'RECUPERATION', label: 'Récupération' }
];

const STATUSES = ['PENDING', 'COMPLETED', 'CANCELLED'];

const getStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    PENDING: 'En attente',
    COMPLETED: 'Terminé',
    CANCELLED: 'Annulé'
  };
  return labels[status] || status;
};

const getStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    PENDING: 'bg-yellow-100 text-yellow-800',
    COMPLETED: 'bg-green-100 text-green-800',
    CANCELLED: 'bg-red-100 text-red-800'
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
};

const getTaskTypeColor = (type: string): string => {
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
            {selectedPatient ? `${selectedPatient.firstName} ${selectedPatient.lastName}` : "Sélectionner un patient"}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Sélectionner un patient</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par nom ou téléphone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>
          <ScrollArea className="h-[400px] pr-3">
            <div className="space-y-2">
              {filteredPatients.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Aucun patient trouvé</p>
              ) : (
                filteredPatients.map((patient) => (
                  <Button
                    key={patient.id}
                    variant={selectedPatientId === patient.id ? "default" : "outline"}
                    className="w-full justify-start h-auto py-3"
                    onClick={() => handleSelect(patient.id)}
                  >
                    <div className="flex flex-col items-start gap-1 w-full">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        <span className="font-medium">
                          {patient.firstName} {patient.lastName}
                        </span>
                      </div>
                      {patient.telephone && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Phone className="h-3 w-3" />
                          <span>{patient.telephone}</span>
                        </div>
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

export default function AdminManualTasksPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editedTask, setEditedTask] = useState<ManualTask | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newTask, setNewTask] = useState<Partial<ManualTask>>({
    taskType: 'CONSULTATION',
    status: 'PENDING',
  });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<ManualTask | null>(null);

  // Pagination & Filters
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');

  // Fetch manual tasks
  const { data: tasks = [] } = useQuery({
    queryKey: ["manualTasks"],
    queryFn: async () => {
      const response = await fetch("/api/manual-tasks");
      if (!response.ok) throw new Error("Failed to fetch manual tasks");
      return response.json();
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

  // Fetch patients
  const { data: patients = [] } = useQuery({
    queryKey: ["patients"],
    queryFn: async () => {
      const response = await fetch("/api/patients");
      if (!response.ok) throw new Error("Failed to fetch patients");
      return response.json();
    },
  });

  // Apply filters
  const filteredTasks = tasks.filter((task: ManualTask) => {
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      const patientName = task.patient ? `${task.patient.firstName} ${task.patient.lastName}`.toLowerCase() : '';
      const patientPhone = task.patient?.telephone?.toLowerCase() || '';
      const employeeName = task.assignedTo ? `${task.assignedTo.firstName} ${task.assignedTo.lastName}`.toLowerCase() : '';

      if (!patientName.includes(search) && !patientPhone.includes(search) && !employeeName.includes(search)) {
        return false;
      }
    }

    if (statusFilter !== 'ALL' && task.status !== statusFilter) return false;
    if (typeFilter !== 'ALL' && task.taskType !== typeFilter) return false;

    return true;
  });

  // Pagination
  const totalPages = Math.ceil(filteredTasks.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedTasks = filteredTasks.slice(startIndex, endIndex);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, typeFilter]);

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: Partial<ManualTask>) => {
      const response = await fetch("/api/manual-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to create task");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["manualTasks"] });
      toast({ title: "Succès", description: "Tâche créée avec succès" });
      handleCancelNew();
    },
    onError: () => {
      toast({ title: "Erreur", description: "Erreur lors de la création", variant: "destructive" });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data: ManualTask) => {
      const response = await fetch(`/api/manual-tasks/${data.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to update task");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["manualTasks"] });
      toast({ title: "Succès", description: "Tâche mise à jour avec succès" });
      setEditingId(null);
      setEditedTask(null);
    },
    onError: () => {
      toast({ title: "Erreur", description: "Erreur lors de la mise à jour", variant: "destructive" });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/manual-tasks/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Failed to delete task");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["manualTasks"] });
      toast({ title: "Succès", description: "Tâche supprimée avec succès" });
    },
    onError: () => {
      toast({ title: "Erreur", description: "Erreur lors de la suppression", variant: "destructive" });
    },
  });

  const handleEdit = (task: ManualTask) => {
    setEditingId(task.id);
    setEditedTask({ ...task });
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditedTask(null);
  };

  const handleSave = async () => {
    if (!editedTask || !editedTask.id) return;

    if (!editedTask.patientId || !editedTask.assignedToId) {
      toast({ title: "Erreur", description: "Patient et employé sont requis", variant: "destructive" });
      return;
    }

    await updateMutation.mutateAsync(editedTask);
  };

  const handleDelete = (task: ManualTask) => {
    setTaskToDelete(task);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (taskToDelete) {
      await deleteMutation.mutateAsync(taskToDelete.id);
      setDeleteDialogOpen(false);
      setTaskToDelete(null);
    }
  };

  const cancelDelete = () => {
    setDeleteDialogOpen(false);
    setTaskToDelete(null);
  };

  const handleAddNew = () => setIsAddingNew(true);

  const handleCancelNew = () => {
    setIsAddingNew(false);
    setNewTask({
      taskType: 'CONSULTATION',
      status: 'PENDING',
    });
  };

  const handleSaveNew = async () => {
    if (!newTask.patientId || !newTask.assignedToId) {
      toast({ title: "Erreur", description: "Patient et employé sont requis", variant: "destructive" });
      return;
    }

    await createMutation.mutateAsync(newTask);
  };

  const updateEditedField = (field: keyof ManualTask, value: any) => {
    if (editedTask) {
      setEditedTask({ ...editedTask, [field]: value });
    }
  };

  const updateNewField = (field: keyof ManualTask, value: any) => {
    setNewTask(prev => ({ ...prev, [field]: value }));
  };

  const renderCell = (task: ManualTask, field: keyof ManualTask, isEditing: boolean) => {
    const value = isEditing && editedTask ? editedTask[field] : task[field];

    if (isEditing && editedTask) {
      switch (field) {
        case 'taskCode':
          return (
            <Badge variant="outline" className="text-xs font-mono bg-blue-50 text-blue-700 border-blue-200">
              {task.taskCode || 'Auto'}
            </Badge>
          );

        case 'taskType':
          return (
            <Select
              value={editedTask.taskType}
              onValueChange={(val) => updateEditedField('taskType', val)}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TASK_TYPES.map(type => (
                  <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          );

        case 'patientId':
          return (
            <PatientSelectionDialog
              patients={patients}
              selectedPatientId={editedTask.patientId}
              onSelect={(patientId) => updateEditedField('patientId', patientId)}
            />
          );

        case 'assignedToId':
          return (
            <Select
              value={editedTask.assignedToId}
              onValueChange={(val) => updateEditedField('assignedToId', val)}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Employé" />
              </SelectTrigger>
              <SelectContent>
                {employees.map((emp: any) => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.firstName} {emp.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          );

        case 'adminNotes':
        case 'employeeNotes':
          return (
            <Input
              value={(editedTask[field] as string) || ''}
              onChange={(e) => updateEditedField(field, e.target.value)}
              className="h-8 text-xs"
              placeholder={field === 'adminNotes' ? 'Notes admin' : 'Notes employé'}
            />
          );

        case 'status':
          return (
            <Select
              value={editedTask.status}
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
      case 'taskCode':
        return (
          <Badge variant="outline" className="text-xs font-mono bg-blue-50 text-blue-700 border-blue-200">
            {task.taskCode || 'N/A'}
          </Badge>
        );

      case 'taskType':
        const typeLabel = TASK_TYPES.find(t => t.value === task.taskType)?.label || task.taskType;
        return (
          <Badge variant="outline" className={`text-xs ${getTaskTypeColor(task.taskType)}`}>
            {typeLabel}
          </Badge>
        );

      case 'patientId':
        if (!task.patient) return <span className="text-xs">-</span>;
        return (
          <Link
            href={`/roles/admin/renseignement/patient/${task.patientId}`}
            className="text-xs text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
          >
            {`${task.patient.firstName} ${task.patient.lastName}`}
          </Link>
        );

      case 'assignedToId':
        return (
          <span className="text-xs">
            {task.assignedTo ? `${task.assignedTo.firstName} ${task.assignedTo.lastName}` : '-'}
          </span>
        );

      case 'status':
        return (
          <Badge className={`text-xs ${getStatusColor(task.status)}`}>
            {getStatusLabel(task.status)}
          </Badge>
        );

      case 'completedAt':
        if (!task.completedAt) return <span className="text-xs">-</span>;
        return <span className="text-xs">{format(new Date(task.completedAt), 'dd/MM/yyyy HH:mm', { locale: fr })}</span>;

      case 'createdAt':
        return <span className="text-xs">{format(new Date(task.createdAt), 'dd/MM/yyyy HH:mm', { locale: fr })}</span>;

      default:
        return <span className="text-xs">{String(value || '-')}</span>;
    }
  };

  const renderNewRow = () => {
    const selectedPatient = patients.find(p => p.id === newTask.patientId);

    return (
      <tr className="bg-blue-50 border-b">
        <td className="px-2 py-2">
          <span className="text-xs text-gray-500 italic">Auto-généré</span>
        </td>
        <td className="px-2 py-2">
          <Select
            value={newTask.taskType || 'CONSULTATION'}
            onValueChange={(val) => updateNewField('taskType', val)}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TASK_TYPES.map(type => (
                <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </td>
        <td className="px-2 py-2">
          <div className="flex flex-col gap-1">
            <PatientSelectionDialog
              patients={patients}
              selectedPatientId={newTask.patientId}
              onSelect={(patientId) => updateNewField('patientId', patientId)}
            />
            {selectedPatient?.patientCode && (
              <span className="text-xs font-mono text-gray-500">{selectedPatient.patientCode}</span>
            )}
          </div>
        </td>
        <td className="px-2 py-2">
          <span className="text-xs text-gray-600">{selectedPatient?.telephone || '-'}</span>
        </td>
        <td className="px-2 py-2">
          <Select
            value={newTask.assignedToId || ''}
            onValueChange={(val) => updateNewField('assignedToId', val)}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Sélectionner" />
            </SelectTrigger>
            <SelectContent>
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
            value={newTask.adminNotes || ''}
            onChange={(e) => updateNewField('adminNotes', e.target.value)}
            placeholder="Notes admin"
            className="h-8 text-xs"
          />
        </td>
        <td className="px-2 py-2">
          <span className="text-xs text-gray-500">-</span>
        </td>
        <td className="px-2 py-2">
          <Badge className="text-xs bg-yellow-100 text-yellow-800">En attente</Badge>
        </td>
        <td className="px-2 py-2">
          <span className="text-xs text-gray-500">-</span>
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
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <ClipboardList className="h-8 w-8" />
            Tâches Manuelles
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {filteredTasks.length} tâche{filteredTasks.length > 1 ? 's' : ''} trouvée{filteredTasks.length > 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="space-y-3 bg-gray-50 p-4 rounded-lg border">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par patient, téléphone, employé..."
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
              {TASK_TYPES.map(type => (
                <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {(statusFilter !== 'ALL' || typeFilter !== 'ALL' || searchTerm) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setStatusFilter('ALL');
                setTypeFilter('ALL');
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
                <th className="px-2 py-3 text-left font-medium text-xs">Type</th>
                <th className="px-2 py-3 text-left font-medium text-xs">Patient</th>
                <th className="px-2 py-3 text-left font-medium text-xs">Téléphone</th>
                <th className="px-2 py-3 text-left font-medium text-xs">Employé</th>
                <th className="px-2 py-3 text-left font-medium text-xs">Notes Admin</th>
                <th className="px-2 py-3 text-left font-medium text-xs">Notes Employé</th>
                <th className="px-2 py-3 text-left font-medium text-xs">Statut</th>
                <th className="px-2 py-3 text-left font-medium text-xs">Date création</th>
                <th className="px-2 py-3 text-center font-medium text-xs sticky right-0 bg-gray-100">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isAddingNew && renderNewRow()}

              {paginatedTasks.map((task: ManualTask) => {
                const isEditing = editingId === task.id;
                return (
                  <tr key={task.id} className={`border-b ${isEditing ? 'bg-yellow-50' : 'hover:bg-gray-50'}`}>
                    <td className="px-2 py-2">{renderCell(task, 'taskCode', isEditing)}</td>
                    <td className="px-2 py-2">{renderCell(task, 'taskType', isEditing)}</td>
                    <td className="px-2 py-2">
                      <div className="flex flex-col gap-0.5">
                        {renderCell(task, 'patientId', isEditing)}
                        {task.patient?.patientCode && (
                          <span className="text-xs font-mono text-gray-500">{task.patient.patientCode}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-2 py-2">
                      <span className="text-xs">{task.patient?.telephone || '-'}</span>
                    </td>
                    <td className="px-2 py-2">{renderCell(task, 'assignedToId', isEditing)}</td>
                    <td className="px-2 py-2">{renderCell(task, 'adminNotes', isEditing)}</td>
                    <td className="px-2 py-2">{renderCell(task, 'employeeNotes', isEditing)}</td>
                    <td className="px-2 py-2">{renderCell(task, 'status', isEditing)}</td>
                    <td className="px-2 py-2">{renderCell(task, 'createdAt', isEditing)}</td>
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
                          <Button onClick={() => handleEdit(task)} size="icon" variant="ghost" className="h-7 w-7">
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button onClick={() => handleDelete(task)} size="icon" variant="ghost" className="h-7 w-7 text-red-600 hover:bg-red-50">
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
            {startIndex + 1}-{Math.min(endIndex, filteredTasks.length)} sur {filteredTasks.length}
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

      {/* Custom Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="h-5 w-5" />
              Confirmer la suppression
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-slate-700">
              Êtes-vous sûr de vouloir supprimer cette tâche manuelle ?
            </p>
            {taskToDelete && (
              <div className="bg-slate-50 p-3 rounded-md border border-slate-200 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-600">Code:</span>
                  <Badge variant="outline" className="text-xs font-mono bg-blue-50 text-blue-700 border-blue-200">
                    {taskToDelete.taskCode || 'N/A'}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-600">Type:</span>
                  <Badge variant="outline" className={`text-xs ${getTaskTypeColor(taskToDelete.taskType)}`}>
                    {TASK_TYPES.find(t => t.value === taskToDelete.taskType)?.label || taskToDelete.taskType}
                  </Badge>
                </div>
                {taskToDelete.patient && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-600">Patient:</span>
                    <span className="text-xs text-slate-700">
                      {taskToDelete.patient.firstName} {taskToDelete.patient.lastName}
                    </span>
                  </div>
                )}
              </div>
            )}
            <p className="text-xs text-red-600 font-medium">
              ⚠️ Cette action est irréversible
            </p>
          </div>
          <div className="flex gap-3 justify-end">
            <Button
              variant="outline"
              onClick={cancelDelete}
              disabled={deleteMutation.isPending}
            >
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleteMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Supprimer définitivement
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
