import { NotificationType, NotificationStatus } from '../enums';
import { Patient } from './Patient';
import { Company } from './Company';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  status: NotificationStatus;
  dueDate?: Date;
  patientId?: string;
  patient?: Patient;
  companyId?: string;
  company?: Company;
  createdAt: Date;
  updatedAt: Date;
}
