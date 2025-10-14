import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    Stethoscope,
    User,
    Calendar,
    Search,
    Filter,
    Eye,
    CheckCircle,
    Clock,
    XCircle,
    AlertCircle,
    Activity
} from 'lucide-react';
import { cn } from "@/lib/utils";
import axios from 'axios';

interface Diagnostic {
    id: string;
    patientName: string;
    patientId: string;
    diagnosticDate: string;
    status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
    medicalDevice: {
        id: string;
        name: string;
        type: string;
    };
    result?: {
        iah?: number;
        idValue?: number;
        remarque?: string;
        status: string;
    };
}

const DoctorDiagnostics: React.FC = () => {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [diagnostics, setDiagnostics] = useState<Diagnostic[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [deviceTypeFilter, setDeviceTypeFilter] = useState('all');

    useEffect(() => {
        if (status === 'loading') return;
        
        if (!session?.user || session.user.role !== 'DOCTOR') {
            router.push('/auth/signin');
            return;
        }

        fetchDiagnostics();
    }, [session, status, router]);

    const fetchDiagnostics = async () => {
        try {
            setLoading(true);
            const response = await axios.get('/api/doctor/diagnostics');
            setDiagnostics(response.data.diagnostics);
        } catch (error) {
            console.error('Error fetching diagnostics:', error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'COMPLETED':
                return <CheckCircle className="h-4 w-4" />;
            case 'PENDING':
                return <Clock className="h-4 w-4" />;
            case 'IN_PROGRESS':
                return <Activity className="h-4 w-4" />;
            case 'CANCELLED':
                return <XCircle className="h-4 w-4" />;
            default:
                return <AlertCircle className="h-4 w-4" />;
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'COMPLETED':
                return 'bg-green-100 text-green-800';
            case 'PENDING':
                return 'bg-yellow-100 text-yellow-800';
            case 'IN_PROGRESS':
                return 'bg-blue-100 text-blue-800';
            case 'CANCELLED':
                return 'bg-red-100 text-red-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    const getDeviceTypeColor = (type: string) => {
        switch (type) {
            case 'CPAP':
                return 'bg-blue-100 text-blue-800';
            case 'VNI':
                return 'bg-green-100 text-green-800';
            case 'CONCENTRATEUR_OXYGENE':
                return 'bg-purple-100 text-purple-800';
            default:
                return 'bg-gray-100 text-gray-800';
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

    const filteredDiagnostics = diagnostics.filter(diagnostic => {
        const matchesSearch = 
            diagnostic.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            diagnostic.medicalDevice.name.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesStatus = statusFilter === 'all' || diagnostic.status === statusFilter;
        const matchesDeviceType = deviceTypeFilter === 'all' || diagnostic.medicalDevice.type === deviceTypeFilter;

        return matchesSearch && matchesStatus && matchesDeviceType;
    });

    if (loading) {
        return (
            <div className="p-6 flex items-center justify-center min-h-screen">
                <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
                    <span className="text-red-700">Chargement des diagnostics...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div>
                <div>
                    <h1 className="text-2xl font-bold text-red-700 flex items-center">
                        <Stethoscope className="h-6 w-6 mr-2" />
                        Diagnostics Médicaux
                    </h1>
                    <p className="text-gray-600 mt-1">
                        Consultez les résultats des diagnostics de vos patients
                    </p>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="border-red-200">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Total</p>
                                <p className="text-2xl font-bold text-red-700">{diagnostics.length}</p>
                            </div>
                            <Stethoscope className="h-8 w-8 text-red-600" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-red-200">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Terminés</p>
                                <p className="text-2xl font-bold text-green-700">
                                    {diagnostics.filter(d => d.status === 'COMPLETED').length}
                                </p>
                            </div>
                            <CheckCircle className="h-8 w-8 text-green-600" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-red-200">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">En cours</p>
                                <p className="text-2xl font-bold text-blue-700">
                                    {diagnostics.filter(d => d.status === 'IN_PROGRESS').length}
                                </p>
                            </div>
                            <Activity className="h-8 w-8 text-blue-600" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-red-200">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">En attente</p>
                                <p className="text-2xl font-bold text-yellow-700">
                                    {diagnostics.filter(d => d.status === 'PENDING').length}
                                </p>
                            </div>
                            <Clock className="h-8 w-8 text-yellow-600" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <Card className="border-red-200">
                <CardContent className="p-6">
                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                            <Input
                                placeholder="Rechercher par patient ou appareil..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10 border-red-200 focus:border-red-500"
                            />
                        </div>

                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="border border-red-200 rounded-md px-3 py-2 text-sm focus:border-red-500 focus:ring-red-500"
                        >
                            <option value="all">Tous les statuts</option>
                            <option value="PENDING">En attente</option>
                            <option value="IN_PROGRESS">En cours</option>
                            <option value="COMPLETED">Terminé</option>
                            <option value="CANCELLED">Annulé</option>
                        </select>

                        <select
                            value={deviceTypeFilter}
                            onChange={(e) => setDeviceTypeFilter(e.target.value)}
                            className="border border-red-200 rounded-md px-3 py-2 text-sm focus:border-red-500 focus:ring-red-500"
                        >
                            <option value="all">Tous les appareils</option>
                            <option value="CPAP">CPAP</option>
                            <option value="VNI">VNI</option>
                            <option value="CONCENTRATEUR_OXYGENE">Concentrateur O²</option>
                        </select>
                    </div>
                </CardContent>
            </Card>

            {/* Diagnostics List */}
            <div className="space-y-4">
                {filteredDiagnostics.length > 0 ? (
                    filteredDiagnostics.map((diagnostic) => (
                        <Card key={diagnostic.id} className="border-red-200">
                            <CardContent className="p-6">
                                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between mb-3">
                                            <div>
                                                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                                                    {diagnostic.patientName}
                                                </h3>
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Badge className={getDeviceTypeColor(diagnostic.medicalDevice.type)}>
                                                        {diagnostic.medicalDevice.type}
                                                    </Badge>
                                                    <span className="text-sm text-gray-600">
                                                        {diagnostic.medicalDevice.name}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className={cn(
                                                "px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1",
                                                getStatusColor(diagnostic.status)
                                            )}>
                                                {getStatusIcon(diagnostic.status)}
                                                {diagnostic.status === 'PENDING' ? 'En attente' :
                                                 diagnostic.status === 'IN_PROGRESS' ? 'En cours' :
                                                 diagnostic.status === 'COMPLETED' ? 'Terminé' : diagnostic.status}
                                            </div>
                                        </div>

                                        <div className="flex items-center text-sm text-gray-600 mb-3">
                                            <Calendar className="h-4 w-4 mr-1" />
                                            Date: {formatDate(diagnostic.diagnosticDate)}
                                        </div>

                                        {diagnostic.result && (
                                            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                                                <h4 className="font-medium text-green-800 mb-2">Résultats:</h4>
                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                                                    {diagnostic.result.iah !== undefined && (
                                                        <div>
                                                            <span className="text-gray-600">IAH:</span>
                                                            <span className="font-medium ml-1">{diagnostic.result.iah}</span>
                                                        </div>
                                                    )}
                                                    {diagnostic.result.idValue !== undefined && (
                                                        <div>
                                                            <span className="text-gray-600">ID:</span>
                                                            <span className="font-medium ml-1">{diagnostic.result.idValue}%</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex items-center space-x-2">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => router.push(`/roles/doctor/patients/${diagnostic.patientId}`)}
                                            className="border-red-200 text-red-700 hover:bg-red-50"
                                        >
                                            <User className="h-4 w-4 mr-1" />
                                            Patient
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                ) : (
                    <Card className="border-red-200">
                        <CardContent className="p-12 text-center">
                            <Stethoscope className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 mb-2">
                                Aucun diagnostic trouvé
                            </h3>
                            <p className="text-gray-600 mb-4">
                                {searchQuery || statusFilter !== 'all' || deviceTypeFilter !== 'all'
                                    ? 'Aucun diagnostic ne correspond à vos critères de recherche.'
                                    : 'Aucun diagnostic disponible pour vos patients.'
                                }
                            </p>
                        </CardContent>
                    </Card>
                )}
            </div>

            {filteredDiagnostics.length > 0 && (
                <div className="text-sm text-gray-600 text-center">
                    Affichage de {filteredDiagnostics.length} diagnostic(s) sur {diagnostics.length}
                </div>
            )}
        </div>
    );
};

export default DoctorDiagnostics;