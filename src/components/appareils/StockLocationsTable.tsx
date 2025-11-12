import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useState, useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";
import { LocationEditForm } from "./LocationEditForm";
import { Trash2, Edit, Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

interface StockLocation {
  id: string;
  name: string;
  description?: string;
  userId?: string;
  user?: {
    firstName: string;
    lastName: string;
  };
  isActive: boolean;
}

interface LocationContents {
  products: number;
  medicalDevices: number;
}

export function StockLocationsTable({ initialItemsPerPage = 10 }: { initialItemsPerPage?: number }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingLocation, setEditingLocation] = useState<StockLocation | null>(null);
  const [locationToDelete, setLocationToDelete] = useState<StockLocation | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Search and pagination state
  const [searchQuery, setSearchQuery] = useState('');
  const [locationContents, setLocationContents] = useState<LocationContents | null>(null);
  const [deleteCheckLoading, setDeleteCheckLoading] = useState(false);
  const [deleteCheckError, setDeleteCheckError] = useState<string | null>(null);
  const [filteredLocations, setFilteredLocations] = useState<StockLocation[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(initialItemsPerPage);
  const [paginatedData, setPaginatedData] = useState<StockLocation[]>([]);
  const [totalPages, setTotalPages] = useState(1);

  // Fetch stock locations
  const { data: locations, isLoading } = useQuery({
    queryKey: ["stock-locations"],
    queryFn: async () => {
      const response = await fetch("/api/stock-locations");
      if (!response.ok) {
        throw new Error("Failed to fetch stock locations");
      }
      const data = await response.json();
      return data;
    },
  });

  // Delete location mutation - moved here to ensure hooks are called in consistent order
  const deleteLocationMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/stock-locations/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete location");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stock-locations"] });
      toast({
        title: "Succès",
        description: "L'emplacement a été supprimé avec succès",
      });
      setLocationToDelete(null);
      setIsDeleteDialogOpen(false);
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de la suppression de l'emplacement",
        variant: "destructive",
      });
    },
  });

  // Filter locations based on search query
  useEffect(() => {
    if (!locations) {
      setFilteredLocations([]);
      return;
    }

    if (searchQuery.trim() === '') {
      setFilteredLocations(locations);
    } else {
      const query = searchQuery.toLowerCase().trim();
      const filtered = locations.filter((location: StockLocation) =>
        (location.name && location.name.toLowerCase().includes(query)) ||
        (location.description && location.description.toLowerCase().includes(query)) ||
        (location.user && location.user.firstName && location.user.firstName.toLowerCase().includes(query)) ||
        (location.user && location.user.lastName && location.user.lastName.toLowerCase().includes(query))
      );
      setFilteredLocations(filtered);
    }
    // Reset to first page when search changes
    setCurrentPage(1);
  }, [searchQuery, locations]);

  // Update paginated data when filtered data changes or pagination settings change
  useEffect(() => {
    if (!filteredLocations) {
      setPaginatedData([]);
      setTotalPages(1);
      return;
    }

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    setPaginatedData(filteredLocations.slice(startIndex, endIndex));
    setTotalPages(Math.max(1, Math.ceil(filteredLocations.length / itemsPerPage)));

    // Reset to page 1 if current page is out of bounds after data change
    if (currentPage > Math.ceil(filteredLocations.length / itemsPerPage) && filteredLocations.length > 0) {
      setCurrentPage(1);
    }
  }, [filteredLocations, currentPage, itemsPerPage]);

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  // Handle items per page change
  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(Number(value));
    setCurrentPage(1); // Reset to first page when changing items per page
  };

  // Pagination navigation functions
  const goToFirstPage = () => setCurrentPage(1);
  const goToLastPage = () => setCurrentPage(totalPages);
  const goToPreviousPage = () => currentPage > 1 && setCurrentPage(currentPage - 1);
  const goToNextPage = () => currentPage < totalPages && setCurrentPage(currentPage + 1);

  const getUserDisplayName = (user?: { firstName: string; lastName: string } | null) => {
    if (!user || !user.firstName || !user.lastName) return "Aucun responsable";
    return `${user.firstName} ${user.lastName}`;
  };

  if (isLoading) {
    return <div>Chargement...</div>;
  }

  if (!locations || locations.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-semibold">Emplacements</h2>
        </div>
        <div className="text-center py-6">
          Aucun emplacement trouvé
        </div>
      </div>
    );
  }


  const handleEdit = (location: StockLocation) => {
    setEditingLocation(location);
    setIsEditDialogOpen(true);
  };

  const handleDelete = async (location: StockLocation) => {
    setLocationToDelete(location);
    setIsDeleteDialogOpen(true);
    setDeleteCheckLoading(true);
    setDeleteCheckError(null);
    setLocationContents(null);

    try {
      const response = await fetch(`/api/stock-locations/${location.id}/contents`);
      if (!response.ok) {
        throw new Error('Échec de la vérification du contenu du lieu.');
      }
      const data: LocationContents = await response.json();
      setLocationContents(data);
    } catch (error) {
      setDeleteCheckError(error instanceof Error ? error.message : 'Une erreur inconnue est survenue.');
    } finally {
      setDeleteCheckLoading(false);
    }
  };

  const handleEditSuccess = () => {
    setIsEditDialogOpen(false);
    setEditingLocation(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        {/* Search bar */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
          <Input
            type="text"
            placeholder="Rechercher par nom, description ou responsable..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="pl-8"
          />
        </div>
      </div>
      <div className=" shadow-md rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-blue-600 ">Nom</TableHead>
              <TableHead className="text-blue-600 ">Description</TableHead>
              <TableHead className="text-blue-600 ">Responsable</TableHead>
              <TableHead className="text-right text-blue-600 ">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData?.map((location: StockLocation) => (
              <TableRow key={location.id}>
                <TableCell>{location.name}</TableCell>
                <TableCell>{location.description || '-'}</TableCell>
                <TableCell>{getUserDisplayName(location.user)}</TableCell>
                <TableCell className="text-right space-x-1 ">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleEdit(location)}
                    className="h-9 w-9 rounded-md border border-gray-200 bg-white hover:bg-gray-100"
                    title="Modifier l'emplacement"
                  >
                    <Edit className="h-5 w-5" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleDelete(location)}
                    className="h-9 w-9 rounded-md border border-gray-200 bg-white hover:bg-gray-100"
                    title="Supprimer l'emplacement"
                  >
                    <Trash2 className="h-5 w-5 text-gray-900" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier l&apos;emplacement</DialogTitle>
            <DialogDescription>
              Modifiez les détails de l&apos;emplacement ci-dessous.
            </DialogDescription>
          </DialogHeader>
          {editingLocation && (
            <LocationEditForm
              location={editingLocation}
              onSuccess={handleEditSuccess}
              onCancel={() => setIsEditDialogOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {locationContents && (locationContents.products > 0 || locationContents.medicalDevices > 0)
                ? "Suppression impossible"
                : "Confirmer la suppression"}
            </DialogTitle>
          </DialogHeader>
          {deleteCheckLoading ? (
            <div className="flex items-center justify-center p-4">
              <p>Vérification du contenu de l'emplacement...</p>
            </div>
          ) : deleteCheckError ? (
            <div className="p-4 text-red-600 bg-red-50 rounded-md">
              <p>Erreur: {deleteCheckError}</p>
            </div>
          ) : locationContents && (locationContents.products > 0 || locationContents.medicalDevices > 0) ? (
            <div>
              <p>Cet emplacement ne peut pas être supprimé car il contient encore des éléments :</p>
              <ul className="list-disc pl-6 mt-2 text-sm text-gray-700">
                {locationContents.products > 0 && <li>{locationContents.products} produit(s)</li>}
                {locationContents.medicalDevices > 0 && <li>{locationContents.medicalDevices} appareil(s) médical(ux)</li>}
              </ul>
              <p className="mt-4 text-sm">Veuillez d'abord déplacer ou supprimer ces éléments.</p>
            </div>
          ) : (
            <DialogDescription>
              Êtes-vous sûr de vouloir supprimer l&apos;emplacement &quot;{locationToDelete?.name}&quot; ?
              Cette action ne peut pas être annulée.
            </DialogDescription>
          )}
          <DialogFooter className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              {locationContents && (locationContents.products > 0 || locationContents.medicalDevices > 0) ? "Fermer" : "Annuler"}
            </Button>
            {!(locationContents && (locationContents.products > 0 || locationContents.medicalDevices > 0)) && !deleteCheckLoading && !deleteCheckError && (
              <Button
                variant="destructive"
                onClick={() => locationToDelete && deleteLocationMutation.mutate(locationToDelete.id)}
                disabled={deleteLocationMutation.isPending}
              >
                {deleteLocationMutation.isPending ? "Suppression..." : "Supprimer"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pagination controls */}
      {filteredLocations && filteredLocations.length > 0 && (
        <div className="flex items-center justify-between px-2 py-4 border-t">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-700">
              Affichage de {paginatedData.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} à {Math.min(currentPage * itemsPerPage, filteredLocations.length)} sur {filteredLocations.length} emplacements
            </span>
          </div>

          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-700">Lignes par page:</span>
              <Select
                value={itemsPerPage.toString()}
                onValueChange={handleItemsPerPageChange}
              >
                <SelectTrigger className="h-8 w-[70px]">
                  <SelectValue placeholder={itemsPerPage.toString()} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5</SelectItem>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="icon"
                onClick={goToFirstPage}
                disabled={currentPage === 1}
                className="h-8 w-8 p-0"
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={goToPreviousPage}
                disabled={currentPage === 1}
                className="h-8 w-8 p-0"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <span className="text-sm">
                Page {currentPage} sur {totalPages}
              </span>

              <Button
                variant="outline"
                size="icon"
                onClick={goToNextPage}
                disabled={currentPage === totalPages}
                className="h-8 w-8 p-0"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={goToLastPage}
                disabled={currentPage === totalPages}
                className="h-8 w-8 p-0"
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default StockLocationsTable;