import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/use-toast';
import {
    User,
    Mail,
    Phone,
    Briefcase,
    MapPin,
    Calendar,
    Shield,
    AlertCircle,
    Edit,
    Save,
    X,
    Lock
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
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [editedProfile, setEditedProfile] = useState<Partial<DoctorProfile>>({});

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
            setEditedProfile(response.data);
        } catch (error) {
            console.error('Error fetching profile:', error);
            setError('Erreur lors du chargement du profil');
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = () => {
        setIsEditing(true);
        setEditedProfile({ ...profile! });
    };

    const handleCancel = () => {
        setIsEditing(false);
        setEditedProfile({ ...profile! });
    };

    const handleSave = async () => {
        try {
            setIsSaving(true);

            const response = await axios.put('/api/doctor/profile', {
                firstName: editedProfile.firstName,
                lastName: editedProfile.lastName,
                telephone: editedProfile.telephone,
                speciality: editedProfile.speciality,
                address: editedProfile.address
            });

            setProfile(response.data);
            setEditedProfile(response.data);
            setIsEditing(false);

            toast({
                title: "Profil mis à jour",
                description: "Vos informations ont été mises à jour avec succès",
            });
        } catch (error) {
            console.error('Error updating profile:', error);
            toast({
                title: "Erreur",
                description: "Impossible de mettre à jour le profil",
                variant: "destructive",
            });
        } finally {
            setIsSaving(false);
        }
    };

    const handleInputChange = (field: keyof DoctorProfile, value: string) => {
        setEditedProfile(prev => ({
            ...prev,
            [field]: value
        }));
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
        
            <div className="max-w-4xl mx-auto space-y-6 p-6">
                <div className="bg-gradient-to-r from-red-600 to-red-700 rounded-lg p-6 text-white">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold mb-2">Mon Profil</h1>
                            <p className="text-red-100">Informations personnelles et professionnelles</p>
                        </div>
                        {!isEditing ? (
                            <Button
                                onClick={handleEdit}
                                className="bg-white text-red-600 hover:bg-red-50"
                            >
                                <Edit className="h-4 w-4 mr-2" />
                                Modifier
                            </Button>
                        ) : (
                            <div className="flex space-x-2">
                                <Button
                                    onClick={handleSave}
                                    disabled={isSaving}
                                    className="bg-green-600 hover:bg-green-700 text-white"
                                >
                                    <Save className="h-4 w-4 mr-2" />
                                    {isSaving ? 'Enregistrement...' : 'Enregistrer'}
                                </Button>
                                <Button
                                    onClick={handleCancel}
                                    disabled={isSaving}
                                    variant="outline"
                                    className="bg-white text-red-600 hover:bg-red-50"
                                >
                                    <X className="h-4 w-4 mr-2" />
                                    Annuler
                                </Button>
                            </div>
                        )}
                    </div>
                </div>

                <Card className="border-red-200">
                    <CardHeader>
                        <CardTitle className="text-red-700">Informations Personnelles</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* First Name */}
                            <div className="space-y-2">
                                <label className="flex items-center text-sm text-gray-600">
                                    <User className="h-4 w-4 text-red-600 mr-2" />
                                    Prénom
                                </label>
                                {isEditing ? (
                                    <Input
                                        value={editedProfile.firstName || ''}
                                        onChange={(e) => handleInputChange('firstName', e.target.value)}
                                        className="border-red-200 focus:border-red-500"
                                    />
                                ) : (
                                    <p className="font-medium pl-6">Dr. {profile?.firstName}</p>
                                )}
                            </div>

                            {/* Last Name */}
                            <div className="space-y-2">
                                <label className="flex items-center text-sm text-gray-600">
                                    <User className="h-4 w-4 text-red-600 mr-2" />
                                    Nom
                                </label>
                                {isEditing ? (
                                    <Input
                                        value={editedProfile.lastName || ''}
                                        onChange={(e) => handleInputChange('lastName', e.target.value)}
                                        className="border-red-200 focus:border-red-500"
                                    />
                                ) : (
                                    <p className="font-medium pl-6">{profile?.lastName}</p>
                                )}
                            </div>

                            {/* Email - Not editable */}
                            <div className="space-y-2">
                                <label className="flex items-center text-sm text-gray-600">
                                    <Mail className="h-4 w-4 text-red-600 mr-2" />
                                    Email
                                    <Lock className="h-3 w-3 text-gray-400 ml-2" />
                                </label>
                                <p className="font-medium pl-6 text-gray-500">{profile?.email}</p>
                                {isEditing && (
                                    <p className="text-xs text-gray-500 pl-6">Contactez le support pour modifier</p>
                                )}
                            </div>

                            {/* Phone */}
                            <div className="space-y-2">
                                <label className="flex items-center text-sm text-gray-600">
                                    <Phone className="h-4 w-4 text-red-600 mr-2" />
                                    Téléphone
                                </label>
                                {isEditing ? (
                                    <Input
                                        value={editedProfile.telephone || ''}
                                        onChange={(e) => handleInputChange('telephone', e.target.value)}
                                        className="border-red-200 focus:border-red-500"
                                        placeholder="Numéro de téléphone"
                                    />
                                ) : (
                                    <p className="font-medium pl-6">{profile?.telephone || 'Non renseigné'}</p>
                                )}
                            </div>

                            {/* Address */}
                            <div className="space-y-2 md:col-span-2">
                                <label className="flex items-center text-sm text-gray-600">
                                    <MapPin className="h-4 w-4 text-red-600 mr-2" />
                                    Adresse
                                </label>
                                {isEditing ? (
                                    <Input
                                        value={editedProfile.address || ''}
                                        onChange={(e) => handleInputChange('address', e.target.value)}
                                        className="border-red-200 focus:border-red-500"
                                        placeholder="Adresse complète"
                                    />
                                ) : (
                                    <p className="font-medium pl-6">{profile?.address || 'Non renseignée'}</p>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-red-200">
                    <CardHeader>
                        <CardTitle className="text-red-700">Informations Professionnelles</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Speciality */}
                            <div className="space-y-2">
                                <label className="flex items-center text-sm text-gray-600">
                                    <Briefcase className="h-4 w-4 text-red-600 mr-2" />
                                    Spécialité
                                </label>
                                {isEditing ? (
                                    <Input
                                        value={editedProfile.speciality || ''}
                                        onChange={(e) => handleInputChange('speciality', e.target.value)}
                                        className="border-red-200 focus:border-red-500"
                                        placeholder="Ex: Médecine générale, Cardiologie..."
                                    />
                                ) : (
                                    <p className="font-medium pl-6">{profile?.speciality || 'Médecine générale'}</p>
                                )}
                            </div>

                            {/* Role - Not editable */}
                            <div className="space-y-2">
                                <label className="flex items-center text-sm text-gray-600">
                                    <Shield className="h-4 w-4 text-red-600 mr-2" />
                                    Rôle
                                </label>
                                <p className="font-medium pl-6">Médecin</p>
                            </div>

                            {/* Member Since - Not editable */}
                            <div className="space-y-2">
                                <label className="flex items-center text-sm text-gray-600">
                                    <Calendar className="h-4 w-4 text-red-600 mr-2" />
                                    Membre depuis
                                </label>
                                <p className="font-medium pl-6">
                                    {profile?.createdAt ? formatDate(profile.createdAt) : 'N/A'}
                                </p>
                            </div>

                            {/* Status - Not editable */}
                            <div className="space-y-2">
                                <label className="flex items-center text-sm text-gray-600">
                                    <div className={`h-3 w-3 rounded-full mr-2 ${profile?.isActive ? 'bg-green-500' : 'bg-red-500'}`} />
                                    Statut
                                </label>
                                <p className="font-medium pl-6">
                                    {profile?.isActive ? 'Actif' : 'Inactif'}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Password Change Notice */}
                {isEditing && (
                    <Card className="border-yellow-200 bg-yellow-50">
                        <CardContent className="pt-6">
                            <div className="flex items-start space-x-3">
                                <Lock className="h-5 w-5 text-yellow-600 mt-0.5" />
                                <div>
                                    <h4 className="font-medium text-yellow-900">Modification du mot de passe et de l'email</h4>
                                    <p className="text-sm text-yellow-700 mt-1">
                                        Pour des raisons de sécurité, la modification du mot de passe et de l'email nécessite de contacter le support.
                                    </p>
                                    <p className="text-sm text-yellow-700 mt-2">
                                        Contactez-nous au : <span className="font-medium">95 45 88 11</span> ou par email : <span className="font-medium">hedi.baaziz@outlook.tn</span>
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
    );
};

export default DoctorProfilePage;