import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Shield,
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  AlertTriangle,
  CheckCircle,
  Clock,
  FileText,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface CNAMBond {
  id: string;
  bondNumber: string;
  bondType: string;
  status: string;
  dossierNumber?: string;
  submissionDate?: Date;
  approvalDate?: Date;
  startDate?: Date;
  endDate?: Date;
  monthlyAmount: number;
  coveredMonths: number;
  totalAmount: number;
  renewalReminderDays?: number;
  notes?: string;
}

interface CNAMBondsManagementProps {
  rental: any;
  cnamBonds: CNAMBond[];
  onUpdate?: (bonds: CNAMBond[]) => void;
}

const predefinedBonds = [
  { id: 'concentrateur-1m', bondType: 'CONCENTRATEUR_OXYGENE', label: 'Concentrateur Oxygène - 1 mois', coveredMonths: 1, totalAmount: 190 },
  { id: 'concentrateur-2m', bondType: 'CONCENTRATEUR_OXYGENE', label: 'Concentrateur Oxygène - 2 mois', coveredMonths: 2, totalAmount: 380 },
  { id: 'concentrateur-3m', bondType: 'CONCENTRATEUR_OXYGENE', label: 'Concentrateur Oxygène - 3 mois', coveredMonths: 3, totalAmount: 570 },
  { id: 'vni-3m', bondType: 'VNI', label: 'VNI - 3 mois', coveredMonths: 3, totalAmount: 1290 },
  { id: 'vni-6m', bondType: 'VNI', label: 'VNI - 6 mois', coveredMonths: 6, totalAmount: 2580 },
];

