import { Sale } from './Sale';
import { Product } from './Product';
import { MedicalDevice } from './MedicalDevice';

export interface SaleItem {
  id: string;
  
  // Sale this item belongs to
  saleId: string;
  sale: Sale;
  
  // Product OR MedicalDevice
  productId?: string;
  product?: Product;
  medicalDeviceId?: string;
  medicalDevice?: MedicalDevice;
  
  // Item details
  quantity: number;
  unitPrice: string | number;
  discount?: string | number;
  itemTotal: string | number;
  serialNumber?: string;
  warranty?: string;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}
