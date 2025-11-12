import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Phone, MapPin } from 'lucide-react';

interface PatientContactInfoProps {
  patient: any;
}

export const PatientContactInfo = ({ patient }: PatientContactInfoProps) => {
  if (!patient) return null;

  // Function to capitalize first letter of each word and lowercase the rest
  const formatAddress = (address: string) => {
    if (!address) return null;
    return address
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const formattedAddress = formatAddress(patient.adresse);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Phone className="h-5 w-5 text-blue-500" />
          Coordonnées
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Téléphone principal</p>
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-blue-500" />
            <p className="text-base text-gray-900 font-medium">
              {patient.telephone || <span className="text-gray-400 italic font-normal">Non spécifié</span>}
            </p>
          </div>
        </div>

        {patient.telephoneSecondaire && (
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Téléphone secondaire</p>
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-blue-500" />
              <p className="text-base text-gray-900 font-medium">{patient.telephoneSecondaire}</p>
            </div>
          </div>
        )}

        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Adresse</p>
          <div className="flex items-start gap-2">
            <MapPin className="h-4 w-4 text-blue-500 mt-1 flex-shrink-0" />
            <p className="text-base text-gray-900 leading-relaxed">
              {formattedAddress || <span className="text-gray-400 italic">Non spécifiée</span>}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PatientContactInfo;
