import React, { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
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
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  CalendarIcon,
  Building2,
  User,
  Clock,
  FileText,
  Settings,
  Shield,
  AlertTriangle,
  CheckCircle,
  Eye,
  Package,
  Search,
  Filter,
  SortAsc,
  SortDesc,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface RentalTableProps {
  onViewDetails?: (id: string) => void;
  onEdit?: (id: string) => void;
}

export function RentalTable({ onViewDetails, onEdit }: RentalTableProps) {
  const { data: session } = useSession();
  const router = useRouter();
  
  // Enhanced filtering states
  const [filteredRentals, setFilteredRentals] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [clientTypeFilter, setClientTypeFilter] = useState<string>("all");
  const [deviceTypeFilter, setDeviceTypeFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // Fetch rental operations data filtered by employee
  const { data: rentalOperations, isLoading } = useQuery({
    queryKey: ["employee-rental-operations", session?.user?.id],
    queryFn: async () => {
      try {
        // Add employee filter to only show rentals created by logged-in employee
        const response = await fetch(`/api/rentals?createdById=${session?.user?.id}&role=employee`);
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
    enabled: !!session?.user?.id,
  });

  // Initialize filtered rentals when data loads
  useEffect(() => {
    if (rentalOperations) {
      setFilteredRentals(rentalOperations);
    }
  }, [rentalOperations]);

  // Function to format date
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    return format(new Date(dateString), "PPP", { locale: fr });
  };

  // Function to calculate rental duration in days
  const calculateDuration = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const differenceInTime = end.getTime() - start.getTime();
    return Math.ceil(differenceInTime / (1000 * 3600 * 24));
  };

  // Function to get payment status badge
  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return (
          <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200">
            En attente
          </Badge>
        );
      case "PAID":
        return (
          <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
            Payé
          </Badge>
        );
      case "GUARANTEE":
        return (
          <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200">
            Garantie
          </Badge>
        );
      case "PARTIAL":
        return (
          <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-200">
            Partiel
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

  // Function to format simple date
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

  // Function to get CNAM status summary (employee version)
  const getCnamSummary = (rental: any) => {
    const configuration = rental.configuration || {};
    const cnamBonds = rental.cnamBonds || [];
    
    if (cnamBonds.length === 0) {
      return null;
    }

    const approvedBonds = cnamBonds.filter((bond: any) => bond.status === 'APPROUVE');
    const pendingBonds = cnamBonds.filter((bond: any) => bond.status === 'EN_ATTENTE_APPROBATION' || bond.status === 'EN_ATTENTE');
    
    if (approvedBonds.length > 0) {
      return (
        <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
          <Shield className="h-3 w-3 mr-1" />
          CNAM
        </Badge>
      );
    } else if (pendingBonds.length > 0) {
      return (
        <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200">
          <Shield className="h-3 w-3 mr-1" />
          CNAM En Attente
        </Badge>
      );
    }
    
    return null;
  };

  // Handle view details
  const handleViewDetails = (rentalId: string) => {
    router.push(`/roles/employee/rentals/${rentalId}`);
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
          rental.company?.telephone?.includes(searchTerm) ||
          rental.rentalCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          rental.medicalDevice?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          rental.medicalDevice?.serialNumber?.toLowerCase().includes(searchTerm.toLowerCase())
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
      filtered = filtered.filter((rental: any) => {
        const deviceName = rental.medicalDevice?.name?.toLowerCase() || "";
        const deviceType = rental.medicalDevice?.type?.toLowerCase() || "";
        
        if (deviceTypeFilter === "CPAP") {
          return deviceName.includes("cpap") || deviceType.includes("cpap");
        } else if (deviceTypeFilter === "VNI") {
          return deviceName.includes("vni") || deviceName.includes("vi") || deviceType.includes("vni");
        } else if (deviceTypeFilter === "OXYGEN") {
          return deviceName.includes("oxygène") || deviceName.includes("oxygen") || 
                 deviceName.includes("concentrateur") || deviceName.includes("bouteille");
        }
        return false;
      });
    }

    // Apply sorting
    filtered.sort((a: any, b: any) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case "client":
          aValue = a.patient ? `${a.patient.firstName} ${a.patient.lastName}` : a.company?.companyName || "";
          bValue = b.patient ? `${b.patient.firstName} ${b.patient.lastName}` : b.company?.companyName || "";
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
      
      if (sortOrder === "asc") {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    setFilteredRentals(filtered);
    setCurrentPage(1); // Reset to first page when filters change
  }, [rentalOperations, searchTerm, statusFilter, clientTypeFilter, deviceTypeFilter, sortBy, sortOrder]);

  // Paginated rentals
  const paginatedRentals = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredRentals.slice(startIndex, endIndex);
  }, [filteredRentals, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredRentals.length / itemsPerPage);

  // Get rentals statistics
  const stats = useMemo(() => {
    return {
      total: filteredRentals.length,
      active: filteredRentals.filter((r: any) => r.status === 'ACTIVE').length,
      pending: filteredRentals.filter((r: any) => r.status === 'PENDING').length,
      completed: filteredRentals.filter((r: any) => r.status === 'COMPLETED').length,
    };
  }, [filteredRentals]);

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      <div className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-800">Mes Locations</h2>
          <div className="flex gap-2 text-sm">
            <Badge variant="outline" className="bg-blue-50">
              Total: {stats.total}
            </Badge>
            <Badge variant="outline" className="bg-green-50">
              Actives: {stats.active}
            </Badge>
            <Badge variant="outline" className="bg-yellow-50">
              En attente: {stats.pending}
            </Badge>
          </div>
        </div>
        
        {/* Filters */}
        <div className="mb-4 space-y-3">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Rechercher par patient, appareil, code..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="ACTIVE">Actif</SelectItem>
                <SelectItem value="PENDING">En attente</SelectItem>
                <SelectItem value="COMPLETED">Terminé</SelectItem>
                <SelectItem value="CANCELLED">Annulé</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={clientTypeFilter} onValueChange={setClientTypeFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Type Client" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                <SelectItem value="patient">Patients</SelectItem>
                <SelectItem value="company">Entreprises</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={deviceTypeFilter} onValueChange={setDeviceTypeFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Appareil" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                <SelectItem value="CPAP">CPAP</SelectItem>
                <SelectItem value="VNI">VNI</SelectItem>
                <SelectItem value="OXYGEN">Oxygène</SelectItem>
              </SelectContent>
            </Select>
            
            <Button
              variant="outline"
              size="icon"
              onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
            >
              {sortOrder === "asc" ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
            </Button>
          </div>
        </div>
        
        {isLoading ? (
          <div className="flex justify-center items-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-900"></div>
          </div>
        ) : paginatedRentals && paginatedRentals.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Appareil</TableHead>
                  <TableHead>Période</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>CNAM</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedRentals.map((rental: any) => {
                  const clientName = rental.patient 
                    ? `${rental.patient.firstName} ${rental.patient.lastName}`
                    : rental.company
                      ? rental.company.companyName
                      : "Client inconnu";
                      
                  const clientType = rental.patient ? "patient" : "company";
                  const rentalDuration = rental.endDate && rental.startDate ? 
                    calculateDuration(rental.startDate, rental.endDate) : null;
                  
                  return (
                    <TableRow key={rental.id} className="hover:bg-gray-50">
                      <TableCell>
                        <div className="font-mono text-sm">
                          {rental.rentalCode || rental.id.slice(-8)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-start gap-2">
                          {clientType === "patient" ? (
                            <User className="h-4 w-4 text-blue-600 mt-1" />
                          ) : (
                            <Building2 className="h-4 w-4 text-blue-600 mt-1" />
                          )}
                          <div>
                            <div className="font-medium">{clientName}</div>
                            <div className="text-xs text-gray-500">
                              {rental.patient?.patientCode || rental.company?.companyCode || ""}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="flex items-start gap-2">
                          <Settings className="h-4 w-4 text-blue-600 mt-1" />
                          <div>
                            <div className="font-medium">{rental.medicalDevice?.name || "Appareil inconnu"}</div>
                            <div className="text-xs text-gray-500">
                              {rental.medicalDevice?.serialNumber || "Sans SN"}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="text-sm">
                          <div>{formatSimpleDate(rental.startDate)}</div>
                          {rental.endDate ? (
                            <div className="text-xs text-gray-500">
                              au {formatSimpleDate(rental.endDate)}
                              {rentalDuration && ` (${rentalDuration}j)`}
                            </div>
                          ) : (
                            <div className="text-xs text-gray-500">Indéterminée</div>
                          )}
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        {getRentalStatusBadge(rental.status)}
                      </TableCell>
                      
                      <TableCell>
                        {getCnamSummary(rental)}
                      </TableCell>
                      
                      <TableCell>
                        <TooltipProvider>
                          <div className="flex space-x-1">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => handleViewDetails(rental.id)}
                                  className="h-8 w-8 p-0"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Voir détails</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        </TooltipProvider>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
              </Table>
            </div>
            
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-4 flex items-center justify-between">
                <div className="text-sm text-gray-500">
                  Affichage {((currentPage - 1) * itemsPerPage) + 1} à {Math.min(currentPage * itemsPerPage, filteredRentals.length)} sur {filteredRentals.length} locations
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                  >
                    Précédent
                  </Button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const pageNum = i + 1;
                      return (
                        <Button
                          key={pageNum}
                          variant={currentPage === pageNum ? "default" : "outline"}
                          size="sm"
                          className="w-8 h-8 p-0"
                          onClick={() => setCurrentPage(pageNum)}
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Suivant
                  </Button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="border border-gray-200 rounded-lg p-8 text-center text-gray-500">
            <div className="flex flex-col items-center justify-center space-y-3">
              <Package className="h-12 w-12 text-gray-400" />
              <h3 className="text-lg font-medium text-gray-900">
                {searchTerm || statusFilter !== "all" || clientTypeFilter !== "all" || deviceTypeFilter !== "all" 
                  ? "Aucune location trouvée" 
                  : "Aucune location créée"}
              </h3>
              <p className="max-w-md text-sm text-gray-500">
                {searchTerm || statusFilter !== "all" || clientTypeFilter !== "all" || deviceTypeFilter !== "all"
                  ? "Essayez de modifier vos critères de recherche."
                  : "Commencez par créer une nouvelle location en utilisant le bouton 'Commencer une Location' ci-dessus."}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default RentalTable;
