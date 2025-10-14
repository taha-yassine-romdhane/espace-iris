import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface PatientMedicalInfoProps {
  patient: any;
}

export const PatientMedicalInfo = ({ patient }: PatientMedicalInfoProps) => {
  if (!patient) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Informations médicales</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-sm font-medium text-gray-500">Taille</p>
          <p className="text-base">{patient.taille ? `${patient.taille} cm` : 'Non spécifiée'}</p>
        </div>
        
        <div>
          <p className="text-sm font-medium text-gray-500">Poids</p>
          <p className="text-base">{patient.poids ? `${patient.poids} kg` : 'Non spécifié'}</p>
        </div>
        
        <div>
          <p className="text-sm font-medium text-gray-500">Antécédants médicaux</p>
          <p className="text-base">{patient.antecedant || 'Aucun'}</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default PatientMedicalInfo;
