import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, AlertCircle, FileText, Plus, Edit } from 'lucide-react';
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useRouter } from 'next/router';
import { AddDiagnosticForm } from '@/components/employee/patient-details-forms/AddDiagnosticForm';

interface PatientDiagnosticsProps {
  diagnostics: any[];
  isLoading?: boolean;
  patientId?: string;
  patientName?: string;
}

export const PatientDiagnostics = ({ diagnostics = [], isLoading = false, patientId, patientName }: PatientDiagnosticsProps) => {
  const router = useRouter();
  const [selectedDiagnostic, setSelectedDiagnostic] = useState<any>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);

  const handleAddDiagnostic = () => {
    setShowAddDialog(true);
  };

  const handleAddSuccess = () => {
    setShowAddDialog(false);
    // Data will be automatically refreshed by React Query invalidation
  };

  const handleEditDiagnostic = (diagnostic: any) => {
    // Navigate to diagnostics page with diagnostic to edit
    router.push(`/roles/employee/diagnostics?diagnosticId=${diagnostic.id}`);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-100 text-green-800';
      case 'PENDING':
        return 'bg-amber-100 text-amber-800';
      case 'IN_PROGRESS':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    const statusLabels: Record<string, string> = {
      'COMPLETED': 'Terminé',
      'PENDING': 'En attente',
      'IN_PROGRESS': 'En cours',
    };
    return statusLabels[status] || status;
  };

  const getSeverityLabel = (severity: string) => {
    const severityLabels: Record<string, string> = {
      'NORMAL': 'Normal',
      'LIGHT': 'Léger',
      'MODERATE': 'Modéré',
      'SEVERE': 'Sévère',
      'VERY_SEVERE': 'Très sévère',
    };
    return severityLabels[severity] || severity;
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'NORMAL':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'LIGHT':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'MODERATE':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'SEVERE':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'VERY_SEVERE':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Calculate severity from IAH value
  const calculateSeverityFromIAH = (iah: number | null | undefined): { severity: string; label: string; color: string } => {
    if (iah === null || iah === undefined) {
      return { severity: 'UNKNOWN', label: '-', color: 'bg-gray-100 text-gray-800 border-gray-200' };
    }

    if (iah < 5) {
      return { severity: 'NORMAL', label: 'Normal', color: 'bg-green-100 text-green-800 border-green-200' };
    } else if (iah < 15) {
      return { severity: 'LIGHT', label: 'Léger', color: 'bg-blue-100 text-blue-800 border-blue-200' };
    } else if (iah < 30) {
      return { severity: 'MODERATE', label: 'Modéré', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' };
    } else {
      return { severity: 'SEVERE', label: 'Sévère', color: 'bg-orange-100 text-orange-800 border-orange-200' };
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-500" />
              Polygraphie
            </CardTitle>
            <CardDescription>
              Historique des polygraphies réalisées pour ce patient
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="flex items-center gap-2 print:hidden"
            >
              <FileText className="h-4 w-4" />
              Imprimer
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={handleAddDiagnostic}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
            >
              <Edit className="h-4 w-4" />
              Gérer
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700"></div>
          </div>
        ) : diagnostics.length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Code Diag</TableHead>
                  <TableHead className="w-[100px]">N° Série</TableHead>
                  <TableHead className="w-[100px]">Date</TableHead>
                  <TableHead className="w-[150px]">Appareil</TableHead>
                  <TableHead className="w-[100px]">IAH / ID</TableHead>
                  <TableHead className="w-[100px]">Sévérité</TableHead>
                  <TableHead className="w-[200px]">Remarque</TableHead>
                  <TableHead className="w-[100px]">Statut</TableHead>
                  <TableHead className="w-[140px]">Technicien responsable</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {diagnostics.map((diagnostic, index) => (
                  <TableRow key={index} className="hover:bg-gray-50">
                    <TableCell>
                      <Badge variant="outline" className="font-mono text-xs bg-blue-50 text-blue-700 border-blue-200">
                        {diagnostic.diagnosticCode || 'N/A'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs font-mono text-gray-600">
                      {diagnostic.medicalDevice?.serialNumber || '-'}
                    </TableCell>
                    <TableCell className="text-sm">
                      {new Date(diagnostic.diagnosticDate).toLocaleDateString('fr-FR')}
                    </TableCell>
                    <TableCell>
                      {diagnostic.medicalDevice ? (
                        <div className="space-y-1">
                          <div className="text-xs font-medium text-gray-700">
                            {diagnostic.medicalDevice.name}
                          </div>
                          {diagnostic.medicalDevice.brand && (
                            <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
                              {diagnostic.medicalDevice.brand}
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400 text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        {diagnostic.result?.iah ? (
                          <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200 w-fit">
                            IAH: {diagnostic.result.iah}
                          </Badge>
                        ) : (
                          <span className="text-gray-400 text-xs">IAH: -</span>
                        )}
                        {diagnostic.result?.idValue ? (
                          <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200 w-fit">
                            ID: {diagnostic.result.idValue}
                          </Badge>
                        ) : (
                          <span className="text-gray-400 text-xs">ID: -</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {(() => {
                        const severityData = calculateSeverityFromIAH(diagnostic.result?.iah);
                        return severityData.label === '-' ? (
                          <span className="text-gray-400 text-sm">-</span>
                        ) : (
                          <Badge variant="outline" className={`text-xs whitespace-nowrap ${severityData.color}`}>
                            {severityData.label}
                          </Badge>
                        );
                      })()}
                    </TableCell>
                    <TableCell className="text-xs text-gray-600 max-w-[200px] truncate">
                      {diagnostic.notes || diagnostic.description || '-'}
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(diagnostic.status || 'PENDING')} size="sm">
                        {getStatusLabel(diagnostic.status || 'PENDING')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {diagnostic.performedBy ? `${diagnostic.performedBy.firstName} ${diagnostic.performedBy.lastName}` : 'Non assigné'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditDiagnostic(diagnostic)}
                          className="h-8 px-2 hover:bg-green-100 hover:text-green-700"
                        >
                          <Edit className="h-3 w-3 mr-1" />
                          Modifier
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => router.push(`/roles/employee/diagnostics/${diagnostic.id}`)}
                          className="h-8 px-2 hover:bg-blue-100 hover:text-blue-700"
                        >
                          <FileText className="h-3 w-3 mr-1" />
                          Voir
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <AlertCircle className="h-10 w-10 mx-auto mb-2 text-gray-300" />
            <p>Aucune polygraphie disponible pour ce patient</p>
          </div>
        )}
      </CardContent>

      {/* Manage Diagnostics Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-700">
              <Activity className="h-5 w-5 text-green-600" />
              Gérer les Polygraphies
            </DialogTitle>
          </DialogHeader>
          {patientId && (
            <AddDiagnosticForm
              patientId={patientId}
              diagnostics={diagnostics}
              onSuccess={handleAddSuccess}
            />
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default PatientDiagnostics;
