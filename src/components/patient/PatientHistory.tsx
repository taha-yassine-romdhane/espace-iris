import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { History, AlertCircle } from 'lucide-react';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';

interface PatientHistoryProps {
  history: any[];
  isLoading?: boolean;
}

export const PatientHistory = ({ history = [], isLoading = false }: PatientHistoryProps) => {
  const getActionTypeColor = (actionType: string) => {
    switch (actionType) {
      case 'CREATE':
        return 'bg-green-100 text-green-800';
      case 'UPDATE':
        return 'bg-blue-100 text-blue-800';
      case 'DELETE':
        return 'bg-red-100 text-red-800';
      case 'DIAGNOSTIC':
        return 'bg-purple-100 text-purple-800';
      case 'RENTAL':
        return 'bg-amber-100 text-amber-800';
      case 'PAYMENT':
        return 'bg-indigo-100 text-indigo-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5 text-blue-500" />
          Historique du patient
        </CardTitle>
        <CardDescription>
          Toutes les actions liées à ce patient
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700"></div>
          </div>
        ) : history.length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Effectué par</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      {new Date(item.createdAt).toLocaleDateString('fr-FR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </TableCell>
                    <TableCell>
                      <Badge className={getActionTypeColor(item.actionType)}>{item.actionType}</Badge>
                    </TableCell>
                    <TableCell>
                      {item.details?.description || 'N/A'}
                      {item.relatedItemType && (
                        <span className="text-xs text-gray-500 block mt-1">
                          {item.relatedItemType}: {item.relatedItemId}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>{item.performedBy?.name || 'Système'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <AlertCircle className="h-10 w-10 mx-auto mb-2 text-gray-300" />
            <p>Aucun historique disponible pour ce patient</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PatientHistory;
