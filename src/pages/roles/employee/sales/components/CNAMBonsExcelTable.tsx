import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Shield, Plus, Save, X, Edit2, Trash2, FileText, AlertCircle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Progress } from '@/components/ui/progress';
import { formatCurrency } from '@/utils/priceUtils';

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
};

const STEP_LABELS: Record<number, string> = {
  1: 'En attente approbation CNAM',
  2: 'Accord avec patient',
  3: 'Documents reçus de CNAM',
  4: 'Préparation appareil',
  5: 'Livraison au Technicien',
  6: 'Signature Médecin',
  7: 'Livraison finale Admin',
};

export default function CNAMBonsExcelTable() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [editData, setEditData] = useState<any>(null);

  // Fetch all sales with CNAM bonds (details=true to include cnamBons with category ACHAT)
  const { data: salesData = [], isLoading } = useQuery({
    queryKey: ['sales-with-cnam'],
    queryFn: async () => {
      const response = await fetch('/api/sales?details=true');
      if (!response.ok) throw new Error('Failed to fetch sales');
      const data = await response.json();
      return data.sales || [];
    },
  });

  // Fetch CNAM nomenclature for rates
  const { data: nomenclature = [] } = useQuery({
    queryKey: ['cnam-nomenclature'],
    queryFn: async () => {
      const response = await fetch('/api/cnam-nomenclature?isActive=true');
      if (!response.ok) throw new Error('Failed to fetch nomenclature');
      return response.json();
    },
  });

  // Extract all CNAM bonds from sales
  const allBonds = salesData.flatMap((sale: any) =>
    (sale.cnamBons || []).map((bon: any) => ({
      ...bon,
      sale: {
        id: sale.id,
        saleCode: sale.saleCode,
        invoiceNumber: sale.invoiceNumber,
        totalAmount: sale.totalAmount,
        items: sale.items,
      },
      patient: sale.patient,
    }))
  );

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (bond: any) => {
      const response = await fetch('/api/cnam-bons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bond),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create CNAM bond');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({ title: 'Succès', description: 'Bon CNAM créé avec succès' });
      queryClient.invalidateQueries({ queryKey: ['sales-with-cnam'] });
      setIsAddingNew(false);
      setEditData(null);
    },
    onError: (error: Error) => {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, ...bond }: any) => {
      const response = await fetch(`/api/cnam-bons/${id}`, {
        method: 'PUT',
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
      toast({ title: 'Succès', description: 'Bon CNAM mis à jour avec succès' });
      queryClient.invalidateQueries({ queryKey: ['sales-with-cnam'] });
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
      const response = await fetch(`/api/cnam-bons/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete CNAM bond');
      return response.json();
    },
    onSuccess: () => {
      toast({ title: 'Succès', description: 'Bon CNAM supprimé avec succès' });
      queryClient.invalidateQueries({ queryKey: ['sales-with-cnam'] });
    },
    onError: (error: Error) => {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    },
  });

  const handleAddNew = () => {
    setEditData({
      bonType: 'CONCENTRATEUR_OXYGENE',
      status: 'CREATION',
      category: 'ACHAT',
      cnamMonthlyRate: 0,
      deviceMonthlyRate: 0,
      coveredMonths: 1,
      bonAmount: 0,
      devicePrice: 0,
      complementAmount: 0,
      currentStep: 1,
      renewalReminderDays: 30,
      saleId: '',
      patientId: '',
    });
    setIsAddingNew(true);
  };

  const handleEdit = (bond: any) => {
    setEditingId(bond.id);
    setEditData({ ...bond });
  };

  const handleSaveNew = () => {
    if (!editData) return;
    if (!editData.saleId) {
      toast({ title: 'Erreur', description: 'Veuillez sélectionner une vente', variant: 'destructive' });
      return;
    }
    createMutation.mutate(editData);
  };

  const handleSaveEdit = () => {
    if (!editingId || !editData) return;
    updateMutation.mutate({ id: editingId, ...editData });
  };

  const handleDelete = (id: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce bon CNAM ?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleCancel = () => {
    setIsAddingNew(false);
    setEditingId(null);
    setEditData(null);
  };

  const handleBondTypeChange = (selectedBondType: string) => {
    if (!editData) return;
    const nomenclatureItem = nomenclature.find((n: any) => n.bonType === selectedBondType);
    const cnamRate = nomenclatureItem?.monthlyRate || 0;

    const bonAmount = cnamRate * 1; // Sales are always 1 month
    const devicePrice = editData.deviceMonthlyRate || 0;
    const complementAmount = devicePrice - bonAmount;

    setEditData({
      ...editData,
      bonType: selectedBondType,
      cnamMonthlyRate: cnamRate,
      bonAmount,
      complementAmount,
    });
  };

  const handleSaleChange = (saleId: string) => {
    if (!editData) return;

    const selectedSale = salesData.find((s: any) => s.id === saleId);
    if (!selectedSale) return;

    // Calculate device price from sale items
    const totalDevicePrice = (selectedSale.items || []).reduce((sum: number, item: any) => {
      return sum + (parseFloat(item.itemTotal) || 0);
    }, 0);

    const cnamRate = editData.cnamMonthlyRate || 0;
    const bonAmount = cnamRate * 1;
    const complementAmount = totalDevicePrice - bonAmount;

    setEditData({
      ...editData,
      saleId,
      patientId: selectedSale.patientId,
      deviceMonthlyRate: totalDevicePrice,
      devicePrice: totalDevicePrice,
      complementAmount,
      coveredMonths: 1,
    });
  };

  const getProgressBar = (currentStep: number, totalSteps: number = 7) => {
    const percentage = (currentStep / totalSteps) * 100;
    const stepName = STEP_LABELS[currentStep] || `Étape ${currentStep}`;

    return (
      <div className="w-full">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-slate-600 truncate" title={stepName}>
            Étape {currentStep}/{totalSteps}
          </span>
          <span className="text-xs font-semibold text-green-700 ml-2">{Math.round(percentage)}%</span>
        </div>
        <div className="w-full bg-slate-200 rounded-full h-2">
          <div
            className="h-2 rounded-full transition-all duration-300 bg-gradient-to-r from-green-500 to-green-600"
            style={{ width: `${percentage}%` }}
          />
        </div>
        <div className="text-xs text-slate-500 mt-0.5 truncate">{stepName}</div>
      </div>
    );
  };

  const formatAmount = (amount: any) => {
    if (!amount) return '0.00';
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return num.toFixed(2);
  };

  const sortedBonds = [...allBonds].sort((a, b) => {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-500" />
            Bons CNAM - Ventes
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
              <Shield className="h-5 w-5 text-blue-500" />
              Bons CNAM - Ventes
            </CardTitle>
            <p className="text-sm text-gray-500 mt-1">
              Gérer les bons CNAM pour les ventes (catégorie ACHAT)
            </p>
          </div>
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
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[140px]">Numéros</TableHead>
                <TableHead className="min-w-[150px]">Vente</TableHead>
                <TableHead className="min-w-[150px]">Patient</TableHead>
                <TableHead className="min-w-[120px]">Type</TableHead>
                <TableHead className="min-w-[160px]">Montants (Auto)</TableHead>
                <TableHead className="min-w-[180px]">Progression</TableHead>
                <TableHead className="min-w-[100px]">Statut</TableHead>
                <TableHead className="min-w-[150px]">Notes</TableHead>
                <TableHead className="min-w-[120px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* Add New Row */}
              {isAddingNew && editData && (
                <TableRow className="bg-green-50">
                  {/* Numéros */}
                  <TableCell>
                    <div className="space-y-1">
                      <div className="text-[10px] text-gray-500">BL: Auto</div>
                      <Input
                        type="text"
                        placeholder="N° Dossier"
                        value={editData.dossierNumber || ''}
                        onChange={(e) => setEditData({ ...editData, dossierNumber: e.target.value })}
                        className="text-xs h-7"
                      />
                    </div>
                  </TableCell>

                  {/* Vente */}
                  <TableCell>
                    <Select value={editData.saleId || ''} onValueChange={handleSaleChange}>
                      <SelectTrigger className="text-xs h-7">
                        <SelectValue placeholder="Sélectionner vente" />
                      </SelectTrigger>
                      <SelectContent>
                        {salesData.map((sale: any) => (
                          <SelectItem key={sale.id} value={sale.id}>
                            {sale.saleCode} - {formatCurrency(sale.totalAmount || 0)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>

                  {/* Patient */}
                  <TableCell>
                    <div className="text-xs text-gray-600">
                      {editData.saleId ? (
                        <>
                          {salesData.find((s: any) => s.id === editData.saleId)?.patient?.firstName}{' '}
                          {salesData.find((s: any) => s.id === editData.saleId)?.patient?.lastName}
                        </>
                      ) : (
                        '-'
                      )}
                    </div>
                  </TableCell>

                  {/* Type */}
                  <TableCell>
                    <Select value={editData.bonType || 'CONCENTRATEUR_OXYGENE'} onValueChange={handleBondTypeChange}>
                      <SelectTrigger className="text-xs h-7">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(BOND_TYPE_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>

                  {/* Montants */}
                  <TableCell>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-500">CNAM:</span>
                        <span className="font-semibold text-blue-600">{formatAmount(editData.bonAmount)} DT</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Prix:</span>
                        <span className="font-semibold">{formatAmount(editData.devicePrice)} DT</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Compl:</span>
                        <span className="font-semibold text-amber-600">{formatAmount(editData.complementAmount)} DT</span>
                      </div>
                    </div>
                  </TableCell>

                  {/* Progression */}
                  <TableCell>
                    <div className="space-y-1">
                      <Select
                        value={String(editData.currentStep || 1)}
                        onValueChange={(v) => setEditData({ ...editData, currentStep: parseInt(v) })}
                      >
                        <SelectTrigger className="text-xs h-7">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[1, 2, 3, 4, 5, 6, 7].map((step) => (
                            <SelectItem key={step} value={String(step)}>
                              {step}. {STEP_LABELS[step]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Progress value={(editData.currentStep / 7) * 100} className="h-2" />
                      <div className="text-[10px] text-slate-500 truncate">
                        {STEP_LABELS[editData.currentStep || 1]}
                      </div>
                    </div>
                  </TableCell>

                  {/* Statut */}
                  <TableCell>
                    <Select value={editData.status} onValueChange={(v) => setEditData({ ...editData, status: v })}>
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
              {sortedBonds.map((bond) => {
                const isEditing = editingId === bond.id;

                if (isEditing && editData) {
                  return (
                    <TableRow key={bond.id} className="bg-blue-50">
                      {/* Numéros */}
                      <TableCell>
                        <div className="space-y-1">
                          <div className="text-[10px] text-gray-500">BL: {bond.bonNumber || 'Auto'}</div>
                          <Input
                            type="text"
                            placeholder="N° Dossier"
                            value={editData.dossierNumber || ''}
                            onChange={(e) => setEditData({ ...editData, dossierNumber: e.target.value })}
                            className="text-xs h-7"
                          />
                        </div>
                      </TableCell>

                      {/* Vente */}
                      <TableCell>
                        <div className="text-xs">
                          <Badge variant="outline">{bond.sale?.saleCode}</Badge>
                          <div className="text-[10px] text-gray-500 mt-0.5">
                            {formatCurrency(bond.sale?.totalAmount || 0)}
                          </div>
                        </div>
                      </TableCell>

                      {/* Patient */}
                      <TableCell>
                        <div className="text-xs text-gray-600">
                          {bond.patient?.firstName} {bond.patient?.lastName}
                        </div>
                      </TableCell>

                      {/* Type */}
                      <TableCell>
                        <Select value={editData.bonType || 'CONCENTRATEUR_OXYGENE'} onValueChange={handleBondTypeChange}>
                          <SelectTrigger className="text-xs h-7">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(BOND_TYPE_LABELS).map(([value, label]) => (
                              <SelectItem key={value} value={value}>{label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>

                      {/* Montants */}
                      <TableCell>
                        <div className="space-y-1 text-xs">
                          <div className="flex justify-between">
                            <span className="text-gray-500">CNAM:</span>
                            <span className="font-semibold text-blue-600">{formatAmount(editData.bonAmount)} DT</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Prix:</span>
                            <span className="font-semibold">{formatAmount(editData.devicePrice)} DT</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Compl:</span>
                            <span className="font-semibold text-amber-600">{formatAmount(editData.complementAmount)} DT</span>
                          </div>
                        </div>
                      </TableCell>

                      {/* Progression */}
                      <TableCell>
                        <div className="space-y-1">
                          <Select
                            value={String(editData.currentStep || 1)}
                            onValueChange={(v) => setEditData({ ...editData, currentStep: parseInt(v) })}
                          >
                            <SelectTrigger className="text-xs h-7">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {[1, 2, 3, 4, 5, 6, 7].map((step) => (
                                <SelectItem key={step} value={String(step)}>
                                  {step}. {STEP_LABELS[step]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Progress value={(editData.currentStep / 7) * 100} className="h-2" />
                          <div className="text-[10px] text-slate-500 truncate">
                            {STEP_LABELS[editData.currentStep || 1]}
                          </div>
                        </div>
                      </TableCell>

                      {/* Statut */}
                      <TableCell>
                        <Select value={editData.status} onValueChange={(v) => setEditData({ ...editData, status: v })}>
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
                  <TableRow key={bond.id} className="hover:bg-gray-50">
                    {/* Numéros */}
                    <TableCell>
                      <div className="space-y-0.5">
                        <Badge variant="outline" className="text-xs font-mono">
                          {bond.bonNumber || bond.dossierNumber || 'N/A'}
                        </Badge>
                        {bond.dossierNumber && bond.bonNumber && (
                          <div className="text-[10px] text-gray-500">{bond.dossierNumber}</div>
                        )}
                      </div>
                    </TableCell>

                    {/* Vente */}
                    <TableCell>
                      <div className="text-xs">
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          {bond.sale?.saleCode}
                        </Badge>
                        <div className="text-[10px] text-gray-500 mt-0.5">
                          {formatCurrency(bond.sale?.totalAmount || 0)}
                        </div>
                      </div>
                    </TableCell>

                    {/* Patient */}
                    <TableCell>
                      <div className="text-xs text-gray-600">
                        {bond.patient?.firstName} {bond.patient?.lastName}
                      </div>
                    </TableCell>

                    {/* Type */}
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {BOND_TYPE_LABELS[bond.bonType] || bond.bonType}
                      </Badge>
                    </TableCell>

                    {/* Montants */}
                    <TableCell>
                      <div className="space-y-0.5 text-xs">
                        <div className="flex justify-between gap-2">
                          <span className="text-gray-500">CNAM:</span>
                          <span className="font-semibold text-blue-600">{formatAmount(bond.bonAmount)} DT</span>
                        </div>
                        <div className="flex justify-between gap-2">
                          <span className="text-gray-500">Prix:</span>
                          <span className="font-semibold">{formatAmount(bond.devicePrice)} DT</span>
                        </div>
                        <div className="flex justify-between gap-2">
                          <span className="text-gray-500">Compl:</span>
                          <span className="font-semibold text-amber-600">{formatAmount(bond.complementAmount)} DT</span>
                        </div>
                      </div>
                    </TableCell>

                    {/* Progression */}
                    <TableCell>
                      {getProgressBar(bond.currentStep || 1, 7)}
                    </TableCell>

                    {/* Statut */}
                    <TableCell>
                      <Badge className={bond.status === 'CREATION' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}>
                        {STATUS_LABELS[bond.status] || bond.status}
                      </Badge>
                    </TableCell>

                    {/* Notes */}
                    <TableCell>
                      <div className="text-xs text-gray-600 max-w-[150px] truncate" title={bond.notes || ''}>
                        {bond.notes || '-'}
                      </div>
                    </TableCell>

                    {/* Actions */}
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(bond)}
                          disabled={isAddingNew || editingId !== null}
                          className="h-7"
                        >
                          <Edit2 className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDelete(bond.id)}
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

              {!isAddingNew && sortedBonds.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                    <AlertCircle className="h-10 w-10 mx-auto mb-2 text-gray-300" />
                    <p>Aucun bon CNAM pour les ventes</p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Summary */}
        {sortedBonds.length > 0 && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
            <div className="text-center">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Total Bons</p>
              <p className="text-2xl font-bold text-gray-900">{sortedBonds.length}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Montant Total CNAM</p>
              <p className="text-2xl font-bold text-blue-600">
                {formatAmount(
                  sortedBonds.reduce((sum, bond) => sum + (Number(bond.bonAmount) || 0), 0)
                )} DT
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Complément Total</p>
              <p className="text-2xl font-bold text-amber-600">
                {formatAmount(
                  sortedBonds.reduce((sum, bond) => sum + (Number(bond.complementAmount) || 0), 0)
                )} DT
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
