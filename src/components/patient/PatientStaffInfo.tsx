import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UserCog, Stethoscope, UserCheck } from 'lucide-react';

interface PatientStaffInfoProps {
  patient: any;
}

export const PatientStaffInfo = ({ patient }: PatientStaffInfoProps) => {
  if (!patient) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <UserCog className="h-5 w-5 text-blue-500" />
          Médecin et technicien
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Médecin responsable</p>
          <div className="flex items-center gap-2">
            <Stethoscope className="h-4 w-4 text-blue-500" />
            <p className="text-base text-gray-900 font-medium">
              {patient.doctor?.name || <span className="text-gray-400 italic font-normal">Non assigné</span>}
            </p>
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Technicien responsable</p>
          <div className="flex items-center gap-2">
            <UserCog className="h-4 w-4 text-blue-500" />
            <p className="text-base text-gray-900 font-medium">
              {patient.technician?.name || <span className="text-gray-400 italic font-normal">Non assigné</span>}
            </p>
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Assigné à</p>
          <div className="flex items-center gap-2">
            <UserCheck className="h-4 w-4 text-blue-500" />
            <p className="text-base text-gray-900 font-medium">
              {patient.assignedTo?.name || <span className="text-gray-400 italic font-normal">Non assigné</span>}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PatientStaffInfo;
