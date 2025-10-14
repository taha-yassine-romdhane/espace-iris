import React from 'react';
import { User, Doctor, Technician, Task, StockLocation } from '@prisma/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { 
  ClipboardListIcon, 
  StethoscopeIcon, 
  WrenchIcon, 
  WarehouseIcon 
} from 'lucide-react';

interface UserDetailsProps {
  user: User & {
    doctor?: Doctor | null;
    technician?: Technician[];
    tasks?: Task[];
    stockLocation?: StockLocation | null;
  };
}

export const UserDetails: React.FC<UserDetailsProps> = ({ user }) => {
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Détails du compte</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="role">
          <TabsList className="mb-4">
            <TabsTrigger value="role">Rôle spécifique</TabsTrigger>
            <TabsTrigger value="tasks">Tâches</TabsTrigger>
            <TabsTrigger value="stock">Stock</TabsTrigger>
          </TabsList>
          
          <TabsContent value="role">
            {user.role === 'DOCTOR' && user.doctor ? (
              <div className="space-y-4">
                <div className="flex items-center">
                  <StethoscopeIcon className="mr-2 h-5 w-5" />
                  <h3 className="text-lg font-medium">Informations du médecin</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="mb-4">
                    <h3 className="text-sm font-medium text-gray-500">Profil</h3>
                    <p className="text-sm text-gray-900">Médecin</p>
                  </div>
                </div>
              </div>
            ) : user.role === 'EMPLOYEE' && user.technician && user.technician.length > 0 ? (
              <div className="space-y-4">
                <div className="flex items-center">
                  <WrenchIcon className="mr-2 h-5 w-5" />
                  <h3 className="text-lg font-medium">Informations du technicien</h3>
                </div>
                {user.technician.map((tech) => (
                  <div key={tech.id} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <span className="text-sm text-muted-foreground">Spécialité</span>
                      <p className="font-medium">{tech.specialty || 'Non spécifié'}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">Pas d'informations spécifiques au rôle disponibles.</p>
            )}
          </TabsContent>
          
          <TabsContent value="tasks">
            {user.tasks && user.tasks.length > 0 ? (
              <div className="space-y-4">
                <div className="flex items-center">
                  <ClipboardListIcon className="mr-2 h-5 w-5" />
                  <h3 className="text-lg font-medium">Tâches assignées</h3>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Titre</TableHead>
                      <TableHead>Date d'échéance</TableHead>
                      <TableHead>Priorité</TableHead>
                      <TableHead>Statut</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {user.tasks.map((task) => (
                      <TableRow key={task.id}>
                        <TableCell>{task.title}</TableCell>
                        <TableCell>
                          {task.endDate ? format(new Date(task.endDate), 'dd/MM/yyyy') : 'Non défini'}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={
                              task.priority === 'HIGH' ? 'destructive' : 
                              task.priority === 'MEDIUM' ? 'warning' : 
                              'default'
                            }
                          >
                            {task.priority}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={
                              task.status === 'COMPLETED' ? 'default' : 
                              task.status === 'IN_PROGRESS' ? 'default' : 
                              'outline'
                            }
                          >
                            {task.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-muted-foreground">Aucune tâche assignée à cet utilisateur.</p>
            )}
          </TabsContent>
          
          <TabsContent value="stock">
            {user.stockLocation ? (
              <div className="space-y-4">
                <div className="flex items-center">
                  <WarehouseIcon className="mr-2 h-5 w-5" />
                  <h3 className="text-lg font-medium">Emplacement de stock assigné</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm text-muted-foreground">Nom</span>
                    <p className="font-medium">{user.stockLocation.name}</p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Description</span>
                    <p className="font-medium">{user.stockLocation.description || 'Aucune description'}</p>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground">Aucun emplacement de stock assigné à cet utilisateur.</p>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
