import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Calendar, AlertCircle, CheckCircle } from 'lucide-react';

interface RentalDetailsCNAMStepsProps {
  payment: any;
  paymentDetails?: any[];
}

const RentalDetailsCNAMSteps: React.FC<RentalDetailsCNAMStepsProps> = ({ payment, paymentDetails = [] }) => {
  // Check if there's any CNAM payment
  const hasCNAMPayment = payment?.method === 'CNAM' || 
                         paymentDetails?.some(detail => detail?.method === 'CNAM');
  
  if (!hasCNAMPayment) {
    return null; // Don't render anything if there's no CNAM payment
  }

  // Find CNAM payment details
  const cnamDetails = paymentDetails?.find(detail => detail?.method === 'CNAM') || {};
  
  // Helper function to format date
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('fr-TN');
  };

  // Helper function to get status badge class
  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'accepte':
        return 'bg-green-100 text-green-800';
      case 'refuse':
        return 'bg-red-100 text-red-800';
      case 'en_attente':
        return 'bg-amber-100 text-amber-800';
      case 'en_cours':
        return 'bg-blue-100 text-blue-800';
      case 'complement_dossier':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Helper function to format status label
  const formatStatusLabel = (status: string) => {
    switch (status) {
      case 'accepte': return 'Accepté';
      case 'refuse': return 'Refusé';
      case 'en_attente': return 'En attente';
      case 'en_cours': return 'En cours';
      case 'complement_dossier': return 'Complément requis';
      default: return status;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Dossier CNAM</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {cnamDetails.etatDossier ? (
          <>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <FileText className="h-5 w-5 mr-2 text-blue-600" />
                <h3 className="font-medium text-gray-700">État du Dossier</h3>
              </div>
              <span className={`px-2 py-1 text-xs rounded ${getStatusBadgeClass(cnamDetails.etatDossier)}`}>
                {formatStatusLabel(cnamDetails.etatDossier)}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Calendar className="h-5 w-5 mr-2 text-blue-600" />
                <h3 className="font-medium text-gray-700">Date d'Acceptation</h3>
              </div>
              <span>{formatDate(cnamDetails.dateAcceptation)}</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Calendar className="h-5 w-5 mr-2 text-blue-600" />
                <h3 className="font-medium text-gray-700">Date d'Expiration</h3>
              </div>
              <span>{formatDate(cnamDetails.dateExpiration)}</span>
            </div>

            {cnamDetails.dateDepose && (
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Calendar className="h-5 w-5 mr-2 text-blue-600" />
                  <h3 className="font-medium text-gray-700">Date de Dépôt</h3>
                </div>
                <span>{formatDate(cnamDetails.dateDepose)}</span>
              </div>
            )}

            {cnamDetails.dateRappel && (
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Calendar className="h-5 w-5 mr-2 text-blue-600" />
                  <h3 className="font-medium text-gray-700">Date de Rappel</h3>
                </div>
                <span>{formatDate(cnamDetails.dateRappel)}</span>
              </div>
            )}

            {/* Bond de location information */}
            <div className="mt-4 p-3 bg-blue-50 rounded-md">
              <h4 className="font-medium mb-2 text-blue-800 flex items-center">
                <CheckCircle className="h-4 w-4 mr-1" />
                Bond de Location CNAM
              </h4>
              <p className="text-sm text-blue-700">
                <span className="block">Type: {cnamDetails.bondType || 'Bond de location standard'}</span>
                <span className="block">Montant: {typeof cnamDetails.amount === 'number' ? cnamDetails.amount.toFixed(3) : parseFloat(String(cnamDetails.amount || 0)).toFixed(3)} DT</span>
                {cnamDetails.dossierReference && <span className="block">Référence: {cnamDetails.dossierReference}</span>}
              </p>
            </div>
          </>
        ) : (
          <div className="flex items-center p-3 bg-amber-50 rounded-md">
            <AlertCircle className="h-5 w-5 mr-2 text-amber-600" />
            <p className="text-sm text-amber-700">
              Paiement CNAM enregistré mais les détails du dossier ne sont pas disponibles.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RentalDetailsCNAMSteps;
