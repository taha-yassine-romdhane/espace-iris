import { User } from './User';
import { Patient } from './Patient';
import { Appointment } from './Appointment';

export interface Doctor {
  id: string;
  userId: string;
  user: User;
  patients?: Patient[];
  appointments?: Appointment[];
  createdAt: Date;
  updatedAt: Date;
}
