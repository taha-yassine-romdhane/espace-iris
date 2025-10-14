import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Users,
    Calendar,
    Stethoscope,
    Activity,
    TrendingUp,
    Clock,
    AlertCircle,
    MessageCircle,
    FileText,
    Plus
} from 'lucide-react';
import { cn } from "@/lib/utils";
import axios from 'axios';

interface DashboardStats {
    totalPatients: number;
    appointmentsToday: number;
    pendingDiagnostics: number;
    activeDevices: number;
    recentActivity: ActivityItem[];
    upcomingAppointments: AppointmentItem[];
    pendingFollowUps: FollowUpItem[];
}

interface ActivityItem {
    id: string;
    type: 'diagnostic' | 'appointment' | 'follow_up' | 'device_assignment';
    patientName: string;
    description: string;
    createdAt: string;
}

interface AppointmentItem {
    id: string;
    patientName: string;
    appointmentType: string;
    scheduledDate: string;
    location: string;
    status: string;
}

interface FollowUpItem {
    id: string;
    patientName: string;
    reason: string;
    dueDate: string;
    priority: 'low' | 'medium' | 'high';
}

const DoctorDashboard: React.FC = () => {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (status === 'loading') return;
        
        if (!session?.user || session.user.role !== 'DOCTOR') {
            router.push('/auth/signin');
            return;
        }

        fetchDashboardData();
    }, [session, status, router]);

    const fetchDashboardData = async () => {
        try {
            setLoading(true);
            setError(null);
            
            const response = await axios.get('/api/doctor/dashboard-stats');
            setStats(response.data);
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
            setError('Erreur lors du chargement des données');
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getActivityIcon = (type: string) => {
        switch (type) {
            case 'diagnostic':
                return <Stethoscope className="h-4 w-4" />;
            case 'appointment':
                return <Calendar className="h-4 w-4" />;
            case 'follow_up':
                return <Clock className="h-4 w-4" />;
            case 'device_assignment':
                return <Activity className="h-4 w-4" />;
            default:
                return <FileText className="h-4 w-4" />;
        }
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'high':
                return 'text-red-600 bg-red-100';
            case 'medium':
                return 'text-yellow-600 bg-yellow-100';
            case 'low':
                return 'text-green-600 bg-green-100';
            default:
                return 'text-gray-600 bg-gray-100';
        }
    };

    if (loading) {
        return (
            <div className="p-6 flex items-center justify-center min-h-screen">
                <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
                    <span className="text-red-700">Chargement...</span>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6 flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">Erreur de chargement</h2>
                    <p className="text-gray-600 mb-4">{error}</p>
                    <button 
                        onClick={fetchDashboardData}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                        Réessayer
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* Welcome Section */}
            <div className="bg-gradient-to-r from-red-600 to-red-700 rounded-lg p-6 text-white">
                <h1 className="text-2xl font-bold mb-2">
                    Bonjour, Dr. {session?.user?.name}
                </h1>
                <p className="text-red-100">
                    Bienvenue sur votre espace médecin. Voici un aperçu de votre activité.
                </p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <Card className="border-red-200 hover:shadow-md transition-shadow">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-gray-600">
                                Mes Patients
                            </CardTitle>
                            <Users className="h-4 w-4 text-red-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-red-700">{stats?.totalPatients || 0}</div>
                            <p className="text-xs text-gray-600">
                                Patients suivis
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="border-red-200 hover:shadow-md transition-shadow">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-gray-600">
                                Diagnostics en Attente
                            </CardTitle>
                            <Stethoscope className="h-4 w-4 text-red-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-red-700">{stats?.pendingDiagnostics || 0}</div>
                            <p className="text-xs text-gray-600">
                                À compléter
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="border-red-200 hover:shadow-md transition-shadow">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-gray-600">
                                Appareils Actifs
                            </CardTitle>
                            <Activity className="h-4 w-4 text-red-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-red-700">{stats?.activeDevices || 0}</div>
                            <p className="text-xs text-gray-600">
                                Appareils assignés
                            </p>
                        </CardContent>
                    </Card>
                </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 gap-6">
                    {/* Recent Activity */}
                    <Card className="border-red-200">
                        <CardHeader>
                            <CardTitle className="flex items-center text-red-700">
                                <TrendingUp className="h-5 w-5 mr-2" />
                                Activité Récente
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {stats?.recentActivity && stats.recentActivity.length > 0 ? (
                                    stats.recentActivity.map((activity, index) => (
                                        <div key={activity.id || index} className="flex items-start space-x-3 p-3 bg-red-50 rounded-lg">
                                            <div className="flex-shrink-0 mt-1">
                                                <div className="p-1 bg-red-100 rounded-full text-red-600">
                                                    {getActivityIcon(activity.type)}
                                                </div>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-gray-900">{activity.patientName}</p>
                                                <p className="text-sm text-gray-600">{activity.description}</p>
                                                <p className="text-xs text-gray-500 mt-1">{formatDate(activity.createdAt)}</p>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-6 text-gray-500">
                                        <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                        <p className="text-sm">Aucune activité récente</p>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                </div>

                {/* Pending Follow-ups */}
                <Card className="border-red-200">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="flex items-center text-red-700">
                            <Clock className="h-5 w-5 mr-2" />
                            Suivis en Attente
                        </CardTitle>
                        <button 
                            onClick={() => router.push('/roles/doctor/patients')}
                            className="text-sm text-red-600 hover:text-red-700"
                        >
                            Voir tous les patients
                        </button>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {stats?.pendingFollowUps && stats.pendingFollowUps.length > 0 ? (
                                stats.pendingFollowUps.map((followUp, index) => (
                                    <div key={followUp.id || index} className="p-4 border border-red-200 rounded-lg hover:bg-red-50 transition-colors">
                                        <div className="flex justify-between items-start mb-2">
                                            <h4 className="font-medium text-gray-900">{followUp.patientName}</h4>
                                            <span className={cn(
                                                "px-2 py-1 rounded-full text-xs font-medium",
                                                getPriorityColor(followUp.priority)
                                            )}>
                                                {followUp.priority === 'high' ? 'Urgent' : 
                                                 followUp.priority === 'medium' ? 'Moyen' : 'Faible'}
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-600 mb-2">{followUp.reason}</p>
                                        <p className="text-xs text-red-600">
                                            Échéance: {formatDate(followUp.dueDate)}
                                        </p>
                                    </div>
                                ))
                            ) : (
                                <div className="col-span-full text-center py-6 text-gray-500">
                                    <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                    <p className="text-sm">Aucun suivi en attente</p>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Quick Actions */}
                <Card className="border-red-200">
                    <CardHeader>
                        <CardTitle className="flex items-center text-red-700">
                            <Plus className="h-5 w-5 mr-2" />
                            Actions Rapides
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            <button 
                                onClick={() => router.push('/roles/doctor/patients')}
                                className="p-4 border border-red-200 rounded-lg hover:bg-red-50 transition-colors text-center"
                            >
                                <Users className="h-6 w-6 text-red-600 mx-auto mb-2" />
                                <span className="text-sm font-medium text-gray-900">Voir Patients</span>
                            </button>
                            
                            <button 
                                onClick={() => router.push('/roles/doctor/diagnostics')}
                                className="p-4 border border-red-200 rounded-lg hover:bg-red-50 transition-colors text-center"
                            >
                                <Stethoscope className="h-6 w-6 text-red-600 mx-auto mb-2" />
                                <span className="text-sm font-medium text-gray-900">Diagnostics</span>
                            </button>
                            
                            <button 
                                onClick={() => router.push('/roles/doctor/chat')}
                                className="p-4 border border-red-200 rounded-lg hover:bg-red-50 transition-colors text-center"
                            >
                                <MessageCircle className="h-6 w-6 text-red-600 mx-auto mb-2" />
                                <span className="text-sm font-medium text-gray-900">Messages</span>
                            </button>
                        </div>
                    </CardContent>
                </Card>
            </div>
    );
};

export default DoctorDashboard;