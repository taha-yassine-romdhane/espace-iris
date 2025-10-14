import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Calendar, User, Filter,
  RefreshCw, FileText, Stethoscope, ShoppingCart, Wrench, 
  AlertCircle, Archive, Users
} from 'lucide-react';
import { cn } from '@/lib/utils';
import AdminLayout from '../AdminLayout';
import { useSession } from 'next-auth/react';
import axios from 'axios';

// Types based on your Prisma schema
interface KanbanItem {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority?: string;
  createdAt: string;
  updatedAt: string;
  assignedTo?: {
    firstName: string;
    lastName: string;
    email: string;
  };
  patient?: {
    firstName: string;
    lastName: string;
    telephone?: string;
  };
  company?: {
    companyName: string;
    telephone?: string;
  };
  medicalDevice?: {
    name: string;
    type: string;
  };
  // Additional fields based on type
  dueDate?: string;
  scheduledDate?: string;
  saleDate?: string;
  totalAmount?: number;
  invoiceNumber?: string;
  diagnosticDate?: string;
  requestedQuantity?: number;
  urgency?: string;
  dossierNumber?: string;
  bondAmount?: number;
  type?: string;
  message?: string;
  isRead?: boolean;
}

interface Column {
  id: string;
  title: string;
  color: string;
  items: KanbanItem[];
}

interface KanbanMetadata {
  users: Array<{
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
  }>;
  stockLocations: Array<{
    id: string;
    name: string;
    description?: string;
  }>;
  products: Array<{
    id: string;
    name: string;
    type: string;
    brand?: string;
  }>;
  medicalDevices: Array<{
    id: string;
    name: string;
    type: string;
    brand?: string;
  }>;
}

const KANBAN_TYPES = {
  tasks: {
    title: 'Tâches',
    icon: <FileText className="h-4 w-4" />,
    statuses: [
      { id: 'TODO', title: 'À faire', color: 'bg-gray-50 border-gray-200' },
      { id: 'IN_PROGRESS', title: 'En cours', color: 'bg-blue-50 border-blue-200' },
      { id: 'COMPLETED', title: 'Terminé', color: 'bg-green-50 border-green-200' }
    ]
  },
  appointments: {
    title: 'Rendez-vous',
    icon: <Calendar className="h-4 w-4" />,
    statuses: [
      { id: 'SCHEDULED', title: 'Planifié', color: 'bg-gray-50 border-gray-200' },
      { id: 'CONFIRMED', title: 'Confirmé', color: 'bg-blue-50 border-blue-200' },
      { id: 'COMPLETED', title: 'Terminé', color: 'bg-green-50 border-green-200' },
      { id: 'CANCELLED', title: 'Annulé', color: 'bg-red-50 border-red-200' },
      { id: 'RESCHEDULED', title: 'Reporté', color: 'bg-yellow-50 border-yellow-200' }
    ]
  },
  diagnostics: {
    title: 'Diagnostics',
    icon: <Stethoscope className="h-4 w-4" />,
    statuses: [
      { id: 'PENDING', title: 'En attente', color: 'bg-yellow-50 border-yellow-200' },
      { id: 'COMPLETED', title: 'Terminé', color: 'bg-green-50 border-green-200' },
      { id: 'CANCELLED', title: 'Annulé', color: 'bg-red-50 border-red-200' }
    ]
  },
  sales: {
    title: 'Ventes',
    icon: <ShoppingCart className="h-4 w-4" />,
    statuses: [
      { id: 'PENDING', title: 'En attente', color: 'bg-gray-50 border-gray-200' },
      { id: 'ON_PROGRESS', title: 'En cours', color: 'bg-blue-50 border-blue-200' },
      { id: 'COMPLETED', title: 'Terminé', color: 'bg-green-50 border-green-200' },
      { id: 'CANCELLED', title: 'Annulé', color: 'bg-red-50 border-red-200' },
      { id: 'RETURNED', title: 'Retourné', color: 'bg-orange-50 border-orange-200' }
    ]
  },
  rentals: {
    title: 'Locations',
    icon: <Archive className="h-4 w-4" />,
    statuses: [
      { id: 'PENDING', title: 'En attente', color: 'bg-gray-50 border-gray-200' },
      { id: 'ACTIVE', title: 'Actif', color: 'bg-green-50 border-green-200' },
      { id: 'COMPLETED', title: 'Terminé', color: 'bg-blue-50 border-blue-200' },
      { id: 'CANCELLED', title: 'Annulé', color: 'bg-red-50 border-red-200' },
      { id: 'EXPIRED', title: 'Expiré', color: 'bg-orange-50 border-orange-200' },
      { id: 'PAUSED', title: 'En pause', color: 'bg-yellow-50 border-yellow-200' }
    ]
  },
  stockRequests: {
    title: 'Demandes de Stock',
    icon: <Wrench className="h-4 w-4" />,
    statuses: [
      { id: 'PENDING', title: 'En attente', color: 'bg-yellow-50 border-yellow-200' },
      { id: 'APPROVED', title: 'Approuvé', color: 'bg-green-50 border-green-200' },
      { id: 'REJECTED', title: 'Rejeté', color: 'bg-red-50 border-red-200' },
      { id: 'COMPLETED', title: 'Terminé', color: 'bg-blue-50 border-blue-200' }
    ]
  },
  cnamDossiers: {
    title: 'Dossiers CNAM',
    icon: <FileText className="h-4 w-4" />,
    statuses: [
      { id: 'EN_ATTENTE_APPROBATION', title: 'En attente', color: 'bg-yellow-50 border-yellow-200' },
      { id: 'APPROUVE', title: 'Approuvé', color: 'bg-green-50 border-green-200' },
      { id: 'EN_COURS', title: 'En cours', color: 'bg-blue-50 border-blue-200' },
      { id: 'TERMINE', title: 'Terminé', color: 'bg-gray-50 border-gray-200' },
      { id: 'REFUSE', title: 'Refusé', color: 'bg-red-50 border-red-200' }
    ]
  },
  notifications: {
    title: 'Notifications',
    icon: <AlertCircle className="h-4 w-4" />,
    statuses: [
      { id: 'PENDING', title: 'En attente', color: 'bg-yellow-50 border-yellow-200' },
      { id: 'READ', title: 'Lu', color: 'bg-blue-50 border-blue-200' },
      { id: 'COMPLETED', title: 'Terminé', color: 'bg-green-50 border-green-200' },
      { id: 'DISMISSED', title: 'Ignoré', color: 'bg-gray-50 border-gray-200' }
    ]
  }
};

