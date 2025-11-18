import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, AlertCircle, Plus, Save, X, Edit2, Trash2, Clock, MapPin, User } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Appointment {
  id: string;
  appointmentCode?: string;
  scheduledDate: string | Date;
  appointmentType: string;
  location: string;
  priority: string;
  status: string;
  notes?: string;
  assignedTo?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  createdBy?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  createdAt: string | Date;
}

interface PatientRDVProps {
  appointments?: Appointment[];
  isLoading?: boolean;
  patientId?: string;
}

const APPOINTMENT_TYPES = {
  POLYGRAPHIE: 'Polygraphie',
  CONSULTATION: 'Consultation',
  LOCATION: 'Location',
  VENTE: 'Vente',
  MAINTENANCE: 'Maintenance',
  RECUPERATION: 'Récupération',
};

const PRIORITY_LABELS = {
  LOW: 'Faible',
  NORMAL: 'Normal',
  HIGH: 'Élevée',
  URGENT: 'Urgent',
};

const STATUS_LABELS = {
  SCHEDULED: 'Planifié',
  CONFIRMED: 'Confirmé',
  COMPLETED: 'Terminé',
  CANCELLED: 'Annulé',
};

export const PatientRDV = ({ appointments = [], isLoading = false, patientId }: PatientRDVProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [editData, setEditData] = useState<Partial<Appointment> | null>(null);

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (appointment: Partial<Appointment>) => {
      const response = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(appointment),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create appointment');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({ title: 'Succès', description: 'Rendez-vous créé avec succès' });
      queryClient.invalidateQueries({ queryKey: ['patient', patientId] });
      setIsAddingNew(false);
      setEditData(null);
    },
    onError: (error: Error) => {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, ...appointment }: Partial<Appointment> & { id: string }) => {
      const response = await fetch(`/api/appointments/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(appointment),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update appointment');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({ title: 'Succès', description: 'Rendez-vous mis à jour avec succès' });
      queryClient.invalidateQueries({ queryKey: ['patient', patientId] });
      setEditingId(null);
      setEditData(null);
    },
    onError: (error: Error) => {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/appointments/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete appointment');
      return response.json();
    },
    onSuccess: () => {
      toast({ title: 'Succès', description: 'Rendez-vous supprimé avec succès' });
      queryClient.invalidateQueries({ queryKey: ['patient', patientId] });
    },
    onError: (error: Error) => {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    },
  });

  const handleAddNew = () => {
    const now = new Date();
    const scheduledDate = new Date(now.getTime() + 24 * 60 * 60 * 1000); // Tomorrow

    setEditData({
      scheduledDate: scheduledDate.toISOString().slice(0, 16),
      appointmentType: 'CONSULTATION',
      location: '',
      priority: 'NORMAL',
      status: 'SCHEDULED',
      notes: '',
      patientId,
    });
    setIsAddingNew(true);
  };

  const handleEdit = (appointment: Appointment) => {
    setEditingId(appointment.id);
    setEditData({
      ...appointment,
      scheduledDate: new Date(appointment.scheduledDate).toISOString().slice(0, 16),
    });
  };

  const handleSaveNew = () => {
    if (!editData) return;
    if (!editData.scheduledDate || !editData.location) {
      toast({ title: 'Erreur', description: 'Date et lieu sont requis', variant: 'destructive' });
      return;
    }
    createMutation.mutate(editData);
  };

  const handleSaveEdit = () => {
    if (!editingId || !editData) return;
    updateMutation.mutate({ id: editingId, ...editData });
  };

  const handleDelete = (id: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce rendez-vous ?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleCancel = () => {
    setIsAddingNew(false);
    setEditingId(null);
    setEditData(null);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SCHEDULED':
        return 'bg-blue-100 text-blue-800';
      case 'CONFIRMED':
        return 'bg-green-100 text-green-800';
      case 'COMPLETED':
        return 'bg-gray-100 text-gray-800';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'LOW':
        return 'bg-gray-100 text-gray-700';
      case 'NORMAL':
        return 'bg-blue-100 text-blue-700';
      case 'HIGH':
        return 'bg-orange-100 text-orange-700';
      case 'URGENT':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const sortedAppointments = [...appointments].sort((a, b) => {
    return new Date(b.scheduledDate).getTime() - new Date(a.scheduledDate).getTime();
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-500" />
            Rendez-vous
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-500" />
              Rendez-vous
            </CardTitle>
            <CardDescription>
              Gérer les rendez-vous du patient
            </CardDescription>
          </div>
          {patientId && (
            <Button
              variant="default"
              size="sm"
              onClick={handleAddNew}
              disabled={isAddingNew || editingId !== null}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
            >
              <Plus className="h-4 w-4" />
              Ajouter
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[150px]">Date & Heure</TableHead>
                <TableHead className="min-w-[120px]">Type</TableHead>
                <TableHead className="min-w-[150px]">Lieu</TableHead>
                <TableHead className="min-w-[100px]">Priorité</TableHead>
                <TableHead className="min-w-[100px]">Statut</TableHead>
                <TableHead className="min-w-[150px]">Assigné à</TableHead>
                <TableHead className="min-w-[200px]">Notes</TableHead>
                <TableHead className="min-w-[120px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* Add New Row */}
              {isAddingNew && editData && (
                <TableRow className="bg-green-50">
                  {/* Date & Heure */}
                  <TableCell>
                    <Input
                      type="datetime-local"
                      value={editData.scheduledDate || ''}
                      onChange={(e) => setEditData({ ...editData, scheduledDate: e.target.value })}
                      className="text-xs h-7"
                    />
                  </TableCell>

                  {/* Type */}
                  <TableCell>
                    <Select
                      value={editData.appointmentType || 'CONSULTATION'}
                      onValueChange={(value) => setEditData({ ...editData, appointmentType: value })}
                    >
                      <SelectTrigger className="text-xs h-7">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(APPOINTMENT_TYPES).map(([value, label]) => (
                          <SelectItem key={value} value={value}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>

                  {/* Lieu */}
                  <TableCell>
                    <Input
                      type="text"
                      placeholder="Lieu"
                      value={editData.location || ''}
                      onChange={(e) => setEditData({ ...editData, location: e.target.value })}
                      className="text-xs h-7"
                    />
                  </TableCell>

                  {/* Priorité */}
                  <TableCell>
                    <Select
                      value={editData.priority || 'NORMAL'}
                      onValueChange={(value) => setEditData({ ...editData, priority: value })}
                    >
                      <SelectTrigger className="text-xs h-7">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>

                  {/* Statut */}
                  <TableCell>
                    <Select
                      value={editData.status || 'SCHEDULED'}
                      onValueChange={(value) => setEditData({ ...editData, status: value })}
                    >
                      <SelectTrigger className="text-xs h-7">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(STATUS_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>

                  {/* Assigné à */}
                  <TableCell>
                    <div className="text-xs text-gray-400">Auto-assigné</div>
                  </TableCell>

                  {/* Notes */}
                  <TableCell>
                    <Textarea
                      value={editData.notes || ''}
                      onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
                      className="text-xs min-h-[60px]"
                      placeholder="Notes..."
                    />
                  </TableCell>

                  {/* Actions */}
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="sm" onClick={handleSaveNew} className="h-7 bg-green-600 hover:bg-green-700">
                        <Save className="h-3 w-3" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={handleCancel} className="h-7">
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )}

              {/* Existing Rows */}
              {sortedAppointments.map((appointment) => {
                const isEditing = editingId === appointment.id;

                if (isEditing && editData) {
                  return (
                    <TableRow key={appointment.id} className="bg-blue-50">
                      {/* Date & Heure */}
                      <TableCell>
                        <Input
                          type="datetime-local"
                          value={editData.scheduledDate || ''}
                          onChange={(e) => setEditData({ ...editData, scheduledDate: e.target.value })}
                          className="text-xs h-7"
                        />
                      </TableCell>

                      {/* Type */}
                      <TableCell>
                        <Select
                          value={editData.appointmentType || 'CONSULTATION'}
                          onValueChange={(value) => setEditData({ ...editData, appointmentType: value })}
                        >
                          <SelectTrigger className="text-xs h-7">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(APPOINTMENT_TYPES).map(([value, label]) => (
                              <SelectItem key={value} value={value}>{label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>

                      {/* Lieu */}
                      <TableCell>
                        <Input
                          type="text"
                          value={editData.location || ''}
                          onChange={(e) => setEditData({ ...editData, location: e.target.value })}
                          className="text-xs h-7"
                        />
                      </TableCell>

                      {/* Priorité */}
                      <TableCell>
                        <Select
                          value={editData.priority || 'NORMAL'}
                          onValueChange={(value) => setEditData({ ...editData, priority: value })}
                        >
                          <SelectTrigger className="text-xs h-7">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
                              <SelectItem key={value} value={value}>{label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>

                      {/* Statut */}
                      <TableCell>
                        <Select
                          value={editData.status || 'SCHEDULED'}
                          onValueChange={(value) => setEditData({ ...editData, status: value })}
                        >
                          <SelectTrigger className="text-xs h-7">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(STATUS_LABELS).map(([value, label]) => (
                              <SelectItem key={value} value={value}>{label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>

                      {/* Assigné à */}
                      <TableCell>
                        <div className="text-xs text-gray-600">
                          {appointment.assignedTo?.firstName} {appointment.assignedTo?.lastName}
                        </div>
                      </TableCell>

                      {/* Notes */}
                      <TableCell>
                        <Textarea
                          value={editData.notes || ''}
                          onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
                          className="text-xs min-h-[60px]"
                          placeholder="Notes..."
                        />
                      </TableCell>

                      {/* Actions */}
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="sm" onClick={handleSaveEdit} className="h-7 bg-blue-600 hover:bg-blue-700">
                            <Save className="h-3 w-3" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={handleCancel} className="h-7">
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                }

                // Display Row
                return (
                  <TableRow key={appointment.id} className="hover:bg-gray-50">
                    {/* Date & Heure */}
                    <TableCell>
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="h-4 w-4 text-blue-500" />
                        <div>
                          <div className="font-medium">
                            {format(new Date(appointment.scheduledDate), 'dd MMM yyyy', { locale: fr })}
                          </div>
                          <div className="text-xs text-gray-500">
                            {format(new Date(appointment.scheduledDate), 'HH:mm')}
                          </div>
                        </div>
                      </div>
                    </TableCell>

                    {/* Type */}
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {APPOINTMENT_TYPES[appointment.appointmentType as keyof typeof APPOINTMENT_TYPES] || appointment.appointmentType}
                      </Badge>
                    </TableCell>

                    {/* Lieu */}
                    <TableCell>
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="h-4 w-4 text-gray-400" />
                        <span>{appointment.location}</span>
                      </div>
                    </TableCell>

                    {/* Priorité */}
                    <TableCell>
                      <Badge className={getPriorityColor(appointment.priority)}>
                        {PRIORITY_LABELS[appointment.priority as keyof typeof PRIORITY_LABELS] || appointment.priority}
                      </Badge>
                    </TableCell>

                    {/* Statut */}
                    <TableCell>
                      <Badge className={getStatusColor(appointment.status)}>
                        {STATUS_LABELS[appointment.status as keyof typeof STATUS_LABELS] || appointment.status}
                      </Badge>
                    </TableCell>

                    {/* Assigné à */}
                    <TableCell>
                      {appointment.assignedTo && (
                        <div className="flex items-center gap-2 text-sm">
                          <User className="h-4 w-4 text-gray-400" />
                          <span>
                            {appointment.assignedTo.firstName} {appointment.assignedTo.lastName}
                          </span>
                        </div>
                      )}
                    </TableCell>

                    {/* Notes */}
                    <TableCell>
                      <div className="text-xs text-gray-600 max-w-[200px] truncate" title={appointment.notes || ''}>
                        {appointment.notes || '-'}
                      </div>
                    </TableCell>

                    {/* Actions */}
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(appointment)}
                          disabled={isAddingNew || editingId !== null}
                          className="h-7"
                        >
                          <Edit2 className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDelete(appointment.id)}
                          disabled={isAddingNew || editingId !== null}
                          className="h-7 text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}

              {!isAddingNew && sortedAppointments.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                    <AlertCircle className="h-10 w-10 mx-auto mb-2 text-gray-300" />
                    <p>Aucun rendez-vous pour ce patient</p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Summary */}
        {sortedAppointments.length > 0 && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
            <div className="text-center">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Total RDV</p>
              <p className="text-2xl font-bold text-gray-900">{sortedAppointments.length}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Planifiés</p>
              <p className="text-2xl font-bold text-blue-600">
                {sortedAppointments.filter((a) => a.status === 'SCHEDULED').length}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Confirmés</p>
              <p className="text-2xl font-bold text-green-600">
                {sortedAppointments.filter((a) => a.status === 'CONFIRMED').length}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Terminés</p>
              <p className="text-2xl font-bold text-gray-600">
                {sortedAppointments.filter((a) => a.status === 'COMPLETED').length}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PatientRDV;
