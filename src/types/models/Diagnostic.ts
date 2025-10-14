import { MedicalDevice } from './MedicalDevice';
import { Patient } from './Patient';
import { Company } from './Company';
import { User } from './User';

export interface Diagnostic {
  id: string;
  diagnosticCode?: string;
  medicalDeviceId: string;
  medicalDevice: MedicalDevice;
  patientId: string;
  patient: Patient;
  result: string;
  notes?: string;
  diagnosticDate: Date;
  performedById?: string;
  performedBy?: User;
  followUpRequired: boolean;
  followUpDate?: Date;
  companyId?: string;
  company?: Company;
  createdAt: Date;
  updatedAt: Date;
}
