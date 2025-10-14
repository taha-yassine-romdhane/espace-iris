import * as fs from 'fs';
import { DeviceStatus, StockStatus } from '@prisma/client';

const CLEANED_DEVICES_FILE = './public/excell/json-data/devices-cleaned.json';
const PRISMA_READY_FILE = './public/excell/json-data/devices-prisma-ready.json';

interface CleanedDevice {
  id: string;
  type: string;
  category: string;
  brand: string;
  model: string;
  serialNumber: string;
  status: string;
  currentLocation: string;
  currentPatientId: string | null;
  currentPatientName: string | null;
  assignedTechnician: string | null;
  usage: {
    hours: number;
    lastReading: string;
    unit: string;
  };
  maintenance: {
    lastServiceDate: string | null;
    nextServiceDate: string | null;
    serviceHistory: any[];
  };
  acquisition: {
    purchaseDate: string | null;
    purchasePrice: number | null;
    supplier: string | null;
    warrantyExpiry: string | null;
  };
  rental: {
    dailyRate: number | null;
    monthlyRate: number | null;
    depositAmount: number | null;
    currentRentalStart: string | null;
    currentRentalEnd: string | null;
  };
  notes: string | null;
  metadata: {
    createdAt: string;
    updatedAt: string;
    lastCheckIn: string | null;
    lastCheckOut: string | null;
  };
}

interface PrismaDevice {
  id: string;
  name: string;
  type: string;
  brand?: string;
  model?: string;
  serialNumber?: string;
  description?: string;
  technicalSpecs?: string;
  configuration?: string;
  warranty?: string;
  maintenanceInterval?: string;
  purchasePrice?: number;
  sellingPrice?: number;
  rentalPrice?: number;
  status: DeviceStatus;
  destination: StockStatus;
  stockLocationId?: string;
  stockQuantity: number;
  location?: string;
  reservedUntil?: string | null;
  requiresMaintenance: boolean;
  installationDate?: string | null;
  patientId?: string;
  companyId?: string;
  createdAt?: string;
  updatedAt?: string;
}

function mapStatusToPrisma(status: string): DeviceStatus {
  switch (status) {
    case 'AVAILABLE':
      return 'ACTIVE';
    case 'RENTED':
      return 'ACTIVE'; // Active but in use
    case 'MAINTENANCE':
      return 'MAINTENANCE';
    case 'RETIRED':
      return 'RETIRED';
    case 'LOST':
      return 'RETIRED'; // Lost devices should be retired
    default:
      return 'ACTIVE';
  }
}

function mapDestinationToPrisma(status: string, hasPatient: boolean): StockStatus {
  if (status === 'RENTED' || hasPatient) {
    return 'FOR_RENT';
  }
  if (status === 'MAINTENANCE') {
    return 'IN_REPAIR';
  }
  if (status === 'RETIRED' || status === 'LOST') {
    return 'OUT_OF_SERVICE';
  }
  return 'FOR_RENT'; // Default to rental equipment
}

function generateDeviceName(device: CleanedDevice): string {
  // Create a descriptive name from brand, model, and type
  const parts = [];
  
  if (device.brand && device.brand !== 'UNKNOWN') {
    parts.push(device.brand);
  }
  if (device.model && device.model !== 'UNKNOWN') {
    parts.push(device.model);
  }
  if (parts.length === 0) {
    parts.push(device.type);
  }
  
  // Add serial number suffix for uniqueness
  if (device.serialNumber) {
    const lastDigits = device.serialNumber.slice(-4);
    parts.push(`(${lastDigits})`);
  }
  
  return parts.join(' ').trim();
}

function determineMaintenanceInterval(type: string, usageHours: number): string {
  // Based on device type and usage, suggest maintenance interval
  const baseIntervals = {
    'CPAP': 2000,     // Every 2000 hours
    'VNI': 1500,      // Every 1500 hours
    'OXYGEN': 3000,   // Every 3000 hours
    'OTHER': 2500     // Default
  };
  
  const interval = baseIntervals[type as keyof typeof baseIntervals] || 2500;
  const months = Math.floor(interval / 730); // Approx hours per month
  
  return `Every ${months} months or ${interval} hours`;
}

function calculateSellingPrice(purchasePrice: number | null): number | null {
  // Estimate selling price as 80% of purchase price (depreciation)
  return purchasePrice ? Math.round(purchasePrice * 0.8) : null;
}

