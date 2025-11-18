import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, KeyRound, ChevronLeft, ChevronRight } from 'lucide-react';

interface RentalSelectorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (rentalId: string, rentalCode: string) => void;
  selectedRentalId?: string;
}

export function RentalSelectorDialog({
  open,
  onOpenChange,
  onSelect,
  selectedRentalId,
}: RentalSelectorDialogProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Fetch rentals
  const { data: rentalsData, isLoading } = useQuery({
    queryKey: ['rentals-for-selector'],
    queryFn: async () => {
      const response = await fetch('/api/rentals/comprehensive');
      if (!response.ok) throw new Error('Failed to fetch rentals');
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    },
    enabled: open,
  });

  const rentals = rentalsData || [];

  // Filter rentals based on search
  const filteredRentals = rentals.filter((rental: any) => {
    const search = searchTerm.toLowerCase();
    const rentalCode = rental.rentalCode?.toLowerCase() || '';
    const patientName = rental.patient
      ? `${rental.patient.firstName} ${rental.patient.lastName}`.toLowerCase()
      : '';
    const patientCode = rental.patient?.patientCode?.toLowerCase() || '';

    return (
      rentalCode.includes(search) ||
      patientName.includes(search) ||
      patientCode.includes(search)
    );
  });

  // Pagination
  const totalPages = Math.ceil(filteredRentals.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedRentals = filteredRentals.slice(startIndex, startIndex + itemsPerPage);

  const handleSelect = (rental: any) => {
    onSelect(rental.id, rental.rentalCode);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-green-600" />
            Sélectionner une Location
          </DialogTitle>
        </DialogHeader>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Rechercher par code location, patient, code patient..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1); // Reset to first page on search
            }}
            className="pl-10"
          />
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto border rounded-md">
          {isLoading ? (
            <div className="flex items-center justify-center py-8 text-gray-500">
              Chargement...
            </div>
          ) : paginatedRentals.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-gray-500">
              Aucune location trouvée
            </div>
          ) : (
            <div className="divide-y">
              {paginatedRentals.map((rental: any) => {
                const isSelected = rental.id === selectedRentalId;
                const patientName = rental.patient
                  ? `${rental.patient.firstName} ${rental.patient.lastName}`
                  : 'N/A';

                return (
                  <div
                    key={rental.id}
                    className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                      isSelected ? 'bg-green-50 border-l-4 border-green-500' : ''
                    }`}
                    onClick={() => handleSelect(rental)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <Badge
                            variant="outline"
                            className="font-mono text-sm bg-green-50 text-green-700 border-green-200"
                          >
                            {rental.rentalCode}
                          </Badge>
                          {rental.patient?.patientCode && (
                            <Badge
                              variant="outline"
                              className="font-mono text-xs bg-purple-50 text-purple-700 border-purple-200"
                            >
                              {rental.patient.patientCode}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-700">
                            Patient: {patientName}
                          </span>
                          {rental.medicalDevice?.name && (
                            <span className="text-xs text-gray-500">
                              • {rental.medicalDevice.name}
                            </span>
                          )}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 text-white"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelect(rental);
                        }}
                      >
                        Sélectionner
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="text-sm text-gray-600">
              {filteredRentals.length} location(s) trouvée(s)
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-gray-600">
                Page {currentPage} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
