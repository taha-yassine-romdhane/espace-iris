const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function importPatients() {
  try {
    console.log('🚀 Starting patient data import...\n');
    
    // Read the cleaned data
    const dataPath = path.join(__dirname, '../public/excell/json-data/patients-cleaned.json');
    const rawData = fs.readFileSync(dataPath, 'utf8');
    const data = JSON.parse(rawData);
    const patients = data.patients || data; // Handle both wrapped and direct array formats
    
    console.log(`📊 Found ${patients.length} patients to import\n`);
    
    // Track import statistics
    const stats = {
      successful: 0,
      failed: 0,
      skipped: 0,
      errors: []
    };
    
    // Import patients one by one to handle potential duplicates
    for (let i = 0; i < patients.length; i++) {
      const patient = patients[i];
      
      try {
        // Check if patient already exists (by CIN or phone)
        const existing = await prisma.patient.findFirst({
          where: {
            OR: [
              { cin: patient.cin },
              { telephone: patient.telephone }
            ]
          }
        });
        
        if (existing) {
          console.log(`⚠️  Skipping duplicate: ${patient.nom} ${patient.prenom} (CIN: ${patient.cin})`);
          stats.skipped++;
          continue;
        }
        
        // Parse date of birth if available
        const dateOfBirth = patient.dateOfBirth ? new Date(patient.dateOfBirth) : null;
        
        // Create the patient with the correct schema fields
        await prisma.patient.create({
          data: {
            patientCode: patient.patientCode,
            firstName: patient.firstName || 'UNKNOWN',
            lastName: patient.lastName || 'UNKNOWN',
            cin: patient.cin,
            dateOfBirth: dateOfBirth,
            telephone: patient.telephone,
            telephoneTwo: patient.telephoneTwo || null,
            generalNote: patient.generalNote || null,
            affiliation: patient.affiliation || null,
            beneficiaryType: patient.beneficiaryType || null,
            medicalHistory: patient.medicalHistory || null,
            antecedant: null,
            weight: null,
            height: null,
            imc: null,
            cnamId: null,
            doctorId: patient.doctorId || null,
            technicianId: patient.technicianId || null,
            userId: patient.userId || 'cme43uuw40003oamthleh171m', // Default user ID
            supervisorId: patient.supervisorId || null,
            governorate: patient.governorate || null,
            delegation: patient.delegation || null,
            detailedAddress: patient.detailedAddress || null
          }
        });
        
        stats.successful++;
        
        // Show progress
        if ((i + 1) % 10 === 0) {
          console.log(`✅ Imported ${i + 1}/${patients.length} patients...`);
        }
        
      } catch (error) {
        stats.failed++;
        stats.errors.push({
          patient: `${patient.nom} ${patient.prenom}`,
          cin: patient.cin,
          error: error.message
        });
        console.error(`❌ Failed to import: ${patient.nom} ${patient.prenom}`);
        console.error(`   Error: ${error.message}`);
      }
    }
    
    // Print final statistics
    console.log('\n' + '='.repeat(50));
    console.log('📊 IMPORT COMPLETE');
    console.log('='.repeat(50));
    console.log(`✅ Successfully imported: ${stats.successful} patients`);
    console.log(`⚠️  Skipped (duplicates): ${stats.skipped} patients`);
    console.log(`❌ Failed: ${stats.failed} patients`);
    
    if (stats.errors.length > 0) {
      console.log('\n❌ ERRORS:');
      stats.errors.forEach(err => {
        console.log(`   - ${err.patient} (CIN: ${err.cin})`);
        console.log(`     ${err.error}`);
      });
    }
    
    // Verify final count in database
    const totalInDb = await prisma.patient.count();
    console.log(`\n📈 Total patients in database: ${totalInDb}`);
    
  } catch (error) {
    console.error('❌ Fatal error during import:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the import
importPatients()
  .then(() => {
    console.log('\n✅ Import process completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Import process failed:', error);
    process.exit(1);
  });