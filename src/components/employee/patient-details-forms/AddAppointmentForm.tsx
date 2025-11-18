import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { Plus, Save, X, Edit2, AlertCircle, Check, CheckCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useSession } from 'next-auth/react';

interface ManualTask {
  id?: string;
  taskType: string;
  assignedToId: string;
  adminNotes?: string;
  assignedTo?: {
    firstName: string;
    lastName: string;
  };
  status?: string;
  createdAt?: Date;
}

interface AddAppointmentFormProps {
  patientId: string;
  manualTasks: any[];
  onSuccess: () => void;
}

export const AddAppointmentForm: React.FC<AddAppointmentFormProps> = ({
  patientId,
  manualTasks,
  onSuccess
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: session } = useSession();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [newRow, setNewRow] = useState<Partial<ManualTask> | null>(null);
  const [editData, setEditData] = useState<Partial<ManualTask>>({});
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [employeeNotes, setEmployeeNotes] = useState<string>('');

  // Check if user is admin
  const isAdmin = session?.user?.role === 'ADMIN';

  // Fetch employees and admins for task assignment (exclude doctors)
  const { data: employeesData } = useQuery({
    queryKey: ['employees-and-admins'],
    queryFn: async () => {
      const response = await fetch('/api/users?role=EMPLOYEE_AND_ADMIN');
      if (!response.ok) throw new Error('Failed to fetch employees');
      return response.json();
    },
  });

  const employees = employeesData?.users || [];

  const taskTypes = [
    { value: 'POLYGRAPHIE', label: 'Polygraphie' },
    { value: 'CONSULTATION', label: 'Consultation' },
    { value: 'LOCATION', label: 'Location' },
    { value: 'VENTE', label: 'Vente' },
    { value: 'MAINTENANCE', label: 'Maintenance' },
    { value: 'RECUPERATION', label: 'Récupération' },
  ];

  const getTaskTypeLabel = (type: string) => {
    return taskTypes.find(t => t.value === type)?.label || type;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-amber-100 text-amber-800';
      case 'COMPLETED':
        return 'bg-green-100 text-green-800';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'En attente';
      case 'COMPLETED':
        return 'Terminée';
      case 'CANCELLED':
        return 'Annulée';
      default:
        return status;
    }
  };

  // Create task mutation
  const createMutation = useMutation({
    mutationFn: async (data: Partial<ManualTask>) => {
      const response = await fetch('/api/manual-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskType: data.taskType,
          patientId,
          assignedToId: data.assignedToId,
          adminNotes: data.adminNotes || '',
        }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create task');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patient', patientId] });
      toast({ title: 'Succès', description: 'Tâche créée avec succès' });
      setNewRow(null);
      onSuccess();
    },
    onError: (error: Error) => {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    },
  });

  // Update task mutation (for admin edits)
  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      const response = await fetch(`/api/manual-tasks/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update task');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patient', patientId] });
      toast({ title: 'Succès', description: 'Tâche mise à jour' });
      setEditingId(null);
      onSuccess();
    },
    onError: (error: Error) => {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    },
  });

  // Complete task mutation (for employees)
  const completeMutation = useMutation({
    mutationFn: async (data: { id: string; employeeNotes: string; status: string }) => {
      const response = await fetch(`/api/manual-tasks/${data.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to complete task');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patient', patientId] });
      toast({ title: 'Succès', description: 'Tâche marquée comme terminée' });
      setCompletingId(null);
      setEmployeeNotes('');
      onSuccess();
    },
    onError: (error: Error) => {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    },
  });

  const handleAddNew = () => {
    setNewRow({
      taskType: '',
      assignedToId: '',
      adminNotes: '',
    });
    setEditingId(null);
  };

  const handleSaveNew = () => {
    if (!newRow?.taskType) {
      toast({ title: 'Erreur', description: 'Veuillez sélectionner un type de tâche', variant: 'destructive' });
      return;
    }
    if (!newRow?.assignedToId) {
      toast({ title: 'Erreur', description: 'Veuillez assigner la tâche à un employé', variant: 'destructive' });
      return;
    }
    createMutation.mutate(newRow);
  };

  const handleEdit = (task: any) => {
    setEditData({
      id: task.id,
      taskType: task.taskType,
      assignedToId: task.assignedTo?.id || task.assignedToId,
      adminNotes: task.adminNotes || '',
    });
    setEditingId(task.id);
    setNewRow(null);
  };

  const handleSaveEdit = () => {
    updateMutation.mutate(editData);
  };

  const handleStartComplete = (task: any) => {
    setCompletingId(task.id);
    setEmployeeNotes(task.employeeNotes || '');
  };

  const handleCancelComplete = () => {
    setCompletingId(null);
    setEmployeeNotes('');
  };

  const handleCompleteTask = (taskId: string) => {
    completeMutation.mutate({
      id: taskId,
      employeeNotes,
      status: 'COMPLETED',
    });
  };

  return (
    <div className="space-y-4">
      {/* Add Button - Only for Admin */}
      {isAdmin && (
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-semibold text-gray-700">
            {manualTasks.length} tâche(s)
          </h3>
          <Button
            onClick={handleAddNew}
            disabled={!!newRow}
            className="bg-green-600 hover:bg-green-700"
            size="sm"
          >
            <Plus className="h-4 w-4 mr-2" />
            Ajouter
          </Button>
        </div>
      )}

      {/* Employee view - just count */}
      {!isAdmin && (
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-semibold text-gray-700">
            {manualTasks.length} tâche(s)
          </h3>
          <span className="text-xs text-gray-500">Cliquez sur "Terminer" pour marquer une tâche comme complétée</span>
        </div>
      )}

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-semibold text-slate-700">Type</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-slate-700">Assignée à</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-slate-700">Notes / Instructions</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-slate-700">Statut</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-slate-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {/* New Row - Only for Admin */}
              {isAdmin && newRow && (
                <tr className="bg-green-50 border-b-2 border-green-200">
                  <td className="px-3 py-2">
                    <Select
                      value={newRow.taskType}
                      onValueChange={(value) => setNewRow({ ...newRow, taskType: value })}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Sélectionner" />
                      </SelectTrigger>
                      <SelectContent>
                        {taskTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-3 py-2">
                    <Select
                      value={newRow.assignedToId}
                      onValueChange={(value) => setNewRow({ ...newRow, assignedToId: value })}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Sélectionner" />
                      </SelectTrigger>
                      <SelectContent>
                        {employees.map((employee: any) => (
                          <SelectItem key={employee.id} value={employee.id}>
                            {employee.firstName} {employee.lastName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-3 py-2">
                    <Textarea
                      value={newRow.adminNotes || ''}
                      onChange={(e) => setNewRow({ ...newRow, adminNotes: e.target.value })}
                      className="min-h-[32px] text-xs"
                      placeholder="Notes / Instructions"
                      rows={1}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Badge className="bg-amber-100 text-amber-800 text-xs">
                      En attente
                    </Badge>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex gap-1">
                      <Button
                        onClick={handleSaveNew}
                        disabled={createMutation.isPending}
                        className="h-7 px-2 bg-green-600 hover:bg-green-700"
                        size="sm"
                      >
                        <Save className="h-3 w-3" />
                      </Button>
                      <Button
                        onClick={() => setNewRow(null)}
                        variant="outline"
                        className="h-7 px-2"
                        size="sm"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </td>
                </tr>
              )}

              {/* Existing Rows */}
              {manualTasks.map((task: any) => {
                const isEditing = editingId === task.id;

                // Edit row - Only for Admin
                if (isAdmin && isEditing) {
                  return (
                    <tr key={task.id} className="bg-blue-50 border-b-2 border-blue-200">
                      <td className="px-3 py-2">
                        <div className="text-xs font-medium">
                          {getTaskTypeLabel(task.taskType)}
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <Select
                          value={editData.assignedToId}
                          onValueChange={(value) => setEditData({ ...editData, assignedToId: value })}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {employees.map((employee: any) => (
                              <SelectItem key={employee.id} value={employee.id}>
                                {employee.firstName} {employee.lastName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-3 py-2">
                        <Textarea
                          value={editData.adminNotes || ''}
                          onChange={(e) => setEditData({ ...editData, adminNotes: e.target.value })}
                          className="min-h-[32px] text-xs"
                          rows={1}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Badge className={`${getStatusColor(task.status)} text-xs`}>
                          {getStatusLabel(task.status)}
                        </Badge>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex gap-1">
                          <Button
                            onClick={handleSaveEdit}
                            disabled={updateMutation.isPending}
                            className="h-7 px-2 bg-blue-600 hover:bg-blue-700"
                            size="sm"
                          >
                            <Save className="h-3 w-3" />
                          </Button>
                          <Button
                            onClick={() => setEditingId(null)}
                            variant="outline"
                            className="h-7 px-2"
                            size="sm"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                }

                const isCompleting = completingId === task.id;

                return (
                  <tr key={task.id} className={`border-b ${isCompleting ? 'bg-green-50' : 'hover:bg-gray-50'}`}>
                    <td className="px-3 py-2">
                      <span className="text-xs font-medium">{getTaskTypeLabel(task.taskType)}</span>
                    </td>
                    <td className="px-3 py-2">
                      <span className="text-xs">{task.assignedTo ? `${task.assignedTo.firstName} ${task.assignedTo.lastName}` : '-'}</span>
                    </td>
                    <td className="px-3 py-2">
                      {/* Admin Notes */}
                      <span className="text-xs text-gray-600">{task.adminNotes || '-'}</span>
                      {/* Employee Notes - show below admin notes or in textarea if completing */}
                      {!isAdmin && !isCompleting && task.employeeNotes && (
                        <div className="mt-1 text-xs text-blue-600 italic">Mes notes: {task.employeeNotes}</div>
                      )}
                      {!isAdmin && isCompleting && (
                        <Textarea
                          value={employeeNotes}
                          onChange={(e) => setEmployeeNotes(e.target.value)}
                          placeholder="Ajouter vos notes..."
                          className="mt-1 h-16 text-xs"
                        />
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <Badge className={`${getStatusColor(task.status)} text-xs`}>
                        {getStatusLabel(task.status)}
                      </Badge>
                    </td>
                    <td className="px-3 py-2">
                      {/* Admin: Edit button */}
                      {isAdmin && (
                        <Button
                          onClick={() => handleEdit(task)}
                          variant="ghost"
                          className="h-7 px-2 hover:bg-blue-100"
                          size="sm"
                          disabled={task.status === 'COMPLETED' || task.status === 'CANCELLED'}
                        >
                          <Edit2 className="h-3 w-3" />
                        </Button>
                      )}
                      {/* Employee: Terminer button */}
                      {!isAdmin && task.status === 'PENDING' && (
                        <>
                          {isCompleting ? (
                            <div className="flex gap-1">
                              <Button
                                onClick={() => handleCompleteTask(task.id)}
                                disabled={completeMutation.isPending}
                                variant="ghost"
                                className="h-7 px-2 text-green-600 hover:bg-green-50"
                                size="sm"
                              >
                                <Check className="h-3 w-3" />
                              </Button>
                              <Button
                                onClick={handleCancelComplete}
                                variant="ghost"
                                className="h-7 px-2 text-red-600 hover:bg-red-50"
                                size="sm"
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : (
                            <Button
                              onClick={() => handleStartComplete(task)}
                              variant="outline"
                              className="h-7 text-xs"
                              size="sm"
                            >
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Terminer
                            </Button>
                          )}
                        </>
                      )}
                      {!isAdmin && task.status === 'COMPLETED' && (
                        <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" />
                          Terminé
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}

              {manualTasks.length === 0 && !newRow && (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-gray-500 text-sm">
                    <AlertCircle className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                    Aucune tâche. Cliquez sur "Ajouter" pour commencer.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AddAppointmentForm;
