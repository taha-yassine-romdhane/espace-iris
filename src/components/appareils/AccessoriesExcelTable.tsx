import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Check, X, Edit2, Plus, Trash2, Search, ChevronLeft, ChevronRight, Copy } from "lucide-react";

interface Stock {
  id: string;
  locationId: string;
  quantity: number;
  status: string;
  location: { id: string; name: string };
}

interface Accessory {
  id?: string;
  productCode?: string;
  name: string;
  type: string;
  brand?: string;
  model?: string;
  description?: string;
  stocks?: Stock[];
  purchasePrice?: number;
  sellingPrice?: number;
  minQuantity?: number;
  status: string;
}

// Flatten accessories to show one row per stock location
interface AccessoryRow {
  productId?: string;
  stockId?: string;
  productCode?: string;
  name: string;
  brand?: string;
  model?: string;
  description?: string;
  locationId?: string;
  locationName?: string;
  quantity?: number;
  purchasePrice?: number;
  sellingPrice?: number;
  minQuantity?: number;
  status: string;
  isNewLocation?: boolean; // Flag for adding same product to new location
}

interface AccessoryCreateData extends Partial<Accessory> {
  stockLocationId?: string;
  stockQuantity?: number;
}

interface AccessoriesExcelTableProps {
  accessories: Accessory[];
  stockLocations: Array<{ id: string; name: string }>;
  onAccessoryUpdate: (accessory: Accessory) => Promise<void>;
  onAccessoryCreate: (accessory: AccessoryCreateData) => Promise<void>;
  onAccessoryDelete: (id: string) => Promise<void>;
  onRefresh?: () => void;
}

const STATUSES = ["ACTIVE", "RETIRED", "SOLD"];

const getStatusLabel = (status: string): string => {
  const statusLabels: Record<string, string> = {
    ACTIVE: "Actif",
    RETIRED: "Retiré",
    SOLD: "Vendu"
  };
  return statusLabels[status] || status;
};

