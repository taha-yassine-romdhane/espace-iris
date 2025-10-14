import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Cpu, AlertCircle } from 'lucide-react';
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

interface PatientDevicesProps {
  devices: any[];
  isLoading?: boolean;
}

export const PatientDevices = ({ devices = [], isLoading = false }: PatientDevicesProps) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-800';
      case 'INACTIVE':
        return 'bg-red-100 text-red-800';
      case 'MAINTENANCE':
        return 'bg-amber-100 text-amber-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Cpu className="h-5 w-5 text-blue-500" />
          Appareils médicaux
        </CardTitle>
        <CardDescription>
          Appareils médicaux associés à ce patient
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700"></div>
          </div>
        ) : devices.length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Modèle</TableHead>
                  <TableHead>N° de série</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Type d'acquisition</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {devices.map((device, index) => (
                  <TableRow key={index}>
                    <TableCell>{device.type}</TableCell>
                    <TableCell>
                      <div>{device.brand} {device.model}</div>
                      <div className="text-xs text-gray-500">ID: {device.id.substring(0, 8)}</div>
                    </TableCell>
                    <TableCell>{device.serialNumber || 'N/A'}</TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(device.status)}>
                        {device.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {device.rentalInfo ? (
                        <Badge variant="outline">Location</Badge>
                      ) : (
                        <Badge variant="outline">Achat</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {new Date(device.createdAt).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <AlertCircle className="h-10 w-10 mx-auto mb-2 text-gray-300" />
            <p>Aucun appareil médical associé à ce patient</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PatientDevices;
