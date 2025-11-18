import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Edit2, Check, X, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/router';

interface Diagnostic {
  id?: string;
  diagnosticCode?: string;
  patientId?: string;
  medicalDeviceId?: string;
  diagnosticDate?: Date | string;
  date?: Date | string;
  performedById?: string;
  performedBy?: string | {
    id: string;
    firstName: string;
    lastName: string;
  };
  status: 'PENDING' | 'COMPLETED' | 'CANCELLED';
  followUpDate?: Date | string | null;
  notes?: string;
  patient?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  medicalDevice?: {
    id: string;
    name: string;
  };
  result?: {
    iah: number | null;
    idValue: number | null;
  };
  hasSale?: boolean;
  hasRental?: boolean;
  businessOutcome?: string;
}

const STATUSES = ['PENDING', 'COMPLETED', 'CANCELLED'];

const getStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    PENDING: 'bg-yellow-100 text-yellow-800',
    COMPLETED: 'bg-green-100 text-green-800',
    CANCELLED: 'bg-red-100 text-red-800'
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
};

const getStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    PENDING: 'En attente',
    COMPLETED: 'Terminé',
    CANCELLED: 'Annulé'
  };
  return labels[status] || status;
};

const getSeverity = (iah: number | null | undefined): { label: string; color: string } => {
  if (iah === null || iah === undefined) {
    return { label: '-', color: 'bg-gray-100 text-gray-800' };
  }

  if (iah < 5) {
    return { label: 'Normal', color: 'bg-green-100 text-green-800 border-green-300' };
  } else if (iah < 15) {
    return { label: 'Léger', color: 'bg-yellow-100 text-yellow-800 border-yellow-300' };
  } else if (iah < 30) {
    return { label: 'Modéré', color: 'bg-orange-100 text-orange-800 border-orange-300' };
  } else {
    return { label: 'Sévère', color: 'bg-red-100 text-red-800 border-red-300' };
  }
};

const getEquipmentStatus = (hasSale?: boolean, hasRental?: boolean): { label: string; color: string } => {
  if (hasSale || hasRental) {
    return { label: 'Appareillé', color: 'bg-green-100 text-green-800 border-green-300' };
  } else {
    return { label: 'Non-Appareillé', color: 'bg-gray-100 text-gray-800 border-gray-300' };
  }
};

