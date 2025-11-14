import React, { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { useSession, signOut } from 'next-auth/react';
import { useQuery } from '@tanstack/react-query';
import {
    LayoutDashboard,
    BriefcaseMedical,
    Settings,
    Power,
    ChevronLeft,
    ChevronRight,
    ContactRound,
    CalendarCheck,
    ClipboardCheck,
    Database,
    Wrench,
    Users,
    MapPin,
    BarChart3,
    MessageCircle,
    KeyRound,
    Shield,
    Calendar,
    Stethoscope,
    ShoppingCart,
    ListTodo,
} from 'lucide-react';
import { cn } from "@/lib/utils";

type MenuItem = {
    id: string;
    icon: React.ReactNode;
    label: string;
    path: string;
};

const Sidebar: React.FC = () => {
    const router = useRouter();
    const { data: session } = useSession();
    const [isExpanded, setIsExpanded] = useState(false);
    const [isNavigating, setIsNavigating] = useState(false);
    const [lastNavigationTime, setLastNavigationTime] = useState(0);

    // Fetch unread message count
    const { data: unreadData } = useQuery({
        queryKey: ['unread-messages-count'],
        queryFn: async () => {
            const response = await fetch('/api/messages/unread-count');
            if (!response.ok) throw new Error('Failed to fetch unread count');
            return response.json();
        },
        enabled: !!session?.user,
        refetchInterval: 10000, // Refetch every 10 seconds
    });

    const unreadCount = unreadData?.unreadCount || 0;

    // Default menu items with unique IDs
    const defaultMenuItems: MenuItem[] = [
        { id: 'dashboard', icon: <LayoutDashboard size={20} />, label: "Accueil", path: "/roles/admin/dashboard" },
        { id: 'analytics', icon: <BarChart3 size={20} />, label: "Analyses & Rapports", path: "/roles/admin/analytics" },
        { id: 'appointments', icon: <Calendar size={20} />, label: "Rendez-vous", path: "/roles/admin/appointments" },
        { id: 'diagnostics', icon: <Stethoscope size={20} />, label: "Polygraphies", path: "/roles/admin/diagnostics" },
        { id: 'sales', icon: <ShoppingCart size={20} />, label: "Gestion des Ventes", path: "/roles/admin/sales" },
        { id: 'rentals', icon: <KeyRound size={20} />, label: "Gestion des Locations", path: "/roles/admin/location" },
        { id: 'manual-tasks', icon: <ListTodo size={20} />, label: "Tâches Manuelles", path: "/roles/admin/manual-tasks" },
        { id: 'calendar', icon: <CalendarCheck size={20} />, label: "Calendrier & Tâches", path: "/roles/admin/calendar" },
        { id: 'notifications', icon: <ClipboardCheck size={20} />, label: "Gestion des Notifications", path: "/roles/admin/notifications" },
        { id: 'chat', icon: <MessageCircle size={20} />, label: "Messages", path: "/roles/admin/chat" },
        { id: 'users', icon: <ContactRound size={20} />, label: "Utilisateurs", path: "/roles/admin/users" },
        { id: 'renseignement', icon: <Users size={20} />, label: "Renseignement", path: "/roles/admin/renseignement" },
        { id: 'map', icon: <MapPin size={20} />, label: "Carte des Patients", path: "/roles/admin/map" },
        { id: 'appareils', icon: <BriefcaseMedical size={20} />, label: "Gestion des Produits", path: "/roles/admin/appareils" },
        { id: 'reparateur', icon: <Wrench size={20} />, label: "Gestion des Réparateurs", path: "/roles/admin/reparateur" },
        { id: 'stock', icon: <Database size={20} />, label: "Gestion des Stocks", path: "/roles/admin/stock" },
        { id: 'cnam-management', icon: <Shield size={20} />, label: "Gestion CNAM", path: "/roles/admin/cnam-management" },
        { id: 'settings', icon: <Settings size={20} />, label: "Paramètres", path: "/roles/admin/settings" },
    ];

    // Store sidebar state in localStorage
    useEffect(() => {
        const savedState = localStorage.getItem('sidebarExpanded');
        if (savedState !== null) {
            setIsExpanded(savedState === 'true');
        }
    }, []);

    // Handle router events to track navigation state
    useEffect(() => {
        const handleRouteChangeStart = () => {
            setIsNavigating(true);
        };

        const handleRouteChangeComplete = () => {
            setIsNavigating(false);
        };

        const handleRouteChangeError = () => {
            setIsNavigating(false);
        };

        router.events.on('routeChangeStart', handleRouteChangeStart);
        router.events.on('routeChangeComplete', handleRouteChangeComplete);
        router.events.on('routeChangeError', handleRouteChangeError);

        return () => {
            router.events.off('routeChangeStart', handleRouteChangeStart);
            router.events.off('routeChangeComplete', handleRouteChangeComplete);
            router.events.off('routeChangeError', handleRouteChangeError);
        };
    }, [router]);

    const toggleSidebar = () => {
        const newState = !isExpanded;
        setIsExpanded(newState);
        localStorage.setItem('sidebarExpanded', String(newState));
    };

    // Navigation handler
    const handleNavigation = useCallback((path: string) => {
        const now = Date.now();

        // Prevent navigation if already navigating or if less than 300ms since last navigation
        if (isNavigating || (now - lastNavigationTime < 300)) {
            return;
        }

        setLastNavigationTime(now);
        router.push(path);
    }, [isNavigating, lastNavigationTime, router]);

    return (
        <div
            className={`flex flex-col h-full bg-white shadow-md transition-all duration-300 ${isExpanded ? 'w-64' : 'w-20'} relative`}
        >
            {/* Header with Logo and Toggle Button */}
            <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                {isExpanded ? (
                    <div className="flex-1 flex justify-center">
                        <Image
                            src="/logo_No_BG.png"
                            alt="Iris Santé Logo"
                            width={150}
                            height={60}
                            priority
                            className="object-contain h-auto"
                        />
                    </div>
                ) : (
                    <div className="w-10 h-10 flex items-center justify-center mx-auto">
                        <Image
                            src="/logo_No_BG.png"
                            alt="Iris Santé Icon"
                            width={40}
                            height={40}
                            priority
                        />
                    </div>
                )}
            </div>

            {/* Toggle Button */}
            <button
                onClick={toggleSidebar}
                className="absolute -right-4 top-20 bg-white rounded-full p-1.5 shadow-md border border-gray-200 text-blue-900 hover:bg-blue-50 transition-colors z-10"
                aria-label={isExpanded ? "Collapse sidebar" : "Expand sidebar"}
            >
                {isExpanded ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
            </button>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto py-4 scrollbar-hide">
                <ul className="space-y-1 px-2">
                    {defaultMenuItems.map((item) => (
                        <li key={item.id}>
                            <div
                                onClick={() => handleNavigation(item.path)}
                                className={cn(
                                    "flex items-center px-3 py-3 text-sm font-medium rounded-lg transition-all duration-200 cursor-pointer",
                                    (router.pathname === item.path || router.asPath === item.path)
                                        ? "bg-[#1e3a8a] text-white"
                                        : "text-gray-700 hover:bg-gray-50 hover:text-[#1e3a8a]"
                                )}
                            >
                                <span className={`${isExpanded ? 'mr-3' : 'mx-auto'} relative`}>
                                    {item.icon}
                                    {item.id === 'chat' && unreadCount > 0 && (
                                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-4 w-4 flex items-center justify-center">
                                            {unreadCount > 9 ? '9+' : unreadCount}
                                        </span>
                                    )}
                                </span>
                                {isExpanded && (
                                    <span className="flex-1 flex items-center justify-between">
                                        <span>{item.label}</span>
                                        {item.id === 'chat' && unreadCount > 0 && (
                                            <span className="bg-red-500 text-white text-xs font-bold rounded-full px-2 py-0.5 min-w-[20px] text-center">
                                                {unreadCount > 99 ? '99+' : unreadCount}
                                            </span>
                                        )}
                                    </span>
                                )}
                            </div>
                        </li>
                    ))}
                </ul>
            </nav>

            {/* Footer */}
            <div className="p-2 border-t border-gray-100">
                <button
                    onClick={() => {
                        // Prevent multiple rapid logout attempts
                        if (!isNavigating) {
                            const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
                            signOut({ callbackUrl: `${baseUrl}/welcome` });
                        }
                    }}
                    className="flex items-center w-full px-3 py-3 text-sm font-medium rounded-lg transition-colors text-gray-700 hover:bg-gray-50 hover:text-[#1e3a8a]"
                    disabled={isNavigating}
                >
                    <span className={`${isExpanded ? 'mr-3' : 'mx-auto'}`}><Power size={20} /></span>
                    {isExpanded && <span>Logout</span>}
                </button>
            </div>
        </div>
    );
};

export default Sidebar;