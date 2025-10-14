import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/components/ui/use-toast';
import { 
  History,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Clock,
  Shield,
  Info,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { fr } from 'date-fns/locale';

interface EmployeeRentalPeriodsProps {
  rental: any;
  rentalPeriods: any[];
  onUpdate?: (periods: any[]) => void;
}

export default function EmployeeRentalPeriods({ 
  rental, 
  rentalPeriods,
  onUpdate 
}: EmployeeRentalPeriodsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [expandedPeriods, setExpandedPeriods] = useState<Set<string>>(new Set());

  const togglePeriodExpansion = (periodId: string) => {
    setExpandedPeriods(prev => {
      const newSet = new Set(prev);
      if (newSet.has(periodId)) {
        newSet.delete(periodId);
      } else {
        newSet.add(periodId);
      }
      return newSet;
    });
  };

  // Calculate period statistics
  const calculatePeriodStats = () => {
    if (!rentalPeriods || rentalPeriods.length === 0) {
      return {
        totalPeriods: 0,
        paidPeriods: 0,
        pendingPeriods: 0,
        gapPeriods: 0,
        totalDays: 0
      };
    }

    const stats = rentalPeriods.reduce((acc, period) => {
      const days = differenceInDays(new Date(period.endDate), new Date(period.startDate)) + 1;
      
      return {
        totalPeriods: acc.totalPeriods + 1,
        paidPeriods: acc.paidPeriods + (period.paymentStatus === 'PAID' ? 1 : 0),
        pendingPeriods: acc.pendingPeriods + (period.paymentStatus === 'PENDING' || !period.paymentStatus ? 1 : 0),
        gapPeriods: acc.gapPeriods + (period.isGapPeriod ? 1 : 0),
        totalDays: acc.totalDays + days
      };
    }, {
      totalPeriods: 0,
      paidPeriods: 0,
      pendingPeriods: 0,
      gapPeriods: 0,
      totalDays: 0
    });

    return stats;
  };

  const stats = calculatePeriodStats();

  const getStatusIcon = (period: any) => {
    if (period.isGapPeriod) {
      return <AlertTriangle className="h-4 w-4 text-orange-500" />;
    }
    
    switch (period.paymentStatus) {
      case 'PAID':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'PENDING':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (period: any) => {
    if (period.isGapPeriod) {
      return (
        <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-200">
          Gap
        </Badge>
      );
    }
    
    switch (period.paymentStatus) {
      case 'PAID':
        return (
          <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
            Payé
          </Badge>
        );
      case 'PENDING':
        return (
          <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200">
            En Attente
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="bg-gray-100 text-gray-600 border-gray-200">
            Non défini
          </Badge>
        );
    }
  };

  const formatPeriodDate = (date: string | Date) => {
    return format(new Date(date), 'dd MMM yyyy', { locale: fr });
  };

  const calculatePeriodDays = (period: any) => {
    return differenceInDays(new Date(period.endDate), new Date(period.startDate)) + 1;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
          <History className="h-5 w-5 text-blue-600" />
          Périodes de Location
        </h2>
        <Badge variant="outline" className="text-sm">
          {stats.totalPeriods} période{stats.totalPeriods > 1 ? 's' : ''}
        </Badge>
      </div>

      {/* Employee Access Notice */}
      <Alert>
        <Shield className="h-4 w-4" />
        <AlertDescription>
          <strong>Mode Employé:</strong> Vous pouvez consulter les périodes de location mais les modifications 
          financières sont réservées à l'administration.
        </AlertDescription>
      </Alert>

      {/* Statistics Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5 text-blue-600" />
            Résumé des Périodes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.totalPeriods}</div>
              <div className="text-sm text-gray-600">Périodes Total</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{stats.paidPeriods}</div>
              <div className="text-sm text-gray-600">Payées</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{stats.pendingPeriods}</div>
              <div className="text-sm text-gray-600">En Attente</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{stats.gapPeriods}</div>
              <div className="text-sm text-gray-600">Gaps</div>
            </div>
          </div>
          
          <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="text-sm text-blue-700">
              <strong>Durée totale couverte:</strong> {stats.totalDays} jour{stats.totalDays > 1 ? 's' : ''}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Periods List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-600" />
            Liste des Périodes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!rentalPeriods || rentalPeriods.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <div className="text-lg font-medium mb-2">Aucune période définie</div>
              <div className="text-sm">
                Les périodes de facturation seront créées par l'administration.
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {rentalPeriods
                .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
                .map((period, index) => {
                  const days = calculatePeriodDays(period);
                  const isExpanded = expandedPeriods.has(period.id);
                  
                  return (
                    <div key={period.id} className="border rounded-lg bg-white">
                      {/* Period Header */}
                      <div 
                        className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                        onClick={() => togglePeriodExpansion(period.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {getStatusIcon(period)}
                            <div>
                              <div className="font-medium">
                                Période {index + 1}
                              </div>
                              <div className="text-sm text-gray-600">
                                {formatPeriodDate(period.startDate)} - {formatPeriodDate(period.endDate)}
                                <span className="ml-2 text-blue-600">({days} jour{days > 1 ? 's' : ''})</span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            {getStatusBadge(period)}
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4 text-gray-400" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-gray-400" />
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Expanded Period Details */}
                      {isExpanded && (
                        <div className="border-t px-4 pb-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-4">
                            <div>
                              <div className="text-sm text-gray-600 mb-1">Type de Période</div>
                              <div className="font-medium">
                                {period.isGapPeriod ? 'Période Gap (Patient)' : 'Période Couverte'}
                              </div>
                            </div>
                            
                            <div>
                              <div className="text-sm text-gray-600 mb-1">Statut de Paiement</div>
                              <div className="flex items-center gap-2">
                                {getStatusIcon(period)}
                                <span className="font-medium">
                                  {period.paymentStatus === 'PAID' ? 'Payé' : 
                                   period.paymentStatus === 'PENDING' ? 'En attente' : 
                                   'Non défini'}
                                </span>
                              </div>
                            </div>
                            
                            <div>
                              <div className="text-sm text-gray-600 mb-1">Durée</div>
                              <div className="font-medium">
                                {days} jour{days > 1 ? 's' : ''}
                              </div>
                            </div>
                            
                            {period.description && (
                              <div className="md:col-span-2 lg:col-span-3">
                                <div className="text-sm text-gray-600 mb-1">Description</div>
                                <div className="text-sm bg-gray-50 p-2 rounded">
                                  {period.description}
                                </div>
                              </div>
                            )}
                          </div>
                          
                          {/* Financial Information - Hidden for employees */}
                          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                            <div className="text-sm text-yellow-700 flex items-center gap-1">
                              <Shield className="h-3 w-3" />
                              Les informations financières détaillées sont disponibles pour l'administration
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Timeline View */}
      {rentalPeriods && rentalPeriods.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-600" />
              Chronologie des Périodes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {rentalPeriods
                .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
                .map((period, index) => {
                  const days = calculatePeriodDays(period);
                  const isLast = index === rentalPeriods.length - 1;
                  
                  return (
                    <div key={period.id} className="flex items-start gap-3">
                      <div className="flex flex-col items-center">
                        <div className={`w-3 h-3 rounded-full ${
                          period.isGapPeriod ? 'bg-orange-400' :
                          period.paymentStatus === 'PAID' ? 'bg-green-400' :
                          period.paymentStatus === 'PENDING' ? 'bg-yellow-400' : 'bg-gray-300'
                        }`} />
                        {!isLast && <div className="w-0.5 h-8 bg-gray-200 mt-1" />}
                      </div>
                      
                      <div className="flex-1 pb-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">
                              {formatPeriodDate(period.startDate)} - {formatPeriodDate(period.endDate)}
                            </div>
                            <div className="text-sm text-gray-600">
                              {days} jour{days > 1 ? 's' : ''} • 
                              {period.isGapPeriod ? ' Période Gap' : ' Période Couverte'}
                            </div>
                          </div>
                          {getStatusBadge(period)}
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Help Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5 text-blue-600" />
            Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
              <div>
                <strong>Période Payée:</strong> Le paiement a été reçu et confirmé
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Clock className="h-4 w-4 text-yellow-500 mt-0.5" />
              <div>
                <strong>En Attente:</strong> En attente de paiement ou de confirmation
              </div>
            </div>
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-500 mt-0.5" />
              <div>
                <strong>Période Gap:</strong> Période à charge du patient entre deux couvertures
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}