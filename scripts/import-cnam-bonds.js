const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function importCNAMBonds() {
  try {
    console.log('🚀 Starting CNAM bonds import process...\n');

    // Load mappings
    const mappingsPath = path.join(__dirname, '../public/excell/json-data/rental-mappings.json');
    const mappings = JSON.parse(fs.readFileSync(mappingsPath, 'utf8'));
    
    console.log('📋 Loaded mappings:');
    console.log(`   - Patient mappings: ${Object.keys(mappings.patients).length}`);

    // Load CNAM bonds data
    const cnamBondsPath = path.join(__dirname, '../public/excell/json-data/cnam-bonds-cleaned.json');
    const cnamBondsData = JSON.parse(fs.readFileSync(cnamBondsPath, 'utf8'));
    
    console.log(`📊 Found ${cnamBondsData.length} CNAM bonds to import\n`);

    // Get list of imported rentals to validate rentalId references
    const existingRentals = await prisma.rental.findMany({
      select: { id: true }
    });
    const rentalIds = new Set(existingRentals.map(r => r.id));
    console.log(`📋 Found ${rentalIds.size} existing rentals in database\n`);

    // Clear existing CNAM bonds data
    console.log('🧹 Cleaning existing CNAM bonds data...');
    await prisma.cNAMBondRental.deleteMany({});
    console.log('✅ Cleared existing CNAM bonds data\n');

    // Import statistics
    const stats = {
      imported: 0,
      skipped: 0,
      errors: [],
      warnings: []
    };

    console.log('📦 Starting CNAM bonds import...\n');

    // Import CNAM bonds
    for (const [index, bond] of cnamBondsData.entries()) {
      try {
        console.log(`Processing bond ${index + 1}/${cnamBondsData.length}: ${bond.id}`);

        // Resolve foreign keys
        const patientId = mappings.patients[bond.patientId];
        const rentalId = bond.rentalId && rentalIds.has(bond.rentalId) ? bond.rentalId : null;

        // Validate required fields
        if (!patientId) {
          stats.errors.push(`Bond ${bond.id}: Patient not found - ${bond.patientId}`);
          stats.skipped++;
          continue;
        }

        // Prepare bond data
        const bondData = {
          id: bond.id, // Keep original ID
          bondNumber: bond.bondNumber || null,
          bondType: bond.bondType || 'VNI',
          status: bond.status || 'EN_ATTENTE_APPROBATION',
          dossierNumber: bond.dossierNumber || null,
          submissionDate: bond.submissionDate ? new Date(bond.submissionDate) : null,
          approvalDate: bond.approvalDate ? new Date(bond.approvalDate) : null,
          startDate: bond.startDate ? new Date(bond.startDate) : null,
          endDate: bond.endDate ? new Date(bond.endDate) : null,
          monthlyAmount: bond.monthlyAmount ? parseFloat(bond.monthlyAmount) : 0,
          coveredMonths: bond.coveredMonths || 12, // Default to 12 months if not specified
          totalAmount: bond.totalAmount 
            ? parseFloat(bond.totalAmount) 
            : (bond.monthlyAmount ? parseFloat(bond.monthlyAmount) * (bond.coveredMonths || 12) : 0),
          renewalReminderDays: bond.renewalReminderDays || 30,
          notes: bond.notes || null,
          rentalId: rentalId, // May be null if rental not found
          patientId: patientId,
          createdAt: bond.createdAt ? new Date(bond.createdAt) : new Date(),
          updatedAt: bond.updatedAt ? new Date(bond.updatedAt) : new Date()
        };

        // Create the CNAM bond
        await prisma.cNAMBondRental.create({
          data: bondData
        });

        stats.imported++;
        
        // Add warnings for missing references
        if (bond.rentalId && !rentalId) {
          stats.warnings.push(`Bond ${bond.id}: Rental not found - "${bond.rentalId}"`);
        }

        console.log(`✅ Imported: ${bond.id} - ${bond.bondType} - ${bond.status}`);

      } catch (error) {
        stats.errors.push(`Bond ${bond.id}: ${error.message}`);
        stats.skipped++;
        console.error(`❌ Error importing bond ${bond.id}:`, error.message);
      }
    }

    // Final statistics
    console.log('\n' + '='.repeat(60));
    console.log('📊 CNAM BONDS IMPORT RESULTS');
    console.log('='.repeat(60));
    console.log(`✅ Successfully imported: ${stats.imported} bonds`);
    console.log(`❌ Skipped due to errors: ${stats.skipped} bonds`);
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
    const totalBonds = await prisma.cNAMBondRental.count();
    const bondsWithRentals = await prisma.cNAMBondRental.count({
      where: { rentalId: { not: null } }
    });
    const bondsWithoutRentals = await prisma.cNAMBondRental.count({
      where: { rentalId: null }
    });
    
    console.log(`\n📈 Verification:`);
    console.log(`   - Total bonds in database: ${totalBonds}`);
    console.log(`   - Bonds linked to rentals: ${bondsWithRentals}`);
    console.log(`   - Bonds without rental links: ${bondsWithoutRentals}`);

    // Show some sample data by status and type
    const statusCounts = await prisma.cNAMBondRental.groupBy({
      by: ['status'],
      _count: { status: true }
    });
    
    const typeCounts = await prisma.cNAMBondRental.groupBy({
      by: ['bondType'],
      _count: { bondType: true }
    });

    console.log('\n📋 Bond distribution by status:');
    statusCounts.forEach(item => {
      console.log(`   - ${item.status}: ${item._count.status} bonds`);
    });

    console.log('\n📋 Bond distribution by type:');
    typeCounts.forEach(item => {
      console.log(`   - ${item.bondType}: ${item._count.bondType} bonds`);
    });

    // Show some sample bonds
    const sampleBonds = await prisma.cNAMBondRental.findMany({
      take: 3,
      include: {
        patient: {
          select: {
            firstName: true,
            lastName: true,
            patientCode: true
          }
        },
        rental: {
          select: {
            rentalCode: true,
            medicalDevice: {
              select: {
                name: true,
                deviceCode: true
              }
            }
          }
        }
      }
    });

    console.log('\n📋 Sample imported bonds:');
    sampleBonds.forEach(bond => {
      const rentalInfo = bond.rental 
        ? `→ ${bond.rental.rentalCode} (${bond.rental.medicalDevice?.name})`
        : '(No rental link)';
      console.log(`   - ${bond.bondNumber || bond.id}: ${bond.patient.firstName} ${bond.patient.lastName} ${rentalInfo}`);
    });

  } catch (error) {
    console.error('❌ Fatal error during CNAM bonds import:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the import
importCNAMBonds()
  .then(() => {
    console.log('\n✅ CNAM bonds import process completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ CNAM bonds import failed:', error);
    process.exit(1);
  });