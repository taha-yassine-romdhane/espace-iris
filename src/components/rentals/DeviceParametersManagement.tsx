import React, { useState } from 'react';
import {
  Settings,
  Edit,
  Save,
  X,
  Plus,
  Trash2,
  Activity,
  Wind,
  Gauge,
  Timer,
  Zap,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';

interface DeviceParameter {
  id: string;
  name: string;
  value: string;
  unit: string;
  category: string;
  description?: string;
}

interface DeviceParametersManagementProps {
  rental: any;
  deviceParameters: Record<string, any>;
  onUpdate?: (parameters: Record<string, any>) => void;
}

const deviceTypeTemplates = {
  CPAP: {
    name: 'CPAP',
    icon: Wind,
    parameters: [
      { name: 'pression', label: 'Pression', unit: 'cmH2O', category: 'Thérapie', description: 'Pression de traitement CPAP' },
      { name: 'rampe', label: 'Rampe', unit: 'minutes', category: 'Confort', description: 'Temps de montée en pression' },
      { name: 'humidificateur', label: 'Humidificateur', unit: 'niveau', category: 'Confort', description: 'Niveau d\'humidification' },
      { name: 'masque', label: 'Type de Masque', unit: '', category: 'Interface', description: 'Type de masque utilisé' },
    ]
  },
  VNI: {
    name: 'VNI (Ventilation Non Invasive)',
    icon: Activity,
    parameters: [
      { name: 'ipap', label: 'IPAP', unit: 'cmH2O', category: 'Thérapie', description: 'Pression inspiratoire positive' },
      { name: 'epap', label: 'EPAP', unit: 'cmH2O', category: 'Thérapie', description: 'Pression expiratoire positive' },
      { name: 'frequence', label: 'Fréquence', unit: '/min', category: 'Thérapie', description: 'Fréquence respiratoire de sauvegarde' },
      { name: 'trigger', label: 'Trigger', unit: 'L/min', category: 'Sensibilité', description: 'Seuil de déclenchement' },
      { name: 'cycle', label: 'Cycle', unit: '%', category: 'Sensibilité', description: 'Seuil de cyclage' },
      { name: 'temps_inspiratoire', label: 'Temps Inspiratoire', unit: 'secondes', category: 'Temporisation', description: 'Durée de l\'inspiration' },
    ]
  },
  CONCENTRATEUR_OXYGENE: {
    name: 'Concentrateur d\'Oxygène',
    icon: Gauge,
    parameters: [
      { name: 'debit', label: 'Débit O2', unit: 'L/min', category: 'Oxygénothérapie', description: 'Débit d\'oxygène administré' },
      { name: 'concentration', label: 'Concentration O2', unit: '%', category: 'Oxygénothérapie', description: 'Concentration d\'oxygène délivrée' },
      { name: 'interface', label: 'Interface', unit: '', category: 'Administration', description: 'Type d\'interface (lunettes, masque...)' },
      { name: 'pression_sortie', label: 'Pression de Sortie', unit: 'PSI', category: 'Technique', description: 'Pression de sortie de l\'appareil' },
    ]
  },
  BOUTEILLE_OXYGENE: {
    name: 'Bouteille d\'Oxygène',
    icon: Zap,
    parameters: [
      { name: 'debit', label: 'Débit O2', unit: 'L/min', category: 'Oxygénothérapie', description: 'Débit d\'oxygène administré' },
      { name: 'pression_bouteille', label: 'Pression Bouteille', unit: 'Bar', category: 'Réservoir', description: 'Pression dans la bouteille' },
      { name: 'autonomie', label: 'Autonomie', unit: 'heures', category: 'Réservoir', description: 'Autonomie estimée' },
      { name: 'interface', label: 'Interface', unit: '', category: 'Administration', description: 'Type d\'interface (lunettes, masque...)' },
    ]
  },
};

export default function DeviceParametersManagement({ rental, deviceParameters, onUpdate }: DeviceParametersManagementProps) {
  const [parameters, setParameters] = useState<Record<string, any>>(deviceParameters || {});
  const [isEditing, setIsEditing] = useState(false);
  const [editingParameters, setEditingParameters] = useState<Record<string, any>>({});
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newParameter, setNewParameter] = useState({
    name: '',
    value: '',
    unit: '',
    category: 'Thérapie',
    description: '',
  });

  const deviceType = rental.medicalDevice?.type || 'AUTRE';
  const template = deviceTypeTemplates[deviceType as keyof typeof deviceTypeTemplates];

  const handleStartEdit = () => {
    setEditingParameters({ ...parameters });
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    setParameters(editingParameters);
    onUpdate?.(editingParameters);
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditingParameters({});
    setIsEditing(false);
  };

  const handleParameterChange = (paramName: string, value: string) => {
    setEditingParameters({
      ...editingParameters,
      [paramName]: value,
    });
  };

  const handleAddCustomParameter = () => {
    if (!newParameter.name || !newParameter.value) return;

    const updatedParameters = {
      ...parameters,
      [newParameter.name]: newParameter.value,
    };

    setParameters(updatedParameters);
    onUpdate?.(updatedParameters);
    setShowAddDialog(false);
    setNewParameter({
      name: '',
      value: '',
      unit: '',
      category: 'Thérapie',
      description: '',
    });
  };

  const handleDeleteParameter = (paramName: string) => {
    const { [paramName]: removed, ...rest } = parameters;
    setParameters(rest);
    onUpdate?.(rest);
  };

  const getParameterIcon = (category: string) => {
    switch (category) {
      case 'Thérapie':
        return Activity;
      case 'Confort':
        return Settings;
      case 'Temporisation':
        return Timer;
      case 'Oxygénothérapie':
        return Wind;
      case 'Technique':
        return Gauge;
      default:
        return Settings;
    }
  };

  const getParametersByCategory = () => {
    if (!template) return {};

    const categorized: Record<string, any[]> = {};

    template.parameters.forEach(param => {
      if (!categorized[param.category]) {
        categorized[param.category] = [];
      }
      categorized[param.category].push({
        ...param,
        value: parameters[param.name] || '',
      });
    });

    // Add custom parameters
    Object.entries(parameters).forEach(([key, value]) => {
      const isTemplateParam = template.parameters.some(p => p.name === key);
      if (!isTemplateParam) {
        if (!categorized['Personnalisé']) {
          categorized['Personnalisé'] = [];
        }
        categorized['Personnalisé'].push({
          name: key,
          label: key,
          value: value,
          unit: '',
          category: 'Personnalisé',
          isCustom: true,
        });
      }
    });

    return categorized;
  };

  const categorizedParams = getParametersByCategory();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
            {template ? <template.icon className="h-5 w-5 text-blue-600" /> : <Settings className="h-5 w-5 text-blue-600" />}
            Paramètres de l'Appareil
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            {template ? template.name : deviceType} - {rental.medicalDevice?.name}
          </p>
        </div>

        <div className="flex gap-2">
          {!isEditing ? (
            <>
              <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Paramètre
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Ajouter un paramètre personnalisé</DialogTitle>
                  </DialogHeader>
                  
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="paramName">Nom du paramètre</Label>
                      <Input
                        id="paramName"
                        value={newParameter.name}
                        onChange={(e) => setNewParameter({ ...newParameter, name: e.target.value })}
                        placeholder="Ex: pression_maximale"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="paramValue">Valeur</Label>
                      <Input
                        id="paramValue"
                        value={newParameter.value}
                        onChange={(e) => setNewParameter({ ...newParameter, value: e.target.value })}
                        placeholder="Ex: 15"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="paramUnit">Unité</Label>
                      <Input
                        id="paramUnit"
                        value={newParameter.unit}
                        onChange={(e) => setNewParameter({ ...newParameter, unit: e.target.value })}
                        placeholder="Ex: cmH2O, L/min, %"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="paramCategory">Catégorie</Label>
                      <Select value={newParameter.category} onValueChange={(value) => setNewParameter({ ...newParameter, category: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Thérapie">Thérapie</SelectItem>
                          <SelectItem value="Confort">Confort</SelectItem>
                          <SelectItem value="Temporisation">Temporisation</SelectItem>
                          <SelectItem value="Oxygénothérapie">Oxygénothérapie</SelectItem>
                          <SelectItem value="Technique">Technique</SelectItem>
                          <SelectItem value="Personnalisé">Personnalisé</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label htmlFor="paramDescription">Description</Label>
                      <Textarea
                        id="paramDescription"
                        value={newParameter.description}
                        onChange={(e) => setNewParameter({ ...newParameter, description: e.target.value })}
                        placeholder="Description du paramètre..."
                        rows={2}
                      />
                    </div>
                    
                    <div className="flex gap-2">
                      <Button onClick={handleAddCustomParameter} className="flex items-center gap-1">
                        <Save className="h-3.5 w-3.5" />
                        Ajouter
                      </Button>
                      <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                        Annuler
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              <Button onClick={handleStartEdit} className="flex items-center gap-2">
                <Edit className="h-4 w-4" />
                Modifier
              </Button>
            </>
          ) : (
            <>
              <Button onClick={handleSaveEdit} className="flex items-center gap-2">
                <Save className="h-4 w-4" />
                Sauvegarder
              </Button>
              <Button variant="outline" onClick={handleCancelEdit} className="flex items-center gap-2">
                <X className="h-4 w-4" />
                Annuler
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Parameters by Category */}
      {Object.keys(categorizedParams).length > 0 ? (
        <div className="space-y-6">
          {Object.entries(categorizedParams).map(([category, params]) => {
            const IconComponent = getParameterIcon(category);
            
            return (
              <Card key={category}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <IconComponent className="h-4 w-4 text-blue-600" />
                    {category}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {params.map((param: any) => (
                      <div key={param.name} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label htmlFor={param.name} className="text-sm font-medium">
                            {param.label || param.name}
                          </Label>
                          {param.isCustom && !isEditing && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteParameter(param.name)}
                              className="h-6 w-6 p-0 border-red-200 text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                        
                        {isEditing ? (
                          <div className="flex gap-2">
                            <Input
                              id={param.name}
                              value={editingParameters[param.name] || ''}
                              onChange={(e) => handleParameterChange(param.name, e.target.value)}
                              placeholder={`Valeur...`}
                              className="flex-1"
                            />
                            {param.unit && (
                              <Badge variant="outline" className="px-2 py-1 text-xs">
                                {param.unit}
                              </Badge>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <div className="flex-1 p-2 bg-gray-50 rounded border min-h-[36px] flex items-center">
                              <span className="text-sm">
                                {param.value || <span className="text-gray-400 italic">Non défini</span>}
                              </span>
                            </div>
                            {param.unit && (
                              <Badge variant="outline" className="px-2 py-1 text-xs">
                                {param.unit}
                              </Badge>
                            )}
                          </div>
                        )}
                        
                        {param.description && (
                          <p className="text-xs text-gray-600">{param.description}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="text-center py-8">
            <Settings className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun paramètre défini</h3>
            <p className="text-gray-600 mb-4">
              {template 
                ? "Les paramètres de cet appareil n'ont pas encore été configurés."
                : "Type d'appareil non reconnu. Vous pouvez ajouter des paramètres personnalisés."
              }
            </p>
            <Button onClick={() => setShowAddDialog(true)} className="flex items-center gap-2 mx-auto">
              <Plus className="h-4 w-4" />
              Ajouter un Paramètre
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Device Info */}
      {rental.medicalDevice && (
        <Alert>
          <Settings className="h-4 w-4" />
          <AlertDescription>
            <div className="flex justify-between items-center">
              <div>
                <strong>{rental.medicalDevice.name}</strong> ({rental.medicalDevice.type})
                {rental.medicalDevice.serialNumber && (
                  <span className="ml-2 text-sm text-gray-600">
                    Série: {rental.medicalDevice.serialNumber}
                  </span>
                )}
              </div>
              {template && (
                <Badge variant="outline" className="bg-blue-50 text-blue-700">
                  Template disponible
                </Badge>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}