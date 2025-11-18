import React, { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  CreditCard,
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Payment {
  id?: string;
  paymentCode?: string;
  amount: number;
  paymentDate: string;
  method: string;
  status: string;
  source?: string;
  rentalId?: string;
  saleId?: string;
  rental?: any;
  sale?: any;
  periodStartDate?: string;
  periodEndDate?: string;
  notes?: string;
}

interface AddPaymentFormProps {
  patientId: string;
  payments: any[];
  onSuccess: () => void;
}

const METHOD_LABELS: Record<string, string> = {
  CASH: 'Espèces',
  CREDIT_CARD: 'Carte bancaire',
  BANK_TRANSFER: 'Virement',
  CHEQUE: 'Chèque',
  TRAITE: 'Traite',
  MANDAT: 'Mandat',
  VIREMENT: 'Virement',
  MIXED: 'Mixte',
  // CNAM removed - auto-created from bonds only
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'En attente',
  PAID: 'Payé',
  COMPLETED: 'Complété',
  CANCELLED: 'Annulé',
  FAILED: 'Échoué',
  PARTIAL: 'Partiel',
  GUARANTEE: 'Garantie',
};

const SOURCE_LABELS: Record<string, string> = {
  SALE: 'Vente',
  RENTAL: 'Location',
  DIAGNOSTIC: 'Diagnostic',
  AUTRE: 'Autre',
};

export const AddPaymentForm: React.FC<AddPaymentFormProps> = ({
  patientId,
  payments,
  onSuccess,
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: session } = useSession();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [newRow, setNewRow] = useState<Partial<Payment> | null>(null);
  const [editData, setEditData] = useState<Partial<Payment>>({});

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

  // Create payment mutation
  const createMutation = useMutation({
    mutationFn: async (payment: Partial<Payment>) => {
      const response = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...payment,
          patientId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create payment');
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Succès',
        description: 'Paiement créé avec succès',
        variant: 'default',
      });
      queryClient.invalidateQueries({ queryKey: ['patient', patientId] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
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

  // Update payment mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, ...payment }: Partial<Payment> & { id: string }) => {
      const response = await fetch(`/api/payments/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payment),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update payment');
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Succès',
        description: 'Paiement mis à jour avec succès',
        variant: 'default',
      });
      queryClient.invalidateQueries({ queryKey: ['patient', patientId] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
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
      amount: 0,
      paymentDate: new Date().toISOString().split('T')[0],
      method: 'CASH',
      status: 'PENDING',
      source: 'AUTRE',
    });
  };

  const handleSaveNew = () => {
    if (!newRow?.amount || newRow.amount <= 0) {
      toast({
        title: 'Erreur',
        description: 'Veuillez entrer un montant valide',
        variant: 'destructive',
      });
      return;
    }

    createMutation.mutate(newRow as Payment);
  };

  const handleEdit = (payment: any) => {
    setEditingId(payment.id);
    setEditData({
      amount: payment.amount,
      paymentDate: payment.paymentDate?.split('T')[0] || '',
      method: payment.method,
      status: payment.status,
      source: payment.source || 'AUTRE',
      rentalId: payment.rentalId,
      saleId: payment.saleId,
      periodStartDate: payment.periodStartDate?.split('T')[0] || '',
      periodEndDate: payment.periodEndDate?.split('T')[0] || '',
      notes: payment.notes || '',
    });
  };

  const handleSaveEdit = () => {
    if (!editData?.amount || editData.amount <= 0) {
      toast({
        title: 'Erreur',
        description: 'Veuillez entrer un montant valide',
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

  const formatAmount = (amount: any) => {
    const num = Number(amount);
    return isNaN(num) ? '0.00' : num.toFixed(2);
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      PAID: 'bg-green-100 text-green-800 border-green-200',
      COMPLETED: 'bg-green-100 text-green-800 border-green-200',
      PENDING: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      CANCELLED: 'bg-red-100 text-red-800 border-red-200',
      FAILED: 'bg-red-100 text-red-800 border-red-200',
      PARTIAL: 'bg-blue-100 text-blue-800 border-blue-200',
      GUARANTEE: 'bg-green-100 text-green-800 border-green-200',
    };
    return colors[status] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getSourceColor = (source: string) => {
    const colors: Record<string, string> = {
      SALE: 'bg-green-50 text-green-700 border-green-200',
      RENTAL: 'bg-blue-50 text-blue-700 border-blue-200',
      DIAGNOSTIC: 'bg-purple-50 text-purple-700 border-purple-200',
      AUTRE: 'bg-gray-50 text-gray-700 border-gray-200',
    };
    return colors[source] || 'bg-gray-50 text-gray-700 border-gray-200';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">
          Gérez les paiements pour ce patient en ajoutant de nouvelles entrées ou en modifiant les existantes.
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
              <TableHead>Code</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Référence</TableHead>
              <TableHead>Montant</TableHead>
              <TableHead>Date Paiement</TableHead>
              <TableHead>Période</TableHead>
              <TableHead>Méthode</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {/* New Row */}
            {newRow && (
              <PaymentFormRow
                data={newRow}
                onChange={setNewRow}
                onSave={handleSaveNew}
                onCancel={handleCancelNew}
                isNew={true}
                rentals={rentals}
                sales={sales}
              />
            )}

            {/* Existing Rows */}
            {payments.map((payment) => {
              const isEditing = editingId === payment.id;

              return isEditing ? (
                <PaymentFormRow
                  key={payment.id}
                  data={editData}
                  onChange={setEditData}
                  onSave={handleSaveEdit}
                  onCancel={handleCancelEdit}
                  isNew={false}
                  rentals={rentals}
                  sales={sales}
                />
              ) : (
                <TableRow key={payment.id} className="hover:bg-gray-50">
                  {/* Code */}
                  <TableCell>
                    <Badge variant="outline" className="font-mono text-xs">
                      {payment.paymentCode || 'N/A'}
                    </Badge>
                  </TableCell>

                  {/* Source */}
                  <TableCell>
                    <Badge variant="outline" className={getSourceColor(payment.source || 'AUTRE')}>
                      {SOURCE_LABELS[payment.source || 'AUTRE'] || 'Autre'}
                    </Badge>
                  </TableCell>

                  {/* Reference (Sale or Rental Code) */}
                  <TableCell>
                    {payment.rental && (
                      <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                        {payment.rental.rentalCode}
                      </Badge>
                    )}
                    {payment.sale && (
                      <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                        {payment.sale.saleCode}
                      </Badge>
                    )}
                    {!payment.rental && !payment.sale && (
                      <span className="text-xs text-gray-400">-</span>
                    )}
                  </TableCell>

                  {/* Montant */}
                  <TableCell>
                    <div className="text-sm font-bold text-green-700">
                      {formatAmount(payment.amount)} DT
                    </div>
                  </TableCell>

                  {/* Date Paiement */}
                  <TableCell>
                    <div className="text-xs text-slate-700">
                      {payment.paymentDate
                        ? format(new Date(payment.paymentDate), 'dd/MM/yyyy', { locale: fr })
                        : '-'}
                    </div>
                  </TableCell>

                  {/* Période (only for RENTAL) */}
                  <TableCell>
                    {payment.source === 'RENTAL' && payment.periodStartDate && payment.periodEndDate ? (
                      <div className="text-xs text-slate-700">
                        <div>{format(new Date(payment.periodStartDate), 'dd/MM/yyyy', { locale: fr })}</div>
                        <div className="text-slate-500">{format(new Date(payment.periodEndDate), 'dd/MM/yyyy', { locale: fr })}</div>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">-</span>
                    )}
                  </TableCell>

                  {/* Méthode */}
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      <CreditCard className="h-3 w-3 mr-1" />
                      {METHOD_LABELS[payment.method] || payment.method}
                    </Badge>
                  </TableCell>

                  {/* Statut */}
                  <TableCell>
                    <Badge variant="outline" className={getStatusColor(payment.status)}>
                      {STATUS_LABELS[payment.status] || payment.status}
                    </Badge>
                  </TableCell>

                  {/* Notes */}
                  <TableCell>
                    <div className="text-xs text-slate-600 max-w-[150px] truncate" title={payment.notes || ''}>
                      {payment.notes || '-'}
                    </div>
                  </TableCell>

                  {/* Actions */}
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(payment)}
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

            {!newRow && payments.length === 0 && (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-8 text-gray-500">
                  Aucun paiement pour ce patient. Cliquez sur "Ajouter" pour commencer.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

// Payment Form Row Component
const PaymentFormRow: React.FC<{
  data: Partial<Payment>;
  onChange: (data: Partial<Payment>) => void;
  onSave: () => void;
  onCancel: () => void;
  isNew: boolean;
  rentals: any[];
  sales: any[];
}> = ({ data, onChange, onSave, onCancel, isNew, rentals, sales }) => {
  // Filter rentals and sales based on selected source
  const getFilteredOptions = () => {
    if (data.source === 'RENTAL') {
      return rentals;
    } else if (data.source === 'SALE') {
      return sales;
    }
    return [];
  };

  const filteredOptions = getFilteredOptions();

  return (
    <TableRow className="bg-green-50 border-b-2 border-green-200">
      {/* Code (auto-generated) */}
      <TableCell>
        <span className="text-xs text-slate-500">Auto</span>
      </TableCell>

      {/* Source */}
      <TableCell>
        <Select
          value={data.source || 'AUTRE'}
          onValueChange={(value) => {
            // Clear rental/sale link and period dates when changing source
            const updatedData: any = {
              ...data,
              source: value,
              rentalId: undefined,
              saleId: undefined
            };

            // Clear period dates if switching away from RENTAL
            if (value !== 'RENTAL') {
              updatedData.periodStartDate = undefined;
              updatedData.periodEndDate = undefined;
            }

            onChange(updatedData);
          }}
        >
          <SelectTrigger className="w-[110px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(SOURCE_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>

      {/* Reference (conditional selector based on source) */}
      <TableCell>
        {(data.source === 'RENTAL' || data.source === 'SALE') && filteredOptions.length > 0 ? (
          <Select
            value={data.rentalId || data.saleId || ''}
            onValueChange={(value) => {
              if (data.source === 'RENTAL') {
                onChange({ ...data, rentalId: value, saleId: undefined });
              } else if (data.source === 'SALE') {
                onChange({ ...data, saleId: value, rentalId: undefined });
              }
            }}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Sélectionner" />
            </SelectTrigger>
            <SelectContent>
              {filteredOptions.map((item: any) => (
                <SelectItem key={item.id} value={item.id}>
                  {data.source === 'RENTAL' ? item.rentalCode : item.saleCode}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <span className="text-xs text-slate-400">-</span>
        )}
      </TableCell>

      {/* Montant */}
      <TableCell>
        <Input
          type="number"
          step="0.01"
          value={data.amount || 0}
          onChange={(e) => onChange({ ...data, amount: parseFloat(e.target.value) || 0 })}
          className="w-[100px]"
          placeholder="0.00"
        />
      </TableCell>

      {/* Date Paiement */}
      <TableCell>
        <Input
          type="date"
          value={data.paymentDate || ''}
          onChange={(e) => onChange({ ...data, paymentDate: e.target.value })}
          className="text-xs"
        />
      </TableCell>

      {/* Période (only for RENTAL) */}
      <TableCell>
        {data.source === 'RENTAL' ? (
          <div className="space-y-1">
            <Input
              type="date"
              value={data.periodStartDate || ''}
              onChange={(e) => onChange({ ...data, periodStartDate: e.target.value })}
              className="text-xs"
              placeholder="Début"
            />
            <Input
              type="date"
              value={data.periodEndDate || ''}
              onChange={(e) => onChange({ ...data, periodEndDate: e.target.value })}
              className="text-xs"
              placeholder="Fin"
            />
          </div>
        ) : (
          <span className="text-xs text-slate-400">-</span>
        )}
      </TableCell>

      {/* Méthode */}
      <TableCell>
        {data.method === 'CNAM' ? (
          <Badge variant="outline" className="text-xs">
            <CreditCard className="h-3 w-3 mr-1" />
            CNAM
          </Badge>
        ) : (
          <Select
            value={data.method || 'CASH'}
            onValueChange={(value) => onChange({ ...data, method: value })}
          >
            <SelectTrigger className="w-[130px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(METHOD_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </TableCell>

      {/* Statut */}
      <TableCell>
        <Select
          value={data.status || 'PENDING'}
          onValueChange={(value) => onChange({ ...data, status: value })}
        >
          <SelectTrigger className="w-[110px]">
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

      {/* Notes */}
      <TableCell>
        <Input
          value={data.notes || ''}
          onChange={(e) => onChange({ ...data, notes: e.target.value })}
          placeholder="Notes..."
          className="w-[150px] text-xs"
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
