import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { useQuery } from '@tanstack/react-query';
import { 
  Package, 
  Plus, 
  Download,
  RefreshCw,
  CheckCircle,
  Clock,
  AlertTriangle,
  Shield,
  Upload
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import RentalTable from '@/pages/roles/admin/dashboard/components/tables/RentalTable';
import ExcelImportDialog from '@/components/rentals/ExcelImportDialog';

export default function RentalsPage() {
  const router = useRouter();
  const [importDialogOpen, setImportDialogOpen] = useState(false);

  // Fetch rentals data for statistics only
  const { data: rentalsData, isLoading, refetch } = useQuery({
    queryKey: ['rentals-stats'],
    queryFn: async () => {
      const response = await fetch('/api/rentals');
      if (!response.ok) throw new Error('Failed to fetch rentals');
      const data = await response.json();
      return data.rentals || [];
    },
  });

  const rentals = rentalsData || [];

  // Calculate statistics
  const stats = {
    total: rentals.length,
    active: rentals.filter((r: any) => r.status === 'ACTIVE').length,
    pending: rentals.filter((r: any) => r.status === 'PENDING').length,
    expired: rentals.filter((r: any) => r.status === 'EXPIRED' || r.status === 'COMPLETED').length,
    withCnam: rentals.filter((r: any) => r.cnamBonds?.length > 0).length,
  };

  const handleNewRental = () => {
    router.push('/roles/admin/dashboard?action=new-rental');
  };

  const handleExport = () => {
    // Export functionality
    const csv = [
      ['ID', 'Patient/Société', 'Appareil', 'Date Début', 'Date Fin', 'Statut', 'Montant'],
      ...rentals.map((r: any) => [
        r.id,
        r.patient ? `${r.patient.firstName} ${r.patient.lastName}` : r.Company?.companyName,
        r.medicalDevice?.name,
        r.startDate,
        r.endDate || 'Indéterminée',
        r.status,
        r.configuration?.totalPaymentAmount || 0
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rentals_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <div className="container mx-auto py-6 px-2 max-w-none">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <Package className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Gestion des Locations
            </h1>
            <p className="text-gray-600">
              Gérez toutes les locations d'appareils médicaux
            </p>
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => refetch()}
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Actualiser
          </Button>
          <Button
            variant="outline"
            onClick={handleExport}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Exporter
          </Button>
          <Button
            variant="outline"
            onClick={() => setImportDialogOpen(true)}
            className="flex items-center gap-2 bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
          >
            <Upload className="h-4 w-4" />
            Importer Excel
          </Button>
          <Button
            onClick={handleNewRental}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Nouvelle Location
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Locations</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Toutes les locations</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Actives</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
            <p className="text-xs text-muted-foreground">En cours</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En Attente</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
            <p className="text-xs text-muted-foreground">À valider</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expirées</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.expired}</div>
            <p className="text-xs text-muted-foreground">À renouveler</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avec CNAM</CardTitle>
            <Shield className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.withCnam}</div>
            <p className="text-xs text-muted-foreground">Couverture CNAM</p>
          </CardContent>
        </Card>
      </div>


      {/* Rental Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Liste des Locations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <RentalTable 
            onViewDetails={(id) => router.push(`/roles/admin/rentals/${id}`)}
            onEdit={(id) => router.push(`/roles/admin/rentals/${id}`)}
          />
        </CardContent>
      </Card>

      {/* Excel Import Dialog */}
      <ExcelImportDialog 
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
      />
    </div>
  );
}