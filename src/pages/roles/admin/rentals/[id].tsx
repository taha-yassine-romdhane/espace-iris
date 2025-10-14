import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Loader2, 
  ArrowLeft, 
  CalendarRange, 
  Edit, 
  Save, 
  X, 
  Shield, 
  Package, 
  CreditCard,
  Clock,
  Settings,
  FileText,
  AlertTriangle,
  History,
  PiggyBank,
  Zap,
  Home,
  ChevronRight,
  User,
  Building2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import ErrorBoundary from '@/components/ErrorBoundary';

// Import enhanced components
import ComprehensiveRentalOverview from '@/components/rentals/ComprehensiveRentalOverview';
import CNAMBondsManagement from '@/components/rentals/CNAMBondsManagement';
import RentalPeriodsManagement from '@/components/rentals/RentalPeriodsManagement';
import EnhancedRentalDeviceParameters from '@/components/rentals/EnhancedRentalDeviceParameters';
import AdvancedRentalConfiguration from '@/components/rentals/AdvancedRentalConfiguration';
import PaymentAutoGeneration from '@/components/rentals/PaymentAutoGeneration';
import SimpleGapAnalysis from '@/components/rentals/SimpleGapAnalysis';

export default function RentalDetailsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { id } = router.query;
  const rentalId = typeof id === 'string' ? id : '';
  const [activeTab, setActiveTab] = useState('overview');

  // Fetch rental data with enhanced relationships
  const { data: rental, isLoading, error } = useQuery({
    queryKey: ['rental', rentalId],
    queryFn: async () => {
      if (!rentalId) return null;
      
      const response = await fetch(`/api/rentals/${rentalId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch rental details');
      }
      
      const data = await response.json();
      return data.rental;
    },
    enabled: !!rentalId,
  });

  // Mutation for updating rental data
  const updateRentalMutation = useMutation({
    mutationFn: async (updateData: any) => {
      const response = await fetch(`/api/rentals/${rentalId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        throw new Error('Failed to update rental');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rental', rentalId] });
      toast({
        title: "Location mise à jour",
        description: "Les modifications ont été sauvegardées avec succès.",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de sauvegarder les modifications.",
      });
    },
  });

  const handleBack = () => {
    router.push('/roles/admin/dashboard');
  };

  const handleUpdateRental = (updateData: any) => {
    updateRentalMutation.mutate(updateData);
  };

  const handleUpdateCNAMBonds = (bonds: any[]) => {
    handleUpdateRental({ cnamBonds: bonds });
  };

  const handleUpdateRentalPeriods = async (periods: any[]) => {
    try {
      const response = await fetch('/api/rental-periods', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rentalId: rentalId,
          periods: periods
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update rental periods');
      }

      const result = await response.json();
      
      // Refresh the rental data to get updated periods
      queryClient.invalidateQueries({ queryKey: ['rental', rentalId] });
      
      toast({
        title: "Périodes mises à jour",
        description: "Les périodes de location ont été sauvegardées avec succès.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de sauvegarder les périodes.",
      });
    }
  };


  if (isLoading) {
    return (
      <div className="container mx-auto py-10 px-4">
        <div className="flex justify-center items-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <span className="ml-2 text-gray-600">Chargement des détails de la location...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-10 px-4">
        <Button variant="outline" onClick={handleBack} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Retour
        </Button>
        <Alert variant="destructive">
          <AlertDescription>
            Impossible de charger les détails de cette location. Veuillez réessayer plus tard.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!rental) {
    return (
      <div className="container mx-auto py-10 px-4">
        <Button variant="outline" onClick={handleBack} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Retour
        </Button>
        <Alert>
          <AlertDescription>
            Location non trouvée. Elle a peut-être été supprimée.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10 px-4 max-w-7xl">
      {/* Enhanced Breadcrumb Navigation */}
      <nav className="flex items-center text-sm mb-6 bg-gray-50 px-4 py-3 rounded-lg">
        <button 
          onClick={() => router.push('/roles/admin/dashboard')}
          className="flex items-center text-gray-600 hover:text-blue-600 transition-colors"
        >
          <Home className="h-4 w-4 mr-1" />
          Dashboard
        </button>
        <ChevronRight className="h-4 w-4 mx-2 text-gray-400" />
        <button 
          onClick={() => router.push('/roles/admin/rentals')}
          className="flex items-center text-gray-600 hover:text-blue-600 transition-colors"
        >
          <Package className="h-4 w-4 mr-1" />
          Locations
        </button>
        <ChevronRight className="h-4 w-4 mx-2 text-gray-400" />
        <div className="flex items-center text-gray-900 font-medium">
          <Shield className="h-4 w-4 mr-1 text-blue-600" />
          {rental.patient ? (
            <>
              {`${rental.patient.firstName} ${rental.patient.lastName}`}
              {rental.patient.patientCode && (
                <span className="ml-2 text-blue-600 font-normal">
                  (Code: {rental.patient.patientCode})
                </span>
              )}
            </>
          ) : (
            rental.company?.companyName || 'Location'
          )}
          {rental.medicalDevice && (
            <span className="ml-2 text-gray-500 font-normal">
              - {rental.medicalDevice.name}
              {rental.medicalDevice.serialNumber && (
                <span className="ml-1">
                  (SN: {rental.medicalDevice.serialNumber})
                </span>
              )}
            </span>
          )}
        </div>
      </nav>

      {/* Enhanced Header with Complete Information */}
      <div className="bg-white border rounded-lg p-6 mb-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Shield className="h-6 w-6 text-blue-600" />
              <div>
                <h1 className="text-2xl font-semibold text-gray-900">Gestion de Location</h1>
                <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                  {rental.patient ? (
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      <span className="font-medium">
                        {rental.patient.firstName} {rental.patient.lastName}
                      </span>
                      {rental.patient.patientCode && (
                        <Badge variant="secondary" className="text-xs">
                          Code: {rental.patient.patientCode}
                        </Badge>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      <span className="font-medium">{rental.company?.companyName}</span>
                    </div>
                  )}
                  
                  {rental.medicalDevice && (
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4" />
                      <span className="font-medium">{rental.medicalDevice.name}</span>
                      {rental.medicalDevice.serialNumber && (
                        <Badge variant="outline" className="text-xs">
                          SN: {rental.medicalDevice.serialNumber}
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-sm">
              {rental.rentalCode ? `Code: ${rental.rentalCode}` : `ID: ${rental.id}`}
            </Badge>
            {rental.configuration?.urgentRental && (
              <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-200">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Urgent
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center mb-6">
        <Button variant="outline" onClick={() => router.push('/roles/admin/rentals')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Retour aux Locations
        </Button>
      </div>


      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-8 grid w-full grid-cols-7">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Vue d'ensemble
          </TabsTrigger>
          <TabsTrigger value="configuration" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Configuration
          </TabsTrigger>
          <TabsTrigger value="cnam" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Bons CNAM
          </TabsTrigger>
          <TabsTrigger value="periods" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Périodes
          </TabsTrigger>
          <TabsTrigger value="gap-analysis" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Analyse Gaps
          </TabsTrigger>
          <TabsTrigger value="parameters" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Paramètres
          </TabsTrigger>
          <TabsTrigger value="finance" className="flex items-center gap-2">
            <PiggyBank className="h-4 w-4" />
            Finances
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <ErrorBoundary fallback={<div className="p-8 text-center text-red-600">Erreur dans la vue d'ensemble</div>}>
            <ComprehensiveRentalOverview 
              rental={rental} 
              onUpdate={handleUpdateRental}
              onNavigateToTab={setActiveTab}
            />
          </ErrorBoundary>
        </TabsContent>

        <TabsContent value="configuration" className="space-y-6">
          <ErrorBoundary fallback={<div className="p-8 text-center text-red-600">Erreur dans la configuration</div>}>
            <AdvancedRentalConfiguration 
              rental={rental}
              onUpdate={handleUpdateRental}
            />
          </ErrorBoundary>
        </TabsContent>

        <TabsContent value="cnam" className="space-y-6">
          <ErrorBoundary fallback={<div className="p-8 text-center text-red-600">Erreur dans la gestion CNAM</div>}>
            <CNAMBondsManagement 
              rental={rental}
              cnamBonds={rental.cnamBonds || []}
              onUpdate={handleUpdateCNAMBonds}
            />
          </ErrorBoundary>
        </TabsContent>

        <TabsContent value="periods" className="space-y-6">
          <ErrorBoundary fallback={<div className="p-8 text-center text-red-600">Erreur dans la gestion des périodes</div>}>
            <RentalPeriodsManagement 
              rental={rental}
              rentalPeriods={rental.rentalPeriods || []}
              onUpdate={handleUpdateRentalPeriods}
            />
          </ErrorBoundary>
        </TabsContent>


        <TabsContent value="gap-analysis" className="space-y-6">
          <ErrorBoundary fallback={<div className="p-8 text-center text-red-600">Erreur dans l'analyse des gaps</div>}>
            <SimpleGapAnalysis 
              rental={rental}
              rentalPeriods={rental.rentalPeriods || []}
            />
          </ErrorBoundary>
        </TabsContent>

        <TabsContent value="parameters" className="space-y-6">
          <ErrorBoundary fallback={<div className="p-8 text-center text-red-600">Erreur dans les paramètres</div>}>
            <EnhancedRentalDeviceParameters 
              rental={rental}
              onUpdate={handleUpdateRental}
            />
          </ErrorBoundary>
        </TabsContent>

        <TabsContent value="finance" className="space-y-6">
          {/* Financial Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-blue-600" />
                Répartition Financière
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Total Breakdown */}
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-lg font-semibold">Coût Total de la Location</span>
                    <span className="text-2xl font-bold text-blue-600">
                      {(() => {
                        const total = rental.rentalPeriods?.reduce((sum: number, period: any) => 
                          sum + Number(period.amount || 0), 0) || 0;
                        return total.toFixed(2);
                      })()} TND
                    </span>
                  </div>
                  
                  {/* Breakdown by payment type */}
                  <div className="space-y-2 pt-3 border-t">
                    {(() => {
                      const cnamAmount = rental.rentalPeriods?.reduce((sum: number, period: any) => 
                        period.paymentMethod === 'CNAM' && !period.isGapPeriod 
                          ? sum + Number(period.amount || 0) 
                          : sum, 0) || 0;
                      
                      const gapAmount = rental.rentalPeriods?.reduce((sum: number, period: any) => 
                        period.isGapPeriod 
                          ? sum + Number(period.amount || 0) 
                          : sum, 0) || 0;
                      
                      const cashAmount = rental.rentalPeriods?.reduce((sum: number, period: any) => 
                        period.paymentMethod === 'CASH' && !period.isGapPeriod 
                          ? sum + Number(period.amount || 0) 
                          : sum, 0) || 0;
                      
                      return (
                        <>
                          {cnamAmount > 0 && (
                            <div className="flex justify-between text-sm">
                              <span className="flex items-center gap-2">
                                <Shield className="h-4 w-4 text-green-600" />
                                Couverture CNAM
                              </span>
                              <span className="font-medium text-green-600">
                                {cnamAmount.toFixed(2)} TND
                              </span>
                            </div>
                          )}
                          {gapAmount > 0 && (
                            <div className="flex justify-between text-sm">
                              <span className="flex items-center gap-2">
                                <Clock className="h-4 w-4 text-orange-600" />
                                Périodes Gap (Patient)
                              </span>
                              <span className="font-medium text-orange-600">
                                {gapAmount.toFixed(2)} TND
                              </span>
                            </div>
                          )}
                          {cashAmount > 0 && (
                            <div className="flex justify-between text-sm">
                              <span className="flex items-center gap-2">
                                <CreditCard className="h-4 w-4 text-blue-600" />
                                Paiements Directs
                              </span>
                              <span className="font-medium text-blue-600">
                                {cashAmount.toFixed(2)} TND
                              </span>
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </div>

                {/* Period Details */}
                <div className="space-y-2">
                  <h3 className="font-medium text-gray-700">Détail par Période</h3>
                  {rental.rentalPeriods?.sort((a: any, b: any) => 
                    new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
                  ).map((period: any, index: number) => (
                    <div key={period.id} className="flex justify-between items-center p-3 bg-white border rounded-lg">
                      <div className="flex-1">
                        <div className="text-sm font-medium">
                          Période {index + 1}: {new Date(period.startDate).toLocaleDateString('fr-FR')} - {new Date(period.endDate).toLocaleDateString('fr-FR')}
                        </div>
                        <div className="text-xs text-gray-600">
                          {(() => {
                            const days = Math.ceil((new Date(period.endDate).getTime() - new Date(period.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1;
                            return `${days} jours`;
                          })()}
                          {period.isGapPeriod && ' • Gap'}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">{Number(period.amount || 0).toFixed(2)} TND</div>
                        <Badge variant={period.paymentMethod === 'CNAM' ? 'default' : 'secondary'} className="text-xs">
                          {period.paymentMethod}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Payment Status Summary */}
                <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="text-sm font-medium text-blue-900">Statut de Paiement</div>
                      <div className="text-xs text-blue-700">
                        {rental.status === 'PENDING' 
                          ? 'En attente de configuration finale'
                          : rental.status === 'ACTIVE' 
                          ? 'Location active'
                          : rental.status === 'COMPLETED'
                          ? 'Location terminée'
                          : rental.status}
                      </div>
                    </div>
                    <Badge variant={rental.status === 'ACTIVE' ? 'default' : 'secondary'}>
                      {rental.status}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Update Status Indicator */}
      {updateRentalMutation.isPending && (
        <div className="fixed bottom-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          Sauvegarde en cours...
        </div>
      )}
    </div>
  );
}
