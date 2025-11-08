import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, Package, Hash, X, Check, Stethoscope, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface MedicalDevice {
  id: string;
  name: string;
  deviceCode?: string;
  serialNumber?: string;
  type?: string;
  brand?: string;
  model?: string;
  status?: string;
}

interface MedicalDeviceSelectorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  devices: MedicalDevice[];
  selectedDeviceId?: string;
  onSelectDevice: (deviceId: string) => void;
  title?: string;
}

export function MedicalDeviceSelectorDialog({
  open,
  onOpenChange,
  devices,
  selectedDeviceId,
  onSelectDevice,
  title = 'Sélectionner un appareil'
}: MedicalDeviceSelectorDialogProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // Get type label and styling
  const getTypeInfo = (type: string) => {
    switch (type) {
      case 'MEDICAL_DEVICE':
        return {
          label: 'Appareil Médical',
          color: 'bg-blue-100 text-blue-700 border-blue-300',
          icon: Stethoscope
        };
      case 'DIAGNOSTIC_DEVICE':
        return {
          label: 'Équipement Diagnostic',
          color: 'bg-purple-100 text-purple-700 border-purple-300',
          icon: Activity
        };
      default:
        return {
          label: type || 'Non spécifié',
          color: 'bg-gray-100 text-gray-700 border-gray-300',
          icon: Package
        };
    }
  };

  // Filter devices based on search term and type filter
  const filteredDevices = useMemo(() => {
    // First filter: only medical and diagnostic devices (exclude accessories and spare parts)
    let filtered = devices.filter(device =>
      device.type === 'MEDICAL_DEVICE' || device.type === 'DIAGNOSTIC_DEVICE'
    );

    // Type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(device => device.type === typeFilter);
    }

    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(device => {
        const name = device.name?.toLowerCase() || '';
        const code = device.deviceCode?.toLowerCase() || '';
        const serialNumber = device.serialNumber?.toLowerCase() || '';
        const brand = device.brand?.toLowerCase() || '';
        const model = device.model?.toLowerCase() || '';

        return (
          name.includes(search) ||
          code.includes(search) ||
          serialNumber.includes(search) ||
          brand.includes(search) ||
          model.includes(search)
        );
      });
    }

    return filtered;
  }, [devices, searchTerm, typeFilter]);

  const handleSelect = (deviceId: string) => {
    onSelectDevice(deviceId);
    onOpenChange(false);
    setSearchTerm('');
  };

  const handleClear = () => {
    setSearchTerm('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] p-0">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-blue-600" />
            {title}
          </DialogTitle>
        </DialogHeader>

        {/* Search Bar and Filters */}
        <div className="px-6 py-4 border-b bg-gray-50 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Rechercher par nom, code, numéro de série..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-10"
              autoFocus
            />
            {searchTerm && (
              <button
                onClick={handleClear}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2">
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Type d'appareil" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les types</SelectItem>
                <SelectItem value="MEDICAL_DEVICE">
                  <div className="flex items-center gap-2">
                    <Stethoscope className="h-3.5 w-3.5 text-blue-600" />
                    <span>Appareils Médicaux</span>
                  </div>
                </SelectItem>
                <SelectItem value="DIAGNOSTIC_DEVICE">
                  <div className="flex items-center gap-2">
                    <Activity className="h-3.5 w-3.5 text-purple-600" />
                    <span>Équipements Diagnostic</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>

            {(typeFilter !== 'all' || searchTerm) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setTypeFilter('all');
                  setSearchTerm('');
                }}
                className="text-xs"
              >
                <X className="h-3 w-3 mr-1" />
                Réinitialiser
              </Button>
            )}
          </div>

          {/* Search Stats */}
          <div className="text-sm text-gray-600">
            {filteredDevices.length} appareil(s) trouvé(s)
          </div>
        </div>

        {/* Devices List */}
        <div className="h-[400px] overflow-y-auto px-6 py-4">
          {filteredDevices.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <Package className="h-12 w-12 mb-3 text-gray-300" />
              <p className="text-lg font-medium">Aucun appareil trouvé</p>
              <p className="text-sm mt-1">
                {searchTerm
                  ? 'Essayez un autre terme de recherche'
                  : 'Aucun appareil disponible'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredDevices.map((device) => {
                const isSelected = selectedDeviceId === device.id;
                const isHovered = hoveredId === device.id;

                return (
                  <div
                    key={device.id}
                    onClick={() => handleSelect(device.id)}
                    onMouseEnter={() => setHoveredId(device.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    className={cn(
                      'p-4 rounded-lg border-2 cursor-pointer transition-all duration-200',
                      isSelected
                        ? 'border-blue-500 bg-blue-50 shadow-md'
                        : isHovered
                        ? 'border-blue-300 bg-blue-50/50 shadow-sm'
                        : 'border-gray-200 hover:border-gray-300'
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        {/* Device Name and Code */}
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-gray-900 truncate">
                            {device.name}
                          </h3>
                          {device.deviceCode && (
                            <Badge
                              variant="outline"
                              className="text-xs font-mono shrink-0 bg-white"
                            >
                              {device.deviceCode}
                            </Badge>
                          )}
                        </div>

                        {/* Device Details */}
                        <div className="space-y-2">
                          {device.serialNumber && (
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Hash className="h-3.5 w-3.5 text-gray-400" />
                              <span>S/N: {device.serialNumber}</span>
                            </div>
                          )}

                          <div className="flex gap-2 flex-wrap items-center">
                            {device.type && (() => {
                              const typeInfo = getTypeInfo(device.type);
                              const TypeIcon = typeInfo.icon;
                              return (
                                <Badge variant="outline" className={`text-xs ${typeInfo.color} flex items-center gap-1`}>
                                  <TypeIcon className="h-3 w-3" />
                                  {typeInfo.label}
                                </Badge>
                              );
                            })()}
                            {device.brand && (
                              <Badge variant="outline" className="text-xs bg-gray-50 text-gray-700 border-gray-300">
                                {device.brand}
                              </Badge>
                            )}
                            {device.model && (
                              <Badge variant="outline" className="text-xs bg-gray-50 text-gray-600 border-gray-300">
                                {device.model}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Selection Indicator */}
                      {isSelected && (
                        <div className="ml-4 shrink-0">
                          <div className="h-6 w-6 rounded-full bg-blue-600 flex items-center justify-center">
                            <Check className="h-4 w-4 text-white" />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-gray-50 flex justify-between items-center">
          <div className="text-sm text-gray-600">
            {selectedDeviceId ? (
              <span className="font-medium text-blue-600">
                Appareil sélectionné
              </span>
            ) : (
              <span>Sélectionnez un appareil</span>
            )}
          </div>
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              setSearchTerm('');
            }}
          >
            Fermer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Compact Device Display Component for use in forms
interface DeviceDisplayProps {
  device?: MedicalDevice | null;
  onClick?: () => void;
  className?: string;
  placeholder?: string;
}

export function DeviceDisplay({
  device,
  onClick,
  className,
  placeholder = 'Sélectionner un appareil'
}: DeviceDisplayProps) {
  if (!device) {
    return (
      <button
        onClick={onClick}
        className={cn(
          'w-full px-2 py-1.5 text-left border border-gray-300 rounded-md',
          'hover:border-gray-400 transition-colors text-xs text-gray-500',
          'flex items-center min-h-[32px]',
          className
        )}
      >
        {placeholder}
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full px-2 py-1.5 text-left border border-blue-300 rounded-md',
        'hover:border-blue-400 transition-colors bg-blue-50',
        'flex items-center gap-2 min-h-[32px]',
        className
      )}
    >
      <Package className="h-3.5 w-3.5 text-blue-600 shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium text-gray-900 truncate leading-tight">
          {device.name}
        </div>
        {device.serialNumber && (
          <div className="text-[10px] text-gray-600 leading-tight mt-0.5">
            S/N: {device.serialNumber}
          </div>
        )}
      </div>
      {device.deviceCode && (
        <Badge variant="outline" className="text-[10px] font-mono shrink-0 py-0 px-1.5 h-4">
          {device.deviceCode}
        </Badge>
      )}
    </button>
  );
}
