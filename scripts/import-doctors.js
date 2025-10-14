const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function importDoctors() {
  try {
    console.log('🚀 Starting doctors import...\n');
    
    // Read the doctors data
    const dataPath = path.join(__dirname, '../public/excell/json-data/doctors-import.json');
    const rawData = fs.readFileSync(dataPath, 'utf8');
    const data = JSON.parse(rawData);
    const doctors = data.doctors;
    
    console.log(`📊 Found ${doctors.length} doctors to import\n`);
    
    // Track import statistics
    const stats = {
      successful: 0,
      failed: 0,
      skipped: 0,
      errors: []
    };
    
    // Import doctors one by one
    for (let i = 0; i < doctors.length; i++) {
      const doctor = doctors[i];
      
      try {
        // Check if user already exists (by email)
        const existingUser = await prisma.user.findFirst({
          where: { email: doctor.email }
        });
        
        if (existingUser) {
          console.log(`⚠️  Skipping duplicate: ${doctor.firstName} ${doctor.lastName} (${doctor.email})`);
          stats.skipped++;
          continue;
        }
        
        // Hash the password
        const hashedPassword = await bcrypt.hash(doctor.password, 12);
        
        // Create user and doctor in a transaction
        await prisma.$transaction(async (tx) => {
          // Create the user first
          const newUser = await tx.user.create({
            data: {
              email: doctor.email,
              password: hashedPassword,
              firstName: doctor.firstName,
              lastName: doctor.lastName,
              role: 'DOCTOR',
              speciality: doctor.speciality || null,
              telephone: doctor.telephone || null,
              address: doctor.address || null,
              isActive: doctor.isActive !== undefined ? doctor.isActive : true,
              createdAt: new Date(),
              updatedAt: new Date()
            }
          });
          
          // Create the doctor record that references the user
          await tx.doctor.create({
            data: {
              userId: newUser.id,
              createdAt: new Date(),
              updatedAt: new Date()
            }
          });
        });
        
        stats.successful++;
        
        // Show progress
        if ((i + 1) % 5 === 0) {
          console.log(`✅ Imported ${i + 1}/${doctors.length} doctors...`);
        }
        
      } catch (error) {
        stats.failed++;
        stats.errors.push({
          doctor: `${doctor.firstName} ${doctor.lastName}`,
          email: doctor.email,
          error: error.message
        });
        console.error(`❌ Failed to import: ${doctor.firstName} ${doctor.lastName} (${doctor.email})`);
        console.error(`   Error: ${error.message}`);
      }
    }
    
    // Print final statistics
    console.log('\n' + '='.repeat(50));
    console.log('📊 DOCTORS IMPORT COMPLETE');
    console.log('='.repeat(50));
    console.log(`✅ Successfully imported: ${stats.successful} doctors`);
    console.log(`⚠️  Skipped (duplicates): ${stats.skipped} doctors`);
    console.log(`❌ Failed: ${stats.failed} doctors`);
    
    if (stats.errors.length > 0) {
      console.log('\n❌ ERRORS:');
      stats.errors.forEach(err => {
        console.log(`   - ${err.doctor} (${err.email})`);
        console.log(`     ${err.error}`);
      });
    }
    
    // Verify final count in database
    const totalDoctorsInDb = await prisma.doctor.count();
    const totalUsersWithDoctorRole = await prisma.user.count({
      where: { role: 'DOCTOR' }
    });
    
    console.log(`\n📈 Total doctors in database: ${totalDoctorsInDb}`);
    console.log(`📈 Total users with DOCTOR role: ${totalUsersWithDoctorRole}`);
    
    // Show some sample imported doctors
    const sampleDoctors = await prisma.doctor.findMany({
      take: 5,
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            speciality: true,
            isActive: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    console.log('\n📋 Sample imported doctors:');
    sampleDoctors.forEach(doctor => {
      console.log(`   - Dr. ${doctor.user.firstName} ${doctor.user.lastName} (${doctor.user.email})`);
      console.log(`     Speciality: ${doctor.user.speciality}, Active: ${doctor.user.isActive}`);
    });
    
  } catch (error) {
    console.error('❌ Fatal error during import:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the import
importDoctors()
  .then(() => {
    console.log('\n✅ Doctors import completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Import process failed:', error);
    process.exit(1);
  });