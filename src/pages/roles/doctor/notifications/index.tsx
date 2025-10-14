import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    Bell,
    BellOff,
    CheckCircle,
    Clock,
    AlertTriangle,
    Info,
    Trash2,
    
} from 'lucide-react';
import { cn } from "@/lib/utils";

interface Notification {
    id: string;
    type: 'info' | 'warning' | 'success' | 'error';
    title: string;
    message: string;
    createdAt: string;
    isRead: boolean;
    actionUrl?: string;
}

const DoctorNotifications: React.FC = () => {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');

    useEffect(() => {
        if (status === 'loading') return;
        
        if (!session?.user || session.user.role !== 'DOCTOR') {
            router.push('/auth/signin');
            return;
        }

        fetchNotifications();
    }, [session, status, router]);

    const fetchNotifications = async () => {
        try {
            setLoading(true);
            // Mock data - replace with actual API call
            const mockNotifications: Notification[] = [
                {
                    id: '1',
                    type: 'warning',
                    title: 'Maintenance programmée',
                    message: 'L\'appareil CPAP de Marie Dubois nécessite une maintenance dans 7 jours.',
                    createdAt: new Date().toISOString(),
                    isRead: false,
                    actionUrl: '/roles/doctor/medical-devices/1'
                },
                {
                    id: '2',
                    type: 'info',
                    title: 'Nouveau message',
                    message: 'Vous avez reçu un message de l\'administration.',
                    createdAt: new Date(Date.now() - 3600000).toISOString(),
                    isRead: false,
                    actionUrl: '/roles/doctor/chat'
                },
                {
                    id: '3',
                    type: 'success',
                    title: 'Diagnostic terminé',
                    message: 'Le diagnostic de Jean Martin a été complété avec succès.',
                    createdAt: new Date(Date.now() - 86400000).toISOString(),
                    isRead: true,
                    actionUrl: '/roles/doctor/diagnostics/2'
                }
            ];
            setNotifications(mockNotifications);
        } catch (error) {
            console.error('Error fetching notifications:', error);
        } finally {
            setLoading(false);
        }
    };

    const markAsRead = async (notificationId: string) => {
        setNotifications(prev => 
            prev.map(notif => 
                notif.id === notificationId ? { ...notif, isRead: true } : notif
            )
        );
    };

    const markAllAsRead = async () => {
        setNotifications(prev => 
            prev.map(notif => ({ ...notif, isRead: true }))
        );
    };

    const deleteNotification = async (notificationId: string) => {
        setNotifications(prev => prev.filter(notif => notif.id !== notificationId));
    };

    const getNotificationIcon = (type: string) => {
        switch (type) {
            case 'success':
                return <CheckCircle className="h-5 w-5 text-green-600" />;
            case 'warning':
                return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
            case 'error':
                return <AlertTriangle className="h-5 w-5 text-red-600" />;
            default:
                return <Info className="h-5 w-5 text-blue-600" />;
        }
    };

    const getNotificationColor = (type: string, isRead: boolean) => {
        const baseClass = isRead ? 'bg-gray-50' : 'bg-white border-l-4';
        const colorClass = isRead 
            ? 'border-gray-300' 
            : type === 'success' 
                ? 'border-green-500' 
                : type === 'warning' 
                    ? 'border-yellow-500'
                    : type === 'error' 
                        ? 'border-red-500' 
                        : 'border-blue-500';
        return `${baseClass} ${colorClass}`;
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

        if (diffInHours < 1) {
            return 'À l\'instant';
        } else if (diffInHours < 24) {
            return `Il y a ${Math.floor(diffInHours)} heure(s)`;
        } else {
            return date.toLocaleDateString('fr-FR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        }
    };

    const filteredNotifications = notifications.filter(notif => {
        if (filter === 'unread') return !notif.isRead;
        if (filter === 'read') return notif.isRead;
        return true;
    });

    const unreadCount = notifications.filter(n => !n.isRead).length;

    if (loading) {
        return (
            <div className="p-6 flex items-center justify-center min-h-screen">
                <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
                    <span className="text-red-700">Chargement des notifications...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-red-700 flex items-center">
                        <Bell className="h-6 w-6 mr-2" />
                        Notifications
                        {unreadCount > 0 && (
                            <span className="ml-2 bg-red-500 text-white text-sm rounded-full px-2 py-1">
                                {unreadCount}
                            </span>
                        )}
                    </h1>
                    <p className="text-gray-600 mt-1">
                        Restez informé des événements importants
                    </p>
                </div>
                {unreadCount > 0 && (
                    <Button
                        onClick={markAllAsRead}
                        variant="outline"
                        className="border-red-200 text-red-700 hover:bg-red-50"
                    >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Tout marquer comme lu
                    </Button>
                )}
            </div>

            {/* Filters */}
            <div className="flex space-x-2">
                <Button
                    onClick={() => setFilter('all')}
                    variant={filter === 'all' ? 'default' : 'outline'}
                    className={filter === 'all' ? 'bg-red-600 hover:bg-red-700' : 'border-red-200 text-red-700 hover:bg-red-50'}
                    size="sm"
                >
                    Toutes ({notifications.length})
                </Button>
                <Button
                    onClick={() => setFilter('unread')}
                    variant={filter === 'unread' ? 'default' : 'outline'}
                    className={filter === 'unread' ? 'bg-red-600 hover:bg-red-700' : 'border-red-200 text-red-700 hover:bg-red-50'}
                    size="sm"
                >
                    Non lues ({unreadCount})
                </Button>
                <Button
                    onClick={() => setFilter('read')}
                    variant={filter === 'read' ? 'default' : 'outline'}
                    className={filter === 'read' ? 'bg-red-600 hover:bg-red-700' : 'border-red-200 text-red-700 hover:bg-red-50'}
                    size="sm"
                >
                    Lues ({notifications.length - unreadCount})
                </Button>
            </div>

            {/* Notifications List */}
            <div className="space-y-3">
                {filteredNotifications.length > 0 ? (
                    filteredNotifications.map((notification) => (
                        <Card key={notification.id} 
                              className={cn("cursor-pointer transition-all hover:shadow-md", 
                                           getNotificationColor(notification.type, notification.isRead))}>
                            <CardContent className="p-4">
                                <div className="flex items-start space-x-4">
                                    <div className="flex-shrink-0 mt-1">
                                        {getNotificationIcon(notification.type)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <h3 className={cn(
                                                    "text-sm font-medium",
                                                    notification.isRead ? "text-gray-700" : "text-gray-900"
                                                )}>
                                                    {notification.title}
                                                </h3>
                                                <p className={cn(
                                                    "text-sm mt-1",
                                                    notification.isRead ? "text-gray-500" : "text-gray-700"
                                                )}>
                                                    {notification.message}
                                                </p>
                                                <p className="text-xs text-gray-500 mt-2">
                                                    <Clock className="h-3 w-3 inline mr-1" />
                                                    {formatDate(notification.createdAt)}
                                                </p>
                                            </div>
                                            <div className="flex items-center space-x-2 ml-4">
                                                {!notification.isRead && (
                                                    <Button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            markAsRead(notification.id);
                                                        }}
                                                        variant="ghost"
                                                        size="sm"
                                                        className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                                    >
                                                        <CheckCircle className="h-4 w-4" />
                                                    </Button>
                                                )}
                                                <Button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        deleteNotification(notification.id);
                                                    }}
                                                    variant="ghost"
                                                    size="sm"
                                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                        {notification.actionUrl && (
                                            <Button
                                                onClick={() => router.push(notification.actionUrl!)}
                                                variant="outline"
                                                size="sm"
                                                className="mt-3 border-red-200 text-red-700 hover:bg-red-50"
                                            >
                                                Voir détails
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                ) : (
                    <Card className="border-red-200">
                        <CardContent className="p-12 text-center">
                            {filter === 'unread' ? (
                                <BellOff className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                            ) : (
                                <Bell className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                            )}
                            <h3 className="text-lg font-medium text-gray-900 mb-2">
                                {filter === 'unread' ? 'Aucune nouvelle notification' : 
                                 filter === 'read' ? 'Aucune notification lue' : 'Aucune notification'}
                            </h3>
                            <p className="text-gray-600">
                                {filter === 'unread' ? 'Toutes vos notifications ont été lues.' :
                                 filter === 'read' ? 'Vous n\'avez pas encore lu de notifications.' :
                                 'Vous n\'avez pas encore de notifications.'}
                            </p>
                        </CardContent>
                    </Card>
                )}
            </div>

            {filteredNotifications.length > 0 && (
                <div className="text-sm text-gray-600 text-center">
                    Affichage de {filteredNotifications.length} notification(s)
                </div>
            )}
        </div>
    );
};

export default DoctorNotifications;