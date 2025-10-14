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
import { Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Loader2, ArrowRightLeft, Package } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import TransferRequestDialog from './TransferRequestDialog';

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
}

interface GlobalStockResponse {
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

export default function GlobalStockView() {
  // State for filters and pagination
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');

  // Transfer request dialog state
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Stock | null>(null);

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

  // Fetch locations for filtering
  const { data: locations } = useQuery({
    queryKey: ['stockLocations'],
    queryFn: async () => {
      const response = await fetch('/api/stock/locations');
      if (!response.ok) throw new Error('Failed to fetch locations');
      return response.json();
    }
  });

  // Fetch global stock inventory
  const { data: globalStockData, isLoading } = useQuery<GlobalStockResponse>({
    queryKey: ['globalStockInventory', selectedLocation, selectedType, debouncedSearchQuery, currentPage, itemsPerPage],
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
      if (!response.ok) throw new Error('Failed to fetch global inventory');
      return response.json();
    }
  });

  // Pagination handlers
  const goToFirstPage = () => setCurrentPage(1);
  const goToPreviousPage = () => setCurrentPage(prev => Math.max(prev - 1, 1));
  const goToNextPage = () => {
    if (globalStockData && currentPage < globalStockData.pagination.totalPages) {
      setCurrentPage(prev => prev + 1);
    }
  };
  const goToLastPage = () => {
    if (globalStockData) {
      setCurrentPage(globalStockData.pagination.totalPages);
    }
  };

  // Handle transfer request
  const handleRequestTransfer = (product: Stock) => {
    setSelectedProduct(product);
    setTransferDialogOpen(true);
  };

  // Get badge for product type
  const getTypeBadge = (type: string) => {
    switch (type) {
      case ProductType.ACCESSORY:
        return <Badge variant="default" className="bg-blue-100 text-blue-800 border-blue-200">Accessoire</Badge>;
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
  const getStatusBadge = (status: string, isDevice: boolean = false) => {
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
        default:
          return <Badge variant="outline">{status}</Badge>;
      }
    } else {
      switch (status) {
        case 'FOR_SALE':
          return <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">En vente</Badge>;
        case 'FOR_RENT':
          return <Badge variant="secondary">En location</Badge>;
        case 'EN_REPARATION':
          return <Badge variant="destructive">En réparation</Badge>;
        case 'HORS_SERVICE':
          return <Badge variant="outline">Hors service</Badge>;
        default:
          return <Badge>{status}</Badge>;
      }
    }
  };

  // Check if product is available for transfer
  const canRequestTransfer = (item: Stock) => {
    return item.quantity > 0 && 
           (item.status === 'FOR_SALE' || item.status === 'ACTIVE');
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <span className="ml-2">Chargement du stock global...</span>
      </div>
    );
  }

  // Get summary data
  const summary = globalStockData?.summary || {
    total: 0,
    accessories: 0,
    spareParts: 0,
    medicalDevices: 0,
    diagnosticDevices: 0
  };

  // Calculate total correctly
  const trueTotal =
    (summary.accessories || 0) +
    (summary.spareParts || 0) +
    (summary.medicalDevices || 0) +
    (summary.diagnosticDevices || 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-blue-700">Stock Global</h2>
          <p className="text-sm text-gray-600">
            Consultez l'inventaire de tous les emplacements et demandez des transferts
          </p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="border-blue-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700">{trueTotal}</div>
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
            <SelectTrigger className="border-blue-200 focus:ring-blue-500">
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
            <SelectTrigger className="border-blue-200 focus:ring-blue-500">
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
            className="pl-8 border-blue-200 focus:ring-blue-500"
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
            <SelectTrigger className="w-[120px] border-blue-200 focus:ring-blue-500">
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

      {/* Inventory table */}
      <div className="border rounded-lg border-blue-200">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Produit</TableHead>
              <TableHead>Marque</TableHead>
              <TableHead>Modèle</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Emplacement</TableHead>
              <TableHead>Quantité</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {globalStockData?.items.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.product.name}</TableCell>
                <TableCell>{item.product.brand || '-'}</TableCell>
                <TableCell>{item.product.model || '-'}</TableCell>
                <TableCell>{getTypeBadge(item.product.type)}</TableCell>
                <TableCell>{item.location.name}</TableCell>
                <TableCell className="font-semibold">{item.quantity}</TableCell>
                <TableCell>
                  {getStatusBadge(item.status, item.isDevice)}
                </TableCell>
                <TableCell>
                  {canRequestTransfer(item) ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRequestTransfer(item)}
                      className="text-xs hover:bg-blue-50 hover:border-blue-300"
                    >
                      <ArrowRightLeft className="h-3 w-3 mr-1" />
                      Demander
                    </Button>
                  ) : (
                    <span className="text-xs text-gray-400">Non disponible</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {(!globalStockData?.items || globalStockData.items.length === 0) && (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  <div className="flex flex-col items-center">
                    <Package className="h-12 w-12 text-gray-400 mb-2" />
                    <span className="text-gray-500">Aucun produit trouvé</span>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination controls */}
      {globalStockData && globalStockData.pagination.totalPages > 1 && (
        <div className="flex justify-between items-center">
          <div className="text-sm text-muted-foreground">
            Affichage de {(currentPage - 1) * itemsPerPage + 1} à {Math.min(currentPage * itemsPerPage, globalStockData.pagination.total)} sur {globalStockData.pagination.total} produits
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="icon"
              onClick={goToFirstPage}
              disabled={currentPage === 1}
              className="h-8 w-8 p-0"
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={goToPreviousPage}
              disabled={currentPage === 1}
              className="h-8 w-8 p-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <span className="text-sm">
              Page {currentPage} sur {globalStockData.pagination.totalPages}
            </span>
            
            <Button
              variant="outline"
              size="icon"
              onClick={goToNextPage}
              disabled={currentPage === globalStockData.pagination.totalPages}
              className="h-8 w-8 p-0"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={goToLastPage}
              disabled={currentPage === globalStockData.pagination.totalPages}
              className="h-8 w-8 p-0"
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Transfer Request Dialog */}
      <TransferRequestDialog
        isOpen={transferDialogOpen}
        onClose={() => {
          setTransferDialogOpen(false);
          setSelectedProduct(null);
        }}
        product={selectedProduct}
      />
    </div>
  );
}