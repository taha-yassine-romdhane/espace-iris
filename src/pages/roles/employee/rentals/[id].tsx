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
  Clock,
  Settings,
  FileText,
  AlertTriangle,
  History,
  ChevronRight,
  Home,
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
import EmployeeLayout from '../EmployeeLayout';

// Import employee-specific components (restricted access)
import EmployeeRentalOverview from '@/components/rentals/employee/EmployeeRentalOverview';
import EmployeeRentalConfiguration from '@/components/rentals/employee/EmployeeRentalConfiguration';
import EmployeeRentalPeriods from '@/components/rentals/employee/EmployeeRentalPeriods';
import EmployeeRentalParameters from '@/components/rentals/employee/EmployeeRentalParameters';
import SimpleGapAnalysis from '@/components/rentals/SimpleGapAnalysis';

export default function EmployeeRentalDetailsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { id } = router.query;
  const rentalId = typeof id === 'string' ? id : '';
  const [activeTab, setActiveTab] = useState('overview');

  // Fetch rental data with employee restrictions
  const { data: rental, isLoading, error } = useQuery({
    queryKey: ['rental', rentalId],
    queryFn: async () => {
      if (!rentalId) return null;
      
      const response = await fetch(`/api/rentals/${rentalId}?role=employee`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch rental details');
      }
      
      const data = await response.json();
      return data.rental;
    },
    enabled: !!rentalId,
  });

  // Mutation for updating rental data (employee restrictions)
  const updateRentalMutation = useMutation({
    mutationFn: async (updateData: any) => {
      const response = await fetch(`/api/rentals/${rentalId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...updateData, role: 'employee' }),
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
    router.push('/roles/employee/dashboard');
  };

  const handleUpdateRental = (updateData: any) => {
    updateRentalMutation.mutate(updateData);
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
          periods: periods,
          role: 'employee'
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update rental periods');
      }

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
          onClick={() => router.push('/roles/employee/dashboard')}
          className="flex items-center text-gray-600 hover:text-blue-600 transition-colors"
        >
          <Home className="h-4 w-4 mr-1" />
          Dashboard
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
                <h1 className="text-2xl font-semibold text-gray-900">Suivi de Location</h1>
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
        <Button variant="outline" onClick={() => router.push('/roles/employee/dashboard')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Retour au Dashboard
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-8 grid w-full grid-cols-5">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Vue d'ensemble
          </TabsTrigger>
          <TabsTrigger value="configuration" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Configuration
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
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <ErrorBoundary fallback={<div className="p-8 text-center text-red-600">Erreur dans la vue d'ensemble</div>}>
            <EmployeeRentalOverview 
              rental={rental} 
              onUpdate={handleUpdateRental}
              onNavigateToTab={setActiveTab}
            />
          </ErrorBoundary>
        </TabsContent>

        <TabsContent value="configuration" className="space-y-6">
          <ErrorBoundary fallback={<div className="p-8 text-center text-red-600">Erreur dans la configuration</div>}>
            <EmployeeRentalConfiguration 
              rental={rental}
              onUpdate={handleUpdateRental}
            />
          </ErrorBoundary>
        </TabsContent>

        <TabsContent value="periods" className="space-y-6">
          <ErrorBoundary fallback={<div className="p-8 text-center text-red-600">Erreur dans la gestion des périodes</div>}>
            <EmployeeRentalPeriods 
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
            <EmployeeRentalParameters 
              rental={rental}
              onUpdate={handleUpdateRental}
            />
          </ErrorBoundary>
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

EmployeeRentalDetailsPage.getLayout = (page: React.ReactNode) => (
  <EmployeeLayout>{page}</EmployeeLayout>
);