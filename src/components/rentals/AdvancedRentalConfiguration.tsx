import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
import { useToast } from '@/components/ui/use-toast';
import { 
  Settings,
  Calendar,
  Clock,
  AlertTriangle,
  Save,
  Edit,
  X,
  DollarSign,
  Zap,
  Infinity,
  Package,
  Plus,
  Trash2,
  Shield
} from 'lucide-react';
import { addDays, addWeeks, addMonths } from 'date-fns';

interface AdvancedRentalConfigurationProps {
  rental: any;
  onUpdate?: (data: any) => void;
}

interface ProductPeriod {
  id: string;
  productId: string;
  productName: string;
  startDate: Date;
  endDate?: Date;
  isOpenEnded: boolean;
  dailyRate: number;
  monthlyRate?: number;
  pricingMode: 'DAILY' | 'MONTHLY';
}

export default function AdvancedRentalConfiguration({ 
  rental, 
  onUpdate 
}: AdvancedRentalConfigurationProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  
  const [globalConfig, setGlobalConfig] = useState({
    globalStartDate: rental.startDate ? new Date(rental.startDate) : new Date(),
    globalEndDate: rental.endDate ? new Date(rental.endDate) : null,
    isGlobalOpenEnded: rental.configuration?.isGlobalOpenEnded || false,
    urgentRental: rental.configuration?.urgentRental || false,
    depositAmount: rental.configuration?.depositAmount || 0,
    depositMethod: rental.configuration?.depositMethod || 'CASH',
    cnamEligible: rental.configuration?.cnamEligible || false,
    notes: rental.notes || '',
  });

  const [productPeriods, setProductPeriods] = useState<ProductPeriod[]>(() => {
    // Initialize with current products
    const periods: ProductPeriod[] = [];
    
    // Main device
    if (rental.medicalDevice) {
      periods.push({
        id: `device-${rental.medicalDevice.id}`,
        productId: rental.medicalDevice.id,
        productName: rental.medicalDevice.name,
        startDate: rental.startDate ? new Date(rental.startDate) : new Date(),
        endDate: rental.endDate ? new Date(rental.endDate) : undefined,
        isOpenEnded: !rental.endDate,
        dailyRate: parseFloat(rental.medicalDevice.rentalPrice) || 0,
        monthlyRate: parseFloat(rental.medicalDevice.rentalPrice) * 30 || 0,
        pricingMode: 'DAILY',
      });
    }
    
    // Accessories
    rental.accessories?.forEach((accessory: any) => {
      periods.push({
        id: `accessory-${accessory.id}`,
        productId: accessory.product.id,
        productName: accessory.product.name,
        startDate: rental.startDate ? new Date(rental.startDate) : new Date(),
        endDate: rental.endDate ? new Date(rental.endDate) : undefined,
        isOpenEnded: !rental.endDate,
        dailyRate: parseFloat(accessory.unitPrice) || 0,
        monthlyRate: parseFloat(accessory.unitPrice) * 30 || 0,
        pricingMode: 'DAILY',
      });
    });
    
    return periods;
  });

  // Mutation for updating rental configuration
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
            depositAmount: configData.depositAmount,
            depositMethod: configData.depositMethod,
            cnamEligible: configData.cnamEligible,
          },
          productPeriods: configData.productPeriods,
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
        description: "La configuration avancée a été sauvegardée.",
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

  // Duration presets
  const durationPresets = [
    { label: '1 semaine', value: 7, type: 'days' },
    { label: '2 semaines', value: 14, type: 'days' },
    { label: '1 mois', value: 1, type: 'months' },
    { label: '2 mois', value: 2, type: 'months' },
    { label: '3 mois', value: 3, type: 'months' },
    { label: '6 mois', value: 6, type: 'months' },
    { label: '1 an', value: 12, type: 'months' },
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
    
    // Apply to all product periods
    setProductPeriods(prev => prev.map(period => ({
      ...period,
      endDate,
      isOpenEnded: false,
    })));
  };

  const handleSave = () => {
    updateConfigMutation.mutate({
      ...globalConfig,
      productPeriods,
    });
  };

  const handleCancel = () => {
    // Reset to original values
    setGlobalConfig({
      globalStartDate: rental.startDate ? new Date(rental.startDate) : new Date(),
      globalEndDate: rental.endDate ? new Date(rental.endDate) : null,
      isGlobalOpenEnded: rental.configuration?.isGlobalOpenEnded || false,
      urgentRental: rental.configuration?.urgentRental || false,
      depositAmount: rental.configuration?.depositAmount || 0,
      depositMethod: rental.configuration?.depositMethod || 'CASH',
      cnamEligible: rental.configuration?.cnamEligible || false,
      notes: rental.notes || '',
    });
    setIsEditing(false);
  };

  const updateProductPeriod = (periodId: string, updates: Partial<ProductPeriod>) => {
    setProductPeriods(prev => prev.map(period => 
      period.id === periodId ? { ...period, ...updates } : period
    ));
  };

  const calculateTotalCost = () => {
    // Use actual rental periods data if available, otherwise calculate from product periods
    if (rental.rentalPeriods && rental.rentalPeriods.length > 0) {
      return rental.rentalPeriods.reduce((total: number, period: any) => {
        return total + (parseFloat(period.amount) || 0);
      }, 0);
    }
    
    // Fallback to product configuration calculation
    return productPeriods.reduce((total, period) => {
      if (period.isOpenEnded) {
        // For open-ended, show daily rate
        return total + period.dailyRate;
      } else if (period.startDate && period.endDate) {
        const days = Math.ceil((period.endDate.getTime() - period.startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        
        if (period.pricingMode === 'MONTHLY' && period.monthlyRate) {
          const months = Math.ceil(days / 30);
          return total + (period.monthlyRate * months);
        } else {
          return total + (period.dailyRate * days);
        }
      }
      return total;
    }, 0);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
          <Settings className="h-5 w-5 text-blue-600" />
          Configuration Avancée de la Location
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

      {/* Global Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-600" />
            Configuration Globale
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

          {isEditing ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Date Configuration */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="startDate">Date de Début Globale</Label>
                  <DatePicker
                    value={globalConfig.globalStartDate}
                    onChange={(date) => setGlobalConfig(prev => ({ 
                      ...prev, 
                      globalStartDate: date || new Date() 
                    }))}
                  />
                </div>

                <div>
                  <Label htmlFor="endDate">Date de Fin Globale</Label>
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

              {/* Settings */}
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

                <div>
                  <Label htmlFor="depositAmount">Montant de la Caution (TND)</Label>
                  <Input
                    id="depositAmount"
                    type="number"
                    step="0.01"
                    value={globalConfig.depositAmount}
                    onChange={(e) => setGlobalConfig(prev => ({ 
                      ...prev, 
                      depositAmount: parseFloat(e.target.value) || 0 
                    }))}
                  />
                </div>

                <div>
                  <Label htmlFor="depositMethod">Méthode de Caution</Label>
                  <Select 
                    value={globalConfig.depositMethod} 
                    onValueChange={(value) => setGlobalConfig(prev => ({ 
                      ...prev, 
                      depositMethod: value 
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CASH">Espèces</SelectItem>
                      <SelectItem value="CHEQUE">Chèque</SelectItem>
                      <SelectItem value="BANK_TRANSFER">Virement</SelectItem>
                      <SelectItem value="MAD">MAD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Duration Presets */}
              <div className="md:col-span-2">
                <Label>Durées Prédéfinies</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2 mt-2">
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
                  placeholder="Notes additionnelles sur la configuration..."
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className="text-sm text-gray-600">Période Globale</div>
                <div className="font-medium">
                  Du {globalConfig.globalStartDate.toLocaleDateString('fr-FR')}
                  {globalConfig.isGlobalOpenEnded ? ' (durée indéterminée)' : 
                   globalConfig.globalEndDate ? ` au ${globalConfig.globalEndDate.toLocaleDateString('fr-FR')}` : ''}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Caution</div>
                <div className="font-medium">
                  {globalConfig.depositAmount > 0 ? 
                    `${globalConfig.depositAmount} TND (${globalConfig.depositMethod})` : 
                    'Aucune caution'
                  }
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Product-Specific Periods */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-blue-600" />
            Périodes par Produit
            <Badge variant="outline">{productPeriods.length} produit{productPeriods.length > 1 ? 's' : ''}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {productPeriods.map((period) => (
              <div key={period.id} className="border rounded-lg p-4 bg-gray-50">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3">
                    <Package className="h-5 w-5 text-blue-600" />
                    <div>
                      <div className="font-medium">{period.productName}</div>
                      <div className="text-sm text-gray-600">
                        {period.pricingMode === 'DAILY' ? 
                          `${(period.dailyRate || 0).toFixed(2)} TND/jour` : 
                          `${(period.monthlyRate || 0).toFixed(2)} TND/mois`
                        }
                      </div>
                      {!isEditing && (
                        <div className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                          <DollarSign className="h-3 w-3" />
                          Cliquez "Modifier" pour ajuster les prix
                        </div>
                      )}
                    </div>
                  </div>
                  <Badge variant={period.isOpenEnded ? "secondary" : "outline"}>
                    {period.isOpenEnded ? 'Ouvert' : 'Fermé'}
                  </Badge>
                </div>

                {isEditing && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <Label>Date de Début</Label>
                      <DatePicker
                        value={period.startDate}
                        onChange={(date) => updateProductPeriod(period.id, { 
                          startDate: date || new Date() 
                        })}
                      />
                    </div>
                    
                    <div>
                      <Label>Date de Fin</Label>
                      <DatePicker
                        value={period.endDate || undefined}
                        onChange={period.isOpenEnded ? undefined : (date) => updateProductPeriod(period.id, { 
                          endDate: date || undefined,
                          isOpenEnded: !date
                        })}
                        className={period.isOpenEnded ? "opacity-50 pointer-events-none" : ""}
                      />
                    </div>
                    
                    <div>
                      <Label>Mode de Tarification</Label>
                      <Select 
                        value={period.pricingMode} 
                        onValueChange={(value: 'DAILY' | 'MONTHLY') => 
                          updateProductPeriod(period.id, { pricingMode: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="DAILY">Journalier</SelectItem>
                          <SelectItem value="MONTHLY">Mensuel</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Price Input Fields */}
                    <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                      <Label className="flex items-center gap-2 text-blue-800">
                        <DollarSign className="h-4 w-4" />
                        {period.pricingMode === 'DAILY' ? 'Prix par Jour (TND)' : 'Prix Mensuel (TND)'}
                      </Label>
                      <div className="relative mt-2">
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={period.pricingMode === 'DAILY' ? period.dailyRate : period.monthlyRate || 0}
                          onChange={(e) => {
                            const value = parseFloat(e.target.value) || 0;
                            if (period.pricingMode === 'DAILY') {
                              updateProductPeriod(period.id, { 
                                dailyRate: value,
                                monthlyRate: value * 30
                              });
                            } else {
                              updateProductPeriod(period.id, { 
                                monthlyRate: value,
                                dailyRate: value / 30
                              });
                            }
                          }}
                          className="pr-12 border-blue-300 focus:border-blue-500 focus:ring-blue-500"
                        />
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 text-sm text-blue-600 font-medium">
                          TND
                        </div>
                      </div>
                      {period.pricingMode === 'DAILY' && (
                        <div className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                          <span>Équivalent mensuel: <strong>{(period.dailyRate * 30).toFixed(2)} TND/mois</strong></span>
                        </div>
                      )}
                      {period.pricingMode === 'MONTHLY' && (
                        <div className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                          <span>Équivalent journalier: <strong>{((period.monthlyRate || 0) / 30).toFixed(2)} TND/jour</strong></span>
                        </div>
                      )}
                      
                      {/* Quick Price Presets */}
                      <div className="mt-2">
                        <div className="text-xs text-blue-700 mb-1">Tarifs courants:</div>
                        <div className="flex gap-1 flex-wrap">
                          {period.pricingMode === 'DAILY' ? (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-6 px-2 text-xs border-blue-300 text-blue-700 hover:bg-blue-100"
                                onClick={() => updateProductPeriod(period.id, { dailyRate: 10, monthlyRate: 300 })}
                              >
                                10 TND/j
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-6 px-2 text-xs border-blue-300 text-blue-700 hover:bg-blue-100"
                                onClick={() => updateProductPeriod(period.id, { dailyRate: 15, monthlyRate: 450 })}
                              >
                                15 TND/j
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-6 px-2 text-xs border-blue-300 text-blue-700 hover:bg-blue-100"
                                onClick={() => updateProductPeriod(period.id, { dailyRate: 20, monthlyRate: 600 })}
                              >
                                20 TND/j
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-6 px-2 text-xs border-blue-300 text-blue-700 hover:bg-blue-100"
                                onClick={() => updateProductPeriod(period.id, { monthlyRate: 300, dailyRate: 10 })}
                              >
                                300 TND/m
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-6 px-2 text-xs border-blue-300 text-blue-700 hover:bg-blue-100"
                                onClick={() => updateProductPeriod(period.id, { monthlyRate: 450, dailyRate: 15 })}
                              >
                                450 TND/m
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-6 px-2 text-xs border-blue-300 text-blue-700 hover:bg-blue-100"
                                onClick={() => updateProductPeriod(period.id, { monthlyRate: 600, dailyRate: 20 })}
                              >
                                600 TND/m
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="lg:col-span-4 flex items-center space-x-2">
                      <Switch
                        checked={period.isOpenEnded}
                        onCheckedChange={(checked) => updateProductPeriod(period.id, { 
                          isOpenEnded: checked,
                          endDate: checked ? undefined : period.endDate
                        })}
                      />
                      <Label>Période ouverte pour ce produit</Label>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Cost Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-blue-600" />
            Résumé des Coûts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="text-sm text-gray-600">Coût Total Estimé</div>
              <div className="text-2xl font-bold text-blue-600">
                {(calculateTotalCost() || 0).toFixed(2)} TND
                {globalConfig.isGlobalOpenEnded && <span className="text-sm font-normal">/jour</span>}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Caution</div>
              <div className="text-xl font-semibold text-green-600">
                {(globalConfig.depositAmount || 0).toFixed(2)} TND
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Total Initial</div>
              <div className="text-xl font-semibold text-gray-800">
                {((calculateTotalCost() || 0) + (globalConfig.depositAmount || 0)).toFixed(2)} TND
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}