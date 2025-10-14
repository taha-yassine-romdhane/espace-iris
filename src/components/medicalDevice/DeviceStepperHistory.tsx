import React from 'react';
import { MedicalDevice, Sale, Rental, Diagnostic } from '@prisma/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { HistoryIcon, ShoppingCartIcon, HomeIcon, StethoscopeIcon } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';

interface DeviceStepperHistoryProps {
  device: MedicalDevice & {
    Sales?: Sale[];
    Rentals?: Rental[];
    Diagnostics?: Diagnostic[];
  };
}

export const DeviceStepperHistory: React.FC<DeviceStepperHistoryProps> = ({ device }) => {
  const hasHistory = 
    (device.Sales && device.Sales.length > 0) || 
    (device.Rentals && device.Rentals.length > 0) || 
    (device.Diagnostics && device.Diagnostics.length > 0);

  if (!hasHistory) {
    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center">
            <HistoryIcon className="mr-2 h-5 w-5" />
            Historique des processus
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Aucun historique disponible pour cet appareil.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center">
          <HistoryIcon className="mr-2 h-5 w-5" />
          Historique des processus
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Référence</TableHead>
              <TableHead>État</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {device.Sales?.map((sale) => (
              <TableRow key={`sale-${sale.id}`}>
                <TableCell>
                  <div className="flex items-center">
                    <ShoppingCartIcon className="mr-2 h-4 w-4 text-blue-500" />
                    Vente
                  </div>
                </TableCell>
                <TableCell>{format(new Date(sale.createdAt), 'dd/MM/yyyy')}</TableCell>
                <TableCell>{sale.invoiceNumber || `#${sale.id}`}</TableCell>
                <TableCell>
                  <Badge variant={sale.status === 'COMPLETED' ? 'success' : 'default'}>
                    {sale.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Link href={`/roles/admin/sales/${sale.id}`} className="text-blue-600 hover:underline">
                    Voir détails
                  </Link>
                </TableCell>
              </TableRow>
            ))}
            
            {device.Rentals?.map((rental) => (
              <TableRow key={`rental-${rental.id}`}>
                <TableCell>
                  <div className="flex items-center">
                    <HomeIcon className="mr-2 h-4 w-4 text-green-500" />
                    Location
                  </div>
                </TableCell>
                <TableCell>{format(new Date(rental.createdAt), 'dd/MM/yyyy')}</TableCell>
                <TableCell>{rental.invoiceNumber || `#${rental.id}`}</TableCell>
                <TableCell>
                  <Badge variant={rental.status === 'PENDING' ? 'default' : rental.status === 'COMPLETED' ? 'success' : 'default'}>
                    {rental.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Link href={`/roles/admin/rentals/${rental.id}`} className="text-blue-600 hover:underline">
                    Voir détails
                  </Link>
                </TableCell>
              </TableRow>
            ))}
            
            {device.Diagnostics?.map((diagnostic) => (
              <TableRow key={`diagnostic-${diagnostic.id}`}>
                <TableCell>
                  <div className="flex items-center">
                    <StethoscopeIcon className="mr-2 h-4 w-4 text-purple-500" />
                    Diagnostic
                  </div>
                </TableCell>
                <TableCell>{format(new Date(diagnostic.createdAt), 'dd/MM/yyyy')}</TableCell>
                <TableCell>
                  <Badge variant={diagnostic.status === 'COMPLETED' ? 'success' : 'default'}>
                    {diagnostic.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Link href={`/roles/admin/diagnostics/${diagnostic.id}`} className="text-blue-600 hover:underline">
                    Voir détails
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
