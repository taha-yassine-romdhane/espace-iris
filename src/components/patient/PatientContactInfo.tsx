import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Phone, MapPin } from 'lucide-react';

interface PatientContactInfoProps {
  patient: any;
}

export const PatientContactInfo = ({ patient }: PatientContactInfoProps) => {
  if (!patient) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Phone className="h-5 w-5 text-blue-500" />
          Coordonnées
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-sm font-medium text-gray-500">Téléphone principal</p>
          <p className="text-base flex items-center gap-2">
            <Phone className="h-4 w-4 text-gray-400" />
            {patient.telephone}
          </p>
        </div>
        
        {patient.telephoneSecondaire && (
          <div>
            <p className="text-sm font-medium text-gray-500">Téléphone secondaire</p>
            <p className="text-base flex items-center gap-2">
              <Phone className="h-4 w-4 text-gray-400" />
              {patient.telephoneSecondaire}
            </p>
          </div>
        )}
        
        <div>
          <p className="text-sm font-medium text-gray-500">Adresse</p>
          <p className="text-base flex items-start gap-2">
            <MapPin className="h-4 w-4 text-gray-400 mt-1" />
            {patient.adresse || 'Non spécifiée'}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default PatientContactInfo;
