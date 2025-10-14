import { User } from './User';
import { Stock } from './Stock';
import { StockTransfer } from './StockTransfer';
import { MedicalDevice } from './MedicalDevice';
import { Product } from './Product';

export interface StockLocation {
  id: string;
  name: string;
  userId?: string;
  user?: User;
  description?: string;
  isActive: boolean;
  stocks?: Stock[];
  outgoingTransfers?: StockTransfer[];
  incomingTransfers?: StockTransfer[];
  medicalDevices?: MedicalDevice[];
  products?: Product[];
  createdAt: Date;
  updatedAt: Date;
}
