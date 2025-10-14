import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Product } from '@/types';
import {
  ParametreCPAPForm,
  ParametreVNIForm,
  ParametreConcentrateurForm,
  ParametreBouteilleForm,
  ParametreVIForm
} from '@/components/MedicaleDevicesParametreForms';

interface ParameterPreviewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  device: Product | null;
  parameters?: any; // This would be the MedicalDeviceParametre data if available
}

export function ParameterPreviewDialog({ 
  isOpen, 
  onClose, 
  device,
  parameters
}: ParameterPreviewDialogProps) {
  if (!device) return null;

  // Select the appropriate parameter form component based on the device name
  let ParamForm = null;
  if (device.name === 'CPAP') {
    ParamForm = ParametreCPAPForm;
  } else if (device.name === 'VNI') {
    ParamForm = ParametreVNIForm;
  } else if (device.name === 'Concentrateur O²') {
    ParamForm = ParametreConcentrateurForm;
  } else if (device.name === 'Bouteil O²') {
    ParamForm = ParametreBouteilleForm;
  } else if (device.name === 'Vi') {
    ParamForm = ParametreVIForm;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="text-blue-700">
            Paramètres de l'appareil
          </DialogTitle>
          <DialogDescription>
            {device.name} {device.brand && `- ${device.brand}`} {device.model && `${device.model}`} 
            {device.serialNumber && `(S/N: ${device.serialNumber})`}
          </DialogDescription>
        </DialogHeader>
        
        <div className="max-h-[70vh] overflow-y-auto mt-4">
          {ParamForm ? (
            <ParamForm 
              onSubmit={() => {}} 
              initialValues={parameters || {}} 
              readOnly={true}
            />
          ) : (
            <div className="p-4 text-center text-gray-500">
              Pas de paramètres disponibles pour ce type d'appareil
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default ParameterPreviewDialog;
