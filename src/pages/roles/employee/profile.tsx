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
import EmployeeLayout from './EmployeeLayout';

interface ProfileData extends Omit<User, 'password' | 'createdAt' | 'updatedAt'> {
  createdAt: string;
  updatedAt: string;
}

const EmployeeProfilePage = () => {
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
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase() || 'U';
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'EMPLOYEE':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
        <div className="flex items-center justify-center h-96">
          <div className="flex items-center space-x-2">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            <span className="text-lg font-medium">Chargement du profil...</span>
          </div>
        </div>
    );
  }

  if (error) {
    return (
        <div className="flex items-center justify-center h-96">
          <Card className="w-full max-w-md">
            <CardContent className="flex flex-col items-center p-6">
              <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
              <h2 className="text-xl font-semibold mb-2">Erreur</h2>
              <p className="text-gray-600 text-center">{error}</p>
            </CardContent>
          </Card>
        </div>
    );
  }

  if (!profile) {
    return (
        <div className="flex items-center justify-center h-96">
          <Card className="w-full max-w-md">
            <CardContent className="flex flex-col items-center p-6">
              <UserCircle className="h-12 w-12 text-gray-400 mb-4" />
              <h2 className="text-xl font-semibold mb-2">Profil introuvable</h2>
              <p className="text-gray-600 text-center">
                Aucune information de profil n'a pu être récupérée.
              </p>
            </CardContent>
          </Card>
        </div>
    );
  }

  return (
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg p-6 text-white">
          <div className="flex items-center space-x-4">
            <Avatar className="h-16 w-16 border-2 border-white/20">
              <AvatarFallback className="bg-blue-500 text-white text-lg font-semibold">
                {getInitials(profile.firstName || '', profile.lastName || '')}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-2xl font-bold">
                {profile.firstName} {profile.lastName}
              </h1>
              <p className="text-blue-100">Employé - Espace Elite</p>
            </div>
          </div>
        </div>

        {/* Profile Information */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Personal Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <UserCircle className="h-5 w-5" />
                <span>Informations personnelles</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-3">
                <Mail className="h-4 w-4 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Email</p>
                  <p className="text-sm text-gray-600">{profile.email}</p>
                </div>
              </div>

              {profile.telephone && (
                <div className="flex items-center space-x-3">
                  <Phone className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Téléphone</p>
                    <p className="text-sm text-gray-600">{profile.telephone}</p>
                  </div>
                </div>
              )}

              {profile.address && (
                <div className="flex items-center space-x-3">
                  <MapPin className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Adresse</p>
                    <p className="text-sm text-gray-600">{profile.address}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Account Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Briefcase className="h-5 w-5" />
                <span>Informations du compte</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-3">
                <UserCircle className="h-4 w-4 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Rôle</p>
                  <Badge className={getRoleBadgeColor(profile.role)}>
                    {profile.role === 'EMPLOYEE' ? 'Employé' : profile.role}
                  </Badge>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <CheckCircle className="h-4 w-4 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Statut</p>
                  <Badge className={profile.isActive 
                    ? 'bg-green-100 text-green-800 border-green-200' 
                    : 'bg-red-100 text-red-800 border-red-200'
                  }>
                    {profile.isActive ? 'Actif' : 'Inactif'}
                  </Badge>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <CalendarDays className="h-4 w-4 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Membre depuis</p>
                  <p className="text-sm text-gray-600">
                    {formatDate(profile.createdAt)}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <Clock className="h-4 w-4 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Dernière mise à jour</p>
                  <p className="text-sm text-gray-600">
                    {formatDate(profile.updatedAt)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Additional Information */}
        {(profile.speciality || (profile as any).companyName || (profile as any).department) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Briefcase className="h-5 w-5" />
                <span>Informations professionnelles</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {profile.speciality && (
                <div className="flex items-center space-x-3">
                  <UserCircle className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Spécialité</p>
                    <p className="text-sm text-gray-600">{profile.speciality}</p>
                  </div>
                </div>
              )}

              {(profile as any).companyName && (
                <div className="flex items-center space-x-3">
                  <Briefcase className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Entreprise</p>
                    <p className="text-sm text-gray-600">{(profile as any).companyName}</p>
                  </div>
                </div>
              )}

              {(profile as any).department && (
                <div className="flex items-center space-x-3">
                  <UserCircle className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Département</p>
                    <p className="text-sm text-gray-600">{(profile as any).department}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
  );
};

EmployeeProfilePage.getLayout = function getLayout(page: React.ReactElement) {
  return <EmployeeLayout>{page}</EmployeeLayout>;
};

export default EmployeeProfilePage;