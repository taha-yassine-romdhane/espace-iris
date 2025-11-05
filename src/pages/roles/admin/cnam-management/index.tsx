import { useState } from 'react';
import { Shield, Plus, Pencil, Trash2, Download, Check, X, Save } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';

interface CNAMNomenclature {
  id: string;
  bonType: string;
  category: 'LOCATION' | 'ACHAT';
  amount: number;
  monthlyRate: number;
  description: string | null;
  isActive: boolean;
  effectiveDate: string;
  createdAt: string;
  updatedAt: string;
}

const BOND_TYPES = [
  { value: 'CONCENTRATEUR_OXYGENE', label: 'Concentrateur Oxygène' },
  { value: 'VNI', label: 'VNI (Ventilation Non Invasive)' },
  { value: 'CPAP', label: 'CPAP' },
  { value: 'MASQUE', label: 'Masque' },
  { value: 'AUTRE', label: 'Autre' },
];

const BOND_CATEGORIES = [
  { value: 'LOCATION', label: 'Location' },
  { value: 'ACHAT', label: 'Achat' },
];

export default function CNAMManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingItem, setDeletingItem] = useState<CNAMNomenclature | null>(null);
  const [activeTab, setActiveTab] = useState('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [addingNew, setAddingNew] = useState(false);
  const [editForm, setEditForm] = useState<Partial<CNAMNomenclature>>({});

  // Fetch nomenclature data
  const { data: nomenclature = [], isLoading } = useQuery({
    queryKey: ['cnam-nomenclature'],
    queryFn: async () => {
      const response = await fetch('/api/cnam-nomenclature');
      if (!response.ok) throw new Error('Failed to fetch nomenclature');
      return response.json();
    },
  });

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: async (data: { id?: string; payload: any }) => {
      const url = data.id
        ? `/api/cnam-nomenclature/${data.id}`
        : '/api/cnam-nomenclature';
      const method = data.id ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data.payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cnam-nomenclature'] });
      toast({
        title: 'Succès',
        description: editingId ? 'Tarif modifié avec succès' : 'Tarif ajouté avec succès',
      });
      setEditingId(null);
      setAddingNew(false);
      setEditForm({});
    },
    onError: (error: Error) => {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/cnam-nomenclature/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cnam-nomenclature'] });
      toast({
        title: 'Succès',
        description: 'Tarif supprimé avec succès',
      });
      setIsDeleteDialogOpen(false);
      setDeletingItem(null);
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
    setAddingNew(true);
    setEditForm({
      bonType: 'CPAP',
      category: 'LOCATION',
      amount: 0,
      monthlyRate: 0,
      description: '',
      isActive: true,
    });
  };

  const handleEdit = (item: CNAMNomenclature) => {
    setEditingId(item.id);
    setEditForm(item);
  };

  const handleCancel = () => {
    setEditingId(null);
    setAddingNew(false);
    setEditForm({});
  };

  const handleSave = () => {
    if (!editForm.bonType || (editForm.amount === undefined && editForm.monthlyRate === undefined)) {
      toast({
        title: 'Erreur',
        description: 'Veuillez remplir tous les champs requis',
        variant: 'destructive',
      });
      return;
    }

    const payload = {
      bonType: editForm.bonType,
      category: editForm.category || 'LOCATION',
      amount: Number(editForm.amount) || 0,
      monthlyRate: editForm.category === 'LOCATION'
        ? Number(editForm.monthlyRate || editForm.amount)
        : 0,
      description: editForm.description || null,
      isActive: editForm.isActive !== false,
    };

    saveMutation.mutate({
      id: editingId || undefined,
      payload,
    });
  };

  const handleDelete = (item: CNAMNomenclature) => {
    setDeletingItem(item);
    setIsDeleteDialogOpen(true);
  };

  const getBondTypeLabel = (bonType: string) => {
    return BOND_TYPES.find((t) => t.value === bonType)?.label || bonType;
  };

  const formatCurrency = (value: any) => {
    if (value === null || value === undefined) return '0.00';
    return Number(value).toFixed(2);
  };

  const formatDate = (date: any) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('fr-FR');
  };

  const locationItems = nomenclature.filter((item: CNAMNomenclature) => item.category === 'LOCATION');
  const achatItems = nomenclature.filter((item: CNAMNomenclature) => item.category === 'ACHAT');

  const renderTableRow = (item: CNAMNomenclature, isEditing: boolean, showCategory: boolean = true) => {
    if (isEditing) {
      return (
        <tr key={item.id} className="bg-yellow-50 border-b border-gray-200">
          <td className="px-4 py-3 border-r border-gray-200 sticky left-0 z-10 bg-yellow-50">
            <Select
              value={editForm.bonType}
              onValueChange={(value) => setEditForm({ ...editForm, bonType: value })}
            >
              <SelectTrigger className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BOND_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </td>
          {showCategory && (
            <td className="px-4 py-3 border-r border-gray-200">
              <Select
                value={editForm.category}
                onValueChange={(value: 'LOCATION' | 'ACHAT') =>
                  setEditForm({ ...editForm, category: value })
                }
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BOND_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </td>
          )}
          <td className="px-4 py-3 border-r border-gray-200">
            <Input
              type="number"
              step="0.01"
              value={editForm.category === 'LOCATION' ? editForm.monthlyRate : editForm.amount}
              onChange={(e) =>
                setEditForm({
                  ...editForm,
                  [editForm.category === 'LOCATION' ? 'monthlyRate' : 'amount']: e.target.value,
                })
              }
              className="h-8 text-sm"
              placeholder="0.00"
            />
          </td>
          <td className="px-4 py-3 border-r border-gray-200">
            <Input
              value={editForm.description || ''}
              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              className="h-8 text-sm"
              placeholder="Description"
            />
          </td>
          <td className="px-4 py-3 border-r border-gray-200 text-center">
            <Select
              value={editForm.isActive ? 'true' : 'false'}
              onValueChange={(value) =>
                setEditForm({ ...editForm, isActive: value === 'true' })
              }
            >
              <SelectTrigger className="h-8 text-sm w-24 mx-auto">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">Actif</SelectItem>
                <SelectItem value="false">Inactif</SelectItem>
              </SelectContent>
            </Select>
          </td>
          <td className="px-4 py-3 border-r border-gray-200 text-center">
            {formatDate(item.effectiveDate)}
          </td>
          <td className="px-4 py-3 border-r border-gray-200 text-center">
            {formatDate(item.updatedAt)}
          </td>
          <td className="px-4 py-3 text-center">
            <div className="flex items-center justify-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSave}
                disabled={saveMutation.isPending}
                className="h-8 w-8 p-0"
              >
                <Check className="h-4 w-4 text-green-600" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCancel}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4 text-red-600" />
              </Button>
            </div>
          </td>
        </tr>
      );
    }

    return (
      <tr
        key={item.id}
        className="border-b border-gray-200 hover:bg-blue-50 transition-colors"
      >
        <td className="px-4 py-3 text-sm border-r border-gray-200 sticky left-0 z-10 bg-white font-medium">
          {getBondTypeLabel(item.bonType)}
        </td>
        {showCategory && (
          <td className="px-4 py-3 text-sm text-center border-r border-gray-200">
            {item.category === 'LOCATION' ? 'Location' : 'Achat'}
          </td>
        )}
        <td className="px-4 py-3 text-sm text-right border-r border-gray-200 font-bold text-blue-700">
          {formatCurrency(item.category === 'LOCATION' ? item.monthlyRate : item.amount)} TND
        </td>
        <td className="px-4 py-3 text-sm border-r border-gray-200">
          {item.description || 'N/A'}
        </td>
        <td className="px-4 py-3 text-sm text-center border-r border-gray-200">
          {item.isActive ? (
            <span className="text-green-700 font-medium">Actif</span>
          ) : (
            <span className="text-gray-500">Inactif</span>
          )}
        </td>
        <td className="px-4 py-3 text-sm text-center border-r border-gray-200">
          {formatDate(item.effectiveDate)}
        </td>
        <td className="px-4 py-3 text-sm text-center border-r border-gray-200">
          {formatDate(item.updatedAt)}
        </td>
        <td className="px-4 py-3 text-center">
          <div className="flex items-center justify-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleEdit(item)}
              className="h-8 w-8 p-0"
            >
              <Pencil className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDelete(item)}
              className="h-8 w-8 p-0"
            >
              <Trash2 className="h-3 w-3 text-red-600" />
            </Button>
          </div>
        </td>
      </tr>
    );
  };

  const renderNewRow = (showCategory: boolean = true) => {
    if (!addingNew) return null;

    return (
      <tr className="bg-green-50 border-b-2 border-green-300">
        <td className="px-4 py-3 border-r border-gray-200 sticky left-0 z-10 bg-green-50">
          <Select
            value={editForm.bonType}
            onValueChange={(value) => setEditForm({ ...editForm, bonType: value })}
          >
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder="Type de bon" />
            </SelectTrigger>
            <SelectContent>
              {BOND_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </td>
        {showCategory && (
          <td className="px-4 py-3 border-r border-gray-200">
            <Select
              value={editForm.category}
              onValueChange={(value: 'LOCATION' | 'ACHAT') =>
                setEditForm({ ...editForm, category: value })
              }
            >
              <SelectTrigger className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BOND_CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </td>
        )}
        <td className="px-4 py-3 border-r border-gray-200">
          <Input
            type="number"
            step="0.01"
            value={editForm.category === 'LOCATION' ? editForm.monthlyRate : editForm.amount}
            onChange={(e) =>
              setEditForm({
                ...editForm,
                [editForm.category === 'LOCATION' ? 'monthlyRate' : 'amount']: e.target.value,
              })
            }
            className="h-8 text-sm"
            placeholder="0.00"
          />
        </td>
        <td className="px-4 py-3 border-r border-gray-200">
          <Input
            value={editForm.description || ''}
            onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
            className="h-8 text-sm"
            placeholder="Description"
          />
        </td>
        <td className="px-4 py-3 border-r border-gray-200 text-center">
          <Select
            value={editForm.isActive ? 'true' : 'false'}
            onValueChange={(value) =>
              setEditForm({ ...editForm, isActive: value === 'true' })
            }
          >
            <SelectTrigger className="h-8 text-sm w-24 mx-auto">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="true">Actif</SelectItem>
              <SelectItem value="false">Inactif</SelectItem>
            </SelectContent>
          </Select>
        </td>
        <td className="px-4 py-3 border-r border-gray-200 text-center text-sm text-gray-500">
          Nouveau
        </td>
        <td className="px-4 py-3 border-r border-gray-200 text-center text-sm text-gray-500">
          --
        </td>
        <td className="px-4 py-3 text-center">
          <div className="flex items-center justify-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSave}
              disabled={saveMutation.isPending}
              className="h-8 w-8 p-0"
            >
              <Save className="h-4 w-4 text-green-600" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancel}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4 text-red-600" />
            </Button>
          </div>
        </td>
      </tr>
    );
  };

  const renderTable = (data: CNAMNomenclature[], showCategory: boolean = true) => {
    const colSpan = showCategory ? 8 : 7;
    return (
      <div className="border border-gray-300 rounded-lg overflow-hidden bg-white">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse" style={{ minWidth: '100%' }}>
            <thead>
              <tr className="bg-gray-100 border-b-2 border-gray-300">
                <th className="px-4 py-3 text-sm font-semibold text-gray-700 border-r border-gray-300 text-left sticky left-0 z-20 bg-gray-100" style={{ width: '220px' }}>
                  Type de Bon
                </th>
                {showCategory && (
                  <th className="px-4 py-3 text-sm font-semibold text-gray-700 border-r border-gray-300 text-center" style={{ width: '120px' }}>
                    Catégorie
                  </th>
                )}
                <th className="px-4 py-3 text-sm font-semibold text-gray-700 border-r border-gray-300 text-right" style={{ width: '150px' }}>
                  Montant
                </th>
                <th className="px-4 py-3 text-sm font-semibold text-gray-700 border-r border-gray-300 text-left" style={{ width: '250px' }}>
                  Description
                </th>
                <th className="px-4 py-3 text-sm font-semibold text-gray-700 border-r border-gray-300 text-center" style={{ width: '100px' }}>
                  Statut
                </th>
                <th className="px-4 py-3 text-sm font-semibold text-gray-700 border-r border-gray-300 text-center" style={{ width: '120px' }}>
                  Date Effective
                </th>
                <th className="px-4 py-3 text-sm font-semibold text-gray-700 border-r border-gray-300 text-center" style={{ width: '120px' }}>
                  Dernière MAJ
                </th>
                <th className="px-4 py-3 text-sm font-semibold text-gray-700 text-center" style={{ width: '120px' }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {renderNewRow(showCategory)}
              {data.map((item) => renderTableRow(item, editingId === item.id, showCategory))}
              {data.length === 0 && !addingNew && (
                <tr>
                  <td colSpan={colSpan} className="px-4 py-8 text-center text-gray-500">
                    Aucun tarif trouvé
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="mt-2 px-4 pb-2 text-xs text-gray-500 flex items-center justify-between">
          <span>Faites défiler horizontalement pour voir toutes les colonnes</span>
          <span>{data.length} ligne{data.length !== 1 ? 's' : ''}</span>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Gestion CNAM - Nomenclature</h1>
            <p className="text-gray-500 mt-1">
              Tarifs fixes CNAM - Édition inline comme Excel
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Exporter Excel
          </Button>
          <Button onClick={handleAddNew} disabled={addingNew || editingId !== null}>
            <Plus className="h-4 w-4 mr-2" />
            Ajouter une ligne
          </Button>
        </div>
      </div>


      {/* Excel Tables with Tabs */}
      <Card>
        <CardContent className="p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="all">
                Tous les Tarifs ({nomenclature.length})
              </TabsTrigger>
              <TabsTrigger value="location" className="text-blue-700">
                Bons de Location ({locationItems.length})
              </TabsTrigger>
              <TabsTrigger value="achat" className="text-green-700">
                Bons d&acirc;Achat ({achatItems.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="mt-6">
              {renderTable(nomenclature, true)}
            </TabsContent>

            <TabsContent value="location" className="mt-6">
              {renderTable(locationItems, false)}
            </TabsContent>

            <TabsContent value="achat" className="mt-6">
              {renderTable(achatItems, false)}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>


      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer ce tarif CNAM ?
              {deletingItem && (
                <div className="mt-2 p-3 bg-gray-50 rounded border">
                  <div className="font-medium">
                    {getBondTypeLabel(deletingItem.bonType)}
                  </div>
                  <div className="text-sm text-gray-600">
                    {deletingItem.category === 'LOCATION'
                      ? `${formatCurrency(deletingItem.monthlyRate)} TND/mois`
                      : `${formatCurrency(deletingItem.amount)} TND`}
                  </div>
                </div>
              )}
              <div className="mt-2 text-red-600">
                Cette action est irréversible.
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingItem && deleteMutation.mutate(deletingItem.id)}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteMutation.isPending ? 'Suppression...' : 'Supprimer'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
