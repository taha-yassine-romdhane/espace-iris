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
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface PaymentsHistoryProps {
  technicianId: string;
}

interface Payment {
  id: string;
  amount: number;
  method: "CNAM" | "CHEQUE" | "CASH";
  status: "PENDING" | "PAID" | "GUARANTEE" | "PARTIAL";
  createdAt: string;
  patientId?: string;
  patient?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  companyId?: string;
  company?: {
    id: string;
    companyName: string;
  };
  rentalId?: string;
  rental?: {
    id: string;
    medicalDeviceId: string;
    medicalDevice: {
      id: string;
      name: string;
      type: string;
    };
  };
  saleId?: string;
  sale?: {
    id: string;
    items: {
      id: string;
      medicalDeviceId?: string;
      medicalDevice?: {
        id: string;
        name: string;
        type: string;
      };
    }[];
  };
}

export function PaymentsHistory({ technicianId }: PaymentsHistoryProps) {
  const { data: payments, isLoading, error } = useQuery({
    queryKey: ['technician-payments', technicianId],
    queryFn: async () => {
      const response = await axios.get(`/api/technicians/${technicianId}/payments`);
      return response.data as Payment[];
    }
  });

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'dd/MM/yyyy', { locale: fr });
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'TND' }).format(amount);
  };

  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case 'PAID':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Payé</Badge>;
      case 'PENDING':
        return <Badge variant="destructive">En attente</Badge>;
      case 'GUARANTEE':
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Garantie</Badge>;
      case 'PARTIAL':
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Partiel</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getPaymentType = (payment: Payment) => {
    if (payment.rental) {
      return "Location";
    } else if (payment.sale) {
      return "Vente";
    }
    return "N/A";
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
          <p>Impossible de charger les paiements. Veuillez réessayer plus tard.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-medium">
          Historique des Paiements
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Suivi des paiements effectués
        </p>
      </CardHeader>
      <CardContent>
        {payments && payments.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Appareil</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Montant</TableHead>
                <TableHead>Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell>{formatDate(payment.createdAt)}</TableCell>
                  <TableCell>
                    {payment.patient 
                      ? `${payment.patient.firstName} ${payment.patient.lastName}` 
                      : payment.company 
                        ? payment.company.companyName 
                        : 'N/A'
                    }
                  </TableCell>
                  <TableCell>
                    {
                      payment.rental?.medicalDevice?.name ||
                      (payment.sale?.items && payment.sale.items.length > 0
                        ? payment.sale.items
                            .map((item) => item.medicalDevice?.name)
                            .filter(Boolean)
                            .join(', ') || 'N/A'
                        : 'N/A')
                    }
                  </TableCell>
                  <TableCell>{getPaymentType(payment)}</TableCell>
                  <TableCell>{formatAmount(payment.amount)}</TableCell>
                  <TableCell>
                    {getPaymentStatusBadge(payment.status)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="text-center py-4 text-muted-foreground">Aucun paiement trouvé</p>
        )}
      </CardContent>
    </Card>
  );
}

export default PaymentsHistory;
