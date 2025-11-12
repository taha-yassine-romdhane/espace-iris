import React, { useState, useEffect } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { Check, X, Edit2, Plus, Trash2, Search, ChevronLeft, ChevronRight } from "lucide-react";

interface DiagnosticDevice {
  id?: string;
  deviceCode?: string;
  name: string;
  type: string;
  brand?: string;
  model?: string;
  serialNumber?: string;
  description?: string;
  stockLocationId?: string;
  stockLocation?: { id: string; name: string };
  purchasePrice?: number;
  sellingPrice?: number;
  technicalSpecs?: string;
  warranty?: string;
  maintenanceInterval?: string;
  configuration?: string;
  status: string;
  destination: string;
  location?: string;
}

interface DiagnosticDevicesExcelTableProps {
  devices: DiagnosticDevice[];
  stockLocations: Array<{ id: string; name: string }>;
  onDeviceUpdate: (device: DiagnosticDevice) => Promise<void>;
  onDeviceCreate: (device: Partial<DiagnosticDevice>) => Promise<void>;
  onDeviceDelete: (id: string) => Promise<void>;
  importExportComponent?: React.ReactNode;
}

const DIAGNOSTIC_DEVICE_NAMES = ["Polysomnographie", "Polygraphie", "Oxymètre", "Capnographe", "Autre"];
const STATUSES = ["ACTIVE", "MAINTENANCE", "RETIRED", "RESERVED", "SOLD"];
const DESTINATIONS = ["FOR_SALE", "FOR_RENT"];

// Helper function to translate status to French
const getStatusLabel = (status: string): string => {
  const statusLabels: Record<string, string> = {
    ACTIVE: "Actif",
    MAINTENANCE: "En Maintenance",
    RETIRED: "Retiré",
    RESERVED: "Réservé",
    SOLD: "Vendu"
  };
  return statusLabels[status] || status;
};

