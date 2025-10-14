const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function importRentals() {
  try {
    console.log('🚀 Starting rental import process...\n');

    // Load mappings
    const mappingsPath = path.join(__dirname, '../public/excell/json-data/rental-mappings.json');
    const mappings = JSON.parse(fs.readFileSync(mappingsPath, 'utf8'));
    
    console.log('📋 Loaded mappings:');
    console.log(`   - Technician mappings: ${Object.keys(mappings.technicians).length}`);
    console.log(`   - Device mappings: ${Object.keys(mappings.devices).length}`);
    console.log(`   - Patient mappings: ${Object.keys(mappings.patients).length}\n`);

    // Load rental data
    const rentalsPath = path.join(__dirname, '../public/excell/json-data/rentals-updated.json');
    const rentalsData = JSON.parse(fs.readFileSync(rentalsPath, 'utf8'));
    
    console.log(`📊 Found ${rentalsData.length} rentals to import\n`);

    // Clear existing rentals (if any exist from test data)
    console.log('🧹 Cleaning existing rental data...');
    
    // Delete in order to respect foreign key constraints
    await prisma.rentalPeriod.deleteMany({});
    await prisma.cNAMBondRental.deleteMany({});
    await prisma.rentalGap.deleteMany({});
    await prisma.rentalAccessory.deleteMany({});
    await prisma.rentalConfiguration.deleteMany({});
    await prisma.rental.deleteMany({});
    
    console.log('✅ Cleared existing rental data\n');

    // Import statistics
    const stats = {
      imported: 0,
      skipped: 0,
      errors: [],
      warnings: []
    };

    console.log('📦 Starting rental import...\n');

    // Import rentals
    for (const [index, rental] of rentalsData.entries()) {
      try {
        console.log(`Processing rental ${index + 1}/${rentalsData.length}: ${rental.id} (${rental.rentalCode || 'No Code'})`);

        // Resolve foreign keys
        const patientId = mappings.patients[rental.patientId];
        const deviceId = mappings.devices[rental.medicalDeviceId];
        const technicianId = mappings.technicians[rental.technicianName?.toUpperCase()] || null;
        const supervisorId = rental.supervisorName && rental.supervisorName.trim() !== '' 
          ? mappings.technicians[rental.supervisorName.toUpperCase()] || null 
          : null;

        // Validate required fields
        if (!patientId) {
          stats.errors.push(`Rental ${rental.id}: Patient not found - ${rental.patientId}`);
          stats.skipped++;
          continue;
        }

        if (!deviceId) {
          stats.errors.push(`Rental ${rental.id}: Device not found - ${rental.medicalDeviceId}`);
          stats.skipped++;
          continue;
        }

        // Prepare rental data (only fields that exist in schema)
        const rentalData = {
          id: rental.id, // Keep original ID for foreign key references
          rentalCode: rental.rentalCode || `RNT-${String(index + 1).padStart(4, '0')}`,
          patientId: patientId,
          medicalDeviceId: deviceId,
          startDate: new Date(rental.startDate),
          endDate: rental.endDate ? new Date(rental.endDate) : null,
          status: rental.status || 'ACTIVE',
          notes: rental.notes || null,
          createdAt: rental.createdAt ? new Date(rental.createdAt) : new Date(),
          updatedAt: rental.updatedAt ? new Date(rental.updatedAt) : new Date()
        };

        // Create the rental
        const createdRental = await prisma.rental.create({
          data: rentalData
        });

        // Create rental configuration (always create one with available data)
        const configData = {
          rentalId: createdRental.id,
          isGlobalOpenEnded: rental.configuration?.isGlobalOpenEnded || false,
          urgentRental: rental.configuration?.urgentRental || false,
          cnamEligible: rental.configuration?.cnamEligible || false,
          depositAmount: rental.configuration?.depositAmount 
            ? parseFloat(rental.configuration.depositAmount) 
            : null,
          depositMethod: rental.configuration?.depositMethod || null,
          totalPaymentAmount: rental.configuration?.totalPaymentAmount 
            ? parseFloat(rental.configuration.totalPaymentAmount) 
            : (rental.totalAmount ? parseFloat(rental.totalAmount) : null),
          notes: technicianId || supervisorId 
            ? `Technician: ${rental.technicianName || 'N/A'}, Supervisor: ${rental.supervisorName || 'N/A'}. Monthly: ${rental.monthlyAmount || 0}` 
            : `Monthly amount: ${rental.monthlyAmount || 0}`
        };

        await prisma.rentalConfiguration.create({
          data: configData
        });

        stats.imported++;
        
        // Add warnings for missing references
        if (!technicianId && rental.technicianName) {
          stats.warnings.push(`Rental ${rental.id}: Technician not found - "${rental.technicianName}"`);
        }
        
        if (!supervisorId && rental.supervisorName && rental.supervisorName.trim() !== '') {
          stats.warnings.push(`Rental ${rental.id}: Supervisor not found - "${rental.supervisorName}"`);
        }

        console.log(`✅ Imported: ${rental.rentalCode || rental.id} - Patient: ${rental.patientName || rental.patientId}`);

      } catch (error) {
        stats.errors.push(`Rental ${rental.id}: ${error.message}`);
        stats.skipped++;
        console.error(`❌ Error importing rental ${rental.id}:`, error.message);
      }
    }

    // Final statistics
    console.log('\n' + '='.repeat(60));
    console.log('📊 RENTAL IMPORT RESULTS');
    console.log('='.repeat(60));
    console.log(`✅ Successfully imported: ${stats.imported} rentals`);
    console.log(`❌ Skipped due to errors: ${stats.skipped} rentals`);
    console.log(`⚠️  Warnings: ${stats.warnings.length}`);

    if (stats.errors.length > 0) {
      console.log('\n❌ ERRORS:');
      stats.errors.forEach(error => console.log(`   - ${error}`));
    }

    if (stats.warnings.length > 0) {
      console.log('\n⚠️  WARNINGS:');
      stats.warnings.slice(0, 10).forEach(warning => console.log(`   - ${warning}`));
      if (stats.warnings.length > 10) {
        console.log(`   ... and ${stats.warnings.length - 10} more warnings`);
      }
    }

    // Verification
    const totalRentals = await prisma.rental.count();
    const totalConfigurations = await prisma.rentalConfiguration.count();
    
    console.log(`\n📈 Verification:`);
    console.log(`   - Total rentals in database: ${totalRentals}`);
    console.log(`   - Total configurations: ${totalConfigurations}`);

    // Show some sample data
    const sampleRentals = await prisma.rental.findMany({
      take: 3,
      include: {
        patient: {
          select: {
            firstName: true,
            lastName: true,
            patientCode: true
          }
        },
        medicalDevice: {
          select: {
            name: true,
            deviceCode: true,
            type: true
          }
        },
        configuration: true
      }
    });

    console.log('\n📋 Sample imported rentals:');
    sampleRentals.forEach(rental => {
      console.log(`   - ${rental.rentalCode}: ${rental.patient.firstName} ${rental.patient.lastName} → ${rental.medicalDevice.name} (${rental.medicalDevice.deviceCode})`);
    });

  } catch (error) {
    console.error('❌ Fatal error during rental import:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the import
importRentals()
  .then(() => {
    console.log('\n✅ Rental import process completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Rental import failed:', error);
    process.exit(1);
  });