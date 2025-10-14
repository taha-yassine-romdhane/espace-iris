import { User } from './User';
import { Patient } from './Patient';
import { Company } from './Company';
import { Payment } from './Payment';
import { SaleItem } from './SaleItem';

export interface Sale {
  id: string;
  saleCode?: string;
  invoiceNumber?: string;
  saleDate: Date;
  totalAmount: string | number;
  discount?: string | number;
  finalAmount: string | number;
  status: string; // SaleStatus enum: PENDING, ON_PROGRESS, COMPLETED, CANCELLED, RETURNED, PARTIALLY_RETURNED
  notes?: string;
  
  // Who processed the sale
  processedById: string;
  processedBy: User;
  
  // Who purchased (either patient or company)
  patientId?: string;
  patient?: Patient;
  companyId?: string;
  company?: Company;
  
  // Payment information
  paymentId?: string;
  payment?: Payment;
  
  // Line items
  items: SaleItem[];
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}
