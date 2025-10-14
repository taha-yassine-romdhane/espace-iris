import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { RepairForm } from "../forms/RepairForm";
import { MedicalDevice } from "@prisma/client";

interface RepairDeviceDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  device: MedicalDevice | null;
  onSuccess: () => void;
}

export function RepairDeviceDialog({
  isOpen,
  onOpenChange,
  device,
  onSuccess,
}: RepairDeviceDialogProps) {
  if (!device) {
    return null;
  }

  const handleSuccess = () => {
    onSuccess();
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[600px] max-h-[800px] rounded-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Enregistrer une réparation</DialogTitle>
          <DialogDescription>
            Remplissez les détails de la réparation pour cet appareil.
          </DialogDescription>
        </DialogHeader>
        <RepairForm
          medicalDeviceId={device.id}
          productName={device.name}
          onSuccess={handleSuccess}
        />
      </DialogContent>
    </Dialog>
  );
}

export default RepairDeviceDialog;
