import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, AlertCircle, Calendar, Plus, Save, X, Edit2, Trash2, Shield } from 'lucide-react';
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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/components/ui/use-toast';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';

interface CNAMBond {
  id: string;
  bonNumber?: string;
  dossierNumber?: string;
  bonType: string;
  bonAmount: any;
  devicePrice: any;
  complementAmount: any;
  status: string;
  category: string;
  currentStep?: number;
  coveredMonths?: number;
  createdAt: Date | string;
  sourceType?: string;
  sourceCode?: string;
  startDate?: string | null;
  endDate?: string | null;
  cnamMonthlyRate?: number;
  deviceMonthlyRate?: number;
  renewalReminderDays?: number;
  notes?: string;
  rentalId?: string;
  saleId?: string;
}

interface PatientCNAMBondsProps {
  cnamBonds: CNAMBond[];
  isLoading?: boolean;
  patientId?: string;
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
};

const CATEGORY_LABELS: Record<string, string> = {
  LOCATION: 'Location',
  ACHAT: 'Achat',
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

export const PatientCNAMBonds = ({ cnamBonds = [], isLoading = false, patientId }: PatientCNAMBondsProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [editData, setEditData] = useState<Partial<CNAMBond> | null>(null);

  // Fetch CNAM nomenclature for rates
  const { data: nomenclature = [] } = useQuery({
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
    enabled: !!patientId,
  });

  const rentals = patientData?.rentals || [];
  const sales = patientData?.sales || [];

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (bond: Partial<CNAMBond>) => {
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
    mutationFn: async ({ id, ...bond }: Partial<CNAMBond> & { id: string }) => {
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
      const response = await fetch(`/api/cnam-bons/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete CNAM bond');
      return response.json();
    },
    onSuccess: () => {
      toast({ title: 'Succès', description: 'Bon CNAM supprimé avec succès' });
      queryClient.invalidateQueries({ queryKey: ['patient', patientId] });
    },
    onError: (error: Error) => {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    },
  });

  const handleAddNew = () => {
    setEditData({
      bonType: 'CONCENTRATEUR_OXYGENE',
      status: 'CREATION',
      category: 'LOCATION',
      cnamMonthlyRate: 0,
      deviceMonthlyRate: 0,
      coveredMonths: 1,
      bonAmount: 0,
      devicePrice: 0,
      complementAmount: 0,
      currentStep: 1,
      renewalReminderDays: 30,
      patientId: patientId,
    });
    setIsAddingNew(true);
  };

  const handleEdit = (bond: CNAMBond) => {
    setEditingId(bond.id);
    setEditData({
      ...bond,
      startDate: bond.startDate?.split('T')[0] || '',
      endDate: bond.endDate?.split('T')[0] || '',
    });
  };

  const handleSaveNew = () => {
    if (!editData) return;

    // Validation
    if (!editData.bonType || !editData.category) {
      toast({ title: 'Erreur', description: 'Type et catégorie sont requis', variant: 'destructive' });
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

    // Find CNAM rate from nomenclature
    const nomenclatureItem = nomenclature.find((n: any) => n.bonType === selectedBondType);
    const cnamRate = nomenclatureItem?.monthlyRate || 0;

    const coveredMonths = editData.coveredMonths || 1;
    const deviceMonthlyRate = editData.deviceMonthlyRate || 0;

    const bonAmount = cnamRate * coveredMonths;
    const devicePrice = deviceMonthlyRate * coveredMonths;
    const complementAmount = devicePrice - bonAmount;

    setEditData({
      ...editData,
      bonType: selectedBondType,
      cnamMonthlyRate: cnamRate,
      bonAmount,
      devicePrice,
      complementAmount,
    });
  };

  const handleCategoryChange = (category: string) => {
    if (!editData) return;

    // When switching to ACHAT, clear period fields
    if (category === 'ACHAT') {
      setEditData({
        ...editData,
        category,
        startDate: null,
        endDate: null,
        coveredMonths: 1, // Keep at 1 for single purchase
      });
    } else {
      setEditData({
        ...editData,
        category,
      });
    }
  };

  const handleMonthsChange = (months: number) => {
    if (!editData) return;

    const cnamRate = editData.cnamMonthlyRate || 0;
    const deviceMonthlyRate = editData.deviceMonthlyRate || 0;

    const bonAmount = cnamRate * months;
    const devicePrice = deviceMonthlyRate * months;
    const complementAmount = devicePrice - bonAmount;

    setEditData({
      ...editData,
      coveredMonths: months,
      bonAmount,
      devicePrice,
      complementAmount,
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CREATION':
        return 'bg-blue-100 text-blue-800';
      case 'RENOUVELLEMENT':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryColor = (category: string) => {
    return category === 'LOCATION'
      ? 'bg-orange-100 text-orange-700'
      : 'bg-green-100 text-green-700';
  };

  const formatAmount = (amount: any) => {
    if (!amount) return '0.00';
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return num.toFixed(2);
  };

  const getProgressPercentage = (currentStep?: number) => {
    if (!currentStep) return 0;
    return (currentStep / 7) * 100;
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

  const sortedBonds = [...cnamBonds].sort((a, b) => {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-500" />
            Bons CNAM
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
              <FileText className="h-5 w-5 text-blue-500" />
              Bons CNAM
            </CardTitle>
            <CardDescription>
              Tous les bons CNAM associés à ce patient
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
                <TableHead className="min-w-[140px]">Numéros</TableHead>
                <TableHead className="min-w-[120px]">Source</TableHead>
                <TableHead className="min-w-[180px]">Type & Catégorie</TableHead>
                <TableHead className="min-w-[130px]">Période</TableHead>
                <TableHead className="min-w-[100px]">Mois</TableHead>
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
                        placeholder="Dossier"
                        value={editData.dossierNumber || ''}
                        onChange={(e) => setEditData({ ...editData, dossierNumber: e.target.value })}
                        className="text-xs h-7"
                      />
                    </div>
                  </TableCell>

                  {/* Source */}
                  <TableCell>
                    <div className="space-y-1">
                      <Select
                        value={editData.rentalId ? `rental-${editData.rentalId}` : editData.saleId ? `sale-${editData.saleId}` : 'none'}
                        onValueChange={(value) => {
                          if (value === 'none') {
                            setEditData({ ...editData, rentalId: undefined, saleId: undefined, deviceMonthlyRate: 0 });
                          } else if (value.startsWith('rental-')) {
                            const rentalId = value.replace('rental-', '');
                            const selectedRental = rentals.find((r: any) => r.id === rentalId);
                            const deviceRate = selectedRental?.configuration?.rentalRate || 0;

                            const coveredMonths = editData.coveredMonths || 1;
                            const cnamRate = editData.cnamMonthlyRate || 0;
                            const bonAmount = cnamRate * coveredMonths;
                            const devicePrice = deviceRate * coveredMonths;
                            const complementAmount = devicePrice - bonAmount;

                            setEditData({
                              ...editData,
                              rentalId,
                              saleId: undefined,
                              category: 'LOCATION',
                              deviceMonthlyRate: deviceRate,
                              devicePrice,
                              complementAmount
                            });
                          } else if (value.startsWith('sale-')) {
                            const saleId = value.replace('sale-', '');
                            const selectedSale = sales.find((s: any) => s.id === saleId);
                            const devicePrice = selectedSale?.totalAmount || selectedSale?.devicePrice || 0;

                            const cnamRate = editData.cnamMonthlyRate || 0;
                            const bonAmount = cnamRate * 1; // Sales are typically 1 month
                            const complementAmount = devicePrice - bonAmount;

                            setEditData({
                              ...editData,
                              saleId,
                              rentalId: undefined,
                              category: 'ACHAT',
                              deviceMonthlyRate: devicePrice, // For sales, use total price
                              devicePrice,
                              complementAmount,
                              coveredMonths: 1
                            });
                          }
                        }}
                      >
                        <SelectTrigger className="text-xs h-7">
                          <SelectValue placeholder="Lier à..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Aucune source</SelectItem>
                          {rentals.map((rental: any) => (
                            <SelectItem key={rental.id} value={`rental-${rental.id}`}>
                              {rental.rentalCode}
                            </SelectItem>
                          ))}
                          {sales.map((sale: any) => (
                            <SelectItem key={sale.id} value={`sale-${sale.id}`}>
                              {sale.saleCode}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </TableCell>

                  {/* Type & Catégorie */}
                  <TableCell>
                    <div className="space-y-1">
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
                      <Select value={editData.category || 'LOCATION'} onValueChange={handleCategoryChange}>
                        <SelectTrigger className="text-xs h-7">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                            <SelectItem key={value} value={value}>{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </TableCell>

                  {/* Période - Only show for LOCATION */}
                  <TableCell>
                    {editData.category === 'LOCATION' ? (
                      <div className="space-y-1">
                        <Input
                          type="date"
                          value={editData.startDate || ''}
                          onChange={(e) => setEditData({ ...editData, startDate: e.target.value })}
                          className="text-xs h-7"
                        />
                        <Input
                          type="date"
                          value={editData.endDate || ''}
                          onChange={(e) => setEditData({ ...editData, endDate: e.target.value })}
                          className="text-xs h-7"
                        />
                      </div>
                    ) : (
                      <div className="text-xs text-gray-400 text-center">-</div>
                    )}
                  </TableCell>

                  {/* Mois */}
                  <TableCell>
                    <Input
                      type="number"
                      min="1"
                      value={editData.coveredMonths || 1}
                      onChange={(e) => handleMonthsChange(parseInt(e.target.value) || 1)}
                      className="text-xs h-7 w-16"
                    />
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
                      <Progress value={getProgressPercentage(editData.currentStep)} className="h-2" />
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
                const createdDate = new Date(bond.createdAt);

                if (isEditing && editData) {
                  return (
                    <TableRow key={bond.id} className="bg-blue-50">
                      {/* Numéros */}
                      <TableCell>
                        <div className="space-y-1">
                          <div className="text-[10px] text-gray-500">BL: {bond.bonNumber || 'Auto'}</div>
                          <Input
                            type="text"
                            placeholder="Dossier"
                            value={editData.dossierNumber || ''}
                            onChange={(e) => setEditData({ ...editData, dossierNumber: e.target.value })}
                            className="text-xs h-7"
                          />
                        </div>
                      </TableCell>

                      {/* Source */}
                      <TableCell>
                        <div className="space-y-1">
                          <Select
                            value={editData.rentalId ? `rental-${editData.rentalId}` : editData.saleId ? `sale-${editData.saleId}` : 'none'}
                            onValueChange={(value) => {
                              if (value === 'none') {
                                setEditData({ ...editData, rentalId: undefined, saleId: undefined, deviceMonthlyRate: 0 });
                              } else if (value.startsWith('rental-')) {
                                const rentalId = value.replace('rental-', '');
                                const selectedRental = rentals.find((r: any) => r.id === rentalId);
                                const deviceRate = selectedRental?.configuration?.rentalRate || 0;

                                const coveredMonths = editData.coveredMonths || 1;
                                const cnamRate = editData.cnamMonthlyRate || 0;
                                const bonAmount = cnamRate * coveredMonths;
                                const devicePrice = deviceRate * coveredMonths;
                                const complementAmount = devicePrice - bonAmount;

                                setEditData({
                                  ...editData,
                                  rentalId,
                                  saleId: undefined,
                                  category: 'LOCATION',
                                  deviceMonthlyRate: deviceRate,
                                  devicePrice,
                                  complementAmount
                                });
                              } else if (value.startsWith('sale-')) {
                                const saleId = value.replace('sale-', '');
                                const selectedSale = sales.find((s: any) => s.id === saleId);
                                const devicePrice = selectedSale?.totalAmount || selectedSale?.devicePrice || 0;

                                const cnamRate = editData.cnamMonthlyRate || 0;
                                const bonAmount = cnamRate * 1; // Sales are typically 1 month
                                const complementAmount = devicePrice - bonAmount;

                                setEditData({
                                  ...editData,
                                  saleId,
                                  rentalId: undefined,
                                  category: 'ACHAT',
                                  deviceMonthlyRate: devicePrice, // For sales, use total price
                                  devicePrice,
                                  complementAmount,
                                  coveredMonths: 1
                                });
                              }
                            }}
                          >
                            <SelectTrigger className="text-xs h-7">
                              <SelectValue placeholder="Lier à..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Aucune source</SelectItem>
                              {rentals.map((rental: any) => (
                                <SelectItem key={rental.id} value={`rental-${rental.id}`}>
                                  {rental.rentalCode}
                                </SelectItem>
                              ))}
                              {sales.map((sale: any) => (
                                <SelectItem key={sale.id} value={`sale-${sale.id}`}>
                                  {sale.saleCode}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </TableCell>

                      {/* Type & Catégorie */}
                      <TableCell>
                        <div className="space-y-1">
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
                          <Select value={editData.category || 'LOCATION'} onValueChange={handleCategoryChange}>
                            <SelectTrigger className="text-xs h-7">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                                <SelectItem key={value} value={value}>{label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </TableCell>

                      {/* Période - Only show for LOCATION */}
                      <TableCell>
                        {editData.category === 'LOCATION' ? (
                          <div className="space-y-1">
                            <Input
                              type="date"
                              value={editData.startDate || ''}
                              onChange={(e) => setEditData({ ...editData, startDate: e.target.value })}
                              className="text-xs h-7"
                            />
                            <Input
                              type="date"
                              value={editData.endDate || ''}
                              onChange={(e) => setEditData({ ...editData, endDate: e.target.value })}
                              className="text-xs h-7"
                            />
                          </div>
                        ) : (
                          <div className="text-xs text-gray-400 text-center">-</div>
                        )}
                      </TableCell>

                      {/* Mois */}
                      <TableCell>
                        <Input
                          type="number"
                          min="1"
                          value={editData.coveredMonths || 1}
                          onChange={(e) => handleMonthsChange(parseInt(e.target.value) || 1)}
                          className="text-xs h-7 w-16"
                        />
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
                          <Progress value={getProgressPercentage(editData.currentStep)} className="h-2" />
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

                    {/* Source */}
                    <TableCell>
                      {bond.sourceType && bond.sourceCode ? (
                        <div className="flex flex-col gap-0.5">
                          <Badge
                            variant="outline"
                            className={bond.sourceType === 'Location' ? 'bg-orange-50 text-orange-700 border-orange-200' : 'bg-green-50 text-green-700 border-green-200'}
                          >
                            {bond.sourceType}
                          </Badge>
                          <span className="text-xs text-gray-500 font-mono">{bond.sourceCode}</span>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-xs">-</span>
                      )}
                    </TableCell>

                    {/* Type & Catégorie */}
                    <TableCell>
                      <div className="space-y-1">
                        <Badge variant="outline" className="text-xs">
                          {BOND_TYPE_LABELS[bond.bonType] || bond.bonType}
                        </Badge>
                        <Badge variant="secondary" className={getCategoryColor(bond.category)}>
                          {CATEGORY_LABELS[bond.category] || bond.category}
                        </Badge>
                      </div>
                    </TableCell>

                    {/* Période */}
                    <TableCell>
                      {bond.category === 'LOCATION' && (bond.startDate || bond.endDate) ? (
                        <div className="text-xs space-y-0.5">
                          <div>{bond.startDate ? new Date(bond.startDate).toLocaleDateString('fr-FR') : '-'}</div>
                          <div className="text-gray-500">{bond.endDate ? new Date(bond.endDate).toLocaleDateString('fr-FR') : '-'}</div>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">-</span>
                      )}
                    </TableCell>

                    {/* Mois */}
                    <TableCell className="text-center">
                      <Badge variant="outline" className="text-xs">{bond.coveredMonths || 1}</Badge>
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
                      <Badge className={getStatusColor(bond.status)}>
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
                  <TableCell colSpan={10} className="text-center py-8 text-gray-500">
                    <AlertCircle className="h-10 w-10 mx-auto mb-2 text-gray-300" />
                    <p>Aucun bon CNAM pour ce patient</p>
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
                  sortedBonds.reduce((sum, bond) => {
                    const amount = typeof bond.bonAmount === 'string' ? parseFloat(bond.bonAmount) : bond.bonAmount;
                    return sum + (amount || 0);
                  }, 0)
                )} DT
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Complément Total</p>
              <p className="text-2xl font-bold text-amber-600">
                {formatAmount(
                  sortedBonds.reduce((sum, bond) => {
                    const amount = typeof bond.complementAmount === 'string' ? parseFloat(bond.complementAmount) : bond.complementAmount;
                    return sum + (amount || 0);
                  }, 0)
                )} DT
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PatientCNAMBonds;
