import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Eye, Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import StockViewDialog from './StockViewDialog';
import { LocationForm } from '@/components/appareils/LocationForm';

interface StockLocation {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  user: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
  _count: {
    stocks: number;
    products: number;
    medicalDevices: number;
  };
  accessoryCount?: number;
  sparePartCount?: number;
  accessoryQuantity?: number;
  sparePartQuantity?: number;
  medicalDeviceCount?: number;
  diagnosticDeviceCount?: number;
  totalDeviceCount?: number;
  createdAt: string;
}

export default function StockLocations() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  // Stock view dialog state
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<StockLocation | null>(null);
  
  // Search and pagination state
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredLocations, setFilteredLocations] = useState<StockLocation[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [paginatedData, setPaginatedData] = useState<StockLocation[]>([]);
  const [totalPages, setTotalPages] = useState(1);

  // Fetch stock locations
  const { data: locations, isLoading } = useQuery<StockLocation[]>({
    queryKey: ['stockLocations'],
    queryFn: async () => {
      const response = await fetch('/api/stock/locations');
      if (!response.ok) throw new Error('Failed to fetch locations');
      return response.json();
    }
  });

  useEffect(() => {
    if (locations) {
      // Locations now come with pre-calculated counts from the API
      console.log('Locations with counts from API:', locations);
      setFilteredLocations(locations);
    }
  }, [locations]);
  
  // Handle successful location creation
  const handleLocationCreated = () => {
    setIsDialogOpen(false);
    queryClient.invalidateQueries({ queryKey: ['stockLocations'] });
  };
  
  // Handle opening the stock view dialog
  const handleViewStock = (location: StockLocation) => {
    setSelectedLocation(location);
    setViewDialogOpen(true);
  };

  // Filter locations based on search query
  useEffect(() => {
    if (!locations) {
      setFilteredLocations([]);
      return;
    }
    
    if (searchQuery.trim() === '') {
      setFilteredLocations(locations);
    } else {
      const query = searchQuery.toLowerCase().trim();
      const filtered = locations.filter((location) => 
        (location.name && location.name.toLowerCase().includes(query)) ||
        (location.description && location.description.toLowerCase().includes(query)) ||
        (location.user && location.user.firstName && location.user.firstName.toLowerCase().includes(query)) ||
        (location.user && location.user.lastName && location.user.lastName.toLowerCase().includes(query))
      );
      setFilteredLocations(filtered);
    }
    // Reset to first page when search changes
    setCurrentPage(1);
  }, [searchQuery, locations]);
  
  // Update paginated data when filtered data changes or pagination settings change
  useEffect(() => {
    if (!filteredLocations) {
      setPaginatedData([]);
      setTotalPages(1);
      return;
    }
    
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    setPaginatedData(filteredLocations.slice(startIndex, endIndex));
    setTotalPages(Math.max(1, Math.ceil(filteredLocations.length / itemsPerPage)));
    
    // Reset to page 1 if current page is out of bounds after data change
    if (currentPage > Math.ceil(filteredLocations.length / itemsPerPage) && filteredLocations.length > 0) {
      setCurrentPage(1);
    }
  }, [filteredLocations, currentPage, itemsPerPage]);
  
  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };
  
  // Handle items per page change
  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(Number(value));
    setCurrentPage(1); // Reset to first page when changing items per page
  };
  
  // Pagination navigation functions
  const goToFirstPage = () => setCurrentPage(1);
  const goToLastPage = () => setCurrentPage(totalPages);
  const goToPreviousPage = () => currentPage > 1 && setCurrentPage(currentPage - 1);
  const goToNextPage = () => currentPage < totalPages && setCurrentPage(currentPage + 1);
  
  if (isLoading) {
    return <div>Chargement...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Emplacements de Stock</h2>
        <div className="flex items-center space-x-2">
          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              type="text"
              placeholder="Rechercher un emplacement..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="pl-8 w-64"
            />
          </div>
          {/* Add Location Dialog */}
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="h-10 flex items-center">
                <Plus className="h-4 w-4 mr-2" />
                Ajouter un emplacement
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Ajouter un nouvel emplacement</DialogTitle>
              </DialogHeader>
              <LocationForm onSuccess={handleLocationCreated} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stock Distribution Overview */}
      {filteredLocations && filteredLocations.length > 0 && (
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-lg border border-blue-200">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            Répartition du Stock par Emplacement
          </h3>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Products Distribution */}
            <div className="space-y-4">
              <h4 className="font-medium text-blue-800 flex items-center gap-2">
                <span className="w-4 h-4 bg-blue-500 rounded"></span>
                Répartition des Produits
              </h4>
              <div className="space-y-2">
                {filteredLocations
                  .sort((a, b) => ((b.accessoryQuantity || 0) + (b.sparePartQuantity || 0)) - ((a.accessoryQuantity || 0) + (a.sparePartQuantity || 0)))
                  .slice(0, 5)
                  .map((location) => {
                    const totalProducts = (location.accessoryQuantity || 0) + (location.sparePartQuantity || 0);
                    const maxProducts = Math.max(...filteredLocations.map(l => (l.accessoryQuantity || 0) + (l.sparePartQuantity || 0)));
                    const percentage = maxProducts > 0 ? (totalProducts / maxProducts) * 100 : 0;
                    
                    return (
                      <div key={location.id} className="space-y-1">
                        <div className="flex justify-between items-center text-sm">
                          <span className="font-medium text-gray-700 truncate max-w-32" title={location.name}>
                            {location.name}
                          </span>
                          <span className="font-bold text-blue-700">
                            {totalProducts.toLocaleString()}
                          </span>
                        </div>
                        <div className="w-full bg-blue-100 rounded-full h-2">
                          <div 
                            className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Devices Distribution */}
            <div className="space-y-4">
              <h4 className="font-medium text-red-800 flex items-center gap-2">
                <span className="w-4 h-4 bg-red-500 rounded"></span>
                Répartition des Appareils
              </h4>
              <div className="space-y-2">
                {filteredLocations
                  .sort((a, b) => (b.totalDeviceCount || 0) - (a.totalDeviceCount || 0))
                  .slice(0, 5)
                  .map((location) => {
                    const totalDevices = location.totalDeviceCount || 0;
                    const maxDevices = Math.max(...filteredLocations.map(l => l.totalDeviceCount || 0));
                    const percentage = maxDevices > 0 ? (totalDevices / maxDevices) * 100 : 0;
                    
                    return (
                      <div key={location.id} className="space-y-1">
                        <div className="flex justify-between items-center text-sm">
                          <span className="font-medium text-gray-700 truncate max-w-32" title={location.name}>
                            {location.name}
                          </span>
                          <span className="font-bold text-red-700">
                            {totalDevices.toLocaleString()}
                          </span>
                        </div>
                        <div className="w-full bg-red-100 rounded-full h-2">
                          <div 
                            className="bg-gradient-to-r from-red-500 to-red-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-4 border-t border-blue-200">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {filteredLocations.reduce((sum, location) => sum + ((location.accessoryQuantity || 0) + (location.sparePartQuantity || 0)), 0).toLocaleString()}
              </div>
              <div className="text-xs text-blue-700 font-medium">Total Produits</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {filteredLocations.reduce((sum, location) => sum + (location.totalDeviceCount || 0), 0).toLocaleString()}
              </div>
              <div className="text-xs text-red-700 font-medium">Total Appareils</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {filteredLocations.filter(location => location.isActive).length}
              </div>
              <div className="text-xs text-green-700 font-medium">Emplacements Actifs</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {filteredLocations.reduce((sum, location) => sum + ((location.accessoryCount || 0) + (location.sparePartCount || 0)), 0).toLocaleString()}
              </div>
              <div className="text-xs text-purple-700 font-medium">Types de Produits</div>
            </div>
          </div>
        </div>
      )}

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Responsable</TableHead>
              <TableHead>Produits</TableHead>
              <TableHead>Appareils</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData?.map((location) => (
              <TableRow key={location.id} className="hover:bg-gray-50">
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                    <span className="max-w-xs truncate" title={location.name}>
                      {location.name}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="max-w-xs truncate" title={location.description || '-'}>
                    {location.description || <span className="text-gray-400">-</span>}
                  </div>
                </TableCell>
                <TableCell>
                  {location.user ? (
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-xs font-medium text-blue-700">
                        {location.user.firstName[0]}{location.user.lastName[0]}
                      </div>
                      <span className="text-sm">
                        {location.user.firstName} {location.user.lastName}
                      </span>
                    </div>
                  ) : (
                    <span className="text-gray-400 text-sm italic">Non assigné</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center justify-center min-w-12 h-8 px-2 text-sm font-bold bg-blue-100 text-blue-800 rounded-lg border border-blue-200">
                        {((location.accessoryQuantity || 0) + (location.sparePartQuantity || 0)).toLocaleString()}
                      </span>
                      <span className="text-sm font-medium text-blue-700">produits</span>
                    </div>
                    <div className="text-xs text-gray-500 space-y-1 bg-gray-50 p-2 rounded">
                      <div className="flex justify-between">
                        <span>Accessoires:</span>
                        <span className="font-medium">{(location.accessoryQuantity || 0).toLocaleString()} ({location.accessoryCount || 0} types)</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Pièces:</span>
                        <span className="font-medium">{(location.sparePartQuantity || 0).toLocaleString()} ({location.sparePartCount || 0} types)</span>
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center justify-center min-w-12 h-8 px-2 text-sm font-bold bg-red-100 text-red-800 rounded-lg border border-red-200">
                        {(location.totalDeviceCount || 0).toLocaleString()}
                      </span>
                      <span className="text-sm font-medium text-red-700">appareils</span>
                    </div>
                    <div className="text-xs text-gray-500 space-y-1 bg-gray-50 p-2 rounded">
                      <div className="flex justify-between">
                        <span>Médicaux:</span>
                        <span className="font-medium">{(location.medicalDeviceCount || 0).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Diagnostics:</span>
                        <span className="font-medium">{(location.diagnosticDeviceCount || 0).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge 
                    variant={location.isActive ? "default" : "destructive"} 
                    className={location.isActive ? "bg-green-100 text-green-800 border-green-200" : ""}
                  >
                    {location.isActive ? 'Actif' : 'Inactif'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleViewStock(location)}
                    className="h-8 px-3 text-xs hover:bg-blue-50 hover:border-blue-200"
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    Voir le stock
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {!paginatedData?.length && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                      <Search className="h-6 w-6 text-gray-400" />
                    </div>
                    <span>Aucun emplacement trouvé</span>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      
      {/* Pagination controls */}
      {filteredLocations && filteredLocations.length > 0 && (
        <div className="flex items-center justify-between px-2 py-4 border-t">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-700">
              Affichage de {paginatedData.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} à {Math.min(currentPage * itemsPerPage, filteredLocations.length)} sur {filteredLocations.length} emplacements
            </span>
          </div>
          
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-700">Lignes par page:</span>
              <Select
                value={itemsPerPage.toString()}
                onValueChange={handleItemsPerPageChange}
              >
                <SelectTrigger className="h-8 w-[70px]">
                  <SelectValue placeholder={itemsPerPage.toString()} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5</SelectItem>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
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
        </div>
      )}
      
      {/* Stock View Dialog */}
      {selectedLocation && (
        <StockViewDialog
          locationId={selectedLocation.id}
          locationName={selectedLocation.name}
          isOpen={viewDialogOpen}
          onClose={() => setViewDialogOpen(false)}
        />
      )}
    </div>
  );
}