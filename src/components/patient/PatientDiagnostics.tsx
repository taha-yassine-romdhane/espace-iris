import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, AlertCircle, FileText } from 'lucide-react';
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
import { useRouter } from 'next/router';

interface PatientDiagnosticsProps {
  diagnostics: any[];
  isLoading?: boolean;
}

export const PatientDiagnostics = ({ diagnostics = [], isLoading = false }: PatientDiagnosticsProps) => {
  const router = useRouter();

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
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            className="flex items-center gap-2 print:hidden"
          >
            <FileText className="h-4 w-4" />
            Imprimer
          </Button>
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
                      {diagnostic.result?.status ? (
                        <Badge variant="outline" className="text-xs whitespace-nowrap">
                          {diagnostic.result.status}
                        </Badge>
                      ) : (
                        <span className="text-gray-400 text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-gray-600 max-w-[200px] truncate">
                      {diagnostic.notes || diagnostic.description || '-'}
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(diagnostic.status || 'PENDING')} size="sm">
                        {diagnostic.status === 'COMPLETED' ? 'Terminé' : diagnostic.status === 'PENDING' ? 'En attente' : diagnostic.status === 'IN_PROGRESS' ? 'En cours' : diagnostic.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {diagnostic.performedBy ? `${diagnostic.performedBy.firstName} ${diagnostic.performedBy.lastName}` : 'Non assigné'}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push(`/roles/admin/diagnostics/${diagnostic.id}`)}
                        className="h-8 px-2"
                      >
                        <FileText className="h-3 w-3 mr-1" />
                        Voir
                      </Button>
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
    </Card>
  );
};

export default PatientDiagnostics;
