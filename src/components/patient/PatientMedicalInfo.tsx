import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, Ruler, Weight, FileText } from 'lucide-react';

interface PatientMedicalInfoProps {
  patient: any;
}

export const PatientMedicalInfo = ({ patient }: PatientMedicalInfoProps) => {
  if (!patient) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Activity className="h-5 w-5 text-blue-500" />
          Informations médicales
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Taille</p>
          <div className="flex items-center gap-2">
            <Ruler className="h-4 w-4 text-blue-500" />
            <p className="text-base text-gray-900 font-medium">
              {patient.taille ? `${patient.taille} cm` : <span className="text-gray-400 italic font-normal">Non spécifiée</span>}
            </p>
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Poids</p>
          <div className="flex items-center gap-2">
            <Weight className="h-4 w-4 text-blue-500" />
            <p className="text-base text-gray-900 font-medium">
              {patient.poids ? `${patient.poids} kg` : <span className="text-gray-400 italic font-normal">Non spécifié</span>}
            </p>
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Antécédants médicaux</p>
          <div className="flex items-start gap-2">
            <FileText className="h-4 w-4 text-blue-500 mt-1 flex-shrink-0" />
            <p className="text-base text-gray-900 leading-relaxed">
              {patient.antecedant || <span className="text-gray-400 italic">Aucun</span>}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PatientMedicalInfo;
