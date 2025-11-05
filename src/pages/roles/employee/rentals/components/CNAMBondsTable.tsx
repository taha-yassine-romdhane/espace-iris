import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Shield, Plus, Save, X, Edit2, Trash2, CheckCircle, Clock, FileX, Info } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface CNAMBond {
  id?: string;
  bonNumber?: string;
  bonType: string;
  status: string;
  dossierNumber?: string;
  submissionDate?: string | null;
  approvalDate?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  cnamMonthlyRate: number;
  deviceMonthlyRate: number;
  coveredMonths: number;
  bonAmount: number;
  devicePrice: number;
  complementAmount: number;
  renewalReminderDays?: number;
  notes?: string;
  rentalId?: string;
  patientId: string;
  patient?: {
    id: string;
    firstName: string;
    lastName: string;
    cnamId?: string;
  };
  rental?: {
    id: string;
    rentalCode?: string;
    medicalDevice?: {
      id: string;
      name: string;
      deviceCode?: string;
    };
  };
}

interface CNAMNomenclature {
  bonType: string;
  monthlyRate: number;
  description?: string;
}

interface Props {
  rentalId?: string;
  patientId?: string;
  patientCnamId?: string;
  deviceMonthlyRate?: number;
  showGlobalView?: boolean; // When true, shows all bonds from all rentals
}

const BOND_TYPE_LABELS: Record<string, string> = {
  CONCENTRATEUR_OXYGENE: 'Concentrateur Oxygène',
  VNI: 'VNI',
  CPAP: 'CPAP',
  MASQUE: 'Masque',
  AUTRE: 'Autre',
};

