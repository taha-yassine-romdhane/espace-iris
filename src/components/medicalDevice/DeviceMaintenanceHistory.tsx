import React from 'react';
import { MedicalDevice, RepairLog } from '@prisma/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { WrenchIcon } from 'lucide-react';

interface DeviceMaintenanceHistoryProps {
  device: MedicalDevice;
  repairLogs: (RepairLog & {
    location: { name: string };
    technician?: { user: { firstName: string; lastName: string } } | null;
  })[];
}

export const DeviceMaintenanceHistory: React.FC<DeviceMaintenanceHistoryProps> = ({ device, repairLogs }) => {
  if (!repairLogs || repairLogs.length === 0) {
    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Historique de maintenance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <WrenchIcon className="h-12 w-12 text-gray-400 mb-2" />
            <h3 className="text-lg font-medium text-gray-900">Aucun historique de maintenance</h3>
            <p className="text-gray-500 mt-1">
              Cet appareil n'a pas d'historique de maintenance enregistré.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Historique de maintenance</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Lieu</TableHead>
              <TableHead>Technicien</TableHead>
              <TableHead>Coût</TableHead>
              <TableHead>Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {repairLogs.map((log) => (
              <TableRow key={log.id}>
                <TableCell>{new Date(log.repairDate).toLocaleDateString()}</TableCell>
                <TableCell>{log.location.name}</TableCell>
                <TableCell>
                  {log.technician?.user 
                    ? `${log.technician.user.firstName} ${log.technician.user.lastName}` 
                    : 'Non assigné'}
                </TableCell>
                <TableCell>{log.repairCost.toString()} DT</TableCell>
                <TableCell>{log.notes || '-'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
