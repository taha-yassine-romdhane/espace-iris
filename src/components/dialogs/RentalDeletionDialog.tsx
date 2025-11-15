import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Loader2, Package, CreditCard, Shield } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface RentalDeletionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rentalId: string | null;
  rentalCode?: string;
  onDeleteComplete?: () => void;
}

interface RentalDeletionData {
  rentalCode: string;
  patientName: string;
  deviceName: string;
  deviceSerialNumber?: string;
  stockLocationName?: string;
  paymentsCount: number;
  cnamBonsCount: number;
  accessoriesCount: number;
  gapsCount: number;
}

export function RentalDeletionDialog({
  open,
  onOpenChange,
  rentalId,
  rentalCode,
  onDeleteComplete,
}: RentalDeletionDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletionData, setDeletionData] = useState<RentalDeletionData | null>(null);
  const { toast } = useToast();

  // Fetch deletion preview data when dialog opens
  useEffect(() => {
    if (open && rentalId) {
      fetchDeletionData();
    } else {
      setDeletionData(null);
    }
  }, [open, rentalId]);

  const fetchDeletionData = async () => {
    if (!rentalId) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/rentals/comprehensive/${rentalId}/deletion-preview`);
      if (!response.ok) {
        throw new Error('Failed to fetch deletion preview');
      }
      const data = await response.json();
      setDeletionData(data);
    } catch (error) {
      console.error('Error fetching deletion data:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les données de suppression',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!rentalId) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/rentals/comprehensive/${rentalId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete rental');
      }

      toast({
        title: 'Succès',
        description: 'La location et toutes ses données associées ont été supprimées',
      });

      onOpenChange(false);
      if (onDeleteComplete) {
        onDeleteComplete();
      }
    } catch (error) {
      console.error('Error deleting rental:', error);
      toast({
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Une erreur est survenue lors de la suppression',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Confirmer la suppression
          </DialogTitle>
          <DialogDescription>
            Cette action est irréversible et supprimera toutes les données associées.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          </div>
        ) : deletionData ? (
          <div className="space-y-4">
            {/* Rental Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-sm text-blue-900 mb-2">Location à supprimer</h4>
              <div className="space-y-1 text-sm text-blue-800">
                <p><span className="font-medium">Code:</span> {deletionData.rentalCode}</p>
                <p><span className="font-medium">Patient:</span> {deletionData.patientName}</p>
                <p><span className="font-medium">Appareil:</span> {deletionData.deviceName}</p>
                {deletionData.deviceSerialNumber && (
                  <p><span className="font-medium">N° Série:</span> {deletionData.deviceSerialNumber}</p>
                )}
              </div>
            </div>

            {/* What will be deleted */}
            <div className="space-y-2">
              <h4 className="font-semibold text-sm text-gray-900">Les éléments suivants seront supprimés :</h4>

              {deletionData.paymentsCount > 0 && (
                <div className="flex items-center gap-2 text-sm text-gray-700 bg-orange-50 border border-orange-200 rounded p-2">
                  <CreditCard className="h-4 w-4 text-orange-600" />
                  <span><strong>{deletionData.paymentsCount}</strong> paiement{deletionData.paymentsCount > 1 ? 's' : ''}</span>
                </div>
              )}

              {deletionData.cnamBonsCount > 0 && (
                <div className="flex items-center gap-2 text-sm text-gray-700 bg-purple-50 border border-purple-200 rounded p-2">
                  <Shield className="h-4 w-4 text-purple-600" />
                  <span><strong>{deletionData.cnamBonsCount}</strong> bon{deletionData.cnamBonsCount > 1 ? 's' : ''} CNAM</span>
                </div>
              )}

              {deletionData.accessoriesCount > 0 && (
                <div className="flex items-center gap-2 text-sm text-gray-700 bg-green-50 border border-green-200 rounded p-2">
                  <Package className="h-4 w-4 text-green-600" />
                  <span><strong>{deletionData.accessoriesCount}</strong> accessoire{deletionData.accessoriesCount > 1 ? 's' : ''}</span>
                </div>
              )}

              {deletionData.paymentsCount === 0 &&
               deletionData.cnamBonsCount === 0 &&
               deletionData.accessoriesCount === 0 && (
                <p className="text-sm text-gray-600 italic">Aucune donnée associée</p>
              )}
            </div>

            {/* Device return info */}
            {deletionData.stockLocationName && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-sm text-green-800">
                  <span className="font-medium">L'appareil sera retourné au stock:</span> {deletionData.stockLocationName}
                </p>
              </div>
            )}

            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-800 font-medium">
                ⚠️ Cette action est irréversible et supprimera définitivement toutes les données.
              </p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-600">Chargement des données...</p>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
          >
            Annuler
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isLoading || isDeleting || !deletionData}
          >
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Suppression...
              </>
            ) : (
              'Supprimer définitivement'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
