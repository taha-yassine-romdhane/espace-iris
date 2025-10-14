import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useQuery } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { 
  Calendar, Clock, CreditCard, Stethoscope, Building2,
  AlertTriangle, CheckCircle2, User, Users, Filter,
  ChevronLeft, ChevronRight, Plus, BarChart3, Activity,
  FileText, Bell, MapPin, Phone, Eye, ExternalLink,
  Mail, Hash, CalendarDays, ArrowRight
} from 'lucide-react';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, addDays, addWeeks, subWeeks, addMonths, subMonths } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import EmployeeLayout from '../EmployeeLayout';
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
  taskCode?: string;
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
    bondNumber?: string;
  };
  
  actionUrl?: string;
  actionLabel?: string;
  canComplete?: boolean;
  
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  completedBy?: string;
}

// Green theme configuration for employee interface
const taskTypeConfig = {
  TASK: {
    icon: Activity,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
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
    label: 'Rendez-vous'
  },
  CNAM_RENEWAL: {
    icon: FileText,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50',
    borderColor: 'border-indigo-200',
    label: 'CNAM'
  },
  MAINTENANCE_DUE: {
    icon: Bell,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    label: 'Maintenance'
  }
};

type ViewMode = 'month' | 'week' | 'day' | 'list';

export default function EmployeeModernTasksPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { data: session } = useSession();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [filter, setFilter] = useState('all');
  const [selectedTask, setSelectedTask] = useState<ComprehensiveTask | null>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [selectedDayTasks, setSelectedDayTasks] = useState<ComprehensiveTask[]>([]);
  const [isDayDialogOpen, setIsDayDialogOpen] = useState(false);
  const [selectedDayDate, setSelectedDayDate] = useState<Date | null>(null);

  // Calculate date range based on view mode
  const getDateRange = () => {
    switch (viewMode) {
      case 'week':
        return {
          start: startOfWeek(selectedDate, { weekStartsOn: 1 }),
          end: endOfWeek(selectedDate, { weekStartsOn: 1 })
        };
      case 'day':
        // Set start to beginning of day and end to end of day
        const dayStart = new Date(selectedDate);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(selectedDate);
        dayEnd.setHours(23, 59, 59, 999);
        return {
          start: dayStart,
          end: dayEnd
        };
      default:
        return {
          start: new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1),
          end: new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0)
        };
    }
  };

  const dateRange = getDateRange();

  // Fetch comprehensive tasks data - ONLY for logged-in employee
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['employee-comprehensive-tasks', dateRange, filter, session?.user?.id],
    queryFn: async () => {
      if (!session?.user?.id) {
        throw new Error('User not authenticated');
      }
      
      const params = new URLSearchParams({
        startDate: dateRange.start.toISOString(),
        endDate: dateRange.end.toISOString(),
        type: filter !== 'all' ? filter : '',
        assignedToMe: 'true' // Only fetch tasks assigned to current user
      });

      const response = await fetch(`/api/tasks/comprehensive?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch tasks');
      }
      return response.json();
    },
    enabled: !!session?.user?.id
  });

  const tasks: ComprehensiveTask[] = data?.tasks || [];
  const stats = data?.stats || {};

  const handleTaskAction = (task: ComprehensiveTask) => {
    setSelectedTask(task);
    setIsDetailsDialogOpen(true);
  };

  const handleDayClick = (day: Date, dayTasks: ComprehensiveTask[]) => {
    if (dayTasks.length > 0) {
      setSelectedDayDate(day);
      setSelectedDayTasks(dayTasks);
      setIsDayDialogOpen(true);
    }
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
    const configs = {
      URGENT: { variant: 'destructive' as const, label: 'Urgent' },
      HIGH: { variant: 'destructive' as const, label: 'Haute' },
      MEDIUM: { variant: 'default' as const, label: 'Moyenne' },
      LOW: { variant: 'outline' as const, label: 'Basse' }
    };
    const config = configs[priority as keyof typeof configs] || configs.MEDIUM;
    return <Badge variant={config.variant} className="text-xs">{config.label}</Badge>;
  };

  const getStatusBadge = (status: string) => {
    const configs = {
      OVERDUE: { className: 'bg-red-100 text-red-800 border-red-200', label: 'En retard' },
      IN_PROGRESS: { className: 'bg-green-100 text-green-800 border-green-200', label: 'En cours' },
      TODO: { className: 'bg-gray-100 text-gray-800 border-gray-200', label: 'À faire' },
      COMPLETED: { className: 'bg-green-100 text-green-800 border-green-200', label: 'Terminé' }
    };
    const config = configs[status as keyof typeof configs] || configs.TODO;
    return (
      <Badge variant="outline" className={cn("text-xs", config.className)}>
        {config.label}
      </Badge>
    );
  };

  const renderTaskCard = (task: ComprehensiveTask, isCompact = false) => {
    const config = taskTypeConfig[task.type] || taskTypeConfig.TASK;
    const Icon = config.icon;

    if (isCompact) {
      return (
        <div
          key={task.id}
          className={cn(
            "p-1.5 rounded-md border cursor-pointer hover:shadow-sm transition-all",
            config.bgColor,
            config.borderColor,
            task.status === 'OVERDUE' && "ring-1 ring-red-300"
          )}
          onClick={() => handleTaskAction(task)}
        >
          <div className="flex items-center gap-1 mb-0.5">
            <Icon className={cn("h-2.5 w-2.5", config.color)} />
            <span className="text-xs font-medium truncate">{task.title}</span>
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
          "group hover:shadow-md transition-all cursor-pointer",
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
                <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                  {task.description}
                </p>
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
    return (
      <div className="space-y-4 mb-6">
        {/* Overview for Employee */}
        <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-green-900">Mes Tâches</h3>
                <p className="text-sm text-green-700 mt-1">
                  {tasks.length} tâche{tasks.length !== 1 ? 's' : ''} assignée{tasks.length !== 1 ? 's' : ''}
                  {filter !== 'all' && ` • Type: ${filter}`}
                </p>
              </div>
              <Activity className="h-8 w-8 text-green-600" />
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

          <Card className="border-green-200">
            <CardContent className="p-3 text-center">
              <Activity className="h-6 w-6 text-green-500 mx-auto mb-1" />
              <p className="text-lg font-bold text-green-600">{stats.byStatus?.IN_PROGRESS || 0}</p>
              <p className="text-xs text-green-600">En cours</p>
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

          {/* Priority stats */}
          <Card className="border-red-200">
            <CardContent className="p-3 text-center">
              <Bell className="h-6 w-6 text-red-500 mx-auto mb-1" />
              <p className="text-lg font-bold text-red-600">{stats.byPriority?.URGENT || 0}</p>
              <p className="text-xs text-red-600">Urgent</p>
            </CardContent>
          </Card>

          <Card className="border-orange-200">
            <CardContent className="p-3 text-center">
              <AlertTriangle className="h-6 w-6 text-orange-500 mx-auto mb-1" />
              <p className="text-lg font-bold text-orange-600">{stats.byPriority?.HIGH || 0}</p>
              <p className="text-xs text-orange-600">Haute</p>
            </CardContent>
          </Card>

          <Card className="border-yellow-200">
            <CardContent className="p-3 text-center">
              <Bell className="h-6 w-6 text-yellow-500 mx-auto mb-1" />
              <p className="text-lg font-bold text-yellow-600">{stats.byPriority?.MEDIUM || 0}</p>
              <p className="text-xs text-yellow-600">Moyenne</p>
            </CardContent>
          </Card>

          <Card className="border-gray-200">
            <CardContent className="p-3 text-center">
              <Clock className="h-6 w-6 text-gray-500 mx-auto mb-1" />
              <p className="text-lg font-bold text-gray-600">{stats.byPriority?.LOW || 0}</p>
              <p className="text-xs text-gray-600">Basse</p>
            </CardContent>
          </Card>
        </div>

        {/* Type Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
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
          
          <Card className="border-indigo-200">
            <CardContent className="p-3 text-center">
              <FileText className="h-6 w-6 text-indigo-500 mx-auto mb-1" />
              <p className="text-lg font-bold text-indigo-600">{stats.byType?.CNAM_RENEWAL || 0}</p>
              <p className="text-xs text-indigo-600">CNAM</p>
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
            <div key={index} className="bg-green-50 p-3 text-center font-medium text-sm border-b text-green-800">
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
                  "min-h-[120px] p-2 border-b border-r cursor-pointer hover:bg-gray-50 transition-colors",
                  !isCurrentMonth && "bg-gray-50 text-gray-400 hover:bg-gray-100",
                  isToday && isCurrentMonth && "bg-green-50 hover:bg-green-100",
                  dayTasks.length > 0 && "hover:shadow-inner"
                )}
                onClick={() => handleDayClick(day, dayTasks)}
              >
                <div className={cn(
                  "text-sm font-medium mb-2",
                  isToday && isCurrentMonth && "text-green-600"
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

  const renderWeekView = () => {
    const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
    const weekDays = eachDayOfInterval({
      start: weekStart,
      end: addDays(weekStart, 6)
    });

    // Group tasks by day
    const tasksByDay = weekDays.map(day => ({
      day,
      tasks: tasks.filter(task => {
        const taskDate = new Date(task.dueDate || task.startDate);
        return taskDate.toDateString() === day.toDateString();
      })
    }));

    return (
      <div className="bg-white rounded-lg border overflow-hidden">
        {/* Week header */}
        <div className="grid grid-cols-7 gap-0">
          {weekDays.map((day, index) => {
            const isToday = day.toDateString() === new Date().toDateString();
            const dayTasks = tasksByDay[index].tasks;
            
            return (
              <div
                key={index}
                className={cn(
                  "border-b border-r p-3 cursor-pointer hover:bg-gray-50 transition-colors",
                  isToday && "bg-green-50 hover:bg-green-100"
                )}
                onClick={() => handleDayClick(day, dayTasks)}
              >
                <div className="text-center">
                  <div className="text-xs text-gray-500">
                    {format(day, 'EEE', { locale: fr })}
                  </div>
                  <div className={cn(
                    "text-lg font-semibold mt-1",
                    isToday && "text-green-600"
                  )}>
                    {format(day, 'd')}
                  </div>
                  {dayTasks.length > 0 && (
                    <Badge variant="outline" className="mt-1 text-xs">
                      {dayTasks.length}
                    </Badge>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Week content */}
        <div className="grid grid-cols-7 gap-0">
          {tasksByDay.map(({ day, tasks: dayTasks }, index) => {
            const isToday = day.toDateString() === new Date().toDateString();
            
            return (
              <div
                key={index}
                className={cn(
                  "min-h-[400px] p-2 border-r cursor-pointer hover:bg-gray-50 transition-colors",
                  isToday && "bg-green-50 hover:bg-green-100"
                )}
                onClick={() => handleDayClick(day, dayTasks)}
              >
                <div className="space-y-1">
                  {dayTasks.slice(0, 5).map(task => renderTaskCard(task, true))}
                  {dayTasks.length > 5 && (
                    <div className="text-xs text-gray-500 p-1 text-center">
                      +{dayTasks.length - 5} autres
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

  const renderDayView = () => {
    // Filter tasks for the selected day
    const dayStart = new Date(selectedDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(selectedDate);
    dayEnd.setHours(23, 59, 59, 999);

    const dayTasks = tasks.filter(task => {
      const taskDate = new Date(task.dueDate || task.startDate);
      return taskDate >= dayStart && taskDate <= dayEnd;
    });

    const isToday = selectedDate.toDateString() === new Date().toDateString();

    // Group tasks by hour
    const tasksByHour: Record<number, ComprehensiveTask[]> = {};
    dayTasks.forEach(task => {
      const hour = new Date(task.dueDate || task.startDate).getHours();
      if (!tasksByHour[hour]) {
        tasksByHour[hour] = [];
      }
      tasksByHour[hour].push(task);
    });

    return (
      <div className="bg-white rounded-lg border overflow-hidden">
        <div className={cn(
          "p-4 border-b",
          isToday && "bg-green-50"
        )}>
          <h2 className="text-xl font-semibold">
            {format(selectedDate, 'EEEE dd MMMM yyyy', { locale: fr })}
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            {dayTasks.length} tâche{dayTasks.length !== 1 ? 's' : ''} prévue{dayTasks.length !== 1 ? 's' : ''}
            {tasks.length > 0 && dayTasks.length === 0 && (
              <span className="ml-2 text-xs text-gray-400">
                ({tasks.length} tâche{tasks.length !== 1 ? 's' : ''} au total dans la période)
              </span>
            )}
          </p>
        </div>

        {dayTasks.length > 0 ? (
          <div className="p-4">
            {/* Simple list view for all tasks */}
            <div className="space-y-3">
              {dayTasks
                .sort((a, b) => {
                  const dateA = new Date(a.dueDate || a.startDate).getTime();
                  const dateB = new Date(b.dueDate || b.startDate).getTime();
                  return dateA - dateB;
                })
                .map(task => {
                  const taskTime = new Date(task.dueDate || task.startDate);
                  return (
                    <div key={task.id} className="flex gap-3">
                      <div className="w-16 text-sm text-gray-500 font-medium pt-4">
                        {format(taskTime, 'HH:mm')}
                      </div>
                      <div className="flex-1">
                        {renderTaskCard(task)}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        ) : (
          <div className="p-12 text-center">
            <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Aucune tâche prévue pour ce jour</p>
          </div>
        )}
      </div>
    );
  };

  const renderListView = () => {
    // Group tasks by type
    const groupedTasks = tasks.reduce((acc, task) => {
      const type = task.type;
      if (!acc[type]) {
        acc[type] = [];
      }
      acc[type].push(task);
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
                <Badge variant="outline" className="ml-auto">
                  {typeTasks.length}
                </Badge>
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
      <div className="container mx-auto py-6 px-4 max-w-7xl">
        <div className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
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
                <DialogTitle className="text-xl text-green-800">{selectedTask.title}</DialogTitle>
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
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Date d'échéance</h4>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-orange-500" />
                    <span className="text-gray-700 font-medium">
                      {format(new Date(selectedTask.dueDate), 'dd/MM/yyyy HH:mm', { locale: fr })}
                    </span>
                  </div>
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
                    {selectedTask.relatedData.bondNumber && (
                      <div className="flex items-center gap-2">
                        <Hash className="h-4 w-4 text-gray-400" />
                        <div>
                          <p className="text-xs text-gray-500">N° Bon</p>
                          <p className="text-sm font-medium">{selectedTask.relatedData.bondNumber}</p>
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
              <Button onClick={handleRedirectToDetails} className="gap-2 bg-green-600 hover:bg-green-700">
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
          <h1 className="text-3xl font-bold text-green-800">Calendrier</h1>
          <p className="text-gray-600 mt-1">
            Gérez vos tâches et événements assignés
          </p>
        </div>

        {/* View Controls */}
        <div className="flex flex-wrap items-center gap-4">
          {/* Date Navigation */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                if (viewMode === 'month') {
                  setSelectedDate(subMonths(selectedDate, 1));
                } else if (viewMode === 'week') {
                  setSelectedDate(subWeeks(selectedDate, 1));
                } else {
                  setSelectedDate(addDays(selectedDate, -1));
                }
              }}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              onClick={() => setSelectedDate(new Date())}
              className="px-4"
            >
              Aujourd'hui
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                if (viewMode === 'month') {
                  setSelectedDate(addMonths(selectedDate, 1));
                } else if (viewMode === 'week') {
                  setSelectedDate(addWeeks(selectedDate, 1));
                } else {
                  setSelectedDate(addDays(selectedDate, 1));
                }
              }}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* View Mode Selector */}
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

          {/* Filter by Type */}
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Filtrer par type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les types</SelectItem>
              <SelectItem value="TASK">Tâches</SelectItem>
              <SelectItem value="DIAGNOSTIC_PENDING">Diagnostics</SelectItem>
              <SelectItem value="RENTAL_EXPIRING">Locations</SelectItem>
              <SelectItem value="PAYMENT_DUE">Paiements</SelectItem>
              <SelectItem value="APPOINTMENT_REMINDER">Rendez-vous</SelectItem>
              <SelectItem value="CNAM_RENEWAL">CNAM</SelectItem>
              <SelectItem value="MAINTENANCE_DUE">Maintenance</SelectItem>
            </SelectContent>
          </Select>

          <Button onClick={() => refetch()} variant="outline" className="border-green-600 text-green-600 hover:bg-green-50">
            <Activity className="h-4 w-4 mr-2" />
            Actualiser
          </Button>
        </div>
      </div>

      {/* Stats */}
      {renderStats()}

      {/* Current Date Info */}
      <div className="mb-6">
        <div className="bg-white p-4 rounded-lg border border-green-200">
          <h2 className="text-lg font-semibold text-green-800">
            {viewMode === 'month' && format(selectedDate, 'MMMM yyyy', { locale: fr })}
            {viewMode === 'week' && `Semaine du ${format(startOfWeek(selectedDate, { weekStartsOn: 1 }), 'dd MMMM yyyy', { locale: fr })}`}
            {viewMode === 'day' && format(selectedDate, 'EEEE dd MMMM yyyy', { locale: fr })}
            {viewMode === 'list' && 'Vue d\'ensemble des tâches'}
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            {tasks.length} tâche{tasks.length !== 1 ? 's' : ''} 
            {filter !== 'all' && ` • Type: ${filter}`}
            {' • '}
            {stats.byStatus?.OVERDUE || 0} en retard • 
            {stats.byStatus?.IN_PROGRESS || 0} en cours
          </p>
        </div>
      </div>

      {/* Content */}
      {viewMode === 'month' && renderMonthView()}
      {viewMode === 'week' && renderWeekView()}
      {viewMode === 'day' && renderDayView()}
      {viewMode === 'list' && renderListView()}
      
      {tasks.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Activity className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Aucune tâche trouvée</p>
            <p className="text-sm text-gray-400 mt-1">
              Vous n'avez pas de tâches assignées pour cette période
            </p>
          </CardContent>
        </Card>
      )}

      {/* Task Details Dialog */}
      <TaskDetailsDialog />

      {/* Day Tasks Dialog */}
      <Dialog open={isDayDialogOpen} onOpenChange={setIsDayDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl text-green-800">
              {selectedDayDate && format(selectedDayDate, 'EEEE dd MMMM yyyy', { locale: fr })}
            </DialogTitle>
            <DialogDescription>
              {selectedDayTasks.length} tâche{selectedDayTasks.length !== 1 ? 's' : ''} pour cette journée
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-4">
            {selectedDayTasks.length > 0 ? (
              selectedDayTasks.map(task => (
                <div key={task.id} onClick={() => {
                  setIsDayDialogOpen(false);
                  handleTaskAction(task);
                }}>
                  {renderTaskCard(task)}
                </div>
              ))
            ) : (
              <div className="py-8 text-center">
                <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">Aucune tâche pour cette journée</p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDayDialogOpen(false)}>
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Add layout wrapper
EmployeeModernTasksPage.getLayout = function getLayout(page: React.ReactElement) {
  return <EmployeeLayout>{page}</EmployeeLayout>;
};