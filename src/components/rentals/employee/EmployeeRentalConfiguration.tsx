import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { DatePicker } from '@/components/ui/date-picker';
import { useToast } from '@/components/ui/use-toast';
import { 
  Settings,
  Calendar,
  AlertTriangle,
  Save,
  Edit,
  X,
  Infinity,
  Package,
  Shield,
  Clock
} from 'lucide-react';
import { addDays, addWeeks, addMonths } from 'date-fns';

interface EmployeeRentalConfigurationProps {
  rental: any;
  onUpdate?: (data: any) => void;
}

export default function EmployeeRentalConfiguration({ 
  rental, 
  onUpdate 
}: EmployeeRentalConfigurationProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  
  const [globalConfig, setGlobalConfig] = useState({
    globalStartDate: rental.startDate ? new Date(rental.startDate) : new Date(),
    globalEndDate: rental.endDate ? new Date(rental.endDate) : null,
    isGlobalOpenEnded: rental.configuration?.isGlobalOpenEnded || false,
    urgentRental: rental.configuration?.urgentRental || false,
    cnamEligible: rental.configuration?.cnamEligible || false,
    notes: rental.notes || '',
  });

  // Mutation for updating rental configuration (employee restrictions)
  const updateConfigMutation = useMutation({
    mutationFn: async (configData: any) => {
      const response = await fetch(`/api/rentals/${rental.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startDate: configData.globalStartDate,
          endDate: configData.globalEndDate,
          notes: configData.notes,
          configuration: {
            isGlobalOpenEnded: configData.isGlobalOpenEnded,
            urgentRental: configData.urgentRental,
            cnamEligible: configData.cnamEligible,
          },
          role: 'employee' // Employee restriction marker
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update configuration');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rental', rental.id] });
      toast({
        title: "Configuration mise à jour",
        description: "La configuration a été sauvegardée.",
      });
      setIsEditing(false);
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder la configuration.",
        variant: "destructive",
      });
    },
  });

  // Duration presets (employee version - simplified)
  const durationPresets = [
    { label: '1 semaine', value: 7, type: 'days' },
    { label: '2 semaines', value: 14, type: 'days' },
    { label: '1 mois', value: 1, type: 'months' },
    { label: '2 mois', value: 2, type: 'months' },
    { label: '3 mois', value: 3, type: 'months' },
  ];

  const applyDurationPreset = (preset: any) => {
    const startDate = globalConfig.globalStartDate;
    let endDate: Date;
    
    if (preset.type === 'days') {
      endDate = addDays(startDate, preset.value);
    } else {
      endDate = addMonths(startDate, preset.value);
    }
    
    setGlobalConfig(prev => ({ ...prev, globalEndDate: endDate, isGlobalOpenEnded: false }));
  };

  const handleSave = () => {
    updateConfigMutation.mutate(globalConfig);
  };

  const handleCancel = () => {
    // Reset to original values
    setGlobalConfig({
      globalStartDate: rental.startDate ? new Date(rental.startDate) : new Date(),
      globalEndDate: rental.endDate ? new Date(rental.endDate) : null,
      isGlobalOpenEnded: rental.configuration?.isGlobalOpenEnded || false,
      urgentRental: rental.configuration?.urgentRental || false,
      cnamEligible: rental.configuration?.cnamEligible || false,
      notes: rental.notes || '',
    });
    setIsEditing(false);
  };

  const calculateDuration = () => {
    if (!globalConfig.globalStartDate) return null;
    if (globalConfig.isGlobalOpenEnded) return "Durée indéterminée";
    if (!globalConfig.globalEndDate) return "Date de fin non définie";
    
    const diffTime = globalConfig.globalEndDate.getTime() - globalConfig.globalStartDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    
    if (diffDays === 1) return "1 jour";
    if (diffDays < 30) return `${diffDays} jours`;
    
    const months = Math.floor(diffDays / 30);
    const remainingDays = diffDays % 30;
    
    if (remainingDays === 0) {
      return `${months} mois`;
    } else {
      return `${months} mois et ${remainingDays} jour${remainingDays > 1 ? 's' : ''}`;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
          <Settings className="h-5 w-5 text-blue-600" />
          Configuration de la Location
        </h2>
        
        {!isEditing ? (
          <Button
            variant="outline"
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-1"
          >
            <Edit className="h-4 w-4" />
            Modifier
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button
              onClick={handleSave}
              disabled={updateConfigMutation.isPending}
              className="flex items-center gap-1"
            >
              <Save className="h-4 w-4" />
              Sauvegarder
            </Button>
            <Button
              variant="outline"
              onClick={handleCancel}
              className="flex items-center gap-1"
            >
              <X className="h-4 w-4" />
              Annuler
            </Button>
          </div>
        )}
      </div>

      {/* Configuration Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-600" />
            État de la Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Status Indicators */}
          <div className="flex gap-2 flex-wrap">
            {globalConfig.urgentRental && (
              <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-200">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Location Urgente
              </Badge>
            )}
            {globalConfig.isGlobalOpenEnded && (
              <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200">
                <Infinity className="h-3 w-3 mr-1" />
                Durée Indéterminée
              </Badge>
            )}
            {globalConfig.cnamEligible && (
              <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
                <Shield className="h-3 w-3 mr-1" />
                CNAM Éligible
              </Badge>
            )}
          </div>

          {/* Duration Summary */}
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-blue-600" />
              <span className="font-medium text-blue-800">Durée de Location</span>
            </div>
            <div className="text-lg font-semibold text-blue-900">
              {calculateDuration()}
            </div>
            {!globalConfig.isGlobalOpenEnded && globalConfig.globalStartDate && globalConfig.globalEndDate && (
              <div className="text-sm text-blue-700 mt-1">
                Du {globalConfig.globalStartDate.toLocaleDateString('fr-FR')} 
                au {globalConfig.globalEndDate.toLocaleDateString('fr-FR')}
              </div>
            )}
          </div>

          {isEditing ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Date Configuration */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="startDate">Date de Début</Label>
                  <DatePicker
                    value={globalConfig.globalStartDate}
                    onChange={(date) => setGlobalConfig(prev => ({ 
                      ...prev, 
                      globalStartDate: date || new Date() 
                    }))}
                  />
                </div>

                <div>
                  <Label htmlFor="endDate">Date de Fin</Label>
                  <DatePicker
                    value={globalConfig.globalEndDate || undefined}
                    onChange={globalConfig.isGlobalOpenEnded ? undefined : (date) => setGlobalConfig(prev => ({ 
                      ...prev, 
                      globalEndDate: date || null,
                      isGlobalOpenEnded: !date
                    }))}
                    className={globalConfig.isGlobalOpenEnded ? "opacity-50 pointer-events-none" : ""}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="openEnded"
                    checked={globalConfig.isGlobalOpenEnded}
                    onCheckedChange={(checked) => setGlobalConfig(prev => ({ 
                      ...prev, 
                      isGlobalOpenEnded: checked,
                      globalEndDate: checked ? null : prev.globalEndDate
                    }))}
                  />
                  <Label htmlFor="openEnded">Location à durée indéterminée</Label>
                </div>
              </div>

              {/* Settings (Employee-restricted version) */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="urgent"
                    checked={globalConfig.urgentRental}
                    onCheckedChange={(checked) => setGlobalConfig(prev => ({ 
                      ...prev, 
                      urgentRental: checked 
                    }))}
                  />
                  <Label htmlFor="urgent">Location urgente</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="cnamEligible"
                    checked={globalConfig.cnamEligible}
                    onCheckedChange={(checked) => setGlobalConfig(prev => ({ 
                      ...prev, 
                      cnamEligible: checked 
                    }))}
                  />
                  <Label htmlFor="cnamEligible">Éligible CNAM</Label>
                </div>

                {/* Note: Financial fields (deposit amount, deposit method) are not included for employees */}
                <div className="bg-gray-50 p-3 rounded-lg border">
                  <div className="text-sm text-gray-600 flex items-center gap-1">
                    <Shield className="h-3 w-3" />
                    Les informations financières sont gérées par l'administration
                  </div>
                </div>
              </div>

              {/* Duration Presets */}
              <div className="md:col-span-2">
                <Label>Durées Prédéfinies</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 mt-2">
                  {durationPresets.map((preset) => (
                    <Button
                      key={preset.label}
                      variant="outline"
                      size="sm"
                      onClick={() => applyDurationPreset(preset)}
                      disabled={globalConfig.isGlobalOpenEnded}
                    >
                      {preset.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div className="md:col-span-2">
                <Label htmlFor="notes">Notes de Configuration</Label>
                <Textarea
                  id="notes"
                  value={globalConfig.notes}
                  onChange={(e) => setGlobalConfig(prev => ({ 
                    ...prev, 
                    notes: e.target.value 
                  }))}
                  rows={3}
                  placeholder="Notes sur la configuration de la location..."
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className="text-sm text-gray-600">Période de Location</div>
                <div className="font-medium">
                  Du {globalConfig.globalStartDate.toLocaleDateString('fr-FR')}
                  {globalConfig.isGlobalOpenEnded ? ' (durée indéterminée)' : 
                   globalConfig.globalEndDate ? ` au ${globalConfig.globalEndDate.toLocaleDateString('fr-FR')}` : ''}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Statut</div>
                <div className="font-medium">
                  {globalConfig.urgentRental ? 'Location urgente' : 'Location standard'}
                  {globalConfig.cnamEligible && (
                    <Badge variant="outline" className="ml-2 bg-green-100 text-green-800 border-green-200">
                      CNAM
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Notes Display */}
          {globalConfig.notes && !isEditing && (
            <div>
              <div className="text-sm text-gray-600 mb-2">Notes</div>
              <div className="p-3 bg-gray-50 rounded-lg border">
                {globalConfig.notes}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Product Information (Read-only for employees) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-blue-600" />
            Équipements de la Location
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {/* Main Device */}
            {rental.medicalDevice && (
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Package className="h-4 w-4 text-blue-600" />
                  <div>
                    <div className="font-medium">{rental.medicalDevice.name}</div>
                    <div className="text-sm text-gray-600">
                      {rental.medicalDevice.serialNumber && `SN: ${rental.medicalDevice.serialNumber}`}
                      {rental.medicalDevice.brand && ` • ${rental.medicalDevice.brand}`}
                    </div>
                  </div>
                </div>
                <Badge variant="secondary">Appareil Principal</Badge>
              </div>
            )}
            
            {/* Accessories */}
            {rental.accessories?.map((accessory: any, index: number) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Package className="h-4 w-4 text-gray-500" />
                  <div>
                    <div className="font-medium">{accessory.product.name}</div>
                    <div className="text-sm text-gray-600">
                      Quantité: {accessory.quantity}
                    </div>
                  </div>
                </div>
                <Badge variant="outline">Accessoire</Badge>
              </div>
            ))}
          </div>

          {/* Employee Note */}
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="text-sm text-blue-700 flex items-center gap-1">
              <Shield className="h-3 w-3" />
              Les modifications d'équipements et de tarifs sont réservées à l'administration
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}