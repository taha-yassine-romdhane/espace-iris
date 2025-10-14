import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Settings, 
  Activity, 
  Wind, 
  Gauge,
  Package,
  Shield,
  Info,
  AlertTriangle,
  Loader2
} from 'lucide-react';

interface EmployeeRentalParametersProps {
  rental: any;
  onUpdate?: (data: any) => void;
}

interface DeviceParameter {
  id?: string;
  patientId?: string;
  deviceId: string;
  deviceType: string;
  pression?: string;
  pressionRampe?: string;
  dureeRampe?: number;
  epr?: string;
  autoPression?: boolean;
  autoRampe?: boolean;
  ipap?: string;
  epap?: string;
  aid?: string;
  frequenceRespiratoire?: string;
  volumeCourant?: string;
  mode?: string;
  debit?: string;
  createdAt?: string;
  updatedAt?: string;
}

export default function EmployeeRentalParameters({ 
  rental, 
  onUpdate 
}: EmployeeRentalParametersProps) {
  const medicalDeviceId = rental.medicalDeviceId || rental.medicalDevice?.id;
  const patientId = rental.patientId || rental.patient?.id;

  // Fetch device parameters (read-only for employees)
  const { data: deviceParameters, isLoading } = useQuery({
    queryKey: ['device-parameters', medicalDeviceId, patientId],
    queryFn: async () => {
      if (!medicalDeviceId || !patientId) return null;
      
      const response = await fetch(`/api/device-parameters?deviceId=${medicalDeviceId}&patientId=${patientId}&role=employee`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch device parameters');
      }
      
      const data = await response.json();
      return data.parameters || null;
    },
    enabled: !!(medicalDeviceId && patientId),
  });

  // Helper function to detect device type
  const detectDeviceType = (deviceType: string, deviceName?: string, deviceModel?: string) => {
    if (deviceType && deviceType !== 'MEDICAL_DEVICE' && deviceType !== 'UNKNOWN') {
      return deviceType;
    }
    
    const searchText = `${deviceName || ''} ${deviceModel || ''}`.toLowerCase();
    
    if (searchText.includes('vni') || 
        searchText.includes('ventilation') || 
        searchText === 'vi' ||
        searchText.startsWith('vi ') ||
        searchText.includes(' vi ') ||
        searchText.endsWith(' vi')) {
      return 'VNI';
    }
    
    if (searchText.includes('cpap') || 
        searchText.includes('pression positive') ||
        searchText.includes('airsense') ||
        searchText.includes('resmed')) {
      return 'CPAP';  
    }
    
    if (searchText.includes('concentrateur') || 
        searchText.includes('oxygène') || 
        searchText.includes('oxygen') ||
        searchText.includes('o2') ||
        searchText.includes('o²')) {
      return 'CONCENTRATEUR_OXYGENE';
    }
    
    if (searchText.includes('bouteille') || 
        searchText.includes('bouteil')) {
      return 'BOUTEILLE_OXYGENE';
    }
    
    return 'UNKNOWN';
  };

  const detectedDeviceType = detectDeviceType(
    rental.medicalDevice?.deviceType,
    rental.medicalDevice?.name,
    rental.medicalDevice?.model
  );

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType) {
      case 'CPAP':
        return <Wind className="h-5 w-5 text-blue-600" />;
      case 'VNI':
        return <Activity className="h-5 w-5 text-green-600" />;
      case 'CONCENTRATEUR_OXYGENE':
      case 'BOUTEILLE_OXYGENE':
        return <Gauge className="h-5 w-5 text-orange-600" />;
      default:
        return <Package className="h-5 w-5 text-gray-600" />;
    }
  };

  const getDeviceTypeLabel = (deviceType: string) => {
    switch (deviceType) {
      case 'CPAP':
        return 'CPAP';
      case 'VNI':
        return 'VNI (Ventilation Non Invasive)';
      case 'CONCENTRATEUR_OXYGENE':
        return 'Concentrateur d\'Oxygène';
      case 'BOUTEILLE_OXYGENE':
        return 'Bouteille d\'Oxygène';
      default:
        return 'Appareil Médical';
    }
  };

  const getDeviceTypeBadgeColor = (deviceType: string) => {
    switch (deviceType) {
      case 'CPAP':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'VNI':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'CONCENTRATEUR_OXYGENE':
      case 'BOUTEILLE_OXYGENE':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const renderCPAPParameters = (params: DeviceParameter) => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div>
        <div className="text-sm text-gray-600 mb-1">Pression (cmH2O)</div>
        <div className="font-medium">{params.pression || 'Non défini'}</div>
      </div>
      <div>
        <div className="text-sm text-gray-600 mb-1">Pression Rampe (cmH2O)</div>
        <div className="font-medium">{params.pressionRampe || 'Non défini'}</div>
      </div>
      <div>
        <div className="text-sm text-gray-600 mb-1">Durée Rampe (min)</div>
        <div className="font-medium">{params.dureeRampe ? `${params.dureeRampe} min` : 'Non défini'}</div>
      </div>
      <div>
        <div className="text-sm text-gray-600 mb-1">EPR</div>
        <div className="font-medium">{params.epr || 'Non défini'}</div>
      </div>
      <div>
        <div className="text-sm text-gray-600 mb-1">Auto-Pression</div>
        <div className="flex items-center gap-2">
          <Badge variant={params.autoPression ? "default" : "secondary"}>
            {params.autoPression ? 'Activé' : 'Désactivé'}
          </Badge>
        </div>
      </div>
      <div>
        <div className="text-sm text-gray-600 mb-1">Auto-Rampe</div>
        <div className="flex items-center gap-2">
          <Badge variant={params.autoRampe ? "default" : "secondary"}>
            {params.autoRampe ? 'Activé' : 'Désactivé'}
          </Badge>
        </div>
      </div>
    </div>
  );

  const renderVNIParameters = (params: DeviceParameter) => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div>
        <div className="text-sm text-gray-600 mb-1">IPAP (cmH2O)</div>
        <div className="font-medium">{params.ipap || 'Non défini'}</div>
      </div>
      <div>
        <div className="text-sm text-gray-600 mb-1">EPAP (cmH2O)</div>
        <div className="font-medium">{params.epap || 'Non défini'}</div>
      </div>
      <div>
        <div className="text-sm text-gray-600 mb-1">AID (cmH2O)</div>
        <div className="font-medium">{params.aid || 'Non défini'}</div>
      </div>
      <div>
        <div className="text-sm text-gray-600 mb-1">Fréquence Respiratoire</div>
        <div className="font-medium">{params.frequenceRespiratoire || 'Non défini'}</div>
      </div>
      <div>
        <div className="text-sm text-gray-600 mb-1">Volume Courant (ml)</div>
        <div className="font-medium">{params.volumeCourant || 'Non défini'}</div>
      </div>
      <div>
        <div className="text-sm text-gray-600 mb-1">Mode</div>
        <div className="font-medium">{params.mode || 'Non défini'}</div>
      </div>
    </div>
  );

  const renderOxygenParameters = (params: DeviceParameter) => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <div className="text-sm text-gray-600 mb-1">Débit d'Oxygène (L/min)</div>
        <div className="font-medium">{params.debit || 'Non défini'}</div>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">Chargement des paramètres...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
          <Settings className="h-5 w-5 text-blue-600" />
          Paramètres de l'Appareil
        </h2>
      </div>

      {/* Employee Access Notice */}
      <Alert>
        <Shield className="h-4 w-4" />
        <AlertDescription>
          <strong>Mode Employé:</strong> Vous pouvez consulter les paramètres de configuration mais les modifications 
          sont réservées à l'administration pour des raisons de sécurité médicale.
        </AlertDescription>
      </Alert>

      {/* Device Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-blue-600" />
            Informations de l'Appareil
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <div className="text-sm text-gray-600 mb-1">Nom de l'Appareil</div>
              <div className="font-medium">{rental.medicalDevice?.name || 'Non défini'}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600 mb-1">Type d'Appareil</div>
              <div className="flex items-center gap-2">
                {getDeviceIcon(detectedDeviceType)}
                <Badge variant="outline" className={getDeviceTypeBadgeColor(detectedDeviceType)}>
                  {getDeviceTypeLabel(detectedDeviceType)}
                </Badge>
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600 mb-1">Numéro de Série</div>
              <div className="font-medium">{rental.medicalDevice?.serialNumber || 'Non défini'}</div>
            </div>
            {rental.medicalDevice?.brand && (
              <div>
                <div className="text-sm text-gray-600 mb-1">Marque</div>
                <div className="font-medium">{rental.medicalDevice.brand}</div>
              </div>
            )}
            {rental.medicalDevice?.model && (
              <div>
                <div className="text-sm text-gray-600 mb-1">Modèle</div>
                <div className="font-medium">{rental.medicalDevice.model}</div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Device Parameters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {getDeviceIcon(detectedDeviceType)}
            Paramètres de Configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!deviceParameters ? (
            <div className="text-center py-8">
              <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <div className="text-lg font-medium text-gray-600 mb-2">
                Aucun paramètre configuré
              </div>
              <div className="text-sm text-gray-500">
                Les paramètres de l'appareil n'ont pas encore été définis par l'administration.
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Parameters based on device type */}
              {detectedDeviceType === 'CPAP' && renderCPAPParameters(deviceParameters)}
              {detectedDeviceType === 'VNI' && renderVNIParameters(deviceParameters)}
              {(detectedDeviceType === 'CONCENTRATEUR_OXYGENE' || detectedDeviceType === 'BOUTEILLE_OXYGENE') && 
                renderOxygenParameters(deviceParameters)}
              
              {/* Generic parameters for unknown devices */}
              {detectedDeviceType === 'UNKNOWN' && (
                <div className="text-center py-4 text-gray-500">
                  <Info className="h-8 w-8 mx-auto mb-2" />
                  Type d'appareil non reconnu. Les paramètres spécifiques ne peuvent pas être affichés.
                </div>
              )}
              
              {/* Last updated info */}
              {deviceParameters.updatedAt && (
                <div className="mt-6 pt-4 border-t">
                  <div className="text-sm text-gray-600">
                    Dernière modification: {new Date(deviceParameters.updatedAt).toLocaleString('fr-FR')}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Parameter Guidelines */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5 text-blue-600" />
            Guide des Paramètres
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {detectedDeviceType === 'CPAP' && (
              <div>
                <h4 className="font-medium text-gray-800 mb-2">Paramètres CPAP</h4>
                <div className="space-y-2 text-sm text-gray-600">
                  <div><strong>Pression:</strong> Pression thérapeutique principale (généralement 4-20 cmH2O)</div>
                  <div><strong>Pression Rampe:</strong> Pression de démarrage progressive pour le confort</div>
                  <div><strong>Durée Rampe:</strong> Temps pour atteindre la pression thérapeutique</div>
                  <div><strong>EPR:</strong> Réduction de pression expiratoire pour le confort</div>
                </div>
              </div>
            )}
            
            {detectedDeviceType === 'VNI' && (
              <div>
                <h4 className="font-medium text-gray-800 mb-2">Paramètres VNI</h4>
                <div className="space-y-2 text-sm text-gray-600">
                  <div><strong>IPAP:</strong> Pression inspiratoire positive (généralement 8-30 cmH2O)</div>
                  <div><strong>EPAP:</strong> Pression expiratoire positive (généralement 4-15 cmH2O)</div>
                  <div><strong>AID:</strong> Différence entre IPAP et EPAP</div>
                  <div><strong>Fréquence Respiratoire:</strong> Nombre de respirations par minute</div>
                </div>
              </div>
            )}
            
            {(detectedDeviceType === 'CONCENTRATEUR_OXYGENE' || detectedDeviceType === 'BOUTEILLE_OXYGENE') && (
              <div>
                <h4 className="font-medium text-gray-800 mb-2">Paramètres Oxygénothérapie</h4>
                <div className="space-y-2 text-sm text-gray-600">
                  <div><strong>Débit d'Oxygène:</strong> Flux d'oxygène prescrit en litres par minute (généralement 0.5-15 L/min)</div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}