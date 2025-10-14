import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Loader2, FileText, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface TransferRequest {
  id: string;
  transferCode?: string;
  fromLocation: {
    id: string;
    name: string;
  };
  toLocation: {
    id: string;
    name: string;
  };
  product?: {
    id: string;
    name: string;
    brand?: string;
    model?: string;
    type: string;
  };
  medicalDevice?: {
    id: string;
    name: string;
    brand?: string;
    model?: string;
    type: string;
  };
  requestedQuantity: number;
  reason: string;
  urgency: 'LOW' | 'MEDIUM' | 'HIGH';
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED';
  requestedBy: {
    id: string;
    firstName: string;
    lastName: string;
  };
  createdAt: string;
  updatedAt: string;
  reviewedBy?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  reviewedAt?: string;
  reviewNotes?: string;
}

interface TransferRequestsResponse {
  items: TransferRequest[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  summary: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    completed: number;
  };
}

export default function StockTransferRequests() {
  const { data: session } = useSession();
  
  // State for filters and pagination
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedUrgency, setSelectedUrgency] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');

  // Debounce search query to avoid too many API calls
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedStatus, selectedUrgency, debouncedSearchQuery]);

  // Fetch transfer requests
  const { data: requestsData, isLoading } = useQuery<TransferRequestsResponse>({
    queryKey: ['transferRequests', selectedStatus, selectedUrgency, debouncedSearchQuery, currentPage, itemsPerPage],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedStatus !== 'all') {
        params.append('status', selectedStatus);
      }
      if (selectedUrgency !== 'all') {
        params.append('urgency', selectedUrgency);
      }
      if (debouncedSearchQuery) {
        params.append('search', debouncedSearchQuery);
      }
      params.append('page', currentPage.toString());
      params.append('limit', itemsPerPage.toString());
      
      const response = await fetch(`/api/stock/transfer-requests?${params}`);
      if (!response.ok) throw new Error('Failed to fetch transfer requests');
      return response.json();
    },
    enabled: !!session // Only fetch when session is available
  });

  // Pagination handlers
  const goToFirstPage = () => setCurrentPage(1);
  const goToPreviousPage = () => setCurrentPage(prev => Math.max(prev - 1, 1));
  const goToNextPage = () => {
    if (requestsData && currentPage < requestsData.pagination.totalPages) {
      setCurrentPage(prev => prev + 1);
    }
  };
  const goToLastPage = () => {
    if (requestsData) {
      setCurrentPage(requestsData.pagination.totalPages);
    }
  };

  // Get badge for status
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-200"><Clock className="h-3 w-3 mr-1" />En attente</Badge>;
      case 'APPROVED':
        return <Badge variant="default" className="bg-blue-100 text-blue-800 border-blue-200"><CheckCircle className="h-3 w-3 mr-1" />Approuvé</Badge>;
      case 'REJECTED':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Refusé</Badge>;
      case 'COMPLETED':
        return <Badge variant="default" className="bg-green-100 text-green-800 border-green-200"><CheckCircle className="h-3 w-3 mr-1" />Terminé</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Get badge for urgency
  const getUrgencyBadge = (urgency: string) => {
    switch (urgency) {
      case 'HIGH':
        return <Badge variant="destructive">Urgent</Badge>;
      case 'MEDIUM':
        return <Badge variant="secondary">Normal</Badge>;
      case 'LOW':
        return <Badge variant="outline">Faible</Badge>;
      default:
        return <Badge>{urgency}</Badge>;
    }
  };

  // Get product type badge
  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'ACCESSORY':
        return <Badge variant="default" className="bg-purple-100 text-purple-800 border-purple-200">Accessoire</Badge>;
      case 'SPARE_PART':
        return <Badge variant="secondary">Pièce de rechange</Badge>;
      case 'MEDICAL_DEVICE':
        return <Badge variant="destructive">Appareil médical</Badge>;
      case 'DIAGNOSTIC_DEVICE':
        return <Badge variant="outline">Équipement diagnostic</Badge>;
      default:
        return <Badge>{type}</Badge>;
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
        <span className="ml-2">Chargement de vos demandes...</span>
      </div>
    );
  }

  // Get summary data
  const summary = requestsData?.summary || {
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    completed: 0
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-purple-700">Mes Demandes de Transfert</h2>
          <p className="text-sm text-gray-600">
            Suivez le statut de vos demandes de transfert de stock
          </p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="border-purple-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-700">{summary.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">En attente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{summary.pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Approuvées</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{summary.approved}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Terminées</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{summary.completed}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Refusées</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{summary.rejected}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
        <div className="w-full md:w-[150px]">
          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className="border-purple-200 focus:ring-purple-500">
              <SelectValue placeholder="Tous les statuts" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              <SelectItem value="PENDING">En attente</SelectItem>
              <SelectItem value="APPROVED">Approuvées</SelectItem>
              <SelectItem value="COMPLETED">Terminées</SelectItem>
              <SelectItem value="REJECTED">Refusées</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="w-full md:w-[150px]">
          <Select value={selectedUrgency} onValueChange={setSelectedUrgency}>
            <SelectTrigger className="border-purple-200 focus:ring-purple-500">
              <SelectValue placeholder="Toutes urgences" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes urgences</SelectItem>
              <SelectItem value="HIGH">Urgent</SelectItem>
              <SelectItem value="MEDIUM">Normal</SelectItem>
              <SelectItem value="LOW">Faible</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
          <Input
            className="pl-8 border-purple-200 focus:ring-purple-500"
            placeholder="Rechercher par produit..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="w-full md:w-auto">
          <Select 
            value={itemsPerPage.toString()} 
            onValueChange={(value) => setItemsPerPage(parseInt(value))}
          >
            <SelectTrigger className="w-[120px] border-purple-200 focus:ring-purple-500">
              <SelectValue placeholder="10 par page" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10 par page</SelectItem>
              <SelectItem value="25">25 par page</SelectItem>
              <SelectItem value="50">50 par page</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Transfer requests table */}
      <div className="border rounded-lg border-purple-200">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Produit</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>De</TableHead>
              <TableHead>Vers</TableHead>
              <TableHead>Quantité</TableHead>
              <TableHead>Urgence</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Date demande</TableHead>
              <TableHead>Raison</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requestsData?.items.map((request) => {
              // Get product info from either product or medicalDevice
              const productInfo = request.product || request.medicalDevice;
              if (!productInfo) return null;
              
              return (
                <TableRow key={request.id} className="hover:bg-purple-50">
                  <TableCell className="font-medium">
                    <div>
                      <div className="font-medium">{productInfo.name}</div>
                      {(productInfo.brand || productInfo.model) && (
                        <div className="text-xs text-gray-500">
                          {productInfo.brand} {productInfo.model}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{getTypeBadge(productInfo.type)}</TableCell>
                  <TableCell className="text-sm">{request.fromLocation.name}</TableCell>
                  <TableCell className="text-sm">{request.toLocation.name}</TableCell>
                  <TableCell className="font-semibold">{request.requestedQuantity}</TableCell>
                  <TableCell>{getUrgencyBadge(request.urgency)}</TableCell>
                  <TableCell>{getStatusBadge(request.status)}</TableCell>
                  <TableCell className="text-sm">
                    {format(new Date(request.createdAt), 'dd/MM/yyyy', { locale: fr })}
                  </TableCell>
                  <TableCell className="max-w-xs">
                    <div className="text-sm text-gray-600 truncate" title={request.reason}>
                      {request.reason}
                    </div>
                    {request.reviewNotes && (
                      <div className="text-xs text-red-600 mt-1 truncate" title={request.reviewNotes}>
                        Note: {request.reviewNotes}
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
            {(!requestsData?.items || requestsData.items.length === 0) && (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8">
                  <div className="flex flex-col items-center">
                    <FileText className="h-12 w-12 text-gray-400 mb-2" />
                    <span className="text-gray-500">Aucune demande de transfert trouvée</span>
                    <span className="text-gray-400 text-sm mt-1">
                      Utilisez l'onglet "Stock Global" pour demander des transferts
                    </span>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Info message */}
      {requestsData?.items && requestsData.items.length > 0 && (
        <div className="flex items-start gap-3 p-4 bg-purple-50 border border-purple-200 rounded-lg">
          <AlertCircle className="h-5 w-5 text-purple-600 mt-0.5" />
          <div className="text-sm text-purple-800">
            <strong>Information:</strong> Les demandes approuvées seront automatiquement traitées par l'administrateur. 
            Vous recevrez une notification une fois le transfert terminé.
          </div>
        </div>
      )}

      {/* Pagination controls */}
      {requestsData && requestsData.pagination.totalPages > 1 && (
        <div className="flex justify-between items-center">
          <div className="text-sm text-muted-foreground">
            Affichage de {(currentPage - 1) * itemsPerPage + 1} à {Math.min(currentPage * itemsPerPage, requestsData.pagination.total)} sur {requestsData.pagination.total} demandes
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="icon"
              onClick={goToFirstPage}
              disabled={currentPage === 1}
              className="h-8 w-8 p-0"
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={goToPreviousPage}
              disabled={currentPage === 1}
              className="h-8 w-8 p-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <span className="text-sm">
              Page {currentPage} sur {requestsData.pagination.totalPages}
            </span>
            
            <Button
              variant="outline"
              size="icon"
              onClick={goToNextPage}
              disabled={currentPage === requestsData.pagination.totalPages}
              className="h-8 w-8 p-0"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={goToLastPage}
              disabled={currentPage === requestsData.pagination.totalPages}
              className="h-8 w-8 p-0"
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}