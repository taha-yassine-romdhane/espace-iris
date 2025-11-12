import React, { useState, useEffect, useMemo } from 'react';
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
import { History, Sliders, Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Info, Filter, X } from "lucide-react";
import Link from 'next/link';

interface AccessoriesTableProps {
  products: Product[];
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
  onViewHistory: (product: Product) => void;
  onViewParameters?: (product: Product) => void;
  renderActionButtons: (product: Product) => React.ReactNode;
  initialItemsPerPage?: number;
}

export function AccessoriesTable({
  products = [],
  onViewHistory,
  onViewParameters,
  renderActionButtons,
  initialItemsPerPage = 10
}: AccessoriesTableProps) {
  // Memoize the filtering of accessories to prevent re-renders
  const allAccessories = useMemo(() =>
    products?.filter(p => p?.type === ProductType.ACCESSORY) || []
    , [products]);

  // Search and pagination state
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredAccessories, setFilteredAccessories] = useState<Product[]>(allAccessories);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(initialItemsPerPage);
  const [paginatedData, setPaginatedData] = useState<Product[]>([]);
  const [totalPages, setTotalPages] = useState(1);

  // Filter state
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [brandFilter, setBrandFilter] = useState<string>('');
  const [locationFilter, setLocationFilter] = useState<string>('');
  const [priceRangeFilter, setPriceRangeFilter] = useState<string>('');

  // Get unique values for filter dropdowns
  const uniqueStatuses = useMemo(() => {
    const statuses = [...new Set(allAccessories.map(accessory => accessory.status).filter(Boolean))];
    return statuses.sort();
  }, [allAccessories]);

  const uniqueBrands = useMemo(() => {
    const brands = [...new Set(allAccessories.map(accessory => accessory.brand).filter(Boolean))];
    return brands.sort();
  }, [allAccessories]);

  const uniqueLocations = useMemo(() => {
    const locations = [...new Set(allAccessories
      .map(accessory => accessory.stockLocation?.name || 
        (accessory.stocks && accessory.stocks.length > 0 && accessory.stocks[0].location?.name))
      .filter(Boolean))];
    return locations.sort();
  }, [allAccessories]);

  // Filter accessories based on search query and filters
  useEffect(() => {
    let filtered = allAccessories;

    // Apply search query
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(item =>
        (item.name && item.name.toLowerCase().includes(query)) ||
        (item.brand && item.brand.toLowerCase().includes(query)) ||
        (item.model && item.model.toLowerCase().includes(query))
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
      filtered = filtered.filter(item => 
        item.stockLocation?.name === locationFilter ||
        (item.stocks && item.stocks.length > 0 && item.stocks[0].location?.name === locationFilter)
      );
    }

    // Apply price range filter
    if (priceRangeFilter) {
      const price = (item: any) => Number(item.sellingPrice) || 0;
      switch (priceRangeFilter) {
        case 'under_50':
          filtered = filtered.filter(item => price(item) < 50);
          break;
        case '50_200':
          filtered = filtered.filter(item => price(item) >= 50 && price(item) <= 200);
          break;
        case '200_500':
          filtered = filtered.filter(item => price(item) > 200 && price(item) <= 500);
          break;
        case 'over_500':
          filtered = filtered.filter(item => price(item) > 500);
          break;
      }
    }

    setFilteredAccessories(filtered);
    // Reset to first page when filters change
    setCurrentPage(1);
  }, [searchQuery, allAccessories, statusFilter, brandFilter, locationFilter, priceRangeFilter]);

  // Update paginated data when filtered data changes or pagination settings change
  useEffect(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    setPaginatedData(filteredAccessories.slice(startIndex, endIndex));
    setTotalPages(Math.max(1, Math.ceil(filteredAccessories.length / itemsPerPage)));

    // Reset to page 1 if current page is out of bounds after data change
    if (currentPage > Math.ceil(filteredAccessories.length / itemsPerPage) && filteredAccessories.length > 0) {
      setCurrentPage(1);
    }
  }, [filteredAccessories, currentPage, itemsPerPage]);

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
    setPriceRangeFilter('all');
  };

  // Check if any filters are active
  const hasActiveFilters = searchQuery || 
    (statusFilter && statusFilter !== 'all') || 
    (brandFilter && brandFilter !== 'all') || 
    (locationFilter && locationFilter !== 'all') || 
    (priceRangeFilter && priceRangeFilter !== 'all');

  // Pagination navigation functions
  const goToFirstPage = () => setCurrentPage(1);
  const goToLastPage = () => setCurrentPage(totalPages);
  const goToPreviousPage = () => currentPage > 1 && setCurrentPage(currentPage - 1);
  const goToNextPage = () => currentPage < totalPages && setCurrentPage(currentPage + 1);

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'FOR_SALE':
      case 'ACTIVE':
        return 'default';
      case 'IN_REPAIR':
      case 'MAINTENANCE':
        return 'secondary';
      case 'VENDU':
      case 'RETIRED':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'FOR_SALE':
      case 'ACTIVE':
        return 'EN VENTE';
      case 'IN_REPAIR':
      case 'MAINTENANCE':
        return 'EN RÉPARATION';
      case 'VENDU':
      case 'RETIRED':
        return 'VENDU';
      case 'FOR_RENT':
        return 'EN LOCATION';
      default:
        return status;
    }
  };

  const getLocationName = (device: Product) => {
    // Prefer the name from the primary stockLocation object if it exists
    if (device.stockLocation && device.stockLocation.name) {
      return device.stockLocation.name;
    }
    // Fallback to the location name from the first entry in the stocks array
    if (device.stocks && device.stocks.length > 0 && device.stocks[0].location && device.stocks[0].location.name) {
      return device.stocks[0].location.name;
    }
    // If no location can be determined, return "Non assigné"
    return "Non assigné";
  };

  if (allAccessories.length === 0) {
    return (
      <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
        <p className="text-gray-500">Aucun accessoire trouvé</p>
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
              placeholder="Rechercher par nom, marque ou modèle..."
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
                  priceRangeFilter && priceRangeFilter !== 'all' ? priceRangeFilter : null
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
                        {getStatusLabel(status)}
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

              {/* Price range filter */}
              <div>
                <Label className="text-sm font-medium mb-2 block">Gamme de prix</Label>
                <Select value={priceRangeFilter} onValueChange={setPriceRangeFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Tous les prix" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les prix</SelectItem>
                    <SelectItem value="under_50">Moins de 50 DT</SelectItem>
                    <SelectItem value="50_200">50 - 200 DT</SelectItem>
                    <SelectItem value="200_500">200 - 500 DT</SelectItem>
                    <SelectItem value="over_500">Plus de 500 DT</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow className="h-8">
              <TableHead className="py-1">Nom</TableHead>
              <TableHead className="py-1">Marque</TableHead>
              <TableHead className="py-1">Modèle</TableHead>
              <TableHead>Emplacements (Quantités)</TableHead>
              <TableHead>Quantité Totale</TableHead>
              <TableHead className="py-1">Prix d&apos;achat</TableHead>
              <TableHead className="py-1">Prix de vente</TableHead>
              <TableHead className="py-1 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.map((device) => (
              <TableRow key={device.id} className="h-8">
                <TableCell className="py-1">{device.name}</TableCell>
                <TableCell className="py-1">{device.brand || '-'}</TableCell>
                <TableCell className="py-1">{device.model || '-'}</TableCell>
                <TableCell className="py-2">
                  {device.stocks && device.stocks.length > 0 ? (
                    <div className="flex flex-col gap-1">
                      {device.stocks.map((stock: any) => (
                        <div key={stock.id} className="text-xs flex items-center gap-2">
                          <span className="font-medium text-blue-600">{stock.location?.name || 'N/A'}</span>
                          <span className="text-gray-500">→</span>
                          <span className="font-semibold">{stock.quantity}</span>
                          <Badge variant="outline" className="text-xs py-0 px-1">
                            {getStatusLabel(stock.status)}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-gray-400 text-xs">Aucun stock</span>
                  )}
                </TableCell>
                <TableCell className="py-1 font-semibold">
                  {device.stocks ? device.stocks.reduce((acc: number, stock: any) => acc + stock.quantity, 0) : 0}
                </TableCell>
                <TableCell className="py-1">{device.purchasePrice ? `${device.purchasePrice} DT` : '-'}</TableCell>
                <TableCell className="py-1">{device.sellingPrice ? `${device.sellingPrice} DT` : '-'}</TableCell>
                <TableCell className="py-2 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Link href={`/roles/admin/appareils/accessory/${device.id}`} passHref>
                      <Button
                        variant="outline"
                        size="icon"
                        title="Voir les détails"
                        className="h-9 w-9 rounded-md border border-gray-200 bg-white hover:bg-gray-100 flex items-center justify-center"
                      >
                        <Info className="h-5 w-5" />
                      </Button>
                    </Link>
                  
                    {onViewParameters && (
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => onViewParameters(device)}
                        title="Voir les paramètres"
                        className="h-9 w-9 rounded-md border border-gray-200 bg-white hover:bg-gray-100 flex items-center justify-center"
                      >
                        <Sliders className="h-5 w-5" />
                      </Button>
                    )}
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
      {filteredAccessories.length > 0 && (
        <div className="flex items-center justify-between px-2 py-4 border-t">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-700">
              Affichage de {paginatedData.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} à {Math.min(currentPage * itemsPerPage, filteredAccessories.length)} sur {filteredAccessories.length} accessoires
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

export default AccessoriesTable;
