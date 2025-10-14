const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixDeviceCodes() {
  try {
    console.log('🚀 Starting device codes fix...\n');
    
    // Get all devices that have APP codes as IDs
    const devicesWithAppIds = await prisma.medicalDevice.findMany({
      where: {
        id: {
          startsWith: 'APP'
        }
      },
      select: {
        id: true,
        name: true,
        serialNumber: true
      }
    });
    
    console.log(`📊 Found ${devicesWithAppIds.length} devices with APP codes as IDs\n`);
    
    // Track statistics
    const stats = {
      successful: 0,
      failed: 0,
      errors: []
    };
    
    for (const device of devicesWithAppIds) {
      try {
        // The current ID (like APP0001) should become the deviceCode
        const deviceCode = device.id;
        
        console.log(`🔧 Fixing device: ${device.name} (${deviceCode})`);
        
        // We need to:
        // 1. Create a new device with proper UUID and deviceCode
        // 2. Update all references to point to the new ID  
        // 3. Delete the old device
        
        await prisma.$transaction(async (tx) => {
          // Step 1: Create new device with proper UUID
          const newDevice = await tx.medicalDevice.create({
            data: {
              deviceCode: deviceCode,
              name: device.name,
              type: 'MEDICAL_DEVICE', // We know they're all medical devices from our previous fix
              serialNumber: device.serialNumber,
              brand: null, // Will be updated from original device data
              model: null,
              description: null,
              technicalSpecs: null,
              maintenanceInterval: null,
              sellingPrice: null,
              rentalPrice: null,
              status: 'ACTIVE',
              destination: 'FOR_RENT',
              stockQuantity: 1,
              location: null,
              requiresMaintenance: false,
              stockLocationId: 'cme1l3vrz0005oakj69smie3y', // Default stock location
              createdAt: new Date(),
              updatedAt: new Date()
            }
          });
          
          // Step 2: Get the original device with all its data
          const originalDevice = await tx.medicalDevice.findUnique({
            where: { id: deviceCode }
          });
          
          if (originalDevice) {
            // Update the new device with the original device's data
            await tx.medicalDevice.update({
              where: { id: newDevice.id },
              data: {
                name: originalDevice.name,
                brand: originalDevice.brand,
                model: originalDevice.model,
                description: originalDevice.description,
                technicalSpecs: originalDevice.technicalSpecs,
                maintenanceInterval: originalDevice.maintenanceInterval,
                sellingPrice: originalDevice.sellingPrice,
                rentalPrice: originalDevice.rentalPrice,
                status: originalDevice.status,
                destination: originalDevice.destination,
                stockQuantity: originalDevice.stockQuantity,
                requiresMaintenance: originalDevice.requiresMaintenance,
                stockLocationId: originalDevice.stockLocationId,
                patientId: originalDevice.patientId,
                companyId: originalDevice.companyId,
                installationDate: originalDevice.installationDate,
                configuration: originalDevice.configuration,
                purchasePrice: originalDevice.purchasePrice,
                warranty: originalDevice.warranty,
                reservedUntil: originalDevice.reservedUntil,
                createdAt: originalDevice.createdAt,
                updatedAt: new Date()
              }
            });
            
            // Step 3: Update all references to this device
            
            // Update MedicalDeviceParametre references
            await tx.medicalDeviceParametre.updateMany({
              where: { deviceId: deviceCode },
              data: { deviceId: newDevice.id }
            });
            
            // Update Rental references
            await tx.rental.updateMany({
              where: { medicalDeviceId: deviceCode },
              data: { medicalDeviceId: newDevice.id }
            });
            
            // Update Diagnostic references
            await tx.diagnostic.updateMany({
              where: { medicalDeviceId: deviceCode },
              data: { medicalDeviceId: newDevice.id }
            });
            
            // Update RepairLog references
            await tx.repairLog.updateMany({
              where: { medicalDeviceId: deviceCode },
              data: { medicalDeviceId: newDevice.id }
            });
            
            // Update SaleItem references  
            await tx.saleItem.updateMany({
              where: { medicalDeviceId: deviceCode },
              data: { medicalDeviceId: newDevice.id }
            });
            
            // Update StockTransferRequest references
            await tx.stockTransferRequest.updateMany({
              where: { medicalDeviceId: deviceCode },
              data: { medicalDeviceId: newDevice.id }
            });
          }
          
          // Step 4: Delete the old device
          await tx.medicalDevice.delete({
            where: { id: deviceCode }
          });
        });
        
        stats.successful++;
        console.log(`✅ Fixed device: ${deviceCode} → New UUID with deviceCode`);
        
      } catch (error) {
        stats.failed++;
        stats.errors.push({
          deviceCode: device.id,
          deviceName: device.name,
          error: error.message
        });
        console.error(`❌ Failed to fix device: ${device.id} (${device.name})`);
        console.error(`   Error: ${error.message}`);
      }
    }
    
    // Print final statistics
    console.log('\n' + '='.repeat(50));
    console.log('📊 DEVICE CODES FIX COMPLETE');
    console.log('='.repeat(50));
    console.log(`✅ Successfully fixed: ${stats.successful} devices`);
    console.log(`❌ Failed: ${stats.failed} devices`);
    
    if (stats.errors.length > 0) {
      console.log('\n❌ ERRORS:');
      stats.errors.forEach(err => {
        console.log(`   - ${err.deviceCode} (${err.deviceName})`);
        console.log(`     ${err.error}`);
      });
    }
    
    // Verify results
    const devicesWithCodes = await prisma.medicalDevice.count({
      where: {
        deviceCode: {
          not: null
        }
      }
    });
    
    const totalDevices = await prisma.medicalDevice.count();
    
    console.log(`\n📈 Devices with device codes: ${devicesWithCodes}`);
    console.log(`📈 Total devices in database: ${totalDevices}`);
    
    // Show some sample fixed devices
    const sampleDevices = await prisma.medicalDevice.findMany({
      take: 5,
      where: {
        deviceCode: {
          not: null
        }
      },
      select: {
        id: true,
        deviceCode: true,
        name: true,
        serialNumber: true
      },
      orderBy: {
        deviceCode: 'asc'
      }
    });
    
    console.log('\n📋 Sample fixed devices:');
    sampleDevices.forEach(device => {
      console.log(`   - ${device.deviceCode}: ${device.name}`);
      console.log(`     ID: ${device.id}, Serial: ${device.serialNumber}`);
    });
    
  } catch (error) {
    console.error('❌ Fatal error during fix:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the fix
fixDeviceCodes()
  .then(() => {
    console.log('\n✅ Device codes fix completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Fix process failed:', error);
    process.exit(1);
  });