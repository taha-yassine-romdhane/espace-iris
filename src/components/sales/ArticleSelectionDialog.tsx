import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Package, Stethoscope, Puzzle, Cog, Activity, Settings } from 'lucide-react';

interface ArticleSelectionDialogProps {
  open: boolean;
  onClose: () => void;
  onSelect: (article: {
    type: 'product' | 'medical-device' | 'accessory' | 'spare-part' | 'diagnostic';
    id: string;
    name: string;
    code?: string;
    serialNumber?: string;
    unitPrice: number;
    parameters?: any;
  }) => void;
}

export default function ArticleSelectionDialog({
  open,
  onClose,
  onSelect,
}: ArticleSelectionDialogProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'product' | 'medical-device' | 'accessory' | 'spare-part' | 'diagnostic'>('medical-device');

  // Fetch products
  const { data: products, isLoading: loadingProducts } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const response = await fetch('/api/products');
      if (!response.ok) throw new Error('Failed to fetch products');
      return response.json();
    },
    enabled: open,
  });

  // Fetch medical devices (excluding those in active rentals)
  const { data: medicalDevices, isLoading: loadingDevices } = useQuery({
    queryKey: ['medical-devices', 'available-for-sale'],
    queryFn: async () => {
      const response = await fetch('/api/medical-devices?excludeRented=true');
      if (!response.ok) throw new Error('Failed to fetch medical devices');
      return response.json();
    },
    enabled: open,
  });

  // Fetch accessories
  const { data: accessories, isLoading: loadingAccessories } = useQuery({
    queryKey: ['accessories'],
    queryFn: async () => {
      const response = await fetch('/api/accessories');
      if (!response.ok) throw new Error('Failed to fetch accessories');
      return response.json();
    },
    enabled: open,
  });

  // Fetch spare parts
  const { data: spareParts, isLoading: loadingSpareParts } = useQuery({
    queryKey: ['spare-parts'],
    queryFn: async () => {
      const response = await fetch('/api/spare-parts');
      if (!response.ok) throw new Error('Failed to fetch spare parts');
      return response.json();
    },
    enabled: open,
  });

  // Fetch diagnostic devices
  const { data: diagnosticDevices, isLoading: loadingDiagnostics } = useQuery({
    queryKey: ['diagnostic-devices'],
    queryFn: async () => {
      const response = await fetch('/api/diagnostics-devices');
      if (!response.ok) throw new Error('Failed to fetch diagnostic devices');
      const data = await response.json();
      console.log('Diagnostic devices fetched:', data);
      return data;
    },
    enabled: open,
  });

  // Filter products
  const filteredProducts = useMemo(() => {
    if (!products) return [];
    const searchLower = searchTerm.toLowerCase();
    return products.filter((p: any) =>
      p.name?.toLowerCase().includes(searchLower) ||
      p.productCode?.toLowerCase().includes(searchLower)
    );
  }, [products, searchTerm]);

  // Filter medical devices (exclude diagnostic devices as they have their own tab)
  const filteredDevices = useMemo(() => {
    if (!medicalDevices) return [];
    const searchLower = searchTerm.toLowerCase();
    return medicalDevices.filter((d: any) => {
      // Exclude diagnostic devices from medical devices tab
      if (d.type === 'DIAGNOSTIC_DEVICE') return false;
      return (
        d.name?.toLowerCase().includes(searchLower) ||
        d.serialNumber?.toLowerCase().includes(searchLower)
      );
    });
  }, [medicalDevices, searchTerm]);

  // Filter accessories
  const filteredAccessories = useMemo(() => {
    if (!accessories) return [];
    const searchLower = searchTerm.toLowerCase();
    return accessories.filter((a: any) =>
      a.name?.toLowerCase().includes(searchLower) ||
      a.serialNumber?.toLowerCase().includes(searchLower)
    );
  }, [accessories, searchTerm]);

  // Filter spare parts
  const filteredSpareParts = useMemo(() => {
    if (!spareParts) return [];
    const searchLower = searchTerm.toLowerCase();
    return spareParts.filter((s: any) =>
      s.name?.toLowerCase().includes(searchLower) ||
      s.serialNumber?.toLowerCase().includes(searchLower)
    );
  }, [spareParts, searchTerm]);

  // Filter diagnostic devices
  const filteredDiagnostics = useMemo(() => {
    if (!diagnosticDevices) return [];
    const searchLower = searchTerm.toLowerCase();
    const filtered = diagnosticDevices.filter((d: any) =>
      d.name?.toLowerCase().includes(searchLower) ||
      d.serialNumber?.toLowerCase().includes(searchLower)
    );
    console.log('Filtered diagnostics:', filtered.length, 'out of', diagnosticDevices.length);
    return filtered;
  }, [diagnosticDevices, searchTerm]);

  const handleProductSelect = (product: any) => {
    onSelect({
      type: 'product',
      id: product.id,
      name: product.name,
      code: product.productCode,
      unitPrice: product.sellingPrice || 0,
    });
    handleClose();
  };

  const handleDeviceSelect = (device: any) => {
    // Select device directly without parameter prompt
    console.log('Medical device selected:', device);
    onSelect({
      type: 'medical-device',
      id: device.id,
      name: device.name,
      code: device.deviceCode,
      serialNumber: device.serialNumber,
      unitPrice: device.sellingPrice || 0,
    });
    handleClose();
  };

  const handleAccessorySelect = (accessory: any) => {
    onSelect({
      type: 'accessory',
      id: accessory.id,
      name: accessory.name,
      code: accessory.productCode,
      serialNumber: accessory.serialNumber,
      unitPrice: accessory.sellingPrice || 0,
    });
    handleClose();
  };

  const handleSparePartSelect = (sparePart: any) => {
    onSelect({
      type: 'spare-part',
      id: sparePart.id,
      name: sparePart.name,
      code: sparePart.productCode,
      serialNumber: sparePart.serialNumber,
      unitPrice: sparePart.sellingPrice || 0,
    });
    handleClose();
  };

  const handleDiagnosticSelect = (diagnostic: any) => {
    // Select diagnostic device directly without parameter prompt
    console.log('Diagnostic device selected:', diagnostic);
    onSelect({
      type: 'diagnostic',
      id: diagnostic.id,
      name: diagnostic.name,
      code: diagnostic.deviceCode,
      serialNumber: diagnostic.serialNumber,
      unitPrice: diagnostic.sellingPrice || 0,
    });
    handleClose();
  };

  const handleClose = () => {
    setSearchTerm('');
    onClose();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Sélectionner un Article</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Rechercher par nom, code ou numéro de série..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="medical-device" className="flex items-center gap-2">
                  <Stethoscope className="h-4 w-4" />
                  Appareils Médicaux
                </TabsTrigger>
                <TabsTrigger value="accessory" className="flex items-center gap-2">
                  <Puzzle className="h-4 w-4" />
                  Accessoires
                </TabsTrigger>
                <TabsTrigger value="spare-part" className="flex items-center gap-2">
                  <Cog className="h-4 w-4" />
                  Pièces Détachées
                </TabsTrigger>
                <TabsTrigger value="diagnostic" className="flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Diagnostics
                </TabsTrigger>
              </TabsList>

              {/* Products Tab */}
              <TabsContent value="product" className="mt-4">
                <div className="border rounded-lg max-h-[400px] overflow-y-auto">
                  {loadingProducts ? (
                    <div className="p-8 text-center text-gray-500">Chargement...</div>
                  ) : filteredProducts.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">Aucun produit trouvé</div>
                  ) : (
                    filteredProducts.map((product: any) => (
                      <div
                        key={product.id}
                        className="flex items-center justify-between p-4 hover:bg-gray-50 cursor-pointer border-b last:border-0"
                        onClick={() => handleProductSelect(product)}
                      >
                        <div className="flex items-center gap-3">
                          <Package className="h-5 w-5 text-green-500" />
                          <div>
                            <div className="font-medium">{product.name}</div>
                            <div className="text-sm text-gray-500">Code: {product.productCode}</div>
                            {product.type && (
                              <Badge variant="outline" className="mt-1 text-xs">
                                {product.type}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-green-700">
                            {parseFloat(product.sellingPrice || 0).toFixed(2)} TND
                          </div>
                          <div className="text-xs text-gray-500">
                            Stock: {product.stockQuantity || 0}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </TabsContent>

              {/* Medical Devices Tab */}
              <TabsContent value="medical-device" className="mt-4">
                <div className="border rounded-lg max-h-[400px] overflow-y-auto">
                  {loadingDevices ? (
                    <div className="p-8 text-center text-gray-500">Chargement...</div>
                  ) : filteredDevices.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">Aucun appareil trouvé</div>
                  ) : (
                    filteredDevices.map((device: any) => (
                      <div
                        key={device.id}
                        className="flex items-center justify-between p-4 hover:bg-gray-50 cursor-pointer border-b last:border-0"
                        onClick={() => handleDeviceSelect(device)}
                      >
                        <div className="flex items-center gap-3">
                          <Stethoscope className="h-5 w-5 text-blue-500" />
                          <div>
                            <div className="font-medium">{device.name}</div>
                            <div className="text-sm text-gray-500">
                              Code: {device.deviceCode} • N° Série: {device.serialNumber}
                            </div>
                            {device.type && (
                              <Badge variant="outline" className="mt-1 text-xs bg-blue-50 text-blue-700 border-blue-200">
                                {device.type}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <div className="font-semibold text-blue-700">
                              {parseFloat(device.sellingPrice || 0).toFixed(2)} TND
                            </div>
                            <div className="text-xs text-gray-500">
                              {device.status || 'Disponible'}
                            </div>
                          </div>
                          <Settings className="h-5 w-5 text-gray-400" />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </TabsContent>

              {/* Accessories Tab */}
              <TabsContent value="accessory" className="mt-4">
                <div className="border rounded-lg max-h-[400px] overflow-y-auto">
                  {loadingAccessories ? (
                    <div className="p-8 text-center text-gray-500">Chargement...</div>
                  ) : filteredAccessories.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">Aucun accessoire trouvé</div>
                  ) : (
                    filteredAccessories.map((accessory: any) => (
                      <div
                        key={accessory.id}
                        className="flex items-center justify-between p-4 hover:bg-gray-50 cursor-pointer border-b last:border-0"
                        onClick={() => handleAccessorySelect(accessory)}
                      >
                        <div className="flex items-center gap-3">
                          <Puzzle className="h-5 w-5 text-green-500" />
                          <div>
                            <div className="font-medium">{accessory.name}</div>
                            <div className="text-sm text-gray-500">
                              Code: {accessory.productCode} {accessory.serialNumber ? `• N° Série: ${accessory.serialNumber}` : ''}
                            </div>
                            {accessory.type && (
                              <Badge variant="outline" className="mt-1 text-xs bg-green-50 text-green-700 border-green-200">
                                {accessory.type}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-green-700">
                            {parseFloat(accessory.sellingPrice || 0).toFixed(2)} TND
                          </div>
                          <div className="text-xs text-gray-500">
                            {accessory.status || 'Disponible'}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </TabsContent>

              {/* Spare Parts Tab */}
              <TabsContent value="spare-part" className="mt-4">
                <div className="border rounded-lg max-h-[400px] overflow-y-auto">
                  {loadingSpareParts ? (
                    <div className="p-8 text-center text-gray-500">Chargement...</div>
                  ) : filteredSpareParts.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">Aucune pièce détachée trouvée</div>
                  ) : (
                    filteredSpareParts.map((sparePart: any) => (
                      <div
                        key={sparePart.id}
                        className="flex items-center justify-between p-4 hover:bg-gray-50 cursor-pointer border-b last:border-0"
                        onClick={() => handleSparePartSelect(sparePart)}
                      >
                        <div className="flex items-center gap-3">
                          <Cog className="h-5 w-5 text-orange-500" />
                          <div>
                            <div className="font-medium">{sparePart.name}</div>
                            <div className="text-sm text-gray-500">
                              Code: {sparePart.productCode} {sparePart.serialNumber ? `• N° Série: ${sparePart.serialNumber}` : ''}
                            </div>
                            {sparePart.type && (
                              <Badge variant="outline" className="mt-1 text-xs bg-orange-50 text-orange-700 border-orange-200">
                                {sparePart.type}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-orange-700">
                            {parseFloat(sparePart.sellingPrice || 0).toFixed(2)} TND
                          </div>
                          <div className="text-xs text-gray-500">
                            {sparePart.status || 'Disponible'}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </TabsContent>

              {/* Diagnostics Tab */}
              <TabsContent value="diagnostic" className="mt-4">
                <div className="border rounded-lg max-h-[400px] overflow-y-auto">
                  {loadingDiagnostics ? (
                    <div className="p-8 text-center text-gray-500">Chargement...</div>
                  ) : filteredDiagnostics.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">Aucun appareil de diagnostic trouvé</div>
                  ) : (
                    filteredDiagnostics.map((diagnostic: any) => (
                      <div
                        key={diagnostic.id}
                        className="flex items-center justify-between p-4 hover:bg-gray-50 cursor-pointer border-b last:border-0"
                        onClick={() => handleDiagnosticSelect(diagnostic)}
                      >
                        <div className="flex items-center gap-3">
                          <Activity className="h-5 w-5 text-purple-500" />
                          <div>
                            <div className="font-medium">{diagnostic.name}</div>
                            <div className="text-sm text-gray-500">
                              Code: {diagnostic.deviceCode} • N° Série: {diagnostic.serialNumber}
                            </div>
                            {diagnostic.type && (
                              <Badge variant="outline" className="mt-1 text-xs bg-purple-50 text-purple-700 border-purple-200">
                                {diagnostic.type}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-purple-700">
                            {parseFloat(diagnostic.sellingPrice || 0).toFixed(2)} TND
                          </div>
                          <div className="text-xs text-gray-500">
                            {diagnostic.status || 'Disponible'}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
