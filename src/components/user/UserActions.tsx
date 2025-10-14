import React from 'react';
import { User } from '@prisma/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  ClipboardIcon, 
  PencilIcon, 
  TrashIcon, 
  ShieldIcon,
  LockIcon,
  BellIcon,
  ArchiveIcon
} from 'lucide-react';

interface UserActionsProps {
  user: User;
}

export const UserActions: React.FC<UserActionsProps> = ({ user }) => {
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center">
          <ClipboardIcon className="mr-2 h-5 w-5" />
          Actions
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-3">
          <Button variant="outline" className="flex items-center justify-start">
            <PencilIcon className="mr-2 h-4 w-4" />
            Modifier le profil
          </Button>
          
          <Button variant="outline" className="flex items-center justify-start">
            <LockIcon className="mr-2 h-4 w-4" />
            Réinitialiser le mot de passe
          </Button>
          
          <Button variant="outline" className="flex items-center justify-start">
            <ShieldIcon className="mr-2 h-4 w-4" />
            Modifier les permissions
          </Button>
          
          <Button variant="outline" className="flex items-center justify-start">
            <BellIcon className="mr-2 h-4 w-4" />
            Envoyer une notification
          </Button>
          
          {user.isActive ? (
            <Button variant="outline" className="flex items-center justify-start text-amber-600 hover:text-amber-700 hover:bg-amber-50">
              <ArchiveIcon className="mr-2 h-4 w-4" />
              Désactiver le compte
            </Button>
          ) : (
            <Button variant="outline" className="flex items-center justify-start text-green-600 hover:text-green-700 hover:bg-green-50">
              <ArchiveIcon className="mr-2 h-4 w-4" />
              Activer le compte
            </Button>
          )}
          
          <Button variant="outline" className="flex items-center justify-start text-red-600 hover:text-red-700 hover:bg-red-50">
            <TrashIcon className="mr-2 h-4 w-4" />
            Supprimer le compte
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