export default function EmployeeDiagnosticsExcelTable() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const router = useRouter();

  // State Management
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editedDiagnostic, setEditedDiagnostic] = useState<Diagnostic | null>(null);

  // Filter State
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterSeverity, setFilterSeverity] = useState<string>('ALL');
  const [filterEquipped, setFilterEquipped] = useState<string>('ALL');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);

  // Fetch diagnostics (filtered by API based on role)
  const { data: diagnosticsData, isLoading } = useQuery({
    queryKey: ['employee-diagnostics'],
    queryFn: async () => {
      const response = await fetch('/api/diagnostics');
      if (!response.ok) throw new Error('Failed to fetch diagnostics');
      const data = await response.json();
      return Array.isArray(data) ? data : (data?.diagnostics || []);
    },
  });

  const diagnostics = diagnosticsData || [];

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data: Diagnostic) => {
      const response = await fetch(`/api/diagnostics/${data.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: data.patientId,
          medicalDeviceId: data.medicalDeviceId,
          diagnosticDate: data.diagnosticDate,
          performedById: data.performedById,
          status: data.status,
          followUpDate: data.followUpDate,
          notes: data.notes,
          result: data.result
        })
      });
      if (!response.ok) throw new Error('Failed to update diagnostic');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-diagnostics'] });
      setEditingId(null);
      setEditedDiagnostic(null);
      toast({ title: 'Succès', description: 'Diagnostic modifié avec succès' });
    },
    onError: () => {
      toast({ title: 'Erreur', description: 'Erreur lors de la modification', variant: 'destructive' });
    }
  });

  // Handlers
  const handleEdit = (diagnostic: Diagnostic) => {
    setEditingId(diagnostic.id || null);
    setEditedDiagnostic({
      ...diagnostic,
      patientId: diagnostic.patientId || diagnostic.patient?.id,
      medicalDeviceId: diagnostic.medicalDeviceId || diagnostic.medicalDevice?.id,
      performedById: diagnostic.performedById || (typeof diagnostic.performedBy === 'object' ? diagnostic.performedBy?.id : undefined),
      diagnosticDate: diagnostic.diagnosticDate || diagnostic.date
    });
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditedDiagnostic(null);
  };

  const handleSave = async () => {
    if (!editedDiagnostic || !editedDiagnostic.id) return;
    await updateMutation.mutateAsync(editedDiagnostic);
  };

  const handleViewDetails = (id: string) => {
    router.push(`/roles/employee/diagnostics/${id}`);
  };

  const handleEnterResults = (id: string) => {
    router.push(`/roles/employee/diagnostics/${id}/results`);
  };

  const updateEditedField = (field: keyof Diagnostic, value: any) => {
    if (editedDiagnostic) {
      setEditedDiagnostic({ ...editedDiagnostic, [field]: value });
    }
  };

  // Filter diagnostics
  const filteredDiagnostics = diagnostics.filter((diag: Diagnostic) => {
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      const patientName = diag.patient ? `${diag.patient.firstName} ${diag.patient.lastName}`.toLowerCase() : '';
      const deviceName = diag.medicalDevice?.name?.toLowerCase() || '';
      const code = diag.diagnosticCode?.toLowerCase() || '';
      if (!patientName.includes(search) && !deviceName.includes(search) && !code.includes(search)) {
        return false;
      }
    }

    if (filterStatus !== 'ALL' && diag.status !== filterStatus) return false;

    if (filterSeverity !== 'ALL') {
      const severity = getSeverity(diag.result?.iah);
      if (severity.label !== filterSeverity) return false;
    }

    if (filterEquipped !== 'ALL') {
      const isEquipped = diag.hasSale || diag.hasRental;
      if (filterEquipped === 'EQUIPPED' && !isEquipped) return false;
      if (filterEquipped === 'NOT_EQUIPPED' && isEquipped) return false;
    }

    return true;
  });

  // Pagination
  const totalPages = Math.ceil(filteredDiagnostics.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedDiagnostics = filteredDiagnostics.slice(startIndex, endIndex);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus, filterSeverity, filterEquipped]);

  const renderCell = (diagnostic: Diagnostic, field: string, isEditing: boolean) => {
    if (isEditing && editedDiagnostic) {
      switch (field) {
        case 'status':
          return (
            <Select
              value={editedDiagnostic.status}
              onValueChange={(val) => updateEditedField('status', val)}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUSES.map(status => (
                  <SelectItem key={status} value={status}>{getStatusLabel(status)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          );

        case 'notes':
          return (
            <Input
              value={editedDiagnostic.notes || ''}
              onChange={(e) => updateEditedField('notes', e.target.value)}
              className="h-8 text-xs"
            />
          );

        default:
          return null;
      }
    }

    // Display mode
    switch (field) {
      case 'diagnosticCode':
        return (
          <Badge variant="outline" className="text-xs font-mono bg-green-50 text-green-700 border-green-200">
            {diagnostic.diagnosticCode || 'N/A'}
          </Badge>
        );

      case 'patient':
        const patientName = diagnostic.patient
          ? `${diagnostic.patient.firstName} ${diagnostic.patient.lastName}`
          : '-';
        if (diagnostic.patient?.id) {
          return (
            <span
              className="text-xs text-green-600 hover:text-green-800 hover:underline cursor-pointer transition-colors"
              onClick={() => router.push(`/roles/employee/renseignement/patient/${diagnostic.patient?.id}`)}
            >
              {patientName}
            </span>
          );
        }
        return <span className="text-xs">{patientName}</span>;

      case 'device':
        return <span className="text-xs">{diagnostic.medicalDevice?.name || '-'}</span>;

      case 'diagnosticDate':
        if (!diagnostic.diagnosticDate && !diagnostic.date) return <span className="text-xs">-</span>;
        const date = new Date(diagnostic.diagnosticDate || diagnostic.date || '');
        return <span className="text-xs">{format(date, 'dd/MM/yyyy', { locale: fr })}</span>;

      case 'status':
        return (
          <Badge className={`text-xs ${getStatusColor(diagnostic.status)}`}>
            {getStatusLabel(diagnostic.status)}
          </Badge>
        );

      case 'severity':
        const severity = getSeverity(diagnostic.result?.iah);
        return (
          <Badge variant="outline" className={`text-xs border ${severity.color}`}>
            {severity.label}
          </Badge>
        );

      case 'iah':
        return <span className="text-xs">{diagnostic.result?.iah ?? '-'}</span>;

      case 'equipped':
        const equipped = getEquipmentStatus(diagnostic.hasSale, diagnostic.hasRental);
        return (
          <Badge variant="outline" className={`text-xs border ${equipped.color}`}>
            {equipped.label}
          </Badge>
        );

      case 'notes':
        return <span className="text-xs truncate max-w-[200px]">{diagnostic.notes || '-'}</span>;

      default:
        return <span className="text-xs">-</span>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="space-y-3 bg-gray-50 p-4 rounded-lg border">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par patient, code..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs font-medium text-muted-foreground">Filtres:</span>

          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[160px] h-9">
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tous les statuts</SelectItem>
              {STATUSES.map(status => (
                <SelectItem key={status} value={status}>{getStatusLabel(status)}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterSeverity} onValueChange={setFilterSeverity}>
            <SelectTrigger className="w-[160px] h-9">
              <SelectValue placeholder="Sévérité" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Toutes sévérités</SelectItem>
              <SelectItem value="Normal">Normal</SelectItem>
              <SelectItem value="Léger">Léger</SelectItem>
              <SelectItem value="Modéré">Modéré</SelectItem>
              <SelectItem value="Sévère">Sévère</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterEquipped} onValueChange={setFilterEquipped}>
            <SelectTrigger className="w-[180px] h-9">
              <SelectValue placeholder="Appareillé" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tous</SelectItem>
              <SelectItem value="EQUIPPED">Appareillé</SelectItem>
              <SelectItem value="NOT_EQUIPPED">Non-Appareillé</SelectItem>
            </SelectContent>
          </Select>

          {(filterStatus !== 'ALL' || filterSeverity !== 'ALL' || filterEquipped !== 'ALL' || searchTerm) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setFilterStatus('ALL');
                setFilterSeverity('ALL');
                setFilterEquipped('ALL');
                setSearchTerm('');
              }}
              className="h-9"
            >
              <X className="h-4 w-4 mr-1" />
              Réinitialiser
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 border-b sticky top-0">
              <tr>
                <th className="px-2 py-3 text-left font-medium text-xs">Code</th>
                <th className="px-2 py-3 text-left font-medium text-xs">Patient</th>
                <th className="px-2 py-3 text-left font-medium text-xs">Appareil</th>
                <th className="px-2 py-3 text-left font-medium text-xs">Date</th>
                <th className="px-2 py-3 text-left font-medium text-xs">Statut</th>
                <th className="px-2 py-3 text-left font-medium text-xs">Sévérité</th>
                <th className="px-2 py-3 text-left font-medium text-xs">IAH</th>
                <th className="px-2 py-3 text-left font-medium text-xs">Appareillé</th>
                <th className="px-2 py-3 text-left font-medium text-xs">Notes</th>
                <th className="px-2 py-3 text-center font-medium text-xs sticky right-0 bg-gray-100">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedDiagnostics.map((diagnostic: Diagnostic) => {
                const isEditing = editingId === diagnostic.id;
                return (
                  <tr key={diagnostic.id} className={`border-b ${isEditing ? 'bg-yellow-50' : 'hover:bg-gray-50'}`}>
                    <td className="px-2 py-2">{renderCell(diagnostic, 'diagnosticCode', isEditing)}</td>
                    <td className="px-2 py-2">{renderCell(diagnostic, 'patient', isEditing)}</td>
                    <td className="px-2 py-2">{renderCell(diagnostic, 'device', isEditing)}</td>
                    <td className="px-2 py-2">{renderCell(diagnostic, 'diagnosticDate', isEditing)}</td>
                    <td className="px-2 py-2">{renderCell(diagnostic, 'status', isEditing)}</td>
                    <td className="px-2 py-2">{renderCell(diagnostic, 'severity', isEditing)}</td>
                    <td className="px-2 py-2">{renderCell(diagnostic, 'iah', isEditing)}</td>
                    <td className="px-2 py-2">{renderCell(diagnostic, 'equipped', isEditing)}</td>
                    <td className="px-2 py-2">{renderCell(diagnostic, 'notes', isEditing)}</td>
                    <td className="px-2 py-2 sticky right-0 bg-white">
                      {isEditing ? (
                        <div className="flex gap-1 justify-center">
                          <Button onClick={handleSave} size="icon" variant="ghost" className="h-7 w-7 text-green-600 hover:bg-green-50">
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button onClick={handleCancel} size="icon" variant="ghost" className="h-7 w-7 text-red-600 hover:bg-red-50">
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex gap-1 justify-center">
                          <Button
                            onClick={() => handleViewDetails(diagnostic.id!)}
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-xs"
                          >
                            Détails
                          </Button>
                          <Button onClick={() => handleEdit(diagnostic)} size="icon" variant="ghost" className="h-7 w-7">
                            <Edit2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Afficher</span>
          <Select value={itemsPerPage.toString()} onValueChange={(val) => setItemsPerPage(Number(val))}>
            <SelectTrigger className="w-[100px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground">
            {startIndex + 1}-{Math.min(endIndex, filteredDiagnostics.length)} sur {filteredDiagnostics.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            size="sm"
            variant="outline"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm">
            Page {currentPage} sur {totalPages || 1}
          </span>
          <Button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            size="sm"
            variant="outline"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
