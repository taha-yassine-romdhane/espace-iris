import React, { useState, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart
} from 'recharts';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  DollarSign, 
  Package, 
  Activity,
  Calendar,
  Stethoscope,
  CreditCard,
  FileText,
  RefreshCw
} from "lucide-react";

interface AnalyticsData {
  revenue: {
    total: number;
    monthly: Array<{ month: string; amount: number; sales: number; rentals: number }>;
    byPaymentMethod: Array<{ method: string; amount: number; percentage: number }>;
    growth: number;
  };
  devices: {
    totalActive: number;
    totalSold: number;
    totalRented: number;
    mostPopular: Array<{ name: string; count: number; revenue: number }>;
    utilization: { rented: number; sold: number; available: number };
  };
  patients: {
    total: number;
    newThisMonth: number;
    byAffiliation: Array<{ type: string; count: number }>;
    activeRentals: number;
  };
  cnam: {
    totalBonds: number;
    approvedBonds: number;
    approvalRate: number;
    totalAmount: number;
    byBondType: Array<{ type: string; count: number; amount: number }>;
  };
  recentActivity: Array<{
    type: string;
    description: string;
    amount?: number;
    date: string;
  }>;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

const AnalyticsPage: React.FC = () => {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [timeRange, setTimeRange] = useState('12months');
  const [error, setError] = useState<string | null>(null);

  const fetchAnalyticsData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/analytics?timeRange=${timeRange}`);
      if (!response.ok) {
        throw new Error('Failed to fetch analytics data');
      }
      const data = await response.json();
      setAnalyticsData(data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      setError('Failed to load analytics data');
      // Enhanced mock data for development
      console.warn('Using mock data due to API error:', error);
      setAnalyticsData({
        revenue: {
          total: 125000,
          monthly: [
            { month: 'Jan', amount: 8500, sales: 12, rentals: 8 },
            { month: 'Feb', amount: 9200, sales: 15, rentals: 10 },
            { month: 'Mar', amount: 11800, sales: 18, rentals: 12 },
            { month: 'Apr', amount: 10500, sales: 16, rentals: 9 },
            { month: 'May', amount: 12300, sales: 20, rentals: 14 },
            { month: 'Jun', amount: 13100, sales: 22, rentals: 16 },
          ],
          byPaymentMethod: [
            { method: 'CNAM', amount: 45000, percentage: 36 },
            { method: 'CASH', amount: 35000, percentage: 28 },
            { method: 'CHEQUE', amount: 25000, percentage: 20 },
            { method: 'VIREMENT', amount: 20000, percentage: 16 },
          ],
          growth: 15.2
        },
        devices: {
          totalActive: 150,
          totalSold: 89,
          totalRented: 45,
          mostPopular: [
            { name: 'CPAP ResMed', count: 25, revenue: 35000 },
            { name: 'Masque Nasal', count: 40, revenue: 8000 },
            { name: 'Concentrateur O2', count: 18, revenue: 27000 },
            { name: 'BiPAP', count: 12, revenue: 18000 },
          ],
          utilization: { rented: 30, sold: 45, available: 25 }
        },
        patients: {
          total: 234,
          newThisMonth: 18,
          byAffiliation: [
            { type: 'CNSS', count: 145 },
            { type: 'CNRPS', count: 89 },
          ],
          activeRentals: 67
        },
        cnam: {
          totalBonds: 89,
          approvedBonds: 76,
          approvalRate: 85.4,
          totalAmount: 45000,
          byBondType: [
            { type: 'CPAP', count: 35, amount: 22000 },
            { type: 'MASQUE', count: 28, amount: 8000 },
            { type: 'VNI', count: 15, amount: 10000 },
            { type: 'CONCENTRATEUR_OXYGENE', count: 11, amount: 5000 },
          ]
        },
        recentActivity: [
          { type: 'sale', description: 'Vente CPAP - Patient Ahmed Ben Ali', amount: 1500, date: '2025-07-30' },
          { type: 'rental', description: 'Location Masque - Société MedCare', amount: 250, date: '2025-07-30' },
          { type: 'cnam', description: 'Approbation Bond CNAM #B2025-001', amount: 800, date: '2025-07-29' },
          { type: 'payment', description: 'Paiement reçu - Chèque #123456', amount: 2000, date: '2025-07-29' },
        ]
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalyticsData();
  }, [timeRange]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-TN', {
      style: 'currency',
      currency: 'TND',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

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

  return (
    <div className="space-y-6">
      {/* Error/Mock Data Banner */}
      {error && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center">
            <RefreshCw className="h-5 w-5 text-yellow-600 mr-2" />
            <div>
              <p className="text-yellow-800 font-medium">Données de démonstration</p>
              <p className="text-yellow-700 text-sm">L'API de données analytiques rencontre des difficultés. Affichage des données d'exemple.</p>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analyses & Rapports</h1>
          <p className="text-muted-foreground">
            Vue d'ensemble des performances de votre entreprise
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Période" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3months">3 derniers mois</SelectItem>
              <SelectItem value="6months">6 derniers mois</SelectItem>
              <SelectItem value="12months">12 derniers mois</SelectItem>
              <SelectItem value="year">Année en cours</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={fetchAnalyticsData} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualiser
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Chiffre d'affaires</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(analyticsData.revenue.total)}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              {analyticsData.revenue.growth > 0 ? (
                <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-500 mr-1" />
              )}
              {formatPercentage(Math.abs(analyticsData.revenue.growth))} par rapport au mois dernier
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Patients Actifs</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData.patients.total}</div>
            <p className="text-xs text-muted-foreground">
              +{analyticsData.patients.newThisMonth} nouveaux ce mois
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Appareils Actifs</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData.devices.totalActive}</div>
            <p className="text-xs text-muted-foreground">
              {analyticsData.devices.totalRented} en location
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taux d'approbation CNAM</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPercentage(analyticsData.cnam.approvalRate)}</div>
            <p className="text-xs text-muted-foreground">
              {analyticsData.cnam.approvedBonds}/{analyticsData.cnam.totalBonds} bons approuvés
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Revenue Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Évolution du Chiffre d'Affaires</CardTitle>
            <CardDescription>Revenus mensuels par type d'activité</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={analyticsData.revenue.monthly}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip 
                  formatter={(value, name) => [formatCurrency(Number(value)), name]}
                />
                <Area 
                  type="monotone" 
                  dataKey="amount" 
                  stackId="1"
                  stroke="#8884d8" 
                  fill="#8884d8" 
                  name="Montant Total"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Payment Methods */}
        <Card>
          <CardHeader>
            <CardTitle>Répartition par Mode de Paiement</CardTitle>
            <CardDescription>Distribution des revenus</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={analyticsData.revenue.byPaymentMethod}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ method, percentage }) => `${method} ${percentage.toFixed(1)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="amount"
                >
                  {analyticsData.revenue.byPaymentMethod.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Device Utilization */}
        <Card>
          <CardHeader>
            <CardTitle>Utilisation des Appareils</CardTitle>
            <CardDescription>Répartition par statut</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={[
                { status: 'En Location', count: analyticsData.devices.utilization.rented },
                { status: 'Vendus', count: analyticsData.devices.utilization.sold },
                { status: 'Disponibles', count: analyticsData.devices.utilization.available },
              ]}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="status" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* CNAM Bonds by Type */}
        <Card>
          <CardHeader>
            <CardTitle>Bons CNAM par Type</CardTitle>
            <CardDescription>Distribution des bons approuvés</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analyticsData.cnam.byBondType}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="type" />
                <YAxis />
                <Tooltip formatter={(value, name) => name === 'amount' ? formatCurrency(Number(value)) : value} />
                <Bar dataKey="count" fill="#00C49F" name="Nombre" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Section */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Most Popular Devices */}
        <Card>
          <CardHeader>
            <CardTitle>Appareils les Plus Populaires</CardTitle>
            <CardDescription>Par nombre de transactions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analyticsData.devices.mostPopular.map((device, index) => (
                <div key={device.name} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Badge variant="outline">{index + 1}</Badge>
                    <div>
                      <p className="font-medium">{device.name}</p>
                      <p className="text-sm text-muted-foreground">{device.count} transactions</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{formatCurrency(device.revenue)}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Activité Récente</CardTitle>
            <CardDescription>Dernières transactions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analyticsData.recentActivity.map((activity, index) => (
                <div key={index} className="flex items-center space-x-3">
                  <div className="flex h-2 w-2 rounded-full bg-blue-600" />
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium">{activity.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(activity.date).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                  {activity.amount && (
                    <Badge variant="outline">
                      {formatCurrency(activity.amount)}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AnalyticsPage;