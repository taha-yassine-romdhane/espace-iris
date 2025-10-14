import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface RepairHistoryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  medicalDeviceId: string;
}

interface Repair {
  id: string;
  repairDate: string;
  repairCost: number;
  notes: string;
  location: {
    name: string;
  };
  technician: {
    user: {
      firstName: string;
      lastName: string;
    };
  };
  medicalDevice: {
    name: string;
    brand: string | null;
    model: string | null;
    serialNumber: string;
  };
}

export function RepairHistoryDialog({
  isOpen,
  onClose,
  medicalDeviceId,
}: RepairHistoryDialogProps) {
  // Fetch repair history for the device
  const { data: repairs, isLoading } = useQuery<Repair[]>({
    queryKey: ["repairs", medicalDeviceId],
    queryFn: async () => {
      const response = await fetch(`/api/repairs?medicalDeviceId=${medicalDeviceId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch repair history");
      }
      return response.json();
    },
    enabled: isOpen, // Only fetch when dialog is open
  });

  const deviceName =
    repairs && repairs.length > 0 ? repairs[0].medicalDevice.name : "";
  const deviceInfo =
    repairs && repairs.length > 0
      ? `${repairs[0].medicalDevice.brand || ""} ${
          repairs[0].medicalDevice.model || ""
        } (S/N: ${repairs[0].medicalDevice.serialNumber})`.trim()
      : "";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>
            Historique des Réparations: {deviceName}
          </DialogTitle>
          {deviceInfo && (
            <p className="text-sm text-muted-foreground">{deviceInfo}</p>
          )}
        </DialogHeader>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            Chargement...
          </div>
        ) : repairs && repairs.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Technicien</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Coût</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {repairs.map((repair) => (
                <TableRow key={repair.id}>
                  <TableCell>
                    {format(new Date(repair.repairDate), "dd MMMM yyyy", { locale: fr })}
                  </TableCell>
                  <TableCell>
                    {repair.technician.user.firstName} {repair.technician.user.lastName}
                  </TableCell>
                  <TableCell>{repair.location.name}</TableCell>
                  <TableCell>{repair.repairCost} DT</TableCell>
                  <TableCell>{repair.notes}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            Aucune réparation trouvée pour cet appareil
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default RepairHistoryDialog;