async function mapDevicesToPrismaSchema() {
  try {
    console.log('📖 Reading cleaned devices data...');
    const cleanedDevices: CleanedDevice[] = JSON.parse(
      fs.readFileSync(CLEANED_DEVICES_FILE, 'utf-8')
    );
    
    console.log(`Found ${cleanedDevices.length} cleaned devices`);
    
    console.log('🔄 Mapping to Prisma schema...');
    const prismaDevices: PrismaDevice[] = cleanedDevices.map(device => {
      const hasPatient = !!device.currentPatientId;
      const requiresMaintenance = device.usage.hours > 1000;
      
      const prismaDevice: PrismaDevice = {
        id: device.id,
        name: generateDeviceName(device),
        type: device.category || device.type,
        brand: device.brand !== 'UNKNOWN' ? device.brand : undefined,
        model: device.model !== 'UNKNOWN' ? device.model : undefined,
        serialNumber: device.serialNumber || undefined,
        description: `${device.type} device - ${device.category}`,
        technicalSpecs: JSON.stringify({
          usageHours: device.usage.hours,
          lastReading: device.usage.lastReading
        }),
        configuration: device.notes || undefined,
        warranty: device.acquisition.warrantyExpiry || undefined,
        maintenanceInterval: determineMaintenanceInterval(device.type, device.usage.hours),
        purchasePrice: device.acquisition.purchasePrice || undefined,
        sellingPrice: calculateSellingPrice(device.acquisition.purchasePrice),
        rentalPrice: device.rental.monthlyRate || undefined,
        status: mapStatusToPrisma(device.status),
        destination: mapDestinationToPrisma(device.status, hasPatient),
        stockQuantity: 1, // Each device is unique
        location: device.currentLocation || undefined,
        reservedUntil: device.rental.currentRentalEnd || undefined,
        requiresMaintenance,
        installationDate: device.rental.currentRentalStart || undefined,
        patientId: device.currentPatientId || undefined,
        companyId: undefined, // No company data in source
        createdAt: device.metadata.createdAt,
        updatedAt: device.metadata.updatedAt
      };
      
      // Clean undefined values for cleaner JSON
      Object.keys(prismaDevice).forEach(key => {
        if (prismaDevice[key as keyof PrismaDevice] === undefined) {
          delete prismaDevice[key as keyof PrismaDevice];
        }
      });
      
      return prismaDevice;
    });
    
    // Save Prisma-ready data
    console.log('💾 Saving Prisma-ready data...');
    fs.writeFileSync(
      PRISMA_READY_FILE,
      JSON.stringify(prismaDevices, null, 2),
      'utf-8'
    );
    
    // Generate statistics
    const stats = {
      total: prismaDevices.length,
      withPatients: prismaDevices.filter(d => d.patientId).length,
      requireMaintenance: prismaDevices.filter(d => d.requiresMaintenance).length,
      byStatus: {
        active: prismaDevices.filter(d => d.status === 'ACTIVE').length,
        maintenance: prismaDevices.filter(d => d.status === 'MAINTENANCE').length,
        retired: prismaDevices.filter(d => d.status === 'RETIRED').length
      },
      byDestination: {
        forRent: prismaDevices.filter(d => d.destination === 'FOR_RENT').length,
        forSale: prismaDevices.filter(d => d.destination === 'FOR_SALE').length,
        inRepair: prismaDevices.filter(d => d.destination === 'IN_REPAIR').length,
        outOfService: prismaDevices.filter(d => d.destination === 'OUT_OF_SERVICE').length
      }
    };
    
    console.log('\n📊 Mapping Statistics:');
    console.log(`  Total Devices: ${stats.total}`);
    console.log(`  With Patients: ${stats.withPatients}`);
    console.log(`  Need Maintenance: ${stats.requireMaintenance}`);
    console.log(`  Status: Active(${stats.byStatus.active}), Maintenance(${stats.byStatus.maintenance}), Retired(${stats.byStatus.retired})`);
    console.log(`  Destination: Rent(${stats.byDestination.forRent}), Sale(${stats.byDestination.forSale}), Repair(${stats.byDestination.inRepair}), Out(${stats.byDestination.outOfService})`);
    
    console.log('\n✅ Devices mapped to Prisma schema successfully!');
    console.log(`📁 Prisma-ready file saved to: ${PRISMA_READY_FILE}`);
    
    // Show sample
    console.log('\n📋 Sample Prisma-ready device:');
    console.log(JSON.stringify(prismaDevices[0], null, 2));
    
    return prismaDevices;
    
  } catch (error) {
    console.error('❌ Error mapping devices to Prisma schema:', error);
    throw error;
  }
}

if (require.main === module) {
  mapDevicesToPrismaSchema()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { mapDevicesToPrismaSchema };