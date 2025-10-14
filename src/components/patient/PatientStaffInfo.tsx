import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface PatientStaffInfoProps {
  patient: any;
}

export const PatientStaffInfo = ({ patient }: PatientStaffInfoProps) => {
  if (!patient) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Médecin et technicien</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-sm font-medium text-gray-500">Médecin responsable</p>
          <p className="text-base">{patient.doctor ? patient.doctor.name : 'Non assigné'}</p>
        </div>
        
        <div>
          <p className="text-sm font-medium text-gray-500">Technicien responsable</p>
          <p className="text-base">{patient.technician ? patient.technician.name : 'Non assigné'}</p>
        </div>

        <div>
          <p className="text-sm font-medium text-gray-500">Assigné à</p>
          <p className="text-base">{patient.assignedTo ? patient.assignedTo.name : 'Non assigné'}</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default PatientStaffInfo;
