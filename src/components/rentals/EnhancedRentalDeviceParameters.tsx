import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/use-toast';
import { 
  Settings, 
  Activity, 
  Wind, 
  Gauge,
  Edit,
  Save,
  X,
  Plus,
  Loader2,
  Package
} from 'lucide-react';

interface RentalDeviceParametersProps {
  rental: any;
  onUpdate?: (data: any) => void;
}

interface DeviceParameter {
  id?: string;
  patientId?: string;
  deviceId: string;
  deviceType: string;
  // CPAP Parameters - strings as per schema
  pression?: string;
  pressionRampe?: string;
  dureeRampe?: number;
  epr?: string;
  autoPression?: boolean;
  autoRampe?: boolean;
  // VNI Parameters - strings as per schema
  ipap?: string;
  epap?: string;
  aid?: string;
  frequenceRespiratoire?: string;
  volumeCourant?: string;
  mode?: string;
  // Concentrateur & Bouteille - string as per schema
  debit?: string;
  // Common
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export default function EnhancedRentalDeviceParameters({ 
  rental, 
  onUpdate 
}: RentalDeviceParametersProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [editingParams, setEditingParams] = useState<DeviceParameter | null>(null);

  // Extract IDs from rental object (support both direct IDs and object relationships)
  const medicalDeviceId = rental.medicalDeviceId || rental.medicalDevice?.id;
  const patientId = rental.patientId || rental.patient?.id;

  // Fetch actual device parameters from database
  const { data: deviceParameters, isLoading } = useQuery({
    queryKey: ['device-parameters', medicalDeviceId, patientId],
    queryFn: async () => {
      if (!medicalDeviceId || !patientId) return null;
      
      const response = await fetch(`/api/device-parameters?deviceId=${medicalDeviceId}&patientId=${patientId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch device parameters');
      }
      
      const data = await response.json();
      return data.parameters || null;
    },
    enabled: !!(medicalDeviceId && patientId),
  });

  // Create or update device parameters
  const updateParametersMutation = useMutation({
    mutationFn: async (params: Partial<DeviceParameter>) => {
      const method = params.id ? 'PATCH' : 'POST';
      const url = params.id ? `/api/device-parameters/${params.id}` : '/api/device-parameters';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...params,
          medicalDeviceId,
          patientId,
          deviceType: detectedDeviceType,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save device parameters');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['device-parameters', medicalDeviceId, patientId] });
      toast({
        title: "Paramètres sauvegardés",
        description: "Les paramètres de l'appareil ont été mis à jour.",
      });
      setIsEditing(false);
      setEditingParams(null);
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder les paramètres.",
        variant: "destructive",
      });
    },
  });

  // Initialize editing state
  useEffect(() => {
    if (deviceParameters && isEditing) {
      setEditingParams({ ...deviceParameters });
    }
  }, [deviceParameters, isEditing]);

  const handleStartEdit = () => {
    setIsEditing(true);
    setEditingParams(deviceParameters || {
      patientId,
      deviceId: medicalDeviceId,
      deviceType: detectedDeviceType || 'UNKNOWN',
    });
  };

  const handleSave = () => {
    if (editingParams) {
      updateParametersMutation.mutate(editingParams);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditingParams(null);
  };

  const updateParam = (key: string, value: any) => {
    if (editingParams) {
      setEditingParams({ ...editingParams, [key]: value });
    }
  };

  // Helper function to detect device type from name/model if type is generic
  const detectDeviceType = (deviceType: string, deviceName?: string, deviceModel?: string) => {
    // If we have a specific type already, use it
    if (deviceType && deviceType !== 'MEDICAL_DEVICE' && deviceType !== 'UNKNOWN') {
      return deviceType;
    }
    
    // Try to detect from device name or model
    const searchText = `${deviceName || ''} ${deviceModel || ''}`.toLowerCase();
    
    // Check for VNI/Vi (Ventilation Non Invasive)
    if (searchText.includes('vni') || 
        searchText.includes('ventilation') || 
        searchText === 'vi' ||
        searchText.startsWith('vi ') ||
        searchText.includes(' vi ') ||
        searchText.endsWith(' vi')) {
      return 'VNI';
    }
    
    // Check for CPAP
    if (searchText.includes('cpap') || 
        searchText.includes('pression positive') ||
        searchText.includes('airsense') ||
        searchText.includes('resmed')) {
      return 'CPAP';  
    }
    
    // Check for Oxygen concentrator
    if (searchText.includes('concentrateur') || 
        searchText.includes('oxygène') || 
        searchText.includes('oxygen') ||
        searchText.includes('o2') ||
        searchText.includes('o²')) {
      return 'CONCENTRATEUR_OXYGENE';
    }
    
    // Check for Oxygen bottle
    if (searchText.includes('bouteille') || 
        searchText.includes('bouteil')) {
      return 'BOUTEILLE_OXYGENE';
    }
    
    return deviceType; // Fallback to original
  };

  // Parameter field configurations by device type
  const getParameterFields = (deviceType: string) => {
    switch (deviceType) {
      case 'CPAP':
        return [
          { key: 'pression', label: 'Pression (cmH2O)', type: 'text', category: 'Thérapie' },
          { key: 'pressionRampe', label: 'Pression Rampe (cmH2O)', type: 'text', category: 'Thérapie' },
          { key: 'dureeRampe', label: 'Durée Rampe (min)', type: 'number', category: 'Confort', min: 0, max: 45 },
          { key: 'epr', label: 'EPR', type: 'text', category: 'Confort' },
          { key: 'autoPression', label: 'Auto Pression', type: 'boolean', category: 'Automatique' },
          { key: 'autoRampe', label: 'Auto Rampe', type: 'boolean', category: 'Automatique' },
        ];
      
      case 'VNI':
        return [
          { key: 'pressionRampe', label: 'Pression Rampe', type: 'text', category: 'Thérapie' },
          { key: 'dureeRampe', label: 'Durée Rampe (0-45 min)', type: 'number', category: 'Confort', min: 0, max: 45 },
          { key: 'ipap', label: 'IPAP', type: 'text', category: 'Thérapie' },
          { key: 'epap', label: 'EPAP', type: 'text', category: 'Thérapie' },
          { key: 'aid', label: 'AID', type: 'text', category: 'Thérapie' },
          { key: 'frequenceRespiratoire', label: 'Fréquence Respiratoire', type: 'text', category: 'Ventilation' },
          { key: 'volumeCourant', label: 'Volume Courant', type: 'text', category: 'Ventilation' },
          { key: 'mode', label: 'Mode', type: 'select', options: ['S', 'ST', 'T', 'Auto', 'VGPS', 'VS aide'], category: 'Configuration' },
        ];
      
      case 'CONCENTRATEUR_OXYGENE':
      case 'BOUTEILLE_OXYGENE':
        return [
          { key: 'debit', label: 'Débit (L/min)', type: 'text', category: 'Oxygénothérapie' },
        ];
      
      default:
        return [];
    }
  };

  const originalDeviceType = rental.medicalDevice?.type || '';
  const detectedDeviceType = detectDeviceType(
    originalDeviceType,
    rental.medicalDevice?.name,
    rental.medicalDevice?.model
  );
  const parameterFields = getParameterFields(detectedDeviceType);
  
  // Debug logging (can be removed in production)
  console.log('Rental device debug:', {
    originalDeviceType,
    detectedDeviceType,
    deviceName: rental.medicalDevice?.name,
    deviceModel: rental.medicalDevice?.model,
    medicalDeviceId,
    patientId,
    parameterFields: parameterFields.length,
    deviceParameters,
    isLoading
  });
  
  // Group fields by category
  const fieldsByCategory = parameterFields.reduce((acc, field) => {
    if (!acc[field.category]) {
      acc[field.category] = [];
    }
    acc[field.category].push(field);
    return acc;
  }, {} as Record<string, any[]>);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Thérapie': return Activity;
      case 'Ventilation': return Wind;
      case 'Oxygénothérapie': return Wind;
      case 'Configuration': return Settings;
      case 'Automatique': return Gauge;
      default: return Settings;
    }
  };

  const formatValue = (field: any, value: any) => {
    if (field.type === 'boolean') {
      return value ? 'Activé' : 'Désactivé';
    }
    return value?.toString() || '-';
  };

  const renderParameterField = (field: any) => {
    const value = editingParams?.[field.key as keyof DeviceParameter];
    
    switch (field.type) {
      case 'number':
        return (
          <Input
            type="number"
            value={typeof value === 'boolean' ? value.toString() : (value || '')}
            onChange={(e) => updateParam(field.key, parseInt(e.target.value) || null)}
            placeholder={field.label}
            min={field.min}
            max={field.max}
          />
        );
      
      case 'boolean':
        return (
          <Switch
            checked={Boolean(value)}
            onCheckedChange={(checked) => updateParam(field.key, checked)}
          />
        );
      
      case 'select':
        return (
          <Select value={value?.toString() || ''} onValueChange={(val) => updateParam(field.key, val)}>
            <SelectTrigger>
              <SelectValue placeholder="Sélectionner..." />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((option: string) => (
                <SelectItem key={option} value={option}>{option}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      
      case 'text':
      default:
        return (
          <Input
            type="text"
            value={value?.toString() || ''}
            onChange={(e) => updateParam(field.key, e.target.value || null)}
            placeholder={field.label}
          />
        );
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-blue-600" />
            Paramètres de l'Appareil
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center items-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            <span className="ml-2 text-gray-600">Chargement des paramètres...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Main Device Information */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-blue-600" />
            Paramètres - {rental.medicalDevice?.name}
          </CardTitle>
          <div className="flex gap-2">
            {!isEditing ? (
              <Button
                variant="outline"
                size="sm"
                onClick={handleStartEdit}
                className="flex items-center gap-1"
              >
                {deviceParameters ? <Edit className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                {deviceParameters ? 'Modifier' : 'Configurer'}
              </Button>
            ) : (
              <>
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={updateParametersMutation.isPending}
                  className="flex items-center gap-1"
                >
                  {updateParametersMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Sauvegarder
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancel}
                  className="flex items-center gap-1"
                >
                  <X className="h-4 w-4" />
                  Annuler
                </Button>
              </>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="text-sm text-gray-600">Type d'appareil</div>
            <div className="font-medium">{rental.medicalDevice?.type}</div>
            {rental.medicalDevice?.serialNumber && (
              <div className="text-sm text-gray-500">Série: {rental.medicalDevice.serialNumber}</div>
            )}
          </div>

          {!medicalDeviceId || !patientId ? (
            <div className="text-center py-8 text-red-500">
              <Settings className="h-12 w-12 mx-auto mb-4 text-red-300" />
              <p>Informations manquantes</p>
              <p className="text-sm mt-2">Appareil ID: {medicalDeviceId || 'Manquant'}</p>
              <p className="text-sm">Patient ID: {patientId || 'Manquant'}</p>
            </div>
          ) : parameterFields.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Settings className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>Aucun paramètre disponible pour ce type d'appareil</p>
              <p className="text-sm mt-2">Type original: {originalDeviceType}</p>
              <p className="text-sm">Type détecté: {detectedDeviceType || 'Non défini'}</p>
              <p className="text-sm">Nom: {rental.medicalDevice?.name}</p>
              <p className="text-sm">Types supportés: CPAP, VNI, CONCENTRATEUR_OXYGENE, BOUTEILLE_OXYGENE</p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(fieldsByCategory).map(([category, fields]) => {
                const IconComponent = getCategoryIcon(category);
                
                return (
                  <div key={category}>
                    <div className="flex items-center gap-2 mb-3">
                      <IconComponent className="h-4 w-4 text-blue-600" />
                      <h4 className="font-medium text-gray-800">{category}</h4>
                      <Badge variant="outline" className="text-xs">
                        {fields.length} paramètre{fields.length > 1 ? 's' : ''}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {fields.map((field) => (
                        <div key={field.key} className="space-y-2">
                          <Label htmlFor={field.key} className="text-sm font-medium">
                            {field.label}
                          </Label>
                          {isEditing ? (
                            renderParameterField(field)
                          ) : (
                            <div className="p-3 bg-gray-50 rounded-lg border min-h-[42px] flex items-center">
                              <span className="font-semibold text-blue-600">
                                {formatValue(field, deviceParameters?.[field.key])}
                              </span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
              
              {isEditing && (
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Input
                    id="notes"
                    value={editingParams?.notes || ''}
                    onChange={(e) => updateParam('notes', e.target.value)}
                    placeholder="Notes additionnelles..."
                  />
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Accessories Information */}
      {rental.accessories && rental.accessories.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-blue-600" />
              Accessoires Associés
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {rental.accessories.map((accessory: any, index: number) => (
                <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <div>
                    <div className="font-medium">{accessory.product?.name || `Accessoire ${accessory.productId}`}</div>
                    <div className="text-sm text-gray-600">
                      Quantité: {accessory.quantity} • Prix: {accessory.unitPrice} TND/jour
                    </div>
                  </div>
                  <Badge variant="secondary">Accessoire</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Parameter History (if exists) */}
      {deviceParameters?.updatedAt && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-600" />
              Historique
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-gray-600">
              Dernière mise à jour: {new Date(deviceParameters.updatedAt).toLocaleDateString('fr-FR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}