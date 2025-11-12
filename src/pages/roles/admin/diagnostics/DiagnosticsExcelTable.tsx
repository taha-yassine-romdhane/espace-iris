import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
import { useToast } from '@/components/ui/use-toast';
import { Edit2, Trash2, Check, X, Plus, Search, Stethoscope, ChevronLeft, ChevronRight } from 'lucide-react';
import { PatientSelector } from '@/components/forms/components/PatientSelector';

interface Diagnostic {
  id?: string;
  diagnosticCode?: string;
  patientId?: string;
  medicalDeviceId?: string;
  diagnosticDate?: Date | string;
  date?: Date | string; // API returns 'date' instead of 'diagnosticDate'
  performedById?: string;
  performedBy?: string | { // API can return string or object
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
  // Equipment status from API
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

// Calculate severity based on IAH value or equipment status
const getSeverity = (iah: number | null | undefined, hasSale?: boolean, hasRental?: boolean): { label: string; color: string } => {
  // If patient is equipped (has sale or rental), they are severe
  if (hasSale || hasRental) {
    return { label: 'Sévère', color: 'bg-red-100 text-red-800 border-red-300' };
  }

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

// Get equipment status (Appareillé or Non-Appareillé)
const getEquipmentStatus = (hasSale?: boolean, hasRental?: boolean): { label: string; color: string } => {
  if (hasSale || hasRental) {
    return { label: 'Appareillé', color: 'bg-green-100 text-green-800 border-green-300' };
  } else {
    return { label: 'Non-Appareillé', color: 'bg-gray-100 text-gray-800 border-gray-300' };
  }
};

export default function DiagnosticsExcelTable() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // State Management
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editedDiagnostic, setEditedDiagnostic] = useState<Diagnostic | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newDiagnostic, setNewDiagnostic] = useState<Partial<Diagnostic>>({
    status: 'PENDING',
    diagnosticDate: new Date()
  });

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);

  // Filter State
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterPerformedBy, setFilterPerformedBy] = useState<string>('ALL');
  const [filterDevice, setFilterDevice] = useState<string>('ALL');
  const [filterSeverity, setFilterSeverity] = useState<string>('ALL');
  const [filterEquipped, setFilterEquipped] = useState<string>('ALL');
  const [filterDateFrom, setFilterDateFrom] = useState<string>('');
  const [filterDateTo, setFilterDateTo] = useState<string>('');

  // Fetch diagnostics
  const { data: diagnosticsData, isLoading } = useQuery({
    queryKey: ['diagnostics'],
    queryFn: async () => {
      const response = await fetch('/api/diagnostics');
      if (!response.ok) throw new Error('Failed to fetch diagnostics');
      return response.json();
    }
  });

  // Fetch patients
  const { data: patientsData } = useQuery({
    queryKey: ['patients'],
    queryFn: async () => {
      const response = await fetch('/api/renseignements/patients');
      if (!response.ok) throw new Error('Failed to fetch patients');
      return response.json();
    }
  });

  // Fetch diagnostic devices
  const { data: devicesData } = useQuery({
    queryKey: ['diagnostic-devices'],
    queryFn: async () => {
      const response = await fetch('/api/medical-devices?type=DIAGNOSTIC_DEVICE');
      if (!response.ok) throw new Error('Failed to fetch devices');
      return response.json();
    }
  });

  // Fetch users/technicians (ADMIN and EMPLOYEE only)
  const { data: usersData } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const response = await fetch('/api/users');
      if (!response.ok) throw new Error('Failed to fetch users');
      const data = await response.json();
      // Filter to only show ADMIN and EMPLOYEE roles
      const allUsers = Array.isArray(data) ? data : (data?.users || []);
      return allUsers.filter((user: any) => user.role === 'ADMIN' || user.role === 'EMPLOYEE');
    }
  });

  // Extract arrays from API responses - handle different response formats
  const diagnostics = Array.isArray(diagnosticsData) ? diagnosticsData : (diagnosticsData?.diagnostics || []);
  const patients = Array.isArray(patientsData) ? patientsData : (patientsData?.patients || []);
  const devices = Array.isArray(devicesData) ? devicesData : (devicesData?.devices || []);
  const users = Array.isArray(usersData) ? usersData : [];

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: Partial<Diagnostic>) => {
      const response = await fetch('/api/diagnostics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: data.patientId,
          clientType: 'patient',
          medicalDeviceId: data.medicalDeviceId,
          products: [{
            id: data.medicalDeviceId,
            type: 'DIAGNOSTIC_DEVICE',
            name: devices.find((d: any) => d.id === data.medicalDeviceId)?.name || '',
            sellingPrice: 0
          }],
          followUpDate: data.followUpDate,
          totalPrice: 0,
          notes: data.notes,
          patientInfo: null,
          fileUrls: []
        })
      });
      if (!response.ok) throw new Error('Failed to create diagnostic');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['diagnostics'] });
      setIsAddingNew(false);
      setNewDiagnostic({ status: 'PENDING', diagnosticDate: new Date() });
      toast({ title: 'Succès', description: 'Diagnostic créé avec succès' });
    },
    onError: () => {
      toast({ title: 'Erreur', description: 'Erreur lors de la création', variant: 'destructive' });
    }
  });

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
          result: data.result // Include result data (IAH, ID values)
        })
      });
      if (!response.ok) throw new Error('Failed to update diagnostic');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['diagnostics'] });
      setEditingId(null);
      setEditedDiagnostic(null);
      toast({ title: 'Succès', description: 'Diagnostic modifié avec succès' });
    },
    onError: () => {
      toast({ title: 'Erreur', description: 'Erreur lors de la modification', variant: 'destructive' });
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/diagnostics/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete diagnostic');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['diagnostics'] });
      toast({ title: 'Succès', description: 'Diagnostic supprimé avec succès' });
    },
    onError: () => {
      toast({ title: 'Erreur', description: 'Erreur lors de la suppression', variant: 'destructive' });
    }
  });

  // Handlers
  const handleEdit = (diagnostic: Diagnostic) => {
    setEditingId(diagnostic.id || null);
    setEditedDiagnostic({
      ...diagnostic,
      // Use IDs from API response, fallback to nested object IDs
      patientId: diagnostic.patientId || diagnostic.patient?.id,
      medicalDeviceId: diagnostic.medicalDeviceId || diagnostic.medicalDevice?.id,
      performedById: diagnostic.performedById || (typeof diagnostic.performedBy === 'object' ? diagnostic.performedBy?.id : undefined),
      diagnosticDate: diagnostic.diagnosticDate || diagnostic.date // Handle both field names
    });
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditedDiagnostic(null);
  };

  const handleSave = async () => {
    if (!editedDiagnostic || !editedDiagnostic.id) return;
    if (!editedDiagnostic.patientId || !editedDiagnostic.medicalDeviceId || !editedDiagnostic.diagnosticDate) {
      toast({ title: 'Erreur', description: 'Patient, appareil et date sont requis', variant: 'destructive' });
      return;
    }
    await updateMutation.mutateAsync(editedDiagnostic);
  };

  const handleDelete = async (diagnostic: Diagnostic) => {
    if (!diagnostic.id) return;
    if (confirm('Êtes-vous sûr de vouloir supprimer ce diagnostic ?')) {
      await deleteMutation.mutateAsync(diagnostic.id);
    }
  };

  const handleAddNew = () => setIsAddingNew(true);

  const handleCancelNew = () => {
    setIsAddingNew(false);
    setNewDiagnostic({ status: 'PENDING', diagnosticDate: new Date() });
  };

  const handleSaveNew = async () => {
    if (!newDiagnostic.patientId || !newDiagnostic.medicalDeviceId || !newDiagnostic.diagnosticDate) {
      toast({ title: 'Erreur', description: 'Patient, appareil et date sont requis', variant: 'destructive' });
      return;
    }
    await createMutation.mutateAsync(newDiagnostic);
  };

  const updateEditedField = (field: keyof Diagnostic, value: any) => {
    if (editedDiagnostic) {
      const updates: any = { [field]: value };

      // Auto-set follow-up date to next day when diagnostic date changes
      if (field === 'diagnosticDate' && value) {
        const nextDay = new Date(value);
        nextDay.setDate(nextDay.getDate() + 1);
        updates.followUpDate = nextDay;
      }

      setEditedDiagnostic({ ...editedDiagnostic, ...updates });
    }
  };

  const updateNewField = (field: keyof Diagnostic, value: any) => {
    setNewDiagnostic(prev => {
      const updates: any = { [field]: value };

      // Auto-set follow-up date to next day when diagnostic date changes
      if (field === 'diagnosticDate' && value) {
        const nextDay = new Date(value);
        nextDay.setDate(nextDay.getDate() + 1);
        updates.followUpDate = nextDay;
      }

      return { ...prev, ...updates };
    });
  };

  // Filter diagnostics
  const filteredDiagnostics = diagnostics.filter((diag: Diagnostic) => {
    // Search term filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      const patientName = diag.patient ? `${diag.patient.firstName} ${diag.patient.lastName}`.toLowerCase() : '';
      const patientCode = (diag.patient as any)?.patientCode?.toLowerCase() || '';
      const deviceName = diag.medicalDevice?.name?.toLowerCase() || '';
      const code = diag.diagnosticCode?.toLowerCase() || '';
      const matchesSearch = patientName.includes(search) || deviceName.includes(search) || code.includes(search) || patientCode.includes(search);
      if (!matchesSearch) return false;
    }

    // Status filter
    if (filterStatus !== 'ALL' && diag.status !== filterStatus) return false;

    // Performed by filter
    if (filterPerformedBy !== 'ALL' && diag.performedById !== filterPerformedBy) return false;

    // Device filter
    if (filterDevice !== 'ALL' && diag.medicalDeviceId !== filterDevice) return false;

    // Severity filter
    if (filterSeverity !== 'ALL') {
      const severity = getSeverity(diag.result?.iah, diag.hasSale, diag.hasRental);
      if (severity.label !== filterSeverity) return false;
    }

    // Equipped filter
    if (filterEquipped !== 'ALL') {
      const isEquipped = diag.hasSale || diag.hasRental;
      if (filterEquipped === 'EQUIPPED' && !isEquipped) return false;
      if (filterEquipped === 'NOT_EQUIPPED' && isEquipped) return false;
    }

    // Date from filter
    if (filterDateFrom) {
      const diagDate = new Date(diag.diagnosticDate || diag.date || '');
      const fromDate = new Date(filterDateFrom);
      if (diagDate < fromDate) return false;
    }

    // Date to filter
    if (filterDateTo) {
      const diagDate = new Date(diag.diagnosticDate || diag.date || '');
      const toDate = new Date(filterDateTo);
      if (diagDate > toDate) return false;
    }

    return true;
  });

  // Pagination logic
  const totalPages = Math.ceil(filteredDiagnostics.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedDiagnostics = filteredDiagnostics.slice(startIndex, endIndex);

  const renderCell = (diagnostic: Diagnostic, field: string, isEditing: boolean) => {
    const value = isEditing && editedDiagnostic ? (editedDiagnostic as any)[field] : (diagnostic as any)[field];

    if (isEditing && editedDiagnostic) {
      switch (field) {
        case 'diagnosticCode':
          return (
            <Badge variant="outline" className="text-xs font-mono bg-blue-50 text-blue-700 border-blue-200">
              {diagnostic.diagnosticCode || 'N/A'}
            </Badge>
          );

        case 'patientId':
          return (
            <PatientSelector
              value={editedDiagnostic.patientId || ''}
              onChange={(val) => updateEditedField('patientId', val)}
              placeholder="Sélectionner patient"
              className="h-8 text-xs"
            />
          );

        case 'patientCode':
          // Read-only in edit mode, comes from patient selection
          const editPatientCode = (editedDiagnostic.patient as any)?.patientCode;
          if (!editPatientCode) return <span className="text-xs">-</span>;
          return (
            <Badge variant="outline" className="text-xs font-mono bg-purple-50 text-purple-700 border-purple-200 whitespace-nowrap">
              {editPatientCode}
            </Badge>
          );

        case 'patientPhone':
          // Read-only in edit mode, comes from patient selection
          return <span className="text-xs whitespace-nowrap">{(editedDiagnostic.patient as any)?.telephone || '-'}</span>;

        case 'medicalDeviceId':
          return (
            <Select
              value={editedDiagnostic.medicalDeviceId || ''}
              onValueChange={(val) => updateEditedField('medicalDeviceId', val)}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Appareil" />
              </SelectTrigger>
              <SelectContent>
                {devices.map((device: any) => (
                  <SelectItem key={device.id} value={device.id}>
                    {device.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          );

        case 'diagnosticDate':
          const diagnosticDateValue = editedDiagnostic.diagnosticDate
            ? new Date(editedDiagnostic.diagnosticDate).toISOString().split('T')[0]
            : '';
          return (
            <Input
              type="date"
              value={diagnosticDateValue}
              onChange={(e) => updateEditedField('diagnosticDate', e.target.value ? new Date(e.target.value) : null)}
              className="h-8 text-xs"
            />
          );

        case 'performedById':
          return (
            <Select
              value={editedDiagnostic.performedById || 'none'}
              onValueChange={(val) => updateEditedField('performedById', val === 'none' ? null : val)}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Aucun" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Aucun</SelectItem>
                {users.map((user: any) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.firstName} {user.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          );

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

        case 'followUpDate':
          const followUpDateValue = editedDiagnostic.followUpDate
            ? new Date(editedDiagnostic.followUpDate).toISOString().split('T')[0]
            : '';
          return (
            <Input
              type="date"
              value={followUpDateValue}
              onChange={(e) => updateEditedField('followUpDate', e.target.value ? new Date(e.target.value) : null)}
              className="h-8 text-xs"
            />
          );

        case 'iah':
          return (
            <Input
              type="number"
              step="0.1"
              value={editedDiagnostic.result?.iah || ''}
              onChange={(e) => {
                const newValue = e.target.value ? parseFloat(e.target.value) : null;
                setEditedDiagnostic({
                  ...editedDiagnostic,
                  result: { ...editedDiagnostic.result, iah: newValue, idValue: editedDiagnostic.result?.idValue || null }
                });
              }}
              className="h-8 text-xs"
              placeholder="IAH"
            />
          );

        case 'idValue':
          return (
            <Input
              type="number"
              step="0.1"
              value={editedDiagnostic.result?.idValue || ''}
              onChange={(e) => {
                const newValue = e.target.value ? parseFloat(e.target.value) : null;
                setEditedDiagnostic({
                  ...editedDiagnostic,
                  result: { ...editedDiagnostic.result, iah: editedDiagnostic.result?.iah || null, idValue: newValue }
                });
              }}
              className="h-8 text-xs"
              placeholder="ID"
            />
          );

        case 'severity':
          // Severity is calculated from IAH and equipment status, display in edit mode
          const editSeverity = getSeverity(editedDiagnostic.result?.iah, editedDiagnostic.hasSale, editedDiagnostic.hasRental);
          return (
            <Badge variant="outline" className={`text-xs ${editSeverity.color}`}>
              {editSeverity.label}
            </Badge>
          );

        case 'equipped':
          // Equipment status is read-only, display in edit mode
          const editEquipmentStatus = getEquipmentStatus(editedDiagnostic.hasSale, editedDiagnostic.hasRental);
          return (
            <Badge variant="outline" className={`text-xs ${editEquipmentStatus.color}`}>
              {editEquipmentStatus.label}
            </Badge>
          );

        case 'notes':
          return (
            <Input
              value={(editedDiagnostic.notes as string) || ''}
              onChange={(e) => updateEditedField('notes', e.target.value)}
              className="h-8 text-xs"
              placeholder="Notes"
            />
          );

        default:
          return <span className="text-xs">{String(value || '-')}</span>;
      }
    }

    // Display mode
    switch (field) {
      case 'diagnosticCode':
        if (!diagnostic.patient?.id) {
          return (
            <Badge variant="outline" className="text-xs font-mono bg-blue-50 text-blue-700 border-blue-200">
              {diagnostic.diagnosticCode || 'N/A'}
            </Badge>
          );
        }
        return (
          <Link
            href={`/roles/admin/renseignement/patient/${diagnostic.patient.id}`}
            className="inline-block hover:opacity-80 transition-opacity"
          >
            <Badge variant="outline" className="text-xs font-mono bg-blue-50 text-blue-700 border-blue-200 cursor-pointer hover:bg-blue-100">
              {diagnostic.diagnosticCode || 'N/A'}
            </Badge>
          </Link>
        );

      case 'patientId':
        const patientName = diagnostic.patient
          ? `${diagnostic.patient.firstName || ''} ${diagnostic.patient.lastName || ''}`.trim()
          : '-';
        if (!diagnostic.patient?.id || patientName === '-') {
          return <span className="text-xs whitespace-nowrap">{patientName}</span>;
        }
        return (
          <Link
            href={`/roles/admin/renseignement/patient/${diagnostic.patient.id}`}
            className="text-xs whitespace-nowrap text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
          >
            {patientName}
          </Link>
        );

      case 'patientCode':
        const patientCode = (diagnostic.patient as any)?.patientCode;
        if (!patientCode || !diagnostic.patient?.id) {
          return <span className="text-xs">-</span>;
        }
        return (
          <Link
            href={`/roles/admin/renseignement/patient/${diagnostic.patient.id}`}
            className="inline-block hover:opacity-80 transition-opacity"
          >
            <Badge variant="outline" className="text-xs font-mono bg-purple-50 text-purple-700 border-purple-200 whitespace-nowrap cursor-pointer hover:bg-purple-100">
              {patientCode}
            </Badge>
          </Link>
        );

      case 'patientPhone':
        return <span className="text-xs whitespace-nowrap">{(diagnostic.patient as any)?.telephone || '-'}</span>;

      case 'medicalDeviceId':
        return <span className="text-xs">{diagnostic.medicalDevice?.name || '-'}</span>;

      case 'diagnosticDate':
        const diagnosticDateValue = diagnostic.diagnosticDate || diagnostic.date;
        if (!diagnosticDateValue) return <span className="text-xs">-</span>;
        const date = new Date(diagnosticDateValue);
        return (
          <div className="text-xs">
            <div>{format(date, 'dd/MM/yyyy', { locale: fr })}</div>
          </div>
        );

      case 'performedById':
        let performedByText = '-';
        if (typeof diagnostic.performedBy === 'string') {
          performedByText = diagnostic.performedBy === 'N/A' ? '-' : diagnostic.performedBy;
        } else if (diagnostic.performedBy) {
          performedByText = `${diagnostic.performedBy.firstName} ${diagnostic.performedBy.lastName}`;
        }
        return <span className="text-xs">{performedByText}</span>;

      case 'status':
        return (
          <Badge className={`text-xs ${getStatusColor(diagnostic.status)}`}>
            {getStatusLabel(diagnostic.status)}
          </Badge>
        );

      case 'followUpDate':
        if (!diagnostic.followUpDate) return <span className="text-xs">-</span>;
        const followUpDate = new Date(diagnostic.followUpDate);
        return <span className="text-xs">{format(followUpDate, 'dd/MM/yyyy', { locale: fr })}</span>;

      case 'iah':
        return <span className="text-xs">{diagnostic.result?.iah !== null && diagnostic.result?.iah !== undefined ? diagnostic.result.iah.toFixed(1) : '-'}</span>;

      case 'idValue':
        return <span className="text-xs">{diagnostic.result?.idValue !== null && diagnostic.result?.idValue !== undefined ? diagnostic.result.idValue.toFixed(1) : '-'}</span>;

      case 'severity':
        const severity = getSeverity(diagnostic.result?.iah, diagnostic.hasSale, diagnostic.hasRental);
        return (
          <Badge variant="outline" className={`text-xs ${severity.color}`}>
            {severity.label}
          </Badge>
        );

      case 'equipped':
        const equipmentStatus = getEquipmentStatus(diagnostic.hasSale, diagnostic.hasRental);
        return (
          <Badge variant="outline" className={`text-xs ${equipmentStatus.color}`}>
            {equipmentStatus.label}
          </Badge>
        );

      case 'notes':
        return <span className="text-xs truncate max-w-[200px] block">{diagnostic.notes || '-'}</span>;

      default:
        return <span className="text-xs">{String(value || '-')}</span>;
    }
  };

  const renderNewRow = () => (
    <tr className="bg-blue-50 border-b">
      <td className="px-2 py-2">
        <span className="text-xs text-gray-500 italic">Auto-généré</span>
      </td>
      <td className="px-2 py-2">
        <Badge variant="outline" className="text-xs font-mono bg-gray-100 text-gray-500 border-gray-300">
          Auto
        </Badge>
      </td>
      <td className="px-2 py-2">
        <PatientSelector
          value={newDiagnostic.patientId || ''}
          onChange={(val) => updateNewField('patientId', val)}
          placeholder="Sélectionner patient"
          className="h-8 text-xs"
        />
      </td>
      <td className="px-2 py-2">
        <span className="text-xs text-gray-500 italic">Auto</span>
      </td>
      <td className="px-2 py-2">
        <Select
          value={newDiagnostic.medicalDeviceId || ''}
          onValueChange={(val) => updateNewField('medicalDeviceId', val)}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Sélectionner" />
          </SelectTrigger>
          <SelectContent>
            {devices.map((device: any) => (
              <SelectItem key={device.id} value={device.id}>
                {device.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </td>
      <td className="px-2 py-2">
        <Input
          type="date"
          value={newDiagnostic.diagnosticDate ? new Date(newDiagnostic.diagnosticDate).toISOString().split('T')[0] : ''}
          onChange={(e) => updateNewField('diagnosticDate', e.target.value ? new Date(e.target.value) : null)}
          className="h-8 text-xs"
        />
      </td>
      <td className="px-2 py-2">
        <Select
          value={newDiagnostic.performedById || 'none'}
          onValueChange={(val) => updateNewField('performedById', val === 'none' ? undefined : val)}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Aucun" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Aucun</SelectItem>
            {users.map((user: any) => (
              <SelectItem key={user.id} value={user.id}>
                {user.firstName} {user.lastName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </td>
      <td className="px-2 py-2">
        <Select
          value={newDiagnostic.status || 'PENDING'}
          onValueChange={(val) => updateNewField('status', val as any)}
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
      </td>
      <td className="px-2 py-2">
        <Input
          type="date"
          value={newDiagnostic.followUpDate ? new Date(newDiagnostic.followUpDate).toISOString().split('T')[0] : ''}
          onChange={(e) => updateNewField('followUpDate', e.target.value ? new Date(e.target.value) : null)}
          className="h-8 text-xs"
        />
      </td>
      <td className="px-2 py-2">
        <Input
          type="number"
          step="0.1"
          value={(newDiagnostic as any).iah || ''}
          onChange={(e) => updateNewField('iah' as any, e.target.value ? parseFloat(e.target.value) : null)}
          placeholder="IAH"
          className="h-8 text-xs"
        />
      </td>
      <td className="px-2 py-2">
        <Input
          type="number"
          step="0.1"
          value={(newDiagnostic as any).idValue || ''}
          onChange={(e) => updateNewField('idValue' as any, e.target.value ? parseFloat(e.target.value) : null)}
          placeholder="ID"
          className="h-8 text-xs"
        />
      </td>
      <td className="px-2 py-2">
        {(() => {
          const newSeverity = getSeverity((newDiagnostic as any).iah, false, false);
          return (
            <Badge variant="outline" className={`text-xs ${newSeverity.color}`}>
              {newSeverity.label}
            </Badge>
          );
        })()}
      </td>
      <td className="px-2 py-2">
        <Badge variant="outline" className="text-xs bg-gray-100 text-gray-800 border-gray-300">
          Non-Appareillé
        </Badge>
      </td>
      <td className="px-2 py-2">
        <Input
          value={newDiagnostic.notes || ''}
          onChange={(e) => updateNewField('notes', e.target.value)}
          placeholder="Notes"
          className="h-8 text-xs"
        />
      </td>
      <td className="px-2 py-2 sticky right-0 bg-blue-50">
        <div className="flex gap-1 justify-center">
          <Button onClick={handleSaveNew} size="icon" variant="ghost" className="h-7 w-7 text-green-600 hover:bg-green-50">
            <Check className="h-4 w-4" />
          </Button>
          <Button onClick={handleCancelNew} size="icon" variant="ghost" className="h-7 w-7 text-red-600 hover:bg-red-50">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </td>
    </tr>
  );

  if (isLoading) {
    return <div className="flex justify-center items-center py-8">Chargement...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Header Controls */}
      <div className="flex justify-between items-center gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Rechercher par patient, appareil, code diagnostic ou code patient..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={handleAddNew} disabled={isAddingNew} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Ajouter
        </Button>
      </div>

      {/* Pagination - Top */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border border-slate-200 rounded-lg">
        <div className="flex items-center space-x-4">
          <div className="text-sm text-slate-600">
            <span className="font-semibold text-slate-900">{filteredDiagnostics.length}</span> diagnostic(s) au total
          </div>
          <Select value={itemsPerPage.toString()} onValueChange={(value) => setItemsPerPage(Number(value))}>
            <SelectTrigger className="w-[140px] h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="25">25 par page</SelectItem>
              <SelectItem value="50">50 par page</SelectItem>
              <SelectItem value="100">100 par page</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center space-x-3">
          {/* First Page Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(1)}
            disabled={currentPage === 1}
            className="h-9 px-2"
            title="Première page"
          >
            <ChevronLeft className="h-4 w-4" />
            <ChevronLeft className="h-4 w-4 -ml-2" />
          </Button>

          {/* Previous Page Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="h-9 px-3"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Précédent
          </Button>

          {/* Page Numbers */}
          <div className="flex items-center space-x-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }

              return (
                <Button
                  key={pageNum}
                  variant={currentPage === pageNum ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentPage(pageNum)}
                  className="h-9 w-9 p-0"
                >
                  {pageNum}
                </Button>
              );
            })}
          </div>

          {/* Next Page Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="h-9 px-3"
          >
            Suivant
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>

          {/* Last Page Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(totalPages)}
            disabled={currentPage === totalPages}
            className="h-9 px-2"
            title="Dernière page"
          >
            <ChevronRight className="h-4 w-4" />
            <ChevronRight className="h-4 w-4 -ml-2" />
          </Button>

          {/* Page Jump Input */}
          <div className="flex items-center space-x-2 ml-2 pl-2 border-l border-slate-300">
            <span className="text-sm text-slate-600">Aller à:</span>
            <Input
              type="number"
              min="1"
              max={totalPages}
              value={currentPage}
              onChange={(e) => {
                const page = parseInt(e.target.value);
                if (page >= 1 && page <= totalPages) {
                  setCurrentPage(page);
                }
              }}
              className="h-9 w-16 text-sm text-center"
            />
            <span className="text-sm text-slate-600">/ {totalPages}</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2 p-3 bg-gray-50 rounded-lg border">
        {/* Status Filter */}
        <div>
          <label className="text-[10px] font-medium text-gray-700 mb-0.5 block">Statut</label>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="h-7 text-[10px]">
              <SelectValue placeholder="Tous" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tous</SelectItem>
              <SelectItem value="PENDING">En attente</SelectItem>
              <SelectItem value="COMPLETED">Terminé</SelectItem>
              <SelectItem value="CANCELLED">Annulé</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Performed By Filter */}
        <div>
          <label className="text-[10px] font-medium text-gray-700 mb-0.5 block">Effectué par</label>
          <Select value={filterPerformedBy} onValueChange={setFilterPerformedBy}>
            <SelectTrigger className="h-7 text-[10px]">
              <SelectValue placeholder="Tous" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tous</SelectItem>
              {users.map((user: any) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.firstName} {user.lastName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Device Filter */}
        <div>
          <label className="text-[10px] font-medium text-gray-700 mb-0.5 block">Appareil</label>
          <Select value={filterDevice} onValueChange={setFilterDevice}>
            <SelectTrigger className="h-7 text-[10px]">
              <SelectValue placeholder="Tous" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tous</SelectItem>
              {devices.map((device: any) => (
                <SelectItem key={device.id} value={device.id}>
                  {device.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Severity Filter */}
        <div>
          <label className="text-[10px] font-medium text-gray-700 mb-0.5 block">Sévérité</label>
          <Select value={filterSeverity} onValueChange={setFilterSeverity}>
            <SelectTrigger className="h-7 text-[10px]">
              <SelectValue placeholder="Toutes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Toutes</SelectItem>
              <SelectItem value="Normal">Normal</SelectItem>
              <SelectItem value="Léger">Léger</SelectItem>
              <SelectItem value="Modéré">Modéré</SelectItem>
              <SelectItem value="Sévère">Sévère</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Equipped Filter */}
        <div>
          <label className="text-[10px] font-medium text-gray-700 mb-0.5 block">Appareillé</label>
          <Select value={filterEquipped} onValueChange={setFilterEquipped}>
            <SelectTrigger className="h-7 text-[10px]">
              <SelectValue placeholder="Tous" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tous</SelectItem>
              <SelectItem value="EQUIPPED">Appareillé</SelectItem>
              <SelectItem value="NOT_EQUIPPED">Non-Appareillé</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Date From Filter */}
        <div>
          <label className="text-[10px] font-medium text-gray-700 mb-0.5 block">Date de</label>
          <Input
            type="date"
            value={filterDateFrom}
            onChange={(e) => setFilterDateFrom(e.target.value)}
            className="h-7 text-[10px]"
          />
        </div>

        {/* Date To Filter */}
        <div>
          <label className="text-[10px] font-medium text-gray-700 mb-0.5 block">Date à</label>
          <Input
            type="date"
            value={filterDateTo}
            onChange={(e) => setFilterDateTo(e.target.value)}
            className="h-7 text-[10px]"
          />
        </div>

        {/* Clear Filters Button */}
        <div className="flex items-end">
          <Button
            variant="outline"
            onClick={() => {
              setFilterStatus('ALL');
              setFilterPerformedBy('ALL');
              setFilterDevice('ALL');
              setFilterSeverity('ALL');
              setFilterEquipped('ALL');
              setFilterDateFrom('');
              setFilterDateTo('');
            }}
            className="h-7 w-full text-[10px] px-2"
          >
            Réinitialiser
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto" style={{ maxWidth: '100%' }}>
          <table className="text-sm" style={{ minWidth: '1800px' }}>
            <thead className="bg-gray-100 border-b sticky top-0">
              <tr>
                <th className="px-2 py-3 text-left font-medium text-xs whitespace-nowrap">Code Diag</th>
                <th className="px-2 py-3 text-left font-medium text-xs whitespace-nowrap">Code Patient</th>
                <th className="px-2 py-3 text-left font-medium text-xs whitespace-nowrap">Patient</th>
                <th className="px-2 py-3 text-left font-medium text-xs whitespace-nowrap">Téléphone</th>
                <th className="px-2 py-3 text-left font-medium text-xs whitespace-nowrap">Appareil</th>
                <th className="px-2 py-3 text-left font-medium text-xs whitespace-nowrap">Date</th>
                <th className="px-2 py-3 text-left font-medium text-xs whitespace-nowrap">Effectué par</th>
                <th className="px-2 py-3 text-left font-medium text-xs whitespace-nowrap">Statut</th>
                <th className="px-2 py-3 text-left font-medium text-xs whitespace-nowrap">Suivi</th>
                <th className="px-2 py-3 text-left font-medium text-xs whitespace-nowrap">IAH</th>
                <th className="px-2 py-3 text-left font-medium text-xs whitespace-nowrap">ID</th>
                <th className="px-2 py-3 text-left font-medium text-xs whitespace-nowrap">Sévérité</th>
                <th className="px-2 py-3 text-left font-medium text-xs whitespace-nowrap">Appareillé</th>
                <th className="px-2 py-3 text-left font-medium text-xs whitespace-nowrap">Notes</th>
                <th className="px-2 py-3 text-center font-medium text-xs whitespace-nowrap sticky right-0 bg-gray-100 shadow-lg" style={{ minWidth: '100px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isAddingNew && renderNewRow()}

              {paginatedDiagnostics.length === 0 ? (
                <tr>
                  <td colSpan={15} className="px-2 py-8 text-center">
                    <div className="flex flex-col items-center gap-2 text-gray-500">
                      <Stethoscope className="h-8 w-8" />
                      <p>Aucun diagnostic trouvé</p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedDiagnostics.map((diagnostic: Diagnostic) => {
                  const isEditing = editingId === diagnostic.id;
                  return (
                    <tr key={diagnostic.id} className={`border-b ${isEditing ? 'bg-yellow-50' : 'hover:bg-gray-50'}`}>
                      <td className="px-2 py-2">{renderCell(diagnostic, 'diagnosticCode', isEditing)}</td>
                      <td className="px-2 py-2">{renderCell(diagnostic, 'patientCode' as any, isEditing)}</td>
                      <td className="px-2 py-2">{renderCell(diagnostic, 'patientId', isEditing)}</td>
                      <td className="px-2 py-2">{renderCell(diagnostic, 'patientPhone' as any, isEditing)}</td>
                      <td className="px-2 py-2">{renderCell(diagnostic, 'medicalDeviceId', isEditing)}</td>
                      <td className="px-2 py-2">{renderCell(diagnostic, 'diagnosticDate', isEditing)}</td>
                      <td className="px-2 py-2">{renderCell(diagnostic, 'performedById', isEditing)}</td>
                      <td className="px-2 py-2">{renderCell(diagnostic, 'status', isEditing)}</td>
                      <td className="px-2 py-2">{renderCell(diagnostic, 'followUpDate', isEditing)}</td>
                      <td className="px-2 py-2">{renderCell(diagnostic, 'iah', isEditing)}</td>
                      <td className="px-2 py-2">{renderCell(diagnostic, 'idValue', isEditing)}</td>
                      <td className="px-2 py-2">{renderCell(diagnostic, 'severity' as any, isEditing)}</td>
                      <td className="px-2 py-2">{renderCell(diagnostic, 'equipped' as any, isEditing)}</td>
                      <td className="px-2 py-2">{renderCell(diagnostic, 'notes', isEditing)}</td>
                      <td className={`px-2 py-2 sticky right-0 shadow-lg ${isEditing ? 'bg-yellow-50' : 'bg-white'}`}>
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
                            <Button onClick={() => handleEdit(diagnostic)} size="icon" variant="ghost" className="h-7 w-7">
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button onClick={() => handleDelete(diagnostic)} size="icon" variant="ghost" className="h-7 w-7 text-red-600 hover:bg-red-50">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
