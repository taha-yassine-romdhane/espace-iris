import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    ArrowLeft,
    User,
    Phone,
    MapPin,
    Calendar,
    FileText,
    Activity,
    Stethoscope,
    Settings,
    Edit,
    AlertCircle,
    Clock,
    CheckCircle,
    XCircle,
    Plus,
    Eye
} from 'lucide-react';
import { cn } from "@/lib/utils";
import axios from 'axios';

interface PatientDetail {
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
    weight?: number;
    height?: number;
    imc?: number;
    createdAt: string;
    updatedAt: string;
    medicalDevices?: MedicalDevice[];
    diagnostics?: Diagnostic[];
    appointments?: Appointment[];
    rentals?: Rental[];
}

interface MedicalDevice {
    id: string;
    name: string;
    type: string;
    status: string;
    installationDate?: string;
    configuration?: string;
}

interface Diagnostic {
    id: string;
    diagnosticDate: string;
    status: string;
    notes?: string;
    medicalDevice: {
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

interface Appointment {
    id: string;
    scheduledDate: string;
    appointmentType: string;
    status: string;
    location: string;
    notes?: string;
}

interface Rental {
    id: string;
    startDate: string;
    endDate?: string;
    status: string;
    medicalDevice: {
        name: string;
        type: string;
    };
}

const PatientDetail: React.FC = () => {
    const { data: session, status } = useSession();
    const router = useRouter();
    const { id } = router.query;
    const [patient, setPatient] = useState<PatientDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState('overview');

    useEffect(() => {
        if (status === 'loading') return;
        
        if (!session?.user || session.user.role !== 'DOCTOR') {
            router.push('/auth/signin');
            return;
        }

        if (id) {
            fetchPatientDetail(id as string);
        }
    }, [session, status, router, id]);

    const fetchPatientDetail = async (patientId: string) => {
        try {
            setLoading(true);
            setError(null);
            
            const response = await axios.get(`/api/doctor/patients/${patientId}`);
            setPatient(response.data.patient);
        } catch (error) {
            console.error('Error fetching patient detail:', error);
            setError('Erreur lors du chargement du patient');
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

    const getStatusColor = (status: string) => {
        switch (status.toLowerCase()) {
            case 'active':
            case 'completed':
            case 'confirmed':
                return 'bg-green-100 text-green-800';
            case 'pending':
            case 'scheduled':
                return 'bg-yellow-100 text-yellow-800';
            case 'cancelled':
            case 'retired':
                return 'bg-red-100 text-red-800';
            case 'maintenance':
                return 'bg-blue-100 text-blue-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status.toLowerCase()) {
            case 'active':
            case 'completed':
            case 'confirmed':
                return <CheckCircle className="h-4 w-4" />;
            case 'pending':
            case 'scheduled':
                return <Clock className="h-4 w-4" />;
            case 'cancelled':
            case 'retired':
                return <XCircle className="h-4 w-4" />;
            case 'maintenance':
                return <Settings className="h-4 w-4" />;
            default:
                return <AlertCircle className="h-4 w-4" />;
        }
    };

    const formatDeviceType = (type: string): string => {
        switch (type) {
            case 'DIAGNOSTIC_DEVICE':
                return 'Appareil de Diagnostic';
            case 'RENTAL_DEVICE':
                return 'Appareil de Location';
            case 'SALE_DEVICE':
                return 'Appareil de Vente';
            case 'CPAP':
                return 'CPAP';
            case 'BIPAP':
                return 'BiPAP';
            case 'OXYGEN_CONCENTRATOR':
                return 'Concentrateur d\'Oxygène';
            case 'VENTILATOR':
                return 'Ventilateur';
            default:
                // Fallback: format the enum value (replace underscores with spaces and capitalize)
                return type.replace(/_/g, ' ').toLowerCase()
                    .split(' ')
                    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                    .join(' ');
        }
    };

    const getDeviceTypeColor = (type: string): string => {
        switch (type) {
            case 'DIAGNOSTIC_DEVICE':
                return 'bg-purple-100 text-purple-800 border-purple-200';
            case 'RENTAL_DEVICE':
                return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'SALE_DEVICE':
                return 'bg-green-100 text-green-800 border-green-200';
            case 'CPAP':
            case 'BIPAP':
                return 'bg-indigo-100 text-indigo-800 border-indigo-200';
            case 'OXYGEN_CONCENTRATOR':
                return 'bg-cyan-100 text-cyan-800 border-cyan-200';
            case 'VENTILATOR':
                return 'bg-teal-100 text-teal-800 border-teal-200';
            default:
                return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    const formatBeneficiaryType = (type: string): string => {
        switch (type) {
            case 'ASSURE_SOCIAL':
                return 'Assuré Social';
            case 'AYANT_DROIT':
                return 'Ayant Droit';
            case 'PENSIONNAIRE':
                return 'Pensionnaire';
            case 'SANS_COUVERTURE':
                return 'Sans Couverture';
            default:
                // Fallback: format the enum value
                return type.replace(/_/g, ' ').toLowerCase()
                    .split(' ')
                    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                    .join(' ');
        }
    };

    const getBeneficiaryTypeColor = (type: string): string => {
        switch (type) {
            case 'ASSURE_SOCIAL':
                return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'AYANT_DROIT':
                return 'bg-green-100 text-green-800 border-green-200';
            case 'PENSIONNAIRE':
                return 'bg-purple-100 text-purple-800 border-purple-200';
            case 'SANS_COUVERTURE':
                return 'bg-orange-100 text-orange-800 border-orange-200';
            default:
                return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    if (loading) {
        return (
            <div className="p-6 flex items-center justify-center min-h-screen">
                <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
                    <span className="text-red-700">Chargement du patient...</span>
                </div>
            </div>
        );
    }

    if (error || !patient) {
        return (
            <div className="p-6 flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">Patient non trouvé</h2>
                    <p className="text-gray-600 mb-4">{error || 'Ce patient n\'existe pas ou n\'est pas accessible.'}</p>
                    <Button onClick={() => router.back()} className="bg-red-600 hover:bg-red-700">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Retour
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
                {/* Header */}
                <div className="flex items-center">
                    <div className="flex items-center space-x-4">
                        <Button
                            onClick={() => router.back()}
                            variant="outline"
                            className="border-red-200 text-red-700 hover:bg-red-50"
                        >
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Retour
                        </Button>
                        <div>
                            <h1 className="text-2xl font-bold text-red-700 flex items-center">
                                <User className="h-6 w-6 mr-2" />
                                {patient.firstName} {patient.lastName}
                            </h1>
                            <p className="text-gray-600">
                                Dernière mise à jour: {formatDate(patient.updatedAt)}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Patient Overview Card */}
                <Card className="border-red-200">
                    <CardContent className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Basic Info */}
                            <div>
                                <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                                    <User className="h-4 w-4 mr-2" />
                                    Informations Personnelles
                                </h3>
                                <div className="space-y-2 text-sm">
                                    <div className="flex items-center">
                                        <Phone className="h-4 w-4 text-gray-400 mr-2" />
                                        <span>{patient.telephone}</span>
                                        {patient.telephoneTwo && <span className="ml-2 text-gray-500">/ {patient.telephoneTwo}</span>}
                                    </div>
                                    {patient.dateOfBirth && (
                                        <div className="flex items-center">
                                            <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                                            <span>{formatDate(patient.dateOfBirth)}</span>
                                        </div>
                                    )}
                                    {patient.cin && (
                                        <div className="flex items-center">
                                            <FileText className="h-4 w-4 text-gray-400 mr-2" />
                                            <span>CIN: {patient.cin}</span>
                                        </div>
                                    )}
                                    {patient.cnamId && (
                                        <div className="flex items-center">
                                            <FileText className="h-4 w-4 text-gray-400 mr-2" />
                                            <span>CNAM: {patient.cnamId}</span>
                                        </div>
                                    )}
                                </div>
                            </div>


                            {/* Medical Info */}
                            <div>
                                <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                                    <Activity className="h-4 w-4 mr-2" />
                                    Informations Médicales
                                </h3>
                                <div className="space-y-2 text-sm">
                                    {patient.weight && (
                                        <div>Poids: {patient.weight} kg</div>
                                    )}
                                    {patient.height && (
                                        <div>Taille: {patient.height} cm</div>
                                    )}
                                    {patient.imc && (
                                        <div>IMC: {patient.imc}</div>
                                    )}
                                    {patient.beneficiaryType && (
                                        <div className="flex items-center space-x-2">
                                            <span>Type:</span>
                                            <Badge
                                                variant="outline"
                                                className={cn("text-xs font-medium border", getBeneficiaryTypeColor(patient.beneficiaryType))}
                                            >
                                                {formatBeneficiaryType(patient.beneficiaryType)}
                                            </Badge>
                                        </div>
                                    )}
                                    {patient.affiliation && (
                                        <div>Caisse: {patient.affiliation}</div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Notes Section */}
                        {(patient.medicalHistory || patient.generalNote) && (
                            <div className="mt-6 pt-6 border-t border-red-100">
                                {patient.medicalHistory && (
                                    <div className="mb-4">
                                        <h4 className="font-medium text-gray-900 mb-2">Antécédents médicaux:</h4>
                                        <p className="text-sm text-gray-700 p-3 bg-red-50 rounded-lg">{patient.medicalHistory}</p>
                                    </div>
                                )}
                                {patient.generalNote && (
                                    <div>
                                        <h4 className="font-medium text-gray-900 mb-2">Note générale:</h4>
                                        <p className="text-sm text-gray-700 p-3 bg-red-50 rounded-lg">{patient.generalNote}</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Tabs */}
                <div className="border-b border-red-200">
                    <nav className="-mb-px flex space-x-8">
                        {[
                            { id: 'devices', label: 'Appareils Médicaux', icon: Activity },
                            { id: 'diagnostics', label: 'Diagnostics', icon: Stethoscope }
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={cn(
                                    "flex items-center py-2 px-1 border-b-2 font-medium text-sm",
                                    activeTab === tab.id
                                        ? "border-red-500 text-red-600"
                                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                                )}
                            >
                                <tab.icon className="h-4 w-4 mr-2" />
                                {tab.label}
                            </button>
                        ))}
                    </nav>
                </div>

                {/* Tab Content */}
                {activeTab === 'devices' && (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h2 className="text-lg font-semibold text-gray-900">Appareils Médicaux</h2>
                        </div>
                        {patient.medicalDevices && patient.medicalDevices.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {patient.medicalDevices.map((device) => (
                                    <Card key={device.id} className="border-red-200 hover:shadow-md transition-shadow">
                                        <CardContent className="p-4">
                                            <div className="flex items-start justify-between mb-3">
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="font-medium text-gray-900 truncate mb-2">{device.name}</h3>
                                                    <Badge
                                                        variant="outline"
                                                        className={cn("text-xs font-medium border", getDeviceTypeColor(device.type))}
                                                    >
                                                        <Activity className="h-3 w-3 mr-1" />
                                                        {formatDeviceType(device.type)}
                                                    </Badge>
                                                </div>
                                                <Badge className={getStatusColor(device.status)}>
                                                    {getStatusIcon(device.status)}
                                                    <span className="ml-1">{device.status}</span>
                                                </Badge>
                                            </div>
                                            {device.installationDate && (
                                                <p className="text-xs text-gray-500">
                                                    Installé le: {formatDate(device.installationDate)}
                                                </p>
                                            )}
                                            {device.configuration && (
                                                <div className="mt-2 p-2 bg-gray-50 rounded text-xs text-gray-700">
                                                    Configuration: {device.configuration}
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        ) : (
                            <Card className="border-red-200">
                                <CardContent className="p-8 text-center">
                                    <Activity className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                                    <p className="text-gray-600">Aucun appareil médical assigné</p>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                )}

                {activeTab === 'diagnostics' && (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h2 className="text-lg font-semibold text-gray-900">Diagnostics</h2>
                        </div>
                        {patient.diagnostics && patient.diagnostics.length > 0 ? (
                            <div className="space-y-4">
                                {patient.diagnostics.map((diagnostic) => (
                                    <Card key={diagnostic.id} className="border-red-200">
                                        <CardContent className="p-4">
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <h3 className="font-medium text-gray-900">
                                                            {diagnostic.medicalDevice.name}
                                                        </h3>
                                                        <Badge className={getStatusColor(diagnostic.status)}>
                                                            {getStatusIcon(diagnostic.status)}
                                                            <span className="ml-1">{diagnostic.status}</span>
                                                        </Badge>
                                                    </div>
                                                    <div className="flex items-center space-x-2 mb-2">
                                                        <span className="text-sm text-gray-600">Type:</span>
                                                        <Badge
                                                            variant="outline"
                                                            className={cn("text-xs font-medium border", getDeviceTypeColor(diagnostic.medicalDevice.type))}
                                                        >
                                                            <Stethoscope className="h-3 w-3 mr-1" />
                                                            {formatDeviceType(diagnostic.medicalDevice.type)}
                                                        </Badge>
                                                    </div>
                                                    <p className="text-xs text-gray-500">
                                                        Date: {formatDate(diagnostic.diagnosticDate)}
                                                    </p>
                                                    {diagnostic.notes && (
                                                        <p className="text-sm text-gray-700 mt-2 p-2 bg-red-50 rounded">
                                                            {diagnostic.notes}
                                                        </p>
                                                    )}
                                                    {diagnostic.result && (
                                                        <div className="mt-2 p-2 bg-green-50 rounded text-sm">
                                                            <div className="grid grid-cols-2 gap-2 text-xs">
                                                                {diagnostic.result.iah && <div>IAH: {diagnostic.result.iah}</div>}
                                                                {diagnostic.result.idValue && <div>ID: {diagnostic.result.idValue}</div>}
                                                            </div>
                                                            {diagnostic.result.remarque && (
                                                                <div className="mt-1 text-xs text-gray-600">
                                                                    {diagnostic.result.remarque}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        ) : (
                            <Card className="border-red-200">
                                <CardContent className="p-8 text-center">
                                    <Stethoscope className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                                    <p className="text-gray-600">Aucun diagnostic enregistré</p>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                )}

        </div>
    );
};

export default PatientDetail;