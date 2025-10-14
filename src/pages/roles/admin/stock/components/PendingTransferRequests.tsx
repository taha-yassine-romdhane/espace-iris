import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CheckCircle, XCircle, Clock, Eye, AlertTriangle } from 'lucide-react';

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

export default function PendingTransferRequests() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [statusFilter, setStatusFilter] = useState('PENDING');
  const [selectedRequest, setSelectedRequest] = useState<TransferRequest | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
  const [reviewAction, setReviewAction] = useState<'APPROVED' | 'REJECTED'>('APPROVED');

  // Fetch all transfer requests (admin can see all)
  const { data: requestsData, isLoading } = useQuery<TransferRequestsResponse>({
    queryKey: ['adminTransferRequests', statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }
      params.append('limit', '50');
      
      const response = await fetch(`/api/stock/transfer-requests?${params}`);
      if (!response.ok) throw new Error('Failed to fetch transfer requests');
      return response.json();
    }
  });

  // Review transfer request mutation using the /api/stock/transfers PUT method
  const reviewRequestMutation = useMutation({
    mutationFn: async ({ requestId, action, notes }: { 
      requestId: string; 
      action: 'APPROVE' | 'REJECT'; 
      notes?: string 
    }) => {
      const response = await fetch(`/api/stock/transfers`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId,
          action,
          reviewNotes: notes
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to review request');
      }
      
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['adminTransferRequests'] });
      
      toast({
        title: `Demande ${variables.action === 'APPROVE' ? 'approuvée' : 'refusée'}`,
        description: variables.action === 'APPROVE' 
          ? 'La demande de transfert a été approuvée avec succès.'
          : 'La demande de transfert a été refusée.',
      });
      
      setIsReviewDialogOpen(false);
      setSelectedRequest(null);
      setReviewNotes('');
    },
    onError: (error: Error) => {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const handleReviewRequest = (request: TransferRequest, action: 'APPROVED' | 'REJECTED') => {
    setSelectedRequest(request);
    setReviewAction(action);
    setIsReviewDialogOpen(true);
  };

  const submitReview = () => {
    if (!selectedRequest) return;
    
    reviewRequestMutation.mutate({
      requestId: selectedRequest.id,
      action: reviewAction === 'APPROVED' ? 'APPROVE' : 'REJECT',
      notes: reviewNotes.trim() || undefined
    });
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-200"><Clock className="h-3 w-3 mr-1" />En attente</Badge>;
      case 'APPROVED':
        return <Badge variant="default" className="bg-blue-100 text-blue-800 border-blue-200"><CheckCircle className="h-3 w-3 mr-1" />Approuvée</Badge>;
      case 'REJECTED':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Refusée</Badge>;
      case 'COMPLETED':
        return <Badge variant="default" className="bg-green-100 text-green-800 border-green-200"><CheckCircle className="h-3 w-3 mr-1" />Terminée</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Get urgency badge
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
        return <Badge variant="default" className="bg-blue-100 text-blue-800 border-blue-200">Accessoire</Badge>;
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

  if (isLoading) {
    return <div className="text-center py-4">Chargement des demandes...</div>;
  }

  const summary = requestsData?.summary || { total: 0, pending: 0, approved: 0, rejected: 0, completed: 0 };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">Demandes de Transfert</h2>
          <p className="text-sm text-gray-600">
            Gérez les demandes de transfert des employés
          </p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="text-sm font-medium text-blue-600">Total</div>
          <div className="text-2xl font-bold text-blue-700">{summary.total}</div>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="text-sm font-medium text-yellow-600">En attente</div>
          <div className="text-2xl font-bold text-yellow-700">{summary.pending}</div>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="text-sm font-medium text-blue-600">Approuvées</div>
          <div className="text-2xl font-bold text-blue-700">{summary.approved}</div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="text-sm font-medium text-green-600">Terminées</div>
          <div className="text-2xl font-bold text-green-700">{summary.completed}</div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="text-sm font-medium text-red-600">Refusées</div>
          <div className="text-2xl font-bold text-red-700">{summary.rejected}</div>
        </div>
      </div>

      {/* Status filter */}
      <div className="flex items-center gap-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filtrer par statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les demandes</SelectItem>
            <SelectItem value="PENDING">En attente</SelectItem>
            <SelectItem value="APPROVED">Approuvées</SelectItem>
            <SelectItem value="REJECTED">Refusées</SelectItem>
            <SelectItem value="COMPLETED">Terminées</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Transfer requests table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Produit</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>De</TableHead>
              <TableHead>Vers</TableHead>
              <TableHead>Quantité</TableHead>
              <TableHead>Demandeur</TableHead>
              <TableHead>Urgence</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requestsData?.items.map((request) => {
              const productInfo = request.product || request.medicalDevice;
              if (!productInfo) return null;
              
              return (
                <TableRow key={request.id}>
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
                  <TableCell className="text-sm">
                    {request.requestedBy.firstName} {request.requestedBy.lastName}
                  </TableCell>
                  <TableCell>{getUrgencyBadge(request.urgency)}</TableCell>
                  <TableCell>{getStatusBadge(request.status)}</TableCell>
                  <TableCell className="text-sm">
                    {format(new Date(request.createdAt), 'dd/MM/yyyy', { locale: fr })}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {request.status === 'PENDING' ? (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleReviewRequest(request, 'APPROVED')}
                            className="text-green-600 hover:bg-green-50"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleReviewRequest(request, 'REJECTED')}
                            className="text-red-600 hover:bg-red-50"
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <span className="text-xs text-gray-400">
                          {request.reviewedBy ? 
                            `Par ${request.reviewedBy.firstName} ${request.reviewedBy.lastName}` : 
                            'Traité'
                          }
                        </span>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
            {(!requestsData?.items || requestsData.items.length === 0) && (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-8">
                  <div className="text-gray-500">Aucune demande de transfert trouvée</div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Review Dialog */}
      <Dialog open={isReviewDialogOpen} onOpenChange={setIsReviewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {reviewAction === 'APPROVED' ? 'Approuver' : 'Refuser'} la demande de transfert
            </DialogTitle>
          </DialogHeader>
          
          {selectedRequest && (
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium mb-2">Détails de la demande</h4>
                <div className="text-sm space-y-1">
                  <div><strong>Produit:</strong> {(selectedRequest.product || selectedRequest.medicalDevice)?.name}</div>
                  <div><strong>Quantité:</strong> {selectedRequest.requestedQuantity}</div>
                  <div><strong>De:</strong> {selectedRequest.fromLocation.name}</div>
                  <div><strong>Vers:</strong> {selectedRequest.toLocation.name}</div>
                  <div><strong>Demandeur:</strong> {selectedRequest.requestedBy.firstName} {selectedRequest.requestedBy.lastName}</div>
                  <div><strong>Raison:</strong> {selectedRequest.reason}</div>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">
                  Notes de révision {reviewAction === 'REJECTED' ? '(obligatoire)' : '(optionnel)'}
                </label>
                <Textarea
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder={
                    reviewAction === 'APPROVED' 
                      ? "Ajouter des notes sur l'approbation..." 
                      : "Expliquer la raison du refus..."
                  }
                  className="mt-1"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button variant="outline" onClick={() => setIsReviewDialogOpen(false)}>
                  Annuler
                </Button>
                <Button
                  onClick={submitReview}
                  disabled={reviewRequestMutation.isPending || (reviewAction === 'REJECTED' && !reviewNotes.trim())}
                  className={reviewAction === 'APPROVED' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
                >
                  {reviewRequestMutation.isPending ? 'Traitement...' : 
                   reviewAction === 'APPROVED' ? 'Approuver' : 'Refuser'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}