import React, { useState, useEffect, useRef } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/router';
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
    User,
    Bell,
    Settings,
    LogOut,
    ChevronDown,
    Menu,
    X,
    Calendar,
    HelpCircle,
    Link,
    AlertCircle,
    RotateCw
} from 'lucide-react';
import { cn } from "@/lib/utils";
import axios from 'axios';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import GlobalSearch from '@/components/search/GlobalSearch';

interface NavbarProps {
    onSidebarToggle?: () => void;
    sidebarExpanded?: boolean;
}

interface Notification {
    id: string;
    title: string;
    message: string;
    type: NotificationType;
    status: NotificationStatus;
    isRead: boolean;
    createdAt: string;
    readAt: string | null;
    metadata?: any;
}

type NotificationType = 'FOLLOW_UP' | 'MAINTENANCE' | 'APPOINTMENT' | 'PAYMENT_DUE' | 'TRANSFER' | 'OTHER';
type NotificationStatus = 'PENDING' | 'COMPLETED' | 'DISMISSED' | 'READ';

const Navbar: React.FC<NavbarProps> = ({ onSidebarToggle, sidebarExpanded = true }) => {
    const { data: session } = useSession();
    const router = useRouter();
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
    const [currentTime, setCurrentTime] = useState<Date | null>(null);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const profileRef = useRef<HTMLDivElement>(null);
    const notificationsRef = useRef<HTMLDivElement>(null);

    // Update time every minute and fetch notifications
    useEffect(() => {
        // Set initial time on client side only
        setCurrentTime(new Date());
        
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 60000);
        
        // Fetch notifications when component mounts
        fetchNotifications();
        
        return () => clearInterval(timer);
    }, []);
    
    // Function to fetch notifications from the API
    const fetchNotifications = async () => {
        if (!session) return;
        
        try {
            setIsLoading(true);
            const response = await axios.get('/api/notifications/get-user-notifications');
            setNotifications(response.data.notifications);
            setUnreadCount(response.data.unreadCount);
        } catch (error) {
            console.error('Error fetching notifications:', error);
        } finally {
            setIsLoading(false);
        }
    };
    
    // Function to mark a notification as read
    const markNotificationAsRead = async (notificationId: string) => {
        try {
            await axios.post('/api/notifications/mark-as-read', { notificationId });
            
            // Update local state
            setNotifications(prev => 
                prev.map(notification => 
                    notification.id === notificationId 
                        ? { ...notification, isRead: true, readAt: new Date().toISOString() } 
                        : notification
                )
            );
            
            // Update unread count
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    };

    // Close dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
                setIsProfileOpen(false);
            }
            if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
                setIsNotificationsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Get user initials for avatar fallback
    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map(part => part[0])
            .join('')
            .toUpperCase();
    };
    
    // Get current page title based on route
    const getPageTitle = () => {
        const path = router.pathname;
        
        if (path.includes('/dashboard')) return 'Tableau de Bord';
        if (path.includes('/renseignement')) return 'Renseignement';
        if (path.includes('/diagnostics')) return 'Diagnostique';
        if (path.includes('/sales')) return 'Vente';
        if (path.includes('/rentals')) return 'Location';
        if (path.includes('/tasks')) return 'Tâches';
        if (path.includes('/stock')) return 'Stock';
        if (path.includes('/notifications')) return 'Notifications';
        if (path.includes('/history')) return 'Historique';
        
        return 'Elite Medicale Services';
    };
    
    // Get notification icon based on type
    const getNotificationIcon = (type: NotificationType) => {
        switch (type) {
            case 'FOLLOW_UP':
                return <Calendar className="h-5 w-5 text-blue-500" />;
            case 'MAINTENANCE':
                return <Settings className="h-5 w-5 text-orange-500" />;
            case 'APPOINTMENT':
                return <Calendar className="h-5 w-5 text-green-500" />;
            case 'PAYMENT_DUE':
                return <AlertCircle className="h-5 w-5 text-red-500" />;
            case 'TRANSFER':
                return <Link className="h-5 w-5 text-purple-500" />;
            default:
                return <Bell className="h-5 w-5 text-gray-500" />;
        }
    };
    
    // Format relative time for notifications
    const getRelativeTime = (dateString: string) => {
        try {
            return formatDistanceToNow(new Date(dateString), { addSuffix: true, locale: fr });
        } catch (error) {
            return 'Date inconnue';
        }
    };
    
    const handleLogout = () => {
        // Use window.location.origin to get the current domain for production compatibility
        const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
        signOut({ callbackUrl: `${baseUrl}/welcome` });
    };
    
    const formatTime = (date: Date) => {
        return date.toLocaleTimeString('fr-FR', {
            hour: '2-digit',
            minute: '2-digit',
        });
    };
    
    const formatDate = (date: Date) => {
        return date.toLocaleDateString('fr-FR', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    };

    return (
        <div className="bg-white shadow-md z-10">
            <div className="max-w-full px-4 sm:px-6 tablet:px-8 lg:px-8">
                <div className="flex justify-between h-16">
                    {/* Left side - Toggle button and page title */}
                    <div className="flex items-center">
                        {onSidebarToggle && (
                            <button
                                onClick={onSidebarToggle}
                                className="p-2 rounded-md text-gray-500 hover:text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#16a34a] lg:hidden"
                            >
                                <span className="sr-only">Open sidebar</span>
                                {sidebarExpanded ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                            </button>
                        )}
                        <h1 className="text-xl font-semibold text-[#16a34a] ml-2 lg:ml-0">
                            {getPageTitle()}
                        </h1>
                    </div>

                    {/* Center - Search */}
                    <div className="hidden tablet:flex items-center flex-1 justify-center px-4">
                        <GlobalSearch />
                    </div>

                    {/* Right side - User info, notifications, etc */}
                    {session?.user && (
                        <div className="flex items-center space-x-4">
                            {/* Current date and time */}
                            <div className="hidden tablet-lg:flex flex-col items-end mr-4">
                                <span className="text-sm font-medium text-gray-700">{currentTime ? formatTime(currentTime) : '--:--'}</span>
                                <span className="text-xs text-gray-500">{currentTime ? formatDate(currentTime) : ''}</span>
                            </div>

                            {/* Notifications dropdown */}
                            <div className="relative" ref={notificationsRef}>
                                <button
                                    onClick={() => {
                                        setIsNotificationsOpen(!isNotificationsOpen);
                                        if (!isNotificationsOpen) {
                                            fetchNotifications();
                                        }
                                    }}
                                    className="p-1 rounded-full text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-[#16a34a] relative"
                                >
                                    <span className="sr-only">View notifications</span>
                                    <Bell className="h-6 w-6" />
                                    {unreadCount > 0 && (
                                        <span className="absolute top-0 right-0 block h-4 w-4 rounded-full bg-[#16a34a] text-xs text-white font-medium  items-center justify-center transform -translate-y-1/4 translate-x-1/4">
                                            {unreadCount}
                                        </span>
                                    )}
                                </button>

                                {/* Notifications panel */}
                                {isNotificationsOpen && (
                                    <div className="origin-top-right absolute right-0 mt-2 w-80 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
                                        <div className="py-2">
                                            <div className="px-4 py-2 border-b border-gray-100 flex justify-between items-center">
                                                <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
                                                <button
                                                    onClick={fetchNotifications}
                                                    className="p-1 rounded-full text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#16a34a]"
                                                >
                                                    <RotateCw className="h-4 w-4" />
                                                </button>
                                            </div>
                                            
                                            {isLoading ? (
                                                <div className="px-4 py-6 flex justify-center">
                                                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#16a34a]"></div>
                                                </div>
                                            ) : notifications.length > 0 ? (
                                                <div className="max-h-96 overflow-y-auto">
                                                    {notifications.map((notification) => (
                                                        <div 
                                                            key={notification.id} 
                                                            className={cn(
                                                                "px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0",
                                                                !notification.isRead && "bg-green-50"
                                                            )}
                                                            onClick={() => markNotificationAsRead(notification.id)}
                                                        >
                                                            <div className="flex items-start">
                                                                <div className="flex-shrink-0 pt-0.5">
                                                                    {getNotificationIcon(notification.type)}
                                                                </div>
                                                                <div className="ml-3 w-0 flex-1">
                                                                    <p className="text-sm font-medium text-gray-900">{notification.title}</p>
                                                                    <p className="text-sm text-gray-600">{notification.message}</p>
                                                                    <p className="mt-1 text-xs text-gray-500">{getRelativeTime(notification.createdAt)}</p>
                                                                </div>
                                                                {!notification.isRead && (
                                                                    <div className="ml-3 flex-shrink-0">
                                                                        <div className="h-2 w-2 rounded-full bg-[#16a34a]"></div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="px-4 py-6 text-center text-gray-500">
                                                    <p>Aucune notification</p>
                                                </div>
                                            )}
                                            
                                            <div className="px-4 py-2 border-t border-gray-100">
                                                <a 
                                                    href="/roles/employee/notifications" 
                                                    className="block text-center text-sm text-[#16a34a] hover:text-[#15803d] font-medium"
                                                >
                                                    Voir toutes les notifications
                                                </a>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Profile dropdown */}
                            <div className="relative" ref={profileRef}>
                                <button
                                    onClick={() => setIsProfileOpen(!isProfileOpen)}
                                    className="flex items-center space-x-2 p-1 rounded-full hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-[#16a34a]"
                                >
                                    <Avatar className="h-8 w-8">
                                        <AvatarFallback className="bg-[#16a34a] text-white">
                                            {session.user.name ? getInitials(session.user.name) : <User className="h-4 w-4" />}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="hidden tablet:flex flex-col items-start">
                                        <span className="text-sm font-medium text-gray-700 truncate max-w-[100px]">
                                            {session.user.name}
                                        </span>
                                        <span className="text-xs text-gray-500 truncate max-w-[100px]">
                                            {session.user.role === 'EMPLOYEE' ? 'Employé' : session.user.role}
                                        </span>
                                    </div>
                                    <ChevronDown className="h-4 w-4 text-gray-500 hidden tablet:block" />
                                </button>

                                {isProfileOpen && (
                                    <div className="origin-top-right absolute right-0 mt-2 w-64 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
                                        {/* User Info */}
                                        <div className="px-4 py-3 border-b border-gray-100">
                                            <div className="flex items-center space-x-3">
                                                <Avatar className="h-10 w-10">
                                                    <AvatarFallback className="bg-gradient-to-br from-[#16a34a] to-green-600 text-white font-semibold">
                                                        {session.user.name ? getInitials(session.user.name) : <User className="h-5 w-5" />}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-gray-900 truncate">
                                                        {session.user.name}
                                                    </p>
                                                    <p className="text-xs text-gray-500 truncate">
                                                        {session.user.email}
                                                    </p>
                                                    <div className="flex items-center mt-1">
                                                        <div className="h-2 w-2 bg-green-400 rounded-full mr-2"></div>
                                                        <span className="text-xs text-green-600 font-medium">En ligne</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Menu Items */}
                                        <div className="py-1">
                                            <a href="/roles/employee/profile" className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors">
                                                <User className="h-4 w-4 mr-3" />
                                                Mon Profil
                                            </a>
                                            <a href="/roles/employee/settings" className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors">
                                                <Settings className="h-4 w-4 mr-3" />
                                                Paramètres
                                            </a>
                                            <a href="/roles/employee/help" className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors">
                                                <HelpCircle className="h-4 w-4 mr-3" />
                                                Aide & Support
                                            </a>
                                        </div>

                                        <div className="border-t border-gray-100 py-1">
                                            <button
                                                onClick={handleLogout}
                                                className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                                            >
                                                <LogOut className="h-4 w-4 mr-3" />
                                                Se déconnecter
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Navbar;
