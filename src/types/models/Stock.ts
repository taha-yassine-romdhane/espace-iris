import { StockStatus } from '../enums';
import { StockLocation } from './StockLocation';
import { Product } from './Product';

export interface Stock {
  id: string;
  locationId: string;
  location: StockLocation;
  productId: string;
  product: Product;
  quantity: number;
  status: StockStatus;
  createdAt: Date;
  updatedAt: Date;
}
