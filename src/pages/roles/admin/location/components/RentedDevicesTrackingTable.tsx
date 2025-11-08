import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Package,
  Search,
  MapPin,
  User,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronLeft,
  ChevronRight,
  Filter,
  RotateCcw
} from 'lucide-react';

interface RentedDevice {
  id: string;
  rentalCode: string;
  status: string;
  startDate: string;
  endDate: string | null;
  patient: {
    id: string;
    firstName: string;
    lastName: string;
    telephone: string;
  };
  medicalDevice: {
    id: string;
    deviceCode: string;
    name: string;
    serialNumber: string;
    type: string;
    stockLocation: {
      id: string;
      name: string;
    } | null;
  };
  assignedTo: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
}

const RENTAL_STATUS_LABELS: Record<string, { label: string; color: string; icon: any }> = {
  PENDING: { label: 'En attente', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  ACTIVE: { label: 'Actif', color: 'bg-green-100 text-green-800', icon: CheckCircle2 },
  COMPLETED: { label: 'Terminé', color: 'bg-blue-100 text-blue-800', icon: CheckCircle2 },
  CANCELLED: { label: 'Annulé', color: 'bg-red-100 text-red-800', icon: XCircle },
  SUSPENDED: { label: 'Suspendu', color: 'bg-orange-100 text-orange-800', icon: Clock },
};

const DEVICE_TYPE_LABELS: Record<string, string> = {
  MEDICAL_DEVICE: 'Appareil Médical',
  DIAGNOSTIC_DEVICE: 'Appareil de Diagnostic',
  CPAP: 'CPAP',
  VNI: 'VNI',
  CONCENTRATOR: 'Concentrateur',
  OXYGEN_THERAPY: 'Oxygénothérapie',
  VENTILATOR: 'Ventilateur',
  MONITOR: 'Moniteur',
  OTHER: 'Autre',
};

export default function RentedDevicesTrackingTable() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [locationFilter, setLocationFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [recuperateDialogOpen, setRecuperateDialogOpen] = useState(false);
  const [selectedRental, setSelectedRental] = useState<RentedDevice | null>(null);
  const [selectedStockLocationId, setSelectedStockLocationId] = useState<string>('');

  // Fetch rentals with device and patient info
  const { data: rentals = [], isLoading } = useQuery<RentedDevice[]>({
    queryKey: ['rented-devices-tracking'],
    queryFn: async () => {
      const response = await fetch('/api/rentals/comprehensive');
      if (!response.ok) throw new Error('Failed to fetch rentals');
      return response.json();
    },
  });

  // Fetch all stock locations for admin dialog
  const { data: allStockLocations = [] } = useQuery({
    queryKey: ['stock-locations'],
    queryFn: async () => {
      const response = await fetch('/api/stock-locations');
      if (!response.ok) throw new Error('Failed to fetch stock locations');
      return response.json();
    },
  });

  // Get unique stock locations for filter
  const stockLocations = React.useMemo(() => {
    const locationMap = new Map();
    rentals.forEach(rental => {
      const loc = rental.medicalDevice.stockLocation;
      if (loc && loc.id) {
        locationMap.set(loc.id, loc);
      }
    });
    return Array.from(locationMap.values());
  }, [rentals]);

  // Filter rentals
  const filteredRentals = rentals.filter((rental) => {
    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      const patientName = `${rental.patient.firstName} ${rental.patient.lastName}`.toLowerCase();
      const deviceName = rental.medicalDevice.name.toLowerCase();
      const deviceCode = rental.medicalDevice.deviceCode?.toLowerCase() || '';
      const serialNumber = rental.medicalDevice.serialNumber?.toLowerCase() || '';
      const rentalCode = rental.rentalCode?.toLowerCase() || '';

      if (
        !patientName.includes(search) &&
        !deviceName.includes(search) &&
        !deviceCode.includes(search) &&
        !serialNumber.includes(search) &&
        !rentalCode.includes(search)
      ) {
        return false;
      }
    }

    // Status filter
    if (statusFilter !== 'all' && rental.status !== statusFilter) {
      return false;
    }

    // Location filter
    if (locationFilter !== 'all' && rental.medicalDevice.stockLocation?.id !== locationFilter) {
      return false;
    }

    return true;
  });

  // Pagination
  const totalPages = Math.ceil(filteredRentals.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedRentals = filteredRentals.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, locationFilter]);

  // Mutation to mark rental as completed and update device location
  const recuperateMutation = useMutation({
    mutationFn: async ({
      rentalId,
      deviceId,
      stockLocationId
    }: {
      rentalId: string;
      deviceId: string;
      stockLocationId: string;
    }) => {
      // Update rental status and endDate
      const rentalResponse = await fetch(`/api/rentals/comprehensive/${rentalId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'COMPLETED',
          endDate: new Date().toISOString(),
        }),
      });

      if (!rentalResponse.ok) throw new Error('Failed to update rental');

      // Update device stock location and status
      const deviceResponse = await fetch(`/api/medical-devices/${deviceId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stockLocationId: stockLocationId,
          status: 'ACTIVE',
        }),
      });

      if (!deviceResponse.ok) throw new Error('Failed to update device');

      return {
        rental: await rentalResponse.json(),
        device: await deviceResponse.json()
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rented-devices-tracking'] });
      queryClient.invalidateQueries({ queryKey: ['medical-devices'] });
      setRecuperateDialogOpen(false);
      setSelectedRental(null);
      setSelectedStockLocationId('');
      toast({
        title: 'Succès',
        description: 'Appareil récupéré et retourné au stock avec succès',
      });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Impossible de récupérer l\'appareil',
      });
    },
  });

  const handleRecuperate = (rental: RentedDevice) => {
    const userRole = session?.user?.role;
    const userStockLocationId = (session?.user as any)?.stockLocation?.id;

    if (userRole === 'ADMIN') {
      // Show dialog for admin to select stock location
      setSelectedRental(rental);
      setRecuperateDialogOpen(true);
    } else if (userRole === 'EMPLOYEE' && userStockLocationId) {
      // Auto-recuperate to employee's stock location
      if (confirm('Confirmer la récupération de cet appareil vers votre emplacement de stock ?')) {
        recuperateMutation.mutate({
          rentalId: rental.id,
          deviceId: rental.medicalDevice.id,
          stockLocationId: userStockLocationId,
        });
      }
    } else {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Impossible de déterminer l\'emplacement de stock',
      });
    }
  };

  const confirmRecuperate = () => {
    if (!selectedRental || !selectedStockLocationId) {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Veuillez sélectionner un emplacement de stock',
      });
      return;
    }

    recuperateMutation.mutate({
      rentalId: selectedRental.id,
      deviceId: selectedRental.medicalDevice.id,
      stockLocationId: selectedStockLocationId,
    });
  };

  const getStatusBadge = (status: string) => {
    const info = RENTAL_STATUS_LABELS[status] || RENTAL_STATUS_LABELS.PENDING;
    const Icon = info.icon;

    return (
      <Badge variant="outline" className={info.color}>
        <Icon className="h-3 w-3 mr-1" />
        {info.label}
      </Badge>
    );
  };

  // Determine if device is with patient or in stock
  const getDeviceLocation = (rental: RentedDevice) => {
    if (rental.status === 'COMPLETED' || rental.status === 'CANCELLED') {
      return {
        label: 'Retourné au stock',
        color: 'bg-blue-100 text-blue-800',
        icon: Package,
      };
    } else {
      return {
        label: 'Chez le patient',
        color: 'bg-green-100 text-green-800',
        icon: User,
      };
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="text-slate-500">Chargement des appareils loués...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5 text-blue-600" />
          Suivi des Appareils Loués
        </CardTitle>
        <p className="text-sm text-slate-600 mt-1">
          Suivez tous les appareils médicaux en location et leur emplacement actuel
        </p>
      </CardHeader>
      <CardContent>
        {/* Search and Filters */}
        <div className="space-y-3 mb-4">
          {/* Search Bar */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Rechercher par patient, appareil, code, n° série..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 bg-slate-50 p-3 rounded-lg border">
            <div>
              <label className="text-[10px] font-medium text-slate-700 mb-0.5 block">Statut</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-8 text-xs bg-white">
                  <SelectValue placeholder="Tous" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  {Object.entries(RENTAL_STATUS_LABELS).map(([value, info]) => (
                    <SelectItem key={value} value={value}>{info.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-[10px] font-medium text-slate-700 mb-0.5 block">Emplacement Stock</label>
              <Select value={locationFilter} onValueChange={setLocationFilter}>
                <SelectTrigger className="h-8 text-xs bg-white">
                  <SelectValue placeholder="Tous" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les emplacements</SelectItem>
                  {stockLocations.map((location: any) => (
                    <SelectItem key={location.id} value={location.id}>
                      {location.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end col-span-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('all');
                  setLocationFilter('all');
                }}
                className="h-8 w-full text-xs"
              >
                <Filter className="h-3 w-3 mr-1" />
                Réinitialiser
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="text-xs text-green-700 font-medium">Appareils Actifs</div>
            <div className="text-2xl font-bold text-green-900">
              {rentals.filter(r => r.status === 'ACTIVE').length}
            </div>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="text-xs text-blue-700 font-medium">Chez les Patients</div>
            <div className="text-2xl font-bold text-blue-900">
              {rentals.filter(r => r.status === 'ACTIVE' || r.status === 'PENDING' || r.status === 'SUSPENDED').length}
            </div>
          </div>
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
            <div className="text-xs text-purple-700 font-medium">Retournés</div>
            <div className="text-2xl font-bold text-purple-900">
              {rentals.filter(r => r.status === 'COMPLETED').length}
            </div>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
            <div className="text-xs text-slate-700 font-medium">Total Locations</div>
            <div className="text-2xl font-bold text-slate-900">
              {rentals.length}
            </div>
          </div>
        </div>

        {/* Pagination Controls */}
        {totalPages > 0 && (
          <div className="flex items-center justify-between px-4 py-3 bg-white border border-slate-200 rounded-lg shadow-sm mb-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-600">
                Affichage de {startIndex + 1} à {Math.min(endIndex, filteredRentals.length)} sur {filteredRentals.length} résultats
              </span>
            </div>

            <div className="flex items-center gap-4">
              {/* Items per page selector */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-600">Par page:</span>
                <Select
                  value={itemsPerPage.toString()}
                  onValueChange={(value) => {
                    setItemsPerPage(Number(value));
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="w-[100px] h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Page navigation */}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="h-9 w-9 p-0"
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
                        className="h-9 w-9 p-0"
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="h-9 w-9 p-0"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code Location</TableHead>
                <TableHead>Patient</TableHead>
                <TableHead>Appareil</TableHead>
                <TableHead>N° Série</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Emplacement Stock</TableHead>
                <TableHead>Localisation Actuelle</TableHead>
                <TableHead>Statut Location</TableHead>
                <TableHead>Date Début</TableHead>
                <TableHead>Date Fin</TableHead>
                <TableHead>Technicien Assigné</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedRentals.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={12} className="text-center text-gray-500 py-8">
                    {searchTerm || statusFilter !== 'all' || locationFilter !== 'all'
                      ? 'Aucun appareil trouvé avec ces filtres'
                      : 'Aucun appareil en location'}
                  </TableCell>
                </TableRow>
              ) : (
                paginatedRentals.map((rental) => {
                  const deviceLoc = getDeviceLocation(rental);
                  const DeviceLocIcon = deviceLoc.icon;

                  return (
                    <TableRow key={rental.id}>
                      <TableCell>
                        <Badge variant="outline" className="text-xs font-mono">
                          {rental.rentalCode || 'N/A'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-xs">
                          <div className="font-medium">
                            {rental.patient.firstName} {rental.patient.lastName}
                          </div>
                          {rental.patient.telephone && (
                            <div className="text-gray-500">{rental.patient.telephone}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-xs">
                          <div className="font-medium">{rental.medicalDevice.name}</div>
                          {rental.medicalDevice.deviceCode && (
                            <div className="text-gray-500">Code: {rental.medicalDevice.deviceCode}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs font-mono">
                          {rental.medicalDevice.serialNumber || '-'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs">
                          {DEVICE_TYPE_LABELS[rental.medicalDevice.type] || rental.medicalDevice.type}
                        </span>
                      </TableCell>
                      <TableCell>
                        {rental.medicalDevice.stockLocation ? (
                          <Badge variant="outline" className="text-xs bg-slate-50">
                            <MapPin className="h-3 w-3 mr-1" />
                            {rental.medicalDevice.stockLocation.name}
                          </Badge>
                        ) : (
                          <span className="text-xs text-gray-400">Non défini</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={deviceLoc.color}>
                          <DeviceLocIcon className="h-3 w-3 mr-1" />
                          {deviceLoc.label}
                        </Badge>
                      </TableCell>
                      <TableCell>{getStatusBadge(rental.status)}</TableCell>
                      <TableCell>
                        <div className="text-xs flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-slate-400" />
                          {new Date(rental.startDate).toLocaleDateString('fr-FR')}
                        </div>
                      </TableCell>
                      <TableCell>
                        {rental.endDate ? (
                          <div className="text-xs flex items-center gap-1">
                            <Calendar className="h-3 w-3 text-slate-400" />
                            {new Date(rental.endDate).toLocaleDateString('fr-FR')}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">En cours</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {rental.assignedTo ? (
                          <div className="text-xs">
                            {rental.assignedTo.firstName} {rental.assignedTo.lastName}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">Non assigné</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {(rental.status === 'ACTIVE' || rental.status === 'PENDING' || rental.status === 'SUSPENDED') && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRecuperate(rental)}
                            disabled={recuperateMutation.isPending}
                            className="h-8 text-xs"
                          >
                            <RotateCcw className="h-3 w-3 mr-1" />
                            Récupérer
                          </Button>
                        )}
                        {(rental.status === 'COMPLETED' || rental.status === 'CANCELLED') && (
                          <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Récupéré
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      {/* Admin Stock Location Selection Dialog */}
      <Dialog open={recuperateDialogOpen} onOpenChange={setRecuperateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Récupération d'appareil</DialogTitle>
            <DialogDescription>
              Sélectionnez l'emplacement de stock où l'appareil sera retourné.
            </DialogDescription>
          </DialogHeader>

          {selectedRental && (
            <div className="space-y-4 py-4">
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-2">
                <div className="text-sm">
                  <span className="font-medium text-slate-700">Patient:</span>{' '}
                  <span className="text-slate-900">
                    {selectedRental.patient.firstName} {selectedRental.patient.lastName}
                  </span>
                </div>
                <div className="text-sm">
                  <span className="font-medium text-slate-700">Appareil:</span>{' '}
                  <span className="text-slate-900">{selectedRental.medicalDevice.name}</span>
                </div>
                <div className="text-sm">
                  <span className="font-medium text-slate-700">N° Série:</span>{' '}
                  <span className="text-slate-900 font-mono">
                    {selectedRental.medicalDevice.serialNumber || 'N/A'}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  Emplacement de stock
                </label>
                <Select
                  value={selectedStockLocationId}
                  onValueChange={setSelectedStockLocationId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un emplacement" />
                  </SelectTrigger>
                  <SelectContent>
                    {allStockLocations.map((location: any) => (
                      <SelectItem key={location.id} value={location.id}>
                        {location.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRecuperateDialogOpen(false);
                setSelectedRental(null);
                setSelectedStockLocationId('');
              }}
            >
              Annuler
            </Button>
            <Button
              onClick={confirmRecuperate}
              disabled={!selectedStockLocationId || recuperateMutation.isPending}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Confirmer la récupération
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
