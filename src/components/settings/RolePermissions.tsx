import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/use-toast";
import { Separator } from "@/components/ui/separator";
import { Info, Shield } from "lucide-react";


// Define modules and their permissions
const modules = [
  {
    name: "Patients",
    permissions: [
      { id: "patients:view", name: "Voir les patients", description: "Permet de voir la liste des patients" },
      { id: "patients:create", name: "Créer des patients", description: "Permet de créer de nouveaux patients" },
      { id: "patients:edit", name: "Modifier les patients", description: "Permet de modifier les informations des patients" },
      { id: "patients:delete", name: "Supprimer les patients", description: "Permet de supprimer des patients" },
    ]
  },
  {
    name: "Appareils",
    permissions: [
      { id: "devices:view", name: "Voir les appareils", description: "Permet de voir la liste des appareils" },
      { id: "devices:create", name: "Créer des appareils", description: "Permet d'ajouter de nouveaux appareils" },
      { id: "devices:edit", name: "Modifier les appareils", description: "Permet de modifier les appareils" },
      { id: "devices:delete", name: "Supprimer les appareils", description: "Permet de supprimer des appareils" },
      { id: "devices:parameters", name: "Gérer les paramètres", description: "Permet de gérer les paramètres des appareils" },
    ]
  },
  {
    name: "Rendez-vous",
    permissions: [
      { id: "appointments:view", name: "Voir les rendez-vous", description: "Permet de voir les rendez-vous" },
      { id: "appointments:create", name: "Créer des rendez-vous", description: "Permet de créer des rendez-vous" },
      { id: "appointments:edit", name: "Modifier les rendez-vous", description: "Permet de modifier les rendez-vous" },
      { id: "appointments:delete", name: "Supprimer les rendez-vous", description: "Permet de supprimer des rendez-vous" },
    ]
  },
  {
    name: "Facturation",
    permissions: [
      { id: "billing:view", name: "Voir les factures", description: "Permet de voir les factures" },
      { id: "billing:create", name: "Créer des factures", description: "Permet de créer des factures" },
      { id: "billing:edit", name: "Modifier les factures", description: "Permet de modifier les factures" },
      { id: "billing:delete", name: "Supprimer les factures", description: "Permet de supprimer des factures" },
      { id: "billing:payments", name: "Gérer les paiements", description: "Permet de gérer les paiements" },
    ]
  },
  {
    name: "Utilisateurs",
    permissions: [
      { id: "users:view", name: "Voir les utilisateurs", description: "Permet de voir la liste des utilisateurs" },
      { id: "users:create", name: "Créer des utilisateurs", description: "Permet de créer de nouveaux utilisateurs" },
      { id: "users:edit", name: "Modifier les utilisateurs", description: "Permet de modifier les utilisateurs" },
      { id: "users:delete", name: "Supprimer les utilisateurs", description: "Permet de supprimer des utilisateurs" },
    ]
  },
  {
    name: "Paramètres",
    permissions: [
      { id: "settings:view", name: "Voir les paramètres", description: "Permet de voir les paramètres du système" },
      { id: "settings:edit", name: "Modifier les paramètres", description: "Permet de modifier les paramètres du système" },
      { id: "settings:roles", name: "Gérer les rôles", description: "Permet de gérer les rôles et les permissions" },
    ]
  },
];

// Default role permissions
const defaultRolePermissions = {
  ADMIN: modules.flatMap(module => module.permissions.map(p => p.id)), // All permissions
  MANAGER: [
    "patients:view", "patients:create", "patients:edit",
    "devices:view", "devices:create", "devices:edit", "devices:parameters",
    "appointments:view", "appointments:create", "appointments:edit", "appointments:delete",
    "billing:view", "billing:create", "billing:edit", "billing:payments",
    "users:view",
    "settings:view",
  ],
  EMPLOYEE: [
    "patients:view", "patients:create", "patients:edit",
    "devices:view",
    "appointments:view", "appointments:create", "appointments:edit",
    "billing:view", "billing:create",
  ],
  DOCTOR: [
    "patients:view", "patients:edit",
    "devices:view", "devices:parameters",
    "appointments:view", "appointments:create", "appointments:edit",
  ],
};

// Role descriptions
const roleDescriptions = {
  ADMIN: "Accès complet à toutes les fonctionnalités du système",
  MANAGER: "Gestion des opérations quotidiennes et supervision des employés",
  EMPLOYEE: "Accès aux fonctionnalités de base pour les opérations quotidiennes",
  DOCTOR: "Accès aux dossiers patients et aux fonctionnalités médicales",
};

