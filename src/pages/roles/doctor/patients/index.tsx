import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Users,
    Search,
    Eye,
    Calendar,
    Phone,
    MapPin,
    Activity,
    AlertCircle,
    Filter,
    Download,
    Plus,
    Stethoscope,
    Clock
} from 'lucide-react';
import { cn } from "@/lib/utils";
import axios from 'axios';

interface Patient {
    id: string;
    firstName: string;
    lastName: string;
    telephone: string;
    telephoneTwo?: string;
    governorate?: string;
    delegation?: string;
    detailedAddress?: string;
    dateOfBirth?: string;
    cin?: string;
    cnamId?: string;
    beneficiaryType?: string;
    affiliation?: string;
    medicalHistory?: string;
    generalNote?: string;
    createdAt: string;
    updatedAt: string;
    medicalDevices?: MedicalDevice[];
    diagnostics?: Diagnostic[];
    appointments?: Appointment[];
}

interface MedicalDevice {
    id: string;
    name: string;
    type: string;
    status: string;
}

interface Diagnostic {
    id: string;
    diagnosticDate: string;
    status: string;
    notes?: string;
}

interface Appointment {
    id: string;
    scheduledDate: string;
    appointmentType: string;
    status: string;
}

const DoctorPatients: React.FC = () => {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [patients, setPatients] = useState<Patient[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedFilter, setSelectedFilter] = useState('all');

    useEffect(() => {
        if (status === 'loading') return;
        
        if (!session?.user || session.user.role !== 'DOCTOR') {
            router.push('/auth/signin');
            return;
        }

        fetchPatients();
    }, [session, status, router]);

    const fetchPatients = async () => {
        try {
            setLoading(true);
            setError(null);
            
            const response = await axios.get('/api/doctor/patients');
            setPatients(response.data.patients);
        } catch (error) {
            console.error('Error fetching patients:', error);
            setError('Erreur lors du chargement des patients');
        } finally {
            setLoading(false);
        }
    };

    const filteredPatients = patients.filter(patient => {
        const matchesSearch = 
            patient.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            patient.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            patient.telephone.includes(searchQuery) ||
            patient.cin?.includes(searchQuery) ||
            patient.cnamId?.includes(searchQuery);

        const matchesFilter = 
            selectedFilter === 'all' ||
            (selectedFilter === 'recent' && new Date(patient.updatedAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)) ||
            (selectedFilter === 'withDevices' && patient.medicalDevices && patient.medicalDevices.length > 0) ||
            (selectedFilter === 'pendingDiagnostics' && patient.diagnostics && patient.diagnostics.some(d => d.status === 'PENDING'));

        return matchesSearch && matchesFilter;
    });

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('fr-FR');
    };

    const getPatientStatusColor = (patient: Patient) => {
        const hasPendingDiagnostics = patient.diagnostics?.some(d => d.status === 'PENDING');
        const hasActiveDevices = patient.medicalDevices?.some(d => d.status === 'ACTIVE');
        
        if (hasPendingDiagnostics) return 'border-l-red-500';
        if (hasActiveDevices) return 'border-l-green-500';
        return 'border-l-blue-500';
    };

    const exportPatients = async () => {
        try {
            const response = await axios.get('/api/doctor/patients/export', {
                responseType: 'blob'
            });
            
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.download = `mes_patients_${new Date().toISOString().split('T')[0]}.xlsx`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error exporting patients:', error);
        }
    };

    if (loading) {
        return (
            <div className="p-6 flex items-center justify-center min-h-screen">
                <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
                    <span className="text-red-700">Chargement des patients...</span>
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
                        onClick={fetchPatients}
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
                {/* Header */}
                <div>
                    <div>
                        <h1 className="text-2xl font-bold text-red-700 flex items-center">
                            <Users className="h-6 w-6 mr-2" />
                            Mes Patients
                        </h1>
                        <p className="text-gray-600 mt-1">
                            Gérez et suivez vos patients
                        </p>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <Card className="border-red-200">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600">Total Patients</p>
                                    <p className="text-2xl font-bold text-red-700">{patients.length}</p>
                                </div>
                                <Users className="h-8 w-8 text-red-600" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-red-200">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600">Avec Appareils</p>
                                    <p className="text-2xl font-bold text-red-700">
                                        {patients.filter(p => p.medicalDevices && p.medicalDevices.length > 0).length}
                                    </p>
                                </div>
                                <Activity className="h-8 w-8 text-red-600" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-red-200">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600">Diagnostics Pending</p>
                                    <p className="text-2xl font-bold text-red-700">
                                        {patients.filter(p => p.diagnostics?.some(d => d.status === 'PENDING')).length}
                                    </p>
                                </div>
                                <Stethoscope className="h-8 w-8 text-red-600" />
                            </div>
                        </CardContent>
                    </Card>

                </div>

                {/* Filters and Search */}
                <Card className="border-red-200">
                    <CardContent className="p-6">
                        <div className="flex flex-col sm:flex-row gap-4">
                            {/* Search */}
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                <Input
                                    placeholder="Rechercher par nom, téléphone, CIN, CNAM..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-10 border-red-200 focus:border-red-500 focus:ring-red-500"
                                />
                            </div>

                            {/* Filters */}
                            <div className="flex items-center space-x-2">
                                <Filter className="h-4 w-4 text-gray-400" />
                                <select
                                    value={selectedFilter}
                                    onChange={(e) => setSelectedFilter(e.target.value)}
                                    className="border border-red-200 rounded-md px-3 py-2 text-sm focus:border-red-500 focus:ring-red-500"
                                >
                                    <option value="all">Tous les patients</option>
                                    <option value="recent">Récemment mis à jour</option>
                                    <option value="withDevices">Avec appareils</option>
                                    <option value="pendingDiagnostics">Diagnostics en attente</option>
                                </select>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Patients List */}
                <div className="grid grid-cols-1 gap-4">
                    {filteredPatients.length > 0 ? (
                        filteredPatients.map((patient) => (
                            <Card 
                                key={patient.id} 
                                className={cn(
                                    "border-l-4 hover:shadow-md transition-all duration-200 cursor-pointer",
                                    getPatientStatusColor(patient)
                                )}
                                onClick={() => router.push(`/roles/doctor/patients/${patient.id}`)}
                            >
                                <CardContent className="p-6">
                                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                                        {/* Patient Info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between">
                                                <div>
                                                    <h3 className="text-lg font-semibold text-gray-900">
                                                        {patient.firstName} {patient.lastName}
                                                    </h3>
                                                    <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-gray-600">
                                                        <span className="flex items-center">
                                                            <Phone className="h-4 w-4 mr-1" />
                                                            {patient.telephone}
                                                        </span>
                                                        {patient.governorate && (
                                                            <span className="flex items-center">
                                                                <MapPin className="h-4 w-4 mr-1" />
                                                                {patient.governorate}
                                                            </span>
                                                        )}
                                                        {patient.dateOfBirth && (
                                                            <span className="flex items-center">
                                                                <Calendar className="h-4 w-4 mr-1" />
                                                                {formatDate(patient.dateOfBirth)}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Patient Status Indicators */}
                                            <div className="flex flex-wrap gap-2 mt-3">
                                                {patient.medicalDevices && patient.medicalDevices.length > 0 && (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                        <Activity className="h-3 w-3 mr-1" />
                                                        {patient.medicalDevices.length} appareil(s)
                                                    </span>
                                                )}
                                                {patient.diagnostics?.some(d => d.status === 'PENDING') && (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                                        <Clock className="h-3 w-3 mr-1" />
                                                        Diagnostic en attente
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex items-center space-x-2">
                                            <Button
                                                size="sm"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    router.push(`/roles/doctor/patients/${patient.id}`);
                                                }}
                                                className="bg-red-600 text-white hover:bg-red-700"
                                            >
                                                <Eye className="h-4 w-4 mr-1" />
                                                Voir
                                            </Button>
                                        </div>
                                    </div>

                                </CardContent>
                            </Card>
                        ))
                    ) : (
                        <Card className="border-red-200">
                            <CardContent className="p-12 text-center">
                                <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                                <h3 className="text-lg font-medium text-gray-900 mb-2">
                                    {searchQuery || selectedFilter !== 'all' ? 'Aucun patient trouvé' : 'Aucun patient assigné'}
                                </h3>
                                <p className="text-gray-600">
                                    {searchQuery || selectedFilter !== 'all' 
                                        ? 'Essayez de modifier vos critères de recherche.'
                                        : 'Vous n\'avez pas encore de patients assignés.'
                                    }
                                </p>
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* Results Count */}
                {filteredPatients.length > 0 && (
                    <div className="text-sm text-gray-600 text-center">
                        Affichage de {filteredPatients.length} patient(s) sur {patients.length}
                    </div>
                )}
        </div>
    );
};

export default DoctorPatients;