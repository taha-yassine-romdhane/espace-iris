import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { User, Calendar, Clipboard } from 'lucide-react';

interface PatientBasicInfoProps {
  patient: any;
}

export const PatientBasicInfo = ({ patient }: PatientBasicInfoProps) => {
  if (!patient) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5 text-blue-500" />
          Informations de base
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-sm font-medium text-gray-500">Nom complet</p>
          <p className="text-base">{patient.nom}</p>
        </div>
        
        <div>
          <p className="text-sm font-medium text-gray-500">Date de naissance</p>
          <p className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4 text-gray-400" />
            {patient.dateNaissance ? new Date(patient.dateNaissance).toLocaleDateString() : 'Non spécifiée'}
          </p>
        </div>
        
        <div>
          <p className="text-sm font-medium text-gray-500">CIN</p>
          <p className="text-base flex items-center gap-2">
            <Clipboard className="h-4 w-4 text-gray-400" />
            {patient.cin || 'Non spécifié'}
          </p>
        </div>

        <div>
          <p className="text-sm font-medium text-gray-500">ID CNAM</p>
          <p className="text-base">{patient.identifiantCNAM || 'Non spécifié'}</p>
        </div>

        <div>
          <p className="text-sm font-medium text-gray-500">Bénéficiaire</p>
          <p className="text-base">{patient.beneficiaire || 'Non spécifié'}</p>
        </div>

        <div>
          <p className="text-sm font-medium text-gray-500">Caisse d'affiliation</p>
          <p className="text-base">{patient.caisseAffiliation || 'Non spécifiée'}</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default PatientBasicInfo;
