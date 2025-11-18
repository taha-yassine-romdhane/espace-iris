import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import Link from 'next/link';
import {
  Plus,
  Save,
  X,
  Trash2,
  Edit2,
  Search,
  Package,
  Warehouse,
  ShoppingCart,
} from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RentalSelectorDialog } from '@/components/dialogs/RentalSelectorDialog';

interface RentalAccessory {
  id?: string;
  rentalId: string;
  productId: string;
  stockLocationId?: string;
  quantity: number;
  unitPrice: number;
  rental?: {
    rentalCode: string;
    patient?: {
      id: string;
      patientCode: string;
      firstName: string;
      lastName: string;
    };
    medicalDevice?: { name: string; deviceCode: string; serialNumber?: string };
  };
  product?: {
    id: string;
    name: string;
    brand?: string;
    model?: string;
    type?: string;
    productCode?: string;
    stocks?: Array<{
      id: string;
      quantity: number;
      location: {
        id: string;
        name: string;
      };
    }>;
  };
  stockLocation?: {
    id: string;
    name: string;
  };
}

export default function RentalAccessoriesTable() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newRow, setNewRow] = useState<Partial<RentalAccessory> | null>(null);
  const [editData, setEditData] = useState<Partial<RentalAccessory>>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'new' | 'edit'>('new');
  const [productSearchTerm, setProductSearchTerm] = useState("");
  const [selectedProductType, setSelectedProductType] = useState<'all' | 'ACCESSORY' | 'SPARE_PART'>('all');
  const [isRentalDialogOpen, setIsRentalDialogOpen] = useState(false);
  const [rentalDialogMode, setRentalDialogMode] = useState<'new' | 'edit'>('new');
  const [selectedRentalCode, setSelectedRentalCode] = useState<string>('');

  // Fetch rental accessories
  const { data: accessoriesData, isLoading } = useQuery({
    queryKey: ['rental-accessories'],
    queryFn: async () => {
      const response = await fetch('/api/rental-accessories');
      if (!response.ok) throw new Error('Failed to fetch accessories');
      const data = await response.json();
      return Array.isArray(data) ? data : (data.accessories || []);
    },
  });

  // Fetch rentals for dropdown
  const { data: rentalsData } = useQuery({
    queryKey: ['rentals-for-accessories'],
    queryFn: async () => {
      const response = await fetch('/api/rentals/comprehensive');
      if (!response.ok) throw new Error('Failed to fetch rentals');
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    },
  });

  // Fetch products (accessories AND spare parts with stock info)
  const { data: productsData } = useQuery({
    queryKey: ['products-accessories-spareparts'],
    queryFn: async () => {
      const response = await fetch('/api/products?includeStock=true');
      if (!response.ok) throw new Error('Failed to fetch products');
      const data = await response.json();
      const allProducts = Array.isArray(data) ? data : (data.products || []);
      // Filter to only accessories and spare parts
      return allProducts.filter((p: any) => p.type === 'ACCESSORY' || p.type === 'SPARE_PART');
    },
  });

  const accessories = accessoriesData || [];
  const rentals = rentalsData || [];
  const products = productsData || [];

  // Filter accessories
  const filteredAccessories = accessories.filter((acc: RentalAccessory) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    const rentalCode = acc.rental?.rentalCode?.toLowerCase() || '';
    const productName = acc.product?.name?.toLowerCase() || '';
    return rentalCode.includes(search) || productName.includes(search);
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (data: Partial<RentalAccessory>) => {
      const response = await fetch('/api/rental-accessories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create accessory');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rental-accessories'] });
      queryClient.invalidateQueries({ queryKey: ['products-accessories-spareparts'] }); // Refresh stock
      setNewRow(null);
      toast({
        title: "Succès",
        description: "Accessoire ajouté et stock mis à jour"
      });
    },
    onError: (error: Error) => {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<RentalAccessory> }) => {
      const response = await fetch(`/api/rental-accessories/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rental-accessories'] });
      setEditingId(null);
      setEditData({});
      toast({ title: "Succès", description: "Accessoire mis à jour" });
    },
    onError: (error: Error) => {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/rental-accessories/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rental-accessories'] });
      toast({ title: "Succès", description: "Accessoire supprimé" });
    },
    onError: (error: Error) => {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    },
  });

  const handleAddNew = () => {
    setNewRow({
      rentalId: '',
      productId: '',
      quantity: 1,
      unitPrice: 0,
    });
  };

  const handleSaveNew = () => {
    if (!newRow?.rentalId || !newRow?.productId) {
      toast({ title: "Erreur", description: "Veuillez sélectionner une location et un produit", variant: "destructive" });
      return;
    }
    if (!newRow?.stockLocationId) {
      toast({ title: "Erreur", description: "Veuillez sélectionner un emplacement de stock", variant: "destructive" });
      return;
    }
    if (!newRow?.quantity || newRow.quantity < 1) {
      toast({ title: "Erreur", description: "La quantité doit être supérieure à 0", variant: "destructive" });
      return;
    }
    createMutation.mutate(newRow);
  };

  const handleEdit = (accessory: RentalAccessory) => {
    setEditingId(accessory.id!);
    setEditData(accessory);
  };

  const handleSaveEdit = () => {
    if (!editingId) return;
    updateMutation.mutate({ id: editingId, data: editData });
  };

  const handleDelete = (id: string) => {
    if (confirm('Supprimer cet accessoire ?')) {
      deleteMutation.mutate(id);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between bg-white p-4 rounded-lg shadow-sm border">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Rechercher par location ou produit..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={handleAddNew} disabled={newRow !== null} className="bg-green-600 hover:bg-green-700">
          <Plus className="h-4 w-4 mr-2" />
          Ajouter Accessoire
        </Button>
      </div>

      {/* Results count */}
      <div className="text-sm text-slate-600">
        {filteredAccessories.length} accessoire(s) trouvé(s)
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm border overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Location</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Client</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Appareil</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Produit</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Emplacement Stock</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Quantité</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Prix Unitaire</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Total</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {/* New Row */}
            {newRow && (
              <tr className="bg-green-50 border-b-2 border-green-200">
                <td className="px-4 py-3">
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => {
                      setRentalDialogMode('new');
                      setIsRentalDialogOpen(true);
                    }}
                  >
                    {selectedRentalCode || 'Sélectionner location'}
                  </Button>
                </td>
                <td className="px-4 py-3">
                  <span className="text-xs text-slate-500">Auto</span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-xs text-slate-500">Auto</span>
                </td>
                <td className="px-4 py-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setDialogMode('new');
                      setIsProductDialogOpen(true);
                    }}
                    className="w-full justify-start"
                  >
                    {newRow.productId ? (
                      <span className="flex items-center gap-2">
                        <Package className="h-4 w-4" />
                        {products.find((p: any) => p.id === newRow.productId)?.name || 'Produit'}
                      </span>
                    ) : (
                      <span className="text-slate-400 flex items-center gap-2">
                        <ShoppingCart className="h-4 w-4" />
                        Sélectionner produit
                      </span>
                    )}
                  </Button>
                </td>
                <td className="px-4 py-3">
                  {newRow.stockLocationId ? (
                    <Badge variant="outline" className="flex items-center gap-1 w-fit">
                      <Warehouse className="h-3 w-3" />
                      {products.find((p: any) => p.id === newRow.productId)?.stocks?.find((s: any) => s.location.id === newRow.stockLocationId)?.location.name || 'N/A'}
                    </Badge>
                  ) : (
                    <span className="text-xs text-slate-400">Non sélectionné</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <Input
                    type="number"
                    min="1"
                    value={newRow.quantity || 1}
                    onChange={(e) => setNewRow({ ...newRow, quantity: parseInt(e.target.value) })}
                    className="w-20"
                  />
                </td>
                <td className="px-4 py-3">
                  <Input
                    type="number"
                    step="0.01"
                    value={newRow.unitPrice || 0}
                    onChange={(e) => setNewRow({ ...newRow, unitPrice: parseFloat(e.target.value) })}
                    className="w-24"
                  />
                </td>
                <td className="px-4 py-3">
                  <span className="font-medium">
                    {((newRow.quantity || 1) * (newRow.unitPrice || 0)).toFixed(2)} DT
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-2">
                    <Button size="sm" onClick={handleSaveNew} className="bg-green-600 hover:bg-green-700">
                      <Save className="h-3 w-3" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setNewRow(null)}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </td>
              </tr>
            )}

            {/* Existing Rows */}
            {filteredAccessories.map((accessory: RentalAccessory) => {
              const isEditing = editingId === accessory.id;
              const patientName = accessory.rental?.patient
                ? `${accessory.rental.patient.firstName} ${accessory.rental.patient.lastName}`
                : 'N/A';

              if (isEditing) {
                return (
                  <tr key={accessory.id} className="bg-green-50 border-b-2 border-green-200">
                    <td className="px-4 py-3">
                      <Button
                        variant="outline"
                        className="w-full justify-start"
                        onClick={() => {
                          setRentalDialogMode('edit');
                          const rental = rentals.find((r: any) => r.id === editData.rentalId);
                          setSelectedRentalCode(rental?.rentalCode || '');
                          setIsRentalDialogOpen(true);
                        }}
                      >
                        {rentals.find((r: any) => r.id === editData.rentalId)?.rentalCode || 'Sélectionner location'}
                      </Button>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-slate-500">Auto</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-slate-500">Auto</span>
                    </td>
                    <td className="px-4 py-3">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setDialogMode('edit');
                          setIsProductDialogOpen(true);
                        }}
                        className="w-full justify-start"
                      >
                        {editData.productId ? (
                          <span className="flex items-center gap-2">
                            <Package className="h-4 w-4" />
                            {products.find((p: any) => p.id === editData.productId)?.name || 'Produit'}
                          </span>
                        ) : (
                          <span className="text-slate-400 flex items-center gap-2">
                            <ShoppingCart className="h-4 w-4" />
                            Sélectionner produit
                          </span>
                        )}
                      </Button>
                    </td>
                    <td className="px-4 py-3">
                      {editData.stockLocationId ? (
                        <Badge variant="outline" className="flex items-center gap-1 w-fit">
                          <Warehouse className="h-3 w-3" />
                          {products.find((p: any) => p.id === editData.productId)?.stocks?.find((s: any) => s.location.id === editData.stockLocationId)?.location.name || 'N/A'}
                        </Badge>
                      ) : (
                        <span className="text-xs text-slate-400">Non sélectionné</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Input
                        type="number"
                        min="1"
                        value={editData.quantity}
                        onChange={(e) => setEditData({ ...editData, quantity: parseInt(e.target.value) })}
                        className="w-20"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Input
                        type="number"
                        step="0.01"
                        value={editData.unitPrice}
                        onChange={(e) => setEditData({ ...editData, unitPrice: parseFloat(e.target.value) })}
                        className="w-24"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-medium">
                        {((editData.quantity || 0) * (editData.unitPrice || 0)).toFixed(2)} DT
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" onClick={handleSaveEdit} className="bg-green-600 hover:bg-green-700">
                          <Save className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingId(null);
                            setEditData({});
                          }}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              }

              return (
                <tr key={accessory.id} className="border-b hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <Badge variant="outline" className="font-mono text-xs">
                      {accessory.rental?.rentalCode}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    {accessory.rental?.patient ? (
                      <Link
                        href={`/roles/employee/renseignement/patient/${accessory.rental.patient.id}`}
                        className="flex flex-col hover:underline cursor-pointer"
                      >
                        <span className="text-sm font-medium text-green-600">
                          {patientName}
                        </span>
                        <span className="text-xs text-slate-500">
                          {accessory.rental.patient.patientCode}
                        </span>
                      </Link>
                    ) : (
                      <span className="text-sm text-slate-400">N/A</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm text-slate-700">
                      {accessory.rental?.medicalDevice?.name || 'N/A'}
                    </div>
                    <div className="text-xs text-slate-500">
                      {accessory.rental?.medicalDevice?.deviceCode}
                    </div>
                    {accessory.rental?.medicalDevice?.serialNumber && (
                      <div className="text-xs text-slate-500 font-mono">
                        SN: {accessory.rental.medicalDevice.serialNumber}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-green-600" />
                      <div>
                        <div className="text-sm font-medium text-slate-900">
                          {accessory.product?.name || 'N/A'}
                        </div>
                        {accessory.product?.productCode && (
                          <div className="text-xs text-slate-500">{accessory.product.productCode}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {accessory.stockLocation ? (
                      <div className="flex flex-col gap-1">
                        <span className="text-xs text-slate-500">Sortie de:</span>
                        <Badge variant="outline" className="flex items-center gap-1 w-fit">
                          <Warehouse className="h-3 w-3" />
                          {accessory.stockLocation.name}
                        </Badge>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">Non spécifié</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="secondary">{accessory.quantity}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-slate-700">
                      {Number(accessory.unitPrice).toFixed(2)} DT
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm font-semibold text-green-700">
                      {(accessory.quantity * Number(accessory.unitPrice)).toFixed(2)} DT
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleEdit(accessory)}>
                        <Edit2 className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(accessory.id!)}
                        className="text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}

            {filteredAccessories.length === 0 && !newRow && (
              <tr>
                <td colSpan={9} className="px-4 py-12 text-center text-slate-500">
                  Aucun accessoire trouvé. Cliquez sur "Ajouter Accessoire" pour commencer.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Product Selection Dialog */}
      <Dialog open={isProductDialogOpen} onOpenChange={setIsProductDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Sélectionner un Produit (Accessoire / Pièce Détachée)
            </DialogTitle>
            <DialogDescription>
              Choisissez un accessoire ou une pièce détachée et sélectionnez l'emplacement de stock
            </DialogDescription>
          </DialogHeader>

          {/* Search and Filter Bar */}
          <div className="flex gap-4 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Rechercher par nom, code, marque..."
                value={productSearchTerm}
                onChange={(e) => setProductSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedProductType} onValueChange={(value: any) => setSelectedProductType(value)}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les types</SelectItem>
                <SelectItem value="ACCESSORY">Accessoires</SelectItem>
                <SelectItem value="SPARE_PART">Pièces Détachées</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Products Grid */}
          <div className="grid gap-4">
            {products
              .filter((product: any) => {
                // Filter by type
                if (selectedProductType !== 'all' && product.type !== selectedProductType) {
                  return false;
                }
                // Filter by search term
                if (productSearchTerm) {
                  const search = productSearchTerm.toLowerCase();
                  return (
                    product.name?.toLowerCase().includes(search) ||
                    product.productCode?.toLowerCase().includes(search) ||
                    product.brand?.toLowerCase().includes(search) ||
                    product.model?.toLowerCase().includes(search)
                  );
                }
                return true;
              })
              .map((product: any) => {
                const totalStock = product.stocks?.reduce((sum: number, stock: any) => sum + stock.quantity, 0) || 0;
                const typeLabel = product.type === 'ACCESSORY' ? 'Accessoire' : 'Pièce Détachée';
                const typeBadgeColor = product.type === 'ACCESSORY' ? 'bg-green-100 text-green-700' : 'bg-purple-100 text-purple-700';

                return (
                  <div
                    key={product.id}
                    className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-slate-900">{product.name}</h4>
                          <Badge className={typeBadgeColor}>{typeLabel}</Badge>
                        </div>
                        <div className="text-sm text-slate-600 space-y-1">
                          {product.productCode && (
                            <div>Code: <span className="font-medium">{product.productCode}</span></div>
                          )}
                          {(product.brand || product.model) && (
                            <div>{[product.brand, product.model].filter(Boolean).join(' - ')}</div>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-slate-900">
                          {product.price?.toFixed(2) || '0.00'} DT
                        </div>
                        <div className={`text-sm font-medium ${totalStock > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          Stock total: {totalStock}
                        </div>
                      </div>
                    </div>

                    {/* Stock by Location */}
                    {product.stocks && product.stocks.length > 0 ? (
                      <div className="space-y-2 mt-3 pt-3 border-t">
                        <div className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                          <Warehouse className="h-3 w-3" />
                          Stock par emplacement:
                        </div>
                        {product.stocks.map((stock: any) => (
                          <div
                            key={stock.id}
                            className="flex items-center justify-between bg-slate-50 p-2 rounded hover:bg-slate-100 transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              <Warehouse className={`h-4 w-4 ${stock.quantity > 0 ? 'text-green-600' : 'text-red-600'}`} />
                              <span className="text-sm font-medium text-slate-700">
                                {stock.location?.name || 'N/A'}
                              </span>
                              <span className={`text-sm font-bold ${stock.quantity > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                ({stock.quantity} unité{stock.quantity > 1 ? 's' : ''})
                              </span>
                            </div>
                            <Button
                              size="sm"
                              disabled={stock.quantity === 0}
                              onClick={() => {
                                const dataToUpdate = dialogMode === 'new' ? newRow : editData;
                                const setterFn = dialogMode === 'new' ? setNewRow : setEditData;

                                setterFn({
                                  ...dataToUpdate,
                                  productId: product.id,
                                  stockLocationId: stock.location.id,
                                  unitPrice: product.price || 0,
                                  quantity: 1,
                                });
                                setIsProductDialogOpen(false);
                                setProductSearchTerm('');
                              }}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <ShoppingCart className="h-3 w-3 mr-1" />
                              Sélectionner
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="mt-3 pt-3 border-t text-sm text-red-600">
                        Aucun stock disponible
                      </div>
                    )}
                  </div>
                );
              })}
          </div>

          {products.filter((product: any) => {
            if (selectedProductType !== 'all' && product.type !== selectedProductType) return false;
            if (productSearchTerm) {
              const search = productSearchTerm.toLowerCase();
              return (
                product.name?.toLowerCase().includes(search) ||
                product.productCode?.toLowerCase().includes(search) ||
                product.brand?.toLowerCase().includes(search) ||
                product.model?.toLowerCase().includes(search)
              );
            }
            return true;
          }).length === 0 && (
            <div className="text-center py-12 text-slate-500">
              <Package className="h-12 w-12 mx-auto mb-3 text-slate-300" />
              <p>Aucun produit trouvé</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Rental Selection Dialog */}
      <RentalSelectorDialog
        open={isRentalDialogOpen}
        onOpenChange={setIsRentalDialogOpen}
        onSelect={(rentalId, rentalCode) => {
          setSelectedRentalCode(rentalCode);
          if (rentalDialogMode === 'new') {
            setNewRow({ ...newRow!, rentalId });
          } else {
            setEditData({ ...editData, rentalId });
          }
        }}
        selectedRentalId={rentalDialogMode === 'new' ? newRow?.rentalId : editData.rentalId}
      />
    </div>
  );
}
