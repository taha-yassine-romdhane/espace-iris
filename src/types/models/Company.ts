import { User } from './User';
import { File } from './File';
import { MedicalDevice } from './MedicalDevice';
import { Payment } from './Payment';
import { Diagnostic } from './Diagnostic';
import { Appointment } from './Appointment';
import { Rental } from './Rental';
import { Notification } from './Notification';

export interface Company {
  id: string;
  companyCode?: string;
  companyName: string;
  telephone: string;
  telephoneSecondaire?: string;
  address?: string;
  taxId?: string; // Matricule Fiscale
  generalNote?: string;
  technicianId?: string;
  technician?: User;
  assignedTo: User;
  userId: string;
  files?: File[];
  medicalDevices?: MedicalDevice[];
  payments?: Payment[];
  diagnostics?: Diagnostic[];
  appointments?: Appointment[];
  rentals?: Rental[];
  notifications?: Notification[];
  createdAt: Date;
  updatedAt: Date;
}
