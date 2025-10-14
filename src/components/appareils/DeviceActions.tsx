import React, { useState } from 'react';
import { MedicalDevice } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  ClipboardIcon, 
  WrenchIcon, 
  UserIcon, 
  Pencil
} from 'lucide-react';
import { RepairDeviceDialog } from './dialogs/RepairDeviceDialog';
import { EditDeviceDialog } from './dialogs/EditDeviceDialog';
import { AssignDeviceDialog } from './dialogs/AssignDeviceDialog';
import { useRouter } from 'next/router';

interface DeviceActionsProps {
  device: MedicalDevice;
  stockLocations: Array<{ id: string; name: string }>;
}

export const DeviceActions: React.FC<DeviceActionsProps> = ({ device, stockLocations }) => {
  const router = useRouter();
  const [isRepairDialogOpen, setIsRepairDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);

  const handleSuccess = () => {
    router.reload();
  };

  return (
    <>
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            {(device.type.toUpperCase().includes('DIAGNOSTIC') || device.type === 'DIAGNOSTIC_DEVICE') && (
              <Button 
                variant="outline" 
                className="flex items-center justify-center gap-2 bg-blue-50 hover:bg-blue-100 border-blue-200"
                onClick={() => router.push(`/roles/admin/diagnostics/new?deviceId=${device.id}`)}
              >
                <ClipboardIcon className="h-4 w-4 text-blue-600" />
                <span className="text-blue-700 font-medium">Nouveau diagnostic</span>
              </Button>
            )}
            
            <Button 
              variant="outline" 
              className="flex items-center justify-center gap-2"
              onClick={() => setIsRepairDialogOpen(true)}
            >
              <WrenchIcon className="h-4 w-4" />
              <span>Maintenance</span>
            </Button>
            
            <Button 
              variant="outline" 
              className="flex items-center justify-center gap-2"
              onClick={() => setIsEditDialogOpen(true)}
            >
              <Pencil className="h-4 w-4" />
              <span>Modifier</span>
            </Button>
            
            {!device.patientId && !device.companyId && (
              <Button 
                variant="outline" 
                className="flex items-center justify-center gap-2"
                onClick={() => setIsAssignDialogOpen(true)}
              >
                <UserIcon className="h-4 w-4" />
                <span>Assigner</span>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <RepairDeviceDialog 
        isOpen={isRepairDialogOpen}
        onOpenChange={setIsRepairDialogOpen}
        device={device}
        onSuccess={handleSuccess}
      />

      <EditDeviceDialog 
        isOpen={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        device={device}
        onSuccess={handleSuccess}
        stockLocations={stockLocations}
      />

      <AssignDeviceDialog
        isOpen={isAssignDialogOpen}
        onOpenChange={setIsAssignDialogOpen}
        device={device}
        onSuccess={handleSuccess}
      />
    </>
  );
};

export default DeviceActions;
