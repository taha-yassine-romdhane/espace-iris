import { useState } from 'react';
import { useRouter } from 'next/router';
import { useQuery } from '@tanstack/react-query';
import { 
  Calendar, Clock, CreditCard, Stethoscope, Building2,
  ChevronLeft, ChevronRight,  Activity,
  FileText, Phone, Eye, ExternalLink,
  Hash, CalendarDays, ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Users
} from 'lucide-react';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, addDays, addWeeks, subWeeks, addMonths, subMonths } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import AdminLayout from '../AdminLayout';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";

interface ComprehensiveTask {
  id: string;
  title: string;
  description?: string;
  type: 'TASK' | 'DIAGNOSTIC_PENDING' | 'RENTAL_EXPIRING' | 'PAYMENT_DUE' | 'APPOINTMENT_REMINDER' | 'CNAM_RENEWAL' | 'MAINTENANCE_DUE';
  status: 'TODO' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  startDate: string;
  endDate?: string;
  dueDate?: string;
  
  assignedTo?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
  };
  
  client?: {
    id: string;
    name: string;
    type: 'patient' | 'company';
    telephone?: string;
  };
  
  relatedData?: {
    deviceName?: string;
    amount?: number;
    diagnosticId?: string;
    rentalId?: string;
    appointmentId?: string;
    paymentId?: string;
    bonNumber?: string;
  };
  
  actionUrl?: string;
  actionLabel?: string;
  canComplete?: boolean;
  
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  completedBy?: string;
}

const taskTypeConfig = {
  TASK: {
    icon: Activity,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    label: 'Tâche'
  },
  DIAGNOSTIC_PENDING: {
    icon: Stethoscope,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    label: 'Diagnostic'
  },
  RENTAL_EXPIRING: {
    icon: Building2,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    label: 'Location'
  },
  PAYMENT_DUE: {
    icon: CreditCard,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    label: 'Paiement'
  },
  APPOINTMENT_REMINDER: {
    icon: Calendar,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    label: 'RDV'
  },
  CNAM_RENEWAL: {
    icon: FileText,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50',
    borderColor: 'border-indigo-200',
    label: 'CNAM'
  },
  MAINTENANCE_DUE: {
    icon: Activity,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    label: 'Maintenance'
  }
};

type ViewMode = 'month' | 'week' | 'day' | 'list';

