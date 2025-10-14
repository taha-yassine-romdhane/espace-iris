import React from 'react';
import Link from 'next/link';
import { MedicalDevice, Patient, Company, Rental, Diagnostic } from '@prisma/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, UserIcon, BuildingIcon, ClipboardIcon, CircleCheckIcon, CircleIcon, ClockIcon } from 'lucide-react';

interface DeviceRelationsProps {
  device: MedicalDevice & {
    Patient?: Patient | null;
    Company?: Company | null;
    Rental?: (Rental & {
      patient?: { firstName: string; lastName: string; patientCode: string } | null;
      Company?: { companyName: string } | null;
    })[];
    Diagnostic?: Diagnostic[];
  };
}

export const DeviceRelations: React.FC<DeviceRelationsProps> = ({ device }) => {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <ClockIcon className="h-4 w-4 text-blue-600" />;
      case 'COMPLETED':
        return <CircleCheckIcon className="h-4 w-4 text-green-600" />;
      default:
        return <CircleIcon className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge className="bg-blue-100 text-blue-800 text-xs">En cours</Badge>;
      case 'COMPLETED':
        return <Badge className="bg-green-100 text-green-800 text-xs">Terminée</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800 text-xs">{status}</Badge>;
    }
  };

  const formatDateRange = (startDate: Date | string, endDate?: Date | string | null) => {
    const start = new Date(startDate).toLocaleDateString('fr-FR', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric' 
    });
    
    if (endDate) {
      const end = new Date(endDate).toLocaleDateString('fr-FR', { 
        day: '2-digit', 
        month: 'short', 
        year: 'numeric' 
      });
      return `${start} → ${end}`;
    }
    
    return `${start} → En cours`;
  };

  const calculateDuration = (startDate: Date | string, endDate?: Date | string | null) => {
    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : new Date();
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const months = Math.floor(diffDays / 30);
    const days = diffDays % 30;
    
    if (months > 0) {
      return `${months} mois${days > 0 ? ` ${days}j` : ''}`;
    }
    return `${diffDays} jours`;
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-slate-900">Relations</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Current Assignment */}
          <div>
            <h3 className="text-sm font-medium text-slate-600 mb-3">Assigné à</h3>
            {device.Patient ? (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 border">
                <div className="flex-shrink-0">
                  <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
                    <UserIcon className="h-4 w-4 text-white" />
                  </div>
                </div>
                <div className="flex-1">
                  <Link href={`/roles/admin/renseignement/patient/${device.Patient.id}`} className="font-medium text-slate-900 hover:text-blue-600 transition-colors">
                    {device.Patient.firstName} {device.Patient.lastName}
                  </Link>
                  <p className="text-sm text-slate-500">Patient</p>
                </div>
              </div>
            ) : device.Company ? (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 border">
                <div className="flex-shrink-0">
                  <div className="h-8 w-8 rounded-full bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center">
                    <BuildingIcon className="h-4 w-4 text-white" />
                  </div>
                </div>
                <div className="flex-1">
                  <Link href={`/roles/admin/companies/${device.Company.id}`} className="font-medium text-slate-900 hover:text-blue-600 transition-colors">
                    {device.Company.companyName}
                  </Link>
                  <p className="text-sm text-slate-500">Société</p>
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-lg bg-gray-50 border border-dashed border-gray-300">
                <p className="text-gray-500 text-sm">Non assigné</p>
              </div>
            )}
          </div>

          {/* Rental History */}
          <div>
            <h3 className="text-sm font-medium text-slate-600 mb-3">Historique des locations</h3>
            {device.Rental && device.Rental.length > 0 ? (
              <div className="space-y-3">
                {device.Rental.slice(0, 5).map((rental) => (
                  <div key={rental.id} className="border rounded-lg p-4 bg-white hover:shadow-sm transition-shadow">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="flex-shrink-0 mt-1">
                          {getStatusIcon(rental.status)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Link 
                              href={`/roles/admin/rentals/${rental.id}`} 
                              className="font-medium text-slate-900 hover:text-blue-600 transition-colors text-sm"
                            >
                              {rental.rentalCode || `Location ${rental.id.slice(-6)}`}
                            </Link>
                            {getStatusBadge(rental.status)}
                          </div>
                          
                          <div className="text-sm text-slate-600 mb-2">
                            {formatDateRange(rental.startDate, rental.endDate)}
                          </div>
                          
                          <div className="flex items-center gap-4 text-xs text-slate-500">
                            <span>Durée: {calculateDuration(rental.startDate, rental.endDate)}</span>
                            {rental.patient && (
                              <span>Patient: {rental.patient.firstName} {rental.patient.lastName}</span>
                            )}
                            {rental.Company && (
                              <span>Société: {rental.Company.companyName}</span>
                            )}
                          </div>
                          
                          {rental.notes && (
                            <div className="mt-2 text-xs text-slate-500 italic">
                              {rental.notes}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                
                {device.Rental.length > 5 && (
                  <Button variant="ghost" className="w-full text-sm text-slate-600 hover:text-slate-800">
                    Voir {device.Rental.length - 5} locations supplémentaires
                  </Button>
                )}
              </div>
            ) : (
              <div className="p-4 rounded-lg bg-gray-50 border border-dashed border-gray-300 text-center">
                <CalendarIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-500 text-sm">Aucune location enregistrée</p>
              </div>
            )}
          </div>

          {/* Diagnostics */}
          <div>
            <h3 className="text-sm font-medium text-slate-600 mb-3">Diagnostics</h3>
            {device.Diagnostic && device.Diagnostic.length > 0 ? (
              <div className="space-y-2">
                {device.Diagnostic.slice(0, 3).map((diagnostic) => (
                  <div key={diagnostic.id} className="flex items-center gap-3 p-3 rounded-lg border bg-white hover:bg-slate-50 transition-colors">
                    <ClipboardIcon className="h-4 w-4 text-blue-600 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <Link href={`/roles/admin/diagnostics/${diagnostic.id}`} className="text-sm font-medium text-slate-900 hover:text-blue-600 transition-colors">
                        Diagnostic du {new Date(diagnostic.diagnosticDate).toLocaleDateString('fr-FR')}
                      </Link>
                      {diagnostic.notes && (
                        <p className="text-xs text-slate-500 mt-1 truncate">{diagnostic.notes}</p>
                      )}
                    </div>
                  </div>
                ))}
                {device.Diagnostic.length > 3 && (
                  <Button variant="ghost" className="w-full text-sm text-slate-600 hover:text-slate-800">
                    Voir {device.Diagnostic.length - 3} diagnostics supplémentaires
                  </Button>
                )}
              </div>
            ) : (
              <div className="p-4 rounded-lg bg-gray-50 border border-dashed border-gray-300 text-center">
                <ClipboardIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-500 text-sm">Aucun diagnostic enregistré</p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
