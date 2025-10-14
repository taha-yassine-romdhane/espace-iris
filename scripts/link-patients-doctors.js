const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function linkPatientsDoctors() {
  try {
    console.log('🚀 Starting patient-doctor linking process...\n');
    
    // Read the original patient data to get doctor names
    const dataPath = path.join(__dirname, '../public/excell/json-data/patients-cleaned.json');
    const rawData = fs.readFileSync(dataPath, 'utf8');
    const data = JSON.parse(rawData);
    const patientsWithDoctors = data.patients.filter(p => p.doctorName);
    
    console.log(`📊 Found ${patientsWithDoctors.length} patients with doctor names\n`);
    
    // Get all doctors from database
    const doctors = await prisma.doctor.findMany({
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      }
    });
    
    console.log(`👥 Found ${doctors.length} doctors in database\n`);
    
    // Create a map of doctor names to doctor IDs for easier matching
    const doctorMap = new Map();
    doctors.forEach(doctor => {
      const fullName = `${doctor.user.firstName} ${doctor.user.lastName}`.trim().toUpperCase();
      const reversedName = `${doctor.user.lastName} ${doctor.user.firstName}`.trim().toUpperCase();
      
      doctorMap.set(fullName, doctor.id);
      doctorMap.set(reversedName, doctor.id);
      
      // Also add individual names for partial matching
      if (doctor.user.lastName) {
        doctorMap.set(doctor.user.lastName.toUpperCase(), doctor.id);
      }
      if (doctor.user.firstName) {
        doctorMap.set(doctor.user.firstName.toUpperCase(), doctor.id);
      }
    });
    
    // Track statistics
    const stats = {
      matched: 0,
      unmatched: 0,
      updated: 0,
      errors: [],
      matches: []
    };
    
    console.log('🔍 Starting name matching process...\n');
    
    // Process each patient with doctor name
    for (const patientData of patientsWithDoctors) {
      const patientDoctorName = patientData.doctorName.trim().toUpperCase();
      let matchedDoctorId = null;
      let matchType = '';
      
      try {
        // Strategy 1: Direct exact match
        if (doctorMap.has(patientDoctorName)) {
          matchedDoctorId = doctorMap.get(patientDoctorName);
          matchType = 'exact';
        }
        // Strategy 2: Handle combined names like "JABEUR SAMEH /SAOUSSEN CHIKH"
        else if (patientDoctorName.includes('/')) {
          const doctorNames = patientDoctorName.split('/').map(name => name.trim());
          for (const name of doctorNames) {
            if (doctorMap.has(name)) {
              matchedDoctorId = doctorMap.get(name);
              matchType = 'split-match';
              break;
            }
          }
        }
        // Strategy 3: Partial matching - check if any doctor name is contained in patient doctor name
        else {
          for (const [doctorName, doctorId] of doctorMap.entries()) {
            if (doctorName.length > 5 && patientDoctorName.includes(doctorName)) {
              matchedDoctorId = doctorId;
              matchType = 'partial';
              break;
            }
          }
        }
        
        if (matchedDoctorId) {
          stats.matched++;
          stats.matches.push({
            patientName: `${patientData.firstName} ${patientData.lastName}`,
            patientPhone: patientData.telephone,
            doctorNameInPatient: patientDoctorName,
            matchedDoctorId: matchedDoctorId,
            matchType: matchType
          });
          
          console.log(`✅ Match found: "${patientDoctorName}" → Doctor ID: ${matchedDoctorId} (${matchType})`);
        } else {
          stats.unmatched++;
          console.log(`❌ No match found for: "${patientDoctorName}"`);
        }
        
      } catch (error) {
        stats.errors.push({
          patient: `${patientData.firstName} ${patientData.lastName}`,
          doctorName: patientDoctorName,
          error: error.message
        });
        console.error(`❌ Error processing patient ${patientData.firstName} ${patientData.lastName}:`, error.message);
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 MATCHING RESULTS');
    console.log('='.repeat(60));
    console.log(`✅ Successfully matched: ${stats.matched} patients`);
    console.log(`❌ Unmatched: ${stats.unmatched} patients`);
    console.log(`🔗 Ready to update database links`);
    
    // Show unmatched doctor names for manual review
    if (stats.unmatched > 0) {
      console.log('\n📋 Unmatched doctor names that need manual review:');
      const unmatchedNames = new Set();
      patientsWithDoctors.forEach(patient => {
        const doctorName = patient.doctorName.trim().toUpperCase();
        const found = stats.matches.some(m => m.doctorNameInPatient === doctorName);
        if (!found) {
          unmatchedNames.add(patient.doctorName);
        }
      });
      unmatchedNames.forEach(name => console.log(`   - "${name}"`));
    }
    
    // Now update the database with the matches
    console.log('\n🔗 Updating database with doctor-patient links...\n');
    
    for (const match of stats.matches) {
      try {
        // Find the patient by phone number (unique identifier)
        const patient = await prisma.patient.findFirst({
          where: { telephone: match.patientPhone }
        });
        
        if (patient) {
          // Update the patient with doctor ID
          await prisma.patient.update({
            where: { id: patient.id },
            data: { doctorId: match.matchedDoctorId }
          });
          
          stats.updated++;
          console.log(`🔗 Updated patient "${match.patientName}" → Doctor ID: ${match.matchedDoctorId}`);
        } else {
          console.log(`⚠️  Patient not found in database: "${match.patientName}" (${match.patientPhone})`);
        }
        
      } catch (error) {
        stats.errors.push({
          patient: match.patientName,
          doctorId: match.matchedDoctorId,
          error: error.message
        });
        console.error(`❌ Error updating patient ${match.patientName}:`, error.message);
      }
    }
    
    // Final statistics
    console.log('\n' + '='.repeat(60));
    console.log('📊 FINAL RESULTS');
    console.log('='.repeat(60));
    console.log(`✅ Successfully linked: ${stats.updated} patients to doctors`);
    console.log(`❌ Failed to update: ${stats.matched - stats.updated} patients`);
    console.log(`⚠️  Unmatched doctors: ${stats.unmatched} patients`);
    
    if (stats.errors.length > 0) {
      console.log('\n❌ ERRORS:');
      stats.errors.forEach(err => {
        console.log(`   - ${err.patient}`);
        console.log(`     Error: ${err.error}`);
      });
    }
    
    // Verification
    const linkedPatients = await prisma.patient.count({
      where: { doctorId: { not: null } }
    });
    
    console.log(`\n📈 Total patients with doctor links: ${linkedPatients}`);
    
    // Show some sample linked patients
    const sampleLinked = await prisma.patient.findMany({
      where: { doctorId: { not: null } },
      include: {
        doctor: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true
              }
            }
          }
        }
      },
      take: 5
    });
    
    console.log('\n📋 Sample linked patients:');
    sampleLinked.forEach(patient => {
      const doctorName = `${patient.doctor.user.firstName} ${patient.doctor.user.lastName}`.trim();
      console.log(`   - ${patient.firstName} ${patient.lastName} → Dr. ${doctorName}`);
    });
    
  } catch (error) {
    console.error('❌ Fatal error during linking process:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the linking process
linkPatientsDoctors()
  .then(() => {
    console.log('\n✅ Patient-doctor linking process completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Linking process failed:', error);
    process.exit(1);
  });