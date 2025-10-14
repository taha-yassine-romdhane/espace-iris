import { Card } from "@/components/ui/card";
import { 
  Activity,
  Search
} from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface DiagnosticProductDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (product: any) => void;
  products?: any[];
  isLoading: boolean;
}

export function DiagnosticProductDialog({
  isOpen,
  onClose,
  onSelect,
  products = [],
  isLoading
}: DiagnosticProductDialogProps) {
  const [searchQuery, setSearchQuery] = useState("");

  // Filter products based on search query
  const filteredProducts = products?.filter((product) => {
    if (!product) return false;
    if (!searchQuery.trim()) return true;
    
    const searchFields = [
      product.name,
      product.brand,
      product.model,
      product.serialNumber,
      product.stockLocation?.name
    ].filter(Boolean);

    return searchFields.some(
      field => field?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }) || [];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Sélectionner un Équipement de Diagnostic</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search Input */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Rechercher par nom, marque, modèle..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:border-transparent"
            />
          </div>

          {/* Products List */}
          <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-2">
            {isLoading ? (
              <div className="text-center py-4 text-gray-500">Chargement...</div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-4 text-gray-500">Aucun équipement de diagnostic trouvé</div>
            ) : (
              filteredProducts.map((product) => (
                <Card
                  key={product.id}
                  className={`p-3 ${product.status === 'ACTIVE' ? 'cursor-pointer hover:border-[#1e3a8a]' : 'cursor-not-allowed opacity-75'} transition-colors`}
                  onClick={() => {
                    if (product.status === 'ACTIVE') {
                      onSelect(product);
                      onClose();
                    }
                  }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Activity className="h-4 w-4 text-[#1e3a8a]" />
                        <h4 className="font-medium truncate">{product.name}</h4>
                        {product.status && (
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            product.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 
                            product.status === 'MAINTENANCE' ? 'bg-yellow-100 text-yellow-800' : 
                            product.status === 'RETIRED' ? 'bg-gray-100 text-gray-800' : 
                            product.status === 'RESERVED' ? 'bg-red-100 text-red-800' : 
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {product.status === 'ACTIVE' ? 'Actif' : 
                             product.status === 'MAINTENANCE' ? 'En maintenance' : 
                             product.status === 'RETIRED' ? 'Retiré' : 
                             product.status === 'RESERVED' ? 'Réservé' : 
                             product.status}
                          </span>
                        )}
                        {product.status !== 'ACTIVE' && (
                          <span className="ml-2 text-xs text-red-600">(Non sélectionnable)</span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500 truncate ml-6">
                        {product.brand} {product.model}
                        {product.serialNumber && ` • N°${product.serialNumber}`}
                        {product.reservedUntil && (
                          <span className="ml-2 text-red-600">
                            • Réservé jusqu&apos;au {new Date(product.reservedUntil).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                    {product.sellingPrice && (
                      <div className="text-right font-medium text-[#1e3a8a]">
                        {product.sellingPrice} DT
                      </div>
                    )}
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default DiagnosticProductDialog;