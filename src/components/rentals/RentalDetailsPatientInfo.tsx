import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UserIcon, MapPinIcon, PhoneIcon } from 'lucide-react';

interface RentalDetailsPatientInfoProps {
  patient: any;
}

const RentalDetailsPatientInfo: React.FC<RentalDetailsPatientInfoProps> = ({ patient }) => {
  if (!patient) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Informations Patient</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500">Aucune information patient disponible</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Informations Patient</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-start">
          <UserIcon className="h-5 w-5 mr-2 text-blue-600" />
          <div>
            <h3 className="font-medium text-gray-700">Nom et Prénom</h3>
            <p>{patient.firstName + ' ' + patient.lastName || '-'}</p>
          </div>
        </div>
        
        <div className="flex items-start">
          <PhoneIcon className="h-5 w-5 mr-2 text-blue-600" />
          <div>
            <h3 className="font-medium text-gray-700">Téléphone</h3>
            <p>{patient.telephone || '-'}</p>
          </div>
        </div>
        
        <div className="flex items-start">
          <MapPinIcon className="h-5 w-5 mr-2 text-blue-600" />
          <div>
            <h3 className="font-medium text-gray-700">Adresse</h3>
            <p>{patient.address || '-'}</p>
          </div>
        </div>

        {patient.status && (
          <div className="mt-2">
            <span className={`px-2 py-1 text-xs rounded ${
              patient.status === 'En cours de location' 
                ? 'bg-blue-100 text-blue-800' 
                : 'bg-gray-100 text-gray-800'
            }`}>
              {patient.status}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RentalDetailsPatientInfo;