export default function CNAMBondsManagement({ rental, cnamBonds, onUpdate }: CNAMBondsManagementProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [bonds, setBonds] = useState<CNAMBond[]>(cnamBonds || []);
  const [editingBond, setEditingBond] = useState<CNAMBond | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newBond, setNewBond] = useState<Partial<CNAMBond>>({
    bondType: 'CONCENTRATEUR_OXYGENE',
    status: 'EN_ATTENTE_APPROBATION',
    monthlyAmount: 0,
    coveredMonths: 1,
    totalAmount: 0,
    renewalReminderDays: 30,
  });

  // Mutation for saving bonds to the database
  const saveBondsMutation = useMutation({
    mutationFn: async (bondsData: CNAMBond[]) => {
      const response = await fetch('/api/cnam-bonds', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rentalId: rental.id,
          bonds: bondsData,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save CNAM bonds');
      }

      return response.json();
    },
    onSuccess: (data) => {
      setBonds(data.bonds);
      onUpdate?.(data.bonds);
      queryClient.invalidateQueries({ queryKey: ['rental', rental.id] });
      toast({
        title: "Bons CNAM sauvegardés",
        description: "Les modifications ont été sauvegardées avec succès.",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de sauvegarder les bons CNAM.",
      });
      console.error('Error saving CNAM bonds:', error);
    },
  });

  const formatDate = (date: Date | string | null | undefined) => {
    if (!date) return '-';
    return format(new Date(date), 'PPP', { locale: fr });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROUVE':
        return (
          <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
            <CheckCircle className="h-3 w-3 mr-1" />
            Approuvé
          </Badge>
        );
      case 'EN_ATTENTE_APPROBATION':
        return (
          <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200">
            <Clock className="h-3 w-3 mr-1" />
            En attente
          </Badge>
        );
      case 'REJETE':
        return (
          <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Rejeté
          </Badge>
        );
      case 'EXPIRE':
        return (
          <Badge variant="outline" className="bg-gray-100 text-gray-800 border-gray-200">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Expiré
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            {status}
          </Badge>
        );
    }
  };

  const getBondTypeLabel = (type: string) => {
    switch (type) {
      case 'CONCENTRATEUR_OXYGENE':
        return 'Concentrateur Oxygène';
      case 'VNI':
        return 'Ventilation Non Invasive';
      case 'CPAP':
        return 'CPAP';
      case 'MASQUE':
        return 'Masque';
      default:
        return type;
    }
  };

  const handleAddPredefinedBond = (predefined: any) => {
    const bond: Partial<CNAMBond> = {
      id: `new-${Date.now()}`,
      bondNumber: '',
      bondType: predefined.bondType,
      status: 'EN_ATTENTE_APPROBATION',
      monthlyAmount: predefined.totalAmount / predefined.coveredMonths,
      coveredMonths: predefined.coveredMonths,
      totalAmount: predefined.totalAmount,
      renewalReminderDays: 30,
    };
    setNewBond(bond);
    setShowAddDialog(true);
  };

  const handleSaveNewBond = () => {
    if (!newBond.bondType || !newBond.totalAmount) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Le type de bon et le montant total sont requis.",
      });
      return;
    }

    const bond: CNAMBond = {
      id: newBond.id || `new-${Date.now()}`,
      bondNumber: newBond.bondNumber || '',
      bondType: newBond.bondType,
      status: newBond.status || 'EN_ATTENTE_APPROBATION',
      dossierNumber: newBond.dossierNumber,
      submissionDate: newBond.submissionDate,
      approvalDate: newBond.approvalDate,
      startDate: newBond.startDate,
      endDate: newBond.endDate,
      monthlyAmount: newBond.monthlyAmount || 0,
      coveredMonths: newBond.coveredMonths || 1,
      totalAmount: newBond.totalAmount || 0,
      renewalReminderDays: newBond.renewalReminderDays || 30,
      notes: newBond.notes,
    };

    const updatedBonds = [...bonds, bond];
    saveBondsMutation.mutate(updatedBonds);
    setShowAddDialog(false);
    setNewBond({
      bondType: 'CONCENTRATEUR_OXYGENE',
      status: 'EN_ATTENTE_APPROBATION',
      monthlyAmount: 0,
      coveredMonths: 1,
      totalAmount: 0,
      renewalReminderDays: 30,
    });
  };

  const handleEditBond = (bond: CNAMBond) => {
    setEditingBond({ ...bond });
  };

  const handleSaveEdit = () => {
    if (!editingBond) return;

    const updatedBonds = bonds.map(bond => 
      bond.id === editingBond.id ? editingBond : bond
    );
    saveBondsMutation.mutate(updatedBonds);
    setEditingBond(null);
  };

  const handleDeleteBond = (bondId: string) => {
    const updatedBonds = bonds.filter(bond => bond.id !== bondId);
    saveBondsMutation.mutate(updatedBonds);
  };

  const calculateMonthlyAmount = (total: number, months: number) => {
    return months > 0 ? (total / months).toFixed(2) : '0';
  };

  return (
    <div className="space-y-6">
      {/* Header with Add Button */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
          <Shield className="h-5 w-5 text-blue-600" />
          Gestion des Bons CNAM
        </h2>
        
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Nouveau Bon
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Ajouter un nouveau Bon CNAM</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-6">
              {/* Predefined Templates */}
              <div>
                <Label className="text-base font-medium">Templates Prédéfinis</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                  {predefinedBonds.map((template) => (
                    <Button
                      key={template.id}
                      variant="outline"
                      onClick={() => handleAddPredefinedBond(template)}
                      className="justify-start text-left h-auto p-3"
                    >
                      <div>
                        <div className="font-medium">{template.label}</div>
                        <div className="text-sm text-gray-600">{template.totalAmount} TND</div>
                      </div>
                    </Button>
                  ))}
                </div>
              </div>

              {/* Manual Form */}
              <div className="border-t pt-4">
                <Label className="text-base font-medium">Ou créer manuellement</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div>
                    <Label htmlFor="bondNumber">Numéro de Bon</Label>
                    <Input
                      id="bondNumber"
                      value={newBond.bondNumber || ''}
                      onChange={(e) => setNewBond({ ...newBond, bondNumber: e.target.value })}
                      placeholder="Numéro du bond..."
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="bondType">Type de Bon</Label>
                    <Select value={newBond.bondType} onValueChange={(value) => setNewBond({ ...newBond, bondType: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CONCENTRATEUR_OXYGENE">Concentrateur Oxygène</SelectItem>
                        <SelectItem value="VNI">VNI</SelectItem>
                        <SelectItem value="CPAP">CPAP</SelectItem>
                        <SelectItem value="MASQUE">Masque</SelectItem>
                        <SelectItem value="AUTRE">Autre</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="coveredMonths">Mois Couverts</Label>
                    <Input
                      id="coveredMonths"
                      type="number"
                      value={newBond.coveredMonths || 1}
                      onChange={(e) => {
                        const months = parseInt(e.target.value) || 1;
                        setNewBond({ 
                          ...newBond, 
                          coveredMonths: months,
                          monthlyAmount: newBond.totalAmount ? newBond.totalAmount / months : 0
                        });
                      }}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="totalAmount">Montant Total (TND)</Label>
                    <Input
                      id="totalAmount"
                      type="number"
                      step="0.01"
                      value={newBond.totalAmount || 0}
                      onChange={(e) => {
                        const total = parseFloat(e.target.value) || 0;
                        setNewBond({ 
                          ...newBond, 
                          totalAmount: total,
                          monthlyAmount: newBond.coveredMonths ? total / newBond.coveredMonths : 0
                        });
                      }}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="startDate">Date de Début</Label>
                    <DatePicker
                      value={newBond.startDate}
                      onChange={(date) => setNewBond({ ...newBond, startDate: date })}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="endDate">Date de Fin</Label>
                    <DatePicker
                      value={newBond.endDate}
                      onChange={(date) => setNewBond({ ...newBond, endDate: date })}
                    />
                  </div>
                </div>
                
                <div className="mt-4">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={newBond.notes || ''}
                    onChange={(e) => setNewBond({ ...newBond, notes: e.target.value })}
                    placeholder="Notes additionnelles..."
                    rows={3}
                  />
                </div>
                
                <div className="flex gap-2 mt-6">
                  <Button 
                    onClick={handleSaveNewBond} 
                    disabled={saveBondsMutation.isPending}
                    className="flex items-center gap-1"
                  >
                    {saveBondsMutation.isPending ? (
                      <>
                        <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        Sauvegarde...
                      </>
                    ) : (
                      <>
                        <Save className="h-3.5 w-3.5" />
                        Ajouter le Bon
                      </>
                    )}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setShowAddDialog(false)}
                    disabled={saveBondsMutation.isPending}
                  >
                    Annuler
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* CNAM Bonds Table */}
      {bonds.length > 0 ? (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bon & Type</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Période</TableHead>
                  <TableHead>Montants</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bonds.map((bond) => (
                  <TableRow key={bond.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{bond.bondNumber || 'Non défini'}</div>
                        <div className="text-sm text-gray-600">{getBondTypeLabel(bond.bondType)}</div>
                        {bond.dossierNumber && (
                          <div className="text-xs text-blue-600">Dossier: {bond.dossierNumber}</div>
                        )}
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      {getStatusBadge(bond.status)}
                    </TableCell>
                    
                    <TableCell>
                      <div className="text-sm">
                        <div>Début: {formatDate(bond.startDate)}</div>
                        <div>Fin: {formatDate(bond.endDate)}</div>
                        <div className="text-blue-600">{bond.coveredMonths} mois</div>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="text-sm">
                        <div className="font-medium">{bond.totalAmount} TND</div>
                        <div className="text-gray-600">{calculateMonthlyAmount(bond.totalAmount, bond.coveredMonths)} TND/mois</div>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditBond(bond)}
                          disabled={saveBondsMutation.isPending}
                          className="h-8 w-8 p-0 disabled:opacity-50"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteBond(bond.id)}
                          disabled={saveBondsMutation.isPending}
                          className="h-8 w-8 p-0 border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="text-center py-8">
            <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun Bon CNAM</h3>
            <p className="text-gray-600 mb-4">
              Aucun bon CNAM n'a été ajouté pour cette location.
            </p>
            <Button onClick={() => setShowAddDialog(true)} className="flex items-center gap-2 mx-auto">
              <Plus className="h-4 w-4" />
              Ajouter un Bon
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Edit Bond Dialog */}
      {editingBond && (
        <Dialog open={!!editingBond} onOpenChange={() => setEditingBond(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Modifier le Bon CNAM</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="editBondNumber">Numéro de Bon</Label>
                  <Input
                    id="editBondNumber"
                    value={editingBond.bondNumber}
                    onChange={(e) => setEditingBond({ ...editingBond, bondNumber: e.target.value })}
                  />
                </div>
                
                <div>
                  <Label htmlFor="editStatus">Statut</Label>
                  <Select value={editingBond.status} onValueChange={(value) => setEditingBond({ ...editingBond, status: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EN_ATTENTE_APPROBATION">En attente d'approbation</SelectItem>
                      <SelectItem value="APPROUVE">Approuvé</SelectItem>
                      <SelectItem value="REJETE">Rejeté</SelectItem>
                      <SelectItem value="EXPIRE">Expiré</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="editTotalAmount">Montant Total (TND)</Label>
                  <Input
                    id="editTotalAmount"
                    type="number"
                    step="0.01"
                    value={editingBond.totalAmount}
                    onChange={(e) => {
                      const total = parseFloat(e.target.value) || 0;
                      setEditingBond({ 
                        ...editingBond, 
                        totalAmount: total,
                        monthlyAmount: editingBond.coveredMonths ? total / editingBond.coveredMonths : 0
                      });
                    }}
                  />
                </div>
                
                <div>
                  <Label htmlFor="editCoveredMonths">Mois Couverts</Label>
                  <Input
                    id="editCoveredMonths"
                    type="number"
                    value={editingBond.coveredMonths}
                    onChange={(e) => {
                      const months = parseInt(e.target.value) || 1;
                      setEditingBond({ 
                        ...editingBond, 
                        coveredMonths: months,
                        monthlyAmount: editingBond.totalAmount / months
                      });
                    }}
                  />
                </div>
                
                <div>
                  <Label htmlFor="editStartDate">Date de Début</Label>
                  <DatePicker
                    value={editingBond.startDate}
                    onChange={(date) => setEditingBond({ ...editingBond, startDate: date })}
                  />
                </div>
                
                <div>
                  <Label htmlFor="editEndDate">Date de Fin</Label>
                  <DatePicker
                    value={editingBond.endDate}
                    onChange={(date) => setEditingBond({ ...editingBond, endDate: date })}
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="editNotes">Notes</Label>
                <Textarea
                  id="editNotes"
                  value={editingBond.notes || ''}
                  onChange={(e) => setEditingBond({ ...editingBond, notes: e.target.value })}
                  rows={3}
                />
              </div>
              
              <div className="flex gap-2">
                <Button 
                  onClick={handleSaveEdit} 
                  disabled={saveBondsMutation.isPending}
                  className="flex items-center gap-1"
                >
                  {saveBondsMutation.isPending ? (
                    <>
                      <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Sauvegarde...
                    </>
                  ) : (
                    <>
                      <Save className="h-3.5 w-3.5" />
                      Sauvegarder
                    </>
                  )}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setEditingBond(null)}
                  disabled={saveBondsMutation.isPending}
                >
                  Annuler
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Patient CNAM Info */}
      {rental.patient?.cnamId && (
        <Alert>
          <Shield className="h-4 w-4" />
          <AlertDescription>
            Ce patient est éligible CNAM avec le numéro: <strong>{rental.patient.cnamId}</strong>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}