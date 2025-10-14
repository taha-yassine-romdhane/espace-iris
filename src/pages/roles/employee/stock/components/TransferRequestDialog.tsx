import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/components/ui/use-toast";
import { ArrowRightLeft, Package, MapPin, Loader2 } from 'lucide-react';

interface Stock {
  id: string;
  location: {
    id: string;
    name: string;
  };
  product: {
    id: string;
    name: string;
    model: string;
    brand: string;
    type: string;
    serialNumber?: string;
  };
  quantity: number;
  status: string;
  isDevice?: boolean;
}

interface TransferRequestDialogProps {
  isOpen: boolean;
  onClose: () => void;
  product: Stock | null;
}

interface TransferRequestData {
  fromLocationId: string;
  productId: string;
  requestedQuantity: number;
  reason: string;
  urgency: 'LOW' | 'MEDIUM' | 'HIGH';
}

export default function TransferRequestDialog({ 
  isOpen, 
  onClose, 
  product 
}: TransferRequestDialogProps) {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  
  const [requestedQuantity, setRequestedQuantity] = useState(1);
  const [reason, setReason] = useState('');
  const [urgency, setUrgency] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('MEDIUM');

  // Reset form when dialog opens/closes or product changes
  useEffect(() => {
    if (isOpen && product) {
      setRequestedQuantity(1);
      setReason('');
      setUrgency('MEDIUM');
    }
  }, [isOpen, product]);

  // Create transfer request mutation - now uses /api/stock/transfers
  const createTransferRequest = useMutation({
    mutationFn: async (requestData: TransferRequestData) => {
      // Get user's stock location for the destination
      const userLocationResponse = await fetch('/api/stock/locations?userId=' + session?.user?.id);
      const userLocations = await userLocationResponse.json();
      const userLocation = userLocations.find((loc: any) => loc.userId === session?.user?.id);
      
      if (!userLocation) {
        throw new Error('Votre emplacement de stock personnel n\'a pas été trouvé');
      }

      const response = await fetch('/api/stock/transfers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fromLocationId: requestData.fromLocationId,
          toLocationId: userLocation.id,
          productId: requestData.productId,
          quantity: requestData.requestedQuantity,
          notes: requestData.reason,
          urgency: requestData.urgency
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to submit transfer request');
      }

      return response.json();
    },
    onSuccess: (data) => {
      if (urgency === 'HIGH') {
        toast({
          title: "Transfert urgent exécuté",
          description: "Le transfert urgent a été effectué immédiatement. Un administrateur vérifiera cette action ultérieurement.",
          className: "bg-orange-50 border-orange-200",
        });
      } else {
        toast({
          title: "Demande de transfert envoyée",
          description: urgency === 'MEDIUM' 
            ? "Votre demande sera traitée par l'administrateur dès que possible."
            : "Votre demande de priorité faible sera traitée lorsque l'administrateur sera disponible.",
        });
      }
      queryClient.invalidateQueries({ queryKey: ['transferRequests'] });
      queryClient.invalidateQueries({ queryKey: ['myInventory'] });
      queryClient.invalidateQueries({ queryKey: ['globalStock'] });
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de soumettre la demande de transfert",
        variant: "destructive",
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!product) return;

    // Validation
    if (requestedQuantity <= 0) {
      toast({
        title: "Quantité invalide",
        description: "La quantité demandée doit être supérieure à 0",
        variant: "destructive",
      });
      return;
    }

    if (requestedQuantity > product.quantity) {
      toast({
        title: "Quantité non disponible",
        description: `Seulement ${product.quantity} unité(s) disponible(s)`,
        variant: "destructive",
      });
      return;
    }

    if (!reason.trim()) {
      toast({
        title: "Raison requise",
        description: "Veuillez préciser la raison de cette demande de transfert",
        variant: "destructive",
      });
      return;
    }

    // Submit request
    createTransferRequest.mutate({
      fromLocationId: product.location.id,
      productId: product.product.id,
      requestedQuantity,
      reason: reason.trim(),
      urgency,
    });
  };

  if (!product) return null;

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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5 text-blue-600" />
            Demande de Transfert
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Product Information */}
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="flex items-start gap-3">
              <Package className="h-5 w-5 text-gray-600 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-medium text-gray-900">{product.product.name}</h4>
                <div className="text-sm text-gray-600 space-y-1 mt-1">
                  {product.product.brand && (
                    <div>Marque: {product.product.brand}</div>
                  )}
                  {product.product.model && (
                    <div>Modèle: {product.product.model}</div>
                  )}
                  <div className="flex items-center gap-2">
                    Type: {getTypeBadge(product.product.type)}
                  </div>
                </div>
              </div>
            </div>
            
            <Separator className="my-3" />
            
            <div className="flex items-center gap-3">
              <MapPin className="h-4 w-4 text-gray-600" />
              <div className="text-sm">
                <span className="font-medium">Emplacement source: </span>
                {product.location.name}
              </div>
            </div>
            
            <div className="text-sm mt-2">
              <span className="font-medium">Quantité disponible: </span>
              <span className="text-green-600 font-semibold">{product.quantity}</span>
            </div>
          </div>

          {/* Request Details */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="quantity">Quantité demandée</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  max={product.quantity}
                  value={requestedQuantity}
                  onChange={(e) => setRequestedQuantity(parseInt(e.target.value) || 1)}
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="urgency">Urgence</Label>
                <select
                  id="urgency"
                  value={urgency}
                  onChange={(e) => setUrgency(e.target.value as 'LOW' | 'MEDIUM' | 'HIGH')}
                  className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="LOW">Faible priorité</option>
                  <option value="MEDIUM">Priorité normale</option>
                  <option value="HIGH">Urgente</option>
                </select>
              </div>
            </div>

            <div>
              <Label htmlFor="reason">Raison de la demande *</Label>
              <Textarea
                id="reason"
                placeholder="Décrivez pourquoi vous avez besoin de ce produit..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="mt-1"
                rows={3}
              />
            </div>
          </div>

          {/* Preview */}
          <div className={`p-3 rounded-lg border ${
            urgency === 'HIGH' 
              ? 'bg-orange-50 border-orange-200' 
              : 'bg-blue-50 border-blue-200'
          }`}>
            <h5 className={`font-medium mb-2 ${
              urgency === 'HIGH' ? 'text-orange-900' : 'text-blue-900'
            }`}>
              Résumé de la demande
            </h5>
            <div className={`text-sm space-y-1 ${
              urgency === 'HIGH' ? 'text-orange-800' : 'text-blue-800'
            }`}>
              <div>Quantité: <span className="font-medium">{requestedQuantity} unité(s)</span></div>
              <div className="flex items-center gap-2">
                Urgence: {getUrgencyBadge(urgency)}
              </div>
              <div>
                Sera transféré vers votre emplacement de stock personnel
              </div>
              {urgency === 'HIGH' && (
                <div className="mt-2 pt-2 border-t border-orange-200">
                  <strong>⚠️ Transfert urgent:</strong> Le transfert sera exécuté immédiatement sans attendre l'approbation de l'administrateur.
                </div>
              )}
              {urgency === 'MEDIUM' && (
                <div className="mt-2 pt-2 border-t border-blue-200">
                  <strong>ℹ️ Transfert normal:</strong> Nécessite l'approbation d'un administrateur.
                </div>
              )}
              {urgency === 'LOW' && (
                <div className="mt-2 pt-2 border-t border-blue-200">
                  <strong>ℹ️ Transfert faible priorité:</strong> Sera traité lorsque l'administrateur sera disponible.
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={createTransferRequest.isPending}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-blue-600 hover:bg-blue-700"
              disabled={createTransferRequest.isPending}
            >
              {createTransferRequest.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Envoi...
                </>
              ) : (
                <>
                  <ArrowRightLeft className="h-4 w-4 mr-2" />
                  Envoyer la demande
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}