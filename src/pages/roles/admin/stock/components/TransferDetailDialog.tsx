import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Loader2 } from "lucide-react";
import TransferVerificationStatus from './TransferVerificationStatus';

interface TransferDetailDialogProps {
  transferId: string;
  isOpen: boolean;
  onClose: () => void;
  currentUserRole: string;
}

export function TransferDetailDialog({
  transferId,
  isOpen,
  onClose,
  currentUserRole
}: TransferDetailDialogProps) {
  // Fetch transfer details
  const { data: transfer, isLoading, refetch } = useQuery({
    queryKey: ['transferDetail', transferId],
    queryFn: async () => {
      const response = await fetch(`/api/stock/transfers/${transferId}`);
      if (!response.ok) throw new Error('Failed to fetch transfer details');
      return response.json();
    },
    enabled: isOpen && !!transferId,
  });

  // Format date for display
  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "dd/MM/yyyy HH:mm", { locale: fr });
  };

  // Get product type badge
  const getProductTypeBadge = (type: string) => {
    switch (type) {
      case 'ACCESSORY':
        return <Badge variant="default">Accessoire</Badge>;
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

  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'FOR_SALE':
        return <Badge variant="default">En vente</Badge>;
      case 'FOR_RENT':
        return <Badge variant="secondary">En location</Badge>;
      case 'EN_REPARATION':
        return <Badge variant="destructive">En réparation</Badge>;
      case 'HORS_SERVICE':
        return <Badge variant="outline">Hors service</Badge>;
      case 'ACTIVE':
        return <Badge variant="default">Actif</Badge>;
      case 'MAINTENANCE':
        return <Badge variant="secondary">En maintenance</Badge>;
      case 'RETIRED':
        return <Badge variant="destructive">Retiré</Badge>;
      case 'RESERVED':
        return <Badge variant="outline">Réservé</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent>
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!transfer) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Erreur</DialogTitle>
            <DialogDescription>
              Impossible de charger les détails du transfert.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={onClose}>Fermer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Détails du transfert</DialogTitle>
          <DialogDescription>
            Transfert créé le {formatDate(transfer.transferDate)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Verification Status */}
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-sm font-medium">Statut de vérification</h3>
            <TransferVerificationStatus 
              transferId={transfer.id}
              isVerified={transfer.isVerified}
              verifiedById={transfer.verifiedById}
              verifierName={transfer.verifiedBy ? `${transfer.verifiedBy.firstName} ${transfer.verifiedBy.lastName}` : null}
              verificationDate={transfer.verificationDate}
              transferredByRole={transfer.transferredBy.role}
              currentUserRole={currentUserRole}
              transferDate={new Date(transfer.transferDate)}
              onStatusChange={() => refetch()}
            />
          </div>

          <Separator />

          {/* Product info */}
          <div>
            <h3 className="text-sm font-medium mb-2">Produit</h3>
            <div className="bg-slate-50 p-3 rounded-md">
              <div className="flex justify-between mb-1">
                <span className="text-sm font-medium">{transfer.product.name}</span>
                {getProductTypeBadge(transfer.product.type)}
              </div>
              {(transfer.product.brand || transfer.product.model) && (
                <p className="text-sm text-gray-600 mb-1">
                  {[transfer.product.brand, transfer.product.model].filter(Boolean).join(' - ')}
                </p>
              )}
              <p className="text-sm">
                <span className="font-medium">Quantité: </span> 
                {transfer.quantity}
              </p>
              {transfer.newStatus && (
                <p className="text-sm mt-1">
                  <span className="font-medium">Nouveau statut: </span> 
                  {getStatusBadge(transfer.newStatus)}
                </p>
              )}
            </div>
          </div>

          {/* Location info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-medium mb-2">De</h3>
              <div className="bg-slate-50 p-3 rounded-md">
                <p className="text-sm font-medium">{transfer.fromLocation.name}</p>
                {transfer.sentBy && (
                  <p className="text-sm text-gray-600 mt-1">
                    Envoyé par: {transfer.sentBy.firstName} {transfer.sentBy.lastName}
                  </p>
                )}
              </div>
            </div>
            <div>
              <h3 className="text-sm font-medium mb-2">Vers</h3>
              <div className="bg-slate-50 p-3 rounded-md">
                <p className="text-sm font-medium">{transfer.toLocation.name}</p>
                {transfer.receivedBy && (
                  <p className="text-sm text-gray-600 mt-1">
                    Reçu par: {transfer.receivedBy.firstName} {transfer.receivedBy.lastName}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Transfer information */}
          <div>
            <h3 className="text-sm font-medium mb-2">Informations du transfert</h3>
            <div className="bg-slate-50 p-3 rounded-md">
              <p className="text-sm">
                <span className="font-medium">Transféré par: </span>
                {transfer.transferredBy.firstName} {transfer.transferredBy.lastName}
              </p>
              <p className="text-sm">
                <span className="font-medium">Date: </span>
                {formatDate(transfer.transferDate)}
              </p>
              {transfer.notes && (
                <>
                  <h4 className="text-sm font-medium mt-2 mb-1">Notes:</h4>
                  <p className="text-sm text-gray-700 bg-white p-2 rounded border border-gray-200">
                    {transfer.notes}
                  </p>
                </>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={onClose}>Fermer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default TransferDetailDialog;
