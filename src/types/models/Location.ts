import { RepairLog } from './RepairLog';

export interface Location {
  id: string;
  name: string;
  address?: string;
  type: string;
  createdAt: Date;
  updatedAt: Date;
  repairs?: RepairLog[];
}
