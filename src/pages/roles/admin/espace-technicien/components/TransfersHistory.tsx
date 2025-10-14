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

interface TransfersHistoryProps {
  technicianId: string;
}

interface StockTransfer {
  id: string;
  fromLocationId: string;
  fromLocation: {
    id: string;
    name: string;
  };
  toLocationId: string;
  toLocation: {
    id: string;
    name: string;
  };
  productId: string;
  product: {
    id: string;
    name: string;
    type: string;
    brand: string;
    model: string;
    serialNumber: string;
  };
  quantity: number;
  newStatus: string;
  transferredById: string;
  transferredBy: {
    id: string;
    firstName: string;
    lastName: string;
  };
  sentById: string;
  receivedById: string;
  notes: string;
  transferDate: string;
}

export function TransfersHistory({ technicianId }: TransfersHistoryProps) {
  const { data: transfers, isLoading, error } = useQuery({
    queryKey: ['technician-transfers', technicianId],
    queryFn: async () => {
      const response = await axios.get(`/api/technicians/${technicianId}/transfers`);
      return response.data as StockTransfer[];
    }
  });

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'dd/MM/yyyy', { locale: fr });
  };

  const getTransferReason = (transfer: StockTransfer) => {
    if (transfer.notes) {
      return transfer.notes;
    }
    
    if (transfer.toLocation.name.includes("Domicile") || 
        transfer.toLocation.name.includes("Patient")) {
      return "Installation";
    }
    
    if (transfer.toLocation.name.includes("Réparation") || 
        transfer.toLocation.name.includes("Maintenance")) {
      return "Maintenance";
    }
    
    if (transfer.fromLocation.name.includes("Domicile") || 
        transfer.fromLocation.name.includes("Patient")) {
      return "Récupération";
    }
    
    return "Transfert de stock";
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
          <p>Impossible de charger les transferts. Veuillez réessayer plus tard.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-medium">
          Historique des Transferts de Machines
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Suivi des déplacements d&apos;appareils entre différents lieux
        </p>
      </CardHeader>
      <CardContent>
        {transfers && transfers.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Appareil</TableHead>
                <TableHead>Numéro de série</TableHead>
                <TableHead>Lieu de départ</TableHead>
                <TableHead>Lieu d&apos;arrivée</TableHead>
                <TableHead>Raison</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transfers.map((transfer) => (
                <TableRow key={transfer.id}>
                  <TableCell>{formatDate(transfer.transferDate)}</TableCell>
                  <TableCell>
                    {transfer.product.name} {transfer.product.brand} {transfer.product.model}
                  </TableCell>
                  <TableCell>{transfer.product.serialNumber || 'N/A'}</TableCell>
                  <TableCell>{transfer.fromLocation.name}</TableCell>
                  <TableCell>{transfer.toLocation.name}</TableCell>
                  <TableCell>{getTransferReason(transfer)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="text-center py-4 text-muted-foreground">Aucun transfert trouvé</p>
        )}
      </CardContent>
    </Card>
  );
}

export default TransfersHistory;
