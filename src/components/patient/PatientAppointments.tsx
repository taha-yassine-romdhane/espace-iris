import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, AlertCircle, Clock } from 'lucide-react';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';

interface PatientAppointmentsProps {
  appointments: any[];
  isLoading?: boolean;
}

export const PatientAppointments = ({ appointments = [], isLoading = false }: PatientAppointmentsProps) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SCHEDULED':
        return 'bg-blue-100 text-blue-800';
      case 'COMPLETED':
        return 'bg-green-100 text-green-800';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800';
      case 'PENDING':
        return 'bg-amber-100 text-amber-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Function to format time from date object
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Sort appointments by date (most recent first)
  const sortedAppointments = [...appointments].sort((a, b) => {
    return new Date(b.appointmentDate).getTime() - new Date(a.appointmentDate).getTime();
  });

  // Split appointments into upcoming and past
  const now = new Date();
  const upcomingAppointments = sortedAppointments.filter(
    app => new Date(app.appointmentDate) >= now
  );
  const pastAppointments = sortedAppointments.filter(
    app => new Date(app.appointmentDate) < now
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-blue-500" />
          Rendez-vous
        </CardTitle>
        <CardDescription>
          Tous les rendez-vous programmés pour ce patient
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700"></div>
          </div>
        ) : sortedAppointments.length > 0 ? (
          <div className="space-y-6">
            {upcomingAppointments.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Rendez-vous à venir</h3>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Heure</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Médecin</TableHead>
                        <TableHead>Notes</TableHead>
                        <TableHead>Statut</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {upcomingAppointments.map((appointment, index) => {
                        const appointmentDate = new Date(appointment.appointmentDate);
                        
                        return (
                          <TableRow key={index}>
                            <TableCell>{appointmentDate.toLocaleDateString()}</TableCell>
                            <TableCell className="whitespace-nowrap">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {formatTime(appointmentDate)}
                              </span>
                            </TableCell>
                            <TableCell>{appointment.type || 'Consultation'}</TableCell>
                            <TableCell>{appointment.doctor?.name || 'Non assigné'}</TableCell>
                            <TableCell className="max-w-xs truncate">
                              {appointment.notes || '-'}
                            </TableCell>
                            <TableCell>
                              <Badge className={getStatusColor(appointment.status)}>
                                {appointment.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {pastAppointments.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Rendez-vous passés</h3>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Médecin</TableHead>
                        <TableHead>Notes</TableHead>
                        <TableHead>Statut</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pastAppointments.slice(0, 5).map((appointment, index) => {
                        const appointmentDate = new Date(appointment.appointmentDate);
                        
                        return (
                          <TableRow key={index}>
                            <TableCell>{appointmentDate.toLocaleDateString()}</TableCell>
                            <TableCell>{appointment.type || 'Consultation'}</TableCell>
                            <TableCell>{appointment.doctor?.name || 'Non assigné'}</TableCell>
                            <TableCell className="max-w-xs truncate">
                              {appointment.notes || '-'}
                            </TableCell>
                            <TableCell>
                              <Badge className={getStatusColor(appointment.status)}>
                                {appointment.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                  {pastAppointments.length > 5 && (
                    <div className="text-center mt-2">
                      <span className="text-xs text-gray-500">
                        + {pastAppointments.length - 5} rendez-vous antérieurs
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <AlertCircle className="h-10 w-10 mx-auto mb-2 text-gray-300" />
            <p>Aucun rendez-vous programmé pour ce patient</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PatientAppointments;
