import React from 'react';
import { MedicalDevice } from '@prisma/client';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface DeviceHeaderProps {
  device: MedicalDevice & {
    stockLocation?: { name: string } | null;
    Rental?: Array<{ status: string }>;
  };
}

export const DeviceHeader: React.FC<DeviceHeaderProps> = ({ device }) => {
  // Determine actual device status based on active rentals
  const hasActiveRental = device.Rental?.some(rental => rental.status === 'ACTIVE');
  const actualStatus = hasActiveRental ? 'RESERVED' : device.status;
  const getStatusColor = (status: string) => {
    switch (status.toUpperCase()) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-800';
      case 'MAINTENANCE':
        return 'bg-yellow-100 text-yellow-800';
      case 'RETIRED':
        return 'bg-red-100 text-red-800';
      case 'RESERVED':
        return 'bg-blue-100 text-blue-800';
      case 'SOLD':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status.toUpperCase()) {
      case 'ACTIVE':
        return 'Disponible';
      case 'MAINTENANCE':
        return 'Maintenance';
      case 'RETIRED':
        return 'Retiré';
      case 'RESERVED':
        return 'Réservé';
      case 'SOLD':
        return 'Vendu';
      default:
        return status;
    }
  };

  const getDeviceTypeLabel = (type: string) => {
    switch (type) {
      case 'DIAGNOSTIC_DEVICE':
        return 'Appareil de diagnostic';
      case 'MEDICAL_DEVICE':
        return 'Appareil médical';
      default:
        return type;
    }
  };

  return (
    <Card className="mb-6">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <CardTitle className="text-2xl font-bold">{device.name}</CardTitle>
              {device.deviceCode && (
                <Badge variant="outline" className="font-mono text-sm bg-blue-50 text-blue-700 border-blue-200">
                  {device.deviceCode}
                </Badge>
              )}
            </div>
            <p className="text-gray-500">
              {device.brand} / {device.model} {device.serialNumber && `• SN: ${device.serialNumber}`}
            </p>
          </div>
          <Badge className={getStatusColor(actualStatus)}>
            {getStatusLabel(actualStatus)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {device.deviceCode && (
            <div>
              <h3 className="text-sm font-medium text-gray-500">Code Appareil</h3>
              <p className="font-mono font-semibold text-blue-700">{device.deviceCode}</p>
            </div>
          )}
          <div>
            <h3 className="text-sm font-medium text-gray-500">Type</h3>
            <p>{getDeviceTypeLabel(device.type)}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500">Prix de vente</h3>
            <p className="font-semibold">{device.sellingPrice ? `${device.sellingPrice} DT` : 'Non défini'}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500">Prix de location</h3>
            <p className="font-semibold">{device.rentalPrice ? `${device.rentalPrice} DT/mois` : 'Non défini'}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500">Emplacement Stock</h3>
            <p>{device.stockLocation?.name || <span className="text-orange-600 italic">Non assigné</span>}</p>
          </div>
          {device.purchaseDate && (
            <div>
              <h3 className="text-sm font-medium text-gray-500">Date d'achat</h3>
              <p>{new Date(device.purchaseDate).toLocaleDateString('fr-FR')}</p>
            </div>
          )}
          {device.warrantyExpiration && (
            <div>
              <h3 className="text-sm font-medium text-gray-500">Garantie expire le</h3>
              <p className={new Date(device.warrantyExpiration) < new Date() ? 'text-red-600 font-semibold' : ''}>
                {new Date(device.warrantyExpiration).toLocaleDateString('fr-FR')}
                {new Date(device.warrantyExpiration) < new Date() && ' (Expirée)'}
              </p>
            </div>
          )}
        </div>
        {device.description && (
          <div className="mt-4">
            <h3 className="text-sm font-medium text-gray-500">Description</h3>
            <p className="mt-1">{device.description}</p>
          </div>
        )}
        {device.technicalSpecs && (
          <div className="mt-4">
            <h3 className="text-sm font-medium text-gray-500">Compteur (heures de fonctionnement)</h3>
            <p className="mt-1 font-semibold text-lg">{device.technicalSpecs} heures</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
