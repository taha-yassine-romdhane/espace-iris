import { Patient } from './Patient';
import { Company } from './Company';

export interface File {
  id: string;
  url: string;
  type: string; // IMAGE, DOCUMENT, etc.
  patientId?: string;
  patient?: Patient;
  companyId?: string;
  company?: Company;
  createdAt: Date;
  updatedAt: Date;
}
