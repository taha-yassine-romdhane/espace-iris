import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { Plus, Save, X, Edit2, AlertCircle, ShoppingCart, Package } from 'lucide-react';
import EmployeeArticleSelectionDialog from '@/components/employee/EmployeeArticleSelectionDialog';

interface AddSaleFormProps {
  patientId: string;
  sales: any[];
  onSuccess: () => void;
}

export const AddSaleForm: React.FC<AddSaleFormProps> = ({
  patientId,
  sales,
  onSuccess
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState('sales');

  // Sales tab state
  const [editingSaleId, setEditingSaleId] = useState<string | null>(null);
  const [newSaleRow, setNewSaleRow] = useState<any | null>(null);
  const [editSaleData, setEditSaleData] = useState<any>({});

  // Articles tab state
  const [editingArticleId, setEditingArticleId] = useState<string | null>(null);
  const [newArticleRow, setNewArticleRow] = useState<any | null>(null);
  const [editArticleData, setEditArticleData] = useState<any>({});
  const [selectedArticle, setSelectedArticle] = useState<any>(null);
  const [articleDialogOpen, setArticleDialogOpen] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-100 text-green-800';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'Terminé';
      case 'PENDING':
        return 'En attente';
      case 'CANCELLED':
        return 'Annulé';
      default:
        return status;
    }
  };

  const formatAmount = (amount: any) => {
    const num = Number(amount);
    return isNaN(num) ? '0.00' : num.toFixed(2);
  };

  // Get all articles from all sales
  const allArticles = sales.flatMap(sale =>
    (sale.items || []).map((item: any) => ({
      ...item,
      saleId: sale.id,
      saleCode: sale.saleCode,
      saleDate: sale.saleDate
    }))
  );

  // Create sale mutation
  const createSaleMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          patientId,
          assignedToId: session?.user?.id,
        }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create sale');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patient', patientId] });
      toast({ title: 'Succès', description: 'Vente créée avec succès' });
      setNewSaleRow(null);
      onSuccess();
    },
    onError: (error: Error) => {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    },
  });

  // Update sale mutation
  const updateSaleMutation = useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      const response = await fetch(`/api/sales/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update sale');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patient', patientId] });
      toast({ title: 'Succès', description: 'Vente mise à jour' });
      setEditingSaleId(null);
      onSuccess();
    },
    onError: (error: Error) => {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    },
  });

  const handleAddNewSale = () => {
    setNewSaleRow({
      saleDate: new Date().toISOString().split('T')[0],
      status: 'PENDING',
      totalAmount: 0,
      discount: 0,
      finalAmount: 0,
      notes: '',
    });
    setEditingSaleId(null);
  };

  const handleSaveNewSale = () => {
    if (!newSaleRow.saleDate) {
      toast({ title: 'Erreur', description: 'La date de vente est requise', variant: 'destructive' });
      return;
    }
    createSaleMutation.mutate(newSaleRow);
  };

  const handleEditSale = (sale: any) => {
    setEditSaleData({
      id: sale.id,
      saleDate: sale.saleDate ? new Date(sale.saleDate).toISOString().split('T')[0] : '',
      status: sale.status,
      discount: sale.discount || 0,
      notes: sale.notes || '',
    });
    setEditingSaleId(sale.id);
    setNewSaleRow(null);
  };

  const handleSaveEditSale = () => {
    updateSaleMutation.mutate(editSaleData);
  };

  // Create sale item mutation
  const createItemMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch('/api/sale-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create item');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patient', patientId] });
      toast({ title: 'Succès', description: 'Article ajouté avec succès' });
      setNewArticleRow(null);
      setSelectedArticle(null);
      onSuccess();
    },
    onError: (error: Error) => {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    },
  });

  // Update sale item mutation
  const updateItemMutation = useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      const response = await fetch(`/api/sale-items/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update item');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patient', patientId] });
      toast({ title: 'Succès', description: 'Article modifié' });
      setEditingArticleId(null);
      setEditArticleData({});
      setSelectedArticle(null);
      onSuccess();
    },
    onError: (error: Error) => {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    },
  });

  const handleAddNewArticle = () => {
    setNewArticleRow({
      saleId: '',
      quantity: 1,
      unitPrice: 0,
      discount: 0,
      itemTotal: 0,
      serialNumber: '',
      description: '',
    });
    setEditingArticleId(null);
  };

  const handleSaveNewArticle = () => {
    if (!newArticleRow.saleId) {
      toast({ title: 'Erreur', description: 'Veuillez sélectionner une vente', variant: 'destructive' });
      return;
    }
    if (!selectedArticle) {
      toast({ title: 'Erreur', description: 'Veuillez sélectionner un article', variant: 'destructive' });
      return;
    }

    const itemTotal = (newArticleRow.unitPrice * newArticleRow.quantity) - (newArticleRow.discount || 0);

    createItemMutation.mutate({
      ...newArticleRow,
      productId: selectedArticle.type === 'product' ? selectedArticle.id : undefined,
      medicalDeviceId: selectedArticle.type === 'medical-device' ? selectedArticle.id : undefined,
      itemTotal,
    });
  };

  const handleEditArticle = (item: any) => {
    setEditArticleData({
      id: item.id,
      saleId: item.saleId,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      discount: item.discount || 0,
      serialNumber: item.serialNumber || '',
      description: item.description || '',
    });
    setEditingArticleId(item.id);

    if (item.product) {
      setSelectedArticle({
        type: 'product',
        id: item.product.id,
        name: item.product.name,
        code: item.product.productCode,
      });
    } else if (item.medicalDevice) {
      setSelectedArticle({
        type: 'medical-device',
        id: item.medicalDevice.id,
        name: item.medicalDevice.name,
        code: item.medicalDevice.deviceCode,
        serialNumber: item.medicalDevice.serialNumber,
      });
    }
  };

  const handleSaveEditArticle = () => {
    if (!editArticleData.saleId) {
      toast({ title: 'Erreur', description: 'Veuillez sélectionner une vente', variant: 'destructive' });
      return;
    }

    const itemTotal = (editArticleData.unitPrice * editArticleData.quantity) - (editArticleData.discount || 0);

    updateItemMutation.mutate({
      ...editArticleData,
      itemTotal,
    });
  };

  return (
    <>
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="grid w-full grid-cols-2 mb-4">
        <TabsTrigger value="sales" className="flex items-center gap-2">
          <ShoppingCart className="h-4 w-4" />
          Ventes
        </TabsTrigger>
        <TabsTrigger value="articles" className="flex items-center gap-2">
          <Package className="h-4 w-4" />
          Articles
        </TabsTrigger>
      </TabsList>

      {/* SALES TAB */}
      <TabsContent value="sales" className="mt-0">
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-semibold text-gray-700">
              {sales.length} vente(s)
            </h3>
            <Button
              onClick={handleAddNewSale}
              disabled={!!newSaleRow}
              className="bg-green-600 hover:bg-green-700"
              size="sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              Ajouter
            </Button>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-700">Code</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-700">Date</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-700">Montant Total</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-700">Remise</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-700">Montant Final</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-700">Statut</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-700">Notes</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {/* New Row */}
                  {newSaleRow && (
                    <tr className="bg-green-50 border-b-2 border-green-200">
                      <td className="px-3 py-2">
                        <span className="text-xs text-gray-400">Auto</span>
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          type="date"
                          value={newSaleRow.saleDate}
                          onChange={(e) => setNewSaleRow({ ...newSaleRow, saleDate: e.target.value })}
                          className="h-8 text-xs"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          type="number"
                          step="0.01"
                          value={newSaleRow.totalAmount}
                          onChange={(e) => {
                            const total = parseFloat(e.target.value) || 0;
                            const discount = newSaleRow.discount || 0;
                            setNewSaleRow({
                              ...newSaleRow,
                              totalAmount: total,
                              finalAmount: total - discount
                            });
                          }}
                          className="h-8 text-xs"
                          placeholder="0.00"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          type="number"
                          step="0.01"
                          value={newSaleRow.discount}
                          onChange={(e) => {
                            const discount = parseFloat(e.target.value) || 0;
                            const total = newSaleRow.totalAmount || 0;
                            setNewSaleRow({
                              ...newSaleRow,
                              discount,
                              finalAmount: total - discount
                            });
                          }}
                          className="h-8 text-xs"
                          placeholder="0.00"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <span className="text-xs font-medium">{formatAmount(newSaleRow.finalAmount)} DT</span>
                      </td>
                      <td className="px-3 py-2">
                        <Select
                          value={newSaleRow.status}
                          onValueChange={(value) => setNewSaleRow({ ...newSaleRow, status: value })}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="PENDING">En attente</SelectItem>
                            <SelectItem value="COMPLETED">Terminé</SelectItem>
                            <SelectItem value="CANCELLED">Annulé</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          value={newSaleRow.notes || ''}
                          onChange={(e) => setNewSaleRow({ ...newSaleRow, notes: e.target.value })}
                          className="h-8 text-xs"
                          placeholder="Notes"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex gap-1">
                          <Button
                            onClick={handleSaveNewSale}
                            disabled={createSaleMutation.isPending}
                            className="h-7 px-2 bg-green-600 hover:bg-green-700"
                            size="sm"
                          >
                            <Save className="h-3 w-3" />
                          </Button>
                          <Button
                            onClick={() => setNewSaleRow(null)}
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
                  {sales.map((sale: any) => {
                    const isEditing = editingSaleId === sale.id;

                    if (isEditing) {
                      return (
                        <tr key={sale.id} className="bg-blue-50 border-b-2 border-blue-200">
                          <td className="px-3 py-2">
                            <span className="text-xs font-mono">{sale.saleCode}</span>
                          </td>
                          <td className="px-3 py-2">
                            <Input
                              type="date"
                              value={editSaleData.saleDate}
                              onChange={(e) => setEditSaleData({ ...editSaleData, saleDate: e.target.value })}
                              className="h-8 text-xs"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <span className="text-xs">{formatAmount(sale.totalAmount)} DT</span>
                          </td>
                          <td className="px-3 py-2">
                            <Input
                              type="number"
                              step="0.01"
                              value={editSaleData.discount}
                              onChange={(e) => setEditSaleData({ ...editSaleData, discount: parseFloat(e.target.value) || 0 })}
                              className="h-8 text-xs"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <span className="text-xs font-medium">{formatAmount(sale.finalAmount)} DT</span>
                          </td>
                          <td className="px-3 py-2">
                            <Select
                              value={editSaleData.status}
                              onValueChange={(value) => setEditSaleData({ ...editSaleData, status: value })}
                            >
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="PENDING">En attente</SelectItem>
                                <SelectItem value="COMPLETED">Terminé</SelectItem>
                                <SelectItem value="CANCELLED">Annulé</SelectItem>
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="px-3 py-2">
                            <Input
                              value={editSaleData.notes || ''}
                              onChange={(e) => setEditSaleData({ ...editSaleData, notes: e.target.value })}
                              className="h-8 text-xs"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex gap-1">
                              <Button
                                onClick={handleSaveEditSale}
                                disabled={updateSaleMutation.isPending}
                                className="h-7 px-2 bg-blue-600 hover:bg-blue-700"
                                size="sm"
                              >
                                <Save className="h-3 w-3" />
                              </Button>
                              <Button
                                onClick={() => setEditingSaleId(null)}
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

                    return (
                      <tr key={sale.id} className="border-b hover:bg-gray-50">
                        <td className="px-3 py-2">
                          <span className="text-xs font-mono">{sale.saleCode}</span>
                        </td>
                        <td className="px-3 py-2">
                          <span className="text-xs">{sale.saleDate ? new Date(sale.saleDate).toLocaleDateString('fr-FR') : '-'}</span>
                        </td>
                        <td className="px-3 py-2">
                          <span className="text-xs">{formatAmount(sale.totalAmount)} DT</span>
                        </td>
                        <td className="px-3 py-2">
                          <span className="text-xs">{formatAmount(sale.discount)} DT</span>
                        </td>
                        <td className="px-3 py-2">
                          <span className="text-xs font-medium">{formatAmount(sale.finalAmount)} DT</span>
                        </td>
                        <td className="px-3 py-2">
                          <Badge variant="outline" className={`text-xs ${getStatusColor(sale.status)}`}>
                            {getStatusLabel(sale.status)}
                          </Badge>
                        </td>
                        <td className="px-3 py-2">
                          <span className="text-xs text-gray-600">{sale.notes || '-'}</span>
                        </td>
                        <td className="px-3 py-2">
                          <Button
                            onClick={() => handleEditSale(sale)}
                            variant="ghost"
                            className="h-7 px-2 hover:bg-blue-100"
                            size="sm"
                          >
                            <Edit2 className="h-3 w-3" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}

                  {sales.length === 0 && !newSaleRow && (
                    <tr>
                      <td colSpan={8} className="px-3 py-8 text-center text-gray-500 text-sm">
                        <AlertCircle className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                        Aucune vente. Cliquez sur "Ajouter" pour commencer.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </TabsContent>

      {/* ARTICLES TAB */}
      <TabsContent value="articles" className="mt-0">
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-semibold text-gray-700">
              {allArticles.length} article(s)
            </h3>
            <Button
              onClick={handleAddNewArticle}
              disabled={!!newArticleRow}
              className="bg-green-600 hover:bg-green-700"
              size="sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              Ajouter
            </Button>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-700">Vente</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-700">Article</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-700">Quantité</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-700">Prix Unit.</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-700">Remise</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-700">Total</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-700">N° Série</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {/* New Row */}
                  {newArticleRow && (
                    <tr className="bg-green-50 border-b-2 border-green-200">
                      <td className="px-3 py-2">
                        <Select
                          value={newArticleRow.saleId}
                          onValueChange={(value) => setNewArticleRow({ ...newArticleRow, saleId: value })}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Sélectionner vente" />
                          </SelectTrigger>
                          <SelectContent>
                            {sales.map((sale: any) => (
                              <SelectItem key={sale.id} value={sale.id}>
                                {sale.saleCode} - {sale.saleDate ? new Date(sale.saleDate).toLocaleDateString('fr-FR') : ''}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-3 py-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setArticleDialogOpen(true)}
                          className="h-8 text-xs"
                        >
                          {selectedArticle ? selectedArticle.name : 'Sélectionner article'}
                        </Button>
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          type="number"
                          value={newArticleRow.quantity}
                          onChange={(e) => setNewArticleRow({ ...newArticleRow, quantity: parseInt(e.target.value) || 1 })}
                          className="h-8 text-xs w-20"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          type="number"
                          step="0.01"
                          value={newArticleRow.unitPrice}
                          onChange={(e) => setNewArticleRow({ ...newArticleRow, unitPrice: parseFloat(e.target.value) || 0 })}
                          className="h-8 text-xs w-24"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          type="number"
                          step="0.01"
                          value={newArticleRow.discount}
                          onChange={(e) => setNewArticleRow({ ...newArticleRow, discount: parseFloat(e.target.value) || 0 })}
                          className="h-8 text-xs w-24"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <span className="text-xs font-medium">{formatAmount((newArticleRow.unitPrice * newArticleRow.quantity) - (newArticleRow.discount || 0))} DT</span>
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          value={newArticleRow.serialNumber}
                          onChange={(e) => setNewArticleRow({ ...newArticleRow, serialNumber: e.target.value })}
                          className="h-8 text-xs"
                          placeholder="N° série"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex gap-1">
                          <Button
                            onClick={handleSaveNewArticle}
                            disabled={createItemMutation.isPending}
                            className="h-7 px-2 bg-green-600 hover:bg-green-700"
                            size="sm"
                          >
                            <Save className="h-3 w-3" />
                          </Button>
                          <Button
                            onClick={() => {
                              setNewArticleRow(null);
                              setSelectedArticle(null);
                            }}
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
                  {allArticles.map((item: any) => {
                    const isEditing = editingArticleId === item.id;

                    if (isEditing) {
                      return (
                        <tr key={item.id} className="bg-blue-50 border-b-2 border-blue-200">
                          <td className="px-3 py-2">
                            <Select
                              value={editArticleData.saleId}
                              onValueChange={(value) => setEditArticleData({ ...editArticleData, saleId: value })}
                            >
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {sales.map((sale: any) => (
                                  <SelectItem key={sale.id} value={sale.id}>
                                    {sale.saleCode} - {sale.saleDate ? new Date(sale.saleDate).toLocaleDateString('fr-FR') : ''}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="px-3 py-2">
                            <div className="text-xs">
                              <div className="font-medium">{selectedArticle?.name || '-'}</div>
                              <div className="text-gray-500">{selectedArticle?.code || '-'}</div>
                            </div>
                          </td>
                          <td className="px-3 py-2">
                            <Input
                              type="number"
                              value={editArticleData.quantity}
                              onChange={(e) => setEditArticleData({ ...editArticleData, quantity: parseInt(e.target.value) || 1 })}
                              className="h-8 text-xs w-20"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <Input
                              type="number"
                              step="0.01"
                              value={editArticleData.unitPrice}
                              onChange={(e) => setEditArticleData({ ...editArticleData, unitPrice: parseFloat(e.target.value) || 0 })}
                              className="h-8 text-xs w-24"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <Input
                              type="number"
                              step="0.01"
                              value={editArticleData.discount}
                              onChange={(e) => setEditArticleData({ ...editArticleData, discount: parseFloat(e.target.value) || 0 })}
                              className="h-8 text-xs w-24"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <span className="text-xs font-medium">{formatAmount((editArticleData.unitPrice * editArticleData.quantity) - (editArticleData.discount || 0))} DT</span>
                          </td>
                          <td className="px-3 py-2">
                            <Input
                              value={editArticleData.serialNumber}
                              onChange={(e) => setEditArticleData({ ...editArticleData, serialNumber: e.target.value })}
                              className="h-8 text-xs"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex gap-1">
                              <Button
                                onClick={handleSaveEditArticle}
                                disabled={updateItemMutation.isPending}
                                className="h-7 px-2 bg-green-600 hover:bg-green-700"
                                size="sm"
                              >
                                <Save className="h-3 w-3" />
                              </Button>
                              <Button
                                onClick={() => {
                                  setEditingArticleId(null);
                                  setEditArticleData({});
                                  setSelectedArticle(null);
                                }}
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

                    return (
                      <tr key={item.id} className="border-b hover:bg-gray-50">
                        <td className="px-3 py-2">
                          <div className="text-xs">
                            <div className="font-mono">{item.saleCode}</div>
                            <div className="text-gray-500">{item.saleDate ? new Date(item.saleDate).toLocaleDateString('fr-FR') : '-'}</div>
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <div className="text-xs">
                            <div className="font-medium">{item.product?.name || item.medicalDevice?.name || '-'}</div>
                            <div className="text-gray-500">{item.product?.productCode || item.medicalDevice?.deviceCode || '-'}</div>
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <span className="text-xs">{item.quantity}</span>
                        </td>
                        <td className="px-3 py-2">
                          <span className="text-xs">{formatAmount(item.unitPrice)} DT</span>
                        </td>
                        <td className="px-3 py-2">
                          <span className="text-xs">{formatAmount(item.discount)} DT</span>
                        </td>
                        <td className="px-3 py-2">
                          <span className="text-xs font-medium">{formatAmount(item.itemTotal)} DT</span>
                        </td>
                        <td className="px-3 py-2">
                          <span className="text-xs text-gray-600">{item.serialNumber || '-'}</span>
                        </td>
                        <td className="px-3 py-2">
                          <Button
                            onClick={() => handleEditArticle(item)}
                            variant="ghost"
                            className="h-7 px-2 hover:bg-blue-100"
                            size="sm"
                          >
                            <Edit2 className="h-3 w-3" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}

                  {allArticles.length === 0 && !newArticleRow && (
                    <tr>
                      <td colSpan={8} className="px-3 py-8 text-center text-gray-500 text-sm">
                        <AlertCircle className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                        Aucun article. Cliquez sur "Ajouter" pour commencer.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </TabsContent>
    </Tabs>

    {/* Article Selection Dialog */}
    <EmployeeArticleSelectionDialog
      open={articleDialogOpen}
      onClose={() => setArticleDialogOpen(false)}
      onSelect={(article) => {
        setSelectedArticle(article);
        if (newArticleRow) {
          setNewArticleRow({
            ...newArticleRow,
            unitPrice: article.unitPrice || 0,
          });
        }
        setArticleDialogOpen(false);
      }}
    />
    </>
  );
};

export default AddSaleForm;
