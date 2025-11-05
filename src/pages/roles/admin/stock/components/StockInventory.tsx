import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Define product types enum to match the database
enum ProductType {
  MEDICAL_DEVICE = 'MEDICAL_DEVICE',
  DIAGNOSTIC_DEVICE = 'DIAGNOSTIC_DEVICE',
  ACCESSORY = 'ACCESSORY',
  SPARE_PART = 'SPARE_PART'
}

interface Stock {
  id: string;
  location: {
    id: string;
    name: string;
  };
  product: {
    id: string;
    name: string;
    model: string;
    brand: string;
    type: string;
    serialNumber?: string;
  };
  quantity: number;
  status: string;
  isDevice?: boolean;
  reservedFor?: {
    id: string;
    name: string;
    telephone: string;
    isCompany: boolean;
    diagnosticId: string;
    diagnosticDate: string;
    resultDueDate: string | null;
  } | null;
}

interface InventoryResponse {
  items: Stock[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  summary: {
    total: number;
    accessories: number;
    spareParts: number;
    medicalDevices: number;
    diagnosticDevices: number;
  };
}

export default function StockInventory() {
  // State for filters and pagination
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');

  // Debounce search query to avoid too many API calls
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedLocation, selectedType, debouncedSearchQuery]);

  // Fetch locations
  const { data: locations } = useQuery({
    queryKey: ['stockLocations'],
    queryFn: async () => {
      const response = await fetch('/api/stock/locations');
      if (!response.ok) throw new Error('Failed to fetch locations');
      return response.json();
    }
  });

  // Fetch inventory data with pagination and filters
  const { data: inventoryData, isLoading } = useQuery<InventoryResponse>({
    queryKey: ['inventory', selectedLocation, selectedType, debouncedSearchQuery, currentPage, itemsPerPage],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedLocation !== 'all') {
        params.append('locationId', selectedLocation);
      }
      if (selectedType !== 'all') {
        params.append('productType', selectedType);
      }
      if (debouncedSearchQuery) {
        params.append('search', debouncedSearchQuery);
      }
      params.append('page', currentPage.toString());
      params.append('limit', itemsPerPage.toString());
      
      const response = await fetch(`/api/stock/inventory?${params}`);
      if (!response.ok) throw new Error('Failed to fetch inventory');
      return response.json();
    }
  });

  // Pagination handlers
  const goToFirstPage = () => setCurrentPage(1);
  const goToPreviousPage = () => setCurrentPage(prev => Math.max(prev - 1, 1));
  const goToNextPage = () => {
    if (inventoryData && currentPage < inventoryData.pagination.totalPages) {
      setCurrentPage(prev => prev + 1);
    }
  };
  const goToLastPage = () => {
    if (inventoryData) {
      setCurrentPage(inventoryData.pagination.totalPages);
    }
  };

  // Get badge for product type
  const getTypeBadge = (type: string) => {
    switch (type) {
      case ProductType.ACCESSORY:
        return <Badge variant="default">Accessoire</Badge>;
      case ProductType.SPARE_PART:
        return <Badge variant="secondary">Pièce de rechange</Badge>;
      case ProductType.MEDICAL_DEVICE:
        return <Badge variant="destructive">Appareil médical</Badge>;
      case ProductType.DIAGNOSTIC_DEVICE:
        return <Badge variant="outline">Équipement diagnostic</Badge>;
      default:
        return <Badge>{type}</Badge>;
    }
  };

  // Get badge for stock status
  const getStatusBadge = (status: string, isDevice: boolean = false, reservedFor?: any) => {
    if (isDevice) {
      switch (status) {
        case 'ACTIVE':
          return (
            <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
              Actif
            </Badge>
          );
        case 'MAINTENANCE':
          return (
            <Badge variant="secondary">
              En Maintenance
            </Badge>
          );
        case 'RETIRED':
          return (
            <Badge variant="destructive">
              Retiré
            </Badge>
          );
        case 'RESERVED':
          return (
            <div className="flex flex-col gap-1">
              <Badge variant="warning">
                Réservé
              </Badge>
              {reservedFor && (
                <div className="text-xs text-gray-500">
                  Pour: {reservedFor.name}
                </div>
              )}
            </div>
          );
        default:
          return <Badge variant="outline">{status}</Badge>;
      }
    } else {
      switch (status) {
        case 'FOR_SALE':
          return <Badge variant="default">En vente</Badge>;
        case 'FOR_RENT':
          return <Badge variant="secondary">En location</Badge>;
        case 'IN_REPAIR':
          return <Badge variant="destructive">En réparation</Badge>;
        case 'OUT_OF_SERVICE':
          return <Badge variant="outline">Hors service</Badge>;
        default:
          return <Badge>{status}</Badge>;
      }
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Chargement de l&apos;inventaire...</span>
      </div>
    );
  }

  // Get summary data
  const summary = inventoryData?.summary || {
    total: 0,
    accessories: 0,
    spareParts: 0,
    medicalDevices: 0,
    diagnosticDevices: 0
  };

  // Correct total: sum of all product type quantities
  const trueTotal =
    (summary.accessories || 0) +
    (summary.spareParts || 0) +
    (summary.medicalDevices || 0) +
    (summary.diagnosticDevices || 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Inventaire du Stock</h2>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{trueTotal}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Accessoires</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.accessories}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pièces</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.spareParts}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Appareils</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.medicalDevices}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Diagnostics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.diagnosticDevices}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
        <div className="w-full md:w-[200px]">
          <Select value={selectedLocation} onValueChange={setSelectedLocation}>
            <SelectTrigger>
              <SelectValue placeholder="Tous les emplacements" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les emplacements</SelectItem>
              {locations?.map((location: { id: string; name: string }) => (
                <SelectItem key={location.id} value={location.id}>
                  {location.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="w-full md:w-[200px]">
          <Select value={selectedType} onValueChange={setSelectedType}>
            <SelectTrigger>
              <SelectValue placeholder="Tous les types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les types</SelectItem>
              <SelectItem value={ProductType.ACCESSORY}>Accessoires</SelectItem>
              <SelectItem value={ProductType.SPARE_PART}>Pièces de rechange</SelectItem>
              <SelectItem value={ProductType.MEDICAL_DEVICE}>Appareils médicaux</SelectItem>
              <SelectItem value={ProductType.DIAGNOSTIC_DEVICE}>Équipements diagnostic</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
          <Input
            className="pl-8"
            placeholder="Rechercher par nom, marque ou modèle..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="w-full md:w-auto">
          <Select 
            value={itemsPerPage.toString()} 
            onValueChange={(value) => setItemsPerPage(parseInt(value))}
          >
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="10 par page" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10 par page</SelectItem>
              <SelectItem value="25">25 par page</SelectItem>
              <SelectItem value="50">50 par page</SelectItem>
              <SelectItem value="100">100 par page</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Inventory table - Excel style */}
      <div className="border rounded-lg bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead className="bg-slate-50 sticky top-0 z-10">
              <tr className="border-b border-slate-200">
                <th className="px-3 py-3 text-left text-xs font-semibold text-slate-700 border-r border-slate-200 min-w-[200px]">Produit</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-slate-700 border-r border-slate-200 min-w-[120px]">Marque</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-slate-700 border-r border-slate-200 min-w-[120px]">Modèle</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-slate-700 border-r border-slate-200 min-w-[140px]">N° Série</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-slate-700 border-r border-slate-200 min-w-[150px]">Type</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-slate-700 border-r border-slate-200 min-w-[150px]">Emplacement</th>
                <th className="px-3 py-3 text-center text-xs font-semibold text-slate-700 border-r border-slate-200 min-w-[100px]">Quantité</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-slate-700 min-w-[150px]">Statut</th>
              </tr>
            </thead>
            <tbody>
              {inventoryData?.items.map((item, index) => (
                <tr
                  key={item.id}
                  className={`border-b border-slate-100 hover:bg-blue-50/50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}
                >
                  <td className="px-3 py-2.5 text-sm font-medium text-slate-900 border-r border-slate-100">
                    <div className="max-w-[200px] truncate" title={item.product.name}>
                      {item.product.name}
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-xs text-slate-600 border-r border-slate-100">
                    {item.product.brand || '-'}
                  </td>
                  <td className="px-3 py-2.5 text-xs text-slate-600 border-r border-slate-100">
                    {item.product.model || '-'}
                  </td>
                  <td className="px-3 py-2.5 text-xs border-r border-slate-100">
                    {item.product.serialNumber ? (
                      <Badge variant="outline" className="font-mono text-xs">
                        {item.product.serialNumber}
                      </Badge>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 border-r border-slate-100">
                    {getTypeBadge(item.product.type)}
                  </td>
                  <td className="px-3 py-2.5 text-xs text-slate-600 border-r border-slate-100">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0"></div>
                      <span>{item.location.name}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-center border-r border-slate-100">
                    <span className="inline-flex items-center justify-center min-w-[32px] h-7 px-2 text-xs font-semibold bg-blue-100 text-blue-800 rounded">
                      {item.quantity}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      {getStatusBadge(item.status, item.isDevice, item.reservedFor)}
                      {item.status === 'RESERVED' && item.reservedFor && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                <Search className="h-3.5 w-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" className="w-72 p-4">
                              <div className="space-y-2">
                                <h4 className="font-semibold text-sm">Détails de la réservation</h4>
                                <div className="text-xs space-y-1">
                                  <div className="flex justify-between">
                                    <span className="font-medium">{item.reservedFor.isCompany ? 'Société:' : 'Patient:'}</span>
                                    <span>{item.reservedFor.name}</span>
                                  </div>
                                  {item.reservedFor.telephone && (
                                    <div className="flex justify-between">
                                      <span className="font-medium">Téléphone:</span>
                                      <span>{item.reservedFor.telephone}</span>
                                    </div>
                                  )}
                                  <div className="flex justify-between">
                                    <span className="font-medium">Date de diagnostic:</span>
                                    <span>{new Date(item.reservedFor.diagnosticDate).toLocaleDateString('fr-FR')}</span>
                                  </div>
                                  {item.reservedFor.resultDueDate && (
                                    <div className="flex justify-between">
                                      <span className="font-medium">Date de résultat prévue:</span>
                                      <span>{new Date(item.reservedFor.resultDueDate).toLocaleDateString('fr-FR')}</span>
                                    </div>
                                  )}
                                  <div className="mt-2 pt-2 border-t border-gray-100">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="w-full mt-1 text-xs h-7"
                                      onClick={() => window.open(`/roles/admin/diagnostics/${item.reservedFor?.diagnosticId}`, '_blank')}
                                    >
                                      Voir le diagnostic
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {(!inventoryData?.items || inventoryData.items.length === 0) && (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-500">
                    Aucun produit trouvé
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination controls */}
      {inventoryData && inventoryData.pagination.totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 bg-white border border-slate-200 rounded-lg">
          <div className="flex items-center space-x-4">
            <div className="text-sm text-slate-600">
              <span className="font-semibold text-slate-900">{inventoryData.pagination.total}</span> produits au total
            </div>
            <div className="text-xs text-slate-500">
              Affichage {(currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, inventoryData.pagination.total)}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={goToPreviousPage}
              disabled={currentPage === 1}
              className="h-9 px-3"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Précédent
            </Button>

            <div className="flex items-center space-x-1">
              {Array.from({ length: Math.min(5, inventoryData.pagination.totalPages) }, (_, i) => {
                let pageNum;
                if (inventoryData.pagination.totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= inventoryData.pagination.totalPages - 2) {
                  pageNum = inventoryData.pagination.totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }

                return (
                  <Button
                    key={pageNum}
                    variant={currentPage === pageNum ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(pageNum)}
                    className="h-9 w-9 p-0"
                  >
                    {pageNum}
                  </Button>
                );
              })}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={goToNextPage}
              disabled={currentPage === inventoryData.pagination.totalPages}
              className="h-9 px-3"
            >
              Suivant
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
