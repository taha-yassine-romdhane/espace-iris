import { RepairLog } from './RepairLog';
import { Product } from './Product';

export interface RepairSparePart {
  id: string;
  repairId: string;
  repair: RepairLog;
  productId: string;
  product: Product;
  quantity: number;
  createdAt: Date;
  updatedAt: Date;
}
