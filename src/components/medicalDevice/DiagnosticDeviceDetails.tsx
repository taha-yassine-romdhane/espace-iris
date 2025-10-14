import React from 'react';
import { MedicalDevice, Diagnostic, DiagnosticResult } from '@prisma/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ActivityIcon, CheckCircleIcon, ClockIcon, AlertCircleIcon } from 'lucide-react';

interface DiagnosticDeviceDetailsProps {
  device: MedicalDevice;
  diagnostics: (Diagnostic & {
    result?: DiagnosticResult | null;
    patient: { firstName: string; lastName: string };
  })[];
}

export const DiagnosticDeviceDetails: React.FC<DiagnosticDeviceDetailsProps> = ({ device, diagnostics }) => {
  const getStatusBadge = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'COMPLETED':
        return (
          <Badge className="bg-green-100 text-green-800 text-xs">
            <CheckCircleIcon className="h-3 w-3 mr-1" />
            Terminé
          </Badge>
        );
      case 'IN_PROGRESS':
        return (
          <Badge className="bg-blue-100 text-blue-800 text-xs">
            <ClockIcon className="h-3 w-3 mr-1" />
            En cours
          </Badge>
        );
      case 'PENDING':
        return (
          <Badge className="bg-yellow-100 text-yellow-800 text-xs">
            <AlertCircleIcon className="h-3 w-3 mr-1" />
            En attente
          </Badge>
        );
      default:
        return (
          <Badge className="bg-gray-100 text-gray-800 text-xs">
            {status || 'Non défini'}
          </Badge>
        );
    }
  };

  const formatIAH = (iah: number | null) => {
    if (!iah) return '-';
    return (
      <div className="flex items-center gap-2">
        <span className="font-medium">{iah}</span>
        <Badge 
          className={`text-xs ${
            iah < 5 ? 'bg-green-100 text-green-800' :
            iah < 15 ? 'bg-yellow-100 text-yellow-800' :
            iah < 30 ? 'bg-orange-100 text-orange-800' :
            'bg-red-100 text-red-800'
          }`}
        >
          {iah < 5 ? 'Normal' :
           iah < 15 ? 'Léger' :
           iah < 30 ? 'Modéré' :
           'Sévère'}
        </Badge>
      </div>
    );
  };

  if (!diagnostics || diagnostics.length === 0) {
    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-slate-900">Historique des diagnostics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <ActivityIcon className="h-12 w-12 text-gray-400 mb-3" />
            <h3 className="text-lg font-medium text-gray-900">Aucun diagnostic enregistré</h3>
            <p className="text-gray-500 mt-1 max-w-md">
              Cet appareil de diagnostic n'a pas encore été utilisé pour des examens. 
              Les futurs diagnostics apparaîtront ici.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-slate-900">
          Historique des diagnostics
          <Badge className="ml-2 bg-blue-100 text-blue-800 text-xs">
            {diagnostics.length} examen{diagnostics.length > 1 ? 's' : ''}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[120px]">Date</TableHead>
                <TableHead className="min-w-[180px]">Patient</TableHead>
                <TableHead className="w-[100px]">IAH</TableHead>
                <TableHead className="w-[80px]">ID</TableHead>
                <TableHead className="w-[120px]">Statut</TableHead>
                <TableHead>Remarques</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {diagnostics.map((diagnostic) => (
                <TableRow key={diagnostic.id} className="hover:bg-slate-50">
                  <TableCell className="font-medium">
                    {new Date(diagnostic.diagnosticDate).toLocaleDateString('fr-FR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric'
                    })}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-sm font-medium">
                        {diagnostic.patient.firstName.charAt(0)}{diagnostic.patient.lastName.charAt(0)}
                      </div>
                      <div>
                        <div className="font-medium text-slate-900">
                          {diagnostic.patient.firstName} {diagnostic.patient.lastName}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {formatIAH(diagnostic.result?.iah ?? null)}
                  </TableCell>
                  <TableCell className="font-medium">
                    {diagnostic.result?.idValue || '-'}
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(diagnostic.result?.status || '')}
                  </TableCell>
                  <TableCell className="max-w-[200px]">
                    <div className="text-sm text-slate-600">
                      {diagnostic.result?.remarque || diagnostic.notes || '-'}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};