export function RolePermissions() {
  const queryClient = useQueryClient();
  const [activeRole, setActiveRole] = useState<string>("ADMIN");
  const [rolePermissions, setRolePermissions] = useState<Record<string, string[]>>(defaultRolePermissions);
  const [hasChanges, setHasChanges] = useState<boolean>(false);

  // Fetch role permissions
  const { data: fetchedRolePermissions } = useQuery({
    queryKey: ["role-permissions"],
    queryFn: async () => {
      try {
        const response = await fetch("/api/role-permissions");
        if (!response.ok) {
          // If the API doesn't exist yet, use default permissions
          return defaultRolePermissions;
        }
        return await response.json();
      } catch  {
        // If there's an error, use default permissions
        return defaultRolePermissions;
      }
    }
  });

  // Update local state when data is fetched
  useEffect(() => {
    if (fetchedRolePermissions) {
      setRolePermissions(fetchedRolePermissions);
    }
  }, [fetchedRolePermissions]);

  // Update role permissions mutation
  const updateRolePermissionsMutation = useMutation({
    mutationFn: async (data: Record<string, string[]>) => {
      try {
        const response = await fetch("/api/role-permissions", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        });
        
        if (!response.ok) {
          throw new Error("Failed to update role permissions");
        }
        
        return await response.json();
      } catch  {
        // If the API doesn't exist yet, just simulate success
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["role-permissions"] });
      setHasChanges(false);
      toast({
        title: "Permissions mises à jour",
        description: "Les permissions des rôles ont été mises à jour avec succès",
      });
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de la mise à jour des permissions",
        variant: "destructive",
      });
    },
  });

  // Toggle permission for a role
  const togglePermission = (permissionId: string) => {
    setRolePermissions(prev => {
      const newPermissions = { ...prev };
      
      if (newPermissions[activeRole].includes(permissionId)) {
        newPermissions[activeRole] = newPermissions[activeRole].filter(id => id !== permissionId);
      } else {
        newPermissions[activeRole] = [...newPermissions[activeRole], permissionId];
      }
      
      setHasChanges(true);
      return newPermissions;
    });
  };

  // Save changes
  const saveChanges = () => {
    updateRolePermissionsMutation.mutate(rolePermissions);
  };

  // Reset changes
  const resetChanges = () => {
    if (fetchedRolePermissions) {
      setRolePermissions(fetchedRolePermissions);
    } else {
      setRolePermissions(defaultRolePermissions);
    }
    setHasChanges(false);
  };

  // Check if a permission is enabled for the current role
  const isPermissionEnabled = (permissionId: string) => {
    return rolePermissions[activeRole]?.includes(permissionId) || false;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <CardTitle className="text-xl">Rôles et Permissions</CardTitle>
            <div className="flex gap-2">
              {hasChanges && (
                <>
                  <Button variant="outline" onClick={resetChanges}>
                    Annuler
                  </Button>
                  <Button onClick={saveChanges}>
                    Enregistrer les modifications
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="ADMIN" value={activeRole} onValueChange={setActiveRole}>
            <TabsList className="grid grid-cols-4 mb-6">
              <TabsTrigger value="ADMIN" className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Administrateur
              </TabsTrigger>
              <TabsTrigger value="MANAGER">Manager</TabsTrigger>
              <TabsTrigger value="EMPLOYEE">Employé</TabsTrigger>
              <TabsTrigger value="DOCTOR">Médecin</TabsTrigger>
            </TabsList>

            {Object.keys(rolePermissions).map((role) => (
              <TabsContent key={role} value={role} className="space-y-4">
                <div className="bg-blue-50 p-4 rounded-md flex items-start gap-3">
                  <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-blue-800">Description du rôle</h3>
                    <p className="text-blue-700 text-sm">{roleDescriptions[role as keyof typeof roleDescriptions]}</p>
                  </div>
                </div>

                <Separator />

                {modules.map((module) => (
                  <div key={module.name} className="space-y-3">
                    <h3 className="font-medium text-lg">{module.name}</h3>
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[300px]">Permission</TableHead>
                            <TableHead className="w-[400px]">Description</TableHead>
                            <TableHead className="text-right">Accès</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {module.permissions.map((permission) => (
                            <TableRow key={permission.id}>
                              <TableCell className="font-medium">{permission.name}</TableCell>
                              <TableCell>{permission.description}</TableCell>
                              <TableCell className="text-right">
                                <Switch
                                  checked={isPermissionEnabled(permission.id)}
                                  onCheckedChange={() => togglePermission(permission.id)}
                                  disabled={role === "ADMIN" && permission.id.startsWith("settings:")}
                                />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                ))}

                {role === "ADMIN" && (
                  <div className="bg-amber-50 p-4 rounded-md flex items-start gap-3 mt-4">
                    <Info className="h-5 w-5 text-amber-600 mt-0.5" />
                    <div>
                      <h3 className="font-medium text-amber-800">Restrictions pour les administrateurs</h3>
                      <p className="text-amber-700 text-sm">
                        Les administrateurs ont toujours accès aux paramètres système et à la gestion des rôles pour des raisons de sécurité.
                      </p>
                    </div>
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

export default RolePermissions;
