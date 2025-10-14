import React, { useEffect } from 'react';
import { Loader2, Info } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useCNAMDossiers } from '@/hooks/useCNAMDossiers';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import CNAMDossierManager from '@/components/payment/components/CNAMDossierManager';
import { Button } from '@/components/ui/button';

interface SaleDetailsCNAMTabProps {
  saleId: string;
  isReadOnly?: boolean;
}

const SaleDetailsCNAMTab: React.FC<SaleDetailsCNAMTabProps> = ({ 
  saleId,
  isReadOnly = false
}) => {
  // Use our custom hook for CNAM dossier management
  const {
    cnamPayments,
    pendingDossiers,
    completedDossiers,
    isLoading,
    error,
    loadPayments,
    updateDossierStatus
  } = useCNAMDossiers({ saleId });

  // Load payments when component mounts
  useEffect(() => {
    if (saleId) {
      loadPayments();
    }
  }, [saleId, loadPayments]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">Chargement des dossiers CNAM...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="my-4">
        <AlertTitle>Erreur</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
        <Button 
          variant="outline" 
          className="mt-2" 
          onClick={() => loadPayments()}
        >
          Réessayer
        </Button>
      </Alert>
    );
  }

  if (cnamPayments.length === 0) {
    return (
      <Alert className="bg-blue-50 border-blue-200">
        <Info className="h-4 w-4 text-blue-600" />
        <AlertTitle>Aucun dossier CNAM</AlertTitle>
        <AlertDescription>
          Cette vente ne contient pas de paiements CNAM nécessitant un suivi.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6 py-4">
      <Tabs defaultValue="pending" className="w-full">
        <div className="flex items-center justify-between mb-4">
          <TabsList>
            <TabsTrigger value="pending" className="relative">
              En attente
              {pendingDossiers.length > 0 && (
                <Badge className="ml-2 bg-amber-500">
                  {pendingDossiers.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="completed">
              Finalisés
              {completedDossiers.length > 0 && (
                <Badge className="ml-2 bg-green-500">
                  {completedDossiers.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
        </div>
        
        <TabsContent value="pending" className="space-y-4">
          {pendingDossiers.length > 0 ? (
            pendingDossiers.map((payment, index) => (
              <CNAMDossierManager
                key={payment.id || index}
                payment={payment}
                onUpdate={updateDossierStatus}
                readOnly={isReadOnly}
              />
            ))
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>Aucun dossier CNAM en attente</p>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="completed" className="space-y-4">
          {completedDossiers.length > 0 ? (
            completedDossiers.map((payment, index) => (
              <CNAMDossierManager
                key={payment.id || index}
                payment={payment}
                onUpdate={updateDossierStatus}
                readOnly={true}
              />
            ))
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>Aucun dossier CNAM finalisé</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SaleDetailsCNAMTab;
