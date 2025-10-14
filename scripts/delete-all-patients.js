const { PrismaClient } = require('@prisma/client');
const readline = require('readline');

const prisma = new PrismaClient();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function deleteAllPatients() {
  try {
    // First, get the current count
    const currentCount = await prisma.patient.count();
    console.log(`\n⚠️  WARNING: Found ${currentCount} patients in the database`);
    
    if (currentCount === 0) {
      console.log('✅ Database is already empty. No patients to delete.');
      return;
    }
    
    // Ask for confirmation
    rl.question('\n🔴 Are you sure you want to DELETE ALL PATIENTS? This action cannot be undone! (yes/no): ', async (answer) => {
      if (answer.toLowerCase() === 'yes') {
        console.log('\n🗑️  Deleting all patients...');
        
        // Delete all patients
        const result = await prisma.patient.deleteMany();
        
        console.log(`✅ Successfully deleted ${result.count} patients from the database`);
        
        // Verify deletion
        const remainingCount = await prisma.patient.count();
        console.log(`📊 Remaining patients in database: ${remainingCount}`);
        
      } else {
        console.log('❌ Deletion cancelled. No data was deleted.');
      }
      
      rl.close();
      await prisma.$disconnect();
    });
    
  } catch (error) {
    console.error('❌ Error during deletion:', error);
    rl.close();
    await prisma.$disconnect();
    process.exit(1);
  }
}

// Run the deletion
deleteAllPatients().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});