export function DiagnosticDevicesExcelTable({
  devices,
  stockLocations,
  onDeviceUpdate,
  onDeviceCreate,
  onDeviceDelete,
  importExportComponent
}: DiagnosticDevicesExcelTableProps) {
  const { toast } = useToast();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editedDevice, setEditedDevice] = useState<DiagnosticDevice | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newDevice, setNewDevice] = useState<Partial<DiagnosticDevice>>({
    name: "Polysomnographie",
    type: "DIAGNOSTIC_DEVICE",
    status: "ACTIVE",
    destination: "FOR_SALE"
  });

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);

  // Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [destinationFilter, setDestinationFilter] = useState<string>('ALL');
  const [locationFilter, setLocationFilter] = useState<string>('ALL');
  const [nameFilter, setNameFilter] = useState<string>('ALL');

  // Apply filters
  const filteredDevices = devices.filter(device => {
    // Search term filter (searches in code, brand, model, serial number)
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      const matchesSearch =
        device.deviceCode?.toLowerCase().includes(search) ||
        device.brand?.toLowerCase().includes(search) ||
        device.model?.toLowerCase().includes(search) ||
        device.serialNumber?.toLowerCase().includes(search) ||
        device.description?.toLowerCase().includes(search);

      if (!matchesSearch) return false;
    }

    // Status filter
    if (statusFilter !== 'ALL' && device.status !== statusFilter) return false;

    // Destination filter
    if (destinationFilter !== 'ALL' && device.destination !== destinationFilter) return false;

    // Location filter
    if (locationFilter !== 'ALL' && device.stockLocationId !== locationFilter) return false;

    // Name filter
    if (nameFilter !== 'ALL' && device.name !== nameFilter) return false;

    return true;
  });

  // Pagination
  const totalPages = Math.ceil(filteredDevices.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedDevices = filteredDevices.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, destinationFilter, locationFilter, nameFilter]);

  const handleEdit = (device: DiagnosticDevice) => {
    setEditingId(device.id || null);
    setEditedDevice({ ...device });
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditedDevice(null);
  };

  const handleSave = async () => {
    if (!editedDevice) return;

    try {
      await onDeviceUpdate(editedDevice);
      setEditingId(null);
      setEditedDevice(null);
      toast({
        title: "Succès",
        description: "Appareil de diagnostic mis à jour avec succès",
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Erreur lors de la mise à jour",
        variant: "destructive",
      });
    }
  };

  const handleAddNew = () => {
    setIsAddingNew(true);
  };

  const handleCancelNew = () => {
    setIsAddingNew(false);
    setNewDevice({
      name: "Polysomnographie",
      type: "DIAGNOSTIC_DEVICE",
      status: "ACTIVE",
      destination: "FOR_SALE"
    });
  };

  const handleSaveNew = async () => {
    try {
      await onDeviceCreate(newDevice);
      setIsAddingNew(false);
      setNewDevice({
        name: "Polysomnographie",
        type: "DIAGNOSTIC_DEVICE",
        status: "ACTIVE",
        destination: "FOR_SALE"
      });
      toast({
        title: "Succès",
        description: "Appareil de diagnostic créé avec succès",
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Erreur lors de la création",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Êtes-vous sûr de vouloir supprimer cet appareil ?")) {
      try {
        await onDeviceDelete(id);
        toast({
          title: "Succès",
          description: "Appareil de diagnostic supprimé avec succès",
        });
      } catch (error) {
        toast({
          title: "Erreur",
          description: "Erreur lors de la suppression",
          variant: "destructive",
        });
      }
    }
  };

  const updateEditedField = (field: keyof DiagnosticDevice, value: any) => {
    if (editedDevice) {
      setEditedDevice({ ...editedDevice, [field]: value });
    }
  };

  const updateNewField = (field: keyof DiagnosticDevice, value: any) => {
    setNewDevice({ ...newDevice, [field]: value });
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      ACTIVE: 'default',
      MAINTENANCE: 'secondary',
      RETIRED: 'destructive',
      RESERVED: 'outline',
      SOLD: 'secondary'
    };
    return variants[status] || 'default';
  };

  const renderCell = (device: DiagnosticDevice, field: keyof DiagnosticDevice, isEditing: boolean) => {
    const value = isEditing && editedDevice ? editedDevice[field] : device[field];

    if (isEditing && editedDevice) {
      switch (field) {
        case 'deviceCode':
          return (
            <Badge variant="outline" className="font-mono text-xs whitespace-nowrap">
              {editedDevice.deviceCode || 'N/A'}
            </Badge>
          );

        case 'name':
          return (
            <Select value={editedDevice.name} onValueChange={(val) => updateEditedField('name', val)}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DIAGNOSTIC_DEVICE_NAMES.map(name => (
                  <SelectItem key={name} value={name}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          );

        case 'status':
          return (
            <Select value={editedDevice.status} onValueChange={(val) => updateEditedField('status', val)}>
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

        case 'destination':
          return (
            <Select value={editedDevice.destination} onValueChange={(val) => updateEditedField('destination', val)}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="FOR_SALE">Vente</SelectItem>
                <SelectItem value="FOR_RENT">Location</SelectItem>
              </SelectContent>
            </Select>
          );

        case 'stockLocationId':
          return (
            <Select
              value={editedDevice.stockLocationId || ''}
              onValueChange={(val) => updateEditedField('stockLocationId', val)}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Sélectionner" />
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
          return (
            <Input
              type="number"
              step="0.01"
              value={editedDevice[field] || ''}
              onChange={(e) => updateEditedField(field, e.target.value ? parseFloat(e.target.value) : null)}
              className="h-8 text-xs"
            />
          );

        default:
          return (
            <Input
              value={(editedDevice[field] as string) || ''}
              onChange={(e) => updateEditedField(field, e.target.value)}
              className="h-8 text-xs"
            />
          );
      }
    }

    // Display mode
    switch (field) {
      case 'deviceCode':
        return (
          <Badge variant="outline" className="font-mono text-xs whitespace-nowrap">
            {(value as string) || 'N/A'}
          </Badge>
        );
      case 'status':
        return <Badge variant={getStatusBadge(value as string)} className="text-xs">{getStatusLabel(value as string)}</Badge>;
      case 'destination':
        return (
          <Badge variant={value === 'FOR_RENT' ? 'secondary' : 'default'} className="text-xs">
            {value === 'FOR_RENT' ? 'Location' : 'Vente'}
          </Badge>
        );
      case 'stockLocationId':
        return <span className="text-xs">{device.stockLocation?.name || '-'}</span>;
      case 'purchasePrice':
      case 'sellingPrice':
        return <span className="text-xs">{value ? `${value} DT` : '-'}</span>;
      default:
        return <span className="text-xs">{(value as string) || '-'}</span>;
    }
  };

  const renderNewDeviceRow = () => {
    if (!isAddingNew) return null;

    return (
      <tr className="bg-blue-50 border-b border-blue-200">
        <td className="px-2 py-2">
          <span className="text-xs text-gray-500">Auto</span>
        </td>
        <td className="px-2 py-2">
          <Select value={newDevice.name} onValueChange={(val) => updateNewField('name', val)}>
            <SelectTrigger className="h-8 text-xs w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DIAGNOSTIC_DEVICE_NAMES.map(name => (
                <SelectItem key={name} value={name}>{name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </td>
        <td className="px-2 py-2">
          <Input
            value={newDevice.brand || ''}
            onChange={(e) => updateNewField('brand', e.target.value)}
            className="h-8 text-xs w-32"
            placeholder="Marque"
          />
        </td>
        <td className="px-2 py-2">
          <Input
            value={newDevice.model || ''}
            onChange={(e) => updateNewField('model', e.target.value)}
            className="h-8 text-xs w-32"
            placeholder="Modèle"
          />
        </td>
        <td className="px-2 py-2">
          <Input
            value={newDevice.serialNumber || ''}
            onChange={(e) => updateNewField('serialNumber', e.target.value)}
            className="h-8 text-xs w-40"
            placeholder="Numéro série"
          />
        </td>
        <td className="px-2 py-2">
          <Input
            value={newDevice.description || ''}
            onChange={(e) => updateNewField('description', e.target.value)}
            className="h-8 text-xs w-48"
            placeholder="Description"
          />
        </td>
        <td className="px-2 py-2">
          <Select
            value={newDevice.stockLocationId || ''}
            onValueChange={(val) => updateNewField('stockLocationId', val)}
          >
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
            step="0.01"
            value={newDevice.purchasePrice || ''}
            onChange={(e) => updateNewField('purchasePrice', e.target.value ? parseFloat(e.target.value) : null)}
            className="h-8 text-xs w-28"
            placeholder="Prix achat"
          />
        </td>
        <td className="px-2 py-2">
          <Input
            type="number"
            step="0.01"
            value={newDevice.sellingPrice || ''}
            onChange={(e) => updateNewField('sellingPrice', e.target.value ? parseFloat(e.target.value) : null)}
            className="h-8 text-xs w-28"
            placeholder="Prix vente"
          />
        </td>
        <td className="px-2 py-2">
          <Select value={newDevice.status} onValueChange={(val) => updateNewField('status', val)}>
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
        <td className="px-2 py-2">
          <Select value={newDevice.destination} onValueChange={(val) => updateNewField('destination', val)}>
            <SelectTrigger className="h-8 text-xs w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="FOR_SALE">Vente</SelectItem>
              <SelectItem value="FOR_RENT">Location</SelectItem>
            </SelectContent>
          </Select>
        </td>
        <td className="px-2 py-2">
          <Input
            value={newDevice.warranty || ''}
            onChange={(e) => updateNewField('warranty', e.target.value)}
            className="h-8 text-xs w-28"
            placeholder="Garantie"
          />
        </td>
        <td className="px-2 py-2">
          <Input
            value={newDevice.maintenanceInterval || ''}
            onChange={(e) => updateNewField('maintenanceInterval', e.target.value)}
            className="h-8 text-xs w-32"
            placeholder="Maintenance"
          />
        </td>
        <td className="px-3 py-2 sticky right-0 bg-blue-50/80 backdrop-blur-sm z-10">
          <div className="flex gap-1 justify-end">
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={handleSaveNew}>
              <Check className="h-4 w-4 text-green-600" />
            </Button>
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={handleCancelNew}>
              <X className="h-4 w-4 text-red-600" />
            </Button>
          </div>
        </td>
      </tr>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header with Add Button */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold">Appareils de Diagnostic</h2>
          <p className="text-sm text-gray-500">
            {filteredDevices.length} / {devices.length} appareils
          </p>
        </div>
        <div className="flex items-center gap-2">
          {importExportComponent}
          <Button onClick={handleAddNew} disabled={isAddingNew} className="gap-2">
            <Plus className="h-4 w-4" />
            Ajouter un appareil
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3 bg-gray-50 p-4 rounded-lg border">
        {/* Search bar */}
        <div className="lg:col-span-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Rechercher (code, marque, modèle, série...)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 h-9 text-sm"
            />
          </div>
        </div>

        {/* Name filter */}
        <div>
          <Select value={nameFilter} onValueChange={setNameFilter}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Nom" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tous les noms</SelectItem>
              {DIAGNOSTIC_DEVICE_NAMES.map(name => (
                <SelectItem key={name} value={name}>{name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Status filter */}
        <div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tous les statuts</SelectItem>
              {STATUSES.map(status => (
                <SelectItem key={status} value={status}>{getStatusLabel(status)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Destination filter */}
        <div>
          <Select value={destinationFilter} onValueChange={setDestinationFilter}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Destination" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Toutes destinations</SelectItem>
              <SelectItem value="FOR_SALE">Vente</SelectItem>
              <SelectItem value="FOR_RENT">Location</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Location filter */}
        <div>
          <Select value={locationFilter} onValueChange={setLocationFilter}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Emplacement" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tous emplacements</SelectItem>
              {stockLocations.map(loc => (
                <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Excel-like Table */}
      <div className="border rounded-lg overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-gray-100 sticky top-0 z-20">
            <tr className="border-b">
              <th className="px-2 py-3 text-left text-xs font-semibold min-w-[100px]">Code</th>
              <th className="px-2 py-3 text-left text-xs font-semibold min-w-[160px]">Nom</th>
              <th className="px-2 py-3 text-left text-xs font-semibold min-w-[140px]">Marque</th>
              <th className="px-2 py-3 text-left text-xs font-semibold min-w-[140px]">Modèle</th>
              <th className="px-2 py-3 text-left text-xs font-semibold min-w-[160px]">N° Série</th>
              <th className="px-2 py-3 text-left text-xs font-semibold min-w-[200px]">Description</th>
              <th className="px-2 py-3 text-left text-xs font-semibold min-w-[160px]">Emplacement</th>
              <th className="px-2 py-3 text-left text-xs font-semibold min-w-[120px]">Prix Achat</th>
              <th className="px-2 py-3 text-left text-xs font-semibold min-w-[120px]">Prix Vente</th>
              <th className="px-2 py-3 text-left text-xs font-semibold min-w-[130px]">Statut</th>
              <th className="px-2 py-3 text-left text-xs font-semibold min-w-[120px]">Destination</th>
              <th className="px-2 py-3 text-left text-xs font-semibold min-w-[120px]">Garantie</th>
              <th className="px-2 py-3 text-left text-xs font-semibold min-w-[140px]">Maintenance</th>
              <th className="px-3 py-3 text-right text-xs font-semibold sticky right-0 bg-gray-100/95 backdrop-blur-sm z-30 min-w-[120px]">Actions</th>
            </tr>
          </thead>
          <tbody>
            {/* New device row */}
            {renderNewDeviceRow()}

            {/* Existing devices */}
            {paginatedDevices.map((device) => {
              const isEditing = editingId === device.id;

              return (
                <tr key={device.id} className={`border-b hover:bg-gray-50 ${isEditing ? 'bg-yellow-50' : ''}`}>
                  <td className="px-2 py-2">{renderCell(device, 'deviceCode', isEditing)}</td>
                  <td className="px-2 py-2">{renderCell(device, 'name', isEditing)}</td>
                  <td className="px-2 py-2">{renderCell(device, 'brand', isEditing)}</td>
                  <td className="px-2 py-2">{renderCell(device, 'model', isEditing)}</td>
                  <td className="px-2 py-2">{renderCell(device, 'serialNumber', isEditing)}</td>
                  <td className="px-2 py-2">{renderCell(device, 'description', isEditing)}</td>
                  <td className="px-2 py-2">{renderCell(device, 'stockLocationId', isEditing)}</td>
                  <td className="px-2 py-2">{renderCell(device, 'purchasePrice', isEditing)}</td>
                  <td className="px-2 py-2">{renderCell(device, 'sellingPrice', isEditing)}</td>
                  <td className="px-2 py-2">{renderCell(device, 'status', isEditing)}</td>
                  <td className="px-2 py-2">{renderCell(device, 'destination', isEditing)}</td>
                  <td className="px-2 py-2">{renderCell(device, 'warranty', isEditing)}</td>
                  <td className="px-2 py-2">{renderCell(device, 'maintenanceInterval', isEditing)}</td>
                  <td className={`px-3 py-2 sticky right-0 z-10 ${isEditing ? 'bg-yellow-50/80' : 'bg-white/80'} backdrop-blur-sm`}>
                    {isEditing ? (
                      <div className="flex gap-1 justify-end">
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={handleSave}>
                          <Check className="h-4 w-4 text-green-600" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={handleCancel}>
                          <X className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex gap-1 justify-end">
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => handleEdit(device)}>
                          <Edit2 className="h-4 w-4 text-blue-600" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => handleDelete(device.id!)}>
                          <Trash2 className="h-4 w-4 text-red-600" />
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

      {/* Pagination Controls */}
      {filteredDevices.length > 0 && (
        <div className="flex items-center justify-between border-t pt-4">
          <div className="flex items-center gap-4">
            <p className="text-sm text-gray-600">
              Affichage de {startIndex + 1} à {Math.min(endIndex, filteredDevices.length)} sur {filteredDevices.length} appareils
            </p>
            <Select
              value={itemsPerPage.toString()}
              onValueChange={(val) => {
                setItemsPerPage(parseInt(val));
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="h-9 w-32 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="25">25 par page</SelectItem>
                <SelectItem value="50">50 par page</SelectItem>
                <SelectItem value="100">100 par page</SelectItem>
                <SelectItem value="200">200 par page</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="h-9"
            >
              Premier
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1}
              className="h-9"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }

                return (
                  <Button
                    key={pageNum}
                    variant={currentPage === pageNum ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(pageNum)}
                    className="h-9 w-9"
                  >
                    {pageNum}
                  </Button>
                );
              })}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="h-9"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              className="h-9"
            >
              Dernier
            </Button>
          </div>
        </div>
      )}

      {devices.length === 0 && !isAddingNew && (
        <div className="text-center py-8 text-gray-500">
          Aucun appareil de diagnostic. Cliquez sur "Ajouter un appareil" pour commencer.
        </div>
      )}

      {devices.length > 0 && filteredDevices.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          Aucun appareil ne correspond aux filtres sélectionnés.
        </div>
      )}
    </div>
  );
}
