import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, MapPin, Stethoscope, Puzzle, Cog, Activity, CheckCircle2, XCircle, AlertCircle, HeartPulse, Package, Wrench, Filter, ShoppingCart, Grid3x3, List, Euro } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { getDeviceStatusInfo } from "@/utils/statusUtils";
import { DeviceStatus, ProductType } from "@prisma/client";

const getIconForType = (type: ProductType) => {
  switch (type) {
    case ProductType.MEDICAL_DEVICE:
      return <HeartPulse className="h-6 w-6 text-gray-500" />;
    case ProductType.ACCESSORY:
      return <Package className="h-6 w-6 text-gray-500" />;
    case ProductType.SPARE_PART:
      return <Wrench className="h-6 w-6 text-gray-500" />;
    case ProductType.DIAGNOSTIC_DEVICE:
      return <Stethoscope className="h-6 w-6 text-gray-500" />;
    default:
      return null;
  }
};

interface ProductDialogProps {
  isOpen: boolean;
  onClose: () => void;
  type: "medical-device" | "accessory" | "spare-part" | "diagnostic";
  onSelect: (product: any) => void;
}

export function ProductDialog({ isOpen, onClose, type, onSelect }: ProductDialogProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLocation, setSelectedLocation] = useState<string>("all");
  const [selectedBrand, setSelectedBrand] = useState<string>("all");
  const [selectedName, setSelectedName] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<DeviceStatus | 'all'>('all');
  const [priceRange, setPriceRange] = useState<{ min: string; max: string }>({ min: "", max: "" });
  const [selectedProducts, setSelectedProducts] = useState<any[]>([]);
  const [showSelectedOnly, setShowSelectedOnly] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Fetch stock locations
  const { data: stockLocations } = useQuery({
    queryKey: ["stock-locations"],
    queryFn: async () => {
      const response = await fetch("/api/stock-locations");
      if (!response.ok) {
        throw new Error("Failed to fetch stock locations");
      }
      return response.json();
    },
  });

  // Fetch products based on type
  const { data: products, isLoading } = useQuery({
    queryKey: ["products", type],
    queryFn: async () => {
      let response;
      let data;
      
      // Strictly separate devices and products by their source table
      if (type === "medical-device") {
        // Fetch only MEDICAL_DEVICE type devices from the medicalDevice table
        response = await fetch(`/api/medical-devices?type=MEDICAL_DEVICE`);
        if (!response.ok) {
          throw new Error(`Failed to fetch medical devices`);
        }
        data = await response.json();
        
        // Ensure we only get true medical devices, not products with the same name
        data = data.filter((item: any) => 
          // Explicitly check the type is MEDICAL_DEVICE and the source is the medicalDevice table
          item.type === "MEDICAL_DEVICE" && 
          // We can check for properties that only exist on medical devices
          ("availableForRent" in item || "technicalSpecs" in item)
        );
      } 
      else if (type === "diagnostic") {
        // Fetch only DIAGNOSTIC_DEVICE type devices from the medicalDevice table
        response = await fetch(`/api/medical-devices?type=DIAGNOSTIC_DEVICE`);
        if (!response.ok) {
          throw new Error(`Failed to fetch diagnostic devices`);
        }
        data = await response.json();
        
        // Ensure we only get true diagnostic devices
        data = data.filter((item: any) => 
          item.type === "DIAGNOSTIC_DEVICE" && 
          ("availableForRent" in item || "technicalSpecs" in item)
        );
      } 
      else if (type === "accessory") {
        // Fetch accessories from the products table
        response = await fetch(`/api/products?type=ACCESSORY`);
        if (!response.ok) {
          throw new Error(`Failed to fetch accessories`);
        }
        data = await response.json();
        
        // We don't need additional filtering here as the API already filters by type
        // Just log what we got to help with debugging
        console.log(`Fetched ${data.length} accessories from products table:`, data);
      } 
      else if (type === "spare-part") {
        // Fetch spare parts from the products table
        response = await fetch(`/api/products?type=SPARE_PART`);
        if (!response.ok) {
          throw new Error(`Failed to fetch spare parts`);
        }
        data = await response.json();
        
        // We don't need additional filtering here as the API already filters by type
        // Just log what we got to help with debugging
        console.log(`Fetched ${data.length} spare parts from products table:`, data);
      } 
      else {
        throw new Error(`Unknown product type: ${type}`);
      }
      
      console.log(`Fetched ${data.length} ${type} products from the correct table:`, data);
      return data;
    },
  });

  // Enhanced filtering logic
  const filteredProducts = products?.filter((product: any) => {
    // Search query matching
    const searchFields = [
      product.name,
      product.brand,
      product.model,
      product.serialNumber,
      product.stockLocation?.name
    ].filter(Boolean);

    const searchMatch = !searchQuery || searchFields.some(
      field => field?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Location filtering
    const locationMatch =
      selectedLocation === "all" ||
      product.stock?.locationId === selectedLocation ||
      product.stockLocationId === selectedLocation;

    // Brand filtering
    const brandMatch = selectedBrand === "all" || product.brand === selectedBrand;

    // Name filtering
    const nameMatch = selectedName === "all" || 
      product.name === selectedName;

    // Status filtering
    const statusMatch = statusFilter === 'all' || product.status === statusFilter;
    
    // Price range filtering
    const price = parseFloat(product.sellingPrice) || 0;
    const minPrice = priceRange.min ? parseFloat(priceRange.min) : 0;
    const maxPrice = priceRange.max ? parseFloat(priceRange.max) : Infinity;
    const priceMatch = price >= minPrice && price <= maxPrice;
    
    // Show selected only filter
    const selectionMatch = !showSelectedOnly || selectedProducts.some(p => p.id === product.id);

    return searchMatch && locationMatch && brandMatch && nameMatch && statusMatch && priceMatch && selectionMatch;
  });
  
  // Get unique brands for filtering
  const availableBrands = products ? 
    [...new Set(products.map((p: any) => p.brand).filter(Boolean))] : [];
    
  // Get unique names for filtering
  const availableNames = products ? 
    [...new Set(products.map((p: any) => p.name).filter(Boolean))] : [];
    
  // Handle product selection
  const handleProductToggle = (product: any) => {
    setSelectedProducts(prev => {
      const isSelected = prev.some(p => p.id === product.id);
      if (isSelected) {
        return prev.filter(p => p.id !== product.id);
      } else {
        return [...prev, product];
      }
    });
  };

  // Validate and confirm selection
  const handleConfirmSelection = () => {
    if (selectedProducts.length === 0) {
      toast({
        title: "Aucun produit sélectionné",
        description: "Veuillez sélectionner au moins un produit.",
        variant: "destructive"
      });
      return;
    }
    
    // Send all selected products as an array to handle batch addition
    onSelect(selectedProducts);
    
    // Reset and close
    setSelectedProducts([]);
    onClose();
    
    toast({
      title: "Produits ajoutés",
      description: `${selectedProducts.length} produit(s) ajouté(s) avec succès.`
    });
  };

  // Clear all selections
  const handleClearSelection = () => {
    setSelectedProducts([]);
  };

  const getTitle = () => {
    switch (type) {
      case "medical-device":
        return "Sélectionner un Appareil";
      case "accessory":
        return "Sélectionner un Accessoire";
      case "spare-part":
        return "Sélectionner une Pièce";
      case "diagnostic":
        return "Sélectionner un Diagnostic";
    }
  };

  const getStockLocationName = (product: any) => {
    if (!product) return "Non assigné";
    
    // If the product has a stockLocation object with a name, use it
    if (product.stockLocation?.name) {
      return product.stockLocation.name;
    }
    
    // If we have a stockLocationId but no stockLocation object,
    // try to find the location name from our stockLocations list
    if (product.stockLocationId && stockLocations) {
      const location = stockLocations.find(
        (loc: any) => loc.id === product.stockLocationId
      );
      if (location) return location.name;
    }
    
    return "Non assigné";
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {
      setSelectedProducts([]);
      onClose();
    }}>
      <DialogContent className="max-w-[90vw] w-full h-[85vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b flex-shrink-0">
          <DialogTitle className="flex items-center justify-between">
            <span>{getTitle()}</span>
            <div className="flex items-center gap-2">
              {selectedProducts.length > 0 && (
                <Badge className="bg-blue-600 text-white">
                  <ShoppingCart className="h-3 w-3 mr-1" />
                  {selectedProducts.length} sélectionné(s)
                </Badge>
              )}
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="space-y-4">
            {/* Enhanced Filter Section */}
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 space-y-3">
            <div className="flex items-center gap-2 text-blue-700 font-medium mb-2">
              <Filter className="h-4 w-4" />
              <span>Filtres</span>
            </div>
            
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Rechercher par nom, marque, modèle, n° série"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 border-blue-300 focus:border-blue-500"
              />
            </div>
            
            {/* View Mode Toggle */}
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-blue-700">Mode d'affichage</span>
              <div className="flex gap-1 bg-white rounded-lg border border-blue-300 p-1">
                <Button
                  size="sm"
                  variant={viewMode === "grid" ? "default" : "ghost"}
                  onClick={() => setViewMode("grid")}
                  className={cn(
                    "h-7 px-2",
                    viewMode === "grid" 
                      ? "bg-blue-600 hover:bg-blue-700 text-white" 
                      : "text-blue-700 hover:bg-blue-100"
                  )}
                >
                  <Grid3x3 className="h-4 w-4 mr-1" />
                  Grille
                </Button>
                <Button
                  size="sm"
                  variant={viewMode === "list" ? "default" : "ghost"}
                  onClick={() => setViewMode("list")}
                  className={cn(
                    "h-7 px-2",
                    viewMode === "list" 
                      ? "bg-blue-600 hover:bg-blue-700 text-white" 
                      : "text-blue-700 hover:bg-blue-100"
                  )}
                >
                  <List className="h-4 w-4 mr-1" />
                  Liste
                </Button>
              </div>
            </div>
            
            {/* Filter Grid */}
            <div className="grid grid-cols-5 gap-3">
              {/* Stock Location Filter */}
              <div>
                <Label className="text-xs text-blue-700 mb-1">Stock</Label>
                <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                  <SelectTrigger className="border-blue-300">
                    <SelectValue placeholder="Tous" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les stocks</SelectItem>
                    {stockLocations?.map((location: any) => (
                      <SelectItem key={location.id} value={location.id}>
                        {location.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Brand Filter */}
              <div>
                <Label className="text-xs text-blue-700 mb-1">Marque</Label>
                <Select value={selectedBrand} onValueChange={setSelectedBrand}>
                  <SelectTrigger className="border-blue-300">
                    <SelectValue placeholder="Toutes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes les marques</SelectItem>
                    {availableBrands.map((brand) => (
                      <SelectItem key={String(brand)} value={String(brand)}>
                        {String(brand)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Name Filter */}
              <div>
                <Label className="text-xs text-blue-700 mb-1">Nom</Label>
                <Select value={selectedName} onValueChange={setSelectedName}>
                  <SelectTrigger className="border-blue-300">
                    <SelectValue placeholder="Tous" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les noms</SelectItem>
                    {availableNames.map((name) => (
                      <SelectItem key={String(name)} value={String(name)}>
                        {String(name)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Status Filter */}
              <div>
                <Label className="text-xs text-blue-700 mb-1">Statut</Label>
                <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as DeviceStatus | 'all')}>
                  <SelectTrigger className="border-blue-300">
                    <SelectValue placeholder="Tous" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les statuts</SelectItem>
                    {Object.values(DeviceStatus).map(status => (
                      <SelectItem key={status} value={status}>{getDeviceStatusInfo(status).label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Price Range */}
              <div>
                <Label className="text-xs text-blue-700 mb-1">Prix (TND)</Label>
                <div className="flex gap-1">
                  <Input
                    type="number"
                    placeholder="Min"
                    value={priceRange.min}
                    onChange={(e) => setPriceRange(prev => ({ ...prev, min: e.target.value }))}
                    className="border-blue-300 text-xs"
                  />
                  <Input
                    type="number"
                    placeholder="Max"
                    value={priceRange.max}
                    onChange={(e) => setPriceRange(prev => ({ ...prev, max: e.target.value }))}
                    className="border-blue-300 text-xs"
                  />
                </div>
              </div>
            </div>
          </div>

            {/* Products Display */}
            <div className={cn(
              "overflow-y-auto pr-2",
              viewMode === "grid" ? "grid grid-cols-5 gap-2" : "space-y-2"
            )}>
              {isLoading ? (
                <div className="text-center py-4 text-gray-500">Chargement...</div>
              ) : filteredProducts?.length === 0 ? (
                <div className="text-center py-8">
                  <Package className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                  <p className="text-gray-500 font-medium">Aucun produit trouvé</p>
                </div>
              ) : (
              filteredProducts?.map((product: any) => {
                const isSelected = selectedProducts.some(p => p.id === product.id);
                const isStockable = product.type === 'ACCESSORY' || product.type === 'SPARE_PART';
                
                // Grid View Card
                if (viewMode === "grid") {
                  return (
                    <Card
                      key={`${product.id}-${product.stockLocationId || 'no-location'}`}
                      className={cn(
                        "p-3 cursor-pointer transition-all relative group",
                        isSelected 
                          ? "border-blue-500 bg-blue-50 ring-2 ring-blue-300" 
                          : "hover:border-blue-500 hover:bg-blue-50/30 hover:shadow-lg"
                      )}
                      onClick={() => handleProductToggle(product)}
                    >
                      {/* Selection Checkbox */}
                      <div className="absolute top-2 right-2 z-10">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => handleProductToggle(product)}
                          className="border-blue-600 data-[state=checked]:bg-blue-600 h-4 w-4"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                      
                      {/* Product Info Display */}
                      <div className="w-full h-16 bg-gradient-to-br from-blue-100 to-blue-50 rounded-lg mb-2 flex items-center justify-center p-2">
                        <div className="text-center w-full">
                          <div className="text-[10px] text-blue-600 font-medium truncate">
                            {product.name}
                          </div>
                          <div className="text-[9px] text-blue-800 font-bold truncate max-w-full mt-0.5">
                            {product.brand && product.model ? `${product.brand} ${product.model}` : 
                             product.brand || product.model || 
                             (product.serialNumber ? `S/N: ${product.serialNumber}` : 'N/A')}
                          </div>
                        </div>
                      </div>
                      
                      {/* Product Info */}
                      <div className="space-y-1">
                        <h4 className="font-bold text-sm text-gray-900 line-clamp-2 min-h-[2.5rem] leading-tight">
                          {product.name}
                        </h4>
                        
                        {product.serialNumber && (
                          <div className="text-xs text-gray-400 line-clamp-1">
                            S/N: {product.serialNumber}
                          </div>
                        )}
                        
                        {/* Price */}
                        {product.sellingPrice && (
                          <div className="flex items-center justify-between mt-2 pt-2 border-t">
                            <span className="text-base font-bold text-blue-600">
                              {product.sellingPrice} DT
                            </span>
                            {isStockable && (
                              <Badge 
                                variant="outline" 
                                className={cn(
                                  "text-xs px-1 py-0 h-5",
                                  product.stockQuantity > 0 
                                    ? "bg-blue-50 text-blue-700 border-blue-200"
                                    : "bg-red-50 text-red-700 border-red-200"
                                )}
                              >
                                Stock: {product.stockQuantity || 0}
                              </Badge>
                            )}
                          </div>
                        )}
                        
                        {/* Status Badge */}
                        {product.status && (
                          <Badge 
                            variant="outline" 
                            className={cn(
                              "text-xs w-full justify-center py-0.5 mt-1",
                              (product.status === "AVAILABLE" || product.status === "ACTIVE") && "bg-blue-50 text-blue-700 border-blue-200",
                              product.status === "RESERVED" && "bg-amber-50 text-amber-700 border-amber-200",
                              (product.status === "UNAVAILABLE" || product.status === "MAINTENANCE" || product.status === "RETIRED") && "bg-red-50 text-red-700 border-red-200"
                            )}
                          >
                            {product.status === "AVAILABLE" || product.status === "ACTIVE" ? "Disponible" : 
                             product.status === "RESERVED" ? "Réservé" : 
                             product.status === "MAINTENANCE" ? "Maintenance" :
                             product.status === "RETIRED" ? "Retiré" :
                             "Indisponible"}
                          </Badge>
                        )}
                        
                        {/* If no status is provided, show a default available badge for stockable items */}
                        {!product.status && isStockable && product.stockQuantity && product.stockQuantity > 0 && (
                          <Badge 
                            variant="outline" 
                            className="bg-blue-50 text-blue-700 border-blue-200 text-xs w-full justify-center py-0.5 mt-1"
                          >
                            Disponible
                          </Badge>
                        )}
                      </div>
                    </Card>
                  );
                }
                
                // List View (Original layout)
                return (
                  <Card
                    key={`${product.id}-${product.stockLocationId || 'no-location'}`}
                    className={cn(
                      "p-4 cursor-pointer transition-all",
                      isSelected 
                        ? "border-blue-500 bg-blue-50 ring-2 ring-blue-300" 
                        : "hover:border-blue-500 hover:bg-blue-50/30"
                    )}
                    onClick={() => handleProductToggle(product)}
                  >
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => handleProductToggle(product)}
                        className="mt-1 border-blue-600 data-[state=checked]:bg-blue-600"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="flex-1 flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium truncate">{product.name}</h4>
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 flex items-center gap-1">
                              {getIconForType(product.type as ProductType)}
                              <span className="text-sm">
                                {type === "medical-device" && "Appareil"}
                                {type === "accessory" && "Accessoire"}
                                {type === "spare-part" && "Pièce"}
                                {type === "diagnostic" && "Diagnostic"}
                              </span>
                            </Badge>
                          </div>
                          <div className="text-base text-gray-500 truncate mt-1">
                            {product.brand} {product.model}
                            {product.serialNumber && ` • N°${product.serialNumber}`}
                          </div>
                          <div className="flex items-center gap-1 mt-1 text-base text-gray-500">
                            <MapPin className="h-3.5 w-3.5" />
                            {getStockLocationName(product)}
                          </div>
                        </div>
                        <div className="text-right">
                          {product.sellingPrice && (
                            <div className="font-bold text-lg text-blue-600">
                              {product.sellingPrice} DT
                            </div>
                          )}
                          <div className="flex flex-col gap-1 mt-1">
                            {isStockable && (
                              <Badge variant="outline" className={cn(
                                "bg-gray-50 text-gray-700 border-gray-200",
                                product.stockQuantity === 0 && "bg-red-100 text-red-700 border-red-200"
                              )}>
                                Stock: {product.stockQuantity || 0}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })
            )}
            </div>
          </div>
        </div>
        
        {/* Footer with action buttons - Fixed positioning */}
        <div className="flex-shrink-0 flex items-center justify-between bg-gray-50 px-6 py-4 border-t">
          <div className="flex items-center gap-2">
            {selectedProducts.length > 0 && (
              <Button
                variant="outline"
                onClick={handleClearSelection}
                className="text-gray-600 border-gray-300 hover:bg-gray-100"
              >
                Effacer sélection
              </Button>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600">
              {filteredProducts?.length || 0} produits disponibles
            </span>
            
            <Button
              onClick={handleConfirmSelection}
              disabled={selectedProducts.length === 0}
              className="bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 font-semibold"
            >
              Valider la sélection ({selectedProducts.length})
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default ProductDialog;