function KanbanPage() {
  const { data: session } = useSession();
  const [currentType, setCurrentType] = useState<keyof typeof KANBAN_TYPES>('tasks');
  const [columns, setColumns] = useState<Column[]>([]);
  const [loading, setLoading] = useState(false);
  const [metadata, setMetadata] = useState<KanbanMetadata | null>(null);
  
  // Filters
  const [filters, setFilters] = useState({
    userId: 'all',
    assignedTo: 'all',
    priority: 'all',
    search: '',
    dueDate: ''
  });
  
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    loadMetadata();
  }, []);

  useEffect(() => {
    loadKanbanData();
  }, [currentType, filters]);

  const loadMetadata = async () => {
    try {
      const response = await axios.get('/api/kanban/metadata');
      setMetadata(response.data);
    } catch (error) {
      console.error('Error loading metadata:', error);
    }
  };

  const loadKanbanData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        type: currentType,
        ...Object.fromEntries(
          Object.entries(filters).filter(([_, value]) => value && value !== 'all')
        )
      });
      
      const response = await axios.get(`/api/kanban?${params}`);
      const items = response.data || [];
      
      // Group items by status
      const statuses = KANBAN_TYPES[currentType].statuses;
      const groupedColumns = statuses.map(status => ({
        id: status.id,
        title: status.title,
        color: status.color,
        items: items.filter((item: KanbanItem) => item.status === status.id)
      }));
      
      setColumns(groupedColumns);
    } catch (error) {
      console.error('Error loading kanban data:', error);
      setColumns([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;

    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    // Find the item that was moved
    const sourceColumn = columns.find(col => col.id === source.droppableId);
    const destColumn = columns.find(col => col.id === destination.droppableId);
    
    if (!sourceColumn || !destColumn) return;

    const item = sourceColumn.items.find(item => item.id === draggableId);
    if (!item) return;

    // Optimistically update the UI
    setColumns(prevColumns => {
      return prevColumns.map(column => {
        if (column.id === source.droppableId) {
          return {
            ...column,
            items: column.items.filter(item => item.id !== draggableId)
          };
        }
        if (column.id === destination.droppableId) {
          const newItems = [...column.items];
          newItems.splice(destination.index, 0, { ...item, status: destination.droppableId });
          return {
            ...column,
            items: newItems
          };
        }
        return column;
      });
    });

    // Update the server
    try {
      await axios.put('/api/kanban', {
        id: draggableId,
        status: destination.droppableId,
        type: currentType
      });
    } catch (error) {
      console.error('Error updating item status:', error);
      // Revert the optimistic update
      loadKanbanData();
    }
  };

  const formatItemData = (item: KanbanItem) => {
    const baseData = {
      title: getItemTitle(item),
      description: getItemDescription(item),
      badge: getItemBadge(item),
      metadata: getItemMetadata(item),
      priority: getItemPriority(item)
    };
    
    return baseData;
  };

  const getItemTitle = (item: KanbanItem): string => {
    switch (currentType) {
      case 'tasks':
        return item.title || 'Tâche sans titre';
      case 'appointments':
        return `RDV ${item.patient ? `${item.patient.firstName} ${item.patient.lastName}` : 
                     item.company ? item.company.companyName : 'Client'}`;
      case 'diagnostics':
        return `Diagnostic ${item.patient ? `${item.patient.firstName} ${item.patient.lastName}` : 'Patient'}`;
      case 'sales':
        return `Vente ${item.invoiceNumber || item.id.slice(0, 8)}`;
      case 'rentals':
        return `Location ${item.medicalDevice?.name || 'Appareil'}`;
      case 'stockRequests':
        return `Demande de stock`;
      case 'cnamDossiers':
        return `Dossier ${item.dossierNumber || item.id.slice(0, 8)}`;
      case 'notifications':
        return item.title || 'Notification';
      default:
        return 'Item';
    }
  };

  const getItemDescription = (item: KanbanItem): string => {
    switch (currentType) {
      case 'tasks':
        return item.description || '';
      case 'appointments':
        return `${item.scheduledDate ? new Date(item.scheduledDate).toLocaleDateString('fr-FR') : ''} - ${item.description || ''}`;
      case 'diagnostics':
        return `${item.medicalDevice?.name || ''} - ${item.diagnosticDate ? new Date(item.diagnosticDate).toLocaleDateString('fr-FR') : ''}`;
      case 'sales':
        return `Montant: ${item.totalAmount ? `${item.totalAmount}€` : 'N/A'}`;
      case 'rentals':
        return `${item.medicalDevice?.name || ''} - ${item.patient?.firstName} ${item.patient?.lastName}`;
      case 'stockRequests':
        return `Quantité: ${item.requestedQuantity || 0}`;
      case 'cnamDossiers':
        return `Montant: ${item.bondAmount ? `${item.bondAmount}€` : 'N/A'}`;
      case 'notifications':
        return item.message || item.description || '';
      default:
        return item.description || '';
    }
  };

  const getItemBadge = (item: KanbanItem) => {
    switch (currentType) {
      case 'tasks':
        return {
          text: item.priority === 'HIGH' ? 'Élevée' : item.priority === 'MEDIUM' ? 'Moyenne' : 'Faible',
          className: item.priority === 'HIGH' ? 'bg-red-100 text-red-800' : 
                    item.priority === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'
        };
      case 'appointments':
        return {
          text: item.priority === 'URGENT' ? 'Urgent' : item.priority === 'HIGH' ? 'Élevée' : 
                item.priority === 'NORMAL' ? 'Normal' : 'Faible',
          className: item.priority === 'URGENT' || item.priority === 'HIGH' ? 'bg-red-100 text-red-800' : 
                    item.priority === 'NORMAL' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
        };
      case 'stockRequests':
        return {
          text: item.urgency === 'HIGH' ? 'Urgent' : item.urgency === 'MEDIUM' ? 'Moyen' : 'Faible',
          className: item.urgency === 'HIGH' ? 'bg-red-100 text-red-800' : 
                    item.urgency === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'
        };
      default:
        return null;
    }
  };

  const getItemMetadata = (item: KanbanItem) => {
    const metadata = [];
    
    if (item.assignedTo) {
      metadata.push({
        icon: <User className="h-3 w-3" />,
        text: `${item.assignedTo.firstName} ${item.assignedTo.lastName}`
      });
    }
    
    if (item.patient) {
      metadata.push({
        icon: <Users className="h-3 w-3" />,
        text: `${item.patient.firstName} ${item.patient.lastName}`
      });
    }
    
    if (item.company) {
      metadata.push({
        icon: <Users className="h-3 w-3" />,
        text: item.company.companyName
      });
    }
    
    const dateField = item.dueDate || item.scheduledDate || item.saleDate || item.diagnosticDate;
    if (dateField) {
      metadata.push({
        icon: <Calendar className="h-3 w-3" />,
        text: new Date(dateField).toLocaleDateString('fr-FR')
      });
    }
    
    return metadata;
  };

  const getItemPriority = (item: KanbanItem): 'low' | 'medium' | 'high' => {
    if (item.priority === 'HIGH' || item.priority === 'URGENT') return 'high';
    if (item.priority === 'MEDIUM' || item.priority === 'NORMAL') return 'medium';
    return 'low';
  };

  const resetFilters = () => {
    setFilters({
      userId: 'all',
      assignedTo: 'all',
      priority: 'all',
      search: '',
      dueDate: ''
    });
  };

  return (
    <div className="container mx-auto py-6 px-4">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-blue-900">Vue Kanban</h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2"
          >
            <Filter className="h-4 w-4" />
            Filtres
          </Button>
          <Button onClick={loadKanbanData} className="flex items-center gap-2">
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            Actualiser
          </Button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div>
                <label className="text-sm font-medium">Recherche</label>
                <Input
                  placeholder="Rechercher..."
                  value={filters.search}
                  onChange={(e) => setFilters({...filters, search: e.target.value})}
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">Utilisateur</label>
                <Select value={filters.userId} onValueChange={(value) => setFilters({...filters, userId: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Tous les utilisateurs" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les utilisateurs</SelectItem>
                    {metadata?.users.map(user => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.firstName} {user.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">Assigné à</label>
                <Select value={filters.assignedTo} onValueChange={(value) => setFilters({...filters, assignedTo: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Tous" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous</SelectItem>
                    {metadata?.users.map(user => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.firstName} {user.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">Priorité</label>
                <Select value={filters.priority} onValueChange={(value) => setFilters({...filters, priority: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Toutes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes</SelectItem>
                    <SelectItem value="LOW">Faible</SelectItem>
                    <SelectItem value="MEDIUM">Moyenne</SelectItem>
                    <SelectItem value="HIGH">Élevée</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end">
                <Button variant="outline" onClick={resetFilters}>
                  Réinitialiser
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Kanban Type Tabs */}
      <Tabs value={currentType} onValueChange={(value) => setCurrentType(value as keyof typeof KANBAN_TYPES)} className="mb-6">
        <TabsList className="grid grid-cols-4 lg:grid-cols-8 h-auto">
          {Object.entries(KANBAN_TYPES).map(([key, config]) => (
            <TabsTrigger key={key} value={key} className="flex items-center gap-2 p-2">
              {config.icon}
              <span className="hidden sm:inline">{config.title}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {Object.entries(KANBAN_TYPES).map(([key, config]) => (
          <TabsContent key={key} value={key}>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
                <span className="ml-2">Chargement...</span>
              </div>
            ) : (
              <DragDropContext onDragEnd={handleDragEnd}>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
                  {columns.map(column => (
                    <div key={column.id} className="flex flex-col">
                      <div className="mb-4">
                        <h2 className="font-semibold text-lg text-gray-700 mb-2">
                          {column.title}
                          <span className="ml-2 text-sm text-gray-500">
                            ({column.items.length})
                          </span>
                        </h2>
                      </div>

                      <Droppable droppableId={column.id}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                            className={cn(
                              "flex-1 p-4 rounded-lg border-2 border-dashed transition-colors min-h-[200px]",
                              column.color,
                              snapshot.isDraggingOver && "border-blue-400 bg-blue-50"
                            )}
                          >
                            <div className="space-y-3">
                              {column.items.map((item, index) => {
                                const formattedItem = formatItemData(item);
                                return (
                                  <Draggable key={item.id} draggableId={item.id} index={index}>
                                    {(provided, snapshot) => (
                                      <Card
                                        ref={provided.innerRef}
                                        {...provided.draggableProps}
                                        {...provided.dragHandleProps}
                                        className={cn(
                                          "cursor-grab active:cursor-grabbing",
                                          snapshot.isDragging && "rotate-1 shadow-lg"
                                        )}
                                      >
                                        <CardContent className="p-4">
                                          <div className="flex justify-between items-start mb-2">
                                            <h3 className="font-medium text-sm line-clamp-2">
                                              {formattedItem.title}
                                            </h3>
                                          </div>
                                          
                                          {formattedItem.description && (
                                            <p className="text-xs text-gray-600 mb-3 line-clamp-3">
                                              {formattedItem.description}
                                            </p>
                                          )}
                                          
                                          <div className="flex flex-wrap gap-1 mb-2">
                                            {formattedItem.badge && (
                                              <Badge className={cn("text-xs", formattedItem.badge.className)}>
                                                {formattedItem.badge.text}
                                              </Badge>
                                            )}
                                          </div>

                                          <div className="space-y-1">
                                            {formattedItem.metadata.map((meta, idx) => (
                                              <div key={idx} className="flex items-center text-xs text-gray-500">
                                                {meta.icon}
                                                <span className="ml-1 truncate">{meta.text}</span>
                                              </div>
                                            ))}
                                          </div>
                                        </CardContent>
                                      </Card>
                                    )}
                                  </Draggable>
                                );
                              })}
                            </div>
                            {provided.placeholder}
                          </div>
                        )}
                      </Droppable>
                    </div>
                  ))}
                </div>
              </DragDropContext>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

KanbanPage.getLayout = function getLayout(page: React.ReactElement) {
  return <AdminLayout>{page}</AdminLayout>;
};

export default KanbanPage;