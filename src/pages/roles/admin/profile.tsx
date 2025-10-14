import React, { useEffect, useState } from 'react';
import { User } from '@prisma/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  Briefcase, 
  CalendarDays, 
  CheckCircle, 
  Mail, 
  MapPin, 
  Phone, 
  UserCircle, 
  Clock,
  Loader2,
  AlertCircle
} from 'lucide-react';
import AdminLayout from './AdminLayout';

interface ProfileData extends Omit<User, 'password' | 'createdAt' | 'updatedAt'> {
  createdAt: string;
  updatedAt: string;
}

const AdminProfilePage = () => {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/profile/me');
        if (!response.ok) {
          throw new Error('Failed to fetch profile data');
        }
        const data = await response.json();
        setProfile(data);
      } catch (err: any) {
        setError(err.message || 'An unknown error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const getInitials = (firstName?: string, lastName?: string) => {
    if (firstName && lastName) {
      return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
    }
    if (firstName) {
      return firstName.charAt(0).toUpperCase();
    }
    return 'U';
  };

  const getRoleColor = (role: string) => {
    const colors = {
      ADMIN: 'bg-red-100 text-red-800 border-red-200',
      DOCTOR: 'bg-blue-100 text-blue-800 border-blue-200',
      TECHNICIAN: 'bg-green-100 text-green-800 border-green-200',
      EMPLOYEE: 'bg-gray-100 text-gray-800 border-gray-200'
    };
    return colors[role as keyof typeof colors] || colors.EMPLOYEE;
  };

  const getRoleName = (role: string) => {
    const names = {
      ADMIN: 'Administrateur',
      DOCTOR: 'Médecin',
      TECHNICIAN: 'Technicien',
      EMPLOYEE: 'Employé'
    };
    return names[role as keyof typeof names] || role;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-gray-600">Chargement du profil...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="flex flex-col items-center space-y-4">
          <AlertCircle className="h-12 w-12 text-red-500" />
          <p className="text-red-600 font-medium">Erreur: {error}</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="flex flex-col items-center space-y-4">
          <UserCircle className="h-12 w-12 text-gray-400" />
          <p className="text-gray-600">Aucune donnée de profil trouvée</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4 max-w-4xl">
      {/* Header Section */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Mon Profil</h1>
        <p className="text-gray-600 mt-1">Consultez vos informations personnelles</p>
      </div>

      {/* Profile Card */}
      <Card className="shadow-sm border-0 shadow-md">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
          <div className="flex items-center space-x-4">
            <Avatar className="h-20 w-20 border-4 border-white shadow-lg">
              <AvatarFallback className="text-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-bold">
                {getInitials(profile.firstName, profile.lastName)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <CardTitle className="text-2xl font-bold text-gray-900">
                {profile.firstName} {profile.lastName}
              </CardTitle>
              <div className="flex items-center space-x-3 mt-2">
                <Badge className={getRoleColor(profile.role)}>
                  {getRoleName(profile.role)}
                </Badge>
                <Badge variant={profile.isActive ? "default" : "secondary"} className="flex items-center space-x-1">
                  <CheckCircle className="h-3 w-3" />
                  <span>{profile.isActive ? 'Actif' : 'Inactif'}</span>
                </Badge>
              </div>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-6">
          <div className="space-y-6">
            {/* Contact Information */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Mail className="h-5 w-5 mr-2 text-blue-600" />
                Informations de contact
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center space-x-3 p-3 rounded-lg bg-gray-50">
                  <Mail className="h-5 w-5 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-500">Email</p>
                    <p className="font-medium">{profile.email}</p>
                  </div>
                </div>
                {profile.telephone && (
                  <div className="flex items-center space-x-3 p-3 rounded-lg bg-gray-50">
                    <Phone className="h-5 w-5 text-gray-500" />
                    <div>
                      <p className="text-sm text-gray-500">Téléphone</p>
                      <p className="font-medium">{profile.telephone}</p>
                    </div>
                  </div>
                )}
                {profile.address && (
                  <div className="flex items-center space-x-3 p-3 rounded-lg bg-gray-50 md:col-span-2">
                    <MapPin className="h-5 w-5 text-gray-500" />
                    <div>
                      <p className="text-sm text-gray-500">Adresse</p>
                      <p className="font-medium">{profile.address}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Professional Information */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Briefcase className="h-5 w-5 mr-2 text-blue-600" />
                Informations professionnelles
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center space-x-3 p-3 rounded-lg bg-gray-50">
                  <UserCircle className="h-5 w-5 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-500">Rôle</p>
                    <p className="font-medium">{getRoleName(profile.role)}</p>
                  </div>
                </div>
                {profile.speciality && (
                  <div className="flex items-center space-x-3 p-3 rounded-lg bg-gray-50">
                    <Briefcase className="h-5 w-5 text-gray-500" />
                    <div>
                      <p className="text-sm text-gray-500">Spécialité</p>
                      <p className="font-medium">{profile.speciality}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Account Information */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <CalendarDays className="h-5 w-5 mr-2 text-blue-600" />
                Informations du compte
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center space-x-3 p-3 rounded-lg bg-gray-50">
                  <CalendarDays className="h-5 w-5 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-500">Date de création</p>
                    <p className="font-medium">{new Date(profile.createdAt).toLocaleDateString('fr-FR')}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3 p-3 rounded-lg bg-gray-50">
                  <Clock className="h-5 w-5 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-500">Dernière mise à jour</p>
                    <p className="font-medium">{new Date(profile.updatedAt).toLocaleDateString('fr-FR')}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Add layout wrapper
AdminProfilePage.getLayout = function getLayout(page: React.ReactElement) {
  return <AdminLayout>{page}</AdminLayout>;
};

export default AdminProfilePage;