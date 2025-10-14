import { ActionType } from '../enums';
import { Patient } from './Patient';
import { User } from './User';

export interface PatientHistory {
  id: string;
  patientId: string;
  patient: Patient;
  actionType: ActionType;
  details: Record<string, unknown> | null; // JSON data
  relatedItemId?: string;
  relatedItemType?: string;
  performedById: string;
  performedBy: User;
  createdAt: Date;
  updatedAt: Date;
}
