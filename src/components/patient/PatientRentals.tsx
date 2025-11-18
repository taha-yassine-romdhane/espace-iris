import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, AlertCircle, Calendar, CreditCard, FileText, User, Settings, Edit2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { format, differenceInDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { AddRentalForm } from '@/components/employee/patient-details-forms/AddRentalForm';

interface PatientRentalsProps {
  rentals: any[];
  isLoading?: boolean;
  patientId?: string;
}

export const PatientRentals = ({ rentals = [], isLoading = false, patientId }: PatientRentalsProps) => {
  const [showManageDialog, setShowManageDialog] = useState(false);

  const handleManageSuccess = () => {
    setShowManageDialog(false);
    // Data will be automatically refreshed by React Query invalidation
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'RETURNED':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'OVERDUE':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'CANCELLED':
        return 'bg-gray-100 text-gray-700 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'Actif';
      case 'RETURNED':
        return 'Retourné';
      case 'OVERDUE':
        return 'En retard';
      case 'PENDING':
        return 'En attente';
      case 'CANCELLED':
        return 'Annulé';
      default:
        return status;
    }
  };

  const getBillingCycleLabel = (cycle: string) => {
    switch (cycle) {
      case 'DAILY':
        return 'Journalier';
      case 'WEEKLY':
        return 'Hebdomadaire';
      case 'MONTHLY':
        return 'Mensuel';
      case 'YEARLY':
        return 'Annuel';
      default:
        return cycle;
    }
  };

  const formatAmount = (amount: any) => {
    const num = Number(amount);
    return isNaN(num) ? '0.00' : num.toFixed(2);
  };

  const calculateDuration = (startDate: string, endDate: string | null) => {
    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : new Date();
    return differenceInDays(end, start);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5 text-blue-500" />
                Historique des locations
              </CardTitle>
              <CardDescription>
                Tous les appareils médicaux loués par ce patient
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
          ) : rentals.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Code</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Appareil</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Dates</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Statut</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Tarif</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Flags</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Créé par</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Assigné à</th>
                  </tr>
                </thead>
                <tbody>
                  {rentals.map((rental, index) => {
                    return (
                      <tr
                        key={rental.id || index}
                        className={`border-b border-slate-100 hover:bg-blue-50/50 transition-colors ${
                          index % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'
                        }`}
                      >
                        {/* Code */}
                        <td className="px-4 py-3">
                          <div className="text-xs">
                            <Badge variant="outline" className="font-mono bg-blue-50 text-blue-700 border-blue-200">
                              {rental.rentalCode || 'N/A'}
                            </Badge>
                            {rental.invoiceNumber && (
                              <div className="text-slate-500 mt-1">
                                {rental.invoiceNumber}
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Appareil */}
                        <td className="px-4 py-3">
                          <div className="text-xs">
                            <div className="font-medium text-slate-900">{rental.medicalDevice?.name || '-'}</div>
                            <div className="text-slate-500 font-mono">
                              {rental.medicalDevice?.serialNumber && `S/N: ${rental.medicalDevice.serialNumber}`}
                              {rental.medicalDevice?.deviceCode && ` • ${rental.medicalDevice.deviceCode}`}
                            </div>
                          </div>
                        </td>

                        {/* Dates */}
                        <td className="px-4 py-3">
                          <div className="text-xs text-slate-600 space-y-0.5">
                            <div>{rental.startDate ? format(new Date(rental.startDate), 'dd/MM/yyyy', { locale: fr }) : '-'}</div>
                            <div>{rental.endDate ? format(new Date(rental.endDate), 'dd/MM/yyyy', { locale: fr }) : 'En cours'}</div>
                          </div>
                        </td>

                        {/* Statut */}
                        <td className="px-4 py-3">
                          <Badge variant="outline" className={getStatusColor(rental.status)}>
                            {getStatusLabel(rental.status)}
                          </Badge>
                        </td>

                        {/* Tarif */}
                        <td className="px-4 py-3">
                          <div className="text-xs">
                            <div className="font-semibold text-green-600">
                              {formatAmount(rental.configuration?.rentalRate)} DT
                            </div>
                            <div className="text-slate-500">
                              {getBillingCycleLabel(rental.configuration?.billingCycle || 'MONTHLY')}
                            </div>
                          </div>
                        </td>

                        {/* Flags */}
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {rental.configuration?.cnamEligible && (
                              <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
                                CNAM
                              </Badge>
                            )}
                            {rental.configuration?.isGlobalOpenEnded && (
                              <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                                Durée indét.
                              </Badge>
                            )}
                          </div>
                        </td>

                        {/* Créé par */}
                        <td className="px-4 py-3">
                          <div className="text-xs text-slate-600">
                            {rental.createdBy ? `${rental.createdBy.firstName} ${rental.createdBy.lastName}` : 'N/A'}
                          </div>
                        </td>

                        {/* Assigné à */}
                        <td className="px-4 py-3">
                          <div className="text-xs text-slate-600">
                            {rental.assignedTo ? `${rental.assignedTo.firstName} ${rental.assignedTo.lastName}` : '-'}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Summary Section */}
              <div className="mt-6 bg-slate-50 rounded-lg p-4 border border-slate-200">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Package className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <div className="text-xs text-slate-500">Total Locations</div>
                      <div className="text-lg font-bold text-slate-900">{rentals.length}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                      <Settings className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <div className="text-xs text-slate-500">Locations Actives</div>
                      <div className="text-lg font-bold text-green-700">
                        {rentals.filter(r => r.status === 'ACTIVE').length}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                      <FileText className="h-6 w-6 text-purple-600" />
                    </div>
                    <div>
                      <div className="text-xs text-slate-500">Bons CNAM</div>
                      <div className="text-lg font-bold text-purple-700">
                        {rentals.reduce((sum, r) => sum + (r.cnamBons?.length || 0), 0)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
                      <CreditCard className="h-6 w-6 text-amber-600" />
                    </div>
                    <div>
                      <div className="text-xs text-slate-500">Total Paiements</div>
                      <div className="text-lg font-bold text-green-700">
                        {formatAmount(rentals.reduce((sum, r) =>
                          sum + (r.payments?.reduce((pSum: number, p: any) => pSum + (Number(p.amount) || 0), 0) || 0), 0
                        ))} DT
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <AlertCircle className="h-12 w-12 mb-4 opacity-50" />
              <p className="text-lg font-medium">Aucune location</p>
              <p className="text-sm">Ce patient n'a pas encore loué d'appareil médical</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Manage Rentals Dialog */}
      <Dialog open={showManageDialog} onOpenChange={setShowManageDialog}>
        <DialogContent className="max-w-[95vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-700">
              <Package className="h-5 w-5 text-green-600" />
              Gérer les Locations
            </DialogTitle>
          </DialogHeader>
          {patientId && (
            <AddRentalForm
              patientId={patientId}
              rentals={rentals}
              onSuccess={handleManageSuccess}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PatientRentals;
