import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Loader2, Filter, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { ProductType } from '@prisma/client';

interface StockViewDialogProps {
  locationId: string;
  locationName: string;
  isOpen: boolean;
  onClose: () => void;
}

interface StockItem {
  id: string;
  quantity: number;
  product: {
    id: string;
    name: string;
    brand: string;
    model: string;
    type: ProductType;
  };
}

export function StockViewDialog({ locationId, locationName, isOpen, onClose }: StockViewDialogProps) {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [typeFilter, setTypeFilter] = React.useState('all');
  const [currentPage, setCurrentPage] = React.useState(1);
  const [itemsPerPage, setItemsPerPage] = React.useState(10);
  const [showFilters, setShowFilters] = React.useState(false);

  // Fetch stock items for the location
  const { data: stockItems, isLoading } = useQuery<StockItem[]>({
    queryKey: ['locationStock', locationId],
    queryFn: async () => {
      try {
        // Fetch regular inventory items
        const response = await fetch(`/api/stock/inventory?locationId=${locationId}`);
        if (!response.ok) throw new Error('Failed to fetch inventory items');
        const inventoryData = await response.json();
        
        // Check the structure of the response
        console.log('Raw inventory response:', inventoryData);
        
        // Handle the new API response structure (items property)
        const inventoryItems = inventoryData.items || inventoryData;
        
        // Fetch medical devices for this location using our new endpoint
        const devicesResponse = await fetch(`/api/medical-devices/by-location?locationId=${locationId}`);
        let medicalDevices = [];
        let diagnosticDevices = [];
        
        if (devicesResponse.ok) {
          const devicesData = await devicesResponse.json();
          medicalDevices = devicesData.medicalDevices || [];
          diagnosticDevices = devicesData.diagnosticDevices || [];
        }
        
        // Convert medical devices to the same format as stock items
        const medicalDeviceItems = medicalDevices
          .filter((device: any) => device.type !== 'DIAGNOSTIC_DEVICE') // Exclude diagnostic devices
          .map((device: any) => ({
            id: device.id,
            quantity: 1, // Medical devices are tracked individually
            product: {
              id: device.id,
              name: device.name,
              brand: device.brand || '',
              model: device.model || '',
              type: ProductType.MEDICAL_DEVICE
            }
          }));
        
        // Convert diagnostic devices to the same format as stock items
        const diagnosticDeviceItems = diagnosticDevices.map((device: any) => ({
          id: device.id,
          quantity: 1, // Diagnostic devices are tracked individually
          product: {
            id: device.id,
            name: device.name,
            brand: device.brand || '',
            model: device.model || '',
            type: ProductType.DIAGNOSTIC_DEVICE
          }
        }));
        
        // Format inventory data to ensure it has the correct structure
        // Check if inventoryItems is an array before mapping
        const formattedInventoryData = Array.isArray(inventoryItems) 
          ? inventoryItems.map((item: any) => ({
              id: item.id,
              quantity: item.quantity || 0,
              product: {
                id: item.product?.id || item.productId,
                name: item.product?.name || item.productName || 'Unknown Product',
                brand: item.product?.brand || '',
                model: item.product?.model || '',
                type: item.product?.type || (item.productType as ProductType)
              }
            }))
          : [];
        
        // Log data for debugging
        console.log('Formatted inventory data:', formattedInventoryData);
        console.log('Medical devices:', medicalDeviceItems);
        console.log('Diagnostic devices:', diagnosticDeviceItems);
        
        // Create a Set to track unique item IDs
        const uniqueItemIds = new Set();
        
        // Function to add items only if they don't already exist
        const addUniqueItems = (items: any[]) => {
          const uniqueItems = [];
          
          for (const item of items) {
            // Create a unique key based on id and type
            const uniqueKey = `${item.id}-${item.product.type}`;
            
            if (!uniqueItemIds.has(uniqueKey)) {
              uniqueItemIds.add(uniqueKey);
              uniqueItems.push(item);
            }
          }
          
          return uniqueItems;
        };
        
        // Add items in priority order (inventory first, then medical devices, then diagnostic devices)
        const uniqueInventoryItems = addUniqueItems(formattedInventoryData);
        const uniqueMedicalDeviceItems = addUniqueItems(medicalDeviceItems);
        const uniqueDiagnosticDeviceItems = addUniqueItems(diagnosticDeviceItems);
        
        // Combine all unique items
        return [...uniqueInventoryItems, ...uniqueMedicalDeviceItems, ...uniqueDiagnosticDeviceItems];
      } catch (error) {
        console.error('Error fetching stock items:', error);
        // Return empty array on error to prevent UI crashes
        return [];
      }
    },
    enabled: isOpen, // Only fetch when dialog is open
  });

  // Filter stock items based on search query and type filter
  const filteredItems = React.useMemo(() => {
    if (!stockItems) return [];
    
    let filtered = stockItems;
    
    // Apply search filter
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(item => 
        (item.product.name && item.product.name.toLowerCase().includes(query)) ||
        (item.product.brand && item.product.brand.toLowerCase().includes(query)) ||
        (item.product.model && item.product.model.toLowerCase().includes(query))
      );
    }
    
    // Apply type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(item => item.product.type === typeFilter);
    }
    
    return filtered;
  }, [stockItems, searchQuery, typeFilter]);

  // Paginate filtered items
  const paginatedItems = React.useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredItems.slice(startIndex, endIndex);
  }, [filteredItems, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);

  // Reset to first page when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, typeFilter]);

  // Pagination handlers
  const goToFirstPage = () => setCurrentPage(1);
  const goToPreviousPage = () => setCurrentPage(prev => Math.max(prev - 1, 1));
  const goToNextPage = () => setCurrentPage(prev => Math.min(prev + 1, totalPages));
  const goToLastPage = () => setCurrentPage(totalPages);

  // Group items by type for summary
  const summary = React.useMemo(() => {
    if (!stockItems) return { accessories: 0, spareParts: 0, medicalDevices: 0, diagnosticDevices: 0 };
    
    return stockItems.reduce((acc, item) => {
      const quantity = item.quantity || 0;
      
      switch(item.product.type) {
        case ProductType.ACCESSORY:
          acc.accessories += quantity;
          break;
        case ProductType.SPARE_PART:
          acc.spareParts += quantity;
          break;
        case ProductType.MEDICAL_DEVICE:
          acc.medicalDevices += quantity;
          break;
        case ProductType.DIAGNOSTIC_DEVICE:
          acc.diagnosticDevices += quantity;
          break;
      }
      
      return acc;
    }, { 
      accessories: 0, 
      spareParts: 0, 
      medicalDevices: 0, 
      diagnosticDevices: 0 
    });
  }, [stockItems]);

  // Get badge color based on product type
  const getBadgeVariant = (type: ProductType) => {
    switch(type) {
      case ProductType.ACCESSORY:
        return 'default';
      case ProductType.SPARE_PART:
        return 'secondary';
      case ProductType.MEDICAL_DEVICE:
        return 'destructive';
      case ProductType.DIAGNOSTIC_DEVICE:
        return 'outline';
      default:
        return 'default';
    }
  };

  // Get readable product type name
  const getProductTypeName = (type: ProductType) => {
    switch(type) {
      case ProductType.ACCESSORY:
        return 'Accessoire';
      case ProductType.SPARE_PART:
        return 'Pièce de rechange';
      case ProductType.MEDICAL_DEVICE:
        return 'Appareil médical';
      case ProductType.DIAGNOSTIC_DEVICE:
        return 'Équipement diagnostic';
      default:
        return type;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Stock de l&apos;emplacement: {locationName}</DialogTitle>
          <DialogDescription>
            Détails des produits stockés à cet emplacement
          </DialogDescription>
        </DialogHeader>
        
        {/* Summary section */}
        <div className="grid grid-cols-4 gap-4 mb-4">
          <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
            <div className="text-sm text-blue-600 font-medium">Accessoires</div>
            <div className="text-xl font-semibold text-blue-800">{summary.accessories}</div>
          </div>
          <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
            <div className="text-sm text-gray-600 font-medium">Pièces</div>
            <div className="text-xl font-semibold text-gray-800">{summary.spareParts}</div>
          </div>
          <div className="bg-red-50 p-3 rounded-lg border border-red-200">
            <div className="text-sm text-red-600 font-medium">Appareils</div>
            <div className="text-xl font-semibold text-red-800">{summary.medicalDevices}</div>
          </div>
          <div className="bg-purple-50 p-3 rounded-lg border border-purple-200">
            <div className="text-sm text-purple-600 font-medium">Diagnostics</div>
            <div className="text-xl font-semibold text-purple-800">{summary.diagnosticDevices}</div>
          </div>
        </div>
        
        {/* Search and Filters */}
        <div className="space-y-4 mb-4">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search bar */}
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                type="text"
                placeholder="Rechercher un produit..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
            
            {/* Filter toggle button */}
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2"
            >
              <Filter className="h-4 w-4" />
              Filtres {showFilters ? '▲' : '▼'}
            </Button>
          </div>
          
          {/* Advanced filters */}
          {showFilters && (
            <div className="flex flex-col md:flex-row gap-4 p-4 bg-gray-50 rounded-lg border">
              <div className="flex-1">
                <label className="text-sm font-medium text-gray-700 mb-1 block">Type de produit</label>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
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
              
              <div className="flex-1">
                <label className="text-sm font-medium text-gray-700 mb-1 block">Éléments par page</label>
                <Select value={itemsPerPage.toString()} onValueChange={(value) => setItemsPerPage(parseInt(value))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5 par page</SelectItem>
                    <SelectItem value="10">10 par page</SelectItem>
                    <SelectItem value="25">25 par page</SelectItem>
                    <SelectItem value="50">50 par page</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          
          {/* Results info */}
          <div className="flex justify-between items-center text-sm text-gray-600">
            <span>
              {filteredItems.length} produit{filteredItems.length !== 1 ? 's' : ''} trouvé{filteredItems.length !== 1 ? 's' : ''}
              {filteredItems.length !== stockItems?.length && ` sur ${stockItems?.length || 0} total`}
            </span>
            {totalPages > 1 && (
              <span>
                Page {currentPage} sur {totalPages}
              </span>
            )}
          </div>
        </div>
        
        {/* Stock items table */}
        <div className="flex-1 overflow-auto border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produit</TableHead>
                <TableHead>Marque/Modèle</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-center">Quantité</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8">
                    <div className="flex justify-center items-center">
                      <Loader2 className="h-6 w-6 animate-spin mr-2" />
                      <span>Chargement des produits...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : paginatedItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8">
                    {searchQuery || typeFilter !== 'all' ? 'Aucun produit trouvé avec les filtres actuels' : 'Aucun produit dans cet emplacement'}
                  </TableCell>
                </TableRow>
              ) : (
                paginatedItems.map((item) => (
                  <TableRow key={item.id} className="hover:bg-gray-50">
                    <TableCell className="font-medium">
                      <div className="max-w-xs truncate" title={item.product.name}>
                        {item.product.name}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {item.product.brand && (
                          <div className="font-medium text-sm">{item.product.brand}</div>
                        )}
                        {item.product.model && (
                          <div className="text-xs text-gray-500">{item.product.model}</div>
                        )}
                        {!item.product.brand && !item.product.model && (
                          <span className="text-gray-400">-</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getBadgeVariant(item.product.type)}>
                        {getProductTypeName(item.product.type)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="inline-flex items-center justify-center w-8 h-8 text-sm font-medium bg-blue-100 text-blue-800 rounded-full">
                        {item.quantity}
                      </span>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        
        {/* Pagination controls */}
        {totalPages > 1 && (
          <div className="flex justify-between items-center pt-4 border-t">
            <div className="text-sm text-gray-600">
              Affichage de {(currentPage - 1) * itemsPerPage + 1} à {Math.min(currentPage * itemsPerPage, filteredItems.length)} sur {filteredItems.length} produits
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
                Page {currentPage} sur {totalPages}
              </span>
              
              <Button
                variant="outline"
                size="icon"
                onClick={goToNextPage}
                disabled={currentPage === totalPages}
                className="h-8 w-8 p-0"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={goToLastPage}
                disabled={currentPage === totalPages}
                className="h-8 w-8 p-0"
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
        
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose}>
            Fermer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default StockViewDialog;
