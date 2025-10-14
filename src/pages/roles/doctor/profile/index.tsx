import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    User,
    Mail,
    Phone,
    Briefcase,
    MapPin,
    Calendar,
    Shield,
    AlertCircle
} from 'lucide-react';
import axios from 'axios';

interface DoctorProfile {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    telephone: string | null;
    speciality: string | null;
    address: string | null;
    role: string;
    createdAt: string;
    isActive: boolean;
}

const DoctorProfilePage: React.FC = () => {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [profile, setProfile] = useState<DoctorProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (status === 'loading') return;
        
        if (!session?.user || session.user.role !== 'DOCTOR') {
            router.push('/auth/signin');
            return;
        }

        fetchProfile();
    }, [session, status, router]);

    const fetchProfile = async () => {
        try {
            setLoading(true);
            setError(null);
            
            const response = await axios.get('/api/doctor/profile');
            setProfile(response.data);
        } catch (error) {
            console.error('Error fetching profile:', error);
            setError('Erreur lors du chargement du profil');
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: 'long',
            year: 'numeric'
        });
    };

    if (loading) {
        return (
      
                <div className="flex items-center justify-center min-h-[400px]">
                    <div className="flex items-center space-x-2">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
                        <span className="text-red-700">Chargement du profil...</span>
                    </div>
                </div>

        );
    }

    if (error) {
        return (
                <div className="flex items-center justify-center min-h-[400px]">
                    <div className="text-center">
                        <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
                        <h2 className="text-xl font-semibold text-gray-900 mb-2">Erreur de chargement</h2>
                        <p className="text-gray-600 mb-4">{error}</p>
                        <button 
                            onClick={fetchProfile}
                            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                        >
                            Réessayer
                        </button>
                    </div>
                </div>
     
        );
    }

    return (
        
            <div className="max-w-4xl mx-auto space-y-6">
                <div className="bg-gradient-to-r from-red-600 to-red-700 rounded-lg p-6 text-white">
                    <h1 className="text-2xl font-bold mb-2">Mon Profil</h1>
                    <p className="text-red-100">Informations personnelles et professionnelles</p>
                </div>

                <Card className="border-red-200">
                    <CardHeader>
                        <CardTitle className="text-red-700">Informations Personnelles</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex items-center space-x-3">
                                <User className="h-5 w-5 text-red-600" />
                                <div>
                                    <p className="text-sm text-gray-600">Nom complet</p>
                                    <p className="font-medium">
                                        Dr. {profile?.firstName} {profile?.lastName}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center space-x-3">
                                <Mail className="h-5 w-5 text-red-600" />
                                <div>
                                    <p className="text-sm text-gray-600">Email</p>
                                    <p className="font-medium">{profile?.email}</p>
                                </div>
                            </div>

                            <div className="flex items-center space-x-3">
                                <Phone className="h-5 w-5 text-red-600" />
                                <div>
                                    <p className="text-sm text-gray-600">Téléphone</p>
                                    <p className="font-medium">
                                        {profile?.telephone || 'Non renseigné'}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center space-x-3">
                                <MapPin className="h-5 w-5 text-red-600" />
                                <div>
                                    <p className="text-sm text-gray-600">Adresse</p>
                                    <p className="font-medium">
                                        {profile?.address || 'Non renseignée'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-red-200">
                    <CardHeader>
                        <CardTitle className="text-red-700">Informations Professionnelles</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex items-center space-x-3">
                                <Briefcase className="h-5 w-5 text-red-600" />
                                <div>
                                    <p className="text-sm text-gray-600">Spécialité</p>
                                    <p className="font-medium">
                                        {profile?.speciality || 'Médecine générale'}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center space-x-3">
                                <Shield className="h-5 w-5 text-red-600" />
                                <div>
                                    <p className="text-sm text-gray-600">Rôle</p>
                                    <p className="font-medium">Médecin</p>
                                </div>
                            </div>

                            <div className="flex items-center space-x-3">
                                <Calendar className="h-5 w-5 text-red-600" />
                                <div>
                                    <p className="text-sm text-gray-600">Membre depuis</p>
                                    <p className="font-medium">
                                        {profile?.createdAt ? formatDate(profile.createdAt) : 'N/A'}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center space-x-3">
                                <div className={`h-3 w-3 rounded-full ${profile?.isActive ? 'bg-green-500' : 'bg-red-500'}`} />
                                <div>
                                    <p className="text-sm text-gray-600">Statut</p>
                                    <p className="font-medium">
                                        {profile?.isActive ? 'Actif' : 'Inactif'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
    );
};

export default DoctorProfilePage;