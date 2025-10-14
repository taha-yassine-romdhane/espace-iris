import { User } from './User';
import { RepairLog } from './RepairLog';

export interface Technician {
  id: string;
  userId: string;
  user: User;
  specialty?: string;
  repairLogs?: RepairLog[];
  createdAt: Date;
  updatedAt: Date;
}
