import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Product, ProductType } from "@/types";
import { History, Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Filter, X } from "lucide-react";

import { Info } from 'lucide-react';

interface MedicalDevicesTableProps {
  products: Product[];
  onViewHistory: (product: Product) => void;
  renderActionButtons: (product: Product) => React.ReactNode;
  initialItemsPerPage?: number;
}

export const MedicalDevicesTable: React.FC<MedicalDevicesTableProps> = ({ 
  products = [], 
  onViewHistory,
  renderActionButtons,
  initialItemsPerPage = 10
}: MedicalDevicesTableProps) => {
  const router = useRouter();

  // Memoize the filtering of medical devices to prevent re-renders
  const allMedicalDevices = useMemo(() => 
    products?.filter(p => p?.type === ProductType.MEDICAL_DEVICE) || []
  , [products]);
  
  // Search and pagination state
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredDevices, setFilteredDevices] = useState<Product[]>(allMedicalDevices);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(initialItemsPerPage);
  const [paginatedData, setPaginatedData] = useState<Product[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  
  // Filter state
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [brandFilter, setBrandFilter] = useState<string>('');
  const [locationFilter, setLocationFilter] = useState<string>('');
  const [reservedFilter, setReservedFilter] = useState<string>(''); // 'all', 'reserved', 'not_reserved'
  
  // Get unique values for filter dropdowns
  const uniqueStatuses = useMemo(() => {
    const statuses = [...new Set(allMedicalDevices.map(device => device.status).filter(Boolean))];
    return statuses.sort();
  }, [allMedicalDevices]);

  const uniqueBrands = useMemo(() => {
    const brands = [...new Set(allMedicalDevices.map(device => device.brand).filter(Boolean))];
    return brands.sort();
  }, [allMedicalDevices]);

  const uniqueLocations = useMemo(() => {
    const locations = [...new Set(allMedicalDevices
      .map(device => device.stockLocation?.name)
      .filter(Boolean))];
    return locations.sort();
  }, [allMedicalDevices]);
  
  // Filter devices based on search query and filters
  useEffect(() => {
    let filtered = allMedicalDevices;

    // Apply search query
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(item => 
        (item.name && item.name.toLowerCase().includes(query)) ||
        (item.brand && item.brand.toLowerCase().includes(query)) ||
        (item.model && item.model.toLowerCase().includes(query)) ||
        (item.serialNumber && item.serialNumber.toLowerCase().includes(query)) ||
        ((item as any).deviceCode && (item as any).deviceCode.toLowerCase().includes(query)) ||
        (item.stockLocation && typeof item.stockLocation === 'object' && 
         item.stockLocation.name && item.stockLocation.name.toLowerCase().includes(query))
      );
    }

    // Apply status filter
    if (statusFilter && statusFilter !== 'all') {
      filtered = filtered.filter(item => item.status === statusFilter);
    }

    // Apply brand filter
    if (brandFilter && brandFilter !== 'all') {
      filtered = filtered.filter(item => item.brand === brandFilter);
    }

    // Apply location filter
    if (locationFilter && locationFilter !== 'all') {
      filtered = filtered.filter(item => item.stockLocation?.name === locationFilter);
    }

    // Apply reserved filter
    if (reservedFilter === 'reserved') {
      filtered = filtered.filter(item => item.reservedUntil && new Date(item.reservedUntil) > new Date());
    } else if (reservedFilter === 'not_reserved') {
      filtered = filtered.filter(item => !item.reservedUntil || new Date(item.reservedUntil) <= new Date());
    }

    setFilteredDevices(filtered);
    // Reset to first page when filters change
    setCurrentPage(1);
  }, [searchQuery, allMedicalDevices, statusFilter, brandFilter, locationFilter, reservedFilter]);
  
  // Update paginated data when filtered data changes or pagination settings change
  useEffect(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    setPaginatedData(filteredDevices.slice(startIndex, endIndex));
    setTotalPages(Math.max(1, Math.ceil(filteredDevices.length / itemsPerPage)));
    
    // Reset to page 1 if current page is out of bounds after data change
    if (currentPage > Math.ceil(filteredDevices.length / itemsPerPage) && filteredDevices.length > 0) {
      setCurrentPage(1);
    }
  }, [filteredDevices, currentPage, itemsPerPage]);
  
  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };
  
  // Handle items per page change
  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(Number(value));
    setCurrentPage(1); // Reset to first page when changing items per page
  };

  // Clear all filters
  const clearAllFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setBrandFilter('all');
    setLocationFilter('all');
    setReservedFilter('all');
  };

  // Check if any filters are active
  const hasActiveFilters = searchQuery || 
    (statusFilter && statusFilter !== 'all') || 
    (brandFilter && brandFilter !== 'all') || 
    (locationFilter && locationFilter !== 'all') || 
    (reservedFilter && reservedFilter !== 'all');
  
  // Pagination navigation functions
  const goToFirstPage = () => setCurrentPage(1);
  const goToLastPage = () => setCurrentPage(totalPages);
  const goToPreviousPage = () => currentPage > 1 && setCurrentPage(currentPage - 1);
  const goToNextPage = () => currentPage < totalPages && setCurrentPage(currentPage + 1);

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'default';
      case 'MAINTENANCE':
        return 'secondary';
      case 'RETIRED':
        return 'destructive';
      case 'RESERVED':
        return 'warning';
      case 'SOLD':
        return 'success';
      default:
        return 'outline';
    }
  };

  const getLocationName = (device: Product) => {
    if (!device?.stockLocation) return "Non assigné";
    return device.stockLocation.name;
  };

  const formatDate = (dateString: string | Date | null) => {
    if (!dateString) return 'N/A';
    
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (allMedicalDevices.length === 0) {
    return (
      <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
        <p className="text-gray-500">Aucun appareil médical trouvé</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-4">
      {/* Search bar and filter controls */}
      <div className="flex flex-col space-y-3">
        <div className="flex items-center space-x-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              type="text"
              placeholder="Rechercher par nom, marque, modèle ou emplacement..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="pl-8"
            />
          </div>
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 ${hasActiveFilters ? 'bg-blue-50 border-blue-200' : ''}`}
          >
            <Filter className="h-4 w-4" />
            Filtres
            {hasActiveFilters && (
              <span className="bg-blue-500 text-white text-xs rounded-full px-2 py-0.5 ml-1">
                {[
                  searchQuery,
                  statusFilter && statusFilter !== 'all' ? statusFilter : null,
                  brandFilter && brandFilter !== 'all' ? brandFilter : null,
                  locationFilter && locationFilter !== 'all' ? locationFilter : null,
                  reservedFilter && reservedFilter !== 'all' ? reservedFilter : null
                ].filter(Boolean).length}
              </span>
            )}
          </Button>
          {hasActiveFilters && (
            <Button variant="ghost" onClick={clearAllFilters} className="flex items-center gap-2">
              <X className="h-4 w-4" />
              Effacer
            </Button>
          )}
        </div>

        {/* Filter controls */}
        {showFilters && (
          <div className="border rounded-lg p-4 bg-gray-50 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Status filter */}
              <div>
                <Label className="text-sm font-medium mb-2 block">Statut</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Tous les statuts" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les statuts</SelectItem>
                    {uniqueStatuses.map(status => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Brand filter */}
              <div>
                <Label className="text-sm font-medium mb-2 block">Marque</Label>
                <Select value={brandFilter} onValueChange={setBrandFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Toutes les marques" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes les marques</SelectItem>
                    {uniqueBrands.map(brand => (
                      <SelectItem key={brand} value={brand || ''}>
                        {brand}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Location filter */}
              <div>
                <Label className="text-sm font-medium mb-2 block">Emplacement</Label>
                <Select value={locationFilter} onValueChange={setLocationFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Tous les emplacements" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les emplacements</SelectItem>
                    {uniqueLocations.map(location => (
                      <SelectItem key={location || 'empty'} value={location || ''}>
                        {location}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Reserved filter */}
              <div>
                <Label className="text-sm font-medium mb-2 block">Réservation</Label>
                <Select value={reservedFilter} onValueChange={setReservedFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Tous" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous</SelectItem>
                    <SelectItem value="reserved">Réservés</SelectItem>
                    <SelectItem value="not_reserved">Non réservés</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}
      </div>
      
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Nom</TableHead>
              <TableHead>Marque/Modèle</TableHead>
              <TableHead>Num Serie</TableHead>
              <TableHead>Emplacement</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Destination</TableHead>
              <TableHead>Réservé jusqu'à</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.map((device) => (
            <TableRow key={device.id}>
              <TableCell className="font-medium">
                <Badge variant="outline" className="font-mono text-xs">
                  {(device as any).deviceCode || 'N/A'}
                </Badge>
              </TableCell>
              <TableCell className="font-medium">{device.name}</TableCell>
              <TableCell>
                <div className="text-sm text-gray-600">
                  {device.brand && <span>{device.brand}</span>}
                  {device.model && <span> / {device.model}</span>}
                </div>
              </TableCell>
              <TableCell>{device.serialNumber}</TableCell>
              <TableCell>{getLocationName(device)}</TableCell>
              <TableCell>
                <Badge variant={getStatusBadgeVariant(device.status)}>
                  {device.status}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge variant={(device as any).destination === 'FOR_RENT' ? 'secondary' : 'default'}>
                  {(device as any).destination === 'FOR_RENT' ? 'Location' : 'Vente'}
                </Badge>
              </TableCell>
              <TableCell className="text-sm">
                {device.reservedUntil ? formatDate(device.reservedUntil) : 'Non réservé'}
              </TableCell>
              <TableCell className="py-1">
                <div className="flex items-center justify-end gap-2">
                  <Link href={`/roles/admin/appareils/medical-device/${device.id}`} passHref>
                    <Button
                      variant="outline"
                      size="icon"
                      title="Voir les détails"
                      className="h-9 w-9 rounded-md border border-gray-200 bg-white hover:bg-gray-100 flex items-center justify-center"
                    >
                      <Info className="h-5 w-5" />
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => onViewHistory(device)}
                    title="Voir l'historique des réparations"
                    className="h-9 w-9 rounded-md border border-gray-200 bg-white hover:bg-gray-100 flex items-center justify-center"
                  >
                    <History className="h-5 w-5" />
                  </Button>
                  {renderActionButtons && (
                    <div className="flex items-center gap-2">
                      {renderActionButtons(device)}
                    </div>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
    
    {/* Pagination controls */}
    {filteredDevices.length > 0 && (
      <div className="flex items-center justify-between px-2 py-4 border-t">
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-700">
            Affichage de {paginatedData.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} à {Math.min(currentPage * itemsPerPage, filteredDevices.length)} sur {filteredDevices.length} appareils médicaux
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
                <SelectItem value="100">100</SelectItem>
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
  </div>
  );
}

export default MedicalDevicesTable;
