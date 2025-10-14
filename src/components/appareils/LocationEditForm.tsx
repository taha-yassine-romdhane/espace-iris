import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { User } from "@prisma/client";

interface LocationEditFormProps {
  location?: {
    id?: string;
    name?: string;
    description?: string | null;
    userId?: string | null;
  };
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function LocationEditForm({ location = undefined, onSuccess, onCancel }: LocationEditFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    name: location?.name || "",
    description: location?.description || "",
    userId: location?.userId || "",
  });

  // Update form data when location changes
  useEffect(() => {
    setFormData({
      name: location?.name || "",
      description: location?.description || "",
      userId: location?.userId || "none", // Use 'none' instead of empty string
    });
  }, [location]);

  // Fetch users from the formatted API endpoint
  const { data: users, isLoading } = useQuery({
    queryKey: ["formatted-users"],
    queryFn: async () => {
      const response = await fetch("/api/users/formatted");
      if (!response.ok) {
        throw new Error("Failed to fetch users");
      }
      return response.json();
    },
  });

  // Users are already sorted by the API
  const formattedUsers = users || [];

  const updateLocationMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      // Convert 'none' value to null for userId
      const submissionData = {
        ...data,
        userId: data.userId === 'none' ? null : data.userId
      };
      
      const response = await fetch(`/api/stock-locations/${location?.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(submissionData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update location");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stock-locations"] });
      toast({
        title: "Succès",
        description: "L'emplacement a été modifié avec succès",
      });
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast({
        title: "Erreur",
        description: error.message || "Une erreur est survenue lors de la modification de l'emplacement",
        variant: "destructive",
      });
    },
  });

  return (
    <div className="space-y-4 py-4">
      <div className="space-y-2">
        <label htmlFor="name">Nom</label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        />
      </div>
      <div className="space-y-2">
        <label htmlFor="description">Description</label>
        <Input
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
        />
      </div>
      <div className="space-y-2">
        <label htmlFor="userId">Responsable</label>
        <Select
          value={formData.userId}
          onValueChange={(value) => setFormData({ ...formData, userId: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Sélectionner un responsable" />
          </SelectTrigger>
          <SelectContent>
            {isLoading ? (
              <SelectItem value="loading" disabled>
                Chargement...
              </SelectItem>
            ) : formattedUsers.length > 0 ? (
              <>
                <SelectItem value="none">Aucun responsable</SelectItem>
                {formattedUsers.map((user: User) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.firstName + " " + user.lastName}
                  </SelectItem>
                ))}
              </>
            ) : (
              <SelectItem value="no-users" disabled>
                Aucun utilisateur disponible
              </SelectItem>
            )}
          </SelectContent>
        </Select>
      </div>
      <div className="flex justify-end space-x-2 pt-4">
        <Button variant="outline" onClick={onCancel}>
          Annuler
        </Button>
        <Button
          onClick={() => updateLocationMutation.mutate(formData)}
          disabled={!formData.name || updateLocationMutation.isPending}
        >
          {updateLocationMutation.isPending ? "Enregistrement..." : "Enregistrer"}
        </Button>
      </div>
    </div>
  );
}

export default LocationEditForm;
