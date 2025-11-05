import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  User, 
  Phone, 
  FileText, 
  AlertCircle,
  ArrowLeft,
  Edit,
  Save,
  X,
  Building2,
  Mail,
  UserPlus,
  Stethoscope,
  Home,
  Microscope,
  ShoppingCart,
  Package,
  Wrench,
  RotateCcw,
  CheckCircle,
  XCircle,
  AlertTriangle,
  History,
  Loader2
} from 'lucide-react';

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}

interface Appointment {
  id: string;
  appointmentType: string;
  scheduledDate: string;
  location: string;
  notes?: string;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  status: 'SCHEDULED' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';
  assignedTo?: Employee;
  assignedToId?: string;
  patient?: {
    id: string;
    firstName: string;
    lastName: string;
    telephone: string;
    email?: string;
    governorate?: string;
    delegation?: string;
    detailedAddress?: string;
  };
  company?: {
    id: string;
    companyName: string;
    telephone: string;
    email?: string;
    fiscalNumber?: string;
    address?: string;
  };
  createdAt: string;
  updatedAt: string;
  createdBy?: Employee;
}

const statusOptions = [
  { value: 'SCHEDULED', label: 'Planifié', color: 'bg-blue-100 text-blue-800', icon: Clock },
  { value: 'CONFIRMED', label: 'Confirmé', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  { value: 'COMPLETED', label: 'Terminé', color: 'bg-emerald-100 text-emerald-800', icon: CheckCircle },
  { value: 'CANCELLED', label: 'Annulé', color: 'bg-red-100 text-red-800', icon: XCircle }
];

const priorityOptions = [
  { value: 'LOW', label: 'Faible', color: 'bg-gray-100 text-gray-800' },
  { value: 'NORMAL', label: 'Normal', color: 'bg-blue-100 text-blue-800' },
  { value: 'HIGH', label: 'Élevé', color: 'bg-orange-100 text-orange-800' },
  { value: 'URGENT', label: 'Urgent', color: 'bg-red-100 text-red-800' }
];

const appointmentTypes = [
  { value: 'DIAGNOSTIC_VISIT', label: 'Visite Diagnostique', icon: Home, color: 'purple' },
  { value: 'CONSULTATION', label: 'Consultation', icon: Stethoscope, color: 'blue' },
  { value: 'DIAGNOSTIC', label: 'Diagnostic', icon: Microscope, color: 'teal' },
  { value: 'LOCATION', label: 'Location', icon: Package, color: 'orange' },
  { value: 'VENTE', label: 'Vente', icon: ShoppingCart, color: 'green' },
  { value: 'MAINTENANCE', label: 'Maintenance', icon: Wrench, color: 'yellow' },
  { value: 'RECUPERATION', label: 'Récupération', icon: RotateCcw, color: 'indigo' }
];

function AppointmentDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  
  // Edit form state
  const [editedData, setEditedData] = useState({
    appointmentType: '',
    scheduledDate: '',
    location: '',
    notes: '',
    priority: '',
    status: '',
    assignedToId: ''
  });

  // Fetch appointment details
  const { data: appointment, isLoading, error } = useQuery<Appointment>({
    queryKey: ['appointment', id],
    queryFn: async () => {
      const response = await fetch(`/api/appointments/${id}`);
      if (!response.ok) throw new Error('Failed to fetch appointment');
      const data = await response.json();
      return data.appointment || data;
    },
    enabled: !!id && router.isReady,
  });

  // Fetch available employees for assignment
  const { data: employees } = useQuery<Employee[]>({
    queryKey: ['employees'],
    queryFn: async () => {
      const response = await fetch('/api/users?role=TECHNICIAN,EMPLOYEE');
      if (!response.ok) return [];
      const data = await response.json();
      return data.users || [];
    },
  });

  // Initialize edit form when appointment loads
  useEffect(() => {
    if (appointment && !isEditing) {
      setEditedData({
        appointmentType: appointment.appointmentType || '',
        scheduledDate: appointment.scheduledDate ? 
          new Date(appointment.scheduledDate).toISOString().slice(0, 16) : '',
        location: appointment.location || '',
        notes: appointment.notes || '',
        priority: appointment.priority || 'NORMAL',
        status: appointment.status || 'SCHEDULED',
        assignedToId: appointment.assignedToId || appointment.assignedTo?.id || 'unassigned'
      });
    }
  }, [appointment, isEditing]);

  // Update appointment mutation
  const updateAppointmentMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch(`/api/appointments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update appointment');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointment', id] });
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      setIsEditing(false);
      toast({
        title: "Rendez-vous mis à jour",
        description: "Les modifications ont été sauvegardées avec succès.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le rendez-vous.",
        variant: "destructive",
      });
    },
  });

  // Delete appointment mutation
  const deleteAppointmentMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/appointments/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete appointment');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Rendez-vous supprimé",
        description: "Le rendez-vous a été supprimé avec succès.",
      });
      router.push('/roles/admin/dashboard');
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le rendez-vous.",
        variant: "destructive",
      });
    },
  });

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSave = () => {
    const dataToSend = {
      ...editedData,
      scheduledDate: new Date(editedData.scheduledDate).toISOString(),
      assignedToId: editedData.assignedToId === 'unassigned' ? null : editedData.assignedToId
    };
    updateAppointmentMutation.mutate(dataToSend);
  };

  const handleCancel = () => {
    setIsEditing(false);
    // Reset to original values
    if (appointment) {
      setEditedData({
        appointmentType: appointment.appointmentType || '',
        scheduledDate: appointment.scheduledDate ? 
          new Date(appointment.scheduledDate).toISOString().slice(0, 16) : '',
        location: appointment.location || '',
        notes: appointment.notes || '',
        priority: appointment.priority || 'NORMAL',
        status: appointment.status || 'SCHEDULED',
        assignedToId: appointment.assignedToId || appointment.assignedTo?.id || 'unassigned'
      });
    }
  };

  const handleDelete = () => {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce rendez-vous ?')) {
      deleteAppointmentMutation.mutate();
    }
  };

  const getAppointmentTypeInfo = (type: string) => {
    return appointmentTypes.find(t => t.value === type) || appointmentTypes[0];
  };

  const getStatusInfo = (status: string) => {
    return statusOptions.find(s => s.value === status) || statusOptions[0];
  };

  const getPriorityInfo = (priority: string) => {
    return priorityOptions.find(p => p.value === priority) || priorityOptions[1];
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error || !appointment) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Rendez-vous introuvable
              </h2>
              <p className="text-gray-600 mb-4">
                Le rendez-vous demandé n'existe pas ou a été supprimé.
              </p>
              <Button onClick={() => router.push('/roles/admin/dashboard')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Retour au tableau de bord
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const clientName = appointment.patient 
    ? `${appointment.patient.firstName} ${appointment.patient.lastName}`
    : appointment.company?.companyName || 'Client inconnu';

  const clientPhone = appointment.patient?.telephone || appointment.company?.telephone || '';
  const clientEmail = appointment.patient?.email || appointment.company?.email || '';
  const typeInfo = getAppointmentTypeInfo(appointment.appointmentType);
  const statusInfo = getStatusInfo(appointment.status);
  const priorityInfo = getPriorityInfo(appointment.priority);
  const TypeIcon = typeInfo.icon;
  const StatusIcon = statusInfo.icon;

  return (
    <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              onClick={() => router.push('/roles/admin/dashboard')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Détails du rendez-vous
              </h1>
              <p className="text-gray-600">ID: {appointment.id}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {!isEditing ? (
              <>
                <Button onClick={handleEdit}>
                  <Edit className="h-4 w-4 mr-2" />
                  Modifier
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={handleDelete}
                  disabled={deleteAppointmentMutation.isPending}
                >
                  {deleteAppointmentMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 mr-2" />
                  )}
                  Supprimer
                </Button>
              </>
            ) : (
              <div className="flex gap-2">
                <Button 
                  onClick={handleSave}
                  disabled={updateAppointmentMutation.isPending}
                >
                  {updateAppointmentMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Sauvegarder
                </Button>
                <Button variant="outline" onClick={handleCancel}>
                  <X className="h-4 w-4 mr-2" />
                  Annuler
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Client & Assignment */}
          <div className="space-y-6">
            {/* Client Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {appointment.patient ? (
                    <User className="h-5 w-5" />
                  ) : (
                    <Building2 className="h-5 w-5" />
                  )}
                  Information Client
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600">Nom</p>
                  <p className="font-medium">{clientName}</p>
                </div>
                
                {clientPhone && (
                  <div>
                    <p className="text-sm text-gray-600">Téléphone</p>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-gray-400" />
                      <a href={`tel:${clientPhone}`} className="font-medium text-blue-600 hover:underline">
                        {clientPhone}
                      </a>
                    </div>
                  </div>
                )}
                
                {clientEmail && (
                  <div>
                    <p className="text-sm text-gray-600">Email</p>
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-gray-400" />
                      <a href={`mailto:${clientEmail}`} className="font-medium text-blue-600 hover:underline">
                        {clientEmail}
                      </a>
                    </div>
                  </div>
                )}
                
                {appointment.patient?.governorate && (
                  <div>
                    <p className="text-sm text-gray-600">Adresse</p>
                    <p className="font-medium">
                      {appointment.patient.governorate}
                      {appointment.patient.delegation && `, ${appointment.patient.delegation}`}
                    </p>
                    {appointment.patient.detailedAddress && (
                      <p className="text-sm text-gray-600 mt-1">
                        {appointment.patient.detailedAddress}
                      </p>
                    )}
                  </div>
                )}
                
                {appointment.company?.address && (
                  <div>
                    <p className="text-sm text-gray-600">Adresse</p>
                    <p className="font-medium">{appointment.company.address}</p>
                  </div>
                )}
                
                <div>
                  <p className="text-sm text-gray-600">Type</p>
                  <Badge variant="outline">
                    {appointment.patient ? 'Patient' : 'Société'}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Assignment */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserPlus className="h-5 w-5" />
                  Assignation
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {!isEditing ? (
                  <>
                    {appointment.assignedTo ? (
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center text-white font-semibold">
                          {appointment.assignedTo.firstName.charAt(0)}
                          {appointment.assignedTo.lastName.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium">
                            {appointment.assignedTo.firstName} {appointment.assignedTo.lastName}
                          </p>
                          <p className="text-sm text-gray-600">{appointment.assignedTo.role}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-4">
                        <User className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-gray-500">Non assigné</p>
                      </div>
                    )}
                  </>
                ) : (
                  <div>
                    <Label htmlFor="assignedTo">Assigner à</Label>
                    <Select
                      value={editedData.assignedToId}
                      onValueChange={(value) => setEditedData({...editedData, assignedToId: value})}
                    >
                      <SelectTrigger id="assignedTo">
                        <SelectValue placeholder="Sélectionner un employé" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unassigned">Non assigné</SelectItem>
                        {employees?.map((emp) => (
                          <SelectItem key={emp.id} value={emp.id}>
                            {emp.firstName} {emp.lastName} - {emp.role}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                
                {appointment.createdBy && (
                  <div className="pt-4 border-t">
                    <p className="text-sm text-gray-600 mb-2">Créé par</p>
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 text-sm">
                        {appointment.createdBy.firstName.charAt(0)}
                        {appointment.createdBy.lastName.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          {appointment.createdBy.firstName} {appointment.createdBy.lastName}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Middle Column - Appointment Details */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Détails du Rendez-vous
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Type */}
                <div>
                  <Label htmlFor="type">Type de rendez-vous</Label>
                  {!isEditing ? (
                    <div className="flex items-center gap-2 mt-2">
                      <TypeIcon className={`h-5 w-5 text-${typeInfo.color}-600`} />
                      <Badge className={`bg-${typeInfo.color}-100 text-${typeInfo.color}-800`}>
                        {typeInfo.label}
                      </Badge>
                    </div>
                  ) : (
                    <Select
                      value={editedData.appointmentType}
                      onValueChange={(value) => setEditedData({...editedData, appointmentType: value})}
                    >
                      <SelectTrigger id="type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {appointmentTypes.map((type) => {
                          const Icon = type.icon;
                          return (
                            <SelectItem key={type.value} value={type.value}>
                              <div className="flex items-center gap-2">
                                <Icon className="h-4 w-4" />
                                {type.label}
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                {/* Date and Time */}
                <div>
                  <Label htmlFor="date">Date et heure</Label>
                  {!isEditing ? (
                    <div className="flex items-center gap-2 mt-2">
                      <Clock className="h-4 w-4 text-gray-400" />
                      <p className="font-medium">
                        {new Date(appointment.scheduledDate).toLocaleDateString('fr-FR', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })} à {new Date(appointment.scheduledDate).toLocaleTimeString('fr-FR', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  ) : (
                    <Input
                      id="date"
                      type="datetime-local"
                      value={editedData.scheduledDate}
                      onChange={(e) => setEditedData({...editedData, scheduledDate: e.target.value})}
                      className="mt-2"
                    />
                  )}
                </div>

                {/* Location */}
                <div>
                  <Label htmlFor="location">Lieu</Label>
                  {!isEditing ? (
                    <div className="flex items-center gap-2 mt-2">
                      <MapPin className="h-4 w-4 text-gray-400" />
                      <p className="font-medium">{appointment.location || 'Non spécifié'}</p>
                    </div>
                  ) : (
                    <Input
                      id="location"
                      value={editedData.location}
                      onChange={(e) => setEditedData({...editedData, location: e.target.value})}
                      placeholder="Entrer le lieu"
                      className="mt-2"
                    />
                  )}
                </div>

                {/* Priority */}
                <div>
                  <Label htmlFor="priority">Priorité</Label>
                  {!isEditing ? (
                    <Badge className={`${priorityInfo.color} mt-2`}>
                      {priorityInfo.label}
                    </Badge>
                  ) : (
                    <Select
                      value={editedData.priority}
                      onValueChange={(value) => setEditedData({...editedData, priority: value})}
                    >
                      <SelectTrigger id="priority">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {priorityOptions.map((priority) => (
                          <SelectItem key={priority.value} value={priority.value}>
                            {priority.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <StatusIcon className={`h-5 w-5 text-${statusInfo.color.includes('blue') ? 'blue' : 
                    statusInfo.color.includes('green') ? 'green' : 
                    statusInfo.color.includes('emerald') ? 'emerald' : 
                    'red'}-600`} />
                  Statut
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!isEditing ? (
                  <Badge className={`${statusInfo.color}`}>
                    {statusInfo.label}
                  </Badge>
                ) : (
                  <Select
                    value={editedData.status}
                    onValueChange={(value) => setEditedData({...editedData, status: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map((status) => {
                        const Icon = status.icon;
                        return (
                          <SelectItem key={status.value} value={status.value}>
                            <div className="flex items-center gap-2">
                              <Icon className="h-4 w-4" />
                              {status.label}
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Notes & History */}
          <div className="space-y-6">
            {/* Notes */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Notes
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!isEditing ? (
                  <div className="bg-gray-50 rounded-lg p-4 min-h-[150px]">
                    {appointment.notes ? (
                      <p className="text-gray-900 whitespace-pre-wrap">{appointment.notes}</p>
                    ) : (
                      <p className="text-gray-500 italic">Aucune note</p>
                    )}
                  </div>
                ) : (
                  <Textarea
                    value={editedData.notes}
                    onChange={(e) => setEditedData({...editedData, notes: e.target.value})}
                    placeholder="Ajouter des notes..."
                    rows={6}
                    className="resize-none"
                  />
                )}
              </CardContent>
            </Card>

            {/* Timeline/History */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Historique
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="h-2 w-2 bg-blue-600 rounded-full mt-1.5"></div>
                      <div className="w-0.5 h-full bg-gray-200"></div>
                    </div>
                    <div className="flex-1 pb-4">
                      <p className="text-sm font-medium">Créé</p>
                      <p className="text-xs text-gray-600">
                        {new Date(appointment.createdAt).toLocaleDateString('fr-FR')} à{' '}
                        {new Date(appointment.createdAt).toLocaleTimeString('fr-FR')}
                      </p>
                    </div>
                  </div>
                  
                  {appointment.updatedAt !== appointment.createdAt && (
                    <div className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className="h-2 w-2 bg-green-600 rounded-full mt-1.5"></div>
                        <div className="w-0.5 h-full bg-transparent"></div>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">Dernière modification</p>
                        <p className="text-xs text-gray-600">
                          {new Date(appointment.updatedAt).toLocaleDateString('fr-FR')} à{' '}
                          {new Date(appointment.updatedAt).toLocaleTimeString('fr-FR')}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
  );
}

export default AppointmentDetailPage;