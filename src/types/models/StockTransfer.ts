import { StockStatus } from '../enums';
import { StockLocation } from './StockLocation';
import { Product } from './Product';
import { User } from './User';

export interface StockTransfer {
  id: string;
  fromLocationId: string;
  fromLocation: StockLocation;
  toLocationId: string;
  toLocation: StockLocation;
  productId: string;
  product: Product;
  quantity: number;
  newStatus?: StockStatus;
  
  transferredById: string;
  transferredBy: User;
  
  sentById?: string;
  sentBy?: User;
  
  receivedById?: string;
  receivedBy?: User;
  
  notes?: string;
  transferDate: Date;
  updatedAt: Date;
  isVerified?: boolean;
  verifiedById?: string;
  verifiedBy?: User;
  verificationDate?: Date;
}
