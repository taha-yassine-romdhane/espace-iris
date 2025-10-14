import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface InstallationsHistoryProps {
  technicianId: string;
}

interface Installation {
  id: string;
  medicalDeviceId: string;
  medicalDevice: {
    id: string;
    name: string;
    type: string;
    brand: string;
    model: string;
  };
  patientId: string;
  patient: {
    id: string;
    firstName: string;
    lastName: string;
  };
  installationDate: string;
  parameters: Array<{
    id: string;
    title: string;
    value: string;
    unit: string;
  }>;
  doctorId?: string;
  doctor?: {
    id: string;
    user: {
      firstName: string;
      lastName: string;
    };
  };
}

export function InstallationsHistory({ technicianId }: InstallationsHistoryProps) {
  const { data: installations, isLoading, error } = useQuery({
    queryKey: ['technician-installations', technicianId],
    queryFn: async () => {
      const response = await axios.get(`/api/technicians/${technicianId}/installations`);
      return response.data as Installation[];
    }
  });

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'dd/MM/yyyy', { locale: fr });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-medium text-red-600">
            Erreur de chargement
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p>Impossible de charger les installations. Veuillez réessayer plus tard.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-medium">
          Historique des Installations
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Suivi des installations et paramétrages récents
        </p>
      </CardHeader>
      <CardContent>
        {installations && installations.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Patient</TableHead>
                <TableHead>Appareil</TableHead>
                <TableHead>Paramètres</TableHead>
                <TableHead>Médecin</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {installations.map((installation) => (
                <TableRow key={installation.id}>
                  <TableCell>{formatDate(installation.installationDate)}</TableCell>
                  <TableCell>{installation.patient.firstName} {installation.patient.lastName}</TableCell>
                  <TableCell>{installation.medicalDevice.name} {installation.medicalDevice.brand} {installation.medicalDevice.model}</TableCell>
                  <TableCell>
                    {installation.parameters.map(param => (
                      <div key={param.id}>{param.title}: {param.value} {param.unit}</div>
                    ))}
                  </TableCell>
                  <TableCell>
                    {installation.doctor ? 
                      `Dr. ${installation.doctor.user.firstName} ${installation.doctor.user.lastName}` : 
                      'N/A'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="text-center py-4 text-muted-foreground">Aucune installation trouvée</p>
        )}
      </CardContent>
    </Card>
  );
}

export default InstallationsHistory;
