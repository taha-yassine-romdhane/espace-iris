import React, { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { useSession, signOut } from 'next-auth/react';
import { useQuery } from '@tanstack/react-query';
import {
    LayoutDashboard,
    BriefcaseMedical,
    Settings,
    HelpCircle,
    Power,
    UserCog,
    ChevronLeft,
    ChevronRight,
    ContactRound,
    CalendarCheck,
    ClipboardCheck,
    Database,
    Wrench,
    Users,
    Edit3,
    Check,
    X,
    GripVertical,
    MapPin,
    BarChart3,
    MessageCircle,
    Kanban,
    FileSpreadsheet,
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
    const [isEditMode, setIsEditMode] = useState(false);
    const [draggedItem, setDraggedItem] = useState<string | null>(null);
    const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

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
        { id: 'tasks', icon: <CalendarCheck size={20} />, label: "Gestion des taches", path: "/roles/admin/tasks/modern" },
        { id: 'kanban', icon: <Kanban size={20} />, label: "Vue Kanban", path: "/roles/admin/kanban" },
        { id: 'notifications', icon: <ClipboardCheck size={20} />, label: "Gestion des Notifications", path: "/roles/admin/notifications" },
        { id: 'chat', icon: <MessageCircle size={20} />, label: "Messages", path: "/roles/admin/chat" },
        { id: 'users', icon: <ContactRound size={20} />, label: "Utilisateurs", path: "/roles/admin/users" },
        { id: 'espace-technicien', icon: <UserCog size={20} />, label: "Espace Technicien", path: "/roles/admin/espace-technicien" },
        { id: 'renseignement', icon: <Users size={20} />, label: "Renseignement", path: "/roles/admin/renseignement" },
        { id: 'map', icon: <MapPin size={20} />, label: "Carte des Patients", path: "/roles/admin/map" },
        { id: 'appareils', icon: <BriefcaseMedical size={20} />, label: "Gestion des Produits", path: "/roles/admin/appareils" },
        { id: 'reparateur', icon: <Wrench size={20} />, label: "Gestion des Réparateurs", path: "/roles/admin/reparateur" },
        { id: 'stock', icon: <Database size={20} />, label: "Gestion des Stocks", path: "/roles/admin/stock" },
        { id: 'cnam-management', icon: <Shield size={20} />, label: "Gestion CNAM", path: "/roles/admin/cnam-management" },
        { id: 'excel-import', icon: <FileSpreadsheet size={20} />, label: "Import/Export Excel", path: "/roles/admin/excel-import" },
        { id: 'help', icon: <HelpCircle size={20} />, label: "Aide et Support", path: "/roles/admin/help" },
        { id: 'settings', icon: <Settings size={20} />, label: "Paramètres", path: "/roles/admin/settings" },
    ];

    const [menuItems, setMenuItems] = useState<MenuItem[]>(defaultMenuItems);

    // Store sidebar state and menu order in localStorage
    useEffect(() => {
        const savedState = localStorage.getItem('sidebarExpanded');
        if (savedState !== null) {
            setIsExpanded(savedState === 'true');
        }

        // Load saved menu order
        const savedOrder = localStorage.getItem('menuItemsOrder');
        if (savedOrder) {
            try {
                const orderIds = JSON.parse(savedOrder);
                const reorderedItems = orderIds.map((id: string) =>
                    defaultMenuItems.find(item => item.id === id)
                ).filter(Boolean);

                // Add any new items that weren't in the saved order
                const existingIds = new Set(orderIds);
                const newItems = defaultMenuItems.filter(item => !existingIds.has(item.id));

                setMenuItems([...reorderedItems, ...newItems]);
            } catch (error) {
                console.error('Error loading menu order:', error);
                setMenuItems(defaultMenuItems);
            }
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

    const toggleEditMode = () => {
        setIsEditMode(!isEditMode);
        if (isEditMode) {
            // Save the current order when exiting edit mode
            const orderIds = menuItems.map(item => item.id);
            localStorage.setItem('menuItemsOrder', JSON.stringify(orderIds));
        }
    };

    const resetOrder = () => {
        setMenuItems(defaultMenuItems);
        localStorage.removeItem('menuItemsOrder');
        setIsEditMode(false);
    };

    // Navigation handler
    const handleNavigation = useCallback((path: string) => {
        if (isEditMode) return; // Prevent navigation in edit mode

        const now = Date.now();

        // Prevent navigation if already navigating or if less than 300ms since last navigation
        if (isNavigating || (now - lastNavigationTime < 300)) {
            return;
        }

        setLastNavigationTime(now);
        router.push(path);
    }, [isEditMode, isNavigating, lastNavigationTime, router]);

    // Drag and drop handlers
    const handleDragStart = (e: React.DragEvent, itemId: string) => {
        setDraggedItem(itemId);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/html', itemId);

        // Add drag styling
        if (e.currentTarget instanceof HTMLElement) {
            e.currentTarget.style.opacity = '0.5';
        }
    };

    const handleDragEnd = (e: React.DragEvent) => {
        setDraggedItem(null);
        setDragOverIndex(null);

        // Reset drag styling
        if (e.currentTarget instanceof HTMLElement) {
            e.currentTarget.style.opacity = '1';
        }
    };

    const handleDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setDragOverIndex(index);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        // Only reset if we're leaving the entire item, not just moving between child elements
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
            setDragOverIndex(null);
        }
    };

    const handleDrop = (e: React.DragEvent, dropIndex: number) => {
        e.preventDefault();

        if (!draggedItem) return;

        const dragIndex = menuItems.findIndex(item => item.id === draggedItem);
        if (dragIndex === -1 || dragIndex === dropIndex) return;

        // Create new array with reordered items
        const newItems = [...menuItems];
        const [draggedMenuItem] = newItems.splice(dragIndex, 1);
        newItems.splice(dropIndex, 0, draggedMenuItem);

        setMenuItems(newItems);
        setDraggedItem(null);
        setDragOverIndex(null);
    };

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

            {/* Edit Mode Controls */}
            {isExpanded && (
                <div className="p-2 border-b border-gray-100 flex items-center justify-between">
                    <button
                        onClick={toggleEditMode}
                        className={cn(
                            "flex items-center px-3 py-2 text-xs font-medium rounded-md transition-colors",
                            isEditMode
                                ? "bg-green-100 text-green-700 hover:bg-green-200"
                                : "bg-blue-100 text-blue-700 hover:bg-blue-200"
                        )}
                    >
                        {isEditMode ? (
                            <>
                                <Check size={14} className="mr-1" />
                                Save Order
                            </>
                        ) : (
                            <>
                                <Edit3 size={14} className="mr-1" />
                                Edit Menu
                            </>
                        )}
                    </button>

                    {isEditMode && (
                        <button
                            onClick={resetOrder}
                            className="flex items-center px-3 py-2 text-xs font-medium text-red-700 bg-red-100 rounded-md hover:bg-red-200 transition-colors"
                        >
                            <X size={14} className="mr-1" />
                            Reset
                        </button>
                    )}
                </div>
            )}

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto py-4 scrollbar-hide">
                <ul className="space-y-1 px-2">
                    {menuItems.map((item, index) => (
                        <li key={item.id}>
                            <div
                                draggable={isEditMode}
                                onDragStart={(e) => handleDragStart(e, item.id)}
                                onDragEnd={handleDragEnd}
                                onDragOver={(e) => handleDragOver(e, index)}
                                onDragLeave={handleDragLeave}
                                onDrop={(e) => handleDrop(e, index)}
                                onClick={() => !isEditMode && handleNavigation(item.path)}
                                className={cn(
                                    "flex items-center px-3 py-3 text-sm font-medium rounded-lg transition-all duration-200",
                                    isEditMode
                                        ? "cursor-grab active:cursor-grabbing hover:bg-blue-50 border-2 border-transparent hover:border-blue-200"
                                        : "cursor-pointer",
                                    !isEditMode && (router.pathname === item.path || router.asPath === item.path)
                                        ? "bg-[#1e3a8a] text-white"
                                        : "text-gray-700 hover:bg-gray-50 hover:text-[#1e3a8a]",
                                    draggedItem === item.id && "opacity-50 scale-105",
                                    dragOverIndex === index && draggedItem && draggedItem !== item.id && "border-t-4 border-blue-500",
                                    isEditMode && "select-none"
                                )}
                                style={{
                                    transform: draggedItem === item.id ? 'rotate(2deg)' : 'none',
                                }}
                            >
                                {isEditMode && isExpanded && (
                                    <GripVertical size={16} className="mr-2 text-gray-400" />
                                )}
                                <span className={`${isExpanded && !isEditMode ? 'mr-3' : isExpanded ? 'mr-3' : 'mx-auto'} relative`}>
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

                {/* Edit mode instructions */}
                {isEditMode && isExpanded && (
                    <div className="mt-4 px-4">
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                            <p className="text-xs text-blue-700 font-medium mb-1">Edit Mode Active</p>
                            <p className="text-xs text-blue-600">
                                Drag and drop menu items to reorder them. Click "Save Order" when finished.
                            </p>
                        </div>
                    </div>
                )}
            </nav>

            {/* Footer */}
            <div className="p-2 border-t border-gray-100">
                <button
                    onClick={() => {
                        // Prevent multiple rapid logout attempts and disable in edit mode
                        if (!isNavigating && !isEditMode) {
                            const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
                            signOut({ callbackUrl: `${baseUrl}/welcome` });
                        }
                    }}
                    className={cn(
                        "flex items-center w-full px-3 py-3 text-sm font-medium rounded-lg transition-colors",
                        isEditMode
                            ? "text-gray-400 cursor-not-allowed"
                            : "text-gray-700 hover:bg-gray-50 hover:text-[#1e3a8a]"
                    )}
                    disabled={isNavigating || isEditMode}
                >
                    <span className={`${isExpanded ? 'mr-3' : 'mx-auto'}`}><Power size={20} /></span>
                    {isExpanded && <span>Logout</span>}
                </button>
            </div>
        </div>
    );
};

export default Sidebar;