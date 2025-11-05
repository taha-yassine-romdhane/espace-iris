import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, MapPin, Stethoscope, Puzzle, Cog, Activity, CheckCircle2, XCircle, AlertCircle, Filter, Package, X, ShoppingCart, Grid3x3, List, Euro } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSession } from "next-auth/react";
import { toast } from "@/components/ui/use-toast";

interface ProductDialogProps {
  isOpen: boolean;
  onClose: () => void;
  type: "medical-device" | "accessory" | "spare-part" | "diagnostic";
  onSelect: (product: any) => void;
}

export function ProductDialog({ isOpen, onClose, type, onSelect }: ProductDialogProps) {
  const { data: session } = useSession();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLocation, setSelectedLocation] = useState<string>("all");
  const [selectedBrand, setSelectedBrand] = useState<string>("all");
  const [selectedName, setSelectedName] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("available");
  const [priceRange, setPriceRange] = useState<{ min: string; max: string }>({ min: "", max: "" });
  const [employeeStockId, setEmployeeStockId] = useState<string | null>(null);
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

  // Fetch employee's stock location based on their user ID
  const { data: employeeStock } = useQuery({
    queryKey: ["employee-stock", session?.user?.id],
    queryFn: async () => {
      if (!session?.user?.id) return null;
      const response = await fetch(`/api/stock-locations?userId=${session.user.id}`);
      if (!response.ok) return null;
      const data = await response.json();
      // Find the stock location assigned to this user
      return data.find((loc: any) => loc.userId === session.user.id) || null;
    },
    enabled: !!session?.user?.id
  });
  
  // Set employee stock ID when fetched
  useEffect(() => {
    if (employeeStock?.id) {
      setEmployeeStockId(employeeStock.id);
      // Set as default selection if not already set
      if (selectedLocation === "all") {
        setSelectedLocation(employeeStock.id);
      }
    }
  }, [employeeStock]);

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
          "technicalSpecs" in item
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
          "technicalSpecs" in item
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

  // Enhanced filtering logic - only show employee's stock
  const filteredProducts = products?.filter((product: any) => {
    // Only show products from employee's stock location
    if (!employeeStock || product.stockLocationId !== employeeStock.id) {
      return false;
    }
    
    // Search query matching
    const searchFields = [
      product.name,
      product.brand,
      product.model,
      product.serialNumber,
      product.stockLocation?.name
    ].filter(Boolean);

    const matchesSearch = !searchQuery || searchFields.some(
      field => field?.toLowerCase().includes(searchQuery.toLowerCase())
    );
    
    // Brand filtering
    const matchesBrand = selectedBrand === "all" || product.brand === selectedBrand;
    
    // Name filtering
    const matchesName = selectedName === "all" || 
      product.name === selectedName;
    
    // Status filtering
    let matchesStatus = true;
    if (selectedStatus !== "all") {
      if (selectedStatus === "available") {
        matchesStatus = product.status === "AVAILABLE" || product.status === "ACTIVE" || (!product.status && product.stockQuantity > 0);
      } else if (selectedStatus === "reserved") {
        matchesStatus = product.status === "RESERVED";
      } else if (selectedStatus === "maintenance") {
        matchesStatus = product.status === "MAINTENANCE";
      }
    }
    
    // Price range filtering
    let matchesPrice = true;
    if (priceRange.min || priceRange.max) {
      const price = product.sellingPrice || 0;
      if (priceRange.min && price < parseFloat(priceRange.min)) matchesPrice = false;
      if (priceRange.max && price > parseFloat(priceRange.max)) matchesPrice = false;
    }

    return matchesSearch && matchesBrand && matchesName && matchesStatus && matchesPrice;
  });

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

  return (
    <Dialog open={isOpen} onOpenChange={() => {
      setSelectedProducts([]);
      onClose();
    }}>
      <DialogContent className="max-w-[90vw] w-full max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{getTitle()}</span>
            <div className="flex items-center gap-2">
              {selectedProducts.length > 0 && (
                <Badge className="bg-green-600 text-white">
                  <ShoppingCart className="h-3 w-3 mr-1" />
                  {selectedProducts.length} sélectionné(s)
                </Badge>
              )}
              {employeeStock && (
                <Badge className="bg-green-100 text-green-700 border-green-300">
                  <Package className="h-3 w-3 mr-1" />
                  Stock: {employeeStock.name}
                </Badge>
              )}
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Enhanced Filter Section */}
          <div className="bg-green-50 p-4 rounded-lg border border-green-200 space-y-3">
            <div className="flex items-center gap-2 text-green-700 font-medium mb-2">
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
                className="pl-9 border-green-300 focus:border-green-500"
              />
            </div>
            
            {/* View Mode Toggle */}
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-green-700">Mode d'affichage</span>
              <div className="flex gap-1 bg-white rounded-lg border border-green-300 p-1">
                <Button
                  size="sm"
                  variant={viewMode === "grid" ? "default" : "ghost"}
                  onClick={() => setViewMode("grid")}
                  className={cn(
                    "h-7 px-2",
                    viewMode === "grid" 
                      ? "bg-green-600 hover:bg-green-700 text-white" 
                      : "text-green-700 hover:bg-green-100"
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
                      ? "bg-green-600 hover:bg-green-700 text-white" 
                      : "text-green-700 hover:bg-green-100"
                  )}
                >
                  <List className="h-4 w-4 mr-1" />
                  Liste
                </Button>
              </div>
            </div>
            
            {/* Filter Grid */}
            <div className="grid grid-cols-4 gap-3">
              {/* Brand Filter */}
              <div>
                <Label className="text-xs text-green-700 mb-1">Marque</Label>
                <Select value={selectedBrand} onValueChange={setSelectedBrand}>
                  <SelectTrigger className="border-green-300">
                    <SelectValue placeholder="Toutes les marques" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes les marques</SelectItem>
                    {/* Dynamically populate brands from products */}
                    {[...new Set(products?.map((p: any) => p.brand).filter(Boolean))].map((brand: any) => (
                      <SelectItem key={brand} value={brand}>
                        {brand}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Name Filter */}
              <div>
                <Label className="text-xs text-green-700 mb-1">Nom</Label>
                <Select value={selectedName} onValueChange={setSelectedName}>
                  <SelectTrigger className="border-green-300">
                    <SelectValue placeholder="Tous les noms" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les noms</SelectItem>
                    {/* Dynamically populate names from products */}
                    {[...new Set(products?.map((p: any) => p.name).filter(Boolean))].map((name: any) => (
                      <SelectItem key={name} value={name}>
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Status Filter */}
              <div>
                <Label className="text-xs text-green-700 mb-1">Statut</Label>
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger className="border-green-300">
                    <SelectValue placeholder="Disponible" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les statuts</SelectItem>
                    <SelectItem value="available">Disponible</SelectItem>
                    <SelectItem value="reserved">Réservé</SelectItem>
                    <SelectItem value="maintenance">En maintenance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Price Range */}
              <div>
                <Label className="text-xs text-green-700 mb-1">Prix (DT)</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder="Min"
                    value={priceRange.min}
                    onChange={(e) => setPriceRange({ ...priceRange, min: e.target.value })}
                    className="border-green-300"
                  />
                  <Input
                    type="number"
                    placeholder="Max"
                    value={priceRange.max}
                    onChange={(e) => setPriceRange({ ...priceRange, max: e.target.value })}
                    className="border-green-300"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Products Display - Larger height */}
          <div className={cn(
            "max-h-[65vh] overflow-y-auto pr-2",
            viewMode === "grid" ? "grid grid-cols-4 gap-2" : "space-y-2"
          )}>
            {isLoading ? (
              <div className="text-center py-4 text-gray-500">Chargement...</div>
            ) : filteredProducts?.length === 0 ? (
              <div className="text-center py-8">
                <Package className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                <p className="text-gray-500 font-medium">Aucun produit disponible dans votre stock</p>
                {employeeStock && (
                  <p className="text-sm text-gray-400 mt-1">Stock: {employeeStock.name}</p>
                )}
              </div>
            ) : (
              filteredProducts?.map((product: any) => {
                const isSelected = selectedProducts.some(p => p.id === product.id);
                
                // Grid View Card
                if (viewMode === "grid") {
                  return (
                    <Card
                      key={`${product.id}-${product.stockLocationId || 'no-location'}`}
                      className={cn(
                        "p-3 cursor-pointer transition-all relative group",
                        isSelected 
                          ? "border-green-500 bg-green-50 ring-2 ring-green-300" 
                          : "hover:border-green-500 hover:bg-green-50/30 hover:shadow-lg"
                      )}
                      onClick={() => handleProductToggle(product)}
                    >
                      {/* Selection Checkbox */}
                      <div className="absolute top-2 right-2 z-10">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => handleProductToggle(product)}
                          className="border-green-600 data-[state=checked]:bg-green-600 h-4 w-4"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                      
                      {/* Product Info Display */}
                      <div className="w-full h-16 bg-gradient-to-br from-green-100 to-green-50 rounded-lg mb-2 flex items-center justify-center p-2">
                        <div className="text-center w-full">
                          <div className="text-[10px] text-green-600 font-medium truncate">
                            {product.name}
                          </div>
                          <div className="text-[9px] text-green-800 font-bold truncate max-w-full mt-0.5">
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
                            <span className="text-sm font-bold text-green-600">
                              {product.sellingPrice} DT
                            </span>
                            <Badge 
                              variant="outline" 
                              className={cn(
                                "text-xs px-1 py-0 h-5",
                                product.stockQuantity > 0 
                                  ? "bg-green-50 text-green-700 border-green-200"
                                  : "bg-red-50 text-red-700 border-red-200"
                              )}
                            >
                              Stock: {product.stockQuantity || 0}
                            </Badge>
                          </div>
                        )}
                        
                        {/* Status Badge */}
                        {product.status && (
                          <Badge 
                            variant="outline" 
                            className={cn(
                              "text-xs w-full justify-center py-0.5",
                              (product.status === "AVAILABLE" || product.status === "ACTIVE") && "bg-green-50 text-green-700 border-green-200",
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
                        ? "border-green-500 bg-green-50 ring-2 ring-green-300" 
                        : "hover:border-green-500 hover:bg-green-50/30"
                    )}
                    onClick={() => handleProductToggle(product)}
                  >
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => handleProductToggle(product)}
                      className="mt-1 border-green-600 data-[state=checked]:bg-green-600"
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div className="flex-1 flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-lg truncate">{product.name}</h4>
                        {/* Type Badge */}
                        {type === "medical-device" && (
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 flex items-center gap-1">
                            <Stethoscope className="h-3 w-3" />
                            <span className="text-sm">Appareil</span>
                          </Badge>
                        )}
                        {type === "accessory" && (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 flex items-center gap-1">
                            <Puzzle className="h-3 w-3" />
                            <span className="text-sm">Accessoire</span>
                          </Badge>
                        )}
                        {type === "spare-part" && (
                          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 flex items-center gap-1">
                            <Cog className="h-3 w-3" />
                            <span className="text-sm">Pièce</span>
                          </Badge>
                        )}
                        {type === "diagnostic" && (
                          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 flex items-center gap-1">
                            <Activity className="h-3 w-3" />
                            <span className="text-sm">Diagnostic</span>
                          </Badge>
                        )}
                      </div>
                      <div className="text-base text-gray-500 truncate">
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
                        <div className="font-bold text-lg text-green-600">
                          {product.sellingPrice} DT
                        </div>
                      )}
                      <div className="flex flex-col gap-1 mt-1">
                        {/* Stock Badge */}
                        <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200 text-sm">
                          Stock: {product.stockQuantity || 1}
                        </Badge>
                        
                        {/* Status Badge */}
                        {product.status && (
                          <Badge 
                            variant="outline" 
                            className={cn(
                              "flex items-center gap-1",
                              (product.status === "AVAILABLE" || product.status === "ACTIVE") && "bg-green-50 text-green-700 border-green-200",
                              product.status === "RESERVED" && "bg-amber-50 text-amber-700 border-amber-200",
                              (product.status === "UNAVAILABLE" || product.status === "MAINTENANCE" || product.status === "RETIRED") && "bg-red-50 text-red-700 border-red-200",
                              !product.status || product.status === "UNKNOWN" && "bg-gray-50 text-gray-700 border-gray-200"
                            )}
                          >
                            {(product.status === "AVAILABLE" || product.status === "ACTIVE") && <CheckCircle2 className="h-3 w-3" />}
                            {product.status === "RESERVED" && <AlertCircle className="h-3 w-3" />}
                            {(product.status === "UNAVAILABLE" || product.status === "MAINTENANCE" || product.status === "RETIRED") && <XCircle className="h-3 w-3" />}
                            {!product.status || product.status === "UNKNOWN" && <span className="h-3 w-3" />}
                            <span className="text-xs">
                              {product.status === "AVAILABLE" || product.status === "ACTIVE" ? "Disponible" : 
                               product.status === "RESERVED" ? "Réservé" : 
                               product.status === "MAINTENANCE" ? "En maintenance" :
                               product.status === "RETIRED" ? "Retiré" :
                               product.status === "UNAVAILABLE" ? "Indisponible" : 
                               "État inconnu"}
                            </span>
                          </Badge>
                        )}
                        
                        {/* If no status is provided, show a default available badge */}
                        {!product.status && product.stockQuantity && product.stockQuantity > 0 && (
                          <Badge 
                            variant="outline" 
                            className="bg-green-50 text-green-700 border-green-200 flex items-center gap-1"
                          >
                            <CheckCircle2 className="h-3 w-3" />
                            <span className="text-xs">Disponible</span>
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
        
        <DialogFooter className="border-t pt-4">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              {selectedProducts.length > 0 && (
                <>
                  <span className="text-sm text-gray-600">
                    {selectedProducts.length} produit(s) sélectionné(s)
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearSelection}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Effacer
                  </Button>
                </>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedProducts([]);
                  onClose();
                }}
              >
                Annuler
              </Button>
              <Button
                onClick={handleConfirmSelection}
                disabled={selectedProducts.length === 0}
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Valider ({selectedProducts.length})
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ProductDialog;