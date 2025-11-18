import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Receipt, AlertCircle, CreditCard, Calendar, FileText, Banknote, Building2, Hash, Edit2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { AddPaymentForm } from '@/components/employee/patient-details-forms/AddPaymentForm';

interface PatientPaymentsProps {
  payments: any[];
  isLoading?: boolean;
  patientId?: string;
}

export const PatientPayments = ({ payments = [], isLoading = false, patientId }: PatientPaymentsProps) => {
  const [showManageDialog, setShowManageDialog] = useState(false);

  const handleManageSuccess = () => {
    setShowManageDialog(false);
    // Data will be automatically refreshed by React Query invalidation
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PAID':
      case 'COMPLETED':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'CANCELLED':
      case 'FAILED':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'PARTIAL':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'PAID':
        return 'Payé';
      case 'COMPLETED':
        return 'Complété';
      case 'PENDING':
        return 'En attente';
      case 'CANCELLED':
        return 'Annulé';
      case 'FAILED':
        return 'Échoué';
      case 'PARTIAL':
        return 'Partiel';
      default:
        return status;
    }
  };

  const getMethodLabel = (method: string) => {
    switch (method) {
      case 'CASH':
        return 'Espèces';
      case 'CREDIT_CARD':
        return 'Carte bancaire';
      case 'BANK_TRANSFER':
        return 'Virement';
      case 'CHEQUE':
        return 'Chèque';
      case 'MIXED':
        return 'Mixte';
      default:
        return method;
    }
  };

  const getMethodIcon = (method: string) => {
    switch (method) {
      case 'CASH':
        return <Banknote className="h-4 w-4" />;
      case 'CREDIT_CARD':
        return <CreditCard className="h-4 w-4" />;
      case 'BANK_TRANSFER':
        return <Building2 className="h-4 w-4" />;
      case 'CHEQUE':
        return <FileText className="h-4 w-4" />;
      default:
        return <Receipt className="h-4 w-4" />;
    }
  };

  const getSourceLabel = (source: string) => {
    switch (source) {
      case 'SALE':
        return 'Vente';
      case 'RENTAL':
        return 'Location';
      case 'DIAGNOSTIC':
        return 'Diagnostic';
      case 'AUTRE':
        return 'Autre';
      default:
        return source || 'N/A';
    }
  };

  const getSourceColor = (source: string) => {
    switch (source) {
      case 'SALE':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'RENTAL':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'DIAGNOSTIC':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'AUTRE':
        return 'bg-gray-50 text-gray-700 border-gray-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const formatAmount = (amount: any) => {
    const num = Number(amount);
    return isNaN(num) ? '0.00' : num.toFixed(2);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-blue-500" />
              Historique des paiements
            </CardTitle>
            <CardDescription>
              Tous les paiements effectués par ce patient
            </CardDescription>
          </div>
          <Button
            variant="default"
            size="sm"
            onClick={() => setShowManageDialog(true)}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
          >
            <Edit2 className="h-4 w-4" />
            Gérer
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700"></div>
          </div>
        ) : payments.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-slate-200">
              <thead className="bg-slate-50">
                <tr className="border-b border-slate-200">
                  <th className="px-3 py-3 text-left text-xs font-semibold text-slate-700 border-r border-slate-200">Code</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-slate-700 border-r border-slate-200">Date Paiement</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-slate-700 border-r border-slate-200">Source</th>
                  <th className="px-3 py-3 text-right text-xs font-semibold text-slate-700 border-r border-slate-200">Montant</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-slate-700 border-r border-slate-200">Méthode</th>
                  <th className="px-3 py-3 text-center text-xs font-semibold text-slate-700 border-r border-slate-200">Statut</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-slate-700 border-r border-slate-200">Référence</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-slate-700 border-r border-slate-200">Détails Paiement</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-slate-700">Notes</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment, index) => (
                  <tr
                    key={payment.id || index}
                    className={`border-b border-slate-100 hover:bg-blue-50/50 transition-colors ${
                      index % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'
                    }`}
                  >
                    {/* Payment Code */}
                    <td className="px-3 py-2.5 text-xs border-r border-slate-100">
                      <Badge variant="outline" className="text-xs font-mono">
                        {payment.paymentCode || 'N/A'}
                      </Badge>
                    </td>

                    {/* Payment Date */}
                    <td className="px-3 py-2.5 text-xs text-slate-600 border-r border-slate-100">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-slate-400" />
                        {payment.paymentDate ? format(new Date(payment.paymentDate), 'dd/MM/yyyy', { locale: fr }) : '-'}
                      </div>
                      {payment.createdAt && payment.paymentDate !== payment.createdAt && (
                        <div className="text-xs text-slate-400 mt-1">
                          Créé: {format(new Date(payment.createdAt), 'dd/MM/yyyy', { locale: fr })}
                        </div>
                      )}
                    </td>

                    {/* Source */}
                    <td className="px-3 py-2.5 border-r border-slate-100">
                      <div className="space-y-1">
                        <Badge variant="outline" className={`text-xs ${getSourceColor(payment.source)}`}>
                          {getSourceLabel(payment.source)}
                        </Badge>
                        {payment.sale && (
                          <div className="text-xs text-slate-600">
                            Vente: <span className="font-mono">{payment.sale.saleCode}</span>
                          </div>
                        )}
                        {payment.rental && (
                          <div className="text-xs text-slate-600">
                            Location: <span className="font-mono">{payment.rental.rentalCode}</span>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Amount */}
                    <td className="px-3 py-2.5 text-right text-sm font-bold text-green-700 border-r border-slate-100">
                      {formatAmount(payment.amount)} DT
                    </td>

                    {/* Payment Method */}
                    <td className="px-3 py-2.5 border-r border-slate-100">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          {getMethodIcon(payment.method)}
                          <span className="text-xs font-medium">{getMethodLabel(payment.method)}</span>
                        </div>
                        {payment.chequeNumber && (
                          <div className="text-xs text-slate-600">
                            Chèque: <span className="font-mono">{payment.chequeNumber}</span>
                          </div>
                        )}
                        {payment.bankName && (
                          <div className="text-xs text-slate-600">
                            Banque: {payment.bankName}
                          </div>
                        )}
                        {payment.referenceNumber && (
                          <div className="text-xs text-slate-600 flex items-center gap-1">
                            <Hash className="h-3 w-3" />
                            {payment.referenceNumber}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-3 py-2.5 text-center border-r border-slate-100">
                      <Badge variant="outline" className={getStatusColor(payment.status)}>
                        {getStatusLabel(payment.status)}
                      </Badge>
                    </td>

                    {/* Reference/Code */}
                    <td className="px-3 py-2.5 border-r border-slate-100">
                      <div className="space-y-1">
                        {payment.cnamBonNumber && (
                          <div className="text-xs">
                            <span className="text-slate-500">Bon CNAM:</span>
                            <Badge variant="outline" className="ml-1 text-xs bg-purple-50 text-purple-700 border-purple-200">
                              {payment.cnamBonNumber}
                            </Badge>
                          </div>
                        )}
                        {payment.cnamBonType && (
                          <div className="text-xs text-slate-600">
                            Type: {payment.cnamBonType}
                          </div>
                        )}
                        {payment.cnamCardNumber && (
                          <div className="text-xs text-slate-600">
                            Carte CNAM: {payment.cnamCardNumber}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Payment Details */}
                    <td className="px-3 py-2.5 border-r border-slate-100">
                      <div className="space-y-1">
                        {payment.paymentDetails && payment.paymentDetails.length > 0 ? (
                          <div className="space-y-1">
                            {payment.paymentDetails.map((detail: any, idx: number) => (
                              <div key={idx} className="text-xs bg-slate-50 rounded px-2 py-1">
                                <div className="flex justify-between items-center">
                                  <span className="font-medium">{getMethodLabel(detail.method)}</span>
                                  <span className="text-green-600 font-semibold">{formatAmount(detail.amount)} DT</span>
                                </div>
                              </div>
                            ))}
                            <div className="text-xs text-slate-500 mt-1">
                              {payment.paymentDetails.length} paiement(s)
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">-</span>
                        )}
                        {payment.periodStartDate && payment.periodEndDate && (
                          <div className="text-xs text-slate-600 mt-1">
                            Période: {format(new Date(payment.periodStartDate), 'dd/MM/yy', { locale: fr })} - {format(new Date(payment.periodEndDate), 'dd/MM/yy', { locale: fr })}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Notes */}
                    <td className="px-3 py-2.5 text-xs text-slate-600">
                      <div className="max-w-[200px]">
                        {payment.notes ? (
                          <div className="truncate" title={payment.notes}>
                            {payment.notes}
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Summary Section */}
            <div className="mt-6 bg-slate-50 rounded-lg p-4 border border-slate-200">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Receipt className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">Total Paiements</div>
                    <div className="text-lg font-bold text-slate-900">{payments.length}</div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <Banknote className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">Montant Total</div>
                    <div className="text-lg font-bold text-green-700">
                      {formatAmount(payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0))} DT
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
                    <CreditCard className="h-6 w-6 text-amber-600" />
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">En Attente</div>
                    <div className="text-lg font-bold text-amber-700">
                      {payments.filter(p => p.status === 'PENDING').length}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500">
            <AlertCircle className="h-12 w-12 mb-4 opacity-50" />
            <p className="text-lg font-medium">Aucun paiement</p>
            <p className="text-sm">Ce patient n'a pas encore effectué de paiement</p>
          </div>
        )}
      </CardContent>

      {/* Manage Payments Dialog */}
      <Dialog open={showManageDialog} onOpenChange={setShowManageDialog}>
        <DialogContent className="max-w-[95vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-700">
              <Receipt className="h-5 w-5 text-green-600" />
              Gérer les Paiements
            </DialogTitle>
          </DialogHeader>
          {patientId && (
            <AddPaymentForm
              patientId={patientId}
              payments={payments}
              onSuccess={handleManageSuccess}
            />
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default PatientPayments;
