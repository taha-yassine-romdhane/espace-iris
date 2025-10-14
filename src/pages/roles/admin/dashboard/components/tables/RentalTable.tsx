import React, { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, isAfter, isBefore, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { useRouter } from "next/router";
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
  Building2,
  User,
  Clock,
  Settings,
  Banknote,
  Shield,
  AlertTriangle,
  CheckCircle,
  Eye,
  Edit,
  Package,
  CreditCard,
  Trash2,
  Loader2,
  Search,
  SortAsc,
  SortDesc,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { RentalDetailsDialog } from "@/components/rental/dialogs/RentalDetailsDialog";

interface RentalTableProps {
  onViewDetails?: (id: string) => void;
  onEdit?: (id: string) => void;
}

export function RentalTable({ onViewDetails, onEdit }: RentalTableProps) {
  const { toast } = useToast();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [rentalToDelete, setRentalToDelete] = useState<string | null>(null);
  const [selectedRental, setSelectedRental] = useState<any>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);

  // Enhanced filtering states
  const [filteredRentals, setFilteredRentals] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [clientTypeFilter, setClientTypeFilter] = useState<string>("all");
  const [deviceTypeFilter, setDeviceTypeFilter] = useState<string>("all");
  const [cnamFilter, setCnamFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // Fetch rental operations data with enhanced relationships
  const { data: rentalOperations, isLoading } = useQuery({
    queryKey: ["rental-operations"],
    queryFn: async () => {
      try {
        const response = await fetch("/api/rentals");
        if (!response.ok) {
          throw new Error("Failed to fetch rental operations");
        }
        const data = await response.json();
        return data.rentals || [];
      } catch (error) {
        console.error("Error fetching rental operations:", error);
        return [];
      }
    },
  });

  // Initialize filtered rentals when data loads
  useEffect(() => {
    if (rentalOperations) {
      setFilteredRentals(rentalOperations);
    }
  }, [rentalOperations]);

  // Delete rental mutation
  const deleteRental = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/rentals/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete rental');
      }
      
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Location supprimée",
        description: "La location a été annulée avec succès.",
      });
      queryClient.invalidateQueries({ queryKey: ["rental-operations"] });
      setRentalToDelete(null);
    },
    onError: (error) => {
      console.error('Error deleting rental:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer la location. Veuillez réessayer.",
        variant: "destructive",
      });
    }
  });

  // Handle delete button click
  const handleDeleteClick = (id: string) => {
    setRentalToDelete(id);
    setIsDeleteDialogOpen(true);
  };

  // Handle confirm delete
  const handleConfirmDelete = () => {
    if (rentalToDelete) {
      deleteRental.mutate(rentalToDelete);
    }
    setIsDeleteDialogOpen(false);
  };

  // Handle cancel delete
  const handleCancelDelete = () => {
    setRentalToDelete(null);
    setIsDeleteDialogOpen(false);
  };

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

  // Function to format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-TN', {
      style: 'currency',
      currency: 'TND',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(Number(amount) || 0);
  };

  // Function to calculate rental duration in days
  const calculateDuration = (startDate: string, endDate: string) => {
    if (!startDate || !endDate) return "-";
    const start = new Date(startDate);
    const end = new Date(endDate);
    const differenceInTime = end.getTime() - start.getTime();
    return Math.ceil(differenceInTime / (1000 * 3600 * 24));
  };

  // Function to get rental status badge
  const getRentalStatusBadge = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return (
          <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
            <CheckCircle className="h-3 w-3 mr-1" />
            Actif
          </Badge>
        );
      case "PENDING":
        return (
          <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200">
            <Clock className="h-3 w-3 mr-1" />
            En attente
          </Badge>
        );
      case "PAUSED":
        return (
          <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-200">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Suspendu
          </Badge>
        );
      case "COMPLETED":
        return (
          <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200">
            <CheckCircle className="h-3 w-3 mr-1" />
            Terminé
          </Badge>
        );
      case "CANCELLED":
        return (
          <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200">
            <AlertTriangle className="h-3 w-3 mr-1" />
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

  // Function to get CNAM info summary
  const getCnamSummary = (rental: any) => {
    const configuration = rental.configuration || {};
    const cnamBonds = rental.cnamBonds || [];
    const urgentRental = configuration.urgentRental || false;
    
    // Check if we have CNAM bonds
    if (cnamBonds.length === 0) {
      return {
        eligible: false,
        bonds: 0,
        badge: (
          <Badge variant="outline" className="bg-gray-100 text-gray-800 border-gray-200">
            Non éligible
          </Badge>
        )
      };
    }

    // Get the status of CNAM bonds
    const approvedBonds = cnamBonds.filter((bond: any) => bond.status === 'APPROUVE');
    const pendingBonds = cnamBonds.filter((bond: any) => bond.status === 'EN_ATTENTE_APPROBATION' || bond.status === 'EN_ATTENTE');
    
    let badgeColor = "bg-blue-100 text-blue-800 border-blue-200";
    let statusText = "CNAM";
    
    if (approvedBonds.length > 0) {
      badgeColor = "bg-green-100 text-green-800 border-green-200";
      statusText = `${approvedBonds.length} Approuvé${approvedBonds.length > 1 ? 's' : ''}`;
    } else if (pendingBonds.length > 0) {
      badgeColor = "bg-yellow-100 text-yellow-800 border-yellow-200";
      statusText = `${pendingBonds.length} En Attente`;
    }
    
    return {
      eligible: true,
      bonds: cnamBonds.length,
      badge: (
        <Badge variant="outline" className={badgeColor}>
          <Shield className="h-3 w-3 mr-1" />
          {statusText}
          {urgentRental && (
            <AlertTriangle className="h-3 w-3 ml-1 text-orange-500" />
          )}
        </Badge>
      )
    };
  };

  // Function to get device parameters summary
  const getDeviceParametersSummary = (rental: any) => {
    // TODO: Implement proper device parameters fetching from MedicalDeviceParametre table
    // For now, return a placeholder since device parameters should be fetched separately
    const deviceType = rental.medicalDevice?.type || 'UNKNOWN';
    
    // Check if we have accessories to show
    const accessories = rental.accessories || [];
    if (accessories.length > 0) {
      return `${accessories.length} accessoire${accessories.length > 1 ? 's' : ''}`;
    }
    
    return "Paramètres à charger";
  };

  // Function to calculate total rental amount
  const getTotalAmount = (rental: any) => {
    // First try to get from configuration if available
    const configuration = rental.configuration || {};
    const configAmount = configuration.totalPaymentAmount;
    
    if (configAmount && configAmount > 0) {
      return Number(configAmount);
    }
    
    // Calculate from rental periods if available
    const rentalPeriods = rental.rentalPeriods || [];
    if (rentalPeriods.length > 0) {
      const totalFromPeriods = rentalPeriods.reduce((sum: number, period: any) => {
        return sum + Number(period.amount || 0);
      }, 0);
      return totalFromPeriods;
    }
    
    // Fallback to device rental price if available
    const devicePrice = rental.medicalDevice?.rentalPrice;
    if (devicePrice && devicePrice > 0) {
      return Number(devicePrice);
    }
    
    return 0;
  };

  // Function to get deposit info
  const getDepositInfo = (rental: any) => {
    const configuration = rental.configuration || {};
    let depositAmount = Number(configuration.depositAmount || 0);
    let depositMethod = configuration.depositMethod || 'N/A';
    
    // If no deposit in configuration, check payment with isDepositPayment flag
    if (depositAmount === 0) {
      const payment = rental.payment;
      if (payment && payment.isDepositPayment) {
        depositAmount = Number(payment.amount || 0);
        depositMethod = payment.method || 'N/A';
      }
    }
    
    return { amount: depositAmount, method: depositMethod };
  };

  // Get rentals statistics
  const getRentalsStats = () => {
    const stats = { 
      total: filteredRentals.length,
      active: 0, 
      pending: 0, 
      completed: 0,
      cancelled: 0,
      totalAmount: 0,
      averageAmount: 0
    };
    
    filteredRentals.forEach((rental: any) => {
      switch (rental.status) {
        case 'ACTIVE':
          stats.active++;
          break;
        case 'PENDING':
          stats.pending++;
          break;
        case 'COMPLETED':
          stats.completed++;
          break;
        case 'CANCELLED':
          stats.cancelled++;
          break;
      }
      stats.totalAmount += getTotalAmount(rental);
    });
    
    stats.averageAmount = stats.total > 0 ? stats.totalAmount / stats.total : 0;
    
    return stats;
  };

  // Filter and search rentals
  useEffect(() => {
    if (!rentalOperations) return;
    
    let filtered = rentalOperations;

    // Apply search filter
    if (searchTerm.trim()) {
      filtered = filtered.filter((rental: any) => {
        const clientName = rental.patient 
          ? `${rental.patient.firstName} ${rental.patient.lastName}`
          : rental.company?.companyName || "";
        
        return (
          clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          rental.patient?.telephone?.includes(searchTerm) ||
          rental.patient?.patientCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          rental.patient?.cnamId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          rental.company?.telephone?.includes(searchTerm) ||
          rental.company?.companyCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          rental.rentalCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          rental.medicalDevice?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          rental.medicalDevice?.serialNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          rental.id.toString().includes(searchTerm)
        );
      });
    }

    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((rental: any) => rental.status === statusFilter);
    }

    // Apply client type filter
    if (clientTypeFilter !== "all") {
      if (clientTypeFilter === "patient") {
        filtered = filtered.filter((rental: any) => rental.patient);
      } else if (clientTypeFilter === "company") {
        filtered = filtered.filter((rental: any) => rental.company);
      }
    }

    // Apply device type filter
    if (deviceTypeFilter !== "all") {
      filtered = filtered.filter((rental: any) => rental.medicalDevice?.type === deviceTypeFilter);
    }

    // Apply CNAM filter
    if (cnamFilter !== "all") {
      if (cnamFilter === "eligible") {
        filtered = filtered.filter((rental: any) => rental.patient?.cnamId);
      } else if (cnamFilter === "not_eligible") {
        filtered = filtered.filter((rental: any) => !rental.patient?.cnamId);
      }
    }

    // Apply date filter
    if (dateFilter !== "all") {
      const today = new Date();
      const filterDate = new Date();
      
      switch (dateFilter) {
        case "today":
          filterDate.setHours(0, 0, 0, 0);
          filtered = filtered.filter((rental: any) => {
            const rentalDate = new Date(rental.startDate);
            rentalDate.setHours(0, 0, 0, 0);
            return rentalDate.getTime() === filterDate.getTime();
          });
          break;
        case "week":
          filterDate.setDate(today.getDate() - 7);
          filtered = filtered.filter((rental: any) => new Date(rental.startDate) >= filterDate);
          break;
        case "month":
          filterDate.setMonth(today.getMonth() - 1);
          filtered = filtered.filter((rental: any) => new Date(rental.startDate) >= filterDate);
          break;
        case "year":
          filterDate.setFullYear(today.getFullYear() - 1);
          filtered = filtered.filter((rental: any) => new Date(rental.startDate) >= filterDate);
          break;
      }
    }

    // Apply sorting
    filtered.sort((a: any, b: any) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case "client":
          aValue = a.patient ? `${a.patient.firstName} ${a.patient.lastName}` : a.company?.companyName || "";
          bValue = b.patient ? `${b.patient.firstName} ${b.patient.lastName}` : b.company?.companyName || "";
          break;
        case "amount":
          aValue = getTotalAmount(a);
          bValue = getTotalAmount(b);
          break;
        case "date":
          aValue = new Date(a.startDate).getTime();
          bValue = new Date(b.startDate).getTime();
          break;
        case "status":
          aValue = a.status;
          bValue = b.status;
          break;
        case "device":
          aValue = a.medicalDevice?.name || "";
          bValue = b.medicalDevice?.name || "";
          break;
        default:
          aValue = a.id;
          bValue = b.id;
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortOrder === "asc" 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }
      
      return sortOrder === "asc" ? aValue - bValue : bValue - aValue;
    });

    setFilteredRentals(filtered);
    setCurrentPage(1); // Reset to first page when filtering
  }, [rentalOperations, searchTerm, statusFilter, clientTypeFilter, deviceTypeFilter, cnamFilter, dateFilter, sortBy, sortOrder]);

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

  const rentalsStats = getRentalsStats();

  // Pagination
  const totalItems = filteredRentals.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentRentals = filteredRentals.slice(startIndex, endIndex);

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
      <div className="bg-gradient-to-r from-[#1e3a8a] to-blue-900 px-6 py-4">
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-bold text-white">Gestion des Locations</h3>
          <div className="text-blue-100 text-sm">
            {filteredRentals.length} location(s) trouvée(s)
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
              placeholder="Rechercher par client, appareil, série, CNAM, téléphone, ID..."
              className="w-full pl-12 pr-4 py-3 bg-white border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-[#1e3a8a] transition-all duration-200 text-sm shadow-sm hover:shadow-md"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-3 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-[#1e3a8a] bg-white text-sm shadow-sm hover:shadow-md transition-all duration-200"
            >
              <option value="all">Tous les statuts</option>
              <option value="ACTIVE">Actif</option>
              <option value="PENDING">En attente</option>
              <option value="PAUSED">Suspendu</option>
              <option value="COMPLETED">Terminé</option>
              <option value="CANCELLED">Annulé</option>
            </select>

            {/* Client Type Filter */}
            <select
              value={clientTypeFilter}
              onChange={(e) => setClientTypeFilter(e.target.value)}
              className="px-4 py-3 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-[#1e3a8a] bg-white text-sm shadow-sm hover:shadow-md transition-all duration-200"
            >
              <option value="all">Tous les clients</option>
              <option value="patient">Patients</option>
              <option value="company">Entreprises</option>
            </select>

            {/* Device Type Filter */}
            <select
              value={deviceTypeFilter}
              onChange={(e) => setDeviceTypeFilter(e.target.value)}
              className="px-4 py-3 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-[#1e3a8a] bg-white text-sm shadow-sm hover:shadow-md transition-all duration-200"
            >
              <option value="all">Tous les appareils</option>
              <option value="CPAP">CPAP</option>
              <option value="VNI">VNI</option>
              <option value="CONCENTRATEUR_OXYGENE">Concentrateur O²</option>
              <option value="BOUTEILLE_OXYGENE">Bouteille O²</option>
            </select>

            {/* CNAM Filter */}
            <select
              value={cnamFilter}
              onChange={(e) => setCnamFilter(e.target.value)}
              className="px-4 py-3 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-[#1e3a8a] bg-white text-sm shadow-sm hover:shadow-md transition-all duration-200"
            >
              <option value="all">Tous CNAM</option>
              <option value="eligible">Éligible CNAM</option>
              <option value="not_eligible">Non éligible</option>
            </select>

            {/* Date Filter */}
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="px-4 py-3 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-[#1e3a8a] bg-white text-sm shadow-sm hover:shadow-md transition-all duration-200"
            >
              <option value="all">Toutes les dates</option>
              <option value="today">Aujourd'hui</option>
              <option value="week">Cette semaine</option>
              <option value="month">Ce mois</option>
              <option value="year">Cette année</option>
            </select>
          </div>
        </div>

        {/* Rentals Statistics */}
        <div className="mt-4 grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
            <span className="text-slate-600">Actives: {rentalsStats.active}</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></div>
            <span className="text-slate-600">En attente: {rentalsStats.pending}</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
            <span className="text-slate-600">Terminées: {rentalsStats.completed}</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
            <span className="text-slate-600">Annulées: {rentalsStats.cancelled}</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-purple-500 rounded-full mr-2"></div>
            <span className="text-slate-600">Total: {formatCurrency(rentalsStats.totalAmount)}</span>
          </div>
        </div>
      </div>

      <div className="p-6">
        {isLoading ? (
          <div className="flex justify-center items-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1e3a8a]"></div>
          </div>
        ) : currentRentals && currentRentals.length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead 
                    className="cursor-pointer hover:bg-slate-100 transition-colors"
                    onClick={() => handleSort("client")}
                  >
                    <div className="flex items-center">
                      Client
                      {sortBy === "client" && (
                        sortOrder === "asc" ? 
                          <SortAsc className="ml-1 h-4 w-4" /> : 
                          <SortDesc className="ml-1 h-4 w-4" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-slate-100 transition-colors"
                    onClick={() => handleSort("device")}
                  >
                    <div className="flex items-center">
                      Appareil & Paramètres
                      {sortBy === "device" && (
                        sortOrder === "asc" ? 
                          <SortAsc className="ml-1 h-4 w-4" /> : 
                          <SortDesc className="ml-1 h-4 w-4" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-slate-100 transition-colors"
                    onClick={() => handleSort("date")}
                  >
                    <div className="flex items-center">
                      Période
                      {sortBy === "date" && (
                        sortOrder === "asc" ? 
                          <SortAsc className="ml-1 h-4 w-4" /> : 
                          <SortDesc className="ml-1 h-4 w-4" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead>CNAM & Montants</TableHead>
                  <TableHead>Dépôt</TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-slate-100 transition-colors"
                    onClick={() => handleSort("status")}
                  >
                    <div className="flex items-center">
                      Statut
                      {sortBy === "status" && (
                        sortOrder === "asc" ? 
                          <SortAsc className="ml-1 h-4 w-4" /> : 
                          <SortDesc className="ml-1 h-4 w-4" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead>Traité par</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentRentals.map((rental: any, index: number) => {
                  const clientName = rental.patient 
                    ? `${rental.patient.firstName} ${rental.patient.lastName}`
                    : rental.company
                      ? rental.company.companyName
                      : "Client inconnu";
                      
                  const clientType = rental.patient ? "patient" : "company";
                  const cnamSummary = getCnamSummary(rental);
                  const totalAmount = getTotalAmount(rental);
                  const depositInfo = getDepositInfo(rental);
                  const deviceParams = getDeviceParametersSummary(rental);
                  
                  return (
                    <TableRow key={rental.id} className={`hover:bg-slate-50 transition-colors duration-150 ${index % 2 === 0 ? 'bg-white' : 'bg-slate-25'}`}>
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
                            <div className="font-semibold text-slate-900">
                              {clientName}
                              {rental.patient?.patientCode && (
                                <span className="ml-2 text-xs font-normal text-slate-500">
                                  ({rental.patient.patientCode})
                                </span>
                              )}
                              {rental.company?.companyCode && (
                                <span className="ml-2 text-xs font-normal text-slate-500">
                                  ({rental.company.companyCode})
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-500 flex items-center gap-1">
                              {clientType === "patient" ? (
                                <User className="h-3 w-3" />
                              ) : (
                                <Building2 className="h-3 w-3" />
                              )}
                              {clientType === "patient" ? "Patient" : "Entreprise"}
                              {rental.patient?.telephone && ` • ${rental.patient.telephone}`}
                              {rental.company?.telephone && ` • ${rental.company.telephone}`}
                            </div>
                            {rental.patient?.cnamId && (
                              <div className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                                <Shield className="h-3 w-3" />
                                CNAM: {rental.patient.cnamId}
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="flex items-start gap-2">
                          <Package className="h-4 w-4 text-blue-600 mt-1" />
                          <div className="max-w-48">
                            <div className="font-medium">
                              {rental.medicalDevice?.name || "Appareil inconnu"}
                              {rental.rentalCode && (
                                <span className="ml-2 text-xs font-normal text-slate-500">
                                  ({rental.rentalCode})
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-gray-500 mb-1">
                              {rental.medicalDevice?.type || "Type inconnu"}
                            </div>
                            <div className="text-xs text-blue-600 bg-blue-50 rounded px-2 py-1">
                              {deviceParams}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="flex flex-col space-y-1">
                          <div className="flex items-center space-x-1 text-sm">
                            <CalendarIcon className="h-3.5 w-3.5 text-green-600" />
                            <span className="font-medium">{formatSimpleDate(rental.startDate)}</span>
                          </div>
                          <div className="flex items-center space-x-1 text-sm">
                            <CalendarIcon className="h-3.5 w-3.5 text-red-600" />
                            <span>{rental.endDate ? formatSimpleDate(rental.endDate) : "Indéterminée"}</span>
                          </div>
                          {rental.configuration?.urgentRental && (
                            <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-200 text-xs">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Urgent
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="flex flex-col space-y-2">
                          {cnamSummary.badge}
                          <div className="flex items-center space-x-1 text-sm">
                            <CreditCard className="h-3.5 w-3.5 text-green-600" />
                            <span className="font-medium">{totalAmount.toFixed(2)} TND</span>
                          </div>
                          <div className="text-xs text-gray-500">
                            Total location
                          </div>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="flex flex-col space-y-1">
                          {depositInfo.amount > 0 ? (
                            <>
                              <div className="flex items-center space-x-1 text-sm">
                                <Banknote className="h-3.5 w-3.5 text-blue-600" />
                                <span className="font-medium">{depositInfo.amount} TND</span>
                              </div>
                              <div className="text-xs text-gray-500">
                                {depositInfo.method}
                              </div>
                            </>
                          ) : (
                            <Badge variant="outline" className="bg-gray-100 text-gray-800 border-gray-200">
                              Aucun dépôt
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        {getRentalStatusBadge(rental.status)}
                      </TableCell>
                      
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <User className="h-3.5 w-3.5 text-gray-400" />
                          <span className="text-sm text-gray-700">
                            {rental.createdBy 
                              ? `${rental.createdBy.firstName} ${rental.createdBy.lastName}`
                              : "Non spécifié"
                            }
                          </span>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="flex space-x-2">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => {
                                    setSelectedRental(rental);
                                    setIsDetailsDialogOpen(true);
                                  }}
                                  className="flex items-center gap-1 text-xs"
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Voir les détails complets</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  className="border-blue-200 text-blue-800 hover:bg-blue-50 flex items-center gap-1 text-xs"
                                  onClick={() => router.push(`/roles/admin/rentals/${rental.id}`)}
                                >
                                  {(rental.status === "ACTIVE" || rental.status === "PENDING") ? (
                                    <Edit className="h-3.5 w-3.5" />
                                  ) : (
                                    <Eye className="h-3.5 w-3.5" />
                                  )}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>
                                  {(rental.status === "ACTIVE" || rental.status === "PENDING") 
                                    ? "Modifier la location" 
                                    : "Consulter la location"
                                  }
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>

                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => handleDeleteClick(rental.id)}
                                  className="flex items-center gap-1 border-red-200 hover:bg-red-50 hover:text-red-600 text-xs"
                                  disabled={deleteRental.isPending}
                                >
                                  {deleteRental.isPending && rentalToDelete === rental.id ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <Trash2 className="h-3.5 w-3.5" />
                                  )}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Supprimer la location</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
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
              <Building2 className="h-12 w-12 text-blue-400" />
              <h3 className="text-lg font-medium text-gray-900">Aucune location trouvée</h3>
              <p className="max-w-md text-sm text-gray-600">
                {searchTerm || statusFilter !== 'all' || clientTypeFilter !== 'all' || deviceTypeFilter !== 'all' || cnamFilter !== 'all' || dateFilter !== 'all'
                  ? "Aucune location ne correspond aux critères de recherche. Essayez de modifier les filtres."
                  : "Commencez par créer une nouvelle location en utilisant le bouton \"Commencer une Location\" ci-dessus."
                }
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center text-sm text-gray-600">
              <span>
                Affichage de {startIndex + 1} à {Math.min(endIndex, totalItems)} sur {totalItems} locations
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-1 rounded-md text-sm font-medium text-gray-600 hover:text-[#1e3a8a] disabled:opacity-50 disabled:cursor-not-allowed"
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
                    onClick={() => handlePageChange(page)}
                    className={`px-3 py-1 rounded-md text-sm font-medium ${
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
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-3 py-1 rounded-md text-sm font-medium text-gray-600 hover:text-[#1e3a8a] disabled:opacity-50 disabled:cursor-not-allowed"
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
              Êtes-vous sûr de vouloir supprimer cette location?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Cette action annulera définitivement la location. L'appareil sera libéré et les bonds CNAM associés seront annulés.
              Cette action est irréversible.
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
      
      {/* Rental Details Dialog */}
      <RentalDetailsDialog
        isOpen={isDetailsDialogOpen}
        onClose={() => {
          setIsDetailsDialogOpen(false);
          setSelectedRental(null);
        }}
        rental={selectedRental}
      />
    </div>
  );
}

export default RentalTable;