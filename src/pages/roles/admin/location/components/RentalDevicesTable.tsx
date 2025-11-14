import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/router';
import { translateDeviceType } from '@/utils/enumTranslations';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import {
  Package,
  Search,
  MapPin,
  RotateCcw,
  Edit,
  Trash2,
  AlertCircle,
  Loader2,
  Wrench,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  User,
  AlertTriangle
} from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface RentalDevice {
  id: string;
  rentalCode: string;
  startDate: string;
  endDate?: string;
  status: string;
  medicalDevice: {
    id: string;
    deviceCode?: string;
    name: string;
    type: string;
    serialNumber?: string;
    brand?: string;
    model?: string;
    location?: string;
    stockLocationId?: string;
    stockLocation?: {
      id: string;
      name: string;
    };
  };
  patient: {
    id: string;
    firstName: string;
    lastName: string;
    patientCode?: string;
  };
}

interface StockLocation {
  id: string;
  name: string;
  description?: string;
}

export default function RentalDevicesTable() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [showEditLocationDialog, setShowEditLocationDialog] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<RentalDevice | null>(null);
  const [selectedStockLocation, setSelectedStockLocation] = useState('');
  const [restoreNotes, setRestoreNotes] = useState('');
  const [isRestoring, setIsRestoring] = useState(false);
  const [isUpdatingLocation, setIsUpdatingLocation] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const router = useRouter();

  // Fetch rental devices
  const { data: devices = [], isLoading } = useQuery<RentalDevice[]>({
    queryKey: ['rental-devices'],
    queryFn: async () => {
      const response = await fetch('/api/rentals?includeDevice=true');
      if (!response.ok) throw new Error('Failed to fetch rental devices');
      const data = await response.json();
      return data.rentals || [];
    }
  });

  // Fetch stock locations
  const { data: stockLocations = [] } = useQuery<StockLocation[]>({
    queryKey: ['stock-locations'],
    queryFn: async () => {
      const response = await fetch('/api/stock/locations');
      if (!response.ok) throw new Error('Failed to fetch stock locations');
      return response.json();
    }
  });

  // Filter devices
  const filteredDevices = devices.filter(device => {
    const matchesSearch = searchTerm === '' ||
      device.medicalDevice.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      device.medicalDevice.deviceCode?.includes(searchTerm) || // Case-sensitive for device code
      device.rentalCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      device.patient.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      device.patient.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      device.patient.patientCode?.includes(searchTerm); // Case-sensitive for patient code

    const matchesStatus = statusFilter === 'all' || device.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Pagination calculations
  const totalPages = Math.ceil(filteredDevices.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedDevices = filteredDevices.slice(startIndex, endIndex);

  // Reset to page 1 when filters or items per page change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, itemsPerPage]);

  const handleRestoreDevice = async () => {
    if (!selectedDevice || !selectedStockLocation) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner un emplacement de stock",
        variant: "destructive",
      });
      return;
    }

    setIsRestoring(true);
    try {
      const response = await fetch(`/api/medical-devices/${selectedDevice.medicalDevice.id}/restore`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stockLocationId: selectedStockLocation,
          notes: restoreNotes,
          rentalId: selectedDevice.id,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to restore device');
      }

      toast({
        title: "Succès",
        description: "L'appareil a été restauré avec succès",
      });

      queryClient.invalidateQueries({ queryKey: ['rental-devices'] });
      setShowRestoreDialog(false);
      setSelectedDevice(null);
      setSelectedStockLocation('');
      setRestoreNotes('');
    } catch (error) {
      console.error('Error restoring device:', error);
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Erreur lors de la restauration",
        variant: "destructive",
      });
    } finally {
      setIsRestoring(false);
    }
  };

  const handleUpdateLocation = async () => {
    if (!selectedDevice || !selectedStockLocation) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner un emplacement",
        variant: "destructive",
      });
      return;
    }

    setIsUpdatingLocation(true);
    try {
      const response = await fetch(`/api/medical-devices/${selectedDevice.medicalDevice.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stockLocationId: selectedStockLocation,
          location: stockLocations.find(loc => loc.id === selectedStockLocation)?.name || '',
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update location');
      }

      toast({
        title: "Succès",
        description: "L'emplacement a été mis à jour avec succès",
      });

      queryClient.invalidateQueries({ queryKey: ['rental-devices'] });
      setShowEditLocationDialog(false);
      setSelectedDevice(null);
      setSelectedStockLocation('');
    } catch (error) {
      console.error('Error updating location:', error);
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Erreur lors de la mise à jour",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingLocation(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-800';
      case 'PENDING':
        return 'bg-amber-100 text-amber-800';
      case 'COMPLETED':
        return 'bg-blue-100 text-blue-800';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800';
      case 'EXPIRED':
        return 'bg-red-100 text-red-800';
      case 'EXPIRING_SOON':
        return 'bg-orange-100 text-orange-800';
      case 'SCHEDULED':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'Actif';
      case 'PENDING':
        return 'En attente';
      case 'COMPLETED':
        return 'Terminé';
      case 'CANCELLED':
        return 'Annulé';
      case 'EXPIRED':
        return 'Expiré';
      case 'EXPIRING_SOON':
        return 'Expire bientôt';
      case 'SCHEDULED':
        return 'Planifié';
      default:
        return status;
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Package className="h-6 w-6 text-blue-600" />
            Articles en Location
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Gestion des appareils médicaux en location avec suivi de stock
          </p>
        </div>
        <Badge variant="outline" className="text-lg px-4 py-2">
          {filteredDevices.length} {filteredDevices.length > 1 ? 'articles' : 'article'}
        </Badge>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Rechercher par code appareil, code patient, nom, code location..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filtrer par statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="ACTIVE">Actif</SelectItem>
            <SelectItem value="PENDING">En attente</SelectItem>
            <SelectItem value="COMPLETED">Terminé</SelectItem>
            <SelectItem value="CANCELLED">Annulé</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Pagination Controls */}
      {filteredDevices.length > 0 && (
        <div className="flex items-center justify-between bg-white rounded-lg border p-4">
          <div className="flex items-center gap-4">
            <p className="text-sm text-gray-600">
              Affichage de <span className="font-semibold">{startIndex + 1}</span> à{' '}
              <span className="font-semibold">{Math.min(endIndex, filteredDevices.length)}</span> sur{' '}
              <span className="font-semibold">{filteredDevices.length}</span> articles
            </p>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Lignes par page:</span>
              <Select value={itemsPerPage.toString()} onValueChange={(value) => setItemsPerPage(Number(value))}>
                <SelectTrigger className="w-[80px] h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2 px-3">
              <span className="text-sm text-gray-600">
                Page <span className="font-semibold">{currentPage}</span> sur{' '}
                <span className="font-semibold">{totalPages}</span>
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Table */}
      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      ) : filteredDevices.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border">
          <AlertCircle className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">Aucun article trouvé</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead>Code Location</TableHead>
                  <TableHead>Code Appareil</TableHead>
                  <TableHead>Nom Appareil</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>N° Série</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Emplacement Stock</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Date Début</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedDevices.map((device) => (
                  <TableRow key={device.id}>
                    <TableCell className="font-mono text-sm font-medium">
                      {device.rentalCode}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      <Badge variant="outline" className="bg-blue-50 text-blue-700">
                        {device.medicalDevice.deviceCode || '-'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div
                        className="font-medium cursor-pointer hover:bg-slate-50 p-1 rounded transition-colors text-blue-600 hover:text-blue-800 hover:underline"
                        onClick={() => router.push(`/roles/admin/appareils/medical-device/${device.medicalDevice.id}`)}
                      >
                        {device.medicalDevice.name}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">
                        {translateDeviceType(device.medicalDevice.type)}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {device.medicalDevice.serialNumber || '-'}
                    </TableCell>
                    <TableCell>
                      <div
                        className="flex flex-col cursor-pointer hover:bg-slate-50 p-1 rounded transition-colors"
                        onClick={() => router.push(`/roles/admin/renseignement/patient/${device.patient.id}`)}
                      >
                        <span className="font-medium text-sm text-blue-600 hover:text-blue-800 hover:underline">
                          {device.patient.firstName} {device.patient.lastName}
                        </span>
                        {device.patient.patientCode && (
                          <span className="text-xs text-gray-500 font-mono">
                            {device.patient.patientCode}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {device.status === 'ACTIVE' ? (
                        <div className="flex items-center gap-1 text-sm">
                          <User className="h-3 w-3 text-blue-600" />
                          <span className="text-blue-700 font-medium">Chez patient</span>
                        </div>
                      ) : device.medicalDevice.stockLocation ? (
                        <div className="flex items-center gap-1 text-sm">
                          <MapPin className="h-3 w-3 text-green-600" />
                          <span className="text-green-700 font-medium">
                            {device.medicalDevice.stockLocation.name}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-sm">
                          <MapPin className="h-3 w-3 text-orange-500" />
                          <span className="text-orange-600 font-medium italic">À restaurer</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <Badge className={getStatusColor(device.status)}>
                          {getStatusLabel(device.status)}
                        </Badge>
                        {(device.status === 'COMPLETED' || device.status === 'EXPIRED' || device.status === 'CANCELLED') && !device.medicalDevice.stockLocation && (
                          <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 text-xs">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Action requise
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {new Date(device.startDate).toLocaleDateString('fr-FR')}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {device.status === 'ACTIVE' ? (
                          // Device currently with patient
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                            <User className="h-3 w-3 mr-1" />
                            En cours
                          </Badge>
                        ) : device.medicalDevice.stockLocation ? (
                          // Device already restored, can change location
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedDevice(device);
                              setSelectedStockLocation(device.medicalDevice.stockLocationId || '');
                              setShowEditLocationDialog(true);
                            }}
                            className="h-8"
                          >
                            <MapPin className="h-3 w-3 mr-1" />
                            Changer Emplacement
                          </Button>
                        ) : (
                          // Rental ended (COMPLETED/EXPIRED/CANCELLED), device needs to be restored to stock
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedDevice(device);
                              setShowRestoreDialog(true);
                            }}
                            className="h-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                          >
                            <RotateCcw className="h-3 w-3 mr-1" />
                            Restaurer au Stock
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Restore Device Dialog */}
      <Dialog open={showRestoreDialog} onOpenChange={setShowRestoreDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5 text-green-600" />
              Restaurer l'appareil au stock
            </DialogTitle>
            <DialogDescription>
              Sélectionnez l'emplacement de stock où l'appareil sera restauré
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {selectedDevice && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm font-medium text-blue-900">
                  {selectedDevice.medicalDevice.name}
                </p>
                <p className="text-xs text-blue-700 font-mono mt-1">
                  {selectedDevice.medicalDevice.deviceCode}
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="stock-location">Emplacement de Stock *</Label>
              <Select
                value={selectedStockLocation}
                onValueChange={setSelectedStockLocation}
              >
                <SelectTrigger id="stock-location">
                  <SelectValue placeholder="Sélectionner un emplacement" />
                </SelectTrigger>
                <SelectContent>
                  {stockLocations.map((location) => (
                    <SelectItem key={location.id} value={location.id}>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-blue-500" />
                        <span>{location.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="restore-notes">Notes (Optionnel)</Label>
              <Textarea
                id="restore-notes"
                value={restoreNotes}
                onChange={(e) => setRestoreNotes(e.target.value)}
                placeholder="Ajouter des notes sur la restauration..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowRestoreDialog(false);
                setSelectedDevice(null);
                setSelectedStockLocation('');
                setRestoreNotes('');
              }}
              disabled={isRestoring}
            >
              Annuler
            </Button>
            <Button
              onClick={handleRestoreDevice}
              disabled={isRestoring || !selectedStockLocation}
              className="bg-green-600 hover:bg-green-700"
            >
              {isRestoring ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Restauration...
                </>
              ) : (
                <>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Restaurer
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Location Dialog */}
      <Dialog open={showEditLocationDialog} onOpenChange={setShowEditLocationDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-blue-600" />
              Modifier l'emplacement
            </DialogTitle>
            <DialogDescription>
              Changer l'emplacement de stock de l'appareil
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {selectedDevice && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm font-medium text-blue-900">
                  {selectedDevice.medicalDevice.name}
                </p>
                <p className="text-xs text-blue-700 font-mono mt-1">
                  {selectedDevice.medicalDevice.deviceCode}
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="new-location">Nouvel Emplacement *</Label>
              <Select
                value={selectedStockLocation}
                onValueChange={setSelectedStockLocation}
              >
                <SelectTrigger id="new-location">
                  <SelectValue placeholder="Sélectionner un emplacement" />
                </SelectTrigger>
                <SelectContent>
                  {stockLocations.map((location) => (
                    <SelectItem key={location.id} value={location.id}>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-blue-500" />
                        <span>{location.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowEditLocationDialog(false);
                setSelectedDevice(null);
                setSelectedStockLocation('');
              }}
              disabled={isUpdatingLocation}
            >
              Annuler
            </Button>
            <Button
              onClick={handleUpdateLocation}
              disabled={isUpdatingLocation || !selectedStockLocation}
            >
              {isUpdatingLocation ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Mise à jour...
                </>
              ) : (
                <>
                  <MapPin className="h-4 w-4 mr-2" />
                  Mettre à jour
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
