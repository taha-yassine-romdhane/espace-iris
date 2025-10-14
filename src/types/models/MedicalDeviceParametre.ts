import { MedicalDevice } from './MedicalDevice';
import { Patient } from './Patient';

export interface MedicalDeviceParametre {
  id: string;
  // Common fields
  deviceId: string;
  device: MedicalDevice;
  deviceType: string; // CPAP, VNI, Concentrateur O², Vi, Bouteil O²

  // CPAP & VNI fields
  pressionRampe?: string;
  dureeRampe?: number;
  autoRampe?: boolean;

  // CPAP fields
  pression?: string;
  autoPression?: boolean;
  dureeRampe2?: number;
  epr?: string;

  // VNI fields
  ipap?: string;
  epap?: string;
  aid?: string;
  frequenceRespiratoire?: string;
  volumeCourant?: string;
  mode?: string;

  // Concentrateur & Bouteille fields
  debit?: string;

  // Patient association
  patientId?: string;
  patient?: Patient;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}
