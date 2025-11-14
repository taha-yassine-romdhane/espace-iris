import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Package, Stethoscope, Puzzle, Cog, Activity, Settings } from 'lucide-react';

interface EmployeeArticleSelectionDialogProps {
  open: boolean;
  onClose: () => void;
  onSelect: (article: {
    type: 'product' | 'medical-device' | 'accessory' | 'spare-part' | 'diagnostic';
    id: string;
    name: string;
    code?: string;
    serialNumber?: string;
    brand?: string;
    model?: string;
    unitPrice: number;
    parameters?: any;
  }) => void;
  employeeStockLocationId?: string;
}

export default function EmployeeArticleSelectionDialog({
  open,
  onClose,
  onSelect,
  employeeStockLocationId,
}: EmployeeArticleSelectionDialogProps) {
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

    console.log('🔍 Employee Stock Location ID:', employeeStockLocationId);
    console.log('📦 Total Products:', products.length);

    let filtered = products;

    // Filter by employee stock location if provided
    if (employeeStockLocationId) {
      // Products have stocks array - check if any stock is in the employee's location
      filtered = filtered.filter((p: any) => {
        // Check if product has any stock in the employee's location
        const hasStockInLocation = p.stocks?.some((stock: any) =>
          stock.locationId === employeeStockLocationId && stock.quantity > 0
        );
        return hasStockInLocation;
      });
      console.log('✅ Filtered Products (by stock location):', filtered.length);
    } else {
      console.log('⚠️ No employeeStockLocationId provided - showing all products');
    }

    const searchLower = searchTerm.toLowerCase();
    const finalFiltered = filtered.filter((p: any) =>
      p.name?.toLowerCase().includes(searchLower) ||
      p.productCode?.toLowerCase().includes(searchLower)
    );

    console.log('🔎 Final Filtered Products (after search):', finalFiltered.length);

    return finalFiltered;
  }, [products, searchTerm, employeeStockLocationId]);

  // Filter medical devices (exclude diagnostic devices as they have their own tab)
  const filteredDevices = useMemo(() => {
    if (!medicalDevices) return [];

    console.log('🏥 Total Medical Devices:', medicalDevices.length);

    let filtered = medicalDevices;

    // Filter by employee stock location if provided
    if (employeeStockLocationId) {
      filtered = filtered.filter((d: any) => d.stockLocationId === employeeStockLocationId);
      console.log('✅ Filtered Medical Devices (by stock location):', filtered.length);
    } else {
      console.log('⚠️ No employeeStockLocationId for medical devices');
    }

    const searchLower = searchTerm.toLowerCase();
    const finalFiltered = filtered.filter((d: any) => {
      // Exclude diagnostic devices from medical devices tab
      if (d.type === 'DIAGNOSTIC_DEVICE') return false;
      return (
        d.name?.toLowerCase().includes(searchLower) ||
        d.serialNumber?.toLowerCase().includes(searchLower)
      );
    });

    console.log('🔎 Final Filtered Medical Devices (after search):', finalFiltered.length);

    return finalFiltered;
  }, [medicalDevices, searchTerm, employeeStockLocationId]);

  // Filter accessories
  const filteredAccessories = useMemo(() => {
    if (!accessories) return [];

    console.log('🧩 Total Accessories:', accessories.length);

    let filtered = accessories;

    // Filter by employee stock location if provided
    if (employeeStockLocationId) {
      // Accessories have stocks array - check if any stock is in the employee's location
      filtered = filtered.filter((a: any) => {
        const hasStockInLocation = a.stocks?.some((stock: any) =>
          stock.locationId === employeeStockLocationId && stock.quantity > 0
        );
        return hasStockInLocation;
      });
      console.log('✅ Filtered Accessories (by stock location):', filtered.length);
    } else {
      console.log('⚠️ No employeeStockLocationId for accessories');
    }

    const searchLower = searchTerm.toLowerCase();
    const finalFiltered = filtered.filter((a: any) =>
      a.name?.toLowerCase().includes(searchLower) ||
      a.productCode?.toLowerCase().includes(searchLower) ||
      a.brand?.toLowerCase().includes(searchLower) ||
      a.model?.toLowerCase().includes(searchLower) ||
      a.serialNumber?.toLowerCase().includes(searchLower)
    );

    console.log('🔎 Final Filtered Accessories (after search):', finalFiltered.length);

    return finalFiltered;
  }, [accessories, searchTerm, employeeStockLocationId]);

  // Filter spare parts
  const filteredSpareParts = useMemo(() => {
    if (!spareParts) return [];

    console.log('⚙️ Total Spare Parts:', spareParts.length);

    let filtered = spareParts;

    // Filter by employee stock location if provided
    if (employeeStockLocationId) {
      // Spare parts have stocks array - check if any stock is in the employee's location
      filtered = filtered.filter((s: any) => {
        const hasStockInLocation = s.stocks?.some((stock: any) =>
          stock.locationId === employeeStockLocationId && stock.quantity > 0
        );
        return hasStockInLocation;
      });
      console.log('✅ Filtered Spare Parts (by stock location):', filtered.length);
    } else {
      console.log('⚠️ No employeeStockLocationId for spare parts');
    }

    const searchLower = searchTerm.toLowerCase();
    const finalFiltered = filtered.filter((s: any) =>
      s.name?.toLowerCase().includes(searchLower) ||
      s.productCode?.toLowerCase().includes(searchLower) ||
      s.brand?.toLowerCase().includes(searchLower) ||
      s.model?.toLowerCase().includes(searchLower) ||
      s.serialNumber?.toLowerCase().includes(searchLower)
    );

    console.log('🔎 Final Filtered Spare Parts (after search):', finalFiltered.length);

    return finalFiltered;
  }, [spareParts, searchTerm, employeeStockLocationId]);

  // Filter diagnostic devices
  const filteredDiagnostics = useMemo(() => {
    if (!diagnosticDevices) return [];
    let filtered = diagnosticDevices;

    // Filter by employee stock location if provided
    if (employeeStockLocationId) {
      filtered = filtered.filter((d: any) => d.stockLocationId === employeeStockLocationId);
    }

    const searchLower = searchTerm.toLowerCase();
    filtered = filtered.filter((d: any) =>
      d.name?.toLowerCase().includes(searchLower) ||
      d.serialNumber?.toLowerCase().includes(searchLower)
    );
    console.log('Filtered diagnostics:', filtered.length, 'out of', diagnosticDevices.length);
    return filtered;
  }, [diagnosticDevices, searchTerm, employeeStockLocationId]);

  const handleProductSelect = (product: any) => {
    onSelect({
      type: 'product',
      id: product.id,
      name: product.name,
      code: product.productCode,
      brand: product.brand,
      model: product.model,
      unitPrice: product.sellingPrice || 0,
    });
    handleClose();
  };

  const handleDeviceSelect = (device: any) => {
    console.log('Medical device selected:', device);
    onSelect({
      type: 'medical-device',
      id: device.id,
      name: device.name,
      code: device.deviceCode,
      serialNumber: device.serialNumber,
      brand: device.brand,
      model: device.model,
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
      brand: accessory.brand,
      model: accessory.model,
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
      brand: sparePart.brand,
      model: sparePart.model,
      unitPrice: sparePart.sellingPrice || 0,
    });
    handleClose();
  };

  const handleDiagnosticSelect = (diagnostic: any) => {
    console.log('Diagnostic device selected:', diagnostic);
    onSelect({
      type: 'diagnostic',
      id: diagnostic.id,
      name: diagnostic.name,
      code: diagnostic.deviceCode,
      serialNumber: diagnostic.serialNumber,
      brand: diagnostic.brand,
      model: diagnostic.model,
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
            <DialogTitle className="text-green-700">Sélectionner un Article</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-green-500" />
              <Input
                placeholder="Rechercher par nom, code, marque, modèle ou numéro de série..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 border-green-200 focus:ring-green-500 focus:border-green-500"
              />
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
              <TabsList className="grid w-full grid-cols-4 bg-green-50">
                <TabsTrigger value="medical-device" className="flex items-center gap-2 data-[state=active]:bg-green-600 data-[state=active]:text-white">
                  <Stethoscope className="h-4 w-4" />
                  Appareils Médicaux
                </TabsTrigger>
                <TabsTrigger value="accessory" className="flex items-center gap-2 data-[state=active]:bg-green-600 data-[state=active]:text-white">
                  <Puzzle className="h-4 w-4" />
                  Accessoires
                </TabsTrigger>
                <TabsTrigger value="spare-part" className="flex items-center gap-2 data-[state=active]:bg-green-600 data-[state=active]:text-white">
                  <Cog className="h-4 w-4" />
                  Pièces Détachées
                </TabsTrigger>
                <TabsTrigger value="diagnostic" className="flex items-center gap-2 data-[state=active]:bg-green-600 data-[state=active]:text-white">
                  <Activity className="h-4 w-4" />
                  Diagnostics
                </TabsTrigger>
              </TabsList>

              {/* Products Tab */}
              <TabsContent value="product" className="mt-4">
                <div className="border border-green-200 rounded-lg max-h-[400px] overflow-y-auto">
                  {loadingProducts ? (
                    <div className="p-8 text-center text-green-600">Chargement...</div>
                  ) : filteredProducts.length === 0 ? (
                    <div className="p-8 text-center text-green-600">Aucun produit trouvé</div>
                  ) : (
                    filteredProducts.map((product: any) => (
                      <div
                        key={product.id}
                        className="flex items-center justify-between p-4 hover:bg-green-50 cursor-pointer border-b last:border-0"
                        onClick={() => handleProductSelect(product)}
                      >
                        <div className="flex items-center gap-3">
                          <Package className="h-5 w-5 text-green-600" />
                          <div>
                            <div className="font-medium text-green-900">{product.name}</div>
                            <div className="text-sm text-green-600">Code: {product.productCode}</div>
                            {product.type && (
                              <Badge variant="outline" className="mt-1 text-xs bg-green-50 text-green-700 border-green-200">
                                {product.type}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-green-700">
                            {parseFloat(product.sellingPrice || 0).toFixed(2)} TND
                          </div>
                          <div className="text-xs text-green-600">
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
                <div className="border border-green-200 rounded-lg max-h-[400px] overflow-y-auto">
                  {loadingDevices ? (
                    <div className="p-8 text-center text-green-600">Chargement...</div>
                  ) : filteredDevices.length === 0 ? (
                    <div className="p-8 text-center text-green-600">Aucun appareil trouvé</div>
                  ) : (
                    filteredDevices.map((device: any) => (
                      <div
                        key={device.id}
                        className="flex items-center justify-between p-4 hover:bg-green-50 cursor-pointer border-b last:border-0"
                        onClick={() => handleDeviceSelect(device)}
                      >
                        <div className="flex items-center gap-3">
                          <Stethoscope className="h-5 w-5 text-green-600" />
                          <div>
                            <div className="font-medium text-green-900">{device.name}</div>
                            <div className="text-sm text-green-600">
                              Code: {device.deviceCode} • N° Série: {device.serialNumber}
                            </div>
                            {device.type && (
                              <Badge variant="outline" className="mt-1 text-xs bg-green-50 text-green-700 border-green-200">
                                {device.type}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <div className="font-semibold text-green-700">
                              {parseFloat(device.sellingPrice || 0).toFixed(2)} TND
                            </div>
                            <div className="text-xs text-green-600">
                              {device.status || 'Disponible'}
                            </div>
                          </div>
                          <Settings className="h-5 w-5 text-green-500" />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </TabsContent>

              {/* Accessories Tab */}
              <TabsContent value="accessory" className="mt-4">
                <div className="border border-green-200 rounded-lg max-h-[400px] overflow-y-auto">
                  {loadingAccessories ? (
                    <div className="p-8 text-center text-green-600">Chargement...</div>
                  ) : filteredAccessories.length === 0 ? (
                    <div className="p-8 text-center text-green-600">Aucun accessoire trouvé</div>
                  ) : (
                    filteredAccessories.map((accessory: any) => (
                      <div
                        key={accessory.id}
                        className="flex items-center justify-between p-4 hover:bg-green-50 cursor-pointer border-b last:border-0"
                        onClick={() => handleAccessorySelect(accessory)}
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <Puzzle className="h-5 w-5 text-green-600" />
                          <div className="flex-1">
                            <div className="font-medium text-green-900">{accessory.name}</div>
                            <div className="text-sm text-green-600">
                              Code: {accessory.productCode}
                              {accessory.brand && ` • Marque: ${accessory.brand}`}
                              {accessory.model && ` • Modèle: ${accessory.model}`}
                            </div>
                            {accessory.type && (
                              <Badge variant="outline" className="mt-1 text-xs bg-green-50 text-green-700 border-green-200">
                                {accessory.type}
                              </Badge>
                            )}
                            {/* Stock locations */}
                            {accessory.stocks && accessory.stocks.length > 0 && (
                              <div className="mt-2 space-y-1">
                                <div className="text-xs font-semibold text-green-800">Stock par emplacement:</div>
                                {accessory.stocks.map((stock: any) => (
                                  <div key={stock.id} className="text-xs text-green-700 flex items-center gap-2">
                                    <span className="inline-block w-2 h-2 rounded-full bg-green-500"></span>
                                    <span className="font-medium">{stock.location?.name || 'N/A'}:</span>
                                    <span className={stock.quantity > 0 ? 'text-green-600 font-semibold' : 'text-red-600'}>
                                      {stock.quantity} unité{stock.quantity > 1 ? 's' : ''}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="text-right ml-4">
                          <div className="font-semibold text-green-700">
                            {parseFloat(accessory.sellingPrice || 0).toFixed(2)} TND
                          </div>
                          <div className="text-xs text-green-600 mt-1">
                            Total: {accessory.stockQuantity || 0} unité{(accessory.stockQuantity || 0) > 1 ? 's' : ''}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </TabsContent>

              {/* Spare Parts Tab */}
              <TabsContent value="spare-part" className="mt-4">
                <div className="border border-green-200 rounded-lg max-h-[400px] overflow-y-auto">
                  {loadingSpareParts ? (
                    <div className="p-8 text-center text-green-600">Chargement...</div>
                  ) : filteredSpareParts.length === 0 ? (
                    <div className="p-8 text-center text-green-600">Aucune pièce détachée trouvée</div>
                  ) : (
                    filteredSpareParts.map((sparePart: any) => (
                      <div
                        key={sparePart.id}
                        className="flex items-center justify-between p-4 hover:bg-green-50 cursor-pointer border-b last:border-0"
                        onClick={() => handleSparePartSelect(sparePart)}
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <Cog className="h-5 w-5 text-green-600" />
                          <div className="flex-1">
                            <div className="font-medium text-green-900">{sparePart.name}</div>
                            <div className="text-sm text-green-600">
                              Code: {sparePart.productCode}
                              {sparePart.brand && ` • Marque: ${sparePart.brand}`}
                              {sparePart.model && ` • Modèle: ${sparePart.model}`}
                            </div>
                            {sparePart.type && (
                              <Badge variant="outline" className="mt-1 text-xs bg-green-50 text-green-700 border-green-200">
                                {sparePart.type}
                              </Badge>
                            )}
                            {/* Stock locations */}
                            {sparePart.stocks && sparePart.stocks.length > 0 && (
                              <div className="mt-2 space-y-1">
                                <div className="text-xs font-semibold text-green-800">Stock par emplacement:</div>
                                {sparePart.stocks.map((stock: any) => (
                                  <div key={stock.id} className="text-xs text-green-700 flex items-center gap-2">
                                    <span className="inline-block w-2 h-2 rounded-full bg-green-500"></span>
                                    <span className="font-medium">{stock.location?.name || 'N/A'}:</span>
                                    <span className={stock.quantity > 0 ? 'text-green-600 font-semibold' : 'text-red-600'}>
                                      {stock.quantity} unité{stock.quantity > 1 ? 's' : ''}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="text-right ml-4">
                          <div className="font-semibold text-green-700">
                            {parseFloat(sparePart.sellingPrice || 0).toFixed(2)} TND
                          </div>
                          <div className="text-xs text-green-600 mt-1">
                            Total: {sparePart.stockQuantity || 0} unité{(sparePart.stockQuantity || 0) > 1 ? 's' : ''}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </TabsContent>

              {/* Diagnostics Tab */}
              <TabsContent value="diagnostic" className="mt-4">
                <div className="border border-green-200 rounded-lg max-h-[400px] overflow-y-auto">
                  {loadingDiagnostics ? (
                    <div className="p-8 text-center text-green-600">Chargement...</div>
                  ) : filteredDiagnostics.length === 0 ? (
                    <div className="p-8 text-center text-green-600">Aucun appareil de diagnostic trouvé</div>
                  ) : (
                    filteredDiagnostics.map((diagnostic: any) => (
                      <div
                        key={diagnostic.id}
                        className="flex items-center justify-between p-4 hover:bg-green-50 cursor-pointer border-b last:border-0"
                        onClick={() => handleDiagnosticSelect(diagnostic)}
                      >
                        <div className="flex items-center gap-3">
                          <Activity className="h-5 w-5 text-green-600" />
                          <div>
                            <div className="font-medium text-green-900">{diagnostic.name}</div>
                            <div className="text-sm text-green-600">
                              Code: {diagnostic.deviceCode} • N° Série: {diagnostic.serialNumber}
                            </div>
                            {diagnostic.type && (
                              <Badge variant="outline" className="mt-1 text-xs bg-green-50 text-green-700 border-green-200">
                                {diagnostic.type}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-green-700">
                            {parseFloat(diagnostic.sellingPrice || 0).toFixed(2)} TND
                          </div>
                          <div className="text-xs text-green-600">
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
