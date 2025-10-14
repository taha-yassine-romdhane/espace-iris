import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'TODO' | 'IN_PROGRESS' | 'COMPLETED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  startDate: string;
  endDate: string;
  assignedTo: {
    firstName: string;
    lastName: string;
    role: string;
  };
}

interface DayTasksModalProps {
  open: boolean;
  onClose: () => void;
  date: Date;
  tasks: Task[];
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'COMPLETED':
      return 'bg-green-100 text-green-800';
    case 'IN_PROGRESS':
      return 'bg-blue-100 text-blue-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'HIGH':
      return 'bg-red-100 text-red-800';
    case 'MEDIUM':
      return 'bg-yellow-100 text-yellow-800';
    default:
      return 'bg-blue-100 text-blue-800';
  }
};

export function DayTasksModal({ open, onClose, date, tasks }: DayTasksModalProps) {
  const sortedTasks = [...tasks].sort((a, b) => 
    new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            {format(date, 'EEEE d MMMM yyyy', { locale: fr })}
          </DialogTitle>
        </DialogHeader>

        <div className="mt-4">
          <div className="grid grid-cols-1 gap-4">
            {sortedTasks.map(task => (
              <div
                key={task.id}
                className="bg-white rounded-lg shadow p-4 border border-gray-100 hover:border-gray-200 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <h3 className="font-semibold text-lg">{task.title}</h3>
                    {task.description && (
                      <p className="text-gray-600">{task.description}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Badge variant="secondary" className={cn(getStatusColor(task.status))}>
                      {task.status === 'TODO' ? 'À faire' : 
                       task.status === 'IN_PROGRESS' ? 'En cours' : 'Terminé'}
                    </Badge>
                    <Badge variant="secondary" className={cn(getPriorityColor(task.priority))}>
                      {task.priority === 'HIGH' ? 'Haute' :
                       task.priority === 'MEDIUM' ? 'Moyenne' : 'Basse'}
                    </Badge>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
                  <div className="flex items-center gap-2">
                    <span>
                      {format(new Date(task.startDate), 'HH:mm')} - {format(new Date(task.endDate), 'HH:mm')}
                    </span>
                    <span className="text-gray-300">|</span>
                    <span>
                      {task.assignedTo.firstName} {task.assignedTo.lastName}
                    </span>
                  </div>
                  <div>
                    {task.assignedTo.role === 'MANAGER' ? 'Manager' : 'Technicien'}
                  </div>
                </div>
              </div>
            ))}

            {tasks.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                Aucune tâche pour cette journée
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
