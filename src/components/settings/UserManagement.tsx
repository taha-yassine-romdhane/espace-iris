import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { toast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";
import { Search, Loader2 } from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface User {
  id: string;
  name: string;
  email: string;
  telephone?: string;
  role: "ADMIN" | "EMPLOYEE" | "MANAGER" | "DOCTOR";
  isActive: boolean;
}

export function UserManagement() {
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch users
  const { data: users, isLoading } = useQuery<User[]>({
    queryKey: ["users"],
    queryFn: async () => {
      try {
        const response = await fetch("/api/users");
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || "Failed to fetch users");
        }
        
        const data = await response.json();
        return Array.isArray(data) ? data : [];
      } catch (error) {
        toast({
          title: "Erreur",
          description: error instanceof Error ? error.message : "Impossible de charger les utilisateurs",
          variant: "destructive",
        });
        return [];
      }
    },
  });

  // Filter users based on search query
  const filteredUsers = Array.isArray(users) ? users.filter((user: User) => {
    if (!user) return false;
    
    const searchTerm = searchQuery.toLowerCase();
    return (
      (user.name?.toLowerCase() || '').includes(searchTerm) ||
      (user.email?.toLowerCase() || '').includes(searchTerm) ||
      (user.role?.toLowerCase() || '').includes(searchTerm)
    );
  }) : [];

  // Role badge color mapping
  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "ADMIN":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "MANAGER":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "DOCTOR":
        return "bg-green-100 text-green-800 border-green-200";
      case "EMPLOYEE":
        return "bg-amber-100 text-amber-800 border-amber-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-xl">Gestion des utilisateurs</CardTitle>
          <p className="text-sm text-muted-foreground">
            Visualisez les utilisateurs du système et leurs rôles.
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex items-center mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Rechercher un utilisateur..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          
          <Separator className="my-4" />
          
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
              <span className="ml-2 text-muted-foreground">Chargement...</span>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              Aucun utilisateur trouvé
            </div>
          ) : (
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Téléphone</TableHead>
                    <TableHead>Rôle</TableHead>
                    <TableHead>Statut</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user: User) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{user.telephone || "-"}</TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline" 
                          className={getRoleBadgeColor(user.role)}
                        >
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={user.isActive ? "default" : "secondary"}
                          className={user.isActive 
                            ? "bg-green-100 text-green-700" 
                            : "bg-gray-100 text-gray-700"
                          }
                        >
                          {user.isActive ? 'Actif' : 'Inactif'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default UserManagement;
