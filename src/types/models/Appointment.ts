import { Doctor } from './Doctor';
import { Patient } from './Patient';
import { Company } from './Company';

export interface Appointment {
  id: string;
  appointmentCode?: string;
  doctorId: string;
  doctor: Doctor;
  patientId: string;
  patient: Patient;
  date: Date;
  notes?: string;
  companyId?: string;
  company?: Company;
  createdAt: Date;
  updatedAt: Date;
}
