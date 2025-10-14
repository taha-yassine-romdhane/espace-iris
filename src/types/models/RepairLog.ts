import { MedicalDevice } from './MedicalDevice';
import { Location } from './Location';
import { Technician } from './Technician';
import { RepairSparePart } from './RepairSparePart';

export interface RepairLog {
  id: string;
  repairCode?: string;
  medicalDeviceId: string;
  medicalDevice: MedicalDevice;
  repairCost: number;
  locationId: string;
  location: Location;
  repairDate: Date;
  notes?: string;
  technicianId?: string;
  technician?: Technician;
  spareParts?: RepairSparePart[];
  createdAt: Date;
  updatedAt: Date;
}
