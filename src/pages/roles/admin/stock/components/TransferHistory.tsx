import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Info, AlertCircle, CheckCircle, XCircle, Clock } from 'lucide-react';
import TransferDetailDialog from './TransferDetailDialog';
import TransferVerificationStatus from './TransferVerificationStatus';

interface Transfer {
  id: string;
  fromLocation: {
    name: string;
  };
  toLocation: {
    name: string;
  };
  product: {
    id: string;
    name: string;
    type: string;
    brand: string | null;
    model: string | null;
  };
  quantity: number;
  newStatus: string | null;
  transferredBy: {
    firstName: string;
    lastName: string;
    role: string;
  };
  sentBy: {
    firstName: string;
    lastName: string;
  } | null;
  receivedBy: {
    firstName: string;
    lastName: string;
  } | null;
  notes: string | null;
  transferDate: string;
  metadata: any | null; // For medical device transfers
  
  // Verification fields
  isVerified: boolean | null;
  verifiedById: string | null;
  verifiedBy: {
    firstName: string;
    lastName: string;
  } | null;
  verificationDate: string | null;
}

// Helper function to convert product type codes to readable names
const getProductTypeName = (type: string) => {
  switch (type) {
    case 'MEDICAL_DEVICE':
      return 'Appareil médical';
    case 'DIAGNOSTIC_DEVICE':
      return 'Équipement diagnostic';
    case 'ACCESSORY':
      return 'Accessoire';
    case 'SPARE_PART':
      return 'Pièce de rechange';
    default:
      return type;
  }
};

export default function TransferHistory() {
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setDate(new Date().getDate() - 30)), // Last 30 days
    end: new Date(),
  });
  const [selectedTransferId, setSelectedTransferId] = useState<string | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  
  // Current user role - in a real app, this would come from an auth context
  // For now, we'll assume the user is an admin in the admin section
  const currentUserRole = 'ADMIN';

  const { data: locations } = useQuery({
    queryKey: ['stockLocations'],
    queryFn: async () => {
      const response = await fetch('/api/stock/locations');
      if (!response.ok) throw new Error('Failed to fetch locations');
      return response.json();
    }
  });

  const { data: transfers, isLoading } = useQuery<Transfer[]>({
    queryKey: ['transfers', selectedLocation, searchQuery, dateRange],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate: dateRange.start.toISOString(),
        endDate: dateRange.end.toISOString(),
      });
      if (selectedLocation !== 'all') {
        params.append('locationId', selectedLocation);
      }
      if (searchQuery) {
        params.append('search', searchQuery);
      }
      const response = await fetch(`/api/stock/transfers/history?${params}`);
      if (!response.ok) throw new Error('Failed to fetch transfers');
      return response.json();
    }
  });

  const getStatusBadge = (status: string | null) => {
    if (!status) return null;
    switch (status) {
      case 'FOR_SALE':
        return <Badge variant="default">En vente</Badge>;
      case 'RESERVE':
        return <Badge variant="secondary">Réservé</Badge>;
      case 'DEFECTUEUX':
        return <Badge variant="destructive">Défectueux</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  if (isLoading) {
    return <div>Chargement...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Historique des Transferts</h2>
      </div>

      <div className="flex gap-4 items-center">
        <div className="w-[200px]">
          <Select value={selectedLocation} onValueChange={setSelectedLocation}>
            <SelectTrigger>
              <SelectValue placeholder="Sélectionner un emplacement" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les emplacements</SelectItem>
              {locations?.map((location: { id: string; name: string }) => (
                <SelectItem key={location.id} value={location.id}>
                  {location.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1">
          <Input
            placeholder="Rechercher un produit..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="w-[150px]">
          <Input
            type="date"
            value={format(dateRange.start, 'yyyy-MM-dd')}
            onChange={(e) => setDateRange({ ...dateRange, start: new Date(e.target.value) })}
          />
        </div>
        <div className="w-[150px]">
          <Input
            type="date"
            value={format(dateRange.end, 'yyyy-MM-dd')}
            onChange={(e) => setDateRange({ ...dateRange, end: new Date(e.target.value) })}
          />
        </div>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Produit</TableHead>
              <TableHead>De</TableHead>
              <TableHead>Vers</TableHead>
              <TableHead>Quantité</TableHead>
              <TableHead>Nouveau Statut</TableHead>
              <TableHead>Initié par</TableHead>
              <TableHead>Vérification</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transfers?.map((transfer) => (
              <TableRow key={transfer.id}>
                <TableCell>
                  {format(new Date(transfer.transferDate), 'dd/MM/yyyy HH:mm', { locale: fr })}
                </TableCell>
                <TableCell className="font-medium">
                  <div>
                    <div>{transfer.product.name}</div>
                    <div className="text-sm text-gray-500">
                      {[transfer.product.brand, transfer.product.model].filter(Boolean).join(' ')}
                      <Badge variant="outline">{getProductTypeName(transfer.product.type)}</Badge>
                    </div>
                    {/* If this is a medical device transfer, it will have a note with the device ID */}
                    {transfer.notes?.includes('Device ID:') && (
                      <div className="text-xs text-blue-600 mt-1">
                        Appareil médical transféré
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell>{transfer.fromLocation.name}</TableCell>
                <TableCell>{transfer.toLocation.name}</TableCell>
                <TableCell>{transfer.quantity}</TableCell>
                <TableCell>{getStatusBadge(transfer.newStatus)}</TableCell>
                <TableCell>
                  {transfer.transferredBy.firstName} {transfer.transferredBy.lastName}
                </TableCell>
                <TableCell>
                  <TransferVerificationStatus
                    transferId={transfer.id}
                    isVerified={transfer.isVerified}
                    verifiedById={transfer.verifiedById}
                    verifierName={transfer.verifiedBy ? `${transfer.verifiedBy.firstName} ${transfer.verifiedBy.lastName}` : null}
                    verificationDate={transfer.verificationDate ? new Date(transfer.verificationDate) : null}
                    transferredByRole={transfer.transferredBy.role}
                    currentUserRole={currentUserRole}
                    transferDate={new Date(transfer.transferDate)}
                  />
                </TableCell>
                <TableCell>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => {
                      setSelectedTransferId(transfer.id);
                      setDetailDialogOpen(true);
                    }}
                  >
                    <Info className="h-4 w-4 mr-1" />
                    Détails
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {transfers?.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-4">
                  Aucun transfert trouvé
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      
      {/* Transfer Detail Dialog */}
      {selectedTransferId && (
        <TransferDetailDialog
          transferId={selectedTransferId}
          isOpen={detailDialogOpen}
          onClose={() => setDetailDialogOpen(false)}
          currentUserRole={currentUserRole}
        />
      )}
    </div>
  );
}
