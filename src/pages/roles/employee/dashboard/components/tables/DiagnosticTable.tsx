import React, { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, isAfter, isBefore, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { useSession } from "next-auth/react";
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
  CalendarIcon,
  AlertCircle,
  Stethoscope,
  User,
  ClipboardList,
  Settings,
  FileText,
  Clock,
  FileCheck,
  FilePlus2,
  Calendar,
  Building2,
  Phone,
  Trash2,
  Loader2,
  Search,
  ChevronDown,
  ChevronRight,
  Activity,
  CheckCircle,
  XCircle,
  AlertTriangle,
  FileX,
} from "lucide-react";
import { calculateIAHSeverity, formatIAHValue } from "@/utils/diagnosticUtils";

interface DiagnosticTableProps {
  onViewDetails?: (id: string) => void;
  onEnterResults?: (id: string) => void;
  onAddDocuments?: (id: string) => void;
}

// Define result type based on the new schema structure
interface DiagnosticResultType {
  id: string;
  iah: number | null;
  idValue: number | null;
  remarque: string | null;
  status: string;
}

export function DiagnosticTable({ onViewDetails, onEnterResults, onAddDocuments }: DiagnosticTableProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [diagnosticToDelete, setDiagnosticToDelete] = useState<string | null>(null);
  
  // Enhanced filtering states
  const [filteredDiagnostics, setFilteredDiagnostics] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [regionFilter, setRegionFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [expandedPatients, setExpandedPatients] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<"grouped" | "list">("list");
  
  // Fetch diagnostic operations data - filtered for employee
  const { data: diagnosticOperations, isLoading } = useQuery({
    queryKey: ["employee-diagnostic-operations", session?.user?.id],
    queryFn: async () => {
      try {
        // Use the regular diagnostics endpoint but the data will be filtered server-side for employees
        const response = await fetch("/api/diagnostics");
        if (!response.ok) {
          throw new Error("Failed to fetch diagnostic operations");
        }
        const data = await response.json();
        console.log("Employee diagnostic data:", data);

        // For employees, filter to only show their assigned diagnostics
        if (session?.user?.role === 'EMPLOYEE') {
          const filtered = data.diagnostics?.filter((diag: any) => {
            // Check if employee is assigned as technician to the patient
            return diag.patient?.technicianId === session.user.id ||
                   diag.patient?.technician?.id === session.user.id ||
                   diag.performedById === session.user.id;
          });
          return filtered || [];
        }

        return data.diagnostics || [];
      } catch (error) {
        console.error("Error fetching diagnostic operations:", error);
        return [];
      }
    },
    enabled: !!session?.user?.id,
  });

  // Initialize filtered diagnostics when data loads
  useEffect(() => {
    if (diagnosticOperations) {
      setFilteredDiagnostics(diagnosticOperations);
    }
  }, [diagnosticOperations]);

  // Helper functions to get unique values for filters
  const getUniqueValues = (key: string): string[] => {
    if (!diagnosticOperations) return [];
    const values: (string | null)[] = diagnosticOperations.map((diagnostic: any) => {
      switch (key) {
        case 'region':
          return diagnostic.patient?.governorate as string | null;
        default:
          return null;
      }
    });
    const filteredValues = values.filter((value: string | null): value is string => Boolean(value) && typeof value === 'string');
    return [...new Set(filteredValues)];
  };

  const uniqueRegions = getUniqueValues('region');

  // Function to format date
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    return format(new Date(dateString), "PPP", { locale: fr });
  };

  // Format date function for simple display
  const formatSimpleDate = (dateString: string): string => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      }).format(date);
    } catch (error) {
      console.error('Error formatting date:', error);
      return dateString;
    }
  };
  
  // Function to format date with time
  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return "-";
    return format(new Date(dateString), "PPP 'à' HH:mm", { locale: fr });
  };
  
  // Function to check if a date is overdue
  const isOverdue = (dateString: string | null) => {
    if (!dateString) return false;
    const today = new Date();
    const dueDate = new Date(dateString);
    return isBefore(dueDate, today);
  };

  // Function to get business status - Only Appareillé ou Non Appareillé
  const getStatusBadge = (diagnostic: any) => {
    // Simple logic: Has sale OR rental = Appareillé, otherwise Non appareillé
    const hasSale = diagnostic.hasSale;
    const hasRental = diagnostic.hasRental;
    
    if (hasSale || hasRental) {
      return (
        <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200 text-xs flex items-center gap-1">
          <CheckCircle className="h-3 w-3" />
          Appareillé
        </Badge>
      );
    } else {
      return (
        <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200 text-xs flex items-center gap-1">
          <XCircle className="h-3 w-3" />
          Non appareillé
        </Badge>
      );
    }
  };

  // Get severity statistics
  const getSeverityStats = () => {
    const stats = { negative: 0, moderate: 0, severe: 0 };
    
    filteredDiagnostics.forEach((diagnostic: any) => {
      if (diagnostic.result?.iah) {
        const severity = calculateIAHSeverity(diagnostic.result.iah);
        stats[severity.level]++;
      }
    });
    
    return stats;
  };

  // Delete diagnostic mutation
  const deleteDiagnostic = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/diagnostics?id=${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete diagnostic');
      }
      
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Diagnostic supprimé",
        description: "Le diagnostic a été supprimé et le statut de l'appareil a été réinitialisé.",
      });
      queryClient.invalidateQueries({ queryKey: ["employee-diagnostic-operations"] });
      setDiagnosticToDelete(null);
    },
    onError: (error) => {
      console.error('Error deleting diagnostic:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le diagnostic. Veuillez réessayer.",
        variant: "destructive",
      });
    }
  });

  // Handle delete button click
  const handleDeleteClick = (id: string) => {
    setDiagnosticToDelete(id);
    setIsDeleteDialogOpen(true);
  };

  // Handle confirm delete
  const handleConfirmDelete = () => {
    if (diagnosticToDelete) {
      deleteDiagnostic.mutate(diagnosticToDelete);
    }
    setIsDeleteDialogOpen(false);
  };

  // Handle cancel delete
  const handleCancelDelete = () => {
    setDiagnosticToDelete(null);
    setIsDeleteDialogOpen(false);
  };

  // Filter and search diagnostics
  useEffect(() => {
    if (!diagnosticOperations) return;
    
    let filtered = diagnosticOperations;

    // Apply search filter
    if (searchTerm.trim()) {
      filtered = filtered.filter((diagnostic: any) =>
        diagnostic.patientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        diagnostic.patient?.telephone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        diagnostic.patient?.governorate?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        diagnostic.patient?.detailedAddress?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        diagnostic.deviceName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        diagnostic.id.toString().includes(searchTerm)
      );
    }

    // Apply region filter
    if (regionFilter !== "all") {
      filtered = filtered.filter((diagnostic: any) => diagnostic.patient?.governorate === regionFilter);
    }

    // Apply date filter
    if (dateFilter !== "all") {
      const today = new Date();
      const filterDate = new Date();
      
      switch (dateFilter) {
        case "today":
          filterDate.setHours(0, 0, 0, 0);
          filtered = filtered.filter((diagnostic: any) => {
            const diagDate = new Date(diagnostic.date);
            diagDate.setHours(0, 0, 0, 0);
            return diagDate.getTime() === filterDate.getTime();
          });
          break;
        case "week":
          filterDate.setDate(today.getDate() - 7);
          filtered = filtered.filter((diagnostic: any) => new Date(diagnostic.date) >= filterDate);
          break;
        case "month":
          filterDate.setMonth(today.getMonth() - 1);
          filtered = filtered.filter((diagnostic: any) => new Date(diagnostic.date) >= filterDate);
          break;
        case "year":
          filterDate.setFullYear(today.getFullYear() - 1);
          filtered = filtered.filter((diagnostic: any) => new Date(diagnostic.date) >= filterDate);
          break;
      }
    }

    // Apply severity filter
    if (severityFilter !== "all") {
      filtered = filtered.filter((diagnostic: any) => {
        if (!diagnostic.result?.iah) return false;
        const severity = calculateIAHSeverity(diagnostic.result.iah);
        return severity.level === severityFilter;
      });
    }

    setFilteredDiagnostics(filtered);
    setCurrentPage(1); // Reset to first page when filtering
  }, [diagnosticOperations, searchTerm, regionFilter, dateFilter, severityFilter, sortBy, sortOrder]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
  };

  const severityStats = getSeverityStats();

  // Group diagnostics by patient
  const groupedDiagnostics = useMemo(() => {
    if (viewMode !== "grouped") return null;
    
    const groups = new Map<string, any>();
    
    filteredDiagnostics.forEach((diagnostic) => {
      const patientId = diagnostic.patient?.id;
      if (!patientId) return;
      
      if (!groups.has(patientId)) {
        groups.set(patientId, {
          patient: diagnostic.patient,
          patientName: diagnostic.patientName,
          diagnostics: [],
          latestDate: diagnostic.date,
          totalDiagnostics: 0,
        });
      }
      
      const group = groups.get(patientId);
      group.diagnostics.push(diagnostic);
      group.totalDiagnostics++;
      
      // Update latest date
      if (new Date(diagnostic.date) > new Date(group.latestDate)) {
        group.latestDate = diagnostic.date;
      }
    });
    
    // Convert to array and sort
    return Array.from(groups.values()).sort((a, b) => {
      if (sortBy === "date") {
        return sortOrder === "desc" 
          ? new Date(b.latestDate).getTime() - new Date(a.latestDate).getTime()
          : new Date(a.latestDate).getTime() - new Date(b.latestDate).getTime();
      }
      return 0;
    });
  }, [filteredDiagnostics, viewMode, sortBy, sortOrder]);

  // Pagination
  const totalItems = viewMode === "grouped" && groupedDiagnostics 
    ? groupedDiagnostics.length 
    : filteredDiagnostics.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentDiagnostics = viewMode === "list" 
    ? filteredDiagnostics.slice(startIndex, endIndex)
    : filteredDiagnostics;

  // Toggle patient expansion
  const togglePatientExpansion = (patientId: string) => {
    setExpandedPatients(prev => {
      const newSet = new Set(prev);
      if (newSet.has(patientId)) {
        newSet.delete(patientId);
      } else {
        newSet.add(patientId);
      }
      return newSet;
    });
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
      <div className="bg-gradient-to-r from-green-600 to-green-700 px-6 py-4">
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-bold text-white">Mes Opérations de Diagnostic</h3>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Button
                variant={viewMode === "grouped" ? "secondary" : "outline"}
                size="sm"
                onClick={() => setViewMode("grouped")}
                className="text-xs"
              >
                <Activity className="h-3 w-3 mr-1" />
                Groupé
              </Button>
              <Button
                variant={viewMode === "list" ? "secondary" : "outline"}
                size="sm"
                onClick={() => setViewMode("list")}
                className="text-xs"
              >
                <FileText className="h-3 w-3 mr-1" />
                Liste
              </Button>
            </div>
            <div className="text-green-100 text-sm">
              {viewMode === "grouped" && groupedDiagnostics 
                ? `${groupedDiagnostics.length} patient(s) • ${filteredDiagnostics.length} diagnostic(s)`
                : `${filteredDiagnostics.length} diagnostic(s) trouvé(s)`
              }
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="p-6 border-b border-gray-100 bg-gradient-to-br from-green-50 to-white">
        <div className="flex flex-col gap-4">
          {/* Search bar */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-green-600" />
            </div>
            <input
              type="text"
              placeholder="Rechercher par patient, téléphone, région, appareil, ID..."
              className="w-full pl-12 pr-4 py-3 bg-white border border-green-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-600 transition-all duration-200 text-sm shadow-sm hover:shadow-md"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {/* Region Filter */}
            <select
              value={regionFilter}
              onChange={(e) => setRegionFilter(e.target.value)}
              className="px-4 py-3 border border-green-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-600 bg-white text-sm shadow-sm hover:shadow-md transition-all duration-200"
            >
              <option value="all">Toutes les régions</option>
              {uniqueRegions.map((region) => (
                <option key={region} value={region}>
                  {region}
                </option>
              ))}
            </select>

            {/* Date Filter */}
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="px-4 py-3 border border-green-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-600 bg-white text-sm shadow-sm hover:shadow-md transition-all duration-200"
            >
              <option value="all">Toutes les dates</option>
              <option value="today">Aujourd'hui</option>
              <option value="week">Cette semaine</option>
              <option value="month">Ce mois</option>
              <option value="year">Cette année</option>
            </select>

            {/* Severity Filter */}
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="px-4 py-3 border border-green-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-600 bg-white text-sm shadow-sm hover:shadow-md transition-all duration-200"
            >
              <option value="all">Toutes les sévérités</option>
              <option value="negative">Négatif</option>
              <option value="moderate">Modéré</option>
              <option value="severe">Sévère</option>
            </select>
          </div>
        </div>

        {/* Severity Statistics */}
        <div className="mt-4 flex flex-wrap gap-4 text-sm">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-emerald-500 rounded-full mr-2"></div>
            <span className="text-slate-600">Négatif: {severityStats.negative}</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-amber-500 rounded-full mr-2"></div>
            <span className="text-slate-600">Modéré: {severityStats.moderate}</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
            <span className="text-slate-600">Sévère: {severityStats.severe}</span>
          </div>
        </div>
      </div>

      <div className="p-6">
        
        {isLoading ? (
          <div className="flex justify-center items-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
          </div>
        ) : viewMode === "grouped" && groupedDiagnostics && groupedDiagnostics.length > 0 ? (
          <div className="space-y-4">
            {groupedDiagnostics.map((group) => (
              <div key={group.patient.id} className="border border-slate-200 rounded-lg overflow-hidden">
                {/* Patient Header */}
                <div 
                  className="bg-slate-50 px-4 py-3 cursor-pointer hover:bg-slate-100 transition-colors"
                  onClick={() => togglePatientExpansion(group.patient.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center space-x-2">
                        {expandedPatients.has(group.patient.id) ? (
                          <ChevronDown className="h-4 w-4 text-slate-600" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-slate-600" />
                        )}
                        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-green-500 to-green-700 flex items-center justify-center text-white font-semibold text-xs">
                          {group.patientName?.charAt(0)?.toUpperCase() || 'N'}
                        </div>
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900">{group.patientName || 'N/A'}</div>
                        <div className="text-xs text-slate-500">
                          {group.patient?.telephone && `${group.patient.telephone}`}
                          {group.patient?.governorate && ` • ${group.patient.governorate}`}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        {group.totalDiagnostics} diagnostic{group.totalDiagnostics > 1 ? 's' : ''}
                      </Badge>
                      <div className="text-sm text-slate-600">
                        Dernier: {formatSimpleDate(group.latestDate)}
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Expanded Diagnostics */}
                {expandedPatients.has(group.patient.id) && (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-25">
                          <TableHead className="text-xs">Appareil</TableHead>
                          <TableHead className="text-xs">Date</TableHead>
                          <TableHead className="text-xs">IAH & Sévérité</TableHead>
                          <TableHead className="text-xs">Statut</TableHead>
                          <TableHead className="text-xs">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {group.diagnostics.map((diagnostic: any, index: number) => (
                          <TableRow key={diagnostic.id} className="hover:bg-slate-50 transition-colors">
                            <TableCell>
                              <div className="flex items-start gap-2">
                                <Stethoscope className="h-4 w-4 text-green-600 mt-0.5" />
                                <div>
                                  <div className="font-medium text-sm">
                                    {diagnostic.deviceName || "Appareil inconnu"}
                                  </div>
                                  {diagnostic.medicalDevice?.serialNumber && (
                                    <div className="text-xs text-slate-500">
                                      N/S: {diagnostic.medicalDevice.serialNumber}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            
                            <TableCell>
                              <div className="text-sm">{formatSimpleDate(diagnostic.date)}</div>
                            </TableCell>
                            
                            <TableCell>
                              <div className="flex flex-col space-y-1">
                                {diagnostic.result?.iah ? (
                                  <>
                                    <div className="text-sm font-bold text-slate-900">
                                      {formatIAHValue(diagnostic.result.iah)}
                                    </div>
                                    {(() => {
                                      const severity = calculateIAHSeverity(diagnostic.result.iah);
                                      return (
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${severity.bgColor} ${severity.textColor}`}>
                                          <div className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                                            severity.color === 'emerald' ? 'bg-emerald-500' : 
                                            severity.color === 'amber' ? 'bg-amber-500' : 
                                            'bg-red-500'
                                          }`}></div>
                                          {severity.labelFr}
                                        </span>
                                      );
                                    })()}
                                  </>
                                ) : (
                                  <div className="text-sm text-slate-500">En attente</div>
                                )}
                              </div>
                            </TableCell>
                            
                            <TableCell>
                              {getStatusBadge(diagnostic)}
                            </TableCell>
                            
                            <TableCell>
                              <div className="flex space-x-2">
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => onViewDetails && onViewDetails(diagnostic.id)}
                                  className="flex items-center gap-1 text-xs"
                                >
                                  <FileText className="h-3 w-3" />
                                  Détails
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => handleDeleteClick(diagnostic.id)}
                                  className="flex items-center gap-1 border-red-200 hover:bg-red-50 hover:text-red-600 text-xs"
                                  disabled={deleteDiagnostic.isPending}
                                >
                                  {deleteDiagnostic.isPending && diagnosticToDelete === diagnostic.id ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <Trash2 className="h-3 w-3" />
                                  )}
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : currentDiagnostics && currentDiagnostics.length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead 
                    className="cursor-pointer hover:bg-slate-100 transition-colors"
                    onClick={() => handleSort("patient")}
                  >
                    <div className="flex items-center">
                      Patient
                      {sortBy === "patient" && (
                        <svg className={`ml-1 h-4 w-4 ${sortOrder === "asc" ? "rotate-180" : ""}`} fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                  </TableHead>
                  <TableHead>Appareil</TableHead>
                  <TableHead>Région</TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-slate-100 transition-colors"
                    onClick={() => handleSort("date")}
                  >
                    <div className="flex items-center">
                      Date
                      {sortBy === "date" && (
                        <svg className={`ml-1 h-4 w-4 ${sortOrder === "asc" ? "rotate-180" : ""}`} fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                  </TableHead>
                  <TableHead>IAH & Sévérité</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentDiagnostics.map((operation: any, index: number) => {
                  return (
                    <TableRow key={operation.id} className={`hover:bg-slate-50 transition-colors duration-150 ${index % 2 === 0 ? 'bg-white' : 'bg-slate-25'}`}>
                      <TableCell>
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-green-500 to-green-700 flex items-center justify-center text-white font-semibold text-sm">
                              {operation.patientName?.charAt(0)?.toUpperCase() || 'N'}
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-semibold text-slate-900">{operation.patientName || 'N/A'}</div>
                            <div className="text-xs text-slate-500">
                              {operation.patient?.telephone && `${operation.patient.telephone}`}
                              {operation.patient?.governorate && ` • ${operation.patient.governorate}`}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="flex items-start gap-2">
                          <Stethoscope className="h-5 w-5 text-green-600 mt-0.5" />
                          <div>
                            <div className="font-medium text-sm">
                              {operation.deviceName || "Appareil inconnu"}
                            </div>
                            {operation.medicalDevice?.serialNumber && (
                              <div className="text-xs text-slate-500">
                                N/S: {operation.medicalDevice.serialNumber}
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="text-sm text-slate-900">
                          {operation.patient?.governorate || '-'}
                        </div>
                        <div className="text-xs text-slate-500">
                          {operation.patient?.delegation || ''}
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="flex items-start gap-2">
                          <Clock className="h-5 w-5 text-green-600 mt-0.5" />
                          <div>
                            <div className="font-medium text-sm">{formatSimpleDate(operation.date)}</div>
                            <div className="text-xs text-slate-500">
                              {new Date(operation.date).toLocaleDateString('fr-FR')}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="flex flex-col space-y-1">
                          {operation.result?.iah ? (
                            <>
                              <div className="text-sm font-bold text-slate-900">
                                {formatIAHValue(operation.result.iah)}
                              </div>
                              {(() => {
                                const severity = calculateIAHSeverity(operation.result.iah);
                                return (
                                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${severity.bgColor} ${severity.textColor}`}>
                                    <div className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                                      severity.color === 'emerald' ? 'bg-emerald-500' : 
                                      severity.color === 'amber' ? 'bg-amber-500' : 
                                      'bg-red-500'
                                    }`}></div>
                                    {severity.labelFr}
                                  </span>
                                );
                              })()}
                            </>
                          ) : (
                            <div className="text-sm text-slate-500">En attente</div>
                          )}
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        {getStatusBadge(operation)}
                        {operation.followUpRequired && (
                          <div className="mt-1">
                            <Badge variant="outline" className={`text-xs ${isOverdue(operation.followUpDate) ? 'bg-red-50 text-red-700 border-red-100' : 'bg-green-50 text-green-700 border-green-100'}`}>
                              {isOverdue(operation.followUpDate) ? 'Suivi en retard' : 'Suivi requis'}
                            </Badge>
                          </div>
                        )}
                      </TableCell>
                      
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => onViewDetails && onViewDetails(operation.id)}
                            className="flex items-center gap-1"
                          >
                            <FileText className="h-3.5 w-3.5" />
                            <span>Détails</span>
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleDeleteClick(operation.id)}
                            className="flex items-center gap-1 border-red-200 hover:bg-red-50 hover:text-red-600"
                            disabled={deleteDiagnostic.isPending}
                          >
                            {deleteDiagnostic.isPending && diagnosticToDelete === operation.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="h-3.5 w-3.5" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="border border-slate-200 rounded-lg p-8 text-center text-slate-500">
            <div className="flex flex-col items-center justify-center space-y-3">
              <Stethoscope className="h-12 w-12 text-slate-400" />
              <h3 className="text-lg font-medium text-slate-900">Aucune opération de diagnostic</h3>
              <p className="max-w-md text-sm text-slate-500">
                Commencez par créer une nouvelle opération de diagnostic en utilisant le bouton &quot;Commencer un Diagnostic&quot; ci-dessus.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center text-sm text-slate-600">
              <span>
                {viewMode === "grouped" && groupedDiagnostics
                  ? `Affichage de ${startIndex + 1} à ${Math.min(endIndex, totalItems)} sur ${totalItems} patients`
                  : `Affichage de ${startIndex + 1} à ${Math.min(endIndex, totalItems)} sur ${totalItems} diagnostics`
                }
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-1 rounded-md text-sm font-medium text-slate-500 hover:text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Précédent
              </button>
              
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => handlePageChange(page)}
                  className={`px-3 py-1 rounded-md text-sm font-medium ${
                    currentPage === page
                      ? 'bg-green-600 text-white'
                      : 'text-gray-600 hover:text-green-600'
                  }`}
                >
                  {page}
                </button>
              ))}
              
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-3 py-1 rounded-md text-sm font-medium text-slate-500 hover:text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
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
            <AlertDialogTitle>Êtes-vous sûr de vouloir supprimer ce diagnostic?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Le diagnostic sera supprimé et le statut de l'appareil sera réinitialisé à ACTIF.
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

export default DiagnosticTable;