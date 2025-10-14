import { PaymentMethod, PaymentStatus } from '../enums';
import { Company } from './Company';
import { Patient } from './Patient';
import { Rental } from './Rental';

export interface Payment {
  id: string;
  paymentCode?: string;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  chequeNumber?: string;
  bankName?: string;
  guaranteeAmount?: number;
  companyId?: string;
  company?: Company;
  patientId?: string;
  patient?: Patient;
  rentalId?: string;
  rental?: Rental;
  createdAt: Date;
  updatedAt: Date;
}
