import React, { useState, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Package, ChevronLeft, ChevronRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

interface EmployeeMedicalDeviceSelectorDialogProps {
  onSelect: (id: string, name: string) => void;
  selectedId?: string;
  selectedName?: string;
  trigger?: React.ReactNode;
  excludeRented?: boolean;
}

export function EmployeeMedicalDeviceSelectorDialog({
  onSelect,
  selectedId,
  selectedName,
  trigger,
  excludeRented = false
}: EmployeeMedicalDeviceSelectorDialogProps) {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Get employee's stock location ID
  const employeeStockLocationId = (session as any)?.user?.stockLocation?.id;

  // Fetch medical devices
  const { data: devices, isLoading } = useQuery({
    queryKey: ['medical-devices', excludeRented],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (excludeRented) {
        params.append('excludeRented', 'true');
      }
      const response = await fetch(`/api/medical-devices?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch medical devices');
      const data = await response.json();
      // API returns array directly, not { devices: [...] }
      return Array.isArray(data) ? data : [];
    },
  });

  // Filter and paginate data
  const filteredData = useMemo(() => {
    if (!devices) return [];

    const searchLower = searchTerm.toLowerCase();
    return devices.filter((device: any) => {
      // Only show medical devices (not products like accessories/spare parts)
      const isMedicalDevice = device.deviceCode && !device.productCode;

      // Filter by employee's stock location
      const isInEmployeeLocation = employeeStockLocationId
        ? device.stockLocationId === employeeStockLocationId
        : true;

      const matchesSearch = (
        device.name?.toLowerCase().includes(searchLower) ||
        device.deviceCode?.toLowerCase().includes(searchLower) ||
        device.serialNumber?.toLowerCase().includes(searchLower) ||
        device.type?.toLowerCase().includes(searchLower)
      );

      return isMedicalDevice && isInEmployeeLocation && matchesSearch;
    });
  }, [devices, searchTerm, employeeStockLocationId]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = filteredData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleSelect = (device: any) => {
    onSelect(device.id, device.name);
    setOpen(false);
    setSearchTerm('');
    setCurrentPage(1);
  };

  const getDeviceTypeBadge = (type: string) => {
    switch (type) {
      case 'CPAP':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'CONCENTRATEUR_OXYGENE':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'VNI':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'MASQUE':
        return 'bg-teal-50 text-teal-700 border-teal-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getDeviceTypeLabel = (type: string) => {
    switch (type) {
      case 'CPAP':
        return 'CPAP';
      case 'CONCENTRATEUR_OXYGENE':
        return 'Concentrateur Oxygène';
      case 'VNI':
        return 'VNI';
      case 'MASQUE':
        return 'Masque';
      default:
        return type;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-800';
      case 'MAINTENANCE':
        return 'bg-orange-100 text-orange-800';
      case 'RESERVED':
        return 'bg-yellow-100 text-yellow-800';
      case 'RETIRED':
        return 'bg-gray-100 text-gray-800';
      case 'SOLD':
        return 'bg-teal-100 text-teal-800';
      default:
        return 'bg-slate-100 text-slate-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'Actif';
      case 'MAINTENANCE':
        return 'En Maintenance';
      case 'RESERVED':
        return 'Réservé';
      case 'RETIRED':
        return 'Retiré';
      case 'SOLD':
        return 'Vendu';
      default:
        return status;
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="h-8 text-xs justify-start border-green-200 hover:bg-green-50 hover:text-green-700">
            {selectedName || 'Sélectionner appareil'}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-green-700">
            <Package className="h-5 w-5 text-green-600" />
            Sélectionner un Appareil Médical
          </DialogTitle>
        </DialogHeader>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Rechercher par nom, code appareil, numéro de série, type..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="pl-10 border-green-200 focus:ring-green-500"
          />
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto border border-green-200 rounded-lg">
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-green-50 sticky top-0">
                <tr className="border-b border-green-200">
                  <th className="px-4 py-2 text-left text-xs font-semibold text-green-900">Code</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-green-900">Nom</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-green-900">Type</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-green-900">N° Série</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-green-900">Statut</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-green-900">Emplacement</th>
                  <th className="px-4 py-2 text-center text-xs font-semibold text-green-900">Action</th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.map((device: any) => (
                  <tr key={device.id} className="border-b hover:bg-green-50">
                    <td className="px-4 py-2">
                      <Badge variant="outline" className="font-mono text-xs bg-green-50 text-green-700 border-green-200">
                        {device.deviceCode || 'N/A'}
                      </Badge>
                    </td>
                    <td className="px-4 py-2 font-medium text-green-900">
                      {device.name}
                    </td>
                    <td className="px-4 py-2">
                      <Badge variant="outline" className={`text-xs ${getDeviceTypeBadge(device.type)}`}>
                        {getDeviceTypeLabel(device.type)}
                      </Badge>
                    </td>
                    <td className="px-4 py-2">
                      <span className="font-mono text-xs text-slate-600">
                        {device.serialNumber || '-'}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      <Badge className={`text-xs ${getStatusColor(device.status)}`}>
                        {getStatusLabel(device.status)}
                      </Badge>
                    </td>
                    <td className="px-4 py-2 text-slate-600 text-xs">
                      {device.stockLocation?.name || 'Non assigné'}
                    </td>
                    <td className="px-4 py-2 text-center">
                      <Button
                        size="sm"
                        variant={selectedId === device.id ? 'default' : 'outline'}
                        onClick={() => handleSelect(device)}
                        disabled={device.status === 'RESERVED'}
                        className={selectedId === device.id
                          ? 'h-7 bg-green-600 hover:bg-green-700'
                          : 'h-7 border-green-200 text-green-700 hover:bg-green-50'}
                      >
                        {device.status === 'RESERVED' ? 'Réservé' : 'Sélectionner'}
                      </Button>
                    </td>
                  </tr>
                ))}
                {paginatedData.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                      Aucun appareil trouvé dans votre emplacement de stock
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between border-t border-green-200 pt-3">
          <div className="text-sm text-slate-600">
            {filteredData.length} résultat(s) trouvé(s)
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="border-green-200 hover:bg-green-50"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm">
              Page {currentPage} sur {totalPages || 1}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages || totalPages === 0}
              className="border-green-200 hover:bg-green-50"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
