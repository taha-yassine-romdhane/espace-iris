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
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface PatientDevicesProps {
  devices: any[];
  isLoading?: boolean;
}

export const PatientDevices = ({ devices = [], isLoading = false }: PatientDevicesProps) => {
  const getSourceLabel = (source: string) => {
    switch (source) {
      case 'sale':
        return 'Achat';
      case 'rental':
        return 'Location';
      default:
        return source;
    }
  };

  const getSourceColor = (source: string) => {
    switch (source) {
      case 'sale':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'rental':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
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
                  <TableHead className="w-[140px]">Type</TableHead>
                  <TableHead className="w-[200px]">Nom / Modèle</TableHead>
                  <TableHead className="w-[120px]">N° de série</TableHead>
                  <TableHead className="w-[100px]">Code</TableHead>
                  <TableHead className="w-[120px]">Acquisition</TableHead>
                  <TableHead className="w-[120px]">Code Vente/Location</TableHead>
                  <TableHead className="w-[100px]">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {devices.map((device, index) => (
                  <TableRow key={index} className="hover:bg-gray-50">
                    <TableCell>
                      {device.type ? (
                        <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
                          {device.type}
                        </Badge>
                      ) : (
                        <span className="text-gray-400 text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium text-sm">{device.name || 'Appareil médical'}</div>
                        {device.brand && (
                          <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                            {device.brand}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-gray-600">
                      {device.serialNumber || '-'}
                    </TableCell>
                    <TableCell>
                      {device.deviceCode ? (
                        <Badge variant="outline" className="font-mono text-xs bg-gray-50 text-gray-700">
                          {device.deviceCode}
                        </Badge>
                      ) : (
                        <span className="text-gray-400 text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-xs ${getSourceColor(device.source)}`}>
                        {getSourceLabel(device.source)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {device.saleCode || device.rentalCode ? (
                        <Badge variant="outline" className="font-mono text-xs bg-blue-50 text-blue-700 border-blue-200">
                          {device.saleCode || device.rentalCode}
                        </Badge>
                      ) : (
                        <span className="text-gray-400 text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {device.saleDate || device.startDate
                        ? format(new Date(device.saleDate || device.startDate), 'dd/MM/yyyy', { locale: fr })
                        : '-'}
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
