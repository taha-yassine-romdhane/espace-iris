import React, { useState, useEffect } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, X, Edit2, Plus, Trash2, Search, ChevronLeft, ChevronRight } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface StockLocation {
  id?: string;
  name: string;
  description?: string;
  userId?: string;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  isActive: boolean;
}

interface User {
  id: string;
  firstName: string;
  lastName: string;
}

export function StockLocationsExcelTable() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editedLocation, setEditedLocation] = useState<StockLocation | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newLocation, setNewLocation] = useState<Partial<StockLocation>>({
    name: "",
    description: "",
    isActive: true
  });
  const [locationToDelete, setLocationToDelete] = useState<StockLocation | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteCheckLoading, setDeleteCheckLoading] = useState(false);
  const [locationContents, setLocationContents] = useState<{ products: number; medicalDevices: number } | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);

  // Filter state
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch stock locations
  const { data: locations = [], isLoading } = useQuery({
    queryKey: ["stock-locations"],
    queryFn: async () => {
      const response = await fetch("/api/stock-locations");
      if (!response.ok) throw new Error("Failed to fetch stock locations");
      return response.json();
    },
  });

  // Fetch users for the responsible dropdown
  const { data: users = [] } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const response = await fetch("/api/users");
      if (!response.ok) throw new Error("Failed to fetch users");
      return response.json();
    },
  });

  // Filter users to show only EMPLOYEE and ADMIN roles who don't have a location
  const getAvailableUsers = (currentUserId?: string) => {
    // Get all user IDs that already have stock locations
    const assignedUserIds = new Set(
      locations
        .filter((loc: StockLocation) => loc.userId && loc.userId !== currentUserId)
        .map((loc: StockLocation) => loc.userId)
    );

    // Filter users: only EMPLOYEE or ADMIN, and not already assigned to a location
    return users.filter((user: any) => {
      const isEmployeeOrAdmin = user.role === 'EMPLOYEE' || user.role === 'ADMIN';
      const isAvailable = !assignedUserIds.has(user.id);
      const isCurrentUser = user.id === currentUserId;

      return isEmployeeOrAdmin && (isAvailable || isCurrentUser);
    });
  };

  // Apply filters
  const filteredLocations = locations.filter((location: StockLocation) => {
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      const matchesSearch =
        location.name?.toLowerCase().includes(search) ||
        location.description?.toLowerCase().includes(search) ||
        location.user?.firstName?.toLowerCase().includes(search) ||
        location.user?.lastName?.toLowerCase().includes(search);

      if (!matchesSearch) return false;
    }
    return true;
  });

  // Pagination
  const totalPages = Math.ceil(filteredLocations.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedLocations = filteredLocations.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: Partial<StockLocation>) => {
      const response = await fetch("/api/stock-locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to create location");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stock-locations"] });
      toast({ title: "Succès", description: "Emplacement créé avec succès" });
      handleCancelNew();
    },
    onError: () => {
      toast({ title: "Erreur", description: "Erreur lors de la création", variant: "destructive" });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data: StockLocation) => {
      const response = await fetch(`/api/stock-locations/${data.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to update location");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stock-locations"] });
      toast({ title: "Succès", description: "Emplacement mis à jour avec succès" });
      setEditingId(null);
      setEditedLocation(null);
    },
    onError: () => {
      toast({ title: "Erreur", description: "Erreur lors de la mise à jour", variant: "destructive" });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/stock-locations/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete location");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stock-locations"] });
      toast({ title: "Succès", description: "Emplacement supprimé avec succès" });
      setIsDeleteDialogOpen(false);
      setLocationToDelete(null);
    },
    onError: () => {
      toast({ title: "Erreur", description: "Erreur lors de la suppression", variant: "destructive" });
    },
  });

  const handleEdit = (location: StockLocation) => {
    setEditingId(location.id || null);
    setEditedLocation({ ...location });
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditedLocation(null);
  };

  const handleSave = async () => {
    if (!editedLocation || !editedLocation.name) {
      toast({ title: "Erreur", description: "Le nom est requis", variant: "destructive" });
      return;
    }
    updateMutation.mutate(editedLocation);
  };

  const handleAddNew = () => {
    setIsAddingNew(true);
  };

  const handleCancelNew = () => {
    setIsAddingNew(false);
    setNewLocation({ name: "", description: "", isActive: true });
  };

  const handleSaveNew = async () => {
    if (!newLocation.name) {
      toast({ title: "Erreur", description: "Le nom est requis", variant: "destructive" });
      return;
    }
    createMutation.mutate(newLocation);
  };

  const handleDelete = async (location: StockLocation) => {
    setLocationToDelete(location);
    setIsDeleteDialogOpen(true);
    setDeleteCheckLoading(true);
    setLocationContents(null);

    try {
      const response = await fetch(`/api/stock-locations/${location.id}/contents`);
      if (!response.ok) throw new Error('Échec de la vérification du contenu');
      const data = await response.json();
      setLocationContents(data);
    } catch (error) {
      console.error("Error checking location contents:", error);
    } finally {
      setDeleteCheckLoading(false);
    }
  };

  const updateEditedField = (field: keyof StockLocation, value: any) => {
    if (editedLocation) {
      setEditedLocation({ ...editedLocation, [field]: value });
    }
  };

  const updateNewField = (field: keyof StockLocation, value: any) => {
    setNewLocation({ ...newLocation, [field]: value });
  };

  const getUserDisplayName = (user?: { firstName: string; lastName: string } | null) => {
    if (!user) return "Aucun responsable";
    return `${user.firstName} ${user.lastName}`;
  };

  const renderCell = (location: StockLocation, field: keyof StockLocation, isEditing: boolean) => {
    const value = isEditing && editedLocation ? editedLocation[field] : location[field];

    if (isEditing && editedLocation) {
      switch (field) {
        case 'name':
        case 'description':
          return (
            <Input
              value={(editedLocation[field] as string) || ''}
              onChange={(e) => updateEditedField(field, e.target.value)}
              className="h-8 text-xs"
              placeholder={field === 'name' ? 'Nom requis' : 'Description'}
            />
          );

        case 'userId':
          const availableUsersForEdit = getAvailableUsers(editedLocation.userId || undefined);
          return (
            <Select
              value={editedLocation.userId || 'none'}
              onValueChange={(val) => updateEditedField('userId', val === 'none' ? null : val)}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Sélectionner" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Aucun responsable</SelectItem>
                {availableUsersForEdit.map((user: any) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.firstName} {user.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          );

        default:
          return <span className="text-xs">{(value as string) || '-'}</span>;
      }
    }

    // Display mode
    switch (field) {
      case 'userId':
        return <span className="text-xs">{getUserDisplayName(location.user)}</span>;
      default:
        return <span className="text-xs">{(value as string) || '-'}</span>;
    }
  };

  const renderNewLocationRow = () => {
    if (!isAddingNew) return null;

    return (
      <tr className="bg-blue-50 border-b border-blue-200">
        <td className="px-2 py-2">
          <Input
            value={newLocation.name || ''}
            onChange={(e) => updateNewField('name', e.target.value)}
            className="h-8 text-xs"
            placeholder="Nom (requis)"
          />
        </td>
        <td className="px-2 py-2">
          <Input
            value={newLocation.description || ''}
            onChange={(e) => updateNewField('description', e.target.value)}
            className="h-8 text-xs"
            placeholder="Description"
          />
        </td>
        <td className="px-2 py-2">
          <Select
            value={newLocation.userId || 'none'}
            onValueChange={(val) => updateNewField('userId', val === 'none' ? null : val)}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Sélectionner" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Aucun responsable</SelectItem>
              {getAvailableUsers().map((user: any) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.firstName} {user.lastName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </td>
        <td className="px-3 py-2 sticky right-0 bg-blue-50/80 backdrop-blur-sm z-10">
          <div className="flex gap-1 justify-end">
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={handleSaveNew} disabled={createMutation.isPending}>
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

  if (isLoading) {
    return <div className="text-center py-8">Chargement...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Header with Add Button */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold">Emplacements de Stock</h2>
          <p className="text-sm text-gray-500">
            {filteredLocations.length} / {locations.length} emplacements
          </p>
        </div>
        <Button onClick={handleAddNew} disabled={isAddingNew} className="gap-2">
          <Plus className="h-4 w-4" />
          Ajouter un emplacement
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-gray-50 p-4 rounded-lg border">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Rechercher (nom, description, responsable...)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 h-9 text-sm"
          />
        </div>
      </div>

      {/* Excel-like Table */}
      <div className="border rounded-lg overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-gray-100 sticky top-0 z-20">
            <tr className="border-b">
              <th className="px-2 py-3 text-left text-xs font-semibold min-w-[200px]">Nom</th>
              <th className="px-2 py-3 text-left text-xs font-semibold min-w-[300px]">Description</th>
              <th className="px-2 py-3 text-left text-xs font-semibold min-w-[200px]">Responsable</th>
              <th className="px-3 py-3 text-right text-xs font-semibold sticky right-0 bg-gray-100/95 backdrop-blur-sm z-30 min-w-[120px]">Actions</th>
            </tr>
          </thead>
          <tbody>
            {/* New location row */}
            {renderNewLocationRow()}

            {/* Existing locations */}
            {paginatedLocations.map((location: StockLocation) => {
              const isEditing = editingId === location.id;

              return (
                <tr key={location.id} className={`border-b hover:bg-gray-50 ${isEditing ? 'bg-yellow-50' : ''}`}>
                  <td className="px-2 py-2">{renderCell(location, 'name', isEditing)}</td>
                  <td className="px-2 py-2">{renderCell(location, 'description', isEditing)}</td>
                  <td className="px-2 py-2">{renderCell(location, 'userId', isEditing)}</td>
                  <td className={`px-3 py-2 sticky right-0 z-10 ${isEditing ? 'bg-yellow-50/80' : 'bg-white/80'} backdrop-blur-sm`}>
                    {isEditing ? (
                      <div className="flex gap-1 justify-end">
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={handleSave} disabled={updateMutation.isPending}>
                          <Check className="h-4 w-4 text-green-600" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={handleCancel}>
                          <X className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex gap-1 justify-end">
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => handleEdit(location)}>
                          <Edit2 className="h-4 w-4 text-blue-600" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => handleDelete(location)}>
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
      {filteredLocations.length > 0 && (
        <div className="flex items-center justify-between border-t pt-4">
          <div className="flex items-center gap-4">
            <p className="text-sm text-gray-600">
              Affichage de {startIndex + 1} à {Math.min(endIndex, filteredLocations.length)} sur {filteredLocations.length} emplacements
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

      {locations.length === 0 && !isAddingNew && (
        <div className="text-center py-8 text-gray-500">
          Aucun emplacement. Cliquez sur "Ajouter un emplacement" pour commencer.
        </div>
      )}

      {locations.length > 0 && filteredLocations.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          Aucun emplacement ne correspond à la recherche.
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {locationContents && (locationContents.products > 0 || locationContents.medicalDevices > 0)
                ? "Suppression impossible"
                : "Confirmer la suppression"}
            </AlertDialogTitle>
          </AlertDialogHeader>
          {deleteCheckLoading ? (
            <div className="flex items-center justify-center p-4">
              <p>Vérification du contenu de l'emplacement...</p>
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
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer l'emplacement "{locationToDelete?.name}" ?
              Cette action ne peut pas être annulée.
            </AlertDialogDescription>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>
              {locationContents && (locationContents.products > 0 || locationContents.medicalDevices > 0) ? "Fermer" : "Annuler"}
            </AlertDialogCancel>
            {!(locationContents && (locationContents.products > 0 || locationContents.medicalDevices > 0)) && !deleteCheckLoading && (
              <AlertDialogAction
                onClick={() => locationToDelete && deleteMutation.mutate(locationToDelete.id!)}
                disabled={deleteMutation.isPending}
                className="bg-red-600 hover:bg-red-700"
              >
                {deleteMutation.isPending ? "Suppression..." : "Supprimer"}
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
