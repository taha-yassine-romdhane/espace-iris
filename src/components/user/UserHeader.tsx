import React from 'react';
import { User } from '@prisma/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { UserIcon, PhoneIcon, MapPinIcon, BriefcaseIcon } from 'lucide-react';
import { format } from 'date-fns';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface UserHeaderProps {
  user: User;
}

export const UserHeader: React.FC<UserHeaderProps> = ({ user }) => {
  // Get initials for avatar
  const getInitials = () => {
    const firstInitial = user.firstName ? user.firstName.charAt(0) : '';
    const lastInitial = user.lastName ? user.lastName.charAt(0) : '';
    return (firstInitial + lastInitial).toUpperCase();
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Avatar className="h-12 w-12 mr-4">
              <AvatarFallback>{getInitials()}</AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-xl">
                {user.firstName} {user.lastName}
              </CardTitle>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>
          </div>
          <Badge variant={user.isActive ? 'default' : 'destructive'}>
            {user.isActive ? 'Actif' : 'Inactif'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="flex items-center">
            <UserIcon className="mr-2 h-4 w-4 text-muted-foreground" />
            <div>
              <span className="text-sm text-muted-foreground">Rôle</span>
              <p className="font-medium">{user.role}</p>
            </div>
          </div>
          
          {user.telephone && (
            <div className="flex items-center">
              <PhoneIcon className="mr-2 h-4 w-4 text-muted-foreground" />
              <div>
                <span className="text-sm text-muted-foreground">Téléphone</span>
                <p className="font-medium">{user.telephone}</p>
              </div>
            </div>
          )}
          
          {user.address && (
            <div className="flex items-center">
              <MapPinIcon className="mr-2 h-4 w-4 text-muted-foreground" />
              <div>
                <span className="text-sm text-muted-foreground">Adresse</span>
                <p className="font-medium">{user.address}</p>
              </div>
            </div>
          )}
          
          {user.speciality && (
            <div className="flex items-center">
              <BriefcaseIcon className="mr-2 h-4 w-4 text-muted-foreground" />
              <div>
                <span className="text-sm text-muted-foreground">Spécialité</span>
                <p className="font-medium">{user.speciality}</p>
              </div>
            </div>
          )}
          
          <div className="flex items-center">
            <div>
              <span className="text-sm text-muted-foreground">Créé le</span>
              <p className="font-medium">{format(new Date(user.createdAt), 'dd/MM/yyyy')}</p>
            </div>
          </div>
          
          <div className="flex items-center">
            <div>
              <span className="text-sm text-muted-foreground">Dernière mise à jour</span>
              <p className="font-medium">{format(new Date(user.updatedAt), 'dd/MM/yyyy')}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
