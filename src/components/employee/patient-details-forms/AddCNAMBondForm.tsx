import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
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
  FileText,
  DollarSign,
  Calendar,
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface CNAMBond {
  id?: string;
  bonNumber?: string;
  dossierNumber?: string;
  bonType: string;
  status: string;
  category: string; // LOCATION or ACHAT
  startDate?: string | null;
  endDate?: string | null;
  cnamMonthlyRate: number;
  deviceMonthlyRate: number;
  coveredMonths: number;
  bonAmount: number;
  devicePrice: number;
  complementAmount: number;
  currentStep?: number;
  renewalReminderDays?: number;
  notes?: string;
  rentalId?: string;
  saleId?: string;
}

interface AddCNAMBondFormProps {
  patientId: string;
  cnamBonds: any[];
  onSuccess: () => void;
}

const BOND_TYPE_LABELS: Record<string, string> = {
  CONCENTRATEUR_OXYGENE: 'Concentrateur Oxygène',
  VNI: 'VNI',
  CPAP: 'CPAP',
  MASQUE: 'Masque',
  AUTRE: 'Autre',
};

const STATUS_LABELS: Record<string, string> = {
  CREATION: 'Création',
  RENOUVELLEMENT: 'Renouvellement',
  EN_ATTENTE: 'En attente',
  EN_COURS: 'En cours',
  TERMINE: 'Terminé',
  APPROUVE: 'Approuvé',
  REFUSE: 'Refusé',
};

const CATEGORY_LABELS: Record<string, string> = {
  LOCATION: 'Location',
  ACHAT: 'Achat',
};

