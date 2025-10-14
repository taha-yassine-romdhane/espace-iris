import React from 'react';
import { MedicalDevice, MedicalDeviceParametre } from '@prisma/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface DeviceParametersProps {
  device: MedicalDevice;
  parameters: MedicalDeviceParametre[];
}

export const DeviceParameters: React.FC<DeviceParametersProps> = ({ device, parameters }) => {
  if (!parameters || parameters.length === 0) {
    return null;
  }

  // Get the most recent parameters
  const latestParams = parameters[0];

  const renderParameterFields = () => {
    switch (latestParams.deviceType) {
      case 'CPAP':
        return (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <h3 className="text-sm font-medium text-gray-500">Pression</h3>
              <p>{latestParams.pression || 'Non défini'}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">Auto Pression</h3>
              <p>{latestParams.autoPression ? 'Oui' : 'Non'}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">Pression Rampe</h3>
              <p>{latestParams.pressionRampe || 'Non défini'}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">Durée Rampe</h3>
              <p>{latestParams.dureeRampe ? `${latestParams.dureeRampe} min` : 'Non défini'}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">Auto Rampe</h3>
              <p>{latestParams.autoRampe ? 'Oui' : 'Non'}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">EPR</h3>
              <p>{latestParams.epr || 'Non défini'}</p>
            </div>
          </div>
        );
      case 'VNI':
        return (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <h3 className="text-sm font-medium text-gray-500">IPAP</h3>
              <p>{latestParams.ipap || 'Non défini'}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">EPAP</h3>
              <p>{latestParams.epap || 'Non défini'}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">AID</h3>
              <p>{latestParams.aid || 'Non défini'}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">Fréquence Respiratoire</h3>
              <p>{latestParams.frequenceRespiratoire || 'Non défini'}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">Volume Courant</h3>
              <p>{latestParams.volumeCourant || 'Non défini'}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">Mode</h3>
              <p>{latestParams.mode || 'Non défini'}</p>
            </div>
          </div>
        );
      case 'Concentrateur O²':
      case 'Bouteil O²':
        return (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <h3 className="text-sm font-medium text-gray-500">Débit</h3>
              <p>{latestParams.debit || 'Non défini'}</p>
            </div>
          </div>
        );
      default:
        return (
          <p className="text-gray-500">Aucun paramètre spécifique disponible pour ce type d'appareil.</p>
        );
    }
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Paramètres de l'appareil</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <h3 className="text-sm font-medium text-gray-500">Type d'appareil</h3>
          <p>{latestParams.deviceType}</p>
        </div>
        {renderParameterFields()}
        <div className="mt-4 text-sm text-gray-500">
          Dernière mise à jour: {new Date(latestParams.updatedAt).toLocaleDateString()}
        </div>
      </CardContent>
    </Card>
  );
};
