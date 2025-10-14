import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface TasksHistoryProps {
  technicianId: string;
}

interface Task {
  id: string;
  taskCode?: string;
  title: string;
  description: string;
  status: "TODO" | "IN_PROGRESS" | "COMPLETED";
  priority: "LOW" | "MEDIUM" | "HIGH";
  startDate: string;
  endDate: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export function TasksHistory({ technicianId }: TasksHistoryProps) {
  const { data: tasks, isLoading, error } = useQuery({
    queryKey: ['technician-tasks', technicianId],
    queryFn: async () => {
      const response = await axios.get(`/api/technicians/${technicianId}/tasks`);
      return response.data as Task[];
    }
  });

  // Filter tasks by personal and general categories
  const personalTasks = tasks?.filter(task => 
    task.title.toLowerCase().includes('formation') || 
    task.title.toLowerCase().includes('patient') ||
    task.description?.toLowerCase().includes('patient')
  ) || [];

  const generalTasks = tasks?.filter(task => 
    !task.title.toLowerCase().includes('formation') && 
    !task.title.toLowerCase().includes('patient') &&
    !task.description?.toLowerCase().includes('patient')
  ) || [];

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-100 text-green-800 hover:bg-green-100';
      case 'IN_PROGRESS':
        return 'bg-blue-100 text-blue-800 hover:bg-blue-100';
      case 'TODO':
        return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100';
      default:
        return '';
    }
  };

  const getPriorityBadgeColor = (priority: string) => {
    switch (priority) {
      case 'HIGH':
        return 'bg-red-100 text-red-800 hover:bg-red-100';
      case 'MEDIUM':
        return 'bg-orange-100 text-orange-800 hover:bg-orange-100';
      case 'LOW':
        return 'bg-green-100 text-green-800 hover:bg-green-100';
      default:
        return '';
    }
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'dd/MM/yyyy', { locale: fr });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-medium text-red-600">
            Erreur de chargement
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p>Impossible de charger les tâches. Veuillez réessayer plus tard.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Personal Tasks */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-medium">
            Historique des Tâches Personnalisées
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Suivi des tâches spécifiques effectuées par le technicien
          </p>
        </CardHeader>
        <CardContent>
          {personalTasks.length === 0 ? (
            <p className="text-center py-4 text-muted-foreground">Aucune tâche personnalisée trouvée</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Tâche</TableHead>
                  <TableHead>Détails</TableHead>
                  <TableHead>Priorité</TableHead>
                  <TableHead>Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {personalTasks.map((task) => (
                  <TableRow key={task.id}>
                    <TableCell>{formatDate(task.startDate)}</TableCell>
                    <TableCell>{task.title}</TableCell>
                    <TableCell>{task.description || 'N/A'}</TableCell>
                    <TableCell>
                      <Badge className={getPriorityBadgeColor(task.priority)}>
                        {task.priority === 'HIGH' ? 'Haute' : task.priority === 'MEDIUM' ? 'Moyenne' : 'Basse'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusBadgeColor(task.status)}>
                        {task.status === 'COMPLETED' ? 'Terminé' : task.status === 'IN_PROGRESS' ? 'En cours' : 'À faire'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* General Tasks */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-medium">
            Historique des Tâches Générales
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Suivi des tâches générales effectuées par le technicien
          </p>
        </CardHeader>
        <CardContent>
          {generalTasks.length === 0 ? (
            <p className="text-center py-4 text-muted-foreground">Aucune tâche générale trouvée</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Tâche</TableHead>
                  <TableHead>Détails</TableHead>
                  <TableHead>Priorité</TableHead>
                  <TableHead>Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {generalTasks.map((task) => (
                  <TableRow key={task.id}>
                    <TableCell>{formatDate(task.startDate)}</TableCell>
                    <TableCell>{task.title}</TableCell>
                    <TableCell>{task.description || 'N/A'}</TableCell>
                    <TableCell>
                      <Badge className={getPriorityBadgeColor(task.priority)}>
                        {task.priority === 'HIGH' ? 'Haute' : task.priority === 'MEDIUM' ? 'Moyenne' : 'Basse'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusBadgeColor(task.status)}>
                        {task.status === 'COMPLETED' ? 'Terminé' : task.status === 'IN_PROGRESS' ? 'En cours' : 'À faire'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default TasksHistory;