export const AddCNAMBondForm: React.FC<AddCNAMBondFormProps> = ({
  patientId,
  cnamBonds,
  onSuccess,
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [newRow, setNewRow] = useState<Partial<CNAMBond> | null>(null);
  const [editData, setEditData] = useState<Partial<CNAMBond>>({});

  // Fetch CNAM nomenclature for rates
  const { data: nomenclature = [] } = useQuery<any[]>({
    queryKey: ['cnam-nomenclature'],
    queryFn: async () => {
      const response = await fetch('/api/cnam-nomenclature?isActive=true');
      if (!response.ok) throw new Error('Failed to fetch nomenclature');
      return response.json();
    },
  });

  // Fetch patient's rentals and sales for linking
  const { data: patientData } = useQuery({
    queryKey: ['patient', patientId],
    queryFn: async () => {
      const response = await fetch(`/api/renseignements/${patientId}`);
      if (!response.ok) throw new Error('Failed to fetch patient data');
      return response.json();
    },
  });

  const rentals = patientData?.rentals || [];
  const sales = patientData?.sales || [];

  // Create CNAM bond mutation
  const createMutation = useMutation({
    mutationFn: async (bond: Partial<CNAMBond>) => {
      const response = await fetch('/api/cnam-bons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...bond,
          patientId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create CNAM bond');
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Succès',
        description: 'Bon CNAM créé avec succès',
        variant: 'default',
      });
      queryClient.invalidateQueries({ queryKey: ['patient', patientId] });
      queryClient.invalidateQueries({ queryKey: ['cnam-bonds'] });
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

  // Update CNAM bond mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, ...bond }: Partial<CNAMBond> & { id: string }) => {
      const response = await fetch(`/api/cnam-bons/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bond),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update CNAM bond');
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Succès',
        description: 'Bon CNAM mis à jour avec succès',
        variant: 'default',
      });
      queryClient.invalidateQueries({ queryKey: ['patient', patientId] });
      queryClient.invalidateQueries({ queryKey: ['cnam-bonds'] });
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

  const handleAddNew = async () => {
    // Fetch next bond number
    let nextBondNumber = '';
    try {
      const response = await fetch('/api/cnam-bons/next-number?category=LOCATION');
      if (response.ok) {
        const data = await response.json();
        nextBondNumber = data.bonNumber;
      } else {
        const year = new Date().getFullYear();
        const timestamp = Date.now().toString().slice(-4);
        nextBondNumber = `BL-${year}-TMP${timestamp}`;
      }
    } catch (error) {
      const year = new Date().getFullYear();
      const timestamp = Date.now().toString().slice(-4);
      nextBondNumber = `BL-${year}-TMP${timestamp}`;
    }

    const defaultBondType = 'CONCENTRATEUR_OXYGENE';
    const cnamRate = nomenclature.find((n: any) => n.bonType === defaultBondType)?.monthlyRate || 190;

    setNewRow({
      bonNumber: nextBondNumber,
      bonType: defaultBondType,
      status: 'CREATION',
      category: 'LOCATION',
      cnamMonthlyRate: cnamRate,
      deviceMonthlyRate: 0,
      coveredMonths: 1,
      bonAmount: cnamRate,
      devicePrice: 0,
      complementAmount: 0,
      currentStep: 1,
      renewalReminderDays: 15,
    });
  };

  const handleSaveNew = () => {
    if (!newRow?.bonType) {
      toast({
        title: 'Erreur',
        description: 'Veuillez sélectionner un type de bon',
        variant: 'destructive',
      });
      return;
    }

    createMutation.mutate(newRow as CNAMBond);
  };

  const handleEdit = (bond: any) => {
    setEditingId(bond.id);
    setEditData({
      bonNumber: bond.bonNumber,
      dossierNumber: bond.dossierNumber,
      bonType: bond.bonType,
      status: bond.status,
      category: bond.category,
      startDate: bond.startDate?.split('T')[0] || '',
      endDate: bond.endDate?.split('T')[0] || '',
      cnamMonthlyRate: bond.cnamMonthlyRate || 0,
      deviceMonthlyRate: bond.deviceMonthlyRate || 0,
      coveredMonths: bond.coveredMonths || 1,
      bonAmount: bond.bonAmount || 0,
      devicePrice: bond.devicePrice || 0,
      complementAmount: bond.complementAmount || 0,
      currentStep: bond.currentStep || 1,
      renewalReminderDays: bond.renewalReminderDays || 15,
      notes: bond.notes || '',
      rentalId: bond.rentalId,
      saleId: bond.saleId,
    });
  };

  const handleSaveEdit = () => {
    updateMutation.mutate({ id: editingId!, ...editData });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditData({});
  };

  const handleCancelNew = () => {
    setNewRow(null);
  };

  const formatAmount = (amount: any) => {
    const num = Number(amount);
    return isNaN(num) ? '0.00' : num.toFixed(2);
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      CREATION: 'bg-blue-100 text-blue-800 border-blue-200',
      RENOUVELLEMENT: 'bg-purple-100 text-purple-800 border-purple-200',
      EN_ATTENTE: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      EN_COURS: 'bg-blue-100 text-blue-800 border-blue-200',
      TERMINE: 'bg-green-100 text-green-800 border-green-200',
      APPROUVE: 'bg-green-100 text-green-800 border-green-200',
      REFUSE: 'bg-red-100 text-red-800 border-red-200',
    };
    return colors[status] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">
          Gérez les bons CNAM pour ce patient en ajoutant de nouvelles entrées ou en modifiant les existantes.
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
              <TableHead>N° Bon</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Catégorie</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Tarif CNAM/mois</TableHead>
              <TableHead>Tarif Appareil/mois</TableHead>
              <TableHead>Mois Couverts</TableHead>
              <TableHead>Montant CNAM</TableHead>
              <TableHead>Prix Appareil</TableHead>
              <TableHead>Complément</TableHead>
              <TableHead>Étape</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {/* New Row */}
            {newRow && (
              <CNAMBondFormRow
                data={newRow}
                onChange={setNewRow}
                onSave={handleSaveNew}
                onCancel={handleCancelNew}
                isNew={true}
                nomenclature={nomenclature}
                rentals={rentals}
                sales={sales}
              />
            )}

            {/* Existing Rows */}
            {cnamBonds.map((bond) => {
              const isEditing = editingId === bond.id;

              return isEditing ? (
                <CNAMBondFormRow
                  key={bond.id}
                  data={editData}
                  onChange={setEditData}
                  onSave={handleSaveEdit}
                  onCancel={handleCancelEdit}
                  isNew={false}
                  nomenclature={nomenclature}
                  rentals={rentals}
                  sales={sales}
                />
              ) : (
                <TableRow key={bond.id} className="hover:bg-gray-50">
                  <TableCell className="font-mono text-xs">
                    {bond.bonNumber || bond.dossierNumber || '-'}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {BOND_TYPE_LABELS[bond.bonType] || bond.bonType}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={bond.category === 'LOCATION' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}
                    >
                      {CATEGORY_LABELS[bond.category] || bond.category}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={getStatusColor(bond.status)}>
                      {STATUS_LABELS[bond.status] || bond.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm font-medium text-blue-600">
                    {formatAmount(bond.cnamMonthlyRate)} DT
                  </TableCell>
                  <TableCell className="text-sm font-medium">
                    {formatAmount(bond.deviceMonthlyRate)} DT
                  </TableCell>
                  <TableCell className="text-center font-semibold">{bond.coveredMonths}</TableCell>
                  <TableCell className="text-sm font-bold text-blue-600">
                    {formatAmount(bond.bonAmount)} DT
                  </TableCell>
                  <TableCell className="text-sm font-bold">
                    {formatAmount(bond.devicePrice)} DT
                  </TableCell>
                  <TableCell className="text-sm font-bold text-amber-600">
                    {formatAmount(bond.complementAmount)} DT
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                      {bond.currentStep || 1}/7
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs">
                    {bond.rentalId && (
                      <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                        Location
                      </Badge>
                    )}
                    {bond.saleId && (
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        Vente
                      </Badge>
                    )}
                    {!bond.rentalId && !bond.saleId && '-'}
                  </TableCell>
                  <TableCell className="text-xs text-gray-600 max-w-[150px] truncate">
                    {bond.notes || '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(bond)}
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

            {!newRow && cnamBonds.length === 0 && (
              <TableRow>
                <TableCell colSpan={14} className="text-center py-8 text-gray-500">
                  Aucun bon CNAM pour ce patient. Cliquez sur "Ajouter" pour commencer.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

// CNAM Bond Form Row Component
const CNAMBondFormRow: React.FC<{
  data: Partial<CNAMBond>;
  onChange: (data: Partial<CNAMBond>) => void;
  onSave: () => void;
  onCancel: () => void;
  isNew: boolean;
  nomenclature: any[];
  rentals: any[];
  sales: any[];
}> = ({ data, onChange, onSave, onCancel, isNew, nomenclature, rentals, sales }) => {
  // Auto-calculate amounts when relevant fields change
  useEffect(() => {
    const cnamRate = data.cnamMonthlyRate || 0;
    const deviceRate = data.deviceMonthlyRate || 0;
    const months = data.coveredMonths || 1;

    const bonAmount = cnamRate * months;
    const devicePrice = deviceRate * months;
    const complementAmount = devicePrice - bonAmount;

    onChange({
      ...data,
      bonAmount,
      devicePrice,
      complementAmount,
    });
  }, [data.cnamMonthlyRate, data.deviceMonthlyRate, data.coveredMonths]);

  // Update CNAM rate when bond type changes
  const handleBondTypeChange = (bondType: string) => {
    const cnamRate = nomenclature.find((n: any) => n.bonType === bondType)?.monthlyRate || 0;
    onChange({
      ...data,
      bonType,
      cnamMonthlyRate: cnamRate,
    });
  };

  return (
    <TableRow className={isNew ? 'bg-green-50' : 'bg-blue-50'}>
      {/* Bon Number */}
      <TableCell>
        <Input
          value={data.bonNumber || ''}
          onChange={(e) => onChange({ ...data, bonNumber: e.target.value })}
          className="w-[120px] font-mono text-xs"
          placeholder="N° Bon"
        />
      </TableCell>

      {/* Bond Type */}
      <TableCell>
        <Select
          value={data.bonType || ''}
          onValueChange={handleBondTypeChange}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(BOND_TYPE_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>

      {/* Category */}
      <TableCell>
        <Select
          value={data.category || 'LOCATION'}
          onValueChange={(value) => onChange({ ...data, category: value })}
        >
          <SelectTrigger className="w-[100px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="LOCATION">Location</SelectItem>
            <SelectItem value="ACHAT">Achat</SelectItem>
          </SelectContent>
        </Select>
      </TableCell>

      {/* Status */}
      <TableCell>
        <Select
          value={data.status || 'CREATION'}
          onValueChange={(value) => onChange({ ...data, status: value })}
        >
          <SelectTrigger className="w-[130px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>

      {/* CNAM Monthly Rate */}
      <TableCell>
        <Input
          type="number"
          step="0.01"
          value={data.cnamMonthlyRate || 0}
          onChange={(e) =>
            onChange({ ...data, cnamMonthlyRate: parseFloat(e.target.value) || 0 })
          }
          className="w-[100px]"
        />
      </TableCell>

      {/* Device Monthly Rate */}
      <TableCell>
        <Input
          type="number"
          step="0.01"
          value={data.deviceMonthlyRate || 0}
          onChange={(e) =>
            onChange({ ...data, deviceMonthlyRate: parseFloat(e.target.value) || 0 })
          }
          className="w-[100px]"
        />
      </TableCell>

      {/* Covered Months */}
      <TableCell>
        <Input
          type="number"
          value={data.coveredMonths || 1}
          onChange={(e) =>
            onChange({ ...data, coveredMonths: parseInt(e.target.value) || 1 })
          }
          className="w-[80px] text-center"
        />
      </TableCell>

      {/* Bon Amount (Read-only, auto-calculated) */}
      <TableCell className="text-sm font-bold text-blue-600">
        {(data.bonAmount || 0).toFixed(2)} DT
      </TableCell>

      {/* Device Price (Read-only, auto-calculated) */}
      <TableCell className="text-sm font-bold">
        {(data.devicePrice || 0).toFixed(2)} DT
      </TableCell>

      {/* Complement Amount (Read-only, auto-calculated) */}
      <TableCell className="text-sm font-bold text-amber-600">
        {(data.complementAmount || 0).toFixed(2)} DT
      </TableCell>

      {/* Current Step */}
      <TableCell>
        <Input
          type="number"
          min="1"
          max="7"
          value={data.currentStep || 1}
          onChange={(e) =>
            onChange({ ...data, currentStep: parseInt(e.target.value) || 1 })
          }
          className="w-[60px] text-center"
        />
      </TableCell>

      {/* Source (Rental or Sale) */}
      <TableCell>
        <Select
          value={data.rentalId || data.saleId || 'none'}
          onValueChange={(value) => {
            if (value === 'none') {
              onChange({ ...data, rentalId: undefined, saleId: undefined });
            } else if (value.startsWith('rental-')) {
              onChange({ ...data, rentalId: value.replace('rental-', ''), saleId: undefined });
            } else if (value.startsWith('sale-')) {
              onChange({ ...data, saleId: value.replace('sale-', ''), rentalId: undefined });
            }
          }}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Source" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Aucune</SelectItem>
            {rentals.map((rental: any) => (
              <SelectItem key={rental.id} value={`rental-${rental.id}`}>
                Location: {rental.rentalCode}
              </SelectItem>
            ))}
            {sales.map((sale: any) => (
              <SelectItem key={sale.id} value={`sale-${sale.id}`}>
                Vente: {sale.saleCode}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>

      {/* Notes */}
      <TableCell>
        <Textarea
          value={data.notes || ''}
          onChange={(e) => onChange({ ...data, notes: e.target.value })}
          placeholder="Notes"
          className="w-[150px] min-h-[60px]"
        />
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
