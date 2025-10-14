import { Patient } from './Patient';

export interface MedicalRecord {
  id: string;
  patientId: string;
  patient: Patient;
  diagnosis: string[];
  treatments: string[];
  notes?: string;
  updatedAt: Date;
}
