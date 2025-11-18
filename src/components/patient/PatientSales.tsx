import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ShoppingCart, AlertCircle, Package, CreditCard, FileText, Eye, Edit2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AddSaleForm } from '@/components/employee/patient-details-forms/AddSaleForm';

interface PatientSalesProps {
  sales: any[];
  saleItems?: any[];
  isLoading?: boolean;
  patientId?: string;
}

export const PatientSales = ({ sales = [], saleItems = [], isLoading = false, patientId }: PatientSalesProps) => {
  const [showItemsDialog, setShowItemsDialog] = useState(false);
  const [selectedSale, setSelectedSale] = useState<any>(null);
  const [showManageDialog, setShowManageDialog] = useState(false);

  const handleManageSuccess = () => {
    setShowManageDialog(false);
    // Data will be automatically refreshed by React Query invalidation
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'CANCELLED':
        return 'bg-red-100 text-red-700 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'Terminé';
      case 'PENDING':
        return 'En attente';
      case 'CANCELLED':
        return 'Annulé';
      default:
        return status;
    }
  };

  const formatAmount = (amount: any) => {
    const num = Number(amount);
    return isNaN(num) ? '0.00' : num.toFixed(2);
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
      case 'CNAM':
        return 'CNAM';
      case 'TRAITE':
        return 'Traite';
      case 'MANDAT':
        return 'Mandat';
      case 'VIREMENT':
        return 'Virement';
      case 'MIXED':
        return 'Mixte';
      default:
        return method;
    }
  };

  const getPaymentStatusLabel = (status: string) => {
    switch (status) {
      case 'PAID':
        return 'Payé';
      case 'COMPLETED':
        return 'Complété';
      case 'PENDING':
        return 'En attente';
      case 'PARTIAL':
        return 'Partiel';
      case 'CANCELLED':
        return 'Annulé';
      case 'FAILED':
        return 'Échoué';
      default:
        return status;
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'PAID':
      case 'COMPLETED':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'PARTIAL':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'CANCELLED':
      case 'FAILED':
        return 'bg-red-100 text-red-700 border-red-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const handleViewItems = (sale: any) => {
    setSelectedSale(sale);
    setShowItemsDialog(true);
  };

  return (
    <div className="space-y-6">
      {/* Sales Overview Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-blue-500" />
                Historique des ventes
              </CardTitle>
              <CardDescription>
                Toutes les ventes effectuées pour ce patient
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
          ) : sales.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-slate-200">
                <thead className="bg-slate-50">
                  <tr className="border-b border-slate-200">
                    <th className="px-3 py-3 text-left text-xs font-semibold text-slate-700 border-r border-slate-200">Code Vente</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-slate-700 border-r border-slate-200">Facture</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-slate-700 border-r border-slate-200">Date</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-slate-700 border-r border-slate-200">Assigné à</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-slate-700 border-r border-slate-200">Créé par</th>
                    <th className="px-3 py-3 text-right text-xs font-semibold text-slate-700 border-r border-slate-200">Montant Total</th>
                    <th className="px-3 py-3 text-right text-xs font-semibold text-slate-700 border-r border-slate-200">Remise</th>
                    <th className="px-3 py-3 text-right text-xs font-semibold text-slate-700 border-r border-slate-200">Montant Final</th>
                    <th className="px-3 py-3 text-center text-xs font-semibold text-slate-700 border-r border-slate-200">Statut</th>
                    <th className="px-3 py-3 text-center text-xs font-semibold text-slate-700 border-r border-slate-200">Articles</th>
                    <th className="px-3 py-3 text-center text-xs font-semibold text-slate-700 border-r border-slate-200">Paiement</th>
                    <th className="px-3 py-3 text-center text-xs font-semibold text-slate-700 border-r border-slate-200">Bons CNAM</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-slate-700">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {sales.map((sale, index) => (
                    <tr
                      key={sale.id || index}
                      className={`border-b border-slate-100 hover:bg-blue-50/50 transition-colors ${
                        index % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'
                      }`}
                    >
                      {/* Sale Code */}
                      <td className="px-3 py-2.5 text-xs border-r border-slate-100">
                        <Badge variant="outline" className="text-xs font-mono">
                          {sale.saleCode || 'N/A'}
                        </Badge>
                      </td>

                      {/* Invoice Number */}
                      <td className="px-3 py-2.5 text-xs border-r border-slate-100">
                        <Badge variant="outline" className="text-xs font-mono bg-blue-50 text-blue-700 border-blue-200">
                          {sale.invoiceNumber || 'N/A'}
                        </Badge>
                      </td>

                      {/* Date */}
                      <td className="px-3 py-2.5 text-xs text-slate-600 border-r border-slate-100">
                        {sale.saleDate ? format(new Date(sale.saleDate), 'dd/MM/yyyy', { locale: fr }) : '-'}
                      </td>

                      {/* Assigned To */}
                      <td className="px-3 py-2.5 text-xs text-slate-600 border-r border-slate-100">
                        {sale.assignedTo ? `${sale.assignedTo.firstName} ${sale.assignedTo.lastName}` : '-'}
                      </td>

                      {/* Created By */}
                      <td className="px-3 py-2.5 text-xs text-slate-600 border-r border-slate-100">
                        {sale.processedBy ? `${sale.processedBy.firstName} ${sale.processedBy.lastName}` : '-'}
                      </td>

                      {/* Total Amount */}
                      <td className="px-3 py-2.5 text-right text-sm font-medium text-slate-900 border-r border-slate-100">
                        {formatAmount(sale.totalAmount)} DT
                      </td>

                      {/* Discount */}
                      <td className="px-3 py-2.5 text-right text-xs text-slate-600 border-r border-slate-100">
                        {sale.discount ? formatAmount(sale.discount) + ' DT' : '-'}
                      </td>

                      {/* Final Amount */}
                      <td className="px-3 py-2.5 text-right text-sm font-bold text-green-700 border-r border-slate-100">
                        {formatAmount(sale.finalAmount)} DT
                      </td>

                      {/* Status */}
                      <td className="px-3 py-2.5 text-center border-r border-slate-100">
                        <Badge variant="outline" className={getStatusColor(sale.status)}>
                          {getStatusLabel(sale.status)}
                        </Badge>
                      </td>

                      {/* Items Count */}
                      <td className="px-3 py-2.5 text-center border-r border-slate-100">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewItems(sale)}
                          className={`h-8 px-2 ${(sale.items?.length || 0) > 0 ? 'bg-blue-50 text-blue-700 hover:bg-blue-100' : 'text-slate-500 hover:bg-slate-100'}`}
                        >
                          <Package className="h-4 w-4 mr-1" />
                          <Badge variant="secondary" className="text-xs">
                            {sale.items?.length || 0}
                          </Badge>
                        </Button>
                      </td>

                      {/* Payment */}
                      <td className="px-3 py-2.5 text-center border-r border-slate-100">
                        {sale.payments && sale.payments.length > 0 ? (
                          <div className="flex flex-col gap-1 items-center">
                            {sale.payments.length === 1 ? (
                              // Single payment - show full details
                              <>
                                <div className="flex items-center gap-1">
                                  <CreditCard className="h-3 w-3 text-green-600" />
                                  <span className="text-xs font-medium text-green-700">
                                    {formatAmount(sale.payments[0].amount)} DT
                                  </span>
                                </div>
                                <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                                  {getMethodLabel(sale.payments[0].method)}
                                </Badge>
                                {sale.payments[0].status && (
                                  <Badge variant="outline" className={`text-xs ${getPaymentStatusColor(sale.payments[0].status)}`}>
                                    {getPaymentStatusLabel(sale.payments[0].status)}
                                  </Badge>
                                )}
                              </>
                            ) : (
                              // Multiple payments - show aggregate
                              <>
                                <div className="flex items-center gap-1">
                                  <CreditCard className="h-3 w-3 text-green-600" />
                                  <span className="text-xs font-medium text-green-700">
                                    {formatAmount(sale.payments.reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0))} DT
                                  </span>
                                </div>
                                <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                                  {sale.payments.length} paiement(s)
                                </Badge>
                              </>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400 text-xs">-</span>
                        )}
                      </td>

                      {/* CNAM Bons Count */}
                      <td className="px-3 py-2.5 text-center border-r border-slate-100">
                        {sale.cnamBons && sale.cnamBons.length > 0 ? (
                          <div className="flex flex-col gap-1 items-center">
                            <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 text-xs">
                              <FileText className="h-3 w-3 mr-1" />
                              {sale.cnamBons.length}
                            </Badge>
                            <div className="text-xs text-slate-600">
                              {formatAmount(sale.cnamBons.reduce((sum: number, bon: any) => sum + (Number(bon.bonAmount) || 0), 0))} DT
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-xs">-</span>
                        )}
                      </td>

                      {/* Notes */}
                      <td className="px-3 py-2.5 text-xs text-slate-600">
                        <div className="truncate max-w-[200px]" title={sale.notes || ''}>
                          {sale.notes || '-'}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <AlertCircle className="h-12 w-12 mb-4 opacity-50" />
              <p className="text-lg font-medium">Aucune vente</p>
              <p className="text-sm">Ce patient n'a pas encore effectué d'achat</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sale Items Dialog */}
      <Dialog open={showItemsDialog} onOpenChange={setShowItemsDialog}>
        <DialogContent className="max-w-5xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-purple-500" />
              Articles de la vente - {selectedSale?.saleCode}
            </DialogTitle>
          </DialogHeader>

          {selectedSale?.items && selectedSale.items.length > 0 ? (
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-slate-200">
                  <thead className="bg-slate-50">
                    <tr className="border-b border-slate-200">
                      <th className="px-3 py-2 text-left text-xs font-semibold text-slate-700 border-r border-slate-200">Article</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-slate-700 border-r border-slate-200">Description</th>
                      <th className="px-3 py-2 text-center text-xs font-semibold text-slate-700 border-r border-slate-200">Quantité</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-slate-700 border-r border-slate-200">Prix Unitaire</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-slate-700 border-r border-slate-200">Remise</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-slate-700 border-r border-slate-200">Total</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-slate-700">Appareil</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedSale.items.map((item: any, idx: number) => (
                      <tr key={item.id || idx} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="px-3 py-2 text-sm font-medium border-r border-slate-100">
                          {item.product?.name || item.medicalDevice?.name || 'Article'}
                        </td>
                        <td className="px-3 py-2 text-xs text-gray-600 border-r border-slate-100">
                          <div className="max-w-xs truncate" title={item.product?.description || ''}>
                            {item.product?.description || '-'}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-center text-sm border-r border-slate-100">
                          {item.quantity || 1}
                        </td>
                        <td className="px-3 py-2 text-right text-sm font-medium border-r border-slate-100">
                          {formatAmount(item.unitPrice)} DT
                        </td>
                        <td className="px-3 py-2 text-right text-xs text-slate-600 border-r border-slate-100">
                          {item.discount ? formatAmount(item.discount) + ' DT' : '-'}
                        </td>
                        <td className="px-3 py-2 text-right text-sm font-medium text-green-600 border-r border-slate-100">
                          {formatAmount(item.itemTotal || ((Number(item.unitPrice) || 0) * (Number(item.quantity) || 1) - (Number(item.discount) || 0)))} DT
                        </td>
                        <td className="px-3 py-2 text-xs">
                          {item.medicalDevice ? (
                            <div className="space-y-1">
                              <div className="font-medium">{item.medicalDevice.name}</div>
                              {item.medicalDevice.serialNumber && (
                                <div className="text-gray-500 font-mono">
                                  S/N: {item.medicalDevice.serialNumber}
                                </div>
                              )}
                              {item.medicalDevice.deviceCode && (
                                <div className="text-gray-500 font-mono">
                                  Code: {item.medicalDevice.deviceCode}
                                </div>
                              )}
                              {item.medicalDevice.type && (
                                <Badge variant="outline" className="text-xs">
                                  {item.medicalDevice.type}
                                </Badge>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Summary */}
              <div className="border-t pt-4 bg-slate-50 p-4 rounded-lg">
                <div className="flex justify-between items-center">
                  <div className="text-sm text-slate-600">
                    Total des articles: <span className="font-semibold">{selectedSale.items.length}</span>
                  </div>
                  <div className="text-right space-y-2">
                    <div className="flex justify-between gap-8">
                      <span className="text-sm text-slate-600">Montant total:</span>
                      <span className="text-lg font-bold text-slate-900">
                        {formatAmount(selectedSale.totalAmount)} DT
                      </span>
                    </div>
                    {selectedSale.discount && Number(selectedSale.discount) > 0 && (
                      <div className="flex justify-between gap-8">
                        <span className="text-sm text-slate-600">Remise:</span>
                        <span className="text-sm font-medium text-red-600">
                          -{formatAmount(selectedSale.discount)} DT
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between gap-8 pt-2 border-t">
                      <span className="text-sm font-semibold text-slate-700">Montant final:</span>
                      <span className="text-2xl font-bold text-green-600">
                        {formatAmount(selectedSale.finalAmount)} DT
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Aucun article dans cette vente</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Manage Sales Dialog */}
      <Dialog open={showManageDialog} onOpenChange={setShowManageDialog}>
        <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-700">
              <ShoppingCart className="h-5 w-5 text-green-600" />
              Gérer les Ventes
            </DialogTitle>
          </DialogHeader>
          {patientId && (
            <AddSaleForm
              patientId={patientId}
              sales={sales}
              onSuccess={handleManageSuccess}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
