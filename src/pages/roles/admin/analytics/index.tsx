import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, Users, Stethoscope, Package, Download } from "lucide-react";
import { ExcelTable } from '@/components/analytics/ExcelTable';

interface DetailedAnalytics {
  employees: any[];
  patients: any[];
  devices: any[];
  summary: {
    employees: any;
    patients: any;
    devices: any;
  };
}

const AnalyticsPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [analyticsData, setAnalyticsData] = useState<DetailedAnalytics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('employees');

  const fetchAnalyticsData = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/analytics/detailed');
      if (!response.ok) {
        throw new Error('Failed to fetch analytics data');
      }
      const data = await response.json();
      setAnalyticsData(data);
    } catch (error) {
      setError('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalyticsData();
  }, []);

  const formatCurrency = (value: any) => {
    if (value === 'N/A' || value === null || value === undefined) return 'N/A';
    return `${Number(value).toLocaleString('fr-TN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TND`;
  };

  const formatNumber = (value: any) => {
    if (value === 'N/A' || value === null || value === undefined) return 'N/A';
    return Number(value).toLocaleString('fr-TN');
  };

  // Employee columns
  const employeeColumns = [
    { key: 'fullName', label: 'Nom Complet', width: '200px', align: 'left' as const },
    { key: 'email', label: 'Email', width: '200px', align: 'left' as const },
    { key: 'role', label: 'Rôle', width: '100px', align: 'center' as const },
    { key: 'telephone', label: 'Téléphone', width: '120px', align: 'center' as const },
    { key: 'totalPatients', label: 'Patients', width: '100px', align: 'right' as const, format: formatNumber },
    { key: 'totalRentals', label: 'Total Locations', width: '120px', align: 'right' as const, format: formatNumber },
    { key: 'activeRentals', label: 'Locations Actives', width: '130px', align: 'right' as const, format: formatNumber },
    { key: 'completedRentals', label: 'Locations Terminées', width: '150px', align: 'right' as const, format: formatNumber },
    { key: 'totalSales', label: 'Ventes', width: '100px', align: 'right' as const, format: formatNumber },
    { key: 'rentalRevenue', label: 'Revenu Location', width: '150px', align: 'right' as const, format: formatCurrency },
    { key: 'salesRevenue', label: 'Revenu Vente', width: '150px', align: 'right' as const, format: formatCurrency },
    { key: 'totalRevenue', label: 'Revenu Total', width: '150px', align: 'right' as const, format: formatCurrency, className: 'font-bold text-green-700' },
    { key: 'totalAppointments', label: 'RDV Total', width: '100px', align: 'right' as const, format: formatNumber },
    { key: 'completedAppointments', label: 'RDV Terminés', width: '120px', align: 'right' as const, format: formatNumber },
    { key: 'totalDiagnostics', label: 'Diagnostics Total', width: '140px', align: 'right' as const, format: formatNumber },
    { key: 'completedDiagnostics', label: 'Diagnostics Terminés', width: '160px', align: 'right' as const, format: formatNumber },
    { key: 'stockLocation', label: 'Emplacement Stock', width: '150px', align: 'left' as const },
    { key: 'devicesInStock', label: 'Appareils en Stock', width: '150px', align: 'right' as const, format: formatNumber },
    { key: 'activeDevices', label: 'Appareils Actifs', width: '130px', align: 'right' as const, format: formatNumber },
    { key: 'performanceScore', label: 'Score Performance', width: '150px', align: 'right' as const, format: (v: number) => v + '%' },
    { key: 'createdAt', label: 'Date Création', width: '120px', align: 'center' as const }
  ];

  // Patient columns
  const patientColumns = [
    { key: 'fullName', label: 'Nom Complet', width: '200px', align: 'left' as const },
    { key: 'patientCode', label: 'Code Patient', width: '120px', align: 'center' as const },
    { key: 'telephone', label: 'Téléphone', width: '120px', align: 'center' as const },
    { key: 'affiliation', label: 'Affiliation', width: '100px', align: 'center' as const },
    { key: 'beneficiaryType', label: 'Type Bénéficiaire', width: '150px', align: 'center' as const },
    { key: 'cnamId', label: 'CNAM ID', width: '120px', align: 'center' as const },
    { key: 'age', label: 'Âge', width: '80px', align: 'right' as const },
    { key: 'totalRentals', label: 'Total Locations', width: '120px', align: 'right' as const, format: formatNumber },
    { key: 'activeRentals', label: 'Locations Actives', width: '130px', align: 'right' as const, format: formatNumber },
    { key: 'completedRentals', label: 'Locations Terminées', width: '150px', align: 'right' as const, format: formatNumber },
    { key: 'totalSales', label: 'Achats', width: '100px', align: 'right' as const, format: formatNumber },
    { key: 'totalPayments', label: 'Total Paiements', width: '130px', align: 'right' as const, format: formatNumber },
    { key: 'totalPaid', label: 'Total Payé', width: '150px', align: 'right' as const, format: formatCurrency, className: 'font-bold text-green-700' },
    { key: 'totalPending', label: 'En Attente', width: '150px', align: 'right' as const, format: formatCurrency, className: 'font-bold text-orange-600' },
    { key: 'salesTotal', label: 'Montant Ventes', width: '150px', align: 'right' as const, format: formatCurrency },
    { key: 'cnamBons', label: 'Bons CNAM', width: '100px', align: 'right' as const, format: formatNumber },
    { key: 'cnamTotal', label: 'Montant CNAM', width: '150px', align: 'right' as const, format: formatCurrency },
    { key: 'totalDiagnostics', label: 'Diagnostics Total', width: '140px', align: 'right' as const, format: formatNumber },
    { key: 'completedDiagnostics', label: 'Diagnostics Terminés', width: '160px', align: 'right' as const, format: formatNumber },
    { key: 'pendingDiagnostics', label: 'Diagnostics En Attente', width: '180px', align: 'right' as const, format: formatNumber },
    { key: 'totalAppointments', label: 'RDV Total', width: '100px', align: 'right' as const, format: formatNumber },
    { key: 'completedAppointments', label: 'RDV Terminés', width: '120px', align: 'right' as const, format: formatNumber },
    { key: 'upcomingAppointments', label: 'RDV À Venir', width: '120px', align: 'right' as const, format: formatNumber },
    { key: 'activityScore', label: 'Score Activité', width: '120px', align: 'right' as const },
    { key: 'governorate', label: 'Gouvernorat', width: '120px', align: 'left' as const },
    { key: 'delegation', label: 'Délégation', width: '120px', align: 'left' as const },
    { key: 'createdAt', label: 'Date Création', width: '120px', align: 'center' as const },
    { key: 'lastActivity', label: 'Dernière Activité', width: '140px', align: 'center' as const }
  ];

  // Device columns
  const deviceColumns = [
    { key: 'name', label: 'Nom Appareil', width: '200px', align: 'left' as const },
    { key: 'deviceCode', label: 'Code', width: '120px', align: 'center' as const },
    { key: 'type', label: 'Type', width: '150px', align: 'left' as const },
    { key: 'brand', label: 'Marque', width: '120px', align: 'left' as const },
    { key: 'model', label: 'Modèle', width: '120px', align: 'left' as const },
    { key: 'serialNumber', label: 'N° Série', width: '150px', align: 'center' as const },
    { key: 'status', label: 'Statut', width: '100px', align: 'center' as const },
    { key: 'destination', label: 'Destination', width: '120px', align: 'center' as const },
    { key: 'stockLocation', label: 'Emplacement', width: '150px', align: 'left' as const },
    { key: 'purchasePrice', label: 'Prix Achat', width: '120px', align: 'right' as const, format: formatCurrency },
    { key: 'sellingPrice', label: 'Prix Vente', width: '120px', align: 'right' as const, format: formatCurrency },
    { key: 'rentalPrice', label: 'Prix Location', width: '130px', align: 'right' as const, format: formatCurrency },
    { key: 'totalRentals', label: 'Total Locations', width: '120px', align: 'right' as const, format: formatNumber },
    { key: 'activeRentals', label: 'Locations Actives', width: '130px', align: 'right' as const, format: formatNumber },
    { key: 'completedRentals', label: 'Locations Terminées', width: '150px', align: 'right' as const, format: formatNumber },
    { key: 'rentalRevenue', label: 'Revenu Location', width: '150px', align: 'right' as const, format: formatCurrency },
    { key: 'salesCount', label: 'Ventes', width: '100px', align: 'right' as const, format: formatNumber },
    { key: 'salesRevenue', label: 'Revenu Vente', width: '150px', align: 'right' as const, format: formatCurrency },
    { key: 'totalRevenue', label: 'Revenu Total', width: '150px', align: 'right' as const, format: formatCurrency, className: 'font-bold text-green-700' },
    { key: 'repairCount', label: 'Réparations', width: '100px', align: 'right' as const, format: formatNumber },
    { key: 'repairCost', label: 'Coût Réparations', width: '150px', align: 'right' as const, format: formatCurrency, className: 'text-red-600' },
    { key: 'lastRepairDate', label: 'Dernière Réparation', width: '150px', align: 'center' as const },
    { key: 'utilizationRate', label: 'Taux Utilisation', width: '140px', align: 'right' as const },
    { key: 'profitability', label: 'Rentabilité', width: '150px', align: 'right' as const, format: formatCurrency, className: 'font-bold text-blue-700' },
    { key: 'roi', label: 'ROI', width: '100px', align: 'right' as const },
    { key: 'createdAt', label: 'Date Création', width: '120px', align: 'center' as const }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex items-center space-x-2">
          <RefreshCw className="h-6 w-6 animate-spin" />
          <span>Chargement des données analytiques...</span>
        </div>
      </div>
    );
  }

  if (error || !analyticsData) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || 'Erreur de chargement'}</p>
          <Button onClick={fetchAnalyticsData} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Réessayer
          </Button>
        </div>
      </div>
    );
  }

  const { employees, patients, devices, summary } = analyticsData;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analyses & Statistiques Détaillées</h1>
          <p className="text-muted-foreground">
            Vue complète des performances avec statistiques calculées
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <Button onClick={fetchAnalyticsData} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualiser
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Exporter Excel
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Employés</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.employees.total}</div>
            <div className="space-y-1 mt-2 text-xs text-muted-foreground">
              <div className="flex justify-between">
                <span>Revenu Total:</span>
                <span className="font-medium text-green-700">{formatCurrency(summary.employees.totalRevenue)}</span>
              </div>
              <div className="flex justify-between">
                <span>Moy. par Employé:</span>
                <span className="font-medium">{formatCurrency(summary.employees.avgRevenuePerEmployee)}</span>
              </div>
              <div className="flex justify-between">
                <span>Total Patients:</span>
                <span className="font-medium">{formatNumber(summary.employees.totalPatients)}</span>
              </div>
              <div className="flex justify-between">
                <span>Total Locations:</span>
                <span className="font-medium">{formatNumber(summary.employees.totalRentals)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Patients</CardTitle>
            <Stethoscope className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.patients.total}</div>
            <div className="space-y-1 mt-2 text-xs text-muted-foreground">
              <div className="flex justify-between">
                <span>Revenu Total:</span>
                <span className="font-medium text-green-700">{formatCurrency(summary.patients.totalRevenue)}</span>
              </div>
              <div className="flex justify-between">
                <span>Moy. par Patient:</span>
                <span className="font-medium">{formatCurrency(summary.patients.avgRevenuePerPatient)}</span>
              </div>
              <div className="flex justify-between">
                <span>Locations Actives:</span>
                <span className="font-medium">{formatNumber(summary.patients.activeRentals)}</span>
              </div>
              <div className="flex justify-between">
                <span>Montant CNAM:</span>
                <span className="font-medium">{formatCurrency(summary.patients.totalCnamAmount)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Appareils</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.devices.total}</div>
            <div className="space-y-1 mt-2 text-xs text-muted-foreground">
              <div className="flex justify-between">
                <span>Revenu Total:</span>
                <span className="font-medium text-green-700">{formatCurrency(summary.devices.totalRevenue)}</span>
              </div>
              <div className="flex justify-between">
                <span>Moy. par Appareil:</span>
                <span className="font-medium">{formatCurrency(summary.devices.avgRevenuePerDevice)}</span>
              </div>
              <div className="flex justify-between">
                <span>Coût Réparations:</span>
                <span className="font-medium text-red-600">{formatCurrency(summary.devices.totalRepairCost)}</span>
              </div>
              <div className="flex justify-between">
                <span>Rentabilité:</span>
                <span className="font-medium text-blue-700">{formatCurrency(summary.devices.totalProfitability)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs with Excel Tables */}
      <Card>
        <CardContent className="p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="employees" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Employés ({employees.length})
              </TabsTrigger>
              <TabsTrigger value="patients" className="flex items-center gap-2">
                <Stethoscope className="h-4 w-4" />
                Patients ({patients.length})
              </TabsTrigger>
              <TabsTrigger value="devices" className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                Appareils ({devices.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="employees" className="mt-6">
              <ExcelTable
                title="Statistiques des Employés"
                columns={employeeColumns}
                data={employees}
                summary={{
                  fullName: 'TOTAL',
                  totalPatients: summary.employees.totalPatients,
                  totalRentals: summary.employees.totalRentals,
                  totalSales: summary.employees.totalSales,
                  rentalRevenue: employees.reduce((sum, e) => sum + Number(e.rentalRevenue), 0).toFixed(2),
                  salesRevenue: employees.reduce((sum, e) => sum + Number(e.salesRevenue), 0).toFixed(2),
                  totalRevenue: summary.employees.totalRevenue,
                  completedAppointments: employees.reduce((sum, e) => sum + e.completedAppointments, 0),
                  totalAppointments: employees.reduce((sum, e) => sum + e.totalAppointments, 0),
                  completedDiagnostics: employees.reduce((sum, e) => sum + e.completedDiagnostics, 0),
                  totalDiagnostics: employees.reduce((sum, e) => sum + e.totalDiagnostics, 0),
                  devicesInStock: employees.reduce((sum, e) => sum + e.devicesInStock, 0),
                  activeDevices: employees.reduce((sum, e) => sum + e.activeDevices, 0)
                }}
              />
            </TabsContent>

            <TabsContent value="patients" className="mt-6">
              <ExcelTable
                title="Statistiques des Patients"
                columns={patientColumns}
                data={patients}
                summary={{
                  fullName: 'TOTAL',
                  totalRentals: patients.reduce((sum, p) => sum + p.totalRentals, 0),
                  activeRentals: summary.patients.activeRentals,
                  completedRentals: patients.reduce((sum, p) => sum + p.completedRentals, 0),
                  totalSales: patients.reduce((sum, p) => sum + p.totalSales, 0),
                  totalPayments: patients.reduce((sum, p) => sum + p.totalPayments, 0),
                  totalPaid: summary.patients.totalRevenue,
                  totalPending: patients.reduce((sum, p) => sum + Number(p.totalPending), 0).toFixed(2),
                  salesTotal: patients.reduce((sum, p) => sum + Number(p.salesTotal), 0).toFixed(2),
                  cnamBons: summary.patients.totalCnamBons,
                  cnamTotal: summary.patients.totalCnamAmount,
                  totalDiagnostics: patients.reduce((sum, p) => sum + p.totalDiagnostics, 0),
                  completedDiagnostics: patients.reduce((sum, p) => sum + p.completedDiagnostics, 0),
                  pendingDiagnostics: patients.reduce((sum, p) => sum + p.pendingDiagnostics, 0),
                  totalAppointments: patients.reduce((sum, p) => sum + p.totalAppointments, 0),
                  completedAppointments: patients.reduce((sum, p) => sum + p.completedAppointments, 0),
                  upcomingAppointments: patients.reduce((sum, p) => sum + p.upcomingAppointments, 0)
                }}
              />
            </TabsContent>

            <TabsContent value="devices" className="mt-6">
              <ExcelTable
                title="Statistiques des Appareils Médicaux"
                columns={deviceColumns}
                data={devices}
                summary={{
                  name: 'TOTAL',
                  totalRentals: devices.reduce((sum, d) => sum + d.totalRentals, 0),
                  activeRentals: summary.devices.activeRentals,
                  completedRentals: devices.reduce((sum, d) => sum + d.completedRentals, 0),
                  rentalRevenue: devices.reduce((sum, d) => sum + Number(d.rentalRevenue), 0).toFixed(2),
                  salesCount: devices.reduce((sum, d) => sum + d.salesCount, 0),
                  salesRevenue: devices.reduce((sum, d) => sum + Number(d.salesRevenue), 0).toFixed(2),
                  totalRevenue: summary.devices.totalRevenue,
                  repairCount: devices.reduce((sum, d) => sum + d.repairCount, 0),
                  repairCost: summary.devices.totalRepairCost,
                  profitability: summary.devices.totalProfitability
                }}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default AnalyticsPage;
