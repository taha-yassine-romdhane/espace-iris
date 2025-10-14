import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings, Info } from 'lucide-react';

interface RentalDetailsDeviceConfigProps {
  medicalDevice: any;
  deviceParameters?: any;
}

const RentalDetailsDeviceConfig: React.FC<RentalDetailsDeviceConfigProps> = ({ 
  medicalDevice, 
  deviceParameters 
}) => {
  if (!medicalDevice) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Configuration de l'Appareil</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500">Aucune information sur l'appareil disponible</p>
        </CardContent>
      </Card>
    );
  }

  // Parse device parameters if they exist
  let parameters = null;
  
  // Try to get parameters from different possible sources
  if (deviceParameters) {
    parameters = typeof deviceParameters === 'string' ? JSON.parse(deviceParameters) : deviceParameters;
  } else if (medicalDevice?.parameters) {
    parameters = typeof medicalDevice.parameters === 'string' ? JSON.parse(medicalDevice.parameters) : medicalDevice.parameters;
  } else if (medicalDevice?.deviceParameters) {
    parameters = typeof medicalDevice.deviceParameters === 'string' ? JSON.parse(medicalDevice.deviceParameters) : medicalDevice.deviceParameters;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Configuration de l'Appareil</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-start">
          <Info className="h-5 w-5 mr-2 text-blue-600" />
          <div>
            <h3 className="font-medium text-gray-700">Appareil</h3>
            <p>{medicalDevice.name || '-'}</p>
            {(medicalDevice.brand || medicalDevice.model) && (
              <p className="text-sm text-gray-500">
                {medicalDevice.brand || ''} {medicalDevice.model || ''}
              </p>
            )}
          </div>
        </div>
        
        {medicalDevice.serialNumber && (
          <div className="flex items-start">
            <div>
              <h3 className="font-medium text-gray-700">Numéro de Série</h3>
              <p>{medicalDevice.serialNumber}</p>
            </div>
          </div>
        )}

        {parameters && (
          <div className="mt-4">
            <div className="flex items-center mb-2">
              <Settings className="h-5 w-5 mr-2 text-blue-600" />
              <h3 className="font-medium text-gray-700">Paramètres Configurés</h3>
            </div>
            
            <div className="bg-gray-50 p-3 rounded-md">
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                {/* VNI specific parameters */}
                {medicalDevice.name === 'VNI' && (
                  <>
                    {parameters.pressionRampe !== undefined && (
                      <>
                        <dt className="text-gray-600">Pression Rampe:</dt>
                        <dd>{parameters.pressionRampe}</dd>
                      </>
                    )}
                    {parameters.dureeRampe !== undefined && (
                      <>
                        <dt className="text-gray-600">Durée Rampe:</dt>
                        <dd>{parameters.dureeRampe} min</dd>
                      </>
                    )}
                    {parameters.ipap !== undefined && (
                      <>
                        <dt className="text-gray-600">IPAP:</dt>
                        <dd>{parameters.ipap}</dd>
                      </>
                    )}
                    {parameters.epap !== undefined && (
                      <>
                        <dt className="text-gray-600">EPAP:</dt>
                        <dd>{parameters.epap}</dd>
                      </>
                    )}
                    {parameters.aid !== undefined && (
                      <>
                        <dt className="text-gray-600">AID:</dt>
                        <dd>{parameters.aid}</dd>
                      </>
                    )}
                    {parameters.freqRespiratoire !== undefined && (
                      <>
                        <dt className="text-gray-600">Fréq. Respiratoire:</dt>
                        <dd>{parameters.freqRespiratoire}</dd>
                      </>
                    )}
                    {parameters.volumeCourant !== undefined && (
                      <>
                        <dt className="text-gray-600">Volume Courant:</dt>
                        <dd>{parameters.volumeCourant}</dd>
                      </>
                    )}
                    {parameters.mode !== undefined && (
                      <>
                        <dt className="text-gray-600">Mode:</dt>
                        <dd>{parameters.mode}</dd>
                      </>
                    )}
                  </>
                )}

                {/* Concentrateur Oxygen specific parameters */}
                {medicalDevice.name === 'Concentrateur Oxygen' && (
                  <>
                    {parameters.debit !== undefined && (
                      <>
                        <dt className="text-gray-600">Débit:</dt>
                        <dd>{parameters.debit} L/min</dd>
                      </>
                    )}
                    {parameters.concentration !== undefined && (
                      <>
                        <dt className="text-gray-600">Concentration:</dt>
                        <dd>{parameters.concentration}%</dd>
                      </>
                    )}
                    {parameters.mode !== undefined && (
                      <>
                        <dt className="text-gray-600">Mode:</dt>
                        <dd>{parameters.mode}</dd>
                      </>
                    )}
                  </>
                )}

                {/* Generic parameters for other devices */}
                {!['VNI', 'Concentrateur Oxygen'].includes(medicalDevice.name) && (
                  Object.entries(parameters).map(([key, value]: [string, any]) => (
                    <React.Fragment key={key}>
                      <dt className="text-gray-600">{key}:</dt>
                      <dd>{value}</dd>
                    </React.Fragment>
                  ))
                )}
              </dl>
            </div>
          </div>
        )}

        {!parameters && medicalDevice.name && (
          <div className="mt-2 p-3 bg-amber-50 rounded-md">
            <p className="text-sm text-amber-700">
              Aucun paramètre configuré pour cet appareil.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RentalDetailsDeviceConfig;
