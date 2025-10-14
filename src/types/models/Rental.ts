import { MedicalDevice } from './MedicalDevice';
import { Patient } from './Patient';
import { Payment } from './Payment';
import { Company } from './Company';

export interface Rental {
  id: string;
  rentalCode?: string;
  medicalDeviceId: string;
  medicalDevice: MedicalDevice;
  patientId: string;
  patient: Patient;
  startDate: Date;
  endDate: Date;
  notes?: string;
  paymentId?: string;
  payment?: Payment;
  companyId?: string;
  company?: Company;
  createdAt: Date;
  updatedAt: Date;
}
