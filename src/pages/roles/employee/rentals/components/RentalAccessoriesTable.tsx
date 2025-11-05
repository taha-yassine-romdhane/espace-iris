import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Save,
  X,
  Trash2,
  Edit2,
  Search,
  Package,
} from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface RentalAccessory {
  id?: string;
  rentalId: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  rental?: {
    rentalCode: string;
    patient?: { firstName: string; lastName: string };
    medicalDevice?: { name: string; deviceCode: string };
  };
  product?: {
    id: string;
    name: string;
    brand?: string;
    model?: string;
  };
}

export default function RentalAccessoriesTable() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newRow, setNewRow] = useState<Partial<RentalAccessory> | null>(null);
  const [editData, setEditData] = useState<Partial<RentalAccessory>>({});
  const [searchTerm, setSearchTerm] = useState("");

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

  // Fetch products (accessories/spare parts)
  const { data: productsData } = useQuery({
    queryKey: ['products-accessories'],
    queryFn: async () => {
      const response = await fetch('/api/products?type=ACCESSORY');
      if (!response.ok) throw new Error('Failed to fetch products');
      const data = await response.json();
      return Array.isArray(data) ? data : (data.products || []);
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
      setNewRow(null);
      toast({ title: "Succès", description: "Accessoire ajouté" });
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
      toast({ title: "Erreur", description: "Remplissez tous les champs", variant: "destructive" });
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
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
        <Button onClick={handleAddNew} disabled={newRow !== null} className="bg-blue-600 hover:bg-blue-700">
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
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Accessoire</th>
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
                  <Select
                    value={newRow.rentalId}
                    onValueChange={(value) => setNewRow({ ...newRow, rentalId: value })}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Sélectionner location" />
                    </SelectTrigger>
                    <SelectContent>
                      {rentals.map((rental: any) => (
                        <SelectItem key={rental.id} value={rental.id}>
                          {rental.rentalCode}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </td>
                <td className="px-4 py-3">
                  <span className="text-xs text-slate-500">Auto</span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-xs text-slate-500">Auto</span>
                </td>
                <td className="px-4 py-3">
                  <Select
                    value={newRow.productId}
                    onValueChange={(value) => {
                      const product = products.find((p: any) => p.id === value);
                      setNewRow({
                        ...newRow,
                        productId: value,
                        unitPrice: product?.price || 0,
                      });
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Sélectionner produit" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((product: any) => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                  <tr key={accessory.id} className="bg-blue-50 border-b-2 border-blue-200">
                    <td className="px-4 py-3">
                      <Select
                        value={editData.rentalId}
                        onValueChange={(value) => setEditData({ ...editData, rentalId: value })}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {rentals.map((rental: any) => (
                            <SelectItem key={rental.id} value={rental.id}>
                              {rental.rentalCode}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-slate-500">Auto</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-slate-500">Auto</span>
                    </td>
                    <td className="px-4 py-3">
                      <Select
                        value={editData.productId}
                        onValueChange={(value) => setEditData({ ...editData, productId: value })}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {products.map((product: any) => (
                            <SelectItem key={product.id} value={product.id}>
                              {product.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
                        <Button size="sm" onClick={handleSaveEdit} className="bg-blue-600 hover:bg-blue-700">
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
                    <div className="text-sm text-slate-900">{patientName}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm text-slate-700">
                      {accessory.rental?.medicalDevice?.name || 'N/A'}
                    </div>
                    <div className="text-xs text-slate-500">
                      {accessory.rental?.medicalDevice?.deviceCode}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium text-slate-900">
                        {accessory.product?.name || 'N/A'}
                      </span>
                    </div>
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
                    <span className="text-sm font-semibold text-blue-700">
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
                <td colSpan={8} className="px-4 py-12 text-center text-slate-500">
                  Aucun accessoire trouvé. Cliquez sur "Ajouter Accessoire" pour commencer.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
