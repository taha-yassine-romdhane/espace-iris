const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function createRentalMappings() {
  try {
    console.log('🚀 Creating rental data mappings...\n');

    // 1. Create Technician Name to User ID Mapping
    console.log('📋 Creating technician name mappings...');
    
    const technicians = await prisma.technician.findMany({
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });

    // Create name variations mapping
    const technicianNameMapping = new Map();
    
    technicians.forEach(tech => {
      const firstName = tech.user.firstName;
      const lastName = tech.user.lastName;
      const fullName = `${firstName} ${lastName}`.toUpperCase();
      const fullNameReverse = `${lastName} ${firstName}`.toUpperCase();
      
      // Add various name formats
      technicianNameMapping.set(fullName, tech.user.id);
      technicianNameMapping.set(fullNameReverse, tech.user.id);
      technicianNameMapping.set(firstName.toUpperCase(), tech.user.id);
      technicianNameMapping.set(lastName.toUpperCase(), tech.user.id);
      
      // Handle specific name variations found in data
      if (fullName === 'BILEL BOUHLEL') {
        technicianNameMapping.set('BILEL BOUHLEL', tech.user.id);
        technicianNameMapping.set('BILEL', tech.user.id);
        technicianNameMapping.set('BIEL', tech.user.id); // Handle typo
        technicianNameMapping.set('BILEL BOUHLEL', tech.user.id);
        technicianNameMapping.set('BILEL Bouhlel', tech.user.id);
        technicianNameMapping.set('Bilel Bouhlel', tech.user.id);
      }
      
      if (firstName.toUpperCase() === 'KARIM') {
        technicianNameMapping.set('KARIM', tech.user.id);
      }
      
      if (firstName.toUpperCase() === 'GHAITH') {
        technicianNameMapping.set('GAITH', tech.user.id); // Handle typo
        technicianNameMapping.set('GHAITH', tech.user.id);
      }
      
      if (fullName === 'ACHRAF MLAYAH') {
        technicianNameMapping.set('ACHRAF MLAYAH', tech.user.id);
        technicianNameMapping.set('ACHRAF', tech.user.id);
      }
    });

    // Add default mappings for names not found in technicians (might be other staff)
    const defaultUserId = technicians[0]?.user.id || null; // Use first technician as fallback
    
    // Handle special cases
    technicianNameMapping.set('SOUHAIEB BEN SAHRA', defaultUserId);
    technicianNameMapping.set('MOHAMED', defaultUserId);
    technicianNameMapping.set('AHMED GAZZEH', defaultUserId);

    console.log(`✅ Created ${technicianNameMapping.size} technician name mappings`);

    // 2. Create Device Code to UUID Mapping
    console.log('\n📋 Creating device code mappings...');
    
    const devices = await prisma.medicalDevice.findMany({
      select: {
        id: true,
        deviceCode: true,
        name: true
      }
    });

    const deviceMapping = new Map();
    devices.forEach(device => {
      if (device.deviceCode) {
        deviceMapping.set(device.deviceCode, device.id);
      }
    });

    console.log(`✅ Created ${deviceMapping.size} device code mappings`);

    // 3. Create Patient PAT Code to UUID Mapping
    console.log('\n📋 Creating patient code mappings...');
    
    const patients = await prisma.patient.findMany({
      select: {
        id: true,
        patientCode: true,
        firstName: true,
        lastName: true
      }
    });

    const patientMapping = new Map();
    patients.forEach(patient => {
      if (patient.patientCode) {
        patientMapping.set(patient.patientCode, patient.id);
      }
    });

    console.log(`✅ Created ${patientMapping.size} patient code mappings`);

    // 4. Save mappings to files for import scripts
    const mappingsData = {
      technicians: Object.fromEntries(technicianNameMapping),
      devices: Object.fromEntries(deviceMapping),
      patients: Object.fromEntries(patientMapping),
      metadata: {
        createdAt: new Date().toISOString(),
        technicianCount: technicians.length,
        deviceCount: devices.length,
        patientCount: patients.length
      }
    };

    const mappingsPath = path.join(__dirname, '../public/excell/json-data/rental-mappings.json');
    fs.writeFileSync(mappingsPath, JSON.stringify(mappingsData, null, 2));

    console.log(`\n💾 Saved mappings to: ${mappingsPath}`);
    
    // 5. Validate mappings with sample data
    console.log('\n🔍 Validating mappings with sample rental data...');
    
    const rentalsData = JSON.parse(fs.readFileSync(
      path.join(__dirname, '../public/excell/json-data/rentals-updated.json'),
      'utf8'
    ));

    const sampleRentals = rentalsData.slice(0, 5);
    const validationResults = {
      techniciansFound: 0,
      techniciansNotFound: 0,
      devicesFound: 0,
      devicesNotFound: 0,
      patientsFound: 0,
      patientsNotFound: 0,
      issues: []
    };

    for (const rental of sampleRentals) {
      // Check technician
      if (rental.technicianName) {
        const techId = technicianNameMapping.get(rental.technicianName.toUpperCase());
        if (techId) {
          validationResults.techniciansFound++;
        } else {
          validationResults.techniciansNotFound++;
          validationResults.issues.push(`Technician not found: "${rental.technicianName}"`);
        }
      }

      // Check device
      if (rental.medicalDeviceId) {
        const deviceId = deviceMapping.get(rental.medicalDeviceId);
        if (deviceId) {
          validationResults.devicesFound++;
        } else {
          validationResults.devicesNotFound++;
          validationResults.issues.push(`Device not found: "${rental.medicalDeviceId}"`);
        }
      }

      // Check patient
      if (rental.patientId) {
        const patientId = patientMapping.get(rental.patientId);
        if (patientId) {
          validationResults.patientsFound++;
        } else {
          validationResults.patientsNotFound++;
          validationResults.issues.push(`Patient not found: "${rental.patientId}"`);
        }
      }
    }

    console.log('\n📊 Validation Results:');
    console.log(`✅ Technicians found: ${validationResults.techniciansFound}`);
    console.log(`❌ Technicians not found: ${validationResults.techniciansNotFound}`);
    console.log(`✅ Devices found: ${validationResults.devicesFound}`);
    console.log(`❌ Devices not found: ${validationResults.devicesNotFound}`);
    console.log(`✅ Patients found: ${validationResults.patientsFound}`);
    console.log(`❌ Patients not found: ${validationResults.patientsNotFound}`);

    if (validationResults.issues.length > 0) {
      console.log('\n⚠️  Issues found:');
      validationResults.issues.forEach(issue => console.log(`   - ${issue}`));
    }

    console.log('\n✅ Rental mappings created successfully!');

  } catch (error) {
    console.error('❌ Error creating rental mappings:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the mapping creation
createRentalMappings()
  .then(() => {
    console.log('\n🎉 Rental mappings creation completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Rental mappings creation failed:', error);
    process.exit(1);
  });