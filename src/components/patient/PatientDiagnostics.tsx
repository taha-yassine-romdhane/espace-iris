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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-blue-500" />
          Diagnostics
        </CardTitle>
        <CardDescription>
          Historique des diagnostics réalisés pour ce patient
        </CardDescription>
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
                  <TableHead>Date</TableHead>
                  <TableHead>Appareil</TableHead>
                  <TableHead>Résultat</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Médecin</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {diagnostics.map((diagnostic, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      {new Date(diagnostic.diagnosticDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell>{diagnostic.medicalDevice?.name || 'N/A'}</TableCell>
                    <TableCell>
                      <div className="max-w-xs truncate">{diagnostic.result}</div>
                      {diagnostic.notes && (
                        <div className="text-xs text-gray-500 truncate mt-1">
                          Note: {diagnostic.notes}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(diagnostic.status || 'PENDING')}>
                        {diagnostic.status || 'En attente'}
                      </Badge>
                    </TableCell>
                    <TableCell>{diagnostic.performedBy?.firstName || 'Non assigné'}</TableCell>
                    <TableCell>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => router.push(`/roles/admin/diagnostics/${diagnostic.id}`)}
                      >
                        <FileText className="h-4 w-4 mr-1" />
                        Détails
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
            <p>Aucun diagnostic disponible pour ce patient</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PatientDiagnostics;
