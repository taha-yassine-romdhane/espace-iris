import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, AlertCircle, Calendar, CreditCard, FileText, User, Settings } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format, differenceInDays } from 'date-fns';
import { fr } from 'date-fns/locale';

interface PatientRentalsProps {
  rentals: any[];
  isLoading?: boolean;
}

export const PatientRentals = ({ rentals = [], isLoading = false }: PatientRentalsProps) => {
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
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-blue-500" />
            Historique des locations
          </CardTitle>
          <CardDescription>
            Tous les appareils médicaux loués par ce patient
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700"></div>
            </div>
          ) : rentals.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-slate-200">
                <thead className="bg-slate-50">
                  <tr className="border-b border-slate-200">
                    <th className="px-3 py-3 text-left text-xs font-semibold text-slate-700 border-r border-slate-200">Code Location</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-slate-700 border-r border-slate-200">Appareil</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-slate-700 border-r border-slate-200">Période</th>
                    <th className="px-3 py-3 text-center text-xs font-semibold text-slate-700 border-r border-slate-200">Durée</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-slate-700 border-r border-slate-200">Configuration</th>
                    <th className="px-3 py-3 text-center text-xs font-semibold text-slate-700 border-r border-slate-200">Statut</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-slate-700 border-r border-slate-200">Assigné à</th>
                    <th className="px-3 py-3 text-center text-xs font-semibold text-slate-700 border-r border-slate-200">Paiements</th>
                    <th className="px-3 py-3 text-center text-xs font-semibold text-slate-700">Bons CNAM</th>
                  </tr>
                </thead>
                <tbody>
                  {rentals.map((rental, index) => {
                    const duration = calculateDuration(rental.startDate, rental.endDate);

                    return (
                      <tr
                        key={rental.id || index}
                        className={`border-b border-slate-100 hover:bg-blue-50/50 transition-colors ${
                          index % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'
                        }`}
                      >
                        {/* Rental Code */}
                        <td className="px-3 py-2.5 text-xs border-r border-slate-100">
                          <Badge variant="outline" className="text-xs font-mono">
                            {rental.rentalCode || 'N/A'}
                          </Badge>
                          {rental.invoiceNumber && (
                            <div className="text-xs text-slate-500 mt-1">
                              Facture: {rental.invoiceNumber}
                            </div>
                          )}
                        </td>

                        {/* Medical Device */}
                        <td className="px-3 py-2.5 border-r border-slate-100">
                          <div className="space-y-1">
                            <div className="font-medium text-sm">{rental.medicalDevice?.name || 'Appareil'}</div>
                            {rental.medicalDevice?.brand && (
                              <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                                {rental.medicalDevice.brand}
                              </Badge>
                            )}
                            {rental.medicalDevice?.serialNumber && (
                              <div className="text-xs text-slate-500 font-mono">
                                S/N: {rental.medicalDevice.serialNumber}
                              </div>
                            )}
                            {rental.medicalDevice?.deviceCode && (
                              <div className="text-xs text-slate-500 font-mono">
                                Code: {rental.medicalDevice.deviceCode}
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Period */}
                        <td className="px-3 py-2.5 text-xs border-r border-slate-100">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3 text-slate-400" />
                              <span className="font-medium">Début:</span>
                              <span>{format(new Date(rental.startDate), 'dd/MM/yyyy', { locale: fr })}</span>
                            </div>
                            {rental.endDate ? (
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3 text-slate-400" />
                                <span className="font-medium">Fin:</span>
                                <span>{format(new Date(rental.endDate), 'dd/MM/yyyy', { locale: fr })}</span>
                              </div>
                            ) : (
                              <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
                                En cours
                              </Badge>
                            )}
                          </div>
                        </td>

                        {/* Duration */}
                        <td className="px-3 py-2.5 text-center border-r border-slate-100">
                          <div className="text-sm font-semibold text-blue-600">{duration} jours</div>
                        </td>

                        {/* Configuration */}
                        <td className="px-3 py-2.5 border-r border-slate-100">
                          {rental.configuration ? (
                            <div className="space-y-1 text-xs">
                              <div className="flex items-center gap-1">
                                <span className="font-medium">Tarif:</span>
                                <span className="text-green-600 font-semibold">{formatAmount(rental.configuration.rentalRate)} DT</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="font-medium">Cycle:</span>
                                <span>{getBillingCycleLabel(rental.configuration.billingCycle)}</span>
                              </div>
                              {rental.configuration.cnamEligible && (
                                <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
                                  CNAM Éligible
                                </Badge>
                              )}
                              {rental.configuration.isGlobalOpenEnded && (
                                <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                                  Durée indéterminée
                                </Badge>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">-</span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="px-3 py-2.5 text-center border-r border-slate-100">
                          <Badge variant="outline" className={getStatusColor(rental.status)}>
                            {getStatusLabel(rental.status)}
                          </Badge>
                        </td>

                        {/* Assigned To */}
                        <td className="px-3 py-2.5 text-xs border-r border-slate-100">
                          <div className="space-y-1">
                            {rental.assignedTo ? (
                              <div className="flex items-center gap-1">
                                <User className="h-3 w-3 text-slate-400" />
                                <span>{rental.assignedTo.firstName} {rental.assignedTo.lastName}</span>
                              </div>
                            ) : (
                              <span className="text-gray-400">Non assigné</span>
                            )}
                            {rental.createdBy && (
                              <div className="text-xs text-slate-500">
                                Créé par: {rental.createdBy.firstName} {rental.createdBy.lastName}
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Payments */}
                        <td className="px-3 py-2.5 text-center border-r border-slate-100">
                          {rental.payments && rental.payments.length > 0 ? (
                            <div className="space-y-1">
                              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">
                                <CreditCard className="h-3 w-3 mr-1" />
                                {rental.payments.length}
                              </Badge>
                              <div className="text-xs text-green-600 font-semibold">
                                {formatAmount(rental.payments.reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0))} DT
                              </div>
                            </div>
                          ) : (
                            <span className="text-gray-400 text-xs">-</span>
                          )}
                        </td>

                        {/* CNAM Bons */}
                        <td className="px-3 py-2.5 text-center">
                          {rental.cnamBons && rental.cnamBons.length > 0 ? (
                            <div className="space-y-1">
                              <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 text-xs">
                                <FileText className="h-3 w-3 mr-1" />
                                {rental.cnamBons.length}
                              </Badge>
                              <div className="text-xs text-purple-600 font-semibold">
                                {formatAmount(rental.cnamBons.reduce((sum: number, bon: any) => sum + (Number(bon.bonAmount) || 0), 0))} DT
                              </div>
                            </div>
                          ) : (
                            <span className="text-gray-400 text-xs">-</span>
                          )}
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
    </div>
  );
};

export default PatientRentals;
