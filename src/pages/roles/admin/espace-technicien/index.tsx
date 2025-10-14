import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/components/ui/use-toast';
import { 
  Users, 
  Activity, 
  TrendingUp, 
  Clock, 
  Calendar,
  Search,
  Filter,
  Download,
  BarChart3,
  UserCheck,
  Stethoscope,
  ShoppingCart,
  Package,
  Calendar as CalendarIcon,
  Eye,
  Plus,
  Edit,
  Trash,
  CreditCard,
  Settings,
  ListCheck,
  CheckSquare
} from 'lucide-react';
import AdminLayout from '../AdminLayout';

type Employee = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: Date;
  _count: {
    assignedPatients: number;
    technicianPatients: number;
    performedDiagnostics: number;
    processedSales: number;
    assignedAppointments: number;
    userActions: number;
  };
};

type EmployeeAction = {
  id: string;
  actionType: string;
  details: any;
  performedAt: Date;
  user: {
    firstName: string;
    lastName: string;
  };
  relatedItemType?: string;
  relatedItemId?: string;
};

type ActivityStats = {
  totalEmployees: number;
  activeEmployees: number;
  totalActions: number;
  todayActions: number;
  thisWeekActions: number;
  thisMonthActions: number;
};

export default function EmployeeMonitoringPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [recentActions, setRecentActions] = useState<EmployeeAction[]>([]);
  const [activityStats, setActivityStats] = useState<ActivityStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedEmployee, setSelectedEmployee] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('week');
  const [actionTypeFilter, setActionTypeFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchEmployeeData();
    fetchRecentActions();
    fetchActivityStats();
  }, [selectedEmployee, dateFilter, actionTypeFilter]);

  const fetchEmployeeData = async () => {
    try {
      const response = await fetch('/api/users/employees-stats');
      if (!response.ok) throw new Error('Failed to fetch employees');
      const data = await response.json();
      setEmployees(data);
    } catch (error) {
      console.error('Error fetching employees:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les données des employés',
        variant: 'destructive',
      });
    }
  };

  const fetchRecentActions = async () => {
    try {
      const params = new URLSearchParams({
        employeeId: selectedEmployee,
        dateFilter,
        actionType: actionTypeFilter,
        limit: '50'
      });
      
      const response = await fetch(`/api/employee-actions?${params}`);
      if (!response.ok) throw new Error('Failed to fetch actions');
      const data = await response.json();
      setRecentActions(data);
    } catch (error) {
      console.error('Error fetching actions:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger l\'historique des actions',
        variant: 'destructive',
      });
    }
  };

  const fetchActivityStats = async () => {
    try {
      const response = await fetch('/api/employee-stats');
      if (!response.ok) throw new Error('Failed to fetch stats');
      const data = await response.json();
      setActivityStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case 'CREATE':
        return <Plus className="h-4 w-4 text-green-600" />;
      case 'UPDATE':
        return <Edit className="h-4 w-4 text-blue-600" />;
      case 'DELETE':
        return <Trash className="h-4 w-4 text-red-600" />;
      case 'DIAGNOSTIC':
        return <Stethoscope className="h-4 w-4 text-blue-600" />;
      case 'APPOINTMENT':
        return <CalendarIcon className="h-4 w-4 text-purple-600" />;
      case 'RENTAL':
        return <Package className="h-4 w-4 text-orange-600" />;
      case 'PAYMENT':
        return <CreditCard className="h-4 w-4 text-green-600" />;
      case 'MAINTENANCE':
        return <Settings className="h-4 w-4 text-yellow-600" />;
      case 'TASK_CREATION':
        return <ListCheck className="h-4 w-4 text-indigo-600" />;
      case 'TASK_UPDATE':
        return <CheckSquare className="h-4 w-4 text-indigo-600" />;
      default:
        return <Activity className="h-4 w-4 text-gray-600" />;
    }
  };

  const getActionTypeLabel = (actionType: string) => {
    const labels: Record<string, string> = {
      'CREATE': 'Création',
      'UPDATE': 'Modification',
      'DELETE': 'Suppression',
      'DIAGNOSTIC': 'Diagnostic',
      'RENTAL': 'Location',
      'APPOINTMENT': 'Rendez-vous',
      'PAYMENT': 'Paiement',
      'MAINTENANCE': 'Maintenance',
      'TASK_CREATION': 'Création de tâche',
      'TASK_UPDATE': 'Mise à jour de tâche'
    };
    return labels[actionType] || actionType;
  };

  const filteredEmployees = employees.filter(employee => 
    employee.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const exportData = async () => {
    try {
      const params = new URLSearchParams({
        employeeId: selectedEmployee,
        dateFilter,
        actionType: actionTypeFilter,
        format: 'csv'
      });
      
      const response = await fetch(`/api/employee-actions/export?${params}`);
      if (!response.ok) throw new Error('Failed to export data');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `employee-activity-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: 'Succès',
        description: 'Données exportées avec succès',
      });
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Échec de l\'exportation des données',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white">
        <div className="container mx-auto p-6 space-y-6">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-blue-900 flex items-center gap-3">
              <Users className="h-8 w-8 text-blue-600" />
              Espace Technicien - Monitoring Équipe Opérationnelle
            </h1>
            <p className="text-gray-600 mt-2">Surveillez l'activité et les performances de vos employés et managers en temps réel (excluant les médecins qui n'ont qu'un accès consultation)</p>
          </div>
          <Button onClick={exportData} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700">
            <Download className="h-4 w-4" />
            Exporter les données
          </Button>
        </div>

        {/* Activity Statistics */}
        {activityStats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-blue-800">Équipe Opérationnelle</CardTitle>
                <Users className="h-5 w-5 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-900">{activityStats.totalEmployees}</div>
                <p className="text-xs text-blue-600">
                  {activityStats.activeEmployees} actifs
                </p>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-r from-green-50 to-green-100 border-green-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-green-800">Actions Aujourd'hui</CardTitle>
                <Clock className="h-5 w-5 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-900">{activityStats.todayActions}</div>
                <p className="text-xs text-green-600">
                  +{activityStats.thisWeekActions} cette semaine
                </p>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-r from-purple-50 to-purple-100 border-purple-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-purple-800">Actions du Mois</CardTitle>
                <Calendar className="h-5 w-5 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-900">{activityStats.thisMonthActions}</div>
                <p className="text-xs text-purple-600">
                  Total: {activityStats.totalActions}
                </p>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-r from-orange-50 to-orange-100 border-orange-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-orange-800">Activité Moyenne</CardTitle>
                <BarChart3 className="h-5 w-5 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-900">
                  {Math.round(activityStats.totalActions / activityStats.totalEmployees)}
                </div>
                <p className="text-xs text-orange-600">actions par employé</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters */}
        <Card className="border-blue-200">
          <CardHeader className="bg-blue-50">
            <CardTitle className="flex items-center gap-2 text-blue-900">
              <Filter className="h-5 w-5" />
              Filtres et Recherche
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="search" className="text-blue-900">Rechercher un employé</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="search"
                    placeholder="Nom, email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 border-blue-200 focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="employee" className="text-blue-900">Employé</Label>
                <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                  <SelectTrigger className="border-blue-200 focus:border-blue-500 focus:ring-blue-500">
                    <SelectValue placeholder="Tous les employés" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les employés</SelectItem>
                    {employees.map((employee) => (
                      <SelectItem key={employee.id} value={employee.id}>
                        {employee.firstName} {employee.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="dateFilter" className="text-blue-900">Période</Label>
                <Select value={dateFilter} onValueChange={setDateFilter}>
                  <SelectTrigger className="border-blue-200 focus:border-blue-500 focus:ring-blue-500">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="today">Aujourd'hui</SelectItem>
                    <SelectItem value="week">Cette semaine</SelectItem>
                    <SelectItem value="month">Ce mois</SelectItem>
                    <SelectItem value="quarter">Ce trimestre</SelectItem>
                    <SelectItem value="year">Cette année</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="actionType" className="text-blue-900">Type d'action</Label>
                <Select value={actionTypeFilter} onValueChange={setActionTypeFilter}>
                  <SelectTrigger className="border-blue-200 focus:border-blue-500 focus:ring-blue-500">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes les actions</SelectItem>
                    <SelectItem value="CREATE">Créations</SelectItem>
                    <SelectItem value="UPDATE">Modifications</SelectItem>
                    <SelectItem value="DELETE">Suppressions</SelectItem>
                    <SelectItem value="DIAGNOSTIC">Diagnostics</SelectItem>
                    <SelectItem value="APPOINTMENT">Rendez-vous</SelectItem>
                    <SelectItem value="RENTAL">Locations</SelectItem>
                    <SelectItem value="PAYMENT">Paiements</SelectItem>
                    <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
                    <SelectItem value="TASK_CREATION">Créations de tâches</SelectItem>
                    <SelectItem value="TASK_UPDATE">Mises à jour de tâches</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Employee Overview */}
          <div className="lg:col-span-1">
            <Card className="border-blue-200">
              <CardHeader className="bg-blue-50">
                <CardTitle className="flex items-center gap-2 text-blue-900">
                  <UserCheck className="h-5 w-5" />
                  Vue d'ensemble des Employés
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {filteredEmployees.map((employee) => (
                    <div
                      key={employee.id}
                      className={`p-4 rounded-lg border cursor-pointer transition-all duration-200 hover:shadow-md ${
                        selectedEmployee === employee.id 
                          ? 'border-blue-500 bg-blue-50 shadow-md' 
                          : 'border-gray-200 hover:border-blue-300'
                      }`}
                      onClick={() => setSelectedEmployee(employee.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-blue-900">
                            {employee.firstName} {employee.lastName}
                          </div>
                          <div className="text-sm text-blue-600">{employee.role}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${
                            employee.isActive ? 'bg-green-500' : 'bg-gray-400'
                          }`} />
                          <Eye className="h-4 w-4 text-blue-600" />
                        </div>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                        <div className="bg-white px-2 py-1 rounded border border-blue-100">
                          <span className="font-medium text-blue-700">Patients:</span> 
                          <span className="ml-1 font-bold text-blue-900">
                            {(employee._count.assignedPatients || 0) + (employee._count.technicianPatients || 0)}
                          </span>
                        </div>
                        <div className="bg-white px-2 py-1 rounded border border-purple-100">
                          <span className="font-medium text-purple-700">Diagnostics:</span> 
                          <span className="ml-1 font-bold text-purple-900">
                            {employee._count.performedDiagnostics || 0}
                          </span>
                        </div>
                        <div className="bg-white px-2 py-1 rounded border border-green-100">
                          <span className="font-medium text-green-700">Ventes:</span> 
                          <span className="ml-1 font-bold text-green-900">
                            {employee._count.processedSales || 0}
                          </span>
                        </div>
                        <div className="bg-white px-2 py-1 rounded border border-orange-100">
                          <span className="font-medium text-orange-700">RDV:</span> 
                          <span className="ml-1 font-bold text-orange-900">
                            {employee._count.assignedAppointments || 0}
                          </span>
                        </div>
                        <div className="bg-white px-2 py-1 rounded border border-gray-100 col-span-2">
                          <span className="font-medium text-gray-700">Actions totales:</span> 
                          <span className="ml-1 font-bold text-gray-900">
                            {employee._count.userActions || 0}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <div className="lg:col-span-2">
            <Card className="border-blue-200">
              <CardHeader className="bg-blue-50">
                <CardTitle className="flex items-center gap-2 text-blue-900">
                  <Activity className="h-5 w-5" />
                  Activité Récente - Historique Détaillé
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                {recentActions.length === 0 ? (
                  <div className="text-center py-12">
                    <Activity className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                    <h3 className="text-xl font-medium text-gray-900 mb-2">Aucune activité</h3>
                    <p className="text-gray-600">Aucune activité trouvée pour les filtres sélectionnés.</p>
                  </div>
                ) : (
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {recentActions.map((action) => (
                      <div key={action.id} className="flex items-start space-x-4 p-4 rounded-lg border border-blue-100 bg-white hover:bg-blue-50 transition-colors">
                        <div className="flex-shrink-0 p-2 rounded-full bg-blue-100">
                          {getActionIcon(action.actionType)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <div className="font-semibold text-blue-900">
                              {action.user.firstName} {action.user.lastName}
                              <span className="ml-2 text-xs font-normal bg-gray-100 text-gray-600 px-2 py-1 rounded">
                                {(action.user as any).role || 'EMPLOYEE'}
                              </span>
                            </div>
                            <div className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">
                              {new Date(action.performedAt).toLocaleString('fr-FR')}
                            </div>
                          </div>
                          <div className="text-sm text-blue-700 font-medium mt-1">
                            {getActionTypeLabel(action.actionType)}
                            {action.relatedItemType && (
                              <span className="text-blue-500 font-normal ml-1">
                                sur {action.relatedItemType}
                              </span>
                            )}
                            {action.relatedItemId && (
                              <span className="text-xs text-gray-500 ml-2">
                                (ID: {action.relatedItemId.slice(0, 8)}...)
                              </span>
                            )}
                          </div>
                          {action.details && typeof action.details === 'object' && (
                            <div className="text-xs text-gray-600 mt-2 p-3 bg-gray-50 rounded border-l-4 border-blue-200">
                              <div className="font-medium text-gray-700 mb-1">Détails:</div>
                              {typeof action.details === 'object' && action.details !== null ? (
                                <div className="space-y-1">
                                  {Object.entries(action.details).slice(0, 3).map(([key, value]) => (
                                    <div key={key} className="flex justify-between">
                                      <span className="font-medium capitalize">{key}:</span>
                                      <span className="truncate ml-2 max-w-32" title={String(value)}>
                                        {String(value)}
                                      </span>
                                    </div>
                                  ))}
                                  {Object.keys(action.details).length > 3 && (
                                    <div className="text-gray-400 italic">
                                      ... et {Object.keys(action.details).length - 3} autres
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span>{String(action.details).substring(0, 100)}...</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

// Add layout wrapper
EmployeeMonitoringPage.getLayout = function getLayout(page: React.ReactElement) {
  return <AdminLayout>{page}</AdminLayout>;
};