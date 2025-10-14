import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import AdminLayout from '../AdminLayout';
import { 
  Bell, Calendar, Clock, CreditCard, Stethoscope, 
  AlertCircle, CheckCircle2, ChevronRight, Filter,
  Users, Building2, TrendingUp, AlertTriangle,
  FileText, Activity
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

interface DynamicNotification {
  id: string;
  type: 'RENTAL_EXPIRING' | 'PAYMENT_DUE' | 'DIAGNOSTIC_PENDING' | 'APPOINTMENT_REMINDER' | 'MAINTENANCE_DUE' | 'CNAM_RENEWAL';
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  title: string;
  message: string;
  clientName: string;
  clientType: 'patient' | 'company';
  clientId: string;
  actionUrl?: string;
  actionLabel?: string;
  dueDate?: string;
  amount?: number;
  metadata?: any;
  createdAt: string;
}

const notificationConfig = {
  RENTAL_EXPIRING: {
    icon: Building2,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    label: 'Location'
  },
  PAYMENT_DUE: {
    icon: CreditCard,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    label: 'Paiement'
  },
  DIAGNOSTIC_PENDING: {
    icon: Stethoscope,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    label: 'Diagnostic'
  },
  APPOINTMENT_REMINDER: {
    icon: Calendar,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    label: 'Rendez-vous'
  },
  MAINTENANCE_DUE: {
    icon: Activity,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    label: 'Maintenance'
  },
  CNAM_RENEWAL: {
    icon: FileText,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50',
    borderColor: 'border-indigo-200',
    label: 'CNAM'
  }
};

export default function ModernNotificationsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<DynamicNotification[]>([]);
  const [groupedNotifications, setGroupedNotifications] = useState<Record<string, DynamicNotification[]>>({});
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [timeRange, setTimeRange] = useState('30');
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchNotifications();
  }, [timeRange, filter]);

  const fetchNotifications = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/notifications/dynamic?filter=${filter}&timeRange=${timeRange}`);
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

  const handleAction = (notification: DynamicNotification) => {
    if (notification.actionUrl) {
      router.push(notification.actionUrl);
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
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Aujourd'hui";
    if (diffDays === 1) return "Hier";
    if (diffDays < 7) return `Il y a ${diffDays} jours`;
    if (diffDays < 30) return `Il y a ${Math.floor(diffDays / 7)} semaines`;
    return `Il y a ${Math.floor(diffDays / 30)} mois`;
  };

  const getClientInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const renderNotificationCard = (notification: DynamicNotification) => {
    const config = notificationConfig[notification.type];
    const Icon = config.icon;

    return (
      <Card 
        key={notification.id}
        className={cn(
          "hover:shadow-md transition-all cursor-pointer group",
          "border-l-4",
          config.borderColor
        )}
        onClick={() => handleAction(notification)}
      >
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            {/* Icon */}
            <div className={cn(
              "p-3 rounded-lg flex-shrink-0",
              config.bgColor
            )}>
              <Icon className={cn("h-5 w-5", config.color)} />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 mb-1">
                <h3 className="font-semibold text-gray-900 truncate">
                  {notification.title}
                </h3>
                {getPriorityBadge(notification.priority)}
              </div>
              
              <p className="text-sm text-gray-600 mb-2">
                {notification.message}
              </p>

              <div className="flex items-center gap-4 text-sm">
                {/* Client */}
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

                {/* Due date */}
                {notification.dueDate && (
                  <div className="flex items-center gap-1 text-gray-500">
                    <Clock className="h-3 w-3" />
                    <span>{new Date(notification.dueDate).toLocaleDateString('fr-FR')}</span>
                  </div>
                )}

                {/* Amount */}
                {notification.amount && (
                  <div className="flex items-center gap-1 text-gray-700 font-medium">
                    <span>{notification.amount.toFixed(2)} TND</span>
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
                  {notification.metadata.bondType && (
                    <Badge variant="outline" className="text-xs">
                      {notification.metadata.bondType}
                    </Badge>
                  )}
                  {notification.metadata.assignedTo && (
                    <Badge variant="outline" className="text-xs">
                      Assigné: {notification.metadata.assignedTo}
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

        <Card className="border-yellow-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-yellow-600">Moyen</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.medium}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-yellow-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600">Faible</p>
                <p className="text-2xl font-bold text-green-600">{stats.low}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-400" />
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
          <h1 className="text-3xl font-bold text-gray-900">Centre de Notifications</h1>
          <p className="text-gray-600 mt-1">Gérez toutes vos alertes et rappels en un seul endroit</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 jours</SelectItem>
              <SelectItem value="30">30 jours</SelectItem>
              <SelectItem value="60">60 jours</SelectItem>
              <SelectItem value="90">90 jours</SelectItem>
            </SelectContent>
          </Select>
          
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
                  <p className="text-gray-500">Aucune notification active</p>
                  <p className="text-sm text-gray-400 mt-1">
                    Les notifications apparaîtront ici lorsqu'une action sera requise
                  </p>
                </CardContent>
              </Card>
            ) : (
              notifications.map(renderNotificationCard)
            )}
          </TabsContent>

          {Object.entries(notificationConfig).map(([type, config]) => (
            <TabsContent key={type} value={type} className="space-y-4">
              {groupedNotifications[type]?.length === 0 ? (
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
ModernNotificationsPage.getLayout = function getLayout(page: React.ReactElement) {
  return <AdminLayout>{page}</AdminLayout>;
};