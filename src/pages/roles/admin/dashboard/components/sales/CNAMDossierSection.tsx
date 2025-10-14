import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, FileCheck, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useCNAMDossiers } from '@/hooks/useCNAMDossiers';
import CNAMDossierList from '@/components/payment/components/CNAMDossierList';
import { PaymentData } from '@/components/payment/context/PaymentContext';

interface CNAMDossierSectionProps {
  saleId: string;
  initialPayments?: PaymentData[];
  readOnly?: boolean;
}

const CNAMDossierSection: React.FC<CNAMDossierSectionProps> = ({
  saleId,
  initialPayments = [],
  readOnly = false
}) => {
  // Use our custom hook for CNAM dossier management
  const {
    cnamPayments,
    isLoading,
    error,
    loadPayments,
    updateDossierStatus
  } = useCNAMDossiers({ saleId, initialPayments });

  const hasCNAMPayments = cnamPayments.length > 0;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <span className="ml-2 text-gray-600">Chargement des dossiers CNAM...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <Alert variant="destructive">
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
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-xl font-bold">
          Dossiers CNAM
          {hasCNAMPayments && (
            <Badge className="ml-2 bg-blue-500">
              {cnamPayments.length}
            </Badge>
          )}
        </CardTitle>
        {!readOnly && (
          <FileCheck className="h-5 w-5 text-blue-600" />
        )}
      </CardHeader>
      <CardContent>
        {hasCNAMPayments ? (
          <CNAMDossierList 
            payments={cnamPayments}
            onUpdatePayment={updateDossierStatus}
            readOnly={readOnly}
          />
        ) : (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Aucun dossier CNAM</AlertTitle>
            <AlertDescription>
              Cette vente ne contient pas de paiements CNAM nécessitant un suivi.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

export default CNAMDossierSection;
