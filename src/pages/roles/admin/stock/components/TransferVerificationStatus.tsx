import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, AlertCircle, Clock } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface TransferVerificationStatusProps {
  transferId: string;
  isVerified: boolean | null;
  verifiedById?: string | null;
  verifierName?: string | null;
  verificationDate?: Date | null;
  transferredByRole: string;
  currentUserRole: string;
  transferDate: Date;
  onStatusChange?: () => void;
}

export function TransferVerificationStatus({
  transferId,
  isVerified,
  verifiedById,
  verifierName,
  verificationDate,
  transferredByRole,
  currentUserRole,
  transferDate,
  onStatusChange
}: TransferVerificationStatusProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Format date for display
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Determine if verification is needed
  const needsVerification = transferredByRole !== 'ADMIN' && isVerified === null;
  
  // Determine if current user can verify
  const canVerify = currentUserRole === 'ADMIN' && needsVerification;

  // Mutation to verify a transfer
  const verifyTransfer = useMutation({
    mutationFn: async (verified: boolean) => {
      const response = await fetch(`/api/stock/transfers/${transferId}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verified }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to verify transfer');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transfers'] });
      queryClient.invalidateQueries({ queryKey: ['transferHistory'] });
      toast({
        title: "Succès",
        description: "Le statut de vérification a été mis à jour",
      });
      if (onStatusChange) {
        onStatusChange();
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Erreur",
        description: error.message || "Une erreur est survenue lors de la vérification",
        variant: "destructive",
      });
    },
  });

  // Render appropriate status badge
  const renderStatusBadge = () => {
    if (transferredByRole === 'ADMIN') {
      return (
        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
          <CheckCircle className="h-3.5 w-3.5 mr-1" />
          Transfert administrateur
        </Badge>
      );
    }
    
    if (isVerified === true) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                <CheckCircle className="h-3.5 w-3.5 mr-1" />
                Vérifié
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>Vérifié par {verifierName || 'un administrateur'}</p>
              {verificationDate && <p>le {formatDate(verificationDate)}</p>}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }
    
    if (isVerified === false) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                <XCircle className="h-3.5 w-3.5 mr-1" />
                Rejeté
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>Rejeté par {verifierName || 'un administrateur'}</p>
              {verificationDate && <p>le {formatDate(verificationDate)}</p>}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }
    
    // Pending verification
    return (
      <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
        <Clock className="h-3.5 w-3.5 mr-1" />
        En attente de vérification
      </Badge>
    );
  };

  // Render verification actions for admins
  const renderVerificationActions = () => {
    if (!canVerify) return null;
    
    return (
      <div className="flex gap-2 mt-2">
        <Button 
          size="sm" 
          variant="outline" 
          className="border-green-500 text-green-600 hover:bg-green-50"
          onClick={() => verifyTransfer.mutate(true)}
          disabled={verifyTransfer.isPending}
        >
          <CheckCircle className="h-3.5 w-3.5 mr-1" />
          Approuver
        </Button>
        <Button 
          size="sm" 
          variant="outline" 
          className="border-red-500 text-red-600 hover:bg-red-50"
          onClick={() => verifyTransfer.mutate(false)}
          disabled={verifyTransfer.isPending}
        >
          <XCircle className="h-3.5 w-3.5 mr-1" />
          Rejeter
        </Button>
      </div>
    );
  };

  return (
    <div className="flex flex-col">
      {renderStatusBadge()}
      {renderVerificationActions()}
    </div>
  );
}

export default TransferVerificationStatus;
