import React, { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { useSession, signOut } from 'next-auth/react';
import {
    LayoutDashboard,
    Users,
    MessageCircle,
    Calendar,
    Stethoscope,
    ClipboardCheck,
    Settings,
    HelpCircle,
    Power,
    ChevronLeft,
    ChevronRight,
    Edit3,
    Check,
    X,
    GripVertical,
    Activity,
    Bell,
    FileText,
} from 'lucide-react';
import { cn } from "@/lib/utils";

type MenuItem = {
    id: string;
    icon: React.ReactNode;
    label: string;
    path: string;
    comingSoon?: boolean;
};

const DoctorSidebar: React.FC = () => {
    const router = useRouter();
    const { } = useSession();
    const [isExpanded, setIsExpanded] = useState(false);
    const [isNavigating, setIsNavigating] = useState(false);
    const [lastNavigationTime, setLastNavigationTime] = useState(0);
    const [isEditMode, setIsEditMode] = useState(false);
    const [draggedItem, setDraggedItem] = useState<string | null>(null);
    const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

    // Default menu items with unique IDs for doctor dashboard
    const defaultMenuItems: MenuItem[] = [
        { id: 'dashboard', icon: <LayoutDashboard size={20} />, label: "Tableau de Bord", path: "/roles/doctor/dashboard" },
        { id: 'patients', icon: <Users size={20} />, label: "Mes Patients", path: "/roles/doctor/patients" },
        { id: 'diagnostics', icon: <Stethoscope size={20} />, label: "Diagnostics", path: "/roles/doctor/diagnostics" },
        { id: 'reports', icon: <FileText size={20} />, label: "Rapports", path: "/roles/doctor/reports", comingSoon: true },
        { id: 'notifications', icon: <Bell size={20} />, label: "Notifications", path: "/roles/doctor/notifications" },
        { id: 'chat', icon: <MessageCircle size={20} />, label: "Messages", path: "/roles/doctor/chat" },
        { id: 'help', icon: <HelpCircle size={20} />, label: "Aide & Support", path: "/roles/doctor/help" },
    ];

    const [menuItems, setMenuItems] = useState<MenuItem[]>(defaultMenuItems);

    // Store sidebar state and menu order in localStorage
    useEffect(() => {
        const savedState = localStorage.getItem('doctorSidebarExpanded');
        if (savedState !== null) {
            setIsExpanded(savedState === 'true');
        }

        // Load saved menu order
        const savedOrder = localStorage.getItem('doctorMenuItemsOrder');
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
        localStorage.setItem('doctorSidebarExpanded', String(newState));
    };

    const toggleEditMode = () => {
        setIsEditMode(!isEditMode);
        if (isEditMode) {
            // Save the current order when exiting edit mode
            const orderIds = menuItems.map(item => item.id);
            localStorage.setItem('doctorMenuItemsOrder', JSON.stringify(orderIds));
        }
    };

    const resetOrder = () => {
        setMenuItems(defaultMenuItems);
        localStorage.removeItem('doctorMenuItemsOrder');
        setIsEditMode(false);
    };

    // Navigation handler
    const handleNavigation = useCallback((path: string, comingSoon?: boolean) => {
        if (isEditMode || comingSoon) return; // Prevent navigation in edit mode or for coming soon items

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
            className={`flex flex-col h-full bg-white shadow-md transition-all duration-300 ${isExpanded ? 'w-64' : 'w-20'} relative border-r border-red-100`}
        >
            {/* Header with Logo and Toggle Button */}
            <div className="p-4 border-b border-red-100 flex justify-between items-center">
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
                className="absolute -right-4 top-20 bg-white rounded-full p-1.5 shadow-md border border-red-200 text-red-700 hover:bg-red-50 transition-colors z-10"
                aria-label={isExpanded ? "Collapse sidebar" : "Expand sidebar"}
            >
                {isExpanded ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
            </button>

            {/* Edit Mode Controls */}
            {isExpanded && (
                <div className="p-2 border-b border-red-100 flex items-center justify-between">
                    <button
                        onClick={toggleEditMode}
                        className={cn(
                            "flex items-center px-3 py-2 text-xs font-medium rounded-md transition-colors",
                            isEditMode
                                ? "bg-green-100 text-green-700 hover:bg-green-200"
                                : "bg-red-100 text-red-700 hover:bg-red-200"
                        )}
                    >
                        {isEditMode ? (
                            <>
                                <Check size={14} className="mr-1" />
                                Sauvegarder
                            </>
                        ) : (
                            <>
                                <Edit3 size={14} className="mr-1" />
                                Éditer Menu
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
            <nav className="flex-1 overflow-y-auto py-4">
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
                                onClick={() => !isEditMode && handleNavigation(item.path, item.comingSoon)}
                                className={cn(
                                    "flex items-center px-3 py-3 text-sm font-medium rounded-lg transition-all duration-200",
                                    isEditMode
                                        ? "cursor-grab active:cursor-grabbing hover:bg-red-50 border-2 border-transparent hover:border-red-200"
                                        : item.comingSoon
                                        ? "cursor-not-allowed opacity-60"
                                        : "cursor-pointer",
                                    !isEditMode && !item.comingSoon && (router.pathname === item.path || router.asPath === item.path)
                                        ? "bg-red-600 text-white shadow-md"
                                        : item.comingSoon
                                        ? "text-gray-500 bg-gray-50"
                                        : "text-gray-700 hover:bg-red-50 hover:text-red-700",
                                    draggedItem === item.id && "opacity-50 scale-105",
                                    dragOverIndex === index && draggedItem && draggedItem !== item.id && "border-t-4 border-red-500",
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
                                {isExpanded && (
                                    <div className="flex items-center justify-between flex-1">
                                        <span>{item.label}</span>
                                        {item.comingSoon && (
                                            <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-700 rounded-full border border-yellow-200">
                                                Bientôt
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>
                        </li>
                    ))}
                </ul>

                {/* Edit mode instructions */}
                {isEditMode && isExpanded && (
                    <div className="mt-4 px-4">
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                            <p className="text-xs text-red-700 font-medium mb-1">Mode Édition Actif</p>
                            <p className="text-xs text-red-600">
                                Glissez-déposez les éléments pour les réorganiser. Cliquez sur "Sauvegarder" quand vous avez terminé.
                            </p>
                        </div>
                    </div>
                )}
            </nav>

            {/* Footer */}
            <div className="p-2 border-t border-red-100">
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
                            : "text-gray-700 hover:bg-red-50 hover:text-red-700"
                    )}
                    disabled={isNavigating || isEditMode}
                >
                    <span className={`${isExpanded ? 'mr-3' : 'mx-auto'}`}><Power size={20} /></span>
                    {isExpanded && <span>Déconnexion</span>}
                </button>
            </div>
        </div>
    );
};

export default DoctorSidebar;