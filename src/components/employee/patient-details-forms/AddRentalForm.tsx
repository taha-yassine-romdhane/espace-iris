import React, { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Plus,
  Save,
  X,
  Edit,
  Package,
  Calendar,
  DollarSign,
  Shield,
  Settings,
} from 'lucide-react';
import { EmployeeMedicalDeviceSelectorDialog } from '@/components/employee/EmployeeMedicalDeviceSelectorDialog';
import { Switch } from '@/components/ui/switch';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Rental {
  id?: string;
  rentalCode?: string;
  medicalDeviceId: string;
  startDate: string;
  endDate?: string | null;
  status: string;
  assignedToId?: string;
  configuration?: {
    rentalRate: number;
    billingCycle: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
    cnamEligible: boolean;
    isGlobalOpenEnded: boolean;
    deliveryNotes?: string;
    internalNotes?: string;
  };
  medicalDevice?: {
    id: string;
    name: string;
    serialNumber?: string;
    deviceCode?: string;
  };
  assignedTo?: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

interface AddRentalFormProps {
  patientId: string;
  rentals: any[];
  onSuccess: () => void;
}

export const AddRentalForm: React.FC<AddRentalFormProps> = ({
  patientId,
  rentals,
  onSuccess,
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: session } = useSession();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [newRow, setNewRow] = useState<Partial<Rental> | null>(null);
  const [editData, setEditData] = useState<Partial<Rental>>({});

  // Fetch users (employees)
  const { data: usersData } = useQuery({
    queryKey: ['users-for-rentals'],
    queryFn: async () => {
      const response = await fetch('/api/users');
      if (!response.ok) throw new Error('Failed to fetch users');
      const data = await response.json();
      return data.users || data || [];
    },
  });

  const users = usersData || [];

  // Create rental mutation
  const createMutation = useMutation({
    mutationFn: async (rental: Partial<Rental>) => {
      const response = await fetch('/api/rentals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...rental,
          patientId,
          createdById: session?.user?.id,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create rental');
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Succès',
        description: 'Location créée avec succès',
        variant: 'default',
      });
      queryClient.invalidateQueries({ queryKey: ['patient', patientId] });
      setNewRow(null);
      onSuccess();
    },
    onError: (error: Error) => {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Update rental mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, ...rental }: Partial<Rental> & { id: string }) => {
      const response = await fetch(`/api/rentals/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rental),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update rental');
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Succès',
        description: 'Location mise à jour avec succès',
        variant: 'default',
      });
      queryClient.invalidateQueries({ queryKey: ['patient', patientId] });
      setEditingId(null);
      setEditData({});
      onSuccess();
    },
    onError: (error: Error) => {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleAddNew = () => {
    setNewRow({
      medicalDeviceId: '',
      status: 'PENDING',
      startDate: new Date().toISOString().split('T')[0],
      assignedToId: session?.user?.id,
      configuration: {
        rentalRate: 0,
        billingCycle: 'MONTHLY',
        cnamEligible: false,
        isGlobalOpenEnded: false,
      },
    });
  };

  const handleSaveNew = () => {
    if (!newRow?.medicalDeviceId) {
      toast({
        title: 'Erreur',
        description: 'Veuillez sélectionner un appareil médical',
        variant: 'destructive',
      });
      return;
    }

    createMutation.mutate(newRow as Rental);
  };

  const handleEdit = (rental: any) => {
    setEditingId(rental.id);
    setEditData({
      medicalDeviceId: rental.medicalDeviceId,
      startDate: rental.startDate?.split('T')[0] || '',
      endDate: rental.endDate?.split('T')[0] || '',
      status: rental.status,
      assignedToId: rental.assignedToId,
      configuration: {
        rentalRate: rental.configuration?.rentalRate || 0,
        billingCycle: rental.configuration?.billingCycle || 'MONTHLY',
        cnamEligible: rental.configuration?.cnamEligible || false,
        isGlobalOpenEnded: rental.configuration?.isGlobalOpenEnded || false,
        deliveryNotes: rental.configuration?.deliveryNotes || '',
        internalNotes: rental.configuration?.internalNotes || '',
      },
    });
  };

  const handleSaveEdit = () => {
    if (!editData?.medicalDeviceId) {
      toast({
        title: 'Erreur',
        description: 'Veuillez sélectionner un appareil médical',
        variant: 'destructive',
      });
      return;
    }

    updateMutation.mutate({ id: editingId!, ...editData });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditData({});
  };

  const handleCancelNew = () => {
    setNewRow(null);
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      ACTIVE: 'Actif',
      PENDING: 'En attente',
      PAUSED: 'Suspendu',
      COMPLETED: 'Terminé',
      CANCELLED: 'Annulé',
      RETURNED: 'Retourné',
    };
    return labels[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      ACTIVE: 'bg-green-100 text-green-800 border-green-200',
      PENDING: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      PAUSED: 'bg-orange-100 text-orange-800 border-orange-200',
      COMPLETED: 'bg-blue-100 text-blue-800 border-blue-200',
      CANCELLED: 'bg-red-100 text-red-800 border-red-200',
      RETURNED: 'bg-purple-100 text-purple-800 border-purple-200',
    };
    return colors[status] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getBillingCycleLabel = (cycle: string) => {
    const labels: Record<string, string> = {
      DAILY: 'Journalier',
      WEEKLY: 'Hebdomadaire',
      MONTHLY: 'Mensuel',
      YEARLY: 'Annuel',
    };
    return labels[cycle] || cycle;
  };

  const formatAmount = (amount: any) => {
    const num = Number(amount);
    return isNaN(num) ? '0.00' : num.toFixed(2);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">
          Gérez les locations pour ce patient en ajoutant de nouvelles entrées ou en modifiant les existantes.
        </p>
        <Button
          onClick={handleAddNew}
          disabled={!!newRow || !!editingId}
          className="bg-green-600 hover:bg-green-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Ajouter
        </Button>
      </div>

      <div className="overflow-x-auto border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Appareil</TableHead>
              <TableHead>Dates</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Tarif</TableHead>
              <TableHead>Flags</TableHead>
              <TableHead>Assigné à</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {/* New Row */}
            {newRow && (
              <RentalFormRow
                data={newRow}
                onChange={setNewRow}
                onSave={handleSaveNew}
                onCancel={handleCancelNew}
                isNew={true}
                users={users}
              />
            )}

            {/* Existing Rows */}
            {rentals.map((rental) => {
              const isEditing = editingId === rental.id;

              return isEditing ? (
                <RentalFormRow
                  key={rental.id}
                  data={editData}
                  onChange={setEditData}
                  onSave={handleSaveEdit}
                  onCancel={handleCancelEdit}
                  isNew={false}
                  users={users}
                />
              ) : (
                <TableRow key={rental.id} className="hover:bg-gray-50">
                  {/* Appareil */}
                  <TableCell>
                    <div className="space-y-1">
                      <div className="font-medium text-sm">
                        {rental.medicalDevice?.name || '-'}
                      </div>
                      {rental.medicalDevice?.serialNumber && (
                        <div className="text-xs text-gray-500 font-mono">
                          S/N: {rental.medicalDevice.serialNumber}
                        </div>
                      )}
                      {rental.rentalCode && (
                        <Badge variant="outline" className="text-xs">
                          {rental.rentalCode}
                        </Badge>
                      )}
                    </div>
                  </TableCell>

                  {/* Dates */}
                  <TableCell>
                    <div className="text-xs text-slate-700">
                      <div>Début: {rental.startDate ? format(new Date(rental.startDate), 'dd/MM/yyyy', { locale: fr }) : '-'}</div>
                      <div className="text-slate-500">
                        Fin: {rental.endDate ? format(new Date(rental.endDate), 'dd/MM/yyyy', { locale: fr }) : 'Ouvert'}
                      </div>
                    </div>
                  </TableCell>

                  {/* Status */}
                  <TableCell>
                    <Badge variant="outline" className={getStatusColor(rental.status)}>
                      {getStatusLabel(rental.status)}
                    </Badge>
                  </TableCell>

                  {/* Tarif */}
                  <TableCell>
                    <div className="text-xs">
                      <div className="font-medium text-green-600">{formatAmount(rental.configuration?.rentalRate)} DT</div>
                      <div className="text-slate-500">
                        {getBillingCycleLabel(rental.configuration?.billingCycle || 'MONTHLY')}
                      </div>
                    </div>
                  </TableCell>

                  {/* Flags */}
                  <TableCell>
                    <div className="flex gap-1">
                      {rental.configuration?.cnamEligible && (
                        <Badge variant="outline" className="text-xs bg-green-50 text-green-700">
                          <Shield className="h-3 w-3" />
                          CNAM
                        </Badge>
                      )}
                    </div>
                  </TableCell>

                  {/* Assigné à */}
                  <TableCell className="text-xs text-slate-600">
                    {rental.assignedTo
                      ? `${rental.assignedTo.firstName} ${rental.assignedTo.lastName}`
                      : '-'}
                  </TableCell>

                  {/* Actions */}
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(rental)}
                      disabled={!!newRow || !!editingId}
                      className="h-8 px-2 hover:bg-blue-100 hover:text-blue-700"
                    >
                      <Edit className="h-3 w-3 mr-1" />
                      Modifier
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}

            {!newRow && rentals.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                  Aucune location pour ce patient. Cliquez sur "Ajouter" pour commencer.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

// Rental Form Row Component
const RentalFormRow: React.FC<{
  data: Partial<Rental>;
  onChange: (data: Partial<Rental>) => void;
  onSave: () => void;
  onCancel: () => void;
  isNew: boolean;
  users: any[];
}> = ({ data, onChange, onSave, onCancel, isNew, users }) => {
  const { data: session } = useSession();
  const [selectedDeviceName, setSelectedDeviceName] = useState<string>('');

  // Get current user name from session
  const currentUserName = session?.user?.name || 'Utilisateur actuel';

  // Get assigned user name for edit mode
  const assignedToName = data.assignedTo
    ? `${data.assignedTo.firstName} ${data.assignedTo.lastName}`
    : currentUserName;

  return (
    <TableRow className={isNew ? 'bg-green-50' : 'bg-green-50'}>
      {/* Medical Device */}
      <TableCell>
        <EmployeeMedicalDeviceSelectorDialog
          onSelect={(id, name) => {
            onChange({ ...data, medicalDeviceId: id });
            setSelectedDeviceName(name);
          }}
          selectedId={data.medicalDeviceId}
          selectedName={selectedDeviceName}
          excludeRented={true}
        />
      </TableCell>

      {/* Dates - Start and End Date combined */}
      <TableCell>
        <div className="space-y-1">
          <Input
            type="date"
            value={data.startDate || ''}
            onChange={(e) => onChange({ ...data, startDate: e.target.value })}
            className="text-xs"
          />
          <Input
            type="date"
            value={data.endDate || ''}
            onChange={(e) => onChange({ ...data, endDate: e.target.value || null })}
            className="text-xs"
            placeholder="Ouvert"
          />
        </div>
      </TableCell>

      {/* Status */}
      <TableCell>
        <Select
          value={data.status || 'PENDING'}
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
            <SelectItem value="RETURNED">Retourné</SelectItem>
          </SelectContent>
        </Select>
      </TableCell>

      {/* Tarif - Rate and Cycle combined */}
      <TableCell>
        <div className="space-y-1">
          <Input
            type="number"
            step="0.01"
            value={data.configuration?.rentalRate || ''}
            onChange={(e) =>
              onChange({
                ...data,
                configuration: {
                  ...data.configuration!,
                  rentalRate: parseFloat(e.target.value) || 0,
                },
              })
            }
            placeholder="Tarif"
            className="text-xs"
          />
          <Select
            value={data.configuration?.billingCycle || 'MONTHLY'}
            onValueChange={(value: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY') =>
              onChange({
                ...data,
                configuration: {
                  ...data.configuration!,
                  billingCycle: value,
                },
              })
            }
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
      </TableCell>

      {/* Flags - CNAM switch */}
      <TableCell>
        <label className="flex items-center gap-1 text-xs">
          <Switch
            checked={data.configuration?.cnamEligible || false}
            onCheckedChange={(checked) =>
              onChange({
                ...data,
                configuration: {
                  ...data.configuration!,
                  cnamEligible: checked,
                },
              })
            }
          />
          <span>CNAM</span>
        </label>
      </TableCell>

      {/* Assigned To */}
      <TableCell>
        <div className="text-xs text-slate-600 bg-slate-50 px-3 py-2 rounded border border-slate-200">
          {assignedToName}
        </div>
      </TableCell>

      {/* Actions */}
      <TableCell className="text-right">
        <div className="flex items-center gap-1 justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={onSave}
            className="h-8 px-2 bg-green-600 text-white hover:bg-green-700"
          >
            <Save className="h-3 w-3 mr-1" />
            Sauvegarder
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
            className="h-8 px-2 hover:bg-red-100 hover:text-red-700"
          >
            <X className="h-3 w-3 mr-1" />
            Annuler
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
};
