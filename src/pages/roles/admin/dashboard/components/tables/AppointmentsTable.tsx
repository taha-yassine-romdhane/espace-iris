import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Calendar,
  Clock,
  User,
  Building2,
  MapPin,
  Trash2,
  Loader2,
  Search,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  MoreVertical,
  Stethoscope,
  Home,
  Microscope,
  FileText,
  ShoppingCart,
  Package,
  Wrench,
  RotateCcw,
  ClipboardCheck,
} from "lucide-react";

interface AppointmentsTableProps {
  onViewDetails?: (id: string) => void;
}

export function AppointmentsTable({ onViewDetails }: AppointmentsTableProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [appointmentToDelete, setAppointmentToDelete] = useState<string | null>(null);
  const [filteredAppointments, setFilteredAppointments] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // Fetch appointments data
  const { data: appointments, isLoading } = useQuery({
    queryKey: ["appointments"],
    queryFn: async () => {
      try {
        const response = await fetch("/api/appointments");
        if (!response.ok) {
          throw new Error("Failed to fetch appointments");
        }
        const data = await response.json();
        return data.appointments || [];
      } catch (error) {
        console.error("Error fetching appointments:", error);
        return [];
      }
    },
  });

  // Initialize filtered appointments when data loads
  useEffect(() => {
    if (appointments) {
      setFilteredAppointments(appointments);
    }
  }, [appointments]);

  // Delete appointment mutation
  const deleteAppointment = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/appointments/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete appointment');
      }
      
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Rendez-vous supprimé",
        description: "Le rendez-vous a été supprimé avec succès.",
      });
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      setAppointmentToDelete(null);
    },
    onError: (error) => {
      console.error('Error deleting appointment:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le rendez-vous. Veuillez réessayer.",
        variant: "destructive",
      });
    }
  });

  // Update appointment status mutation
  const updateAppointmentStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const response = await fetch(`/api/appointments/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update appointment status');
      }
      
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Statut mis à jour",
        description: "Le statut du rendez-vous a été mis à jour avec succès.",
      });
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
    },
    onError: (error) => {
      console.error('Error updating appointment status:', error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le statut. Veuillez réessayer.",
        variant: "destructive",
      });
    }
  });

  // Format date function
  const formatDate = (dateString: string): string => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(date);
    } catch (error) {
      console.error('Error formatting date:', error);
      return dateString;
    }
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "SCHEDULED":
        return (
          <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200">
            <Clock className="h-3 w-3 mr-1" />
            Planifié
          </Badge>
        );
      case "CONFIRMED":
        return (
          <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Confirmé
          </Badge>
        );
      case "COMPLETED":
        return (
          <Badge variant="outline" className="bg-emerald-100 text-emerald-800 border-emerald-200">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Terminé
          </Badge>
        );
      case "CANCELLED":
        return (
          <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200">
            <XCircle className="h-3 w-3 mr-1" />
            Annulé
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="bg-gray-100 text-gray-800 border-gray-200">
            {status}
          </Badge>
        );
    }
  };

  // Get priority badge
  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "LOW":
        return <Badge variant="outline" className="bg-green-100 text-green-800">Faible</Badge>;
      case "NORMAL":
        return <Badge variant="outline" className="bg-blue-100 text-blue-800">Normal</Badge>;
      case "HIGH":
        return <Badge variant="outline" className="bg-orange-100 text-orange-800">Élevée</Badge>;
      case "URGENT":
        return <Badge variant="outline" className="bg-red-100 text-red-800">Urgent</Badge>;
      default:
        return <Badge variant="outline">{priority}</Badge>;
    }
  };

  // Get appointment type display
  const getAppointmentTypeDisplay = (type: string) => {
    switch (type) {
      case "DIAGNOSTIC_VISIT":
        return {
          label: "Visite Diagnostique",
          badge: "bg-purple-100 text-purple-800 border-purple-200",
          icon: <Home className="h-3 w-3" />
        };
      case "CONSULTATION":
        return {
          label: "Consultation",
          badge: "bg-blue-100 text-blue-800 border-blue-200",
          icon: <Stethoscope className="h-3 w-3" />
        };
      case "DIAGNOSTIC":
        return {
          label: "Diagnostic",
          badge: "bg-teal-100 text-teal-800 border-teal-200",
          icon: <Microscope className="h-3 w-3" />
        };
      case "LOCATION":
        return {
          label: "Location",
          badge: "bg-orange-100 text-orange-800 border-orange-200",
          icon: <Package className="h-3 w-3" />
        };
      case "VENTE":
        return {
          label: "Vente",
          badge: "bg-green-100 text-green-800 border-green-200",
          icon: <ShoppingCart className="h-3 w-3" />
        };
      case "MAINTENANCE":
        return {
          label: "Maintenance",
          badge: "bg-yellow-100 text-yellow-800 border-yellow-200",
          icon: <Wrench className="h-3 w-3" />
        };
      case "RECUPERATION":
        return {
          label: "Récupération",
          badge: "bg-indigo-100 text-indigo-800 border-indigo-200",
          icon: <RotateCcw className="h-3 w-3" />
        };
      default:
        return {
          label: type,
          badge: "bg-gray-100 text-gray-800 border-gray-200",
          icon: <FileText className="h-3 w-3" />
        };
    }
  };

  // Handle delete
  const handleDeleteClick = (id: string) => {
    setAppointmentToDelete(id);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (appointmentToDelete) {
      deleteAppointment.mutate(appointmentToDelete);
    }
    setIsDeleteDialogOpen(false);
  };

  const handleCancelDelete = () => {
    setAppointmentToDelete(null);
    setIsDeleteDialogOpen(false);
  };

  // Filter appointments
  useEffect(() => {
    if (!appointments) return;
    
    let filtered = appointments;

    // Apply search filter
    if (searchTerm.trim()) {
      filtered = filtered.filter((appointment: any) => {
        const clientName = appointment.patient 
          ? `${appointment.patient.firstName} ${appointment.patient.lastName}`
          : appointment.company?.companyName || "";
        
        const appointmentTypeLabel = getAppointmentTypeDisplay(appointment.appointmentType || '').label;
        const assignedToName = appointment.assignedTo 
          ? `${appointment.assignedTo.firstName} ${appointment.assignedTo.lastName}`
          : '';
        
        return (
          clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          appointment.appointmentCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          appointment.appointmentType?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          appointmentTypeLabel.toLowerCase().includes(searchTerm.toLowerCase()) ||
          appointment.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          assignedToName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          appointment.id.toString().includes(searchTerm)
        );
      });
    }

    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((appointment: any) => appointment.status === statusFilter);
    }

    // Apply type filter
    if (typeFilter !== "all") {
      filtered = filtered.filter((appointment: any) => appointment.appointmentType === typeFilter);
    }

    // Apply date filter
    if (dateFilter !== "all") {
      const today = new Date();
      const filterDate = new Date();
      
      switch (dateFilter) {
        case "today":
          filterDate.setHours(0, 0, 0, 0);
          filtered = filtered.filter((appointment: any) => {
            const appointmentDate = new Date(appointment.scheduledDate);
            appointmentDate.setHours(0, 0, 0, 0);
            return appointmentDate.getTime() === filterDate.getTime();
          });
          break;
        case "week":
          filterDate.setDate(today.getDate() - 7);
          filtered = filtered.filter((appointment: any) => new Date(appointment.scheduledDate) >= filterDate);
          break;
        case "month":
          filterDate.setMonth(today.getMonth() - 1);
          filtered = filtered.filter((appointment: any) => new Date(appointment.scheduledDate) >= filterDate);
          break;
      }
    }

    setFilteredAppointments(filtered);
    setCurrentPage(1);
  }, [appointments, searchTerm, statusFilter, dateFilter, typeFilter]);

  // Pagination
  const totalItems = filteredAppointments.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentAppointments = filteredAppointments.slice(startIndex, endIndex);

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
      <div className="bg-gradient-to-r from-[#1e3a8a] to-blue-900 px-6 py-4">
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-bold text-white">Gestion des Rendez-vous</h3>
          <div className="text-blue-100 text-sm">
            {filteredAppointments.length} rendez-vous trouvé(s)
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="p-6 border-b border-gray-100 bg-gradient-to-br from-blue-50 to-white">
        <div className="flex flex-col gap-4">
          {/* Search bar */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-blue-600" />
            </div>
            <input
              type="text"
              placeholder="Rechercher par client, type (visite diagnostique), lieu, technicien, ID..."
              className="w-full pl-12 pr-4 py-3 bg-white border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-[#1e3a8a] transition-all duration-200 text-sm shadow-sm hover:shadow-md"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Filters - Optimized for tablets */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-4 py-3 pr-10 bg-white border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-[#1e3a8a] text-sm shadow-sm hover:shadow-md transition-all duration-200 appearance-none cursor-pointer"
              >
                <option value="all">Tous les statuts</option>
                <option value="SCHEDULED">Planifié</option>
                <option value="CONFIRMED">Confirmé</option>
                <option value="COMPLETED">Terminé</option>
                <option value="CANCELLED">Annulé</option>
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <svg className="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>

            <div className="relative">
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full px-4 py-3 pr-10 bg-white border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-[#1e3a8a] text-sm shadow-sm hover:shadow-md transition-all duration-200 appearance-none cursor-pointer"
              >
                <option value="all">Toutes les dates</option>
                <option value="today">Aujourd'hui</option>
                <option value="week">Cette semaine</option>
                <option value="month">Ce mois</option>
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <svg className="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>

            <div className="relative">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full px-4 py-3 pr-10 bg-white border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-[#1e3a8a] text-sm shadow-sm hover:shadow-md transition-all duration-200 appearance-none cursor-pointer"
              >
                <option value="all">Tous les types</option>
                <option value="DIAGNOSTIC_VISIT">Visite Diagnostique</option>
                <option value="CONSULTATION">Consultation</option>
                <option value="DIAGNOSTIC">Diagnostic</option>
                <option value="LOCATION">Location</option>
                <option value="VENTE">Vente</option>
                <option value="MAINTENANCE">Maintenance</option>
                <option value="RECUPERATION">Récupération</option>
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <svg className="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>

            <div className="flex items-center gap-2 text-sm text-blue-700 bg-blue-100 px-4 py-3 rounded-lg">
              <div className="flex items-center gap-1">
                <div className="h-2 w-2 bg-blue-600 rounded-full animate-pulse"></div>
                <span className="font-medium">{filteredAppointments.length}</span>
              </div>
              <span>résultat{filteredAppointments.length > 1 ? 's' : ''}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6">
        {isLoading ? (
          <div className="flex justify-center items-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1e3a8a]"></div>
          </div>
        ) : currentAppointments && currentAppointments.length > 0 ? (
          <div className="overflow-x-auto">
            <Table className="min-w-[1000px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Date & Heure</TableHead>
                  <TableHead>Lieu</TableHead>
                  <TableHead>Assigné à</TableHead>
                  <TableHead>Priorité</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentAppointments.map((appointment: any, index: number) => {
                  const clientName = appointment.patient 
                    ? `${appointment.patient.firstName} ${appointment.patient.lastName}`
                    : appointment.company?.companyName || "Client inconnu";
                      
                  const clientType = appointment.patient ? "patient" : "company";
                  
                  return (
                    <TableRow key={appointment.id} className={`hover:bg-slate-50 transition-colors duration-150 ${index % 2 === 0 ? 'bg-white' : 'bg-slate-25'}`}>
                      <TableCell>
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0">
                            {clientType === "patient" ? (
                              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-semibold text-sm">
                                {clientName.charAt(0)?.toUpperCase() || 'N'}
                              </div>
                            ) : (
                              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-orange-500 to-orange-700 flex items-center justify-center text-white font-semibold text-sm">
                                {clientName.charAt(0)?.toUpperCase() || 'E'}
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900">{clientName}</div>
                            <div className="text-xs text-slate-500 flex items-center gap-1">
                              {clientType === "patient" ? (
                                <User className="h-3 w-3" />
                              ) : (
                                <Building2 className="h-3 w-3" />
                              )}
                              {clientType === "patient" ? "Patient" : "Entreprise"}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        {appointment.appointmentType ? (
                          <div className="space-y-1">
                            <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${
                              getAppointmentTypeDisplay(appointment.appointmentType).badge
                            }`}>
                              {getAppointmentTypeDisplay(appointment.appointmentType).icon}
                              <span className="hidden sm:inline">
                                {getAppointmentTypeDisplay(appointment.appointmentType).label}
                                {appointment.appointmentCode && (
                                  <span className="ml-1 font-normal opacity-75">
                                    ({appointment.appointmentCode})
                                  </span>
                                )}
                              </span>
                              <span className="sm:hidden">
                                {/* Abbreviated labels for mobile */}
                                {appointment.appointmentType === 'DIAGNOSTIC_VISIT' ? 'Visite' :
                                 appointment.appointmentType === 'CONSULTATION' ? 'Consult.' :
                                 appointment.appointmentType === 'DIAGNOSTIC' ? 'Diag.' :
                                 appointment.appointmentType === 'LOCATION' ? 'Loc.' :
                                 appointment.appointmentType === 'VENTE' ? 'Vente' :
                                 appointment.appointmentType === 'MAINTENANCE' ? 'Maint.' :
                                 appointment.appointmentType === 'RECUPERATION' ? 'Récup.' :
                                 'Autre'}
                              </span>
                            </div>
                            {/* Show Polygraphie as a small indicator only for diagnostic visits */}
                            {appointment.appointmentType === 'DIAGNOSTIC_VISIT' && (
                              <div className="text-xs text-purple-600 flex items-center gap-1">
                                <Stethoscope className="h-3 w-3" />
                                <span className="hidden md:inline">Polygraphie</span>
                                <span className="md:hidden">Poly.</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      
                      <TableCell>
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-4 w-4 text-[#1e3a8a]" />
                          <span className="text-sm">{formatDate(appointment.scheduledDate)}</span>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="flex items-center space-x-1">
                          <MapPin className="h-4 w-4 text-[#1e3a8a]" />
                          <span className="text-sm">{appointment.location || '-'}</span>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        {appointment.assignedTo ? (
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center text-white text-xs font-semibold">
                              {appointment.assignedTo.firstName.charAt(0)}{appointment.assignedTo.lastName.charAt(0)}
                            </div>
                            <div className="text-sm font-medium text-gray-900">
                              <span className="hidden sm:inline">{appointment.assignedTo.firstName} {appointment.assignedTo.lastName}</span>
                              <span className="sm:hidden">{appointment.assignedTo.firstName.charAt(0)}. {appointment.assignedTo.lastName}</span>
                            </div>
                          </div>
                        ) : (
                          <div className="text-xs text-gray-400 italic">
                            <span className="hidden sm:inline flex items-center gap-1">
                              <User className="h-3 w-3" />
                              Non assigné
                            </span>
                            <span className="sm:hidden">-</span>
                          </div>
                        )}
                      </TableCell>
                      
                      <TableCell>
                        {getPriorityBadge(appointment.priority)}
                      </TableCell>
                      
                      <TableCell>
                        {getStatusBadge(appointment.status)}
                      </TableCell>
                      
                      <TableCell>
                        <div className="max-w-xs">
                          {appointment.notes ? (
                            <div className="text-sm text-gray-600 truncate" title={appointment.notes}>
                              {appointment.notes}
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400 italic">Aucune note</span>
                          )}
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {onViewDetails && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => onViewDetails(appointment.id)}
                              className="flex items-center gap-1 text-xs min-h-[36px] px-3 touch-manipulation"
                            >
                              <FileText className="h-4 w-4" />
                              <span className="hidden lg:inline">Détails</span>
                            </Button>
                          )}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                className="h-10 w-10 p-0 touch-manipulation"
                              >
                                <MoreVertical className="h-5 w-5" />
                              </Button>
                            </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {onViewDetails && (
                              <>
                                <DropdownMenuItem
                                  onClick={() => onViewDetails(appointment.id)}
                                  className="text-blue-600"
                                >
                                  <FileText className="h-4 w-4 mr-2" />
                                  Voir les détails
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                              </>
                            )}
                            <DropdownMenuItem
                              onClick={() => updateAppointmentStatus.mutate({ id: appointment.id, status: 'SCHEDULED' })}
                              disabled={appointment.status === 'SCHEDULED'}
                            >
                              <Clock className="h-4 w-4 mr-2" />
                              Marquer comme planifié
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => updateAppointmentStatus.mutate({ id: appointment.id, status: 'CONFIRMED' })}
                              disabled={appointment.status === 'CONFIRMED'}
                            >
                              <CheckCircle2 className="h-4 w-4 mr-2" />
                              Marquer comme confirmé
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => updateAppointmentStatus.mutate({ id: appointment.id, status: 'COMPLETED' })}
                              disabled={appointment.status === 'COMPLETED'}
                            >
                              <CheckCircle2 className="h-4 w-4 mr-2" />
                              Marquer comme terminé
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => updateAppointmentStatus.mutate({ id: appointment.id, status: 'CANCELLED' })}
                              disabled={appointment.status === 'CANCELLED'}
                            >
                              <XCircle className="h-4 w-4 mr-2" />
                              Marquer comme annulé
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleDeleteClick(appointment.id)}
                              className="text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Supprimer
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="border border-blue-200 rounded-lg p-8 text-center text-gray-500 bg-blue-50">
            <div className="flex flex-col items-center justify-center space-y-3">
              <Calendar className="h-12 w-12 text-blue-400" />
              <h3 className="text-lg font-medium text-gray-900">Aucun rendez-vous trouvé</h3>
              <p className="max-w-md text-sm text-gray-600">
                {searchTerm || statusFilter !== 'all' || dateFilter !== 'all'
                  ? "Aucun rendez-vous ne correspond aux critères de recherche. Essayez de modifier les filtres."
                  : "Commencez par créer un nouveau rendez-vous en utilisant le bouton \"Nouveau Rendez-vous\" ci-dessus."
                }
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Pagination - Tablet optimized */}
      {totalPages > 1 && (
        <div className="bg-gray-50 px-4 sm:px-6 py-4 border-t border-gray-200">
          <div className="flex flex-col sm:flex-row items-center justify-between space-y-3 sm:space-y-0">
            <div className="flex items-center text-sm text-gray-600">
              <span>
                Affichage de {startIndex + 1} à {Math.min(endIndex, totalItems)} sur {totalItems} rendez-vous
              </span>
            </div>
            <div className="flex items-center space-x-1 sm:space-x-2">
              <button
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-2 rounded-md text-sm font-medium text-gray-600 hover:text-[#1e3a8a] disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation min-h-[40px]"
              >
                Précédent
              </button>
              
              {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => {
                const page = i + 1;
                const shouldShow = page === 1 || page === totalPages || 
                  (page >= currentPage - 2 && page <= currentPage + 2);
                
                if (!shouldShow && page !== 2 && page !== totalPages - 1) {
                  return null;
                }
                
                if ((page === 2 && currentPage > 4) || (page === totalPages - 1 && currentPage < totalPages - 3)) {
                  return <span key={page} className="px-2 text-gray-400">...</span>;
                }
                
                return (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`px-3 py-2 rounded-md text-sm font-medium touch-manipulation min-h-[40px] ${
                      currentPage === page
                        ? 'bg-[#1e3a8a] text-white'
                        : 'text-gray-600 hover:text-[#1e3a8a]'
                    }`}
                  >
                    {page}
                  </button>
                );
              })}
              
              <button
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-3 py-2 rounded-md text-sm font-medium text-gray-600 hover:text-[#1e3a8a] disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation min-h-[40px]"
              >
                Suivant
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Delete confirmation dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              Êtes-vous sûr de vouloir supprimer ce rendez-vous?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Le rendez-vous sera définitivement supprimé.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelDelete}>Annuler</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmDelete}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default AppointmentsTable;