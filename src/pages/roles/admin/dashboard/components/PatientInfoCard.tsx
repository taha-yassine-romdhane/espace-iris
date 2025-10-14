import { User, Phone, Calendar, MapPin, FileText, Activity } from "lucide-react";

interface PatientInfoCardProps {
  patient: {
    firstName: string;
    lastName: string;
    telephone?: string;
    dateOfBirth?: string | Date;
    address?: string;
    cin?: string;
    doctorName?: string;
  } | null;
}

export function PatientInfoCard({ patient }: PatientInfoCardProps) {
  if (!patient) return null;

  return (
    <div className="mb-6 overflow-hidden rounded-lg border border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100/50 shadow-sm">
      {/* Header with patient name */}
      <div className="bg-blue-600 p-3 text-white">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-full bg-white/20 flex items-center justify-center">
            <User className="h-5 w-5" />
          </div>
          <div>
            <h4 className="font-medium text-lg">
              {patient.firstName} {patient.lastName}
            </h4>
            {patient.doctorName && (
              <p className="text-xs text-blue-100">Dr. {patient.doctorName}</p>
            )}
          </div>
        </div>
      </div>
      
      {/* Patient details */}
      <div className="p-3 text-sm space-y-2">
        {patient.telephone && (
          <div className="flex items-center gap-2 text-blue-800">
            <Phone className="h-4 w-4 text-blue-600" /> 
            <span>{patient.telephone}</span>
          </div>
        )}
        {patient.dateOfBirth && (
          <div className="flex items-center gap-2 text-blue-800">
            <Calendar className="h-4 w-4 text-blue-600" /> 
            <span>{new Date(patient.dateOfBirth).toLocaleDateString()}</span>
          </div>
        )}
        {patient.address && (
          <div className="flex items-center gap-2 text-blue-800">
            <MapPin className="h-4 w-4 text-blue-600" /> 
            <span className="truncate">{patient.address}</span>
          </div>
        )}
        {patient.cin && (
          <div className="flex items-center gap-2 text-blue-800">
            <FileText className="h-4 w-4 text-blue-600" /> 
            <span>CIN: {patient.cin}</span>
          </div>
        )}
      </div>
      
      {/* Status badge */}
      <div className="px-3 pb-3">
        <div className="flex items-center gap-1 text-xs bg-green-100 text-green-700 py-1 px-2 rounded-full w-fit">
          <Activity className="h-3 w-3" /> 
          <span>En diagnostic</span>
        </div>
      </div>
    </div>
  );
}

export default PatientInfoCard;