export default function ModernTasksPage() {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [filter, setFilter] = useState('all');
  const [assignedUserId, setAssignedUserId] = useState('all');
  const [selectedTask, setSelectedTask] = useState<ComprehensiveTask | null>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);

  // Calculate date range based on view mode
  const getDateRange = () => {
    switch (viewMode) {
      case 'week':
        return {
          start: startOfWeek(selectedDate, { weekStartsOn: 1 }),
          end: endOfWeek(selectedDate, { weekStartsOn: 1 })
        };
      case 'day':
        return {
          start: selectedDate,
          end: selectedDate
        };
      case 'list':
        return {
          start: new Date(),
          end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // Next 30 days
        };
      default:
        return {
          start: new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1),
          end: new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0)
        };
    }
  };

  const dateRange = getDateRange();

  // Fetch comprehensive tasks
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['comprehensive-tasks', selectedDate, viewMode, filter, assignedUserId],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate: dateRange.start.toISOString(),
        endDate: dateRange.end.toISOString(),
        filter,
        ...(assignedUserId !== 'all' && { assignedUserId })
      });

      const response = await fetch(`/api/tasks/comprehensive?${params}`);
      if (!response.ok) throw new Error('Failed to fetch tasks');
      return response.json();
    }
  });

  // Fetch users for filtering
  const { data: usersData } = useQuery({
    queryKey: ['users-list'],
    queryFn: async () => {
      const response = await fetch('/api/users/list');
      if (!response.ok) throw new Error('Failed to fetch users');
      return response.json();
    }
  });

  const tasks: ComprehensiveTask[] = data?.tasks || [];
  const stats = data?.stats || {};

  const handleTaskAction = (task: ComprehensiveTask) => {
    setSelectedTask(task);
    setIsDetailsDialogOpen(true);
  };

  const handleRedirectToDetails = () => {
    if (selectedTask?.actionUrl) {
      router.push(selectedTask.actionUrl);
    }
  };

  const getClientInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'URGENT':
        return <Badge className="bg-red-100 text-red-800 border-red-200 animate-pulse">Urgent!</Badge>;
      case 'HIGH':
        return <Badge className="bg-orange-100 text-orange-800 border-orange-200">Haute</Badge>;
      case 'MEDIUM':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Moyenne</Badge>;
      case 'LOW':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Basse</Badge>;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'OVERDUE':
        return <Badge className="bg-red-100 text-red-800 border-red-200">En retard</Badge>;
      case 'IN_PROGRESS':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">En cours</Badge>;
      case 'COMPLETED':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Terminé</Badge>;
      case 'TODO':
        return <Badge className="bg-gray-100 text-gray-800 border-gray-200">À faire</Badge>;
      default:
        return null;
    }
  };

  const renderTaskCard = (task: ComprehensiveTask, isCompact = false) => {
    const config = taskTypeConfig[task.type];
    const Icon = config.icon;

    if (isCompact) {
      return (
        <div
          key={task.id}
          className={cn(
            "p-1.5 rounded border text-xs cursor-pointer hover:shadow-sm transition-all",
            config.bgColor,
            config.borderColor,
            task.status === 'OVERDUE' && "ring-1 ring-red-300"
          )}
          onClick={() => handleTaskAction(task)}
        >
          <div className="flex items-center gap-1 mb-1">
            <Icon className={cn("h-3 w-3", config.color)} />
            <span className="font-medium truncate">{task.title}</span>
          </div>
          {task.client && (
            <div className="text-xs text-gray-600 truncate">
              {task.client.name}
            </div>
          )}
          {task.relatedData?.amount && (
            <div className="text-xs font-medium text-gray-800">
              {task.relatedData.amount.toFixed(2)} TND
            </div>
          )}
        </div>
      );
    }

    return (
      <Card 
        key={task.id}
        className={cn(
          "hover:shadow-md transition-all cursor-pointer group border-l-4",
          config.borderColor,
          task.status === 'OVERDUE' && "ring-1 ring-red-300"
        )}
        onClick={() => handleTaskAction(task)}
      >
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            {/* Icon */}
            <div className={cn("p-2 rounded-lg flex-shrink-0", config.bgColor)}>
              <Icon className={cn("h-4 w-4", config.color)} />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="font-semibold text-gray-900 truncate">{task.title}</h3>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {getPriorityBadge(task.priority)}
                  {getStatusBadge(task.status)}
                </div>
              </div>
              
              {task.description && (
                <p className="text-sm text-gray-600 mb-2">{task.description}</p>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                {/* Client */}
                {task.client && (
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="text-xs bg-gray-100">
                        {getClientInitials(task.client.name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-gray-700 truncate">
                      {task.client.name}
                    </span>
                    {task.client.type === 'company' && (
                      <Building2 className="h-3 w-3 text-gray-400" />
                    )}
                  </div>
                )}

                {/* Assigned to - More prominent */}
                {task.assignedTo ? (
                  <div className="flex items-center gap-2 bg-blue-50 px-2 py-1 rounded">
                    <Avatar className="h-5 w-5">
                      <AvatarFallback className="text-xs bg-blue-100">
                        {`${task.assignedTo.firstName[0]}${task.assignedTo.lastName[0]}`}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-blue-800">
                        {task.assignedTo.firstName} {task.assignedTo.lastName}
                      </span>
                      <span className="text-xs text-blue-600">
                        {task.assignedTo.role}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 bg-red-50 px-2 py-1 rounded">
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                    <span className="text-sm font-medium text-red-800">
                      Non assigné
                    </span>
                  </div>
                )}

                {/* Due date */}
                {task.dueDate && (
                  <div className="flex items-center gap-2">
                    <Clock className="h-3 w-3 text-gray-400" />
                    <span className="text-gray-600">
                      {format(new Date(task.dueDate), 'dd/MM/yyyy HH:mm', { locale: fr })}
                    </span>
                  </div>
                )}

                {/* Amount */}
                {task.relatedData?.amount && (
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-3 w-3 text-gray-400" />
                    <span className="font-medium text-gray-800">
                      {task.relatedData.amount.toFixed(2)} TND
                    </span>
                  </div>
                )}
              </div>

              {/* Device or additional info */}
              {task.relatedData?.deviceName && (
                <div className="mt-2">
                  <Badge variant="outline" className="text-xs">
                    {task.relatedData.deviceName}
                  </Badge>
                </div>
              )}
            </div>

            {/* Action */}
            <div className="flex-shrink-0">
              <Button
                variant="ghost"
                size="sm"
                className="opacity-0 group-hover:opacity-100 transition-opacity"
              >
                {task.actionLabel || 'Voir'}
                <ExternalLink className="h-3 w-3 ml-1" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderStats = () => {
    // Calculate assignment stats
    const assignedTasks = tasks.filter(t => t.assignedTo);
    const unassignedTasks = tasks.filter(t => !t.assignedTo);
    
    return (
      <div className="space-y-4 mb-6">
        {/* Assignment Overview */}
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-blue-900">Vue d&apos;ensemble des affectations</h3>
                <p className="text-sm text-blue-700 mt-1">
                  {assignedTasks.length} tâches assignées • {unassignedTasks.length} non assignées
                  {assignedUserId !== 'all' && ` • Filtrées pour: ${usersData?.users?.find((u: any) => u.id === assignedUserId)?.name}`}
                </p>
              </div>
              <Users className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        {/* Status and Priority Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
        {/* Status Stats */}
        <Card className="border-red-200">
          <CardContent className="p-3 text-center">
            <AlertTriangle className="h-6 w-6 text-red-500 mx-auto mb-1" />
            <p className="text-lg font-bold text-red-600">{stats.byStatus?.OVERDUE || 0}</p>
            <p className="text-xs text-red-600">En retard</p>
          </CardContent>
        </Card>

        <Card className="border-blue-200">
          <CardContent className="p-3 text-center">
            <Activity className="h-6 w-6 text-blue-500 mx-auto mb-1" />
            <p className="text-lg font-bold text-blue-600">{stats.byStatus?.IN_PROGRESS || 0}</p>
            <p className="text-xs text-blue-600">En cours</p>
          </CardContent>
        </Card>

        <Card className="border-gray-200">
          <CardContent className="p-3 text-center">
            <Clock className="h-6 w-6 text-gray-500 mx-auto mb-1" />
            <p className="text-lg font-bold text-gray-600">{stats.byStatus?.TODO || 0}</p>
            <p className="text-xs text-gray-600">À faire</p>
          </CardContent>
        </Card>

        <Card className="border-green-200">
          <CardContent className="p-3 text-center">
            <CheckCircle2 className="h-6 w-6 text-green-500 mx-auto mb-1" />
            <p className="text-lg font-bold text-green-600">{stats.byStatus?.COMPLETED || 0}</p>
            <p className="text-xs text-green-600">Terminé</p>
          </CardContent>
        </Card>

        {/* Type Stats */}
        <Card className="border-purple-200">
          <CardContent className="p-3 text-center">
            <Stethoscope className="h-6 w-6 text-purple-500 mx-auto mb-1" />
            <p className="text-lg font-bold text-purple-600">{stats.byType?.DIAGNOSTIC_PENDING || 0}</p>
            <p className="text-xs text-purple-600">Diagnostics</p>
          </CardContent>
        </Card>

        <Card className="border-orange-200">
          <CardContent className="p-3 text-center">
            <Building2 className="h-6 w-6 text-orange-500 mx-auto mb-1" />
            <p className="text-lg font-bold text-orange-600">{stats.byType?.RENTAL_EXPIRING || 0}</p>
            <p className="text-xs text-orange-600">Locations</p>
          </CardContent>
        </Card>

        <Card className="border-red-200">
          <CardContent className="p-3 text-center">
            <CreditCard className="h-6 w-6 text-red-500 mx-auto mb-1" />
            <p className="text-lg font-bold text-red-600">{stats.byType?.PAYMENT_DUE || 0}</p>
            <p className="text-xs text-red-600">Paiements</p>
          </CardContent>
        </Card>

        <Card className="border-green-200">
          <CardContent className="p-3 text-center">
            <Calendar className="h-6 w-6 text-green-500 mx-auto mb-1" />
            <p className="text-lg font-bold text-green-600">{stats.byType?.APPOINTMENT_REMINDER || 0}</p>
            <p className="text-xs text-green-600">RDV</p>
          </CardContent>
        </Card>
        </div>
      </div>
    );
  };

  const renderMonthView = () => {
    const monthStart = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
    const monthEnd = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    
    const calendarDays = eachDayOfInterval({
      start: calendarStart,
      end: calendarEnd
    });

    return (
      <div className="bg-white rounded-lg border overflow-hidden">
        <div className="grid grid-cols-7 gap-0">
          {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((day, index) => (
            <div key={index} className="bg-gray-50 p-3 text-center font-medium text-sm border-b">
              {day}
            </div>
          ))}
          
          {calendarDays.map((day, dayIndex) => {
            const dayTasks = tasks.filter(task => {
              const taskDate = new Date(task.dueDate || task.startDate);
              return taskDate.toDateString() === day.toDateString();
            });

            const isCurrentMonth = day.getMonth() === selectedDate.getMonth();
            const isToday = day.toDateString() === new Date().toDateString();

            return (
              <div
                key={dayIndex}
                className={cn(
                  "min-h-[120px] p-2 border-b border-r",
                  !isCurrentMonth && "bg-gray-50 text-gray-400",
                  isToday && isCurrentMonth && "bg-blue-50"
                )}
              >
                <div className={cn(
                  "text-sm font-medium mb-2",
                  isToday && isCurrentMonth && "text-blue-600"
                )}>
                  {format(day, 'd')}
                </div>
                
                <div className="space-y-1">
                  {dayTasks.slice(0, 3).map(task => renderTaskCard(task, true))}
                  {dayTasks.length > 3 && (
                    <div className="text-xs text-gray-500 p-1">
                      +{dayTasks.length - 3} autres
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderListView = () => {
    const groupedTasks = tasks.reduce((acc, task) => {
      if (!acc[task.type]) {
        acc[task.type] = [];
      }
      acc[task.type].push(task);
      return acc;
    }, {} as Record<string, ComprehensiveTask[]>);

    return (
      <div className="space-y-6">
        {Object.entries(groupedTasks).map(([type, typeTasks]) => {
          const config = taskTypeConfig[type as keyof typeof taskTypeConfig];
          return (
            <div key={type}>
              <div className="flex items-center gap-2 mb-4">
                <config.icon className={cn("h-5 w-5", config.color)} />
                <h2 className="text-lg font-semibold">{config.label}</h2>
                <Badge variant="outline">{typeTasks.length}</Badge>
              </div>
              <div className="space-y-3">
                {typeTasks.map(task => renderTaskCard(task))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center space-y-4">
          <Calendar className="h-12 w-12 animate-spin text-blue-600" />
          <span className="text-slate-600 font-medium">Chargement du calendrier...</span>
        </div>
      </div>
    );
  }

  // Task Details Dialog Component
  const TaskDetailsDialog = () => {
    if (!selectedTask) return null;

    const config = taskTypeConfig[selectedTask.type] || taskTypeConfig.TASK;
    const Icon = config.icon;

    return (
      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className={cn("p-2 rounded-lg", config.bgColor)}>
                <Icon className={cn("h-5 w-5", config.color)} />
              </div>
              <div className="flex-1">
                <DialogTitle className="text-xl">{selectedTask.title}</DialogTitle>
                <DialogDescription className="mt-1">
                  {config.label} • {format(new Date(selectedTask.createdAt), 'dd MMMM yyyy à HH:mm', { locale: fr })}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Status and Priority */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-500">Statut:</span>
                {getStatusBadge(selectedTask.status)}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-500">Priorité:</span>
                {getPriorityBadge(selectedTask.priority)}
              </div>
            </div>

            <Separator />

            {/* Description */}
            {selectedTask.description && (
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-2">Description</h4>
                <p className="text-gray-700">{selectedTask.description}</p>
              </div>
            )}

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-2">Date de début</h4>
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-700">
                    {format(new Date(selectedTask.startDate), 'dd/MM/yyyy HH:mm', { locale: fr })}
                  </span>
                </div>
              </div>
              {selectedTask.endDate && (
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Date de fin</h4>
                  <div className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-700">
                      {format(new Date(selectedTask.endDate), 'dd/MM/yyyy HH:mm', { locale: fr })}
                    </span>
                  </div>
                </div>
              )}
              {selectedTask.dueDate && (
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Date d&apos;échéance</h4>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-orange-500" />
                    <span className="text-gray-700 font-medium">
                      {format(new Date(selectedTask.dueDate), 'dd/MM/yyyy HH:mm', { locale: fr })}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <Separator />

            {/* Assignment */}
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-2">Assignation</h4>
              {selectedTask.assignedTo ? (
                <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-blue-100">
                      {`${selectedTask.assignedTo.firstName[0]}${selectedTask.assignedTo.lastName[0]}`}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-gray-900">
                      {selectedTask.assignedTo.firstName} {selectedTask.assignedTo.lastName}
                    </p>
                    <p className="text-sm text-gray-600">
                      {selectedTask.assignedTo.email} • {selectedTask.assignedTo.role}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 p-3 bg-red-50 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                  <span className="font-medium text-red-800">Non assigné</span>
                </div>
              )}
            </div>

            {/* Client Information */}
            {selectedTask.client && (
              <>
                <Separator />
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Client</h4>
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-gray-200">
                        {getClientInitials(selectedTask.client.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">
                        {selectedTask.client.name}
                        {selectedTask.client.type === 'company' && (
                          <Building2 className="h-4 w-4 text-gray-400 inline-block ml-2" />
                        )}
                      </p>
                      {selectedTask.client.telephone && (
                        <div className="flex items-center gap-2 mt-1">
                          <Phone className="h-3 w-3 text-gray-400" />
                          <span className="text-sm text-gray-600">{selectedTask.client.telephone}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Related Data */}
            {selectedTask.relatedData && (
              <>
                <Separator />
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Informations supplémentaires</h4>
                  <div className="grid grid-cols-2 gap-4">
                    {selectedTask.relatedData.deviceName && (
                      <div className="flex items-center gap-2">
                        <Stethoscope className="h-4 w-4 text-gray-400" />
                        <div>
                          <p className="text-xs text-gray-500">Équipement</p>
                          <p className="text-sm font-medium">{selectedTask.relatedData.deviceName}</p>
                        </div>
                      </div>
                    )}
                    {selectedTask.relatedData.amount && (
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4 text-gray-400" />
                        <div>
                          <p className="text-xs text-gray-500">Montant</p>
                          <p className="text-sm font-medium">{selectedTask.relatedData.amount.toFixed(2)} TND</p>
                        </div>
                      </div>
                    )}
                    {selectedTask.relatedData.bonNumber && (
                      <div className="flex items-center gap-2">
                        <Hash className="h-4 w-4 text-gray-400" />
                        <div>
                          <p className="text-xs text-gray-500">N° Bon</p>
                          <p className="text-sm font-medium">{selectedTask.relatedData.bonNumber}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* IDs for reference */}
            {(selectedTask.relatedData?.diagnosticId || selectedTask.relatedData?.rentalId || 
              selectedTask.relatedData?.appointmentId || selectedTask.relatedData?.paymentId) && (
              <>
                <Separator />
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Références</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedTask.relatedData.diagnosticId && (
                      <Badge variant="outline" className="text-xs">
                        Diagnostic: {selectedTask.relatedData.diagnosticId.slice(-8)}
                      </Badge>
                    )}
                    {selectedTask.relatedData.rentalId && (
                      <Badge variant="outline" className="text-xs">
                        Location: {selectedTask.relatedData.rentalId.slice(-8)}
                      </Badge>
                    )}
                    {selectedTask.relatedData.appointmentId && (
                      <Badge variant="outline" className="text-xs">
                        RDV: {selectedTask.relatedData.appointmentId.slice(-8)}
                      </Badge>
                    )}
                    {selectedTask.relatedData.paymentId && (
                      <Badge variant="outline" className="text-xs">
                        Paiement: {selectedTask.relatedData.paymentId.slice(-8)}
                      </Badge>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Completion Info */}
            {selectedTask.completedAt && (
              <>
                <Separator />
                <div className="p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center gap-2 text-green-700">
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="text-sm font-medium">
                      Terminé le {format(new Date(selectedTask.completedAt), 'dd MMMM yyyy à HH:mm', { locale: fr })}
                    </span>
                    {selectedTask.completedBy && (
                      <span className="text-sm">par {selectedTask.completedBy}</span>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailsDialogOpen(false)}>
              Fermer
            </Button>
            {selectedTask.actionUrl && (
              <Button onClick={handleRedirectToDetails} className="gap-2">
                <Eye className="h-4 w-4" />
                Voir les détails complets
                <ArrowRight className="h-4 w-4" />
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

  return (
    <div className="container mx-auto py-6 px-4 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Centre de Gestion des Tâches</h1>
          <p className="text-gray-600 mt-1">
            Vue complète de toutes vos tâches, diagnostics, locations et rappels
          </p>
        </div>
        
        <div className="flex items-center gap-3 flex-wrap">
          {/* Type Filter */}
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous types</SelectItem>
              <SelectItem value="tasks">Tâches</SelectItem>
              <SelectItem value="diagnostics">Diagnostics</SelectItem>
              <SelectItem value="rentals">Locations</SelectItem>
              <SelectItem value="payments">Paiements</SelectItem>
              <SelectItem value="appointments">RDV</SelectItem>
              <SelectItem value="cnam">CNAM</SelectItem>
            </SelectContent>
          </Select>

          {/* User Filter */}
          <Select value={assignedUserId} onValueChange={setAssignedUserId}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Assigné à" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les utilisateurs</SelectItem>
              {usersData?.users?.map((user: any) => (
                <SelectItem key={user.id} value={user.id}>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-5 w-5">
                      <AvatarFallback className="text-xs bg-gray-100">
                        {user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span>{user.name}</span>
                    <Badge variant="outline" className="text-xs ml-1">
                      {user.role}
                    </Badge>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Navigation */}
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (viewMode === 'month') {
                  setSelectedDate(subMonths(selectedDate, 1));
                } else if (viewMode === 'week') {
                  setSelectedDate(subWeeks(selectedDate, 1));
                } else if (viewMode === 'day') {
                  setSelectedDate(addDays(selectedDate, -1));
                }
              }}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedDate(new Date())}
            >
              Aujourd&apos;hui
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (viewMode === 'month') {
                  setSelectedDate(addMonths(selectedDate, 1));
                } else if (viewMode === 'week') {
                  setSelectedDate(addWeeks(selectedDate, 1));
                } else if (viewMode === 'day') {
                  setSelectedDate(addDays(selectedDate, 1));
                }
              }}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* View Mode */}
          <Select value={viewMode} onValueChange={(value: ViewMode) => setViewMode(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="month">Mois</SelectItem>
              <SelectItem value="week">Semaine</SelectItem>
              <SelectItem value="day">Jour</SelectItem>
              <SelectItem value="list">Liste</SelectItem>
            </SelectContent>
          </Select>

          <Button onClick={() => refetch()} variant="outline">
            <Activity className="h-4 w-4 mr-2" />
            Actualiser
          </Button>
        </div>
      </div>

      {/* Stats */}
      {renderStats()}

      {/* Current Date Info */}
      <div className="mb-6">
        <div className="bg-white p-4 rounded-lg border">
          <h2 className="text-lg font-semibold text-gray-900">
            {viewMode === 'month' && format(selectedDate, 'MMMM yyyy', { locale: fr })}
            {viewMode === 'week' && `Semaine du ${format(startOfWeek(selectedDate, { weekStartsOn: 1 }), 'dd MMMM yyyy', { locale: fr })}`}
            {viewMode === 'day' && format(selectedDate, 'EEEE dd MMMM yyyy', { locale: fr })}
            {viewMode === 'list' && 'Vue d\'ensemble des tâches'}
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            {tasks.length} tâche{tasks.length !== 1 ? 's' : ''} 
            {filter !== 'all' && ` • Type: ${filter}`}
            {assignedUserId !== 'all' && ` • Assigné à: ${usersData?.users?.find((u: any) => u.id === assignedUserId)?.name || assignedUserId}`}
            {' • '}
            {stats.byStatus?.OVERDUE || 0} en retard • 
            {stats.byStatus?.IN_PROGRESS || 0} en cours
          </p>
        </div>
      </div>

      {/* Content */}
      {viewMode === 'month' && renderMonthView()}
      {viewMode === 'list' && renderListView()}
      
      {tasks.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Activity className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Aucune tâche trouvée</p>
            <p className="text-sm text-gray-400 mt-1">
              Modifiez les filtres ou la période pour voir plus de tâches
            </p>
          </CardContent>
        </Card>
      )}

      {/* Task Details Dialog */}
      <TaskDetailsDialog />
    </div>
  );
}

// Add layout wrapper
ModernTasksPage.getLayout = function getLayout(page: React.ReactElement) {
  return <AdminLayout>{page}</AdminLayout>;
};