const STATUS_LABELS: Record<string, { label: string; color: string; icon: any }> = {
  EN_ATTENTE_APPROBATION: { label: 'En attente', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  APPROUVE: { label: 'Approuvé', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  EN_COURS: { label: 'En cours', color: 'bg-blue-100 text-blue-800', icon: Info },
  TERMINE: { label: 'Terminé', color: 'bg-gray-100 text-gray-800', icon: CheckCircle },
  REFUSE: { label: 'Refusé', color: 'bg-red-100 text-red-800', icon: FileX },
};

export default function CNAMBondsTable({ rentalId, patientId, patientCnamId, deviceMonthlyRate, showGlobalView = false }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [editData, setEditData] = useState<CNAMBond | null>(null);

  // Fetch CNAM nomenclature
  const { data: nomenclature = [] } = useQuery<CNAMNomenclature[]>({
    queryKey: ['cnam-nomenclature'],
    queryFn: async () => {
      const response = await fetch('/api/cnam-nomenclature?isActive=true');
      if (!response.ok) throw new Error('Failed to fetch nomenclature');
      return response.json();
    },
  });

  // Fetch patients for dropdown (only in global view)
  const { data: patients = [] } = useQuery<any[]>({
    queryKey: ['patients-for-bonds'],
    queryFn: async () => {
      const response = await fetch('/api/renseignements/patients');
      if (!response.ok) return [];
      const data = await response.json();
      return data.patients || [];
    },
    enabled: showGlobalView,
  });

  // Fetch rentals for dropdown (only in global view)
  const { data: rentals = [] } = useQuery<any[]>({
    queryKey: ['rentals-for-bonds'],
    queryFn: async () => {
      const response = await fetch('/api/rentals/comprehensive');
      if (!response.ok) return [];
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    },
    enabled: showGlobalView,
  });

  // Fetch CNAM bons
  const { data: bonds = [] } = useQuery<CNAMBond[]>({
    queryKey: ['cnam-bonds', rentalId, patientId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (rentalId) params.append('rentalId', rentalId);
      if (patientId) params.append('patientId', patientId);

      const response = await fetch(`/api/cnam-bons?${params}`);
      if (!response.ok) throw new Error('Failed to fetch bonds');
      return response.json();
    },
  });

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: async (bond: CNAMBond) => {
      const url = bond.id ? `/api/cnam-bons/${bond.id}` : '/api/cnam-bons';
      const method = bond.id ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bond),
      });

      if (!response.ok) throw new Error('Failed to save bond');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cnam-bonds'] });
      queryClient.invalidateQueries({ queryKey: ['rentals'] });
      setEditingId(null);
      setIsAddingNew(false);
      setEditData(null);
      toast({ title: 'Succès', description: 'Bond CNAM enregistré avec succès' });
    },
    onError: () => {
      toast({ variant: 'destructive', title: 'Erreur', description: 'Échec de l\'enregistrement' });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (bondId: string) => {
      const response = await fetch(`/api/cnam-bons/${bondId}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete bond');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cnam-bonds'] });
      toast({ title: 'Succès', description: 'Bond CNAM supprimé' });
    },
    onError: (error: any) => {
      toast({ variant: 'destructive', title: 'Erreur', description: error.message });
    },
  });

  const handleAddNew = async () => {
    // Fetch next bond number
    let nextBondNumber = '';
    try {
      const response = await fetch('/api/cnam-bons/next-number');
      if (response.ok) {
        const data = await response.json();
        nextBondNumber = data.bonNumber;
      } else {
        // Fallback: generate a temporary number
        const year = new Date().getFullYear();
        const timestamp = Date.now().toString().slice(-4);
        nextBondNumber = `BL-${year}-TMP${timestamp}`;
        toast({
          title: 'Avertissement',
          description: 'Numéro de bond temporaire généré. Veuillez vérifier.',
          variant: 'default',
        });
      }
    } catch (error) {
      console.error('Failed to fetch next bond number:', error);
      // Fallback: generate a temporary number
      const year = new Date().getFullYear();
      const timestamp = Date.now().toString().slice(-4);
      nextBondNumber = `BL-${year}-TMP${timestamp}`;
      toast({
        title: 'Avertissement',
        description: 'Numéro de bond temporaire généré. Veuillez vérifier.',
        variant: 'default',
      });
    }

    const defaultBondType = 'CONCENTRATEUR_OXYGENE';
    const cnamRate = nomenclature.find(n => n.bonType === defaultBondType)?.monthlyRate || 190;
    const deviceRate = deviceMonthlyRate || 0;

    setEditData({
      bonNumber: nextBondNumber,
      bonType: defaultBondType,
      status: 'EN_ATTENTE_APPROBATION',
      cnamMonthlyRate: Number(cnamRate),
      deviceMonthlyRate: Number(deviceRate),
      coveredMonths: 1,
      bonAmount: Number(cnamRate) * 1,
      devicePrice: Number(deviceRate) * 1,
      complementAmount: (Number(deviceRate) - Number(cnamRate)) * 1,
      renewalReminderDays: 30,
      patientId: patientId || '', // Will be selected in the form if in global view
      rentalId,
    });
    setIsAddingNew(true);
  };

  const handleEdit = (bond: CNAMBond) => {
    setEditData({ ...bond });
    setEditingId(bond.id!);
  };

  const handleCancel = () => {
    setEditingId(null);
    setIsAddingNew(false);
    setEditData(null);
  };

  const handleSave = () => {
    if (!editData) return;

    // Validate required fields
    if (!editData.patientId || editData.patientId === '') {
      toast({ variant: 'destructive', title: 'Erreur', description: 'Veuillez sélectionner un patient' });
      return;
    }

    if (!editData.bonType) {
      toast({ variant: 'destructive', title: 'Erreur', description: 'Veuillez sélectionner un type de bond' });
      return;
    }

    if (!editData.deviceMonthlyRate || editData.deviceMonthlyRate === 0) {
      toast({ variant: 'destructive', title: 'Erreur', description: 'Veuillez entrer le prix mensuel de l\'appareil' });
      return;
    }

    const bonAmount = editData.cnamMonthlyRate * editData.coveredMonths;
    const devicePrice = editData.deviceMonthlyRate * editData.coveredMonths;
    const complementAmount = devicePrice - bonAmount;

    saveMutation.mutate({
      ...editData,
      bonAmount,
      devicePrice,
      complementAmount,
    });
  };

  const handleDelete = (bondId: string) => {
    if (confirm('Supprimer ce bond CNAM ?')) {
      deleteMutation.mutate(bondId);
    }
  };

  const handleBondTypeChange = (bonType: string) => {
    if (!editData) return;

    const cnamRate = nomenclature.find(n => n.bonType === bonType)?.monthlyRate || 0;
    const bonAmount = cnamRate * editData.coveredMonths;
    const devicePrice = editData.deviceMonthlyRate * editData.coveredMonths;

    setEditData({
      ...editData,
      bonType,
      cnamMonthlyRate: cnamRate,
      bonAmount,
      complementAmount: devicePrice - bonAmount,
    });
  };

  const handleMonthsChange = (months: number) => {
    if (!editData) return;

    const bonAmount = editData.cnamMonthlyRate * months;
    const devicePrice = editData.deviceMonthlyRate * months;

    setEditData({
      ...editData,
      coveredMonths: months,
      bonAmount,
      devicePrice,
      complementAmount: devicePrice - bonAmount,
    });
  };

  // Handler for patient selection - filters rentals
  const handlePatientChange = (selectedPatientId: string) => {
    if (!editData) return;

    setEditData({
      ...editData,
      patientId: selectedPatientId,
      rentalId: undefined, // Reset rental when patient changes
    });
  };

  // Handler for rental selection - auto-populates bond type based on device
  const handleRentalChange = (selectedRentalId: string) => {
    if (!editData) return;

    if (selectedRentalId === 'none') {
      setEditData({ ...editData, rentalId: undefined });
      return;
    }

    // Find the selected rental
    const selectedRental = rentals.find((r: any) => r.id === selectedRentalId);

    if (selectedRental?.medicalDevice) {
      const deviceName = selectedRental.medicalDevice.name?.toUpperCase() || '';
      const deviceRate = selectedRental.monthlyRate || selectedRental.deviceMonthlyRate || 0;

      // Auto-detect bond type based on device name
      let detectedBondType = 'AUTRE';
      if (deviceName.includes('CONCENTRATEUR') || deviceName.includes('OXYGENE') || deviceName.includes('O2')) {
        detectedBondType = 'CONCENTRATEUR_OXYGENE';
      } else if (deviceName.includes('VNI')) {
        detectedBondType = 'VNI';
      } else if (deviceName.includes('CPAP')) {
        detectedBondType = 'CPAP';
      } else if (deviceName.includes('MASQUE')) {
        detectedBondType = 'MASQUE';
      }

      // Get CNAM rate for the detected type
      const cnamRate = nomenclature.find(n => n.bonType === detectedBondType)?.monthlyRate || 0;
      const bonAmount = cnamRate * editData.coveredMonths;
      const devicePrice = deviceRate * editData.coveredMonths;

      setEditData({
        ...editData,
        rentalId: selectedRentalId,
        bonType: detectedBondType,
        cnamMonthlyRate: cnamRate,
        deviceMonthlyRate: deviceRate,
        bonAmount,
        devicePrice,
        complementAmount: devicePrice - bonAmount,
      });
    } else {
      setEditData({ ...editData, rentalId: selectedRentalId });
    }
  };

  // Filter rentals to show only selected patient's rentals
  const filteredRentals = editData?.patientId
    ? rentals.filter((rental: any) => rental.patientId === editData.patientId)
    : rentals;

  const getStatusBadge = (status: string) => {
    const info = STATUS_LABELS[status] || STATUS_LABELS.EN_ATTENTE_APPROBATION;
    const Icon = info.icon;

    return (
      <Badge variant="outline" className={info.color}>
        <Icon className="h-3 w-3 mr-1" />
        {info.label}
      </Badge>
    );
  };

  // In global view or when patient is not CNAM eligible, show alert but still allow viewing
  const showCnamWarning = !showGlobalView && !patientCnamId;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-600" />
            Bons CNAM
          </CardTitle>
          <Button onClick={handleAddNew} size="sm" disabled={isAddingNew || (!showGlobalView && showCnamWarning)}>
            <Plus className="h-4 w-4 mr-1" />
            Nouveau Bond
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {showCnamWarning && (
          <Alert className="mb-4 border-yellow-200 bg-yellow-50">
            <Info className="h-4 w-4 text-yellow-600" />
            <AlertDescription>
              Patient non éligible CNAM - Impossible d'ajouter des bonds
            </AlertDescription>
          </Alert>
        )}

        {!showCnamWarning && (
          <Alert className="mb-4 border-blue-200 bg-blue-50">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-sm">
              Tarifs CNAM fixes. Complément = Prix appareil - Montant CNAM
            </AlertDescription>
          </Alert>
        )}

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                {showGlobalView && <TableHead>Patient</TableHead>}
                {showGlobalView && <TableHead>Location</TableHead>}
                <TableHead>Type</TableHead>
                <TableHead>Numéro</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Mois</TableHead>
                <TableHead>CNAM</TableHead>
                <TableHead>Appareil</TableHead>
                <TableHead>Complément</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isAddingNew && editData && (
                <TableRow className="bg-green-50">
                  {showGlobalView && (
                    <TableCell>
                      <Select
                        value={editData.patientId}
                        onValueChange={handlePatientChange}
                      >
                        <SelectTrigger className="text-xs">
                          <SelectValue placeholder="Sélectionner patient" />
                        </SelectTrigger>
                        <SelectContent>
                          {patients.map((patient: any) => (
                            <SelectItem key={patient.id} value={patient.id}>
                              <div className="text-xs">
                                <div>{patient.firstName} {patient.lastName}</div>
                                {patient.cnamId && <div className="text-gray-500">CNAM: {patient.cnamId}</div>}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                  )}
                  {showGlobalView && (
                    <TableCell>
                      <Select
                        value={editData.rentalId || 'none'}
                        onValueChange={handleRentalChange}
                        disabled={!editData.patientId}
                      >
                        <SelectTrigger className="text-xs">
                          <SelectValue placeholder={!editData.patientId ? "Sélectionner patient d'abord" : "Optionnel"} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Aucune location</SelectItem>
                          {filteredRentals.map((rental: any) => (
                            <SelectItem key={rental.id} value={rental.id}>
                              <div className="text-xs">
                                <div>{rental.rentalCode}</div>
                                {rental.medicalDevice && <div className="text-gray-500">{rental.medicalDevice.name}</div>}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                  )}
                  <TableCell>
                    <Select value={editData.bonType} onValueChange={handleBondTypeChange}>
                      <SelectTrigger className="text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(BOND_TYPE_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Input
                      placeholder="Auto-généré"
                      value={editData.bonNumber || ''}
                      readOnly
                      className="text-xs bg-gray-50 cursor-not-allowed"
                      title="Numéro généré automatiquement"
                    />
                  </TableCell>
                  <TableCell>
                    <Select value={editData.status} onValueChange={(v) => setEditData({ ...editData, status: v })}>
                      <SelectTrigger className="text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(STATUS_LABELS).map(([value, info]) => (
                          <SelectItem key={value} value={value}>{info.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min="1"
                      max="12"
                      value={editData.coveredMonths}
                      onChange={(e) => handleMonthsChange(parseInt(e.target.value) || 1)}
                      className="text-xs w-16"
                    />
                  </TableCell>
                  <TableCell>
                    <div className="text-xs">
                      <div className="font-medium">{Number(editData.bonAmount || 0).toFixed(2)} TND</div>
                      <div className="text-gray-500">{Number(editData.cnamMonthlyRate || 0).toFixed(2)}/m</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="670.00"
                      value={editData.deviceMonthlyRate || ''}
                      onChange={(e) => {
                        const rate = parseFloat(e.target.value) || 0;
                        const devicePrice = rate * editData.coveredMonths;
                        const bonAmount = editData.cnamMonthlyRate * editData.coveredMonths;
                        setEditData({
                          ...editData,
                          deviceMonthlyRate: rate,
                          devicePrice,
                          complementAmount: devicePrice - bonAmount,
                        });
                      }}
                      className="text-xs w-20"
                    />
                    <div className="text-[10px] text-gray-500 mt-0.5">
                      Total: {Number(editData.devicePrice || 0).toFixed(2)} TND
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-xs font-medium text-orange-600">
                      {Number(editData.complementAmount || 0).toFixed(2)} TND
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" onClick={handleSave} className="h-7 px-2">
                        <Save className="h-3 w-3" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={handleCancel} className="h-7 px-2">
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )}

              {bonds.length === 0 && !isAddingNew && (
                <TableRow>
                  <TableCell colSpan={showGlobalView ? 10 : 8} className="text-center text-gray-500 py-8">
                    Aucun bond CNAM. Cliquez sur "Nouveau Bond" pour commencer.
                  </TableCell>
                </TableRow>
              )}

              {bonds.map((bond) => {
                const isEditing = editingId === bond.id;
                const data = isEditing ? editData! : bond;

                return (
                  <TableRow key={bond.id} className={isEditing ? 'bg-blue-50' : ''}>
                    {showGlobalView && (
                      <TableCell>
                        <div className="text-xs">
                          <div className="font-medium">
                            {bond.patient?.firstName} {bond.patient?.lastName}
                          </div>
                          {bond.patient?.cnamId && (
                            <div className="text-gray-500">CNAM: {bond.patient.cnamId}</div>
                          )}
                        </div>
                      </TableCell>
                    )}
                    {showGlobalView && (
                      <TableCell>
                        <div className="text-xs">
                          <div className="font-medium">{bond.rental?.rentalCode || '-'}</div>
                          {bond.rental?.medicalDevice && (
                            <div className="text-gray-500">{bond.rental.medicalDevice.name}</div>
                          )}
                        </div>
                      </TableCell>
                    )}
                    <TableCell>
                      {isEditing ? (
                        <Select value={data.bonType} onValueChange={handleBondTypeChange}>
                          <SelectTrigger className="text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(BOND_TYPE_LABELS).map(([value, label]) => (
                              <SelectItem key={value} value={value}>{label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <div className="text-xs font-medium">{BOND_TYPE_LABELS[bond.bonType]}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <Input
                          value={data.dossierNumber || ''}
                          onChange={(e) => setEditData({ ...data, dossierNumber: e.target.value })}
                          className="text-xs"
                        />
                      ) : (
                        <div className="text-xs">{bond.dossierNumber || '-'}</div>
                      )}
                    </TableCell>
                    <TableCell>{getStatusBadge(bond.status)}</TableCell>
                    <TableCell>
                      {isEditing ? (
                        <Input
                          type="number"
                          min="1"
                          max="12"
                          value={data.coveredMonths}
                          onChange={(e) => handleMonthsChange(parseInt(e.target.value) || 1)}
                          className="text-xs w-16"
                        />
                      ) : (
                        <div className="text-xs">{bond.coveredMonths}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-xs">
                        <div className="font-medium">{Number(bond.bonAmount).toFixed(2)} TND</div>
                        <div className="text-gray-500">{Number(bond.cnamMonthlyRate).toFixed(2)}/m</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs">
                        <div className="font-medium">{Number(bond.devicePrice).toFixed(2)} TND</div>
                        <div className="text-gray-500">{Number(bond.deviceMonthlyRate).toFixed(2)}/m</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs font-medium text-orange-600">
                        {Number(bond.complementAmount).toFixed(2)} TND
                      </div>
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <div className="flex gap-1">
                          <Button size="sm" variant="outline" onClick={handleSave} className="h-7 px-2">
                            <Save className="h-3 w-3" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={handleCancel} className="h-7 px-2">
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex gap-1">
                          <Button size="sm" variant="outline" onClick={() => handleEdit(bond)} className="h-7 px-2">
                            <Edit2 className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDelete(bond.id!)}
                            className="h-7 px-2 text-red-600"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
