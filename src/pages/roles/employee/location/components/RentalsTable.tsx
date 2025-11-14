import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  X,
  Check,
  Trash2,
  Edit2,
  AlertTriangle,
  CheckCircle,
  Clock,
} from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Rental {
  id?: string;
  rentalCode?: string;
  clientType: 'patient' | 'company';
  patientId?: string;
  companyId?: string;
  medicalDeviceId: string;
  startDate: string;
  endDate?: string | null;
  dailyRate: number;
  status: string;
  urgentRental: boolean;
  openEnded: boolean;
  depositAmount?: number;
  depositMethod?: string;
  cnamEligible: boolean;
  deliveryNotes?: string;
  internalNotes?: string;
  createdById?: string;
  patient?: {
    id: string;
    firstName: string;
    lastName: string;
    cnamId?: string;
    telephone?: string;
    patientCode?: string;
  };
  company?: {
    id: string;
    companyName: string;
    telephone?: string;
    companyCode?: string;
  };
  medicalDevice?: {
    id: string;
    name: string;
    deviceCode: string;
    rentalPrice: number;
    type?: string;
  };
  createdBy?: {
    firstName: string;
    lastName: string;
  };
}

export default function RentalsTable() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newRow, setNewRow] = useState<Partial<Rental> | null>(null);
  const [editData, setEditData] = useState<Partial<Rental>>({});

  // Fetch rentals
  const { data: rentalsData, isLoading } = useQuery({
    queryKey: ['rentals-simple'],
    queryFn: async () => {
      const response = await fetch('/api/rentals/simple');
      if (!response.ok) throw new Error('Failed to fetch rentals');
      const data = await response.json();
      // Ensure we always return an array
      return Array.isArray(data) ? data : [];
    },
  });

  const rentals = rentalsData || [];

  // Fetch patients for dropdown - use direct patient API
  const { data: patientsResponse } = useQuery({
    queryKey: ['patients-for-rentals'],
    queryFn: async () => {
      const response = await fetch('/api/renseignements/patients');
      if (!response.ok) throw new Error('Failed to fetch patients');
      const data = await response.json();
      // API returns { patients: [...] }
      return data.patients || [];
    },
  });

  const patients = patientsResponse || [];

  // Fetch companies for dropdown
  const {  } = useQuery({
    queryKey: ['companies-for-rentals'],
    queryFn: async () => {
      const response = await fetch('/api/companies');
      if (!response.ok) throw new Error('Failed to fetch companies');
      const data = await response.json();
      return Array.isArray(data) ? data : (data.companies || []);
    },
  });
  // Fetch devices for dropdown
  const { data: devicesResponse } = useQuery({
    queryKey: ['devices'],
    queryFn: async () => {
      const response = await fetch('/api/medical-devices');
      if (!response.ok) throw new Error('Failed to fetch devices');
      const data = await response.json();
      return Array.isArray(data) ? data : (data.devices || []);
    },
  });

  const devices = devicesResponse || [];



  // Create rental mutation
  const createMutation = useMutation({
    mutationFn: async (rental: Partial<Rental>) => {
      const response = await fetch('/api/rentals/simple', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rental),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create rental');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rentals-simple'] });
      setNewRow(null);
      toast({ title: "Succès", description: "Location créée avec succès" });
    },
    onError: (error: Error) => {
      toast({ title: "Erreur", description: error.message || "Échec de la création", variant: "destructive" });
    },
  });

  // Update rental mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Rental> }) => {
      const response = await fetch(`/api/rentals/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update rental');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rentals-simple'] });
      setEditingId(null);
      setEditData({});
      toast({ title: "Succès", description: "Location mise à jour avec succès" });
    },
    onError: () => {
      toast({ title: "Erreur", description: "Échec de la mise à jour", variant: "destructive" });
    },
  });

  // Delete rental mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/rentals/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete rental');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rentals-simple'] });
      toast({ title: "Succès", description: "Location supprimée avec succès" });
    },
    onError: () => {
      toast({ title: "Erreur", description: "Échec de la suppression", variant: "destructive" });
    },
  });

  const handleAddNew = () => {
    setNewRow({
      clientType: 'patient',
      medicalDeviceId: '',
      startDate: new Date().toISOString().split('T')[0],
      dailyRate: 0,
      status: 'PENDING',
      urgentRental: false,
      openEnded: false,
      cnamEligible: false,
      depositAmount: 0,
      depositMethod: 'CASH',
    });
  };

  const handleSaveNew = () => {
    if (!newRow) return;

    // Validation
    if (newRow.clientType === 'patient' && !newRow.patientId) {
      toast({ title: "Erreur", description: "Veuillez sélectionner un patient", variant: "destructive" });
      return;
    }
    if (newRow.clientType === 'company' && !newRow.companyId) {
      toast({ title: "Erreur", description: "Veuillez sélectionner une entreprise", variant: "destructive" });
      return;
    }
    if (!newRow.medicalDeviceId) {
      toast({ title: "Erreur", description: "Veuillez sélectionner un appareil", variant: "destructive" });
      return;
    }

    createMutation.mutate(newRow);
  };

  const handleEdit = (rental: Rental) => {
    setEditingId(rental.id!);
    setEditData(rental);
  };

  const handleSaveEdit = () => {
    if (editingId && editData) {
      updateMutation.mutate({ id: editingId, data: editData });
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette location ?')) {
      deleteMutation.mutate(id);
    }
  };

  // Status badge renderer
  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { color: string; icon: any; label: string }> = {
      ACTIVE: {
        color: 'bg-green-100 text-green-800 border-green-200',
        icon: CheckCircle,
        label: 'Actif'
      },
      PENDING: {
        color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        icon: Clock,
        label: 'En attente'
      },
      PAUSED: {
        color: 'bg-orange-100 text-orange-800 border-orange-200',
        icon: AlertTriangle,
        label: 'Suspendu'
      },
      COMPLETED: {
        color: 'bg-green-100 text-green-800 border-green-200',
        icon: CheckCircle,
        label: 'Terminé'
      },
      CANCELLED: {
        color: 'bg-red-100 text-red-800 border-red-200',
        icon: X,
        label: 'Annulé'
      },
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

  const renderCell = (
    value: any,
    field: string,
    isEditing: boolean,
    onChange: (field: string, value: any) => void
  ) => {
    if (!isEditing) {
      if (field === 'patient') return `${value?.firstName} ${value?.lastName}`;
      if (field === 'device') return `${value?.deviceCode} - ${value?.name}`;
      if (field === 'monthlyRate') return `${value} DT`;
      if (field === 'startDate' || field === 'endDate') {
        return value ? new Date(value).toLocaleDateString('fr-FR') : '-';
      }
      return value || '-';
    }

    switch (field) {
      case 'patientId':
        return (
          <Select value={value || ''} onValueChange={(v) => onChange(field, v)}>
            <SelectTrigger className="h-8 border-blue-300 focus:ring-green-500">
              <SelectValue placeholder="Sélectionner" />
            </SelectTrigger>
            <SelectContent>
              {patients?.map((p: any) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name || `${p.firstName} ${p.lastName}`.trim()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      case 'medicalDeviceId':
        return (
          <Select value={value || ''} onValueChange={(v) => onChange(field, v)}>
            <SelectTrigger className="h-8 border-blue-300 focus:ring-green-500">
              <SelectValue placeholder="Sélectionner" />
            </SelectTrigger>
            <SelectContent>
              {devices?.map((d: any) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.deviceCode} - {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      case 'status':
        return (
          <Select value={value || 'ACTIVE'} onValueChange={(v) => onChange(field, v)}>
            <SelectTrigger className="h-8 border-blue-300 focus:ring-green-500">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ACTIVE">Actif</SelectItem>
              <SelectItem value="ENDED">Terminé</SelectItem>
              <SelectItem value="OVERDUE">En retard</SelectItem>
            </SelectContent>
          </Select>
        );
      case 'monthlyRate':
        return (
          <Input
            type="number"
            value={value || 0}
            onChange={(e) => onChange(field, parseFloat(e.target.value))}
            className="h-8 border-blue-300 focus:ring-green-500"
          />
        );
      case 'startDate':
      case 'endDate':
        return (
          <Input
            type="date"
            value={value || ''}
            onChange={(e) => onChange(field, e.target.value)}
            className="h-8 border-blue-300 focus:ring-green-500"
          />
        );
      default:
        return (
          <Input
            value={value || ''}
            onChange={(e) => onChange(field, e.target.value)}
            className="h-8 border-blue-300 focus:ring-green-500"
          />
        );
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Locations</h2>
        <Button onClick={handleAddNew} disabled={newRow !== null} className="bg-green-600 hover:bg-green-700">
          <Plus className="h-4 w-4 mr-2" />
          Nouvelle Location
        </Button>
      </div>

      <div className="border rounded-lg overflow-hidden bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead className="bg-gray-50 border-b-2 border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Patient</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Appareil</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Date Début</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Date Fin</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Tarif/Mois</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Statut</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody>
              {/* New row */}
              {newRow && (
                <tr className="border-b border-green-200 bg-green-50 hover:bg-green-100">
                  <td className="px-4 py-2">
                    {renderCell(newRow.patientId, 'patientId', true, (field, value) =>
                      setNewRow({ ...newRow, [field]: value })
                    )}
                  </td>
                  <td className="px-4 py-2">
                    {renderCell(newRow.medicalDeviceId, 'medicalDeviceId', true, (field, value) =>
                      setNewRow({ ...newRow, [field]: value })
                    )}
                  </td>
                  <td className="px-4 py-2">
                    {renderCell(newRow.startDate, 'startDate', true, (field, value) =>
                      setNewRow({ ...newRow, [field]: value })
                    )}
                  </td>
                  <td className="px-4 py-2">
                    {renderCell(newRow.endDate, 'endDate', true, (field, value) =>
                      setNewRow({ ...newRow, [field]: value })
                    )}
                  </td>
                  <td className="px-4 py-2">
                    <span className="text-xs text-muted-foreground">N/A</span>
                  </td>
                  <td className="px-4 py-2">
                    {renderCell(newRow.status, 'status', true, (field, value) =>
                      setNewRow({ ...newRow, [field]: value })
                    )}
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex gap-2 justify-center">
                      <Button size="sm" onClick={handleSaveNew} className="bg-green-600 hover:bg-green-700 h-7 px-2">
                        <Check className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => setNewRow(null)} className="h-7 px-2">
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              )}

              {/* Existing rows */}
              {rentals?.map((rental: Rental) => {
                const isEditing = editingId === rental.id;
                const currentData = isEditing ? editData : rental;

                return (
                  <tr
                    key={rental.id}
                    className={`border-b hover:bg-gray-50 ${isEditing ? 'bg-green-50' : ''}`}
                  >
                    <td className="px-4 py-2">
                      {renderCell(isEditing ? currentData.patientId : rental.patient, isEditing ? 'patientId' : 'patient', isEditing, (field, value) =>
                        setEditData({ ...editData, [field]: value })
                      )}
                    </td>
                    <td className="px-4 py-2">
                      {renderCell(isEditing ? currentData.medicalDeviceId : rental.medicalDevice, isEditing ? 'medicalDeviceId' : 'device', isEditing, (field, value) =>
                        setEditData({ ...editData, [field]: value })
                      )}
                    </td>
                    <td className="px-4 py-2">
                      {renderCell(currentData.startDate, 'startDate', isEditing, (field, value) =>
                        setEditData({ ...editData, [field]: value })
                      )}
                    </td>
                    <td className="px-4 py-2">
                      {renderCell(currentData.endDate, 'endDate', isEditing, (field, value) =>
                        setEditData({ ...editData, [field]: value })
                      )}
                    </td>
                    <td className="px-4 py-2">
                      {isEditing ? (
                        <span className="text-xs text-muted-foreground">N/A</span>
                      ) : (
                        renderCell((rental as any).configuration?.rentalRate, 'monthlyRate', false, () => {})
                      )}
                    </td>
                    <td className="px-4 py-2">
                      {renderCell(currentData.status, 'status', isEditing, (field, value) =>
                        setEditData({ ...editData, [field]: value })
                      )}
                    </td>
                    <td className="px-4 py-2">
                      {isEditing ? (
                        <div className="flex gap-2 justify-center">
                          <Button size="sm" onClick={handleSaveEdit} className="bg-green-600 hover:bg-green-700 h-7 px-2">
                            <Check className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => {setEditingId(null); setEditData({});}} className="h-7 px-2">
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex gap-2 justify-center">
                          <Button size="sm" variant="outline" onClick={() => handleEdit(rental)} className="h-7 px-2">
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => handleDelete(rental.id!)} className="h-7 px-2">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}

              {!isLoading && rentals?.length === 0 && !newRow && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    Aucune location. Cliquez sur "Nouvelle Location" pour commencer.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
