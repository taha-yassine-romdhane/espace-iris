const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function importMedicalDevices() {
  try {
    console.log('🚀 Starting medical devices import...\n');
    
    // Read the devices data
    const dataPath = path.join(__dirname, '../public/excell/json-data/devices-prisma-ready.json');
    const rawData = fs.readFileSync(dataPath, 'utf8');
    const devices = JSON.parse(rawData);
    
    console.log(`📊 Found ${devices.length} medical devices to import\n`);
    
    // Track import statistics
    const stats = {
      successful: 0,
      failed: 0,
      skipped: 0,
      errors: []
    };
    
    // Import devices one by one to handle potential duplicates
    for (let i = 0; i < devices.length; i++) {
      const device = devices[i];
      
      try {
        // Check if device already exists (by serialNumber if available)
        let existing = null;
        if (device.serialNumber) {
          existing = await prisma.medicalDevice.findFirst({
            where: { serialNumber: device.serialNumber }
          });
        }
        
        if (existing) {
          console.log(`⚠️  Skipping duplicate: ${device.name} (SN: ${device.serialNumber})`);
          stats.skipped++;
          continue;
        }
        
        // Convert prices to Decimal format
        const sellingPrice = device.sellingPrice ? parseFloat(device.sellingPrice) : null;
        const rentalPrice = device.rentalPrice ? parseFloat(device.rentalPrice) : null;
        
        // Create the medical device
        await prisma.medicalDevice.create({
          data: {
            id: device.id, // Keep the original ID for consistency
            name: device.name,
            type: device.type,
            brand: device.brand || null,
            model: device.model || null,
            serialNumber: device.serialNumber || null,
            description: device.description || null,
            technicalSpecs: device.technicalSpecs || null,
            maintenanceInterval: device.maintenanceInterval || null,
            sellingPrice: sellingPrice,
            rentalPrice: rentalPrice,
            status: device.status || 'ACTIVE',
            destination: device.destination || 'FOR_SALE',
            stockQuantity: device.stockQuantity || 1,
            location: device.location || null,
            requiresMaintenance: device.requiresMaintenance || false,
            installationDate: null,
            configuration: null,
            patientId: null,
            companyId: null,
            stockLocationId: null,
            purchasePrice: null,
            warranty: null,
            reservedUntil: null,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        });
        
        stats.successful++;
        
        // Show progress
        if ((i + 1) % 25 === 0) {
          console.log(`✅ Imported ${i + 1}/${devices.length} devices...`);
        }
        
      } catch (error) {
        stats.failed++;
        stats.errors.push({
          device: device.name,
          id: device.id,
          error: error.message
        });
        console.error(`❌ Failed to import: ${device.name} (ID: ${device.id})`);
        console.error(`   Error: ${error.message}`);
      }
    }
    
    // Print final statistics
    console.log('\n' + '='.repeat(50));
    console.log('📊 MEDICAL DEVICES IMPORT COMPLETE');
    console.log('='.repeat(50));
    console.log(`✅ Successfully imported: ${stats.successful} devices`);
    console.log(`⚠️  Skipped (duplicates): ${stats.skipped} devices`);
    console.log(`❌ Failed: ${stats.failed} devices`);
    
    if (stats.errors.length > 0) {
      console.log('\n❌ ERRORS:');
      stats.errors.forEach(err => {
        console.log(`   - ${err.device} (ID: ${err.id})`);
        console.log(`     ${err.error}`);
      });
    }
    
    // Verify final count in database
    const totalInDb = await prisma.medicalDevice.count();
    console.log(`\n📈 Total medical devices in database: ${totalInDb}`);
    
    // Show some statistics by type
    const devicesByType = await prisma.medicalDevice.groupBy({
      by: ['type'],
      _count: { type: true },
      orderBy: { _count: { type: 'desc' } }
    });
    
    console.log('\n📊 Devices by type:');
    devicesByType.forEach(type => {
      console.log(`   - ${type.type}: ${type._count.type} devices`);
    });
    
  } catch (error) {
    console.error('❌ Fatal error during import:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the import
importMedicalDevices()
  .then(() => {
    console.log('\n✅ Medical devices import completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Import process failed:', error);
    process.exit(1);
  });