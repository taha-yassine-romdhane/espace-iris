import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Search, 
  Calendar,
  Filter,
  Activity,
  Package,
  ShoppingCart,
  Clipboard,
  Box,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  AlertCircle,
  CheckCircle,
  XCircle,
  Loader,
  CalendarRange,
  RefreshCw
} from 'lucide-react';
import EmployeeLayout from '../EmployeeLayout';

const HistoryPage = () => {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);

  useEffect(() => {
    if (session?.user?.id) {
      fetchHistory();
    }
  }, [session, page, filterType, searchTerm, startDate, endDate]);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20'
      });

      if (filterType) params.append('type', filterType);
      if (searchTerm) params.append('search', searchTerm);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const response = await fetch(`/api/employee-history?${params}`);
      if (response.ok) {
        const data = await response.json();
        setActivities(data.activities || []);
        setTotalPages(data.pagination?.totalPages || 1);
        setTotalCount(data.pagination?.totalCount || 0);
      }
    } catch (error) {
      console.error('Error fetching history:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchHistory();
  };

  const handleFilterChange = (type: string) => {
    setFilterType(type);
    setPage(1);
  };

  const handleDateFilter = () => {
    setPage(1);
    fetchHistory();
  };

  const clearFilters = () => {
    setFilterType('');
    setSearchTerm('');
    setStartDate('');
    setEndDate('');
    setPage(1);
  };

  const getActivityIcon = (icon: string) => {
    const iconMap = {
      'Activity': <Activity className="h-5 w-5" />,
      'Calendar': <Calendar className="h-5 w-5" />,
      'Clipboard': <Clipboard className="h-5 w-5" />,
      'Package': <Package className="h-5 w-5" />,
      'ShoppingCart': <ShoppingCart className="h-5 w-5" />,
      'Box': <Box className="h-5 w-5" />,
      'Clock': <Clock className="h-5 w-5" />
    };
    return iconMap[icon as keyof typeof iconMap] || <Activity className="h-5 w-5" />;
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'COMPLETED': { color: 'bg-green-100 text-green-800', icon: <CheckCircle className="h-3 w-3" /> },
      'PENDING': { color: 'bg-yellow-100 text-yellow-800', icon: <Clock className="h-3 w-3" /> },
      'IN_PROGRESS': { color: 'bg-blue-100 text-blue-800', icon: <Loader className="h-3 w-3" /> },
      'CANCELLED': { color: 'bg-red-100 text-red-800', icon: <XCircle className="h-3 w-3" /> },
      'ACTIVE': { color: 'bg-purple-100 text-purple-800', icon: <Activity className="h-3 w-3" /> },
      'SCHEDULED': { color: 'bg-indigo-100 text-indigo-800', icon: <Calendar className="h-3 w-3" /> }
    };
    const config = statusConfig[status as keyof typeof statusConfig] || { color: 'bg-gray-100 text-gray-800', icon: null };
    
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        {config.icon}
        {status}
      </span>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const priorityConfig = {
      'HIGH': { color: 'bg-red-100 text-red-800', label: 'Urgent' },
      'NORMAL': { color: 'bg-gray-100 text-gray-800', label: 'Normal' },
      'LOW': { color: 'bg-blue-100 text-blue-800', label: 'Faible' }
    };
    const config = priorityConfig[priority as keyof typeof priorityConfig] || { color: 'bg-gray-100 text-gray-800', label: priority };
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    );
  };

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Historique des Activités</h1>
          <p className="text-gray-600 mt-1">
            Consultez l'historique complet de vos activités
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
          >
            <Filter className="h-4 w-4" />
            Filtres
            {(filterType || searchTerm || startDate || endDate) && (
              <span className="bg-green-500 text-white text-xs rounded-full px-2 py-0.5">
                {[filterType, searchTerm, startDate, endDate].filter(Boolean).length}
              </span>
            )}
          </button>
          <button
            onClick={fetchHistory}
            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Actualiser
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <Card className="bg-white rounded-xl shadow-sm">
        <CardContent className="p-4">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Rechercher dans l'historique..."
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <button
              type="submit"
              className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
            >
              Rechercher
            </button>
          </form>
        </CardContent>
      </Card>

      {/* Filters */}
      {showFilters && (
        <Card className="bg-white rounded-xl shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Filtres avancés</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Type Filter */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Type d'activité</label>
              <div className="flex flex-wrap gap-2">
                {[
                  { value: '', label: 'Tout', icon: <Activity className="h-4 w-4" /> },
                  { value: 'diagnostic', label: 'Diagnostics', icon: <Activity className="h-4 w-4" /> },
                  { value: 'appointment', label: 'Rendez-vous', icon: <Calendar className="h-4 w-4" /> },
                  { value: 'task', label: 'Tâches', icon: <Clipboard className="h-4 w-4" /> },
                  { value: 'rental', label: 'Locations', icon: <Package className="h-4 w-4" /> },
                  { value: 'sale', label: 'Ventes', icon: <ShoppingCart className="h-4 w-4" /> },
                  { value: 'stock', label: 'Stock', icon: <Box className="h-4 w-4" /> }
                ].map(type => (
                  <button
                    key={type.value}
                    onClick={() => handleFilterChange(type.value)}
                    className={`px-3 py-2 rounded-lg border transition-colors flex items-center gap-2 ${
                      filterType === type.value
                        ? 'bg-green-500 text-white border-green-500'
                        : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {type.icon}
                    {type.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Date Range Filter */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Date de début</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Date de fin</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>

            {/* Filter Actions */}
            <div className="flex gap-2">
              <button
                onClick={handleDateFilter}
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
              >
                Appliquer les filtres
              </button>
              <button
                onClick={clearFilters}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Réinitialiser
              </button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results Summary */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">
          {totalCount} activité(s) trouvée(s)
        </p>
        <p className="text-sm text-gray-600">
          Page {page} sur {totalPages}
        </p>
      </div>

      {/* Activities List */}
      <Card className="bg-white rounded-xl shadow-sm">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
            </div>
          ) : activities.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {activities.map((activity: any, index) => (
                <div key={index} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start space-x-4">
                    <div className={`p-3 rounded-lg ${activity.color}`}>
                      {getActivityIcon(activity.icon)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="text-sm font-semibold text-gray-900">{activity.title}</h3>
                          <p className="text-sm text-gray-600 mt-1">{activity.subtitle}</p>
                          {activity.description && (
                            <p className="text-sm text-gray-500 mt-2">{activity.description}</p>
                          )}
                          
                          {/* Additional Details */}
                          <div className="flex flex-wrap gap-3 mt-3">
                            {activity.location && (
                              <span className="flex items-center gap-1 text-xs text-gray-500">
                                <MapPin className="h-3 w-3" />
                                {activity.location}
                              </span>
                            )}
                            {activity.device && (
                              <span className="flex items-center gap-1 text-xs text-gray-500">
                                <Activity className="h-3 w-3" />
                                {activity.device}
                              </span>
                            )}
                            {activity.totalAmount && (
                              <span className="text-xs font-medium text-green-600">
                                {activity.totalAmount}€
                              </span>
                            )}
                          </div>

                          {/* Status and Priority */}
                          <div className="flex gap-2 mt-3">
                            {activity.status && getStatusBadge(activity.status)}
                            {activity.priority && getPriorityBadge(activity.priority)}
                          </div>
                        </div>
                        
                        <div className="text-right ml-4">
                          <p className="text-xs text-gray-500">{activity.date}</p>
                          <p className="text-xs text-gray-400">{activity.time}</p>
                          <p className="text-xs font-medium text-green-600 mt-1">{activity.relativeTime}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Activity className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Aucune activité trouvée</p>
              <p className="text-sm text-gray-400 mt-2">
                Essayez de modifier vos filtres ou critères de recherche
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
              page === 1
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <ChevronLeft className="h-4 w-4" />
            Précédent
          </button>
          
          {/* Page Numbers */}
          <div className="flex gap-1">
            {[...Array(Math.min(5, totalPages))].map((_, i) => {
              let pageNum;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (page <= 3) {
                pageNum = i + 1;
              } else if (page >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = page - 2 + i;
              }
              
              return (
                <button
                  key={i}
                  onClick={() => setPage(pageNum)}
                  className={`px-3 py-2 rounded-lg ${
                    page === pageNum
                      ? 'bg-green-500 text-white'
                      : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>
          
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
              page === totalPages
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
          >
            Suivant
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
};

HistoryPage.getLayout = (page: React.ReactNode) => (
  <EmployeeLayout>{page}</EmployeeLayout>
);

export default HistoryPage;