export function AccessoriesExcelTable({
  accessories,
  stockLocations,
  onAccessoryUpdate,
  onAccessoryCreate,
  onAccessoryDelete,
  onRefresh
}: AccessoriesExcelTableProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [editingRowKey, setEditingRowKey] = useState<string | null>(null);
  const [editedRow, setEditedRow] = useState<AccessoryRow | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newRow, setNewRow] = useState<AccessoryRow>({
    name: '',
    status: 'ACTIVE',
    minQuantity: 5,
    quantity: 0
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [locationFilter, setLocationFilter] = useState<string>('ALL');
  const [brandFilter, setBrandFilter] = useState<string>('ALL');
  const [stockLevelFilter, setStockLevelFilter] = useState<string>('ALL');

  // Duplicate dialog state
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [rowToDuplicate, setRowToDuplicate] = useState<AccessoryRow | null>(null);
  const [duplicateLocationId, setDuplicateLocationId] = useState<string>('');
  const [duplicateQuantity, setDuplicateQuantity] = useState<number>(0);

  // Delete warning dialog state
  const [showDeleteWarningDialog, setShowDeleteWarningDialog] = useState(false);
  const [rowToDelete, setRowToDelete] = useState<AccessoryRow | null>(null);

  // Flatten accessories to rows (one per stock location, including "vendu")
  const flattenAccessories = (): AccessoryRow[] => {
    const rows: AccessoryRow[] = [];

    accessories.forEach(accessory => {
      if (accessory.stocks && accessory.stocks.length > 0) {
        // Show all stock locations including "vendu"
        accessory.stocks.forEach(stock => {
          rows.push({
            productId: accessory.id,
            stockId: stock.id,
            productCode: accessory.productCode,
            name: accessory.name,
            brand: accessory.brand,
            model: accessory.model,
            description: accessory.description,
            locationId: stock.locationId,
            locationName: stock.location?.name,
            quantity: stock.quantity,
            purchasePrice: accessory.purchasePrice,
            sellingPrice: accessory.sellingPrice,
            minQuantity: accessory.minQuantity,
            status: accessory.status
          });
        });
      } else {
        // Product with no stock locations
        rows.push({
          productId: accessory.id,
          productCode: accessory.productCode,
          name: accessory.name,
          brand: accessory.brand,
          model: accessory.model,
          description: accessory.description,
          purchasePrice: accessory.purchasePrice,
          sellingPrice: accessory.sellingPrice,
          minQuantity: accessory.minQuantity,
          status: accessory.status
        });
      }
    });

    return rows;
  };

  const allRows = flattenAccessories();

  // Get unique values for filters
  const uniqueBrands = Array.from(new Set(allRows.map(row => row.brand).filter(Boolean))).sort();

  const filteredRows = allRows.filter(row => {
    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      const matchesSearch =
        row.name?.toLowerCase().includes(search) ||
        row.brand?.toLowerCase().includes(search) ||
        row.model?.toLowerCase().includes(search) ||
        row.productCode?.toLowerCase().includes(search) ||
        row.description?.toLowerCase().includes(search);
      if (!matchesSearch) return false;
    }

    // Status filter
    if (statusFilter !== 'ALL' && row.status !== statusFilter) return false;

    // Location filter
    if (locationFilter !== 'ALL' && row.locationId !== locationFilter) return false;

    // Brand filter
    if (brandFilter !== 'ALL' && row.brand !== brandFilter) return false;

    // Stock level filter
    if (stockLevelFilter !== 'ALL') {
      const quantity = row.quantity || 0;
      const minQty = row.minQuantity || 0;

      if (stockLevelFilter === 'OUT_OF_STOCK' && quantity !== 0) return false;
      if (stockLevelFilter === 'LOW_STOCK' && (quantity === 0 || quantity > minQty)) return false;
      if (stockLevelFilter === 'IN_STOCK' && quantity <= minQty) return false;
    }

    return true;
  });

  const totalPages = Math.ceil(filteredRows.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedRows = filteredRows.slice(startIndex, endIndex);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, locationFilter, brandFilter, stockLevelFilter]);

  const getRowKey = (row: AccessoryRow) => {
    return row.stockId || row.productId || 'new';
  };

  const handleEdit = (row: AccessoryRow) => {
    setEditingRowKey(getRowKey(row));
    setEditedRow({ ...row });
  };

  const handleCancel = () => {
    setEditingRowKey(null);
    setEditedRow(null);
  };

  const handleSave = async () => {
    if (!editedRow || !editedRow.productId) return;

    try {
      // Update the product with basic info
      const cleanData = {
        id: editedRow.productId,
        name: editedRow.name,
        brand: editedRow.brand,
        model: editedRow.model,
        description: editedRow.description,
        purchasePrice: editedRow.purchasePrice,
        sellingPrice: editedRow.sellingPrice,
        status: editedRow.status,
        minQuantity: editedRow.minQuantity
      };

      await onAccessoryUpdate(cleanData as Accessory);

      // Update stock quantity if we have stock info
      if (editedRow.stockId && editedRow.locationId) {
        const stockResponse = await fetch(`/api/stocks/${editedRow.stockId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            quantity: editedRow.quantity,
            locationId: editedRow.locationId
          })
        });

        if (!stockResponse.ok) {
          throw new Error('Failed to update stock');
        }
      }

      setEditingRowKey(null);
      setEditedRow(null);

      // Trigger refresh to reload data
      if (onRefresh) {
        onRefresh();
      }

      toast({ title: "Succès", description: "Accessoire mis à jour avec succès" });
    } catch (error) {
      console.error('Update error:', error);
      toast({ title: "Erreur", description: "Erreur lors de la mise à jour", variant: "destructive" });
    }
  };

  const handleAddNew = () => setIsAddingNew(true);

  const handleCancelNew = () => {
    setIsAddingNew(false);
    setNewRow({ name: '', status: 'ACTIVE', minQuantity: 5, quantity: 0 });
  };

  const handleSaveNew = async () => {
    if (!newRow.name || !newRow.locationId) {
      toast({ title: "Erreur", description: "Nom et emplacement sont requis", variant: "destructive" });
      return;
    }

    try {
      await onAccessoryCreate({
        ...newRow,
        type: 'ACCESSORY',
        stockLocationId: newRow.locationId,
        stockQuantity: newRow.quantity || 0
      });
      setIsAddingNew(false);
      setNewRow({ name: '', status: 'ACTIVE', minQuantity: 5, quantity: 0 });
      toast({ title: "Succès", description: "Accessoire créé avec succès" });
    } catch {
      toast({ title: "Erreur", description: "Erreur lors de la création", variant: "destructive" });
    }
  };

  const handleDelete = (row: AccessoryRow) => {
    if (!row.productId) return;
    setRowToDelete(row);
    setShowDeleteWarningDialog(true);
  };

  const handleConfirmDelete = async () => {
    if (!rowToDelete?.productId) return;

    try {
      await onAccessoryDelete(rowToDelete.productId);
      setShowDeleteWarningDialog(false);
      setRowToDelete(null);
      toast({ title: "Succès", description: "Accessoire supprimé avec succès (toutes les locations)" });
    } catch {
      toast({ title: "Erreur", description: "Erreur lors de la suppression", variant: "destructive" });
    }
  };

  const handleSetStockToZero = async () => {
    if (!rowToDelete?.stockId) return;

    try {
      const stockResponse = await fetch(`/api/stocks/${rowToDelete.stockId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quantity: 0,
          locationId: rowToDelete.locationId
        })
      });

      if (!stockResponse.ok) {
        throw new Error('Failed to update stock');
      }

      setShowDeleteWarningDialog(false);
      setRowToDelete(null);

      // Trigger refresh to reload data
      if (onRefresh) {
        onRefresh();
      }

      toast({ title: "Succès", description: "Stock mis à zéro pour cette location" });
    } catch {
      toast({ title: "Erreur", description: "Erreur lors de la mise à jour", variant: "destructive" });
    }
  };

  const handleDuplicateToLocation = (row: AccessoryRow) => {
    if (!row.productId) return;
    setRowToDuplicate(row);
    setDuplicateLocationId('');
    setDuplicateQuantity(0);
    setShowDuplicateDialog(true);
  };

  const handleConfirmDuplicate = async () => {
    if (!rowToDuplicate || !rowToDuplicate.productId || !duplicateLocationId) {
      toast({ title: "Erreur", description: "Veuillez sélectionner un emplacement", variant: "destructive" });
      return;
    }

    try {
      const response = await fetch('/api/stocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: rowToDuplicate.productId,
          locationId: duplicateLocationId,
          quantity: duplicateQuantity || 0,
          status: 'FOR_SALE'
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create stock');
      }

      setShowDuplicateDialog(false);
      setRowToDuplicate(null);
      setDuplicateLocationId('');
      setDuplicateQuantity(0);

      toast({ title: "Succès", description: "Accessoire dupliqué vers un nouvel emplacement" });

      // Trigger refresh to reload data
      if (onRefresh) {
        onRefresh();
      }
    } catch (error) {
      console.error('Duplicate error:', error);
      toast({ title: "Erreur", description: "Erreur lors de la duplication", variant: "destructive" });
    }
  };

  const updateEditedField = (field: keyof AccessoryRow, value: string | number | null | undefined) => {
    if (editedRow) {
      setEditedRow({ ...editedRow, [field]: value });
    }
  };

  const updateNewField = (field: keyof AccessoryRow, value: string | number | null | undefined) => {
    setNewRow({ ...newRow, [field]: value });
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'destructive' | 'secondary'> = {
      ACTIVE: 'default',
      OUT_OF_STOCK: 'destructive',
      DISCONTINUED: 'secondary'
    };
    return variants[status] || 'default';
  };

  const renderCell = (row: AccessoryRow, field: keyof AccessoryRow, isEditing: boolean) => {
    const value = isEditing && editedRow ? editedRow[field] : row[field];

    if (isEditing && editedRow) {
      switch (field) {
        case 'name':
        case 'brand':
        case 'model':
        case 'description':
          return (
            <Input
              value={(editedRow[field] as string) || ''}
              onChange={(e) => updateEditedField(field, e.target.value)}
              className="h-8 text-xs"
            />
          );

        case 'status':
          return (
            <Select value={editedRow.status} onValueChange={(val) => updateEditedField('status', val)}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUSES.map(status => (
                  <SelectItem key={status} value={status}>{getStatusLabel(status)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          );

        case 'locationId':
          return (
            <Select value={editedRow.locationId || ''} onValueChange={(val) => updateEditedField('locationId', val)}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {stockLocations.map(loc => (
                  <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          );

        case 'purchasePrice':
        case 'sellingPrice':
        case 'minQuantity':
        case 'quantity':
          return (
            <Input
              type="number"
              step={field.includes('Price') ? "0.01" : "1"}
              value={editedRow[field] || ''}
              onChange={(e) => updateEditedField(field, e.target.value ? parseFloat(e.target.value) : null)}
              className="h-8 text-xs"
            />
          );

        default:
          return <span className="text-xs">{(value as string) || '-'}</span>;
      }
    }

    switch (field) {
      case 'status':
        return <Badge variant={getStatusBadge(value as string)} className="text-xs">{getStatusLabel(value as string)}</Badge>;
      case 'locationId':
        const isVenduLocation = row.locationName?.toLowerCase() === 'vendu';
        return (
          <Badge
            variant="outline"
            className={`text-xs whitespace-nowrap ${
              isVenduLocation
                ? 'border-red-500 text-red-700 bg-red-50'
                : 'border-blue-500 text-blue-700 bg-blue-50'
            }`}
          >
            {row.locationName || '-'}
          </Badge>
        );
      case 'quantity':
        const isVenduQty = row.locationName?.toLowerCase() === 'vendu';
        return (
          <Badge
            variant="outline"
            className={`text-xs whitespace-nowrap ${
              isVenduQty
                ? 'border-red-500 text-red-700 bg-red-50'
                : 'border-blue-500 text-blue-700 bg-blue-50'
            }`}
          >
            {value ?? 0}
          </Badge>
        );
      case 'purchasePrice':
      case 'sellingPrice':
        return <span className="text-xs">{value ? `${value} DT` : '-'}</span>;
      case 'productCode':
        return (
          <Badge
            variant="outline"
            className="font-mono text-xs whitespace-nowrap cursor-pointer hover:bg-blue-100 transition-colors"
            onClick={() => row.productId && router.push(`/roles/admin/appareils/accessory/${row.productId}`)}
          >
            {value || 'N/A'}
          </Badge>
        );
      case 'name':
        return (
          <span
            className="text-xs font-medium cursor-pointer text-blue-600 hover:text-blue-800 hover:underline transition-colors"
            onClick={() => row.productId && router.push(`/roles/admin/appareils/accessory/${row.productId}`)}
          >
            {(value as string) || '-'}
          </span>
        );
      default:
        return <span className="text-xs">{(value as string) ?? '-'}</span>;
    }
  };

  const renderNewRow = () => {
    if (!isAddingNew) return null;

    return (
      <tr className="bg-blue-50 border-b border-blue-200">
        <td className="px-2 py-2 text-center text-xs text-muted-foreground">Auto</td>
        <td className="px-2 py-2">
          <Input
            value={newRow.name || ''}
            onChange={(e) => updateNewField('name', e.target.value)}
            className="h-8 text-xs w-40"
            placeholder="Nom accessoire"
          />
        </td>
        <td className="px-2 py-2">
          <Input
            value={newRow.brand || ''}
            onChange={(e) => updateNewField('brand', e.target.value)}
            className="h-8 text-xs w-32"
            placeholder="Marque"
          />
        </td>
        <td className="px-2 py-2">
          <Input
            value={newRow.model || ''}
            onChange={(e) => updateNewField('model', e.target.value)}
            className="h-8 text-xs w-32"
            placeholder="Modèle"
          />
        </td>
        <td className="px-2 py-2">
          <Input
            value={newRow.description || ''}
            onChange={(e) => updateNewField('description', e.target.value)}
            className="h-8 text-xs w-48"
            placeholder="Description"
          />
        </td>
        <td className="px-2 py-2">
          <Select value={newRow.locationId || ''} onValueChange={(val) => updateNewField('locationId', val)}>
            <SelectTrigger className="h-8 text-xs w-40">
              <SelectValue placeholder="Emplacement" />
            </SelectTrigger>
            <SelectContent>
              {stockLocations.map(loc => (
                <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </td>
        <td className="px-2 py-2">
          <Input
            type="number"
            value={newRow.quantity || ''}
            onChange={(e) => updateNewField('quantity', e.target.value ? parseInt(e.target.value) : 0)}
            className="h-8 text-xs w-24"
            placeholder="Qté"
          />
        </td>
        <td className="px-2 py-2">
          <Input
            type="number"
            step="0.01"
            value={newRow.purchasePrice || ''}
            onChange={(e) => updateNewField('purchasePrice', e.target.value ? parseFloat(e.target.value) : null)}
            className="h-8 text-xs w-28"
            placeholder="Prix achat"
          />
        </td>
        <td className="px-2 py-2">
          <Input
            type="number"
            step="0.01"
            value={newRow.sellingPrice || ''}
            onChange={(e) => updateNewField('sellingPrice', e.target.value ? parseFloat(e.target.value) : null)}
            className="h-8 text-xs w-28"
            placeholder="Prix vente"
          />
        </td>
        <td className="px-2 py-2">
          <Input
            type="number"
            value={newRow.minQuantity || ''}
            onChange={(e) => updateNewField('minQuantity', e.target.value ? parseInt(e.target.value) : 0)}
            className="h-8 text-xs w-24"
            placeholder="Min"
          />
        </td>
        <td className="px-2 py-2">
          <Select value={newRow.status} onValueChange={(val) => updateNewField('status', val)}>
            <SelectTrigger className="h-8 text-xs w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUSES.map(status => (
                <SelectItem key={status} value={status}>{getStatusLabel(status)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </td>
        <td className="px-2 py-2 sticky right-0 bg-blue-50">
          <div className="flex items-center gap-1">
            <Button onClick={handleSaveNew} size="icon" variant="ghost" className="h-7 w-7 text-green-600 hover:bg-green-50">
              <Check className="h-4 w-4" />
            </Button>
            <Button onClick={handleCancelNew} size="icon" variant="ghost" className="h-7 w-7 text-red-600 hover:bg-red-50">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </td>
      </tr>
    );
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="space-y-3 bg-gray-50 p-4 rounded-lg border">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par nom, marque, code..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
          <Button onClick={handleAddNew} disabled={isAddingNew}>
            <Plus className="h-4 w-4 mr-2" />
            Ajouter
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">Filtres:</span>
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px] h-9">
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tous les statuts</SelectItem>
              {STATUSES.map(status => (
                <SelectItem key={status} value={status}>{getStatusLabel(status)}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={locationFilter} onValueChange={setLocationFilter}>
            <SelectTrigger className="w-[180px] h-9">
              <SelectValue placeholder="Emplacement" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tous les emplacements</SelectItem>
              {stockLocations.map(location => (
                <SelectItem key={location.id} value={location.id}>{location.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={brandFilter} onValueChange={setBrandFilter}>
            <SelectTrigger className="w-[160px] h-9">
              <SelectValue placeholder="Marque" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Toutes les marques</SelectItem>
              {uniqueBrands.map(brand => (
                <SelectItem key={brand} value={brand as string}>{brand}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={stockLevelFilter} onValueChange={setStockLevelFilter}>
            <SelectTrigger className="w-[160px] h-9">
              <SelectValue placeholder="Niveau stock" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tous les niveaux</SelectItem>
              <SelectItem value="IN_STOCK">En stock</SelectItem>
              <SelectItem value="LOW_STOCK">Stock faible</SelectItem>
              <SelectItem value="OUT_OF_STOCK">Rupture</SelectItem>
            </SelectContent>
          </Select>

          {(statusFilter !== 'ALL' || locationFilter !== 'ALL' || brandFilter !== 'ALL' || stockLevelFilter !== 'ALL' || searchTerm) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setStatusFilter('ALL');
                setLocationFilter('ALL');
                setBrandFilter('ALL');
                setStockLevelFilter('ALL');
                setSearchTerm('');
              }}
              className="h-9"
            >
              <X className="h-4 w-4 mr-1" />
              Réinitialiser
            </Button>
          )}
        </div>

        <div className="text-xs text-muted-foreground">
          {filteredRows.length} accessoire{filteredRows.length > 1 ? 's' : ''} trouvé{filteredRows.length > 1 ? 's' : ''}
        </div>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 border-b sticky top-0 z-10">
              <tr>
                <th className="px-2 py-3 text-left font-medium text-xs">Code</th>
                <th className="px-2 py-3 text-left font-medium text-xs">Nom</th>
                <th className="px-2 py-3 text-left font-medium text-xs">Marque</th>
                <th className="px-2 py-3 text-left font-medium text-xs">Modèle</th>
                <th className="px-2 py-3 text-left font-medium text-xs">Description</th>
                <th className="px-2 py-3 text-left font-medium text-xs">Emplacement</th>
                <th className="px-2 py-3 text-center font-medium text-xs">Quantité</th>
                <th className="px-2 py-3 text-left font-medium text-xs">Prix Achat</th>
                <th className="px-2 py-3 text-left font-medium text-xs">Prix Vente</th>
                <th className="px-2 py-3 text-left font-medium text-xs">Qté Min</th>
                <th className="px-2 py-3 text-left font-medium text-xs">Statut</th>
                <th className="px-2 py-3 text-center font-medium text-xs sticky right-0 bg-gray-100">Actions</th>
              </tr>
            </thead>
            <tbody>
              {renderNewRow()}
              {paginatedRows.map((row) => {
                const rowKey = getRowKey(row);
                const isEditing = editingRowKey === rowKey;
                const rowClass = isEditing ? "bg-yellow-50" : "hover:bg-gray-50";

                return (
                  <tr key={rowKey} className={`border-b ${rowClass}`}>
                    <td className="px-2 py-2">{renderCell(row, 'productCode', false)}</td>
                    <td className="px-2 py-2">{renderCell(row, 'name', isEditing)}</td>
                    <td className="px-2 py-2">{renderCell(row, 'brand', isEditing)}</td>
                    <td className="px-2 py-2">{renderCell(row, 'model', isEditing)}</td>
                    <td className="px-2 py-2">{renderCell(row, 'description', isEditing)}</td>
                    <td className="px-2 py-2">{renderCell(row, 'locationId', isEditing)}</td>
                    <td className="px-2 py-2 text-center">{renderCell(row, 'quantity', isEditing)}</td>
                    <td className="px-2 py-2">{renderCell(row, 'purchasePrice', isEditing)}</td>
                    <td className="px-2 py-2">{renderCell(row, 'sellingPrice', isEditing)}</td>
                    <td className="px-2 py-2">{renderCell(row, 'minQuantity', isEditing)}</td>
                    <td className="px-2 py-2">{renderCell(row, 'status', isEditing)}</td>
                    <td className="px-2 py-2 sticky right-0 bg-white">
                      {isEditing ? (
                        <div className="flex items-center gap-1 justify-center">
                          <Button onClick={handleSave} size="icon" variant="ghost" className="h-7 w-7 text-green-600 hover:bg-green-50">
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button onClick={handleCancel} size="icon" variant="ghost" className="h-7 w-7 text-red-600 hover:bg-red-50">
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 justify-center">
                          <Button onClick={() => handleEdit(row)} size="icon" variant="ghost" className="h-7 w-7" title="Modifier">
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button onClick={() => handleDuplicateToLocation(row)} size="icon" variant="ghost" className="h-7 w-7 text-blue-600" title="Dupliquer vers un autre emplacement">
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button onClick={() => handleDelete(row)} size="icon" variant="ghost" className="h-7 w-7 text-red-600 hover:bg-red-50" title="Supprimer">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Afficher</span>
          <Select value={itemsPerPage.toString()} onValueChange={(val) => setItemsPerPage(Number(val))}>
            <SelectTrigger className="w-[100px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground">
            {startIndex + 1}-{Math.min(endIndex, filteredRows.length)} sur {filteredRows.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            size="sm"
            variant="outline"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm">
            Page {currentPage} sur {totalPages || 1}
          </span>
          <Button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            size="sm"
            variant="outline"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Duplicate to Location Dialog */}
      <Dialog open={showDuplicateDialog} onOpenChange={setShowDuplicateDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Dupliquer vers un autre emplacement</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Accessoire</label>
              <Input
                value={`${rowToDuplicate?.name || ''} - ${rowToDuplicate?.brand || ''} ${rowToDuplicate?.model || ''}`}
                disabled
                className="bg-gray-50"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Nouvel emplacement</label>
              <Select value={duplicateLocationId} onValueChange={setDuplicateLocationId}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un emplacement" />
                </SelectTrigger>
                <SelectContent>
                  {stockLocations
                    .filter(loc => loc.id !== rowToDuplicate?.locationId) // Exclude current location
                    .map(loc => (
                      <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Quantité initiale</label>
              <Input
                type="number"
                value={duplicateQuantity}
                onChange={(e) => setDuplicateQuantity(parseInt(e.target.value) || 0)}
                placeholder="0"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowDuplicateDialog(false)}>
              Annuler
            </Button>
            <Button onClick={handleConfirmDuplicate}>
              Dupliquer
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Warning Dialog */}
      <Dialog open={showDeleteWarningDialog} onOpenChange={setShowDeleteWarningDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-red-600">⚠️ Attention - Suppression d&apos;accessoire</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
              <p className="font-semibold text-yellow-800">
                Cet accessoire existe dans plusieurs emplacements !
              </p>
              <p className="text-sm text-yellow-700 mt-2">
                Si vous supprimez cet accessoire, <strong>tous les stocks dans toutes les locations seront définitivement supprimés</strong>.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Accessoire concerné :</label>
              <Input
                value={`${rowToDelete?.productCode || ''} - ${rowToDelete?.name || ''}`}
                disabled
                className="bg-gray-50"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Emplacement sélectionné :</label>
              <Input
                value={rowToDelete?.locationName || ''}
                disabled
                className="bg-gray-50"
              />
            </div>

            <div className="border-t pt-4">
              <p className="text-sm font-medium mb-3">Que souhaitez-vous faire ?</p>
              <div className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full justify-start text-left h-auto py-3"
                  onClick={handleSetStockToZero}
                >
                  <div>
                    <div className="font-medium">Mettre le stock à zéro pour cet emplacement uniquement</div>
                    <div className="text-xs text-muted-foreground">L&apos;accessoire reste disponible dans les autres emplacements</div>
                  </div>
                </Button>

                <Button
                  variant="destructive"
                  className="w-full justify-start text-left h-auto py-3"
                  onClick={handleConfirmDelete}
                >
                  <div>
                    <div className="font-medium">Supprimer complètement l&apos;accessoire</div>
                    <div className="text-xs">Supprime le produit et tous ses stocks dans toutes les locations</div>
                  </div>
                </Button>
              </div>
            </div>
          </div>
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => setShowDeleteWarningDialog(false)}>
              Annuler
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
