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
    RotateCw,
    Stethoscope
} from 'lucide-react';
import { cn } from "@/lib/utils";
import axios from 'axios';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

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

const DoctorNavbar: React.FC<NavbarProps> = ({ onSidebarToggle, sidebarExpanded = true }) => {
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
        const titleMap: { [key: string]: string } = {
            '/roles/doctor/dashboard': 'Tableau de Bord',
            '/roles/doctor/patients': 'Mes Patients',
            '/roles/doctor/appointments': 'Rendez-vous',
            '/roles/doctor/diagnostics': 'Diagnostics',
            '/roles/doctor/medical-devices': 'Appareils Médicaux',
            '/roles/doctor/reports': 'Rapports',
            '/roles/doctor/notifications': 'Notifications',
            '/roles/doctor/chat': 'Messages',
            '/roles/doctor/help': 'Aide & Support',
            '/roles/doctor/settings': 'Paramètres',
        };
        return titleMap[path] || 'Espace Médecin';
    };

    // Get notification icon based on type
    const getNotificationIcon = (type: NotificationType) => {
        switch (type) {
            case 'FOLLOW_UP':
                return <Calendar className="h-4 w-4" />;
            case 'MAINTENANCE':
                return <Settings className="h-4 w-4" />;
            case 'APPOINTMENT':
                return <Calendar className="h-4 w-4" />;
            case 'PAYMENT_DUE':
                return <AlertCircle className="h-4 w-4" />;
            case 'TRANSFER':
                return <Link className="h-4 w-4" />;
            default:
                return <Bell className="h-4 w-4" />;
        }
    };

    // Format relative time for notifications
    const getRelativeTime = (dateString: string) => {
        try {
            return formatDistanceToNow(new Date(dateString), { addSuffix: true, locale: fr });
        } catch (error) {
            return 'récemment';
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
            minute: '2-digit'
        });
    };

    const formatDate = (date: Date) => {
        return date.toLocaleDateString('fr-FR', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    return (
        <div className="bg-white border-b border-red-200 shadow-md relative z-50">
            <div className="px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                    {/* Left Section */}
                    <div className="flex items-center space-x-4">
                        {/* Mobile Sidebar Toggle */}
                        <button
                            onClick={onSidebarToggle}
                            className="lg:hidden p-2 rounded-lg text-gray-600 hover:text-red-700 hover:bg-red-50 transition-colors"
                        >
                            {sidebarExpanded ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                        </button>

                        {/* Page Title & Breadcrumb */}
                        <div className="flex flex-col">
                            <h1 className="text-lg font-semibold text-red-700 leading-tight flex items-center">
                                <Stethoscope className="h-5 w-5 mr-2" />
                                {getPageTitle()}
                            </h1>
                            <div className="text-xs text-gray-500 flex items-center space-x-1">
                                <span>Espace Médecin</span>
                                <span>•</span>
                                <span className="font-medium">{currentTime ? formatTime(currentTime) : '--:--'}</span>
                            </div>
                        </div>
                    </div>


                    {/* Right Section */}
                    <div className="flex items-center space-x-3">
                        {/* Current Date */}
                        <div className="hidden lg:block text-right">
                            <div className="text-xs text-gray-500">{currentTime ? formatDate(currentTime) : ''}</div>
                            <div className="text-sm font-medium text-red-700">{currentTime ? formatTime(currentTime) : '--:--'}</div>
                        </div>

                        {/* Notifications */}
                        <div className="relative" ref={notificationsRef}>
                            <button
                                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                                className="relative p-2 rounded-lg text-gray-600 hover:text-red-700 hover:bg-red-50 transition-colors"
                            >
                                <Bell className="h-5 w-5" />
                                {unreadCount > 0 && (
                                    <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium">
                                        {unreadCount}
                                    </span>
                                )}
                            </button>

                            {/* Notifications Dropdown */}
                            {isNotificationsOpen && (
                                <div className="absolute right-0 mt-2 w-[38rem] max-w-[95vw] bg-white border border-red-200 rounded-lg shadow-md py-2 z-50">
                                    <div className="px-4 py-2 border-b border-red-100 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
                                            <span className="text-xs text-gray-500">{unreadCount} non lues</span>
                                        </div>
                                        <button
                                            className="p-1 rounded hover:bg-red-100 transition-colors"
                                            title="Rafraîchir"
                                            onClick={fetchNotifications}
                                            disabled={isLoading}
                                        >
                                            {isLoading ? (
                                                <span className="inline-block h-5 w-5 align-middle">
                                                    <svg className="animate-spin text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                                                    </svg>
                                                </span>
                                            ) : (
                                                <RotateCw className="h-5 w-5 text-red-600" />
                                            )}
                                        </button>
                                    </div>
                                    <div className="max-h-[32rem] overflow-y-auto divide-y divide-red-100">
                                        {notifications.length === 0 ? (
                                            <div className="px-4 py-6 text-center text-gray-500">
                                                <Bell className="h-5 w-5 mx-auto mb-2 opacity-50" />
                                                <p className="text-sm">Aucune notification</p>
                                            </div>
                                        ) : (
                                            // Sort: unread first, then read; both by date desc
                                            [...notifications].sort((a, b) => {
                                                if (a.isRead === b.isRead) {
                                                    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                                                }
                                                return a.isRead ? 1 : -1;
                                            }).map((notification) => (
                                                <div
                                                    key={notification.id}
                                                    className={cn(
                                                        "px-4 py-3 flex gap-3 items-start cursor-pointer border-l-4 transition-colors group",
                                                        !notification.isRead
                                                            ? "border-l-red-500 bg-red-50/40 hover:bg-red-100/60"
                                                            : "border-l-transparent hover:bg-gray-50"
                                                    )}
                                                    onClick={() => markNotificationAsRead(notification.id)}
                                                >
                                                    <div className="flex-shrink-0 mt-1">
                                                        <div className="p-1 bg-red-100 rounded-full text-red-600">
                                                            {getNotificationIcon(notification.type)}
                                                        </div>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center justify-between">
                                                            <p className={cn("text-sm font-medium truncate", !notification.isRead ? "text-red-900" : "text-gray-900")}>{notification.title}</p>
                                                            <span className="text-xs text-gray-500 ml-2">{getRelativeTime(notification.createdAt)}</span>
                                                        </div>
                                                        <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                                                        {notification.isRead && (
                                                            <span className="inline-block mt-1 text-xs text-gray-400 bg-gray-100 rounded px-2 py-0.5">Lu</span>
                                                        )}
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                    <div className="px-4 py-2 border-t border-red-100">
                                        <button className="text-sm text-red-700 font-medium hover:underline w-full text-left">
                                            Voir toutes les notifications
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* User Profile */}
                        {session?.user && (
                            <div className="relative" ref={profileRef}>
                                <button
                                    onClick={() => setIsProfileOpen(!isProfileOpen)}
                                    className="flex items-center space-x-3 p-2 rounded-lg hover:bg-red-50 transition-colors"
                                >
                                    <Avatar className="h-8 w-8 ring-2 ring-white shadow-sm">
                                        <AvatarFallback className="bg-gradient-to-br from-red-600 to-red-700 text-white font-semibold">
                                            {session.user.name ? getInitials(session.user.name) : <User className="h-4 w-4" />}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="hidden md:flex flex-col items-start">
                                        <span className="text-sm font-medium text-gray-900 leading-tight">
                                            Dr. {session.user.name}
                                        </span>
                                        <span className="text-xs text-gray-500 leading-tight">
                                            Médecin
                                        </span>
                                    </div>
                                    <ChevronDown className="h-4 w-4 text-gray-500" />
                                </button>

                                {/* Profile Dropdown */}
                                {isProfileOpen && (
                                    <div className="absolute right-0 mt-2 w-64 bg-white border border-red-200 rounded-lg shadow-md py-2 z-50">
                                        {/* User Info */}
                                        <div className="px-4 py-3 border-b border-red-100">
                                            <div className="flex items-center space-x-3">
                                                <Avatar className="h-10 w-10">
                                                    <AvatarFallback className="bg-gradient-to-br from-red-600 to-red-700 text-white font-semibold">
                                                        {session.user.name ? getInitials(session.user.name) : <User className="h-5 w-5" />}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-gray-900 truncate">
                                                        Dr. {session.user.name}
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
                                            <a href="/roles/doctor/profile" className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-red-50 transition-colors">
                                                <User className="h-4 w-4 mr-3" />
                                                Mon Profil
                                            </a>
                                            <a href="/roles/doctor/help" className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-red-50 transition-colors">
                                                <HelpCircle className="h-4 w-4 mr-3" />
                                                Aide & Support
                                            </a>
                                        </div>

                                        <div className="border-t border-red-100 py-1">
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
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DoctorNavbar;