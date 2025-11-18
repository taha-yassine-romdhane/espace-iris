import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ClipboardCheck, AlertCircle, Clock, User, UserCheck, Edit2 } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AddAppointmentForm } from '@/components/employee/patient-details-forms/AddAppointmentForm';

interface ManualTask {
  id: string;
  taskCode?: string;
  taskType: string;
  adminNotes?: string;
  employeeNotes?: string;
  status: string;
  completedAt?: Date;
  createdAt: Date;
  assignedTo: {
    id: string;
    firstName: string;
    lastName: string;
  };
  createdBy: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

interface PatientAppointmentsProps {
  manualTasks?: ManualTask[];
  isLoading?: boolean;
  patientId?: string;
  patientName?: string;
}

export const PatientAppointments = ({ manualTasks = [], isLoading = false, patientId, patientName }: PatientAppointmentsProps) => {
  const [showAddDialog, setShowAddDialog] = useState(false);

  const handleAddSuccess = () => {
    setShowAddDialog(false);
    // Data will be automatically refreshed by React Query invalidation
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

  const getTaskTypeLabel = (taskType: string) => {
    switch (taskType) {
      // Current AppointmentType enum values
      case 'POLYGRAPHIE':
        return 'Polygraphie';
      case 'CONSULTATION':
        return 'Consultation';
      case 'LOCATION':
        return 'Location';
      case 'VENTE':
        return 'Vente';
      case 'MAINTENANCE':
        return 'Maintenance';
      case 'RECUPERATION':
        return 'Récupération';

      // Legacy values for backward compatibility
      case 'DIAGNOSTIC':
        return 'Diagnostic';
      case 'INSTALLATION':
        return 'Installation';
      case 'PICKUP':
        return 'Récupération';
      case 'DELIVERY':
        return 'Livraison';
      case 'FOLLOW_UP':
        return 'Suivi';
      case 'OTHER':
        return 'Autre';
      default:
        return taskType;
    }
  };

  // Sort tasks by date (most recent first)
  const sortedTasks = [...manualTasks].sort((a, b) => {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  // Split tasks into pending and completed
  const pendingTasks = sortedTasks.filter(task => task.status === 'PENDING');
  const completedTasks = sortedTasks.filter(task => task.status === 'COMPLETED');
  const cancelledTasks = sortedTasks.filter(task => task.status === 'CANCELLED');

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5 text-blue-500" />
              Tâches manuelles
            </CardTitle>
            <CardDescription>
              Toutes les tâches assignées pour ce patient
            </CardDescription>
          </div>
          <Button
            variant="default"
            size="sm"
            onClick={() => setShowAddDialog(true)}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
          >
            <Edit2 className="h-4 w-4" />
            Gérer
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700"></div>
          </div>
        ) : sortedTasks.length > 0 ? (
          <div className="space-y-6">
            {/* Pending Tasks */}
            {pendingTasks.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-amber-700 bg-amber-50 px-3 py-2 rounded-lg mb-3">
                  Tâches en attente ({pendingTasks.length})
                </h3>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Code</TableHead>
                        <TableHead>Type de tâche</TableHead>
                        <TableHead>Assignée à</TableHead>
                        <TableHead>Créée par</TableHead>
                        <TableHead>Notes admin</TableHead>
                        <TableHead>Date création</TableHead>
                        <TableHead>Statut</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingTasks.map((task) => {
                        const createdDate = new Date(task.createdAt);

                        return (
                          <TableRow key={task.id} className="bg-amber-50/30">
                            <TableCell className="font-mono text-xs">
                              {task.taskCode || '-'}
                            </TableCell>
                            <TableCell className="font-medium">
                              {getTaskTypeLabel(task.taskType)}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <UserCheck className="h-3 w-3 text-blue-500" />
                                <span>{`${task.assignedTo.firstName} ${task.assignedTo.lastName}`}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <User className="h-3 w-3 text-gray-500" />
                                <span className="text-sm text-gray-600">
                                  {`${task.createdBy.firstName} ${task.createdBy.lastName}`}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="max-w-xs">
                              <div className="truncate text-sm">
                                {task.adminNotes || '-'}
                              </div>
                            </TableCell>
                            <TableCell className="whitespace-nowrap">
                              <div className="flex items-center gap-1 text-sm">
                                <Clock className="h-3 w-3 text-gray-400" />
                                {createdDate.toLocaleDateString('fr-FR')}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge className={getStatusColor(task.status)}>
                                {getStatusLabel(task.status)}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {/* Completed Tasks */}
            {completedTasks.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-green-700 bg-green-50 px-3 py-2 rounded-lg mb-3">
                  Tâches terminées ({completedTasks.length})
                </h3>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Code</TableHead>
                        <TableHead>Type de tâche</TableHead>
                        <TableHead>Assignée à</TableHead>
                        <TableHead>Notes admin</TableHead>
                        <TableHead>Notes employé</TableHead>
                        <TableHead>Date terminée</TableHead>
                        <TableHead>Statut</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {completedTasks.slice(0, 5).map((task) => {
                        const completedDate = task.completedAt ? new Date(task.completedAt) : null;

                        return (
                          <TableRow key={task.id} className="bg-green-50/20">
                            <TableCell className="font-mono text-xs">
                              {task.taskCode || '-'}
                            </TableCell>
                            <TableCell className="font-medium">
                              {getTaskTypeLabel(task.taskType)}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <UserCheck className="h-3 w-3 text-blue-500" />
                                <span>{`${task.assignedTo.firstName} ${task.assignedTo.lastName}`}</span>
                              </div>
                            </TableCell>
                            <TableCell className="max-w-xs">
                              <div className="truncate text-sm text-gray-600">
                                {task.adminNotes || '-'}
                              </div>
                            </TableCell>
                            <TableCell className="max-w-xs">
                              <div className="truncate text-sm">
                                {task.employeeNotes || '-'}
                              </div>
                            </TableCell>
                            <TableCell className="whitespace-nowrap">
                              {completedDate ? (
                                <div className="flex items-center gap-1 text-sm">
                                  <Clock className="h-3 w-3 text-gray-400" />
                                  {completedDate.toLocaleDateString('fr-FR')}
                                </div>
                              ) : '-'}
                            </TableCell>
                            <TableCell>
                              <Badge className={getStatusColor(task.status)}>
                                {getStatusLabel(task.status)}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                  {completedTasks.length > 5 && (
                    <div className="text-center mt-2">
                      <span className="text-xs text-gray-500">
                        + {completedTasks.length - 5} tâches terminées supplémentaires
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Cancelled Tasks */}
            {cancelledTasks.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-red-700 bg-red-50 px-3 py-2 rounded-lg mb-3">
                  Tâches annulées ({cancelledTasks.length})
                </h3>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Code</TableHead>
                        <TableHead>Type de tâche</TableHead>
                        <TableHead>Assignée à</TableHead>
                        <TableHead>Notes admin</TableHead>
                        <TableHead>Date création</TableHead>
                        <TableHead>Statut</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cancelledTasks.map((task) => {
                        const createdDate = new Date(task.createdAt);

                        return (
                          <TableRow key={task.id} className="bg-red-50/20">
                            <TableCell className="font-mono text-xs">
                              {task.taskCode || '-'}
                            </TableCell>
                            <TableCell className="font-medium text-gray-500">
                              {getTaskTypeLabel(task.taskType)}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <UserCheck className="h-3 w-3 text-gray-400" />
                                <span className="text-gray-500">{`${task.assignedTo.firstName} ${task.assignedTo.lastName}`}</span>
                              </div>
                            </TableCell>
                            <TableCell className="max-w-xs">
                              <div className="truncate text-sm text-gray-500">
                                {task.adminNotes || '-'}
                              </div>
                            </TableCell>
                            <TableCell className="whitespace-nowrap">
                              <div className="flex items-center gap-1 text-sm text-gray-500">
                                <Clock className="h-3 w-3 text-gray-400" />
                                {createdDate.toLocaleDateString('fr-FR')}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge className={getStatusColor(task.status)}>
                                {getStatusLabel(task.status)}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <AlertCircle className="h-10 w-10 mx-auto mb-2 text-gray-300" />
            <p>Aucune tâche assignée pour ce patient</p>
          </div>
        )}
      </CardContent>

      {/* Manage Appointments Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-700">
              <ClipboardCheck className="h-5 w-5 text-green-600" />
              Gérer les Tâches Manuelles
            </DialogTitle>
          </DialogHeader>
          {patientId && (
            <AddAppointmentForm
              patientId={patientId}
              manualTasks={manualTasks}
              onSuccess={handleAddSuccess}
            />
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default PatientAppointments;
