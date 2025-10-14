import { ProductType, DeviceStatus } from '../enums';
import { Stock } from './Stock';
import { StockTransfer } from './StockTransfer';
import { RepairSparePart } from './RepairSparePart';
import { StockLocation } from './StockLocation';
import { Patient } from './Patient';

export interface Product {
  id: string;
  name: string;
  type: ProductType;
  brand?: string;
  model?: string;
  purchasePrice?: number;
  sellingPrice?: number;
  serialNumber?: string;
  purchaseDate?: Date;
  warrantyExpiration?: Date;
  status: DeviceStatus;
  notes?: string;
  stocks?: Stock[];
  stockLocation?: StockLocation;
  stockLocationId?: string;
  transfers?: StockTransfer[];
  repairSpareParts?: RepairSparePart[];
  createdAt: Date;
  updatedAt: Date;
  reservedUntil?: Date | string | null;
    isReserved?: boolean;
  patient?: Patient;
}
