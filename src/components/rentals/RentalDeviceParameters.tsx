import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Settings, 
  Activity, 
  Wind, 
  Gauge 
} from 'lucide-react';

interface RentalDeviceParametersProps {
  rental: any;
  deviceParameters: Record<string, any>;
}

export default function RentalDeviceParameters({ 
  rental, 
  deviceParameters 
}: RentalDeviceParametersProps) {
  
  // Function to format parameters for display
  const formatParameterValue = (key: string, value: any) => {
    if (typeof value === 'boolean') {
      return value ? 'Activé' : 'Désactivé';
    }
    return value?.toString() || '-';
  };

  // Function to get parameter display name
  const getParameterDisplayName = (key: string) => {
    const displayNames: Record<string, string> = {
      // CPAP Parameters
      pression: 'Pression',
      pressionRampe: 'Pression Rampe',
      dureeRampe: 'Durée Rampe',
      epr: 'EPR',
      autoPression: 'Auto Pression',
      autoRampe: 'Auto Rampe',
      
      // VNI Parameters
      ipap: 'IPAP',
      epap: 'EPAP',
      aid: 'AID',
      frequenceRespiratoire: 'Fréquence Respiratoire',
      volumeCourant: 'Volume Courant',
      mode: 'Mode',
      
      // Concentrateur & Bouteille Parameters
      debit: 'Débit',
    };
    
    return displayNames[key] || key;
  };

  // Function to get parameter category
  const getParameterCategory = (key: string) => {
    const categories: Record<string, string> = {
      pression: 'Thérapie',
      pressionRampe: 'Thérapie', 
      dureeRampe: 'Confort',
      epr: 'Confort',
      autoPression: 'Automatique',
      autoRampe: 'Automatique',
      ipap: 'Thérapie',
      epap: 'Thérapie',
      aid: 'Thérapie',
      frequenceRespiratoire: 'Ventilation',
      volumeCourant: 'Ventilation',
      mode: 'Configuration',
      debit: 'Oxygénothérapie',
    };
    
    return categories[key] || 'Général';
  };

  // Function to get category icon
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Thérapie':
        return Activity;
      case 'Ventilation':
        return Wind;
      case 'Oxygénothérapie':
        return Wind;
      case 'Configuration':
        return Settings;
      case 'Automatique':
        return Gauge;
      default:
        return Settings;
    }
  };

  // Group parameters by product
  const parametersByProduct = Object.entries(deviceParameters).reduce((acc, [productId, params]) => {
    if (params && typeof params === 'object') {
      acc[productId] = params;
    }
    return acc;
  }, {} as Record<string, any>);

  if (Object.keys(parametersByProduct).length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-blue-600" />
            Paramètres des Appareils
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <Settings className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>Aucun paramètre configuré pour cette location</p>
            <p className="text-sm mt-2">Les paramètres sont configurés lors de la sélection des produits</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {Object.entries(parametersByProduct).map(([productId, productParams]) => {
        // Group parameters by category
        const parametersByCategory = Object.entries(productParams)
          .filter(([key, value]) => key !== 'productName' && value !== undefined && value !== '')
          .reduce((acc, [key, value]) => {
            const category = getParameterCategory(key);
            if (!acc[category]) {
              acc[category] = [];
            }
            acc[category].push({ key, value });
            return acc;
          }, {} as Record<string, Array<{ key: string; value: any }>>);

        const productName = productParams.productName || 'Appareil';

        return (
          <Card key={productId}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-blue-600" />
                Paramètres - {productName}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {Object.entries(parametersByCategory).map(([category, params]) => {
                const IconComponent = getCategoryIcon(category);
                
                return (
                  <div key={category}>
                    <div className="flex items-center gap-2 mb-3">
                      <IconComponent className="h-4 w-4 text-blue-600" />
                      <h4 className="font-medium text-gray-800">{category}</h4>
                      <Badge variant="outline" className="text-xs">
                        {params.length} paramètre{params.length > 1 ? 's' : ''}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {params.map(({ key, value }) => (
                        <div key={key} className="p-3 bg-gray-50 rounded-lg border">
                          <div className="text-sm font-medium text-gray-700 mb-1">
                            {getParameterDisplayName(key)}
                          </div>
                          <div className="text-base font-semibold text-blue-600">
                            {formatParameterValue(key, value)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}