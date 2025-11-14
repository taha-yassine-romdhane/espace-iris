import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { useSession, signOut } from 'next-auth/react';
import {
    LayoutDashboard,
    Box,
    Users,
    SquareActivity,
    Bell,
    Power,
    History,
    ShoppingCart,
    CalendarClock,
    ChevronLeft,
    ChevronRight,
    MessageCircle,
    Calendar,
    MapPin,
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
    const { } = useSession();
    const [isExpanded, setIsExpanded] = useState(true);
    const [isNavigating, setIsNavigating] = useState(false);
    const [lastNavigationTime, setLastNavigationTime] = useState(0);

    // Default menu items with unique IDs
    const defaultMenuItems: MenuItem[] = [
        { id: 'dashboard', icon: <LayoutDashboard size={20} />, label: "Tableau de Bord", path: "/roles/employee/dashboard" },
        { id: 'rdv', icon: <Calendar size={20} />, label: "Rendez-vous", path: "/roles/employee/appointments" },
        { id: 'manual-tasks', icon: <ListTodo size={20} />, label: "Mes Tâches", path: "/roles/employee/manual-tasks" },
        { id: 'renseignement', icon: <Users size={20} />, label: "Renseignement", path: "/roles/employee/renseignement" },
        { id: 'diagnostics', icon: <SquareActivity size={20} />, label: "Diagnostique", path: "/roles/employee/diagnostics" },
        { id: 'sales', icon: <ShoppingCart size={20} />, label: "Vente", path: "/roles/employee/sales" },
        { id: 'location', icon: <CalendarClock size={20} />, label: "Locations", path: "/roles/employee/location" },
        { id: 'calendar', icon: <Calendar size={20} />, label: "Calendrier", path: "/roles/employee/tasks/modern" },
        { id: 'stock', icon: <Box size={20} />, label: "Stock", path: "/roles/employee/stock" },
        { id: 'map', icon: <MapPin size={20} />, label: "Carte", path: "/roles/employee/map" },
        { id: 'notifications', icon: <Bell size={20} />, label: "Notifications", path: "/roles/employee/notifications" },
        { id: 'chat', icon: <MessageCircle size={20} />, label: "Messages", path: "/roles/employee/chat" },
        { id: 'history', icon: <History size={20} />, label: "Historique", path: "/roles/employee/history" },
    ];

    // Store sidebar state in localStorage
    useEffect(() => {
        const savedState = localStorage.getItem('employeeSidebarExpanded');
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
        localStorage.setItem('employeeSidebarExpanded', String(newState));
    };

    // Navigation handler with debounce to prevent double clicks
    const handleNavigation = useCallback((path: string) => {
        const now = Date.now();
        if (now - lastNavigationTime < 500 || isNavigating) {
            return; // Prevent navigation if already navigating or clicked recently
        }

        setLastNavigationTime(now);
        router.push(path);
    }, [lastNavigationTime, isNavigating, router]);

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
                className="absolute -right-4 top-20 bg-white rounded-full p-1.5 shadow-md border border-gray-200 text-green-700 hover:bg-green-50 transition-colors z-10"
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
                                    router.pathname.startsWith(item.path)
                                        ? "bg-green-600 text-white shadow-sm"
                                        : "text-gray-700 hover:bg-green-50 hover:text-green-600"
                                )}
                            >
                                <span className={`${isExpanded ? 'mr-3' : 'mx-auto'}`}>
                                    {item.icon}
                                </span>
                                {isExpanded && <span className="flex-1">{item.label}</span>}
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
                    className="flex items-center w-full px-3 py-3 text-sm font-medium rounded-lg transition-colors text-gray-700 hover:bg-green-50 hover:text-green-600"
                    disabled={isNavigating}
                >
                    <span className={`${isExpanded ? 'mr-3' : 'mx-auto'}`}><Power size={20} /></span>
                    {isExpanded && <span>Se déconnecter</span>}
                </button>
            </div>
        </div>
    );
};

export default Sidebar;