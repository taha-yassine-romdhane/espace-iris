import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { useSession, signOut } from 'next-auth/react';
import {
    LayoutDashboard,
    Clipboard,
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
    Edit3,
    Check,
    X,
    GripVertical,
    User,
    MessageCircle,
    Calendar,
    FileText,
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
    const [isEditMode, setIsEditMode] = useState(false);
    const [draggedItem, setDraggedItem] = useState<string | null>(null);
    const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

    // Default menu items with unique IDs
    const defaultMenuItems: MenuItem[] = [
        { id: 'dashboard', icon: <LayoutDashboard size={20} />, label: "Tableau de Bord", path: "/roles/employee/dashboard" },
        { id: 'rdv', icon: <Calendar size={20} />, label: "Rendez-vous", path: "/roles/employee/appointments" },
        { id: 'manual-tasks', icon: <ListTodo size={20} />, label: "Mes Tâches", path: "/roles/employee/manual-tasks" },
        { id: 'renseignement', icon: <Users size={20} />, label: "Renseignement", path: "/roles/employee/renseignement" },
        { id: 'diagnostics', icon: <SquareActivity size={20} />, label: "Diagnostique", path: "/roles/employee/diagnostics" },
        { id: 'sales', icon: <ShoppingCart size={20} />, label: "Vente", path: "/roles/employee/sales" },
        { id: 'rentals', icon: <CalendarClock size={20} />, label: "Locations", path: "/roles/employee/rentals" },
        { id: 'calendar', icon: <Calendar size={20} />, label: "Calendrier", path: "/roles/employee/tasks/modern" },
        { id: 'stock', icon: <Box size={20} />, label: "Stock", path: "/roles/employee/stock" },
        { id: 'map', icon: <MapPin size={20} />, label: "Carte", path: "/roles/employee/map" },
        { id: 'notifications', icon: <Bell size={20} />, label: "Notifications", path: "/roles/employee/notifications" },
        { id: 'chat', icon: <MessageCircle size={20} />, label: "Messages", path: "/roles/employee/chat" },
        { id: 'history', icon: <History size={20} />, label: "Historique", path: "/roles/employee/history" },
    ];

    const [menuItems, setMenuItems] = useState<MenuItem[]>(defaultMenuItems);

    // Store sidebar state and menu order in localStorage
    useEffect(() => {
        const savedState = localStorage.getItem('employeeSidebarExpanded');
        if (savedState !== null) {
            setIsExpanded(savedState === 'true');
        }

        // Load saved menu order
        const savedOrder = localStorage.getItem('employeeMenuItemsOrder');
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
        localStorage.setItem('employeeSidebarExpanded', String(newState));
    };

    const toggleEditMode = () => {
        if (isEditMode) {
            // Save the current order when exiting edit mode
            const currentOrder = menuItems.map(item => item.id);
            localStorage.setItem('employeeMenuItemsOrder', JSON.stringify(currentOrder));
        }
        setIsEditMode(!isEditMode);
    };

    const resetOrder = () => {
        setMenuItems([...defaultMenuItems]);
        localStorage.removeItem('employeeMenuItemsOrder');
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

    // Drag and drop handlers
    const handleDragStart = (e: React.DragEvent, itemId: string) => {
        if (!isEditMode) return;
        
        setDraggedItem(itemId);
        
        // Set ghost drag image (optional)
        if (e.dataTransfer) {
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', itemId);
        }
    };

    const handleDragEnd = (e: React.DragEvent) => {
        setDraggedItem(null);
        setDragOverIndex(null);
        
        // Remove any visual indicators
        document.querySelectorAll('.drag-over').forEach(el => {
            el.classList.remove('drag-over');
        });
    };

    const handleDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault();
        setDragOverIndex(index);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        
        // Only reset if we're leaving the container, not just moving between items
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
            setDragOverIndex(null);
        }
    };

    const handleDrop = (e: React.DragEvent, dropIndex: number) => {
        e.preventDefault();
        
        if (!draggedItem || !isEditMode) return;
        
        const dragIndex = menuItems.findIndex(item => item.id === draggedItem);
        if (dragIndex === -1 || dragIndex === dropIndex) return;
        
        // Create a new array with the item moved to the new position
        const updatedItems = [...menuItems];
        const [movedItem] = updatedItems.splice(dragIndex, 1);
        updatedItems.splice(dropIndex, 0, movedItem);
        
        setMenuItems(updatedItems);
        setDraggedItem(null);
        setDragOverIndex(null);
    };

    return (
        <div className={cn(
            "relative flex flex-col h-full bg-white shadow-md transition-all duration-300 ease-in-out",
            isExpanded ? "w-64 tablet:w-72 tablet-lg:w-80" : "w-20 tablet:w-24"
        )}>
            <button
                onClick={toggleSidebar}
                className="absolute -right-3 top-16 bg-white border-2 border-gray-200 rounded-full p-1 shadow-md hover:bg-gray-50 transition-all duration-300 z-10"
                aria-label={isExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
            >
                {isExpanded ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
            </button>

            {/* Header with Logo */}
            <div className="p-4 border-b border-gray-100 flex justify-center items-center h-20">
                <div className="transition-opacity duration-300 ease-in-out">
                {isExpanded ? (
                    <Image
                        src="/logo_No_BG.png"
                        alt="Elite Santé Logo"
                        width={150}
                        height={60}
                        priority
                        className="object-contain h-auto"
                    />
                ) : (
                     <Image
                        src="/logo_No_BG.png"
                        alt="Elite Santé Logo"
                        width={32}
                        height={32}
                        priority
                        className="object-contain h-auto"
                    />
                )}
                </div>
            </div>

            {/* Edit mode controls */}
            {isExpanded && (
                <div className="px-4 py-2 border-b border-gray-100 flex justify-between items-center">
                    <button
                        onClick={toggleEditMode}
                        className={cn(
                            "flex items-center text-xs font-medium px-2 py-1 rounded-md transition-colors",
                            isEditMode ? "bg-green-600 text-white" : "text-gray-600 border border-gray-200 hover:bg-green-50"
                        )}
                    >
                        {isEditMode ? (
                            <>
                                <Check size={14} className="mr-1" /> Save Order
                            </>
                        ) : (
                            <>
                                <Edit3 size={14} className="mr-1" /> Edit Menu
                            </>
                        )}
                    </button>
                    
                    {isEditMode && (
                        <button
                            onClick={resetOrder}
                            className="flex items-center text-xs font-medium px-2 py-1 rounded-md text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors"
                        >
                            <X size={14} className="mr-1" /> Reset
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
                                        ? "cursor-grab active:cursor-grabbing hover:bg-green-50 border-2 border-transparent hover:border-green-200"
                                        : "cursor-pointer",
                                    !isEditMode && router.pathname.startsWith(item.path)
                                        ? "bg-green-600 text-white shadow-sm"
                                        : "text-gray-700 hover:bg-green-50 hover:text-green-600",
                                    draggedItem === item.id && "opacity-50 scale-105",
                                    dragOverIndex === index && draggedItem && draggedItem !== item.id && "border-t-4 border-green-500",
                                    isEditMode && "select-none"
                                )}
                                style={{
                                    transform: draggedItem === item.id ? 'rotate(2deg)' : 'none',
                                }}
                            >
                                {isEditMode && isExpanded && (
                                    <GripVertical size={16} className="mr-2 text-gray-400" />
                                )}
                                <span className={`${isExpanded && !isEditMode ? 'mr-3' : isExpanded ? 'mr-3' : 'mx-auto'}`}>
                                    {item.icon}
                                </span>
                                {isExpanded && <span className="flex-1">{item.label}</span>}
                            </div>
                        </li>
                    ))}
                </ul>

                {/* Edit mode instructions */}
                {isEditMode && isExpanded && (
                    <div className="mt-4 px-4">
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                            <p className="text-xs text-green-700 font-medium mb-1">Mode d'édition actif</p>
                            <p className="text-xs text-green-600">
                                Glissez et déposez les éléments du menu pour les réorganiser. Cliquez sur "Enregistrer l'ordre" lorsque vous avez terminé.
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
                            : "text-gray-700 hover:bg-green-50 hover:text-green-600"
                    )}
                    disabled={isNavigating || isEditMode}
                >
                    <span className={`${isExpanded ? 'mr-3' : 'mx-auto'}`}><Power size={20} /></span>
                    {isExpanded && <span>Se déconnecter</span>}
                </button>
            </div>
        </div>
    );
};

export default Sidebar;