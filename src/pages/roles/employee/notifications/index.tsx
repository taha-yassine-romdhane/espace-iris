import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import EmployeeLayout from '../EmployeeLayout';
import { 
  Bell, Calendar, Clock, CreditCard, Stethoscope, 
  AlertCircle, CheckCircle2, ChevronRight, Filter,
  Users, Building2, TrendingUp, AlertTriangle,
  FileText, Activity, User, Package
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/components/ui/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface EmployeeNotification {
  id: string;
  type: 'FOLLOW_UP' | 'MAINTENANCE' | 'APPOINTMENT' | 'PAYMENT_DUE' | 'OTHER' | 'TRANSFER';
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  title: string;
  message: string;
  clientName?: string;
  clientType?: 'patient' | 'company';
  clientId?: string;
  actionUrl?: string;
  actionLabel?: string;
  dueDate?: string;
  metadata?: any;
  isRead: boolean;
  createdAt: string;
  relatedId?: string;
}

const notificationConfig = {
  FOLLOW_UP: {
    icon: Users,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    label: 'Suivi'
  },
  MAINTENANCE: {
    icon: Activity,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    label: 'Maintenance'
  },
  APPOINTMENT: {
    icon: Calendar,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    label: 'Rendez-vous'
  },
  PAYMENT_DUE: {
    icon: CreditCard,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    label: 'Paiement'
  },
  TRANSFER: {
    icon: Package,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    label: 'Transfert'
  },
  OTHER: {
    icon: Bell,
    color: 'text-gray-600',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200',
    label: 'Autre'
  }
};

export default function EmployeeNotificationsPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<EmployeeNotification[]>([]);
  const [groupedNotifications, setGroupedNotifications] = useState<Record<string, EmployeeNotification[]>>({});
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [timeRange, setTimeRange] = useState('30');
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    if (session?.user?.id) {
      fetchNotifications();
    }
  }, [timeRange, filter, session?.user?.id]);

  const fetchNotifications = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/notifications/employee?filter=${filter}&timeRange=${timeRange}`);
      if (!response.ok) throw new Error('Failed to fetch notifications');
      
      const data = await response.json();
      setNotifications(data.notifications);
      setGroupedNotifications(data.grouped);
      setStats(data.stats);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les notifications',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAction = (notification: EmployeeNotification) => {
    // Mark as read if not already
    if (!notification.isRead) {
      markAsRead(notification.id);
    }

    if (notification.actionUrl && notification.actionUrl !== '#') {
      router.push(notification.actionUrl);
    } else {
      toast({
        title: 'Action non disponible',
        description: 'Aucune page de détails disponible pour cette notification',
        variant: 'destructive',
      });
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      // Update locally first for immediate feedback
      setNotifications(prev => 
        prev.map(n => 
          n.id === notificationId ? { ...n, isRead: true } : n
        )
      );

      // Update stats locally
      setStats((prev: any) => prev ? {
        ...prev,
        unread: Math.max(0, prev.unread - 1)
      } : null);
      
      // Make API call to mark as read
      const response = await fetch('/api/notifications/mark-as-read', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ notificationId }),
      });

      if (!response.ok) {
        throw new Error('Failed to mark notification as read');
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
      // Revert local changes on error
      setNotifications(prev => 
        prev.map(n => 
          n.id === notificationId ? { ...n, isRead: false } : n
        )
      );
      toast({
        title: 'Erreur',
        description: 'Impossible de marquer la notification comme lue',
        variant: 'destructive',
      });
    }
  };

  const markAllAsRead = async () => {
    try {
      const unreadCount = stats?.unread || 0;
      
      // Update locally first for immediate feedback
      setNotifications(prev => 
        prev.map(n => ({ ...n, isRead: true }))
      );

      // Update stats locally
      setStats((prev: any) => prev ? {
        ...prev,
        unread: 0
      } : null);
      
      // Make API call to mark all as read
      const response = await fetch('/api/notifications/mark-all-read', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to mark all notifications as read');
      }

      toast({
        title: 'Notifications marquées comme lues',
        description: `${unreadCount} notification${unreadCount !== 1 ? 's' : ''} marquée${unreadCount !== 1 ? 's' : ''} comme lue${unreadCount !== 1 ? 's' : ''}`,
      });
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      // Refresh data on error
      fetchNotifications();
      toast({
        title: 'Erreur',
        description: 'Impossible de marquer toutes les notifications comme lues',
        variant: 'destructive',
      });
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'HIGH':
        return <Badge className="bg-red-100 text-red-800 border-red-200">Urgent</Badge>;
      case 'MEDIUM':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Moyen</Badge>;
      case 'LOW':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Faible</Badge>;
      default:
        return null;
    }
  };

  const getRelativeTime = (date: string) => {
    const now = new Date();
    const notificationDate = new Date(date);
    const diffTime = Math.abs(now.getTime() - notificationDate.getTime());
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffHours < 1) return "À l'instant";
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    if (diffDays === 1) return "Hier";
    if (diffDays < 7) return `Il y a ${diffDays} jours`;
    return `Il y a ${Math.floor(diffDays / 7)} semaines`;
  };

  const getClientInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const renderNotificationCard = (notification: EmployeeNotification) => {
    const config = notificationConfig[notification.type];
    const Icon = config.icon;

    return (
      <Card
        key={notification.id}
        className={cn(
          "hover:shadow-md transition-all group border-l-4",
          config.borderColor,
          !notification.isRead && "bg-blue-50/30",
          notification.actionUrl && notification.actionUrl !== '#' ? "cursor-pointer" : "cursor-default opacity-90"
        )}
        onClick={() => handleAction(notification)}
      >
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            {/* Icon */}
            <div className={cn(
              "p-3 rounded-lg flex-shrink-0 relative",
              config.bgColor
            )}>
              <Icon className={cn("h-5 w-5", config.color)} />
              {!notification.isRead && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></div>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 mb-1">
                <h3 className={cn(
                  "text-gray-900 truncate",
                  !notification.isRead ? "font-semibold" : "font-medium"
                )}>
                  {notification.title}
                </h3>
                <div className="flex items-center gap-2">
                  {getPriorityBadge(notification.priority)}
                  <span className="text-xs text-gray-500">
                    {getRelativeTime(notification.createdAt)}
                  </span>
                </div>
              </div>
              
              <p className="text-sm text-gray-600 mb-2">
                {notification.message}
              </p>

              <div className="flex items-center gap-4 text-sm">
                {/* Client */}
                {notification.clientName && (
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="text-xs bg-gray-100">
                        {getClientInitials(notification.clientName)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-gray-700 truncate max-w-[150px]">
                      {notification.clientName}
                    </span>
                    {notification.clientType === 'company' && (
                      <Building2 className="h-3 w-3 text-gray-400" />
                    )}
                  </div>
                )}

                {/* Related ID for reference */}
                {notification.relatedId && (
                  <div className="flex items-center gap-1 text-gray-500">
                    <FileText className="h-3 w-3" />
                    <span className="text-xs">Réf: {notification.relatedId.slice(0, 8)}</span>
                  </div>
                )}

                {/* Due date */}
                {notification.dueDate && (
                  <div className="flex items-center gap-1 text-gray-500">
                    <Clock className="h-3 w-3" />
                    <span>{new Date(notification.dueDate).toLocaleDateString('fr-FR')}</span>
                  </div>
                )}
              </div>

              {/* Metadata */}
              {notification.metadata && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {notification.metadata.deviceName && (
                    <Badge variant="outline" className="text-xs">
                      {notification.metadata.deviceName}
                    </Badge>
                  )}
                  {notification.metadata.taskType && (
                    <Badge variant="outline" className="text-xs">
                      {notification.metadata.taskType}
                    </Badge>
                  )}
                  {notification.metadata.location && (
                    <Badge variant="outline" className="text-xs">
                      📍 {notification.metadata.location}
                    </Badge>
                  )}
                  {notification.metadata.room && (
                    <Badge variant="outline" className="text-xs">
                      🚪 {notification.metadata.room}
                    </Badge>
                  )}
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
                {notification.actionLabel || 'Voir'}
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderStats = () => {
    if (!stats) return null;

    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Bell className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600">Non lues</p>
                <p className="text-2xl font-bold text-blue-600">{stats.unread}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-red-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-600">Urgent</p>
                <p className="text-2xl font-bold text-red-600">{stats.high}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600">Rendez-vous</p>
                <p className="text-2xl font-bold text-green-600">{stats?.byType?.APPOINTMENT || 0}</p>
              </div>
              <Calendar className="h-8 w-8 text-green-400" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <div className="container mx-auto py-6 px-4 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Mes Notifications</h1>
          <p className="text-gray-600 mt-1">Suivez vos tâches, rendez-vous et alertes en temps réel</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 jours</SelectItem>
              <SelectItem value="30">30 jours</SelectItem>
              <SelectItem value="60">60 jours</SelectItem>
              <SelectItem value="90">90 jours</SelectItem>
            </SelectContent>
          </Select>

          <Button 
            onClick={markAllAsRead} 
            variant="outline"
            disabled={stats?.unread === 0}
          >
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Tout marquer comme lu
          </Button>
          
          <Button onClick={fetchNotifications} variant="outline">
            <Activity className="h-4 w-4 mr-2" />
            Actualiser
          </Button>
        </div>
      </div>

      {/* Stats */}
      {renderStats()}

      {/* Content */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-7 w-full mb-6">
            <TabsTrigger value="all">
              Toutes ({notifications.length})
            </TabsTrigger>
            {Object.entries(notificationConfig).map(([type, config]) => {
              const count = groupedNotifications[type]?.length || 0;
              return (
                <TabsTrigger key={type} value={type}>
                  <config.icon className="h-4 w-4 mr-1" />
                  {config.label} ({count})
                </TabsTrigger>
              );
            })}
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            {notifications.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Bell className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">Aucune notification</p>
                  <p className="text-sm text-gray-400 mt-1">
                    Vos notifications apparaîtront ici
                  </p>
                </CardContent>
              </Card>
            ) : (
              notifications.map(renderNotificationCard)
            )}
          </TabsContent>

          {Object.entries(notificationConfig).map(([type, config]) => (
            <TabsContent key={type} value={type} className="space-y-4">
              {groupedNotifications[type]?.length === 0 || !groupedNotifications[type] ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <config.icon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">Aucune notification de type {config.label}</p>
                  </CardContent>
                </Card>
              ) : (
                groupedNotifications[type]?.map(renderNotificationCard)
              )}
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
}

// Add layout wrapper
EmployeeNotificationsPage.getLayout = function getLayout(page: React.ReactElement) {
  return <EmployeeLayout>{page}</EmployeeLayout>
};
