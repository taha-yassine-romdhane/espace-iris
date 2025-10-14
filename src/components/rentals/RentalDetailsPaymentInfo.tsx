import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CreditCard, Calendar } from 'lucide-react';

interface RentalDetailsPaymentInfoProps {
  payment: any;
}

const RentalDetailsPaymentInfo: React.FC<RentalDetailsPaymentInfoProps> = ({ payment }) => {
  if (!payment) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Informations de Paiement</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500">Aucun paiement enregistré pour cette location</p>
        </CardContent>
      </Card>
    );
  }

  // Helper function to format payment status
  const formatPaymentStatus = (status: string) => {
    switch (status) {
      case 'PAID':
        return { label: 'Payé', className: 'bg-green-100 text-green-800' };
      case 'PENDING':
        return { label: 'En attente', className: 'bg-amber-100 text-amber-800' };
      case 'PARTIAL':
        return { label: 'Partiel', className: 'bg-blue-100 text-blue-800' };
      case 'GUARANTEE':
        return { label: 'Garantie', className: 'bg-purple-100 text-purple-800' };
      default:
        return { label: status, className: 'bg-gray-100 text-gray-800' };
    }
  };

  const paymentStatus = formatPaymentStatus(payment.status);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Informations de Paiement</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <CreditCard className="h-5 w-5 mr-2 text-blue-600" />
            <h3 className="font-medium text-gray-700">Méthode</h3>
          </div>
          <span className="font-medium">{payment.method}</span>
        </div>
        
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <span className="font-medium text-gray-700">Montant</span>
          </div>
          <span className="font-medium">{typeof payment.amount === 'number' ? payment.amount.toFixed(3) : parseFloat(String(payment.amount || 0)).toFixed(3)} DT</span>
        </div>
        
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <Calendar className="h-5 w-5 mr-2 text-blue-600" />
            <h3 className="font-medium text-gray-700">Date</h3>
          </div>
          <span>{payment.paymentDate ? new Date(payment.paymentDate).toLocaleDateString('fr-TN') : '-'}</span>
        </div>

        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <h3 className="font-medium text-gray-700">Statut</h3>
          </div>
          <span className={`px-2 py-1 text-xs rounded ${paymentStatus.className}`}>
            {paymentStatus.label}
          </span>
        </div>

        {payment.notes && (
          <div className="mt-2 p-3 bg-gray-50 rounded-md">
            <h4 className="font-medium mb-1">Notes</h4>
            <p className="text-sm text-gray-700">{payment.notes}</p>
          </div>
        )}

        {/* CNAM specific information */}
        {payment.method === 'CNAM' && payment.cnamCardNumber && (
          <div className="mt-2 p-3 bg-blue-50 rounded-md">
            <h4 className="font-medium mb-1 text-blue-800">Informations CNAM</h4>
            <p className="text-sm text-blue-700">
              <span className="block">Numéro de carte: {payment.cnamCardNumber}</span>
              {payment.referenceNumber && <span className="block">Référence: {payment.referenceNumber}</span>}
            </p>
          </div>
        )}

        {/* Cheque specific information */}
        {payment.method === 'CHEQUE' && (payment.chequeNumber || payment.bankName) && (
          <div className="mt-2 p-3 bg-purple-50 rounded-md">
            <h4 className="font-medium mb-1 text-purple-800">Informations Chèque</h4>
            <p className="text-sm text-purple-700">
              {payment.chequeNumber && <span className="block">Numéro de chèque: {payment.chequeNumber}</span>}
              {payment.bankName && <span className="block">Banque: {payment.bankName}</span>}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RentalDetailsPaymentInfo;
