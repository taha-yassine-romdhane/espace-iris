import React from 'react';
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Search, History, Info, AlertCircle, Package, Wrench, Stethoscope, Monitor, Filter, X, Building2, MapPin, Hash, Calendar, CheckCircle2, XCircle, AlertTriangle, ChevronDown } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import TransferHistory from './TransferHistory';
import PendingTransferRequests from './PendingTransferRequests';


interface TransferFormData {
  fromLocationId: string;
  toLocationId: string;
  productId: string;
  quantity: number;
  notes?: string;
  newStatus?: 'FOR_SALE' | 'RESERVE' | 'DEFECTUEUX';
  isDevice?: boolean; // Flag to indicate if this is a medical device
  productType?: string; // Type of product being transferred
}

interface SelectedProductInfo {
  id: string;
  name: string;
  brand?: string;
  model?: string;
  type: string;
  serialNumber?: string;
  quantity: number;
  isDevice: boolean;
  location: {
    id: string;
    name: string;
  };
  status?: string;
}



// Define product types enum to match the database
enum ProductType {
  MEDICAL_DEVICE = 'MEDICAL_DEVICE',
  DIAGNOSTIC_DEVICE = 'DIAGNOSTIC_DEVICE',
  ACCESSORY = 'ACCESSORY',
  SPARE_PART = 'SPARE_PART'
}

interface Stock {
  id: string;
  product: {
    id: string;
    name: string;
    brand?: string;
    model?: string;
    type?: string;
  };
  quantity: number;
  isDevice?: boolean;
}

