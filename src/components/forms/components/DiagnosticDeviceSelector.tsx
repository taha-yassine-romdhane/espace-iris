import React, { useState, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Stethoscope, ChevronLeft, ChevronRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

interface DiagnosticDevice {
  id: string;
  deviceCode?: string;
  name: string;
  type: string;
  brand?: string;
  model?: string;
  serialNumber?: string;
  stockLocation?: {
    id: string;
    name: string;
  };
  stockLocationId?: string;
}

interface DiagnosticDeviceSelectorProps {
  value?: string;
  onChange: (deviceId: string) => void;
  placeholder?: string;
  className?: string;
}

export function DiagnosticDeviceSelector({
  value,
  onChange,
  placeholder = 'Sélectionner un appareil',
  className
}: DiagnosticDeviceSelectorProps) {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Determine if user is employee
  const isEmployee = (session?.user as any)?.role === 'EMPLOYEE';
  const employeeStockLocationId = (session?.user as any)?.stockLocation?.id;

  // Fetch diagnostic devices
  const { data: devicesData, isLoading } = useQuery({
    queryKey: ['diagnostic-devices', isEmployee ? 'assigned' : 'all'],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (isEmployee) {
        params.append('assignedToMe', 'true');
      }
      const response = await fetch(`/api/diagnostic-devices?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch devices');
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    }
  });

  const devices: DiagnosticDevice[] = devicesData || [];
  const selectedDevice = value ? devices.find(d => d.id === value) : null;

  // Filter devices by search term
  const filteredDevices = useMemo(() => {
    if (!searchTerm) return devices;
    const searchLower = searchTerm.toLowerCase();
    return devices.filter(device =>
      device.name?.toLowerCase().includes(searchLower) ||
      device.deviceCode?.toLowerCase().includes(searchLower) ||
      device.brand?.toLowerCase().includes(searchLower) ||
      device.model?.toLowerCase().includes(searchLower) ||
      device.serialNumber?.toLowerCase().includes(searchLower)
    );
  }, [devices, searchTerm]);

  // Pagination
  const totalPages = Math.ceil(filteredDevices.length / itemsPerPage);
  const paginatedDevices = filteredDevices.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleSelect = (device: DiagnosticDevice) => {
    onChange(device.id);
    setOpen(false);
    setSearchTerm('');
    setCurrentPage(1);
  };

  if (isLoading) {
    return (
      <div className={`w-full px-3 py-2 text-sm text-gray-500 border border-gray-300 rounded-md ${className}`}>
        Chargement...
      </div>
    );
  }

  return (
    <>
      {/* Display Button */}
      <Button
        type="button"
        variant="outline"
        onClick={() => setOpen(true)}
        className={`w-full justify-start text-left font-normal ${className}`}
      >
        <Stethoscope className="mr-2 h-4 w-4 text-gray-500" />
        <span className={selectedDevice ? 'text-gray-900' : 'text-gray-500'}>
          {selectedDevice ? selectedDevice.name : placeholder}
        </span>
      </Button>

      {/* Selection Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Stethoscope className="h-5 w-5 text-green-600" />
              Sélectionner un Appareil de Diagnostic
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Rechercher par nom, code, marque, modèle ou numéro de série..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-10"
              />
            </div>

            {/* Info message for employees */}
            {isEmployee && employeeStockLocationId && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800">
                Affichage des appareils de votre stock uniquement
              </div>
            )}

            {/* Results count */}
            <div className="text-sm text-gray-600">
              {filteredDevices.length} appareil(s) trouvé(s)
            </div>

            {/* Devices List */}
            <div className="border rounded-lg overflow-hidden">
              <div className="max-h-[400px] overflow-y-auto">
                {paginatedDevices.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Stethoscope className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                    <p>Aucun appareil trouvé</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {paginatedDevices.map((device) => (
                      <div
                        key={device.id}
                        onClick={() => handleSelect(device)}
                        className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                          value === device.id ? 'bg-green-50 border-l-4 border-green-500' : ''
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-semibold text-gray-900">{device.name}</h4>
                              {device.deviceCode && (
                                <Badge variant="outline" className="text-xs font-mono bg-blue-50 text-blue-700">
                                  {device.deviceCode}
                                </Badge>
                              )}
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                              {device.brand && (
                                <div>
                                  <span className="font-medium">Marque:</span> {device.brand}
                                </div>
                              )}
                              {device.model && (
                                <div>
                                  <span className="font-medium">Modèle:</span> {device.model}
                                </div>
                              )}
                              {device.serialNumber && (
                                <div>
                                  <span className="font-medium">N° Série:</span> {device.serialNumber}
                                </div>
                              )}
                              {device.stockLocation && (
                                <div>
                                  <span className="font-medium">Emplacement:</span> {device.stockLocation.name}
                                </div>
                              )}
                            </div>
                          </div>
                          {value === device.id && (
                            <Badge className="bg-green-600 text-white">Sélectionné</Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-2">
                <div className="text-sm text-gray-600">
                  Page {currentPage} sur {totalPages}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Précédent
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Suivant
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
