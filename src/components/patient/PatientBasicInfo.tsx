import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { User, Calendar, Clipboard, IdCard, Building2 } from 'lucide-react';

interface PatientBasicInfoProps {
  patient: any;
}

export const PatientBasicInfo = ({ patient }: PatientBasicInfoProps) => {
  if (!patient) return null;

  const formatDate = (date: string | null) => {
    if (!date) return null;
    try {
      return new Date(date).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      });
    } catch {
      return null;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <User className="h-5 w-5 text-blue-500" />
          Informations de base
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Nom complet</p>
          <p className="text-base font-medium text-gray-900">{patient.nom}</p>
        </div>

        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Date de naissance</p>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-blue-500" />
            <p className="text-base text-gray-900">
              {formatDate(patient.dateNaissance) || <span className="text-gray-400 italic">Non spécifiée</span>}
            </p>
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">CIN</p>
          <div className="flex items-center gap-2">
            <IdCard className="h-4 w-4 text-blue-500" />
            <p className="text-base text-gray-900 font-mono">
              {patient.cin || <span className="text-gray-400 italic font-sans">Non spécifié</span>}
            </p>
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">ID CNAM</p>
          <div className="flex items-center gap-2">
            <Clipboard className="h-4 w-4 text-blue-500" />
            <p className="text-base text-gray-900 font-mono">
              {patient.identifiantCNAM || <span className="text-gray-400 italic font-sans">Non spécifié</span>}
            </p>
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Bénéficiaire</p>
          <p className="text-base text-gray-900">
            {patient.beneficiaire || <span className="text-gray-400 italic">Non spécifié</span>}
          </p>
        </div>

        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Caisse d'affiliation</p>
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-blue-500" />
            <p className="text-base text-gray-900">
              {patient.caisseAffiliation || <span className="text-gray-400 italic">Non spécifiée</span>}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PatientBasicInfo;