export default function StockTransfers() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  const [formData, setFormData] = useState<TransferFormData>({
    fromLocationId: '',
    toLocationId: '',
    productId: '',
    quantity: 1,
    notes: '',
  });
  
  const [maxAvailableQuantity, setMaxAvailableQuantity] = useState(1);
  const [productSearch, setProductSearch] = useState('');
  const [selectedProductType, setSelectedProductType] = useState<string>('all');
  const [selectedProductInfo, setSelectedProductInfo] = useState<SelectedProductInfo | null>(null);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [brandFilter, setBrandFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Helper function to get product type icon
  const getProductTypeIcon = (productType: string) => {
    switch (productType) {
      case 'MEDICAL_DEVICE':
        return <Stethoscope className="h-4 w-4" />;
      case 'DIAGNOSTIC_DEVICE':
        return <Monitor className="h-4 w-4" />;
      case 'ACCESSORY':
        return <Package className="h-4 w-4" />;
      case 'SPARE_PART':
        return <Wrench className="h-4 w-4" />;
      default:
        return <Package className="h-4 w-4" />;
    }
  };

  // Helper function to get product type label
  const getProductTypeLabel = (productType: string) => {
    switch (productType) {
      case 'MEDICAL_DEVICE':
        return 'Appareil médical';
      case 'DIAGNOSTIC_DEVICE':
        return 'Appareil de diagnostic';
      case 'ACCESSORY':
        return 'Accessoire';
      case 'SPARE_PART':
        return 'Pièce détachée';
      default:
        return 'Produit';
    }
  };

  const { data: locations } = useQuery({
    queryKey: ['stockLocations'],
    queryFn: async () => {
      const response = await fetch('/api/stock/locations');
      if (!response.ok) throw new Error('Failed to fetch locations');
      return response.json();
    }
  });

  const { data: productsData, isLoading: isLoadingProducts } = useQuery({
    queryKey: ['availableProducts', formData.fromLocationId],
    queryFn: async () => {
      if (!formData.fromLocationId) return { items: [] };
      const response = await fetch(`/api/stock/inventory?locationId=${formData.fromLocationId}&limit=1000&t=${Date.now()}`, {
        cache: 'no-cache'
      });
      if (!response.ok) throw new Error('Failed to fetch products');
      return response.json();
    },
    enabled: !!formData.fromLocationId,
    staleTime: 0, // Always fetch fresh data
    gcTime: 0, // Don't cache the data
  });
  
  const products = React.useMemo(() => {
    const items = productsData?.items || [];
    
    let filteredItems = items.map((item: any) => {
      const isDevice = item.isDevice || 
        [ProductType.MEDICAL_DEVICE, ProductType.DIAGNOSTIC_DEVICE].includes(item.product?.type);
      
      const brand = item.product?.brand || '';
      const model = item.product?.model || '';
      const serialNumber = item.product?.serialNumber || '';
      const brandModel = [brand, model].filter(Boolean).join(' ');
      const displayName = `${item.product?.name || item.product.name}${brandModel ? ` (${brandModel})` : ''}`;
      
      return { ...item, displayName, isDevice, brand, model, serialNumber };
    });

    // Apply product type filter
    if (selectedProductType !== 'all') {
      filteredItems = filteredItems.filter((item: any) => 
        item.product.type === selectedProductType
      );
    }

    // Apply search filter
    if (productSearch.trim()) {
      const searchTerm = productSearch.toLowerCase().trim();
      filteredItems = filteredItems.filter((item: any) => 
        item.product.name.toLowerCase().includes(searchTerm) ||
        (item.product.brand && item.product.brand.toLowerCase().includes(searchTerm)) ||
        (item.product.model && item.product.model.toLowerCase().includes(searchTerm)) ||
        (item.product.serialNumber && item.product.serialNumber.toLowerCase().includes(searchTerm))
      );
    }

    // Apply brand filter
    if (brandFilter && brandFilter !== 'all') {
      filteredItems = filteredItems.filter((item: any) => 
        item.product.brand?.toLowerCase() === brandFilter.toLowerCase()
      );
    }

    // Apply status filter for devices
    if (statusFilter && statusFilter !== 'all') {
      filteredItems = filteredItems.filter((item: any) => 
        item.status === statusFilter
      );
    }

    // Sort items for better organization
    filteredItems.sort((a: any, b: any) => {
      // First by type
      if (a.product.type !== b.product.type) {
        return a.product.type.localeCompare(b.product.type);
      }
      // Then by name
      return a.product.name.localeCompare(b.product.name);
    });

    return filteredItems;
  }, [productsData, selectedProductType, productSearch, brandFilter, statusFilter]);

  // Get unique brands for filtering
  const availableBrands = React.useMemo(() => {
    const items = productsData?.items || [];
    const brands = new Set<string>();
    items.forEach((item: any) => {
      if (item.product?.brand) {
        brands.add(item.product.brand);
      }
    });
    return Array.from(brands).sort();
  }, [productsData]);

  // Get unique statuses for filtering
  const availableStatuses = React.useMemo(() => {
    const items = productsData?.items || [];
    const statuses = new Set<string>();
    items.forEach((item: any) => {
      if (item.status) {
        statuses.add(item.status);
      }
    });
    return Array.from(statuses).sort();
  }, [productsData]);

  useEffect(() => {
    const selectedProduct = products.find((p: any) => p.product.id === formData.productId);
    if (selectedProduct) {
      const isDevice = selectedProduct.isDevice;
      setMaxAvailableQuantity(isDevice ? 1 : selectedProduct.quantity);
      setSelectedProductInfo({
        id: selectedProduct.product.id,
        name: selectedProduct.product.name,
        brand: selectedProduct.product.brand,
        model: selectedProduct.product.model,
        type: selectedProduct.product.type,
        serialNumber: selectedProduct.product.serialNumber,
        quantity: selectedProduct.quantity,
        isDevice: isDevice,
        location: selectedProduct.location,
        status: selectedProduct.status
      });
      setFormData(prev => ({
        ...prev,
        quantity: 1,
        isDevice: isDevice,
        productType: selectedProduct.product.type,
      }));
    } else {
      setMaxAvailableQuantity(1);
      setSelectedProductInfo(null);
    }
  }, [formData.productId, products]);

  const checkAvailabilityMutation = useMutation({
    mutationFn: async (data: { fromLocationId: string; productId: string; quantity: number }) => {
      const response = await fetch('/api/stock/check-availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        throw new Error('Failed to check availability');
      }
      return response.json();
    },
  });

  const createTransferMutation = useMutation({
    mutationFn: async (data: TransferFormData) => {
      // First check availability
      const availabilityCheck = await checkAvailabilityMutation.mutateAsync({
        fromLocationId: data.fromLocationId,
        productId: data.productId,
        quantity: data.quantity,
      });

      if (!availabilityCheck.available) {
        throw new Error(availabilityCheck.reason + (availabilityCheck.details ? ` (Disponible: ${availabilityCheck.details.availableQuantity}, Demandé: ${availabilityCheck.details.requestedQuantity})` : ''));
      }

      const response = await fetch('/api/stock/transfers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ...data, 
          userId: session?.user?.id,
          userRole: session?.user?.role 
        }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create transfer');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stockLocations'] });
      queryClient.invalidateQueries({ queryKey: ['availableProducts', formData.fromLocationId] });
      queryClient.invalidateQueries({ queryKey: ['transferHistory'] });

      toast({
        title: "Transfert créé avec succès",
        description: `Le transfert de ${formData.quantity} unité(s) a été enregistré.`,
      });

      setIsDialogOpen(false);
      setFormData({
        fromLocationId: '',
        toLocationId: '',
        productId: '',
        quantity: 1,
        notes: '',
        newStatus: undefined,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erreur lors du transfert",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createTransferMutation.mutate(formData);
  };

  const resetProductFilters = () => {
    setProductSearch('');
    setSelectedProductType('all');
    setBrandFilter('all');
    setStatusFilter('all');
  };

  const handleLocationChange = (value: string) => {
    setFormData({ ...formData, fromLocationId: value, productId: '' });
    resetProductFilters();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">Gestion des Transferts de Stock</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Nouveau Transfert
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Créer un nouveau transfert</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Locations Section */}
              <div className="bg-gray-50 p-4 rounded-lg border">
                <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Emplacements de Stock
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Emplacement source</label>
                    <Select
                      value={formData.fromLocationId}
                      onValueChange={handleLocationChange}
                      required
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Sélectionner l'emplacement de départ" />
                      </SelectTrigger>
                      <SelectContent>
                        {locations?.map((loc: any) => (
                          <SelectItem key={loc.id} value={loc.id}>
                            <div className="flex items-center gap-2">
                              <Building2 className="h-4 w-4" />
                              {loc.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Emplacement destination</label>
                    <Select
                      value={formData.toLocationId}
                      onValueChange={(value) => setFormData({ ...formData, toLocationId: value })}
                      required
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Sélectionner l'emplacement de destination" />
                      </SelectTrigger>
                      <SelectContent>
                        {locations?.filter((loc: any) => loc.id !== formData.fromLocationId).map((loc: any) => (
                          <SelectItem key={loc.id} value={loc.id}>
                            <div className="flex items-center gap-2">
                              <Building2 className="h-4 w-4" />
                              {loc.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Product Selection Section */}
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-blue-800 flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Sélection du Produit
                  </h3>
                  {(productSearch || selectedProductType !== 'all' || brandFilter !== 'all' || statusFilter !== 'all') && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={resetProductFilters}
                      className="h-8 px-3 text-xs border-red-200 text-red-600 hover:bg-red-50"
                    >
                      <X className="h-3 w-3 mr-1" />
                      Réinitialiser filtres
                    </Button>
                  )}
                </div>

                {/* Search Bar */}
                <div className="mb-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      type="text"
                      placeholder="Rechercher par nom, marque, modèle ou numéro de série..."
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      className="pl-10 h-10"
                      disabled={!formData.fromLocationId || isLoadingProducts}
                    />
                  </div>
                </div>

                {/* Advanced Filters Toggle */}
                <div className="mb-4">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                    className="text-blue-600 hover:text-blue-700 hover:bg-blue-100"
                  >
                    <Filter className="h-4 w-4 mr-2" />
                    Filtres avancés
                    <ChevronDown className={`h-4 w-4 ml-2 transition-transform ${showAdvancedFilters ? 'rotate-180' : ''}`} />
                  </Button>
                </div>

                {/* Advanced Filters */}
                {showAdvancedFilters && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 p-4 bg-white rounded-lg border">
                    <div>
                      <label className="text-xs font-medium text-gray-600 mb-1 block">Type de produit</label>
                      <Select
                        value={selectedProductType}
                        onValueChange={setSelectedProductType}
                        disabled={!formData.fromLocationId || isLoadingProducts}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Tous les types" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">
                            <div className="flex items-center gap-2">
                              <Package className="h-3 w-3" />
                              Tous les types
                            </div>
                          </SelectItem>
                          <SelectItem value="MEDICAL_DEVICE">
                            <div className="flex items-center gap-2">
                              <Stethoscope className="h-3 w-3" />
                              Appareils médicaux
                            </div>
                          </SelectItem>
                          <SelectItem value="DIAGNOSTIC_DEVICE">
                            <div className="flex items-center gap-2">
                              <Monitor className="h-3 w-3" />
                              Appareils de diagnostic
                            </div>
                          </SelectItem>
                          <SelectItem value="ACCESSORY">
                            <div className="flex items-center gap-2">
                              <Package className="h-3 w-3" />
                              Accessoires
                            </div>
                          </SelectItem>
                          <SelectItem value="SPARE_PART">
                            <div className="flex items-center gap-2">
                              <Wrench className="h-3 w-3" />
                              Pièces détachées
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="text-xs font-medium text-gray-600 mb-1 block">Marque</label>
                      <Select
                        value={brandFilter}
                        onValueChange={setBrandFilter}
                        disabled={!formData.fromLocationId || isLoadingProducts}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Toutes les marques" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Toutes les marques</SelectItem>
                          {availableBrands.map((brand) => (
                            <SelectItem key={brand} value={brand}>{brand}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="text-xs font-medium text-gray-600 mb-1 block">Statut</label>
                      <Select
                        value={statusFilter}
                        onValueChange={setStatusFilter}
                        disabled={!formData.fromLocationId || isLoadingProducts}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Tous les statuts" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Tous les statuts</SelectItem>
                          {availableStatuses.map((status) => (
                            <SelectItem key={status} value={status}>
                              <div className="flex items-center gap-2">
                                {status === 'ACTIVE' && <CheckCircle2 className="h-3 w-3 text-green-500" />}
                                {status === 'MAINTENANCE' && <AlertTriangle className="h-3 w-3 text-yellow-500" />}
                                {status === 'RETIRED' && <XCircle className="h-3 w-3 text-red-500" />}
                                {status === 'FOR_SALE' && <Package className="h-3 w-3 text-blue-500" />}
                                {status === 'FOR_RENT' && <Calendar className="h-3 w-3 text-purple-500" />}
                                {status}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                {/* Product Selection Dropdown */}
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Produit à transférer</label>
                  <Select
                    value={formData.productId}
                    onValueChange={(value) => setFormData({ ...formData, productId: value })}
                    required
                    disabled={!formData.fromLocationId || isLoadingProducts}
                  >
                    <SelectTrigger className="h-12">
                      <SelectValue placeholder={
                        isLoadingProducts 
                          ? 'Chargement des produits...' 
                          : products.length === 0 
                            ? 'Aucun produit trouvé'
                            : 'Sélectionner un produit'
                      } />
                    </SelectTrigger>
                    <SelectContent className="max-h-[400px] w-[600px]">
                      {products.length === 0 && !isLoadingProducts ? (
                        <div className="p-6 text-center text-sm text-gray-500">
                          <Package className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                          {productSearch || selectedProductType !== 'all' || brandFilter !== 'all' || statusFilter !== 'all'
                            ? 'Aucun produit trouvé avec les filtres actuels'
                            : 'Aucun produit disponible dans cet emplacement'
                          }
                        </div>
                      ) : (
                        products.map((p: any) => (
                          <SelectItem key={p.product.id} value={p.product.id} className="p-2 h-auto">
                            <div className="flex items-center gap-3 w-full">
                              <div className="flex-shrink-0">
                                {getProductTypeIcon(p.product.type)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-sm truncate mb-1">
                                  {p.product.name}
                                  {(p.product.brand || p.product.model) && (
                                    <span className="text-gray-500 font-normal ml-1">
                                      ({[p.product.brand, p.product.model].filter(Boolean).join(' ')})
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-3 text-xs text-gray-500">
                                  <span className="flex items-center gap-1">
                                    <Hash className="h-3 w-3" />
                                    {p.isDevice ? '1 unité' : `${p.quantity} unités`}
                                  </span>
                                  {p.product.serialNumber && (
                                    <span className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">
                                      S/N: {p.product.serialNumber}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
                                  {getProductTypeLabel(p.product.type)}
                                </span>
                                {p.status === 'ACTIVE' && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                                {p.status === 'MAINTENANCE' && <AlertTriangle className="h-4 w-4 text-yellow-500" />}
                                {p.status === 'FOR_SALE' && <Package className="h-4 w-4 text-blue-500" />}
                                {p.status === 'FOR_RENT' && <Calendar className="h-4 w-4 text-purple-500" />}
                              </div>
                            </div>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {/* Results Summary */}
                {formData.fromLocationId && !isLoadingProducts && (
                  <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-blue-700">
                        <Info className="h-4 w-4" />
                        <span className="font-semibold text-sm">
                          {products.length} produit{products.length !== 1 ? 's' : ''} trouvé{products.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                      {(productSearch || selectedProductType !== 'all' || brandFilter !== 'all' || statusFilter !== 'all') && (
                        <div className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded-full">
                          Filtres actifs
                        </div>
                      )}
                    </div>
                    {(productSearch || selectedProductType !== 'all' || brandFilter !== 'all' || statusFilter !== 'all') && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {productSearch && (
                          <span className="inline-flex items-center gap-1 text-xs bg-white px-2 py-1 rounded-full border border-blue-200">
                            🔍 "{productSearch}"
                          </span>
                        )}
                        {selectedProductType !== 'all' && (
                          <span className="inline-flex items-center gap-1 text-xs bg-white px-2 py-1 rounded-full border border-blue-200">
                            📦 {getProductTypeLabel(selectedProductType)}
                          </span>
                        )}
                        {brandFilter !== 'all' && (
                          <span className="inline-flex items-center gap-1 text-xs bg-white px-2 py-1 rounded-full border border-blue-200">
                            🏷️ {brandFilter}
                          </span>
                        )}
                        {statusFilter !== 'all' && (
                          <span className="inline-flex items-center gap-1 text-xs bg-white px-2 py-1 rounded-full border border-blue-200">
                            ⚡ {statusFilter}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Selected Product Preview */}
              {selectedProductInfo && (
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <h3 className="text-lg font-semibold text-green-800 mb-3 flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5" />
                    Produit Sélectionné
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-1">
                          {getProductTypeIcon(selectedProductInfo.type)}
                        </div>
                        <div>
                          <h4 className="font-medium text-green-900">{selectedProductInfo.name}</h4>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {getProductTypeLabel(selectedProductInfo.type)}
                            </Badge>
                            {selectedProductInfo.status && (
                              <Badge 
                                variant={selectedProductInfo.status === 'ACTIVE' ? 'default' : 'secondary'}
                                className="text-xs"
                              >
                                {selectedProductInfo.status}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2 text-sm text-green-700">
                      {selectedProductInfo.brand && (
                        <div><strong>Marque:</strong> {selectedProductInfo.brand}</div>
                      )}
                      {selectedProductInfo.model && (
                        <div><strong>Modèle:</strong> {selectedProductInfo.model}</div>
                      )}
                      {selectedProductInfo.serialNumber && (
                        <div><strong>N° Série:</strong> {selectedProductInfo.serialNumber}</div>
                      )}
                      <div><strong>Quantité disponible:</strong> {selectedProductInfo.quantity}</div>
                      <div><strong>Emplacement actuel:</strong> {selectedProductInfo.location.name}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Transfer Configuration */}
              <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                <h3 className="text-lg font-semibold text-orange-800 mb-3 flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Configuration du Transfert
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Quantité à transférer</label>
                    <div className="space-y-2">
                      <Input
                        type="number"
                        value={formData.quantity}
                        onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value, 10) || 1 })}
                        min={1}
                        max={maxAvailableQuantity}
                        required
                        disabled={formData.isDevice}
                        className="h-10"
                      />
                      <div className="text-xs text-gray-500">
                        {formData.isDevice ? (
                          <span className="flex items-center gap-1 text-blue-600">
                            <Info className="h-3 w-3" />
                            Les appareils sont transférés individuellement
                          </span>
                        ) : (
                          <span>Maximum disponible: {maxAvailableQuantity}</span>
                        )}
                      </div>
                      {formData.quantity >= maxAvailableQuantity && formData.productId && !formData.isDevice && (
                        <div className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 p-2 rounded">
                          <AlertTriangle className="h-3 w-3" />
                          Attention: Vous transférez la quantité maximale disponible
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">
                      Nouveau statut {formData.isDevice ? '(dispositif)' : '(stock)'} (optionnel)
                    </label>
                    <Select
                      value={formData.newStatus}
                      onValueChange={(value: any) => setFormData({ ...formData, newStatus: value })}
                    >
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder="Garder le statut actuel" />
                      </SelectTrigger>
                      <SelectContent>
                        {formData.isDevice ? (
                          <>
                            <SelectItem value="ACTIVE">
                              <div className="flex items-center gap-2">
                                <CheckCircle2 className="h-3 w-3 text-green-500" />
                                Actif
                              </div>
                            </SelectItem>
                            <SelectItem value="MAINTENANCE">
                              <div className="flex items-center gap-2">
                                <AlertTriangle className="h-3 w-3 text-yellow-500" />
                                En maintenance
                              </div>
                            </SelectItem>
                            <SelectItem value="RETIRED">
                              <div className="flex items-center gap-2">
                                <XCircle className="h-3 w-3 text-red-500" />
                                Retiré
                              </div>
                            </SelectItem>
                            <SelectItem value="RESERVED">
                              <div className="flex items-center gap-2">
                                <Calendar className="h-3 w-3 text-purple-500" />
                                Réservé
                              </div>
                            </SelectItem>
                          </>
                        ) : (
                          <>
                            <SelectItem value="FOR_SALE">
                              <div className="flex items-center gap-2">
                                <Package className="h-3 w-3 text-blue-500" />
                                En vente
                              </div>
                            </SelectItem>
                            <SelectItem value="FOR_RENT">
                              <div className="flex items-center gap-2">
                                <Calendar className="h-3 w-3 text-purple-500" />
                                En location
                              </div>
                            </SelectItem>
                            <SelectItem value="IN_REPAIR">
                              <div className="flex items-center gap-2">
                                <AlertTriangle className="h-3 w-3 text-yellow-500" />
                                En réparation
                              </div>
                            </SelectItem>
                            <SelectItem value="OUT_OF_SERVICE">
                              <div className="flex items-center gap-2">
                                <XCircle className="h-3 w-3 text-red-500" />
                                Hors service
                              </div>
                            </SelectItem>
                          </>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Notes Section */}
              <div className="bg-gray-50 p-4 rounded-lg border">
                <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" />
                  Notes et Commentaires
                </h3>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Ajouter des notes sur le transfert (raison, instructions particulières, etc.)..."
                  className="min-h-[80px] resize-none"
                />
                <div className="text-xs text-gray-500 mt-2">
                  Ces notes seront incluses dans l'historique des transferts pour suivi.
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex gap-3 pt-4 border-t">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsDialogOpen(false)}
                  className="flex-1"
                  disabled={createTransferMutation.isPending}
                >
                  Annuler
                </Button>
                <Button 
                  type="submit" 
                  className="flex-1 bg-blue-600 hover:bg-blue-700" 
                  disabled={createTransferMutation.isPending || !formData.productId}
                >
                  {createTransferMutation.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Création en cours...
                    </>
                  ) : (
                    <>
                      <Package className="h-4 w-4 mr-2" />
                      Créer le transfert
                    </>
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending">Demandes en attente</TabsTrigger>
          <TabsTrigger value="history">Historique des transferts</TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          <PendingTransferRequests />
        </TabsContent>

        <TabsContent value="history">
          <TransferHistory />
        </TabsContent>
      </Tabs>

    </div>
  );
}
