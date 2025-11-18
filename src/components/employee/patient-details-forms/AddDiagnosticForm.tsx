import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { Plus, Save, X, Edit2, Trash2, AlertCircle } from 'lucide-react';

interface Diagnostic {
  id?: string;
  medicalDeviceId: string;
  notes?: string;
  followUpDate?: string;
  iah?: number;
  idValue?: number;
  remarque?: string;
  medicalDevice?: {
    name: string;
    brand?: string;
    model?: string;
    serialNumber?: string;
  };
  result?: {
    iah?: number;
    idValue?: number;
  };
}

interface AddDiagnosticFormProps {
  patientId: string;
  diagnostics: any[];
  onSuccess: () => void;
}

export const AddDiagnosticForm: React.FC<AddDiagnosticFormProps> = ({
  patientId,
  diagnostics,
  onSuccess
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [newRow, setNewRow] = useState<Partial<Diagnostic> | null>(null);
  const [editData, setEditData] = useState<Partial<Diagnostic>>({});

  // Fetch available medical devices for diagnostics
  const { data: devicesData } = useQuery({
    queryKey: ['medical-devices-diagnostics'],
    queryFn: async () => {
      const response = await fetch('/api/medical-devices?type=DIAGNOSTIC');
      if (!response.ok) throw new Error('Failed to fetch devices');
      return response.json();
    },
  });

  const devices = devicesData?.devices || [];

  // Calculate severity from IAH value
  const calculateSeverity = (iahValue?: number): { label: string; color: string } => {
    if (!iahValue || isNaN(iahValue)) {
      return { label: '-', color: 'bg-gray-100 text-gray-800' };
    }

    if (iahValue < 5) {
      return { label: 'Normal', color: 'bg-green-100 text-green-800 border-green-200' };
    } else if (iahValue < 15) {
      return { label: 'Léger', color: 'bg-blue-100 text-blue-800 border-blue-200' };
    } else if (iahValue < 30) {
      return { label: 'Modéré', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' };
    } else {
      return { label: 'Sévère', color: 'bg-orange-100 text-orange-800 border-orange-200' };
    }
  };

  // Create diagnostic mutation
  const createMutation = useMutation({
    mutationFn: async (data: Partial<Diagnostic>) => {
      const response = await fetch('/api/diagnostics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: patientId,
          medicalDeviceId: data.medicalDeviceId,
          notes: data.notes || '',
          followUpDate: data.followUpDate || null,
          result: {
            iah: data.iah || null,
            idValue: data.idValue || null,
            remarque: data.remarque || null,
            status: 'PENDING',
          },
        }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create diagnostic');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patient', patientId] });
      toast({ title: 'Succès', description: 'Diagnostic créé avec succès' });
      setNewRow(null);
      onSuccess();
    },
    onError: (error: Error) => {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    },
  });

  // Update diagnostic mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      const response = await fetch('/api/diagnostics', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          notes: data.notes,
          followUpDate: data.followUpDate || null,
          result: {
            iah: data.iah || null,
            idValue: data.idValue || null,
            remarque: data.remarque || null,
          },
        }),
      });
      if (!response.ok) throw new Error('Failed to update diagnostic');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patient', patientId] });
      toast({ title: 'Succès', description: 'Diagnostic mis à jour' });
      setEditingId(null);
      onSuccess();
    },
    onError: (error: Error) => {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    },
  });

  const handleAddNew = () => {
    setNewRow({
      medicalDeviceId: '',
      notes: '',
      followUpDate: '',
      iah: undefined,
      idValue: undefined,
      remarque: '',
    });
    setEditingId(null);
  };

  const handleSaveNew = () => {
    if (!newRow?.medicalDeviceId) {
      toast({ title: 'Erreur', description: 'Veuillez sélectionner un appareil', variant: 'destructive' });
      return;
    }
    createMutation.mutate(newRow);
  };

  const handleEdit = (diagnostic: any) => {
    setEditData({
      id: diagnostic.id,
      medicalDeviceId: diagnostic.medicalDeviceId,
      notes: diagnostic.notes || '',
      followUpDate: diagnostic.followUpDate ? new Date(diagnostic.followUpDate).toISOString().split('T')[0] : '',
      iah: diagnostic.result?.iah,
      idValue: diagnostic.result?.idValue,
      remarque: diagnostic.result?.remarque || '',
    });
    setEditingId(diagnostic.id);
    setNewRow(null);
  };

  const handleSaveEdit = () => {
    updateMutation.mutate(editData);
  };

  return (
    <div className="space-y-4">
      {/* Add Button */}
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-semibold text-gray-700">
          {diagnostics.length} polygraphie(s)
        </h3>
        <Button
          onClick={handleAddNew}
          disabled={!!newRow}
          className="bg-green-600 hover:bg-green-700"
          size="sm"
        >
          <Plus className="h-4 w-4 mr-2" />
          Ajouter
        </Button>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-semibold text-slate-700">Appareil</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-slate-700">IAH</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-slate-700">ID</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-slate-700">Sévérité</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-slate-700">Remarque</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-slate-700">Date Suivi</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-slate-700">Notes</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-slate-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {/* New Row */}
              {newRow && (
                <tr className="bg-green-50 border-b-2 border-green-200">
                  <td className="px-3 py-2">
                    <Select
                      value={newRow.medicalDeviceId}
                      onValueChange={(value) => setNewRow({ ...newRow, medicalDeviceId: value })}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Sélectionner" />
                      </SelectTrigger>
                      <SelectContent>
                        {devices.filter((d: any) => d.status === 'ACTIVE').map((device: any) => (
                          <SelectItem key={device.id} value={device.id}>
                            <div className="flex flex-col">
                              <span className="font-medium text-xs">{device.name}</span>
                              <span className="text-xs text-gray-500">SN: {device.serialNumber}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      type="number"
                      step="0.1"
                      value={newRow.iah || ''}
                      onChange={(e) => setNewRow({ ...newRow, iah: e.target.value ? parseFloat(e.target.value) : undefined })}
                      className="h-8 text-xs"
                      placeholder="IAH"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      type="number"
                      step="0.1"
                      value={newRow.idValue || ''}
                      onChange={(e) => setNewRow({ ...newRow, idValue: e.target.value ? parseFloat(e.target.value) : undefined })}
                      className="h-8 text-xs"
                      placeholder="ID"
                    />
                  </td>
                  <td className="px-3 py-2">
                    {newRow.iah ? (
                      <Badge variant="outline" className={`text-xs ${calculateSeverity(newRow.iah).color}`}>
                        {calculateSeverity(newRow.iah).label}
                      </Badge>
                    ) : (
                      <span className="text-xs text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      value={newRow.remarque || ''}
                      onChange={(e) => setNewRow({ ...newRow, remarque: e.target.value })}
                      className="h-8 text-xs"
                      placeholder="Remarque"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      type="date"
                      value={newRow.followUpDate || ''}
                      onChange={(e) => setNewRow({ ...newRow, followUpDate: e.target.value })}
                      className="h-8 text-xs"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Textarea
                      value={newRow.notes || ''}
                      onChange={(e) => setNewRow({ ...newRow, notes: e.target.value })}
                      className="min-h-[32px] text-xs"
                      placeholder="Notes"
                      rows={1}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex gap-1">
                      <Button
                        onClick={handleSaveNew}
                        disabled={createMutation.isPending}
                        className="h-7 px-2 bg-green-600 hover:bg-green-700"
                        size="sm"
                      >
                        <Save className="h-3 w-3" />
                      </Button>
                      <Button
                        onClick={() => setNewRow(null)}
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
              {diagnostics.map((diagnostic: any) => {
                const isEditing = editingId === diagnostic.id;
                const severity = calculateSeverity(diagnostic.result?.iah);

                if (isEditing) {
                  return (
                    <tr key={diagnostic.id} className="bg-blue-50 border-b-2 border-blue-200">
                      <td className="px-3 py-2">
                        <div className="text-xs">
                          <div className="font-medium">{diagnostic.medicalDevice?.name}</div>
                          <div className="text-gray-500">SN: {diagnostic.medicalDevice?.serialNumber}</div>
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          type="number"
                          step="0.1"
                          value={editData.iah || ''}
                          onChange={(e) => setEditData({ ...editData, iah: e.target.value ? parseFloat(e.target.value) : undefined })}
                          className="h-8 text-xs"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          type="number"
                          step="0.1"
                          value={editData.idValue || ''}
                          onChange={(e) => setEditData({ ...editData, idValue: e.target.value ? parseFloat(e.target.value) : undefined })}
                          className="h-8 text-xs"
                        />
                      </td>
                      <td className="px-3 py-2">
                        {editData.iah ? (
                          <Badge variant="outline" className={`text-xs ${calculateSeverity(editData.iah).color}`}>
                            {calculateSeverity(editData.iah).label}
                          </Badge>
                        ) : (
                          <span className="text-xs text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          value={editData.remarque || ''}
                          onChange={(e) => setEditData({ ...editData, remarque: e.target.value })}
                          className="h-8 text-xs"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          type="date"
                          value={editData.followUpDate || ''}
                          onChange={(e) => setEditData({ ...editData, followUpDate: e.target.value })}
                          className="h-8 text-xs"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Textarea
                          value={editData.notes || ''}
                          onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
                          className="min-h-[32px] text-xs"
                          rows={1}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex gap-1">
                          <Button
                            onClick={handleSaveEdit}
                            disabled={updateMutation.isPending}
                            className="h-7 px-2 bg-blue-600 hover:bg-blue-700"
                            size="sm"
                          >
                            <Save className="h-3 w-3" />
                          </Button>
                          <Button
                            onClick={() => setEditingId(null)}
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
                  <tr key={diagnostic.id} className="border-b hover:bg-gray-50">
                    <td className="px-3 py-2">
                      <div className="text-xs">
                        <div className="font-medium">{diagnostic.medicalDevice?.name}</div>
                        <div className="text-gray-500">SN: {diagnostic.medicalDevice?.serialNumber}</div>
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <span className="text-xs font-medium">{diagnostic.result?.iah || '-'}</span>
                    </td>
                    <td className="px-3 py-2">
                      <span className="text-xs">{diagnostic.result?.idValue || '-'}</span>
                    </td>
                    <td className="px-3 py-2">
                      <Badge variant="outline" className={`text-xs ${severity.color}`}>
                        {severity.label}
                      </Badge>
                    </td>
                    <td className="px-3 py-2">
                      <span className="text-xs text-gray-600">{diagnostic.result?.remarque || '-'}</span>
                    </td>
                    <td className="px-3 py-2">
                      <span className="text-xs">
                        {diagnostic.followUpDate ? new Date(diagnostic.followUpDate).toLocaleDateString('fr-FR') : '-'}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <span className="text-xs text-gray-600">{diagnostic.notes || '-'}</span>
                    </td>
                    <td className="px-3 py-2">
                      <Button
                        onClick={() => handleEdit(diagnostic)}
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

              {diagnostics.length === 0 && !newRow && (
                <tr>
                  <td colSpan={8} className="px-3 py-8 text-center text-gray-500 text-sm">
                    <AlertCircle className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                    Aucune polygraphie. Cliquez sur "Ajouter" pour commencer.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AddDiagnosticForm;
