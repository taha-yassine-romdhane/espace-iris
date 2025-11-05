import React, { useState, useEffect } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, X, Search, ChevronLeft, ChevronRight, ClipboardCheck, CheckCircle } from "lucide-react";
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Textarea } from "@/components/ui/textarea";

interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  telephone: string;
}

interface ManualTask {
  id: string;
  taskCode?: string;
  taskType: string;
  patientId: string;
  patient?: Patient;
  assignedToId: string;
  createdBy?: {
    firstName: string;
    lastName: string;
  };
  adminNotes?: string;
  employeeNotes?: string;
  status: 'PENDING' | 'COMPLETED' | 'CANCELLED';
  completedAt?: Date | string;
  createdAt: Date | string;
}

const TASK_TYPES_LABELS: Record<string, string> = {
  POLYGRAPHIE: 'Polygraphie',
  CONSULTATION: 'Consultation',
  LOCATION: 'Location',
  VENTE: 'Vente',
  MAINTENANCE: 'Maintenance',
  RECUPERATION: 'Récupération'
};

const STATUSES = ['PENDING', 'COMPLETED'];

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

export default function EmployeeManualTasksPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [completingId, setCompletingId] = useState<string | null>(null);
  const [employeeNotes, setEmployeeNotes] = useState<string>('');

  // Pagination & Filters
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('PENDING'); // Default to pending tasks

  // Fetch manual tasks (only assigned to this employee)
  const { data: tasks = [] } = useQuery({
    queryKey: ["manualTasks"],
    queryFn: async () => {
      const response = await fetch("/api/manual-tasks");
      if (!response.ok) throw new Error("Failed to fetch manual tasks");
      return response.json();
    },
  });

  // Apply filters
  const filteredTasks = tasks.filter((task: ManualTask) => {
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      const patientName = task.patient ? `${task.patient.firstName} ${task.patient.lastName}`.toLowerCase() : '';
      const patientPhone = task.patient?.telephone?.toLowerCase() || '';

      if (!patientName.includes(search) && !patientPhone.includes(search)) {
        return false;
      }
    }

    if (statusFilter !== 'ALL' && task.status !== statusFilter) return false;

    return true;
  });

  // Pagination
  const totalPages = Math.ceil(filteredTasks.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedTasks = filteredTasks.slice(startIndex, endIndex);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data: { id: string; employeeNotes: string; status: string }) => {
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
      toast({ title: "Succès", description: "Tâche marquée comme terminée" });
      setCompletingId(null);
      setEmployeeNotes('');
    },
    onError: () => {
      toast({ title: "Erreur", description: "Erreur lors de la mise à jour", variant: "destructive" });
    },
  });

  const handleStartComplete = (task: ManualTask) => {
    setCompletingId(task.id);
    setEmployeeNotes(task.employeeNotes || '');
  };

  const handleCancelComplete = () => {
    setCompletingId(null);
    setEmployeeNotes('');
  };

  const handleCompleteTask = async (task: ManualTask) => {
    await updateMutation.mutateAsync({
      id: task.id,
      employeeNotes,
      status: 'COMPLETED',
    });
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <ClipboardCheck className="h-8 w-8" />
            Mes Tâches
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {filteredTasks.length} tâche{filteredTasks.length > 1 ? 's' : ''} assignée{filteredTasks.length > 1 ? 's' : ''}
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
                placeholder="Rechercher par patient, téléphone..."
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

          {(statusFilter !== 'PENDING' || searchTerm) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setStatusFilter('PENDING');
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
                <th className="px-2 py-3 text-left font-medium text-xs">Notes Admin</th>
                <th className="px-2 py-3 text-left font-medium text-xs">Mes Notes</th>
                <th className="px-2 py-3 text-left font-medium text-xs">Statut</th>
                <th className="px-2 py-3 text-left font-medium text-xs">Date création</th>
                <th className="px-2 py-3 text-center font-medium text-xs sticky right-0 bg-gray-100">Action</th>
              </tr>
            </thead>
            <tbody>
              {paginatedTasks.map((task: ManualTask) => {
                const isCompleting = completingId === task.id;
                return (
                  <tr key={task.id} className={`border-b ${isCompleting ? 'bg-green-50' : 'hover:bg-gray-50'}`}>
                    <td className="px-2 py-2">
                      <Badge variant="outline" className="text-xs font-mono bg-blue-50 text-blue-700 border-blue-200">
                        {task.taskCode || 'N/A'}
                      </Badge>
                    </td>
                    <td className="px-2 py-2">
                      <Badge variant="outline" className={`text-xs ${getTaskTypeColor(task.taskType)}`}>
                        {TASK_TYPES_LABELS[task.taskType] || task.taskType}
                      </Badge>
                    </td>
                    <td className="px-2 py-2">
                      <span className="text-xs">
                        {task.patient ? `${task.patient.firstName} ${task.patient.lastName}` : '-'}
                      </span>
                    </td>
                    <td className="px-2 py-2">
                      <span className="text-xs">{task.patient?.telephone || '-'}</span>
                    </td>
                    <td className="px-2 py-2">
                      <span className="text-xs">{task.adminNotes || '-'}</span>
                    </td>
                    <td className="px-2 py-2">
                      {isCompleting ? (
                        <Textarea
                          value={employeeNotes}
                          onChange={(e) => setEmployeeNotes(e.target.value)}
                          placeholder="Ajouter vos notes..."
                          className="h-16 text-xs"
                        />
                      ) : (
                        <span className="text-xs">{task.employeeNotes || '-'}</span>
                      )}
                    </td>
                    <td className="px-2 py-2">
                      <Badge className={`text-xs ${getStatusColor(task.status)}`}>
                        {getStatusLabel(task.status)}
                      </Badge>
                    </td>
                    <td className="px-2 py-2">
                      <span className="text-xs">
                        {format(new Date(task.createdAt), 'dd/MM/yyyy HH:mm', { locale: fr })}
                      </span>
                    </td>
                    <td className="px-2 py-2 sticky right-0 bg-white">
                      {task.status === 'PENDING' && (
                        <>
                          {isCompleting ? (
                            <div className="flex gap-1 justify-center">
                              <Button
                                onClick={() => handleCompleteTask(task)}
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-green-600 hover:bg-green-50"
                                title="Marquer comme terminé"
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                onClick={handleCancelComplete}
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-red-600 hover:bg-red-50"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <Button
                              onClick={() => handleStartComplete(task)}
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs"
                            >
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Terminer
                            </Button>
                          )}
                        </>
                      )}
                      {task.status === 'COMPLETED' && (
                        <span className="text-xs text-green-600 font-medium flex items-center justify-center gap-1">
                          <CheckCircle className="h-3 w-3" />
                          Terminé
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {paginatedTasks.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <ClipboardCheck className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Aucune tâche trouvée</p>
        </div>
      )}

      {/* Pagination */}
      {filteredTasks.length > 0 && (
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
      )}
    </div>
  );
}
