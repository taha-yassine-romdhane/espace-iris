import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { MedicalDeviceForm } from "../forms/MedicalDeviceForm";
import { MedicalDevice } from "@prisma/client";

interface EditDeviceDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  device: MedicalDevice | null;
  onSuccess: () => void;
  stockLocations: Array<{ id: string; name: string }>;
}

export function EditDeviceDialog({
  isOpen,
  onOpenChange,
  device,
  onSuccess,
  stockLocations,
}: EditDeviceDialogProps) {
  if (!device) {
    return null;
  }

  const handleSuccess = () => {
    onSuccess();
    onOpenChange(false);
  };

  const handleSubmit = async (data: any) => {
    try {
      const response = await fetch(`/api/medical-devices/${device.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Failed to update device');
      }
      
      handleSuccess();
    } catch (error) {
      console.error("Failed to update device:", error);
      // You might want to show a toast notification here
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[800px] max-h-[90vh] rounded-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Modifier l'appareil</DialogTitle>
          <DialogDescription>
            Mettez à jour les informations de l'appareil.
          </DialogDescription>
        </DialogHeader>
        <MedicalDeviceForm
          initialData={device}
          onSubmit={handleSubmit}
          stockLocations={stockLocations}
          isEditMode={true}
        />
      </DialogContent>
    </Dialog>
  );
}

export default EditDeviceDialog;