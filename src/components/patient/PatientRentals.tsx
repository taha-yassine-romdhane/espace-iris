import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, AlertCircle } from 'lucide-react';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';

interface PatientRentalsProps {
  rentals: any[];
  isLoading?: boolean;
}

export const PatientRentals = ({ rentals = [], isLoading = false }: PatientRentalsProps) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-800';
      case 'RETURNED':
        return 'bg-blue-100 text-blue-800';
      case 'OVERDUE':
        return 'bg-red-100 text-red-800';
      case 'PENDING':
        return 'bg-amber-100 text-amber-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Function to calculate the number of days between two dates
  const getDaysDifference = (startDate: Date, endDate: Date) => {
    const differenceInTime = endDate.getTime() - startDate.getTime();
    return Math.ceil(differenceInTime / (1000 * 3600 * 24));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5 text-blue-500" />
          Historique des locations
        </CardTitle>
        <CardDescription>
          Tous les appareils médicaux loués par ce patient
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700"></div>
          </div>
        ) : rentals.length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Appareil</TableHead>
                  <TableHead>Début</TableHead>
                  <TableHead>Fin</TableHead>
                  <TableHead>Durée</TableHead>
                  <TableHead>Montant</TableHead>
                  <TableHead>Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rentals.map((rental, index) => {
                  const startDate = new Date(rental.startDate);
                  const endDate = new Date(rental.endDate);
                  const duration = getDaysDifference(startDate, endDate);
                  
                  return (
                    <TableRow key={index}>
                      <TableCell>
                        <div className="font-medium">{rental.medicalDevice?.name || 'Appareil'}</div>
                        <div className="text-xs text-gray-500">{rental.medicalDevice?.serialNumber || 'N/A'}</div>
                      </TableCell>
                      <TableCell>{startDate.toLocaleDateString()}</TableCell>
                      <TableCell>{endDate.toLocaleDateString()}</TableCell>
                      <TableCell>{duration} jours</TableCell>
                      <TableCell className="font-medium">
                        {rental.amount} DT
                        {rental.guaranteeAmount && (
                          <div className="text-xs text-gray-500">
                            Caution: {rental.guaranteeAmount} DT
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(rental.status)}>
                          {rental.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <AlertCircle className="h-10 w-10 mx-auto mb-2 text-gray-300" />
            <p>Aucune location enregistrée pour ce patient</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
export default PatientRentals;