import { DeviceStatus } from '../enums';
import { StockLocation } from './StockLocation';
import { Patient } from './Patient';
import { Company } from './Company';
import { Diagnostic } from './Diagnostic';
import { Rental } from './Rental';
import { RepairLog } from './RepairLog';
import { MedicalDeviceParametre } from './MedicalDeviceParametre';
import { SaleItem } from './SaleItem';

export interface MedicalDevice {
  id: string;
  name: string;
  type: string; // CPAP, DIAGNOSTIC_DEVICE, etc.
  brand?: string;
  model?: string;
  serialNumber?: string;
  description?: string;
  technicalSpecs?: string;
  configuration?: string;
  warranty?: string;
  maintenanceInterval?: string;
  purchasePrice?: string | number;
  sellingPrice?: string | number;
  rentalPrice?: string | number;
  stockLocationId?: string;
  stockLocation?: StockLocation;
  stockQuantity: number;
  status: DeviceStatus;
  availableForRent: boolean;
  requiresMaintenance: boolean;
  installationDate?: Date;
  reservedUntil?: Date;
  location?: string;

  deviceParameters?: MedicalDeviceParametre[];
  patientId?: string;
  patient?: Patient;
  companyId?: string;
  company?: Company;
  diagnostics?: Diagnostic[];
  rentals?: Rental[];
  repairLogs?: RepairLog[];
  saleItems?: SaleItem[];
  createdAt: Date;
  updatedAt: Date;
}
