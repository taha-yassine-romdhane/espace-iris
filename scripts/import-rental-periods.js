const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function importRentalPeriods() {
  try {
    console.log('🚀 Starting rental periods import process...\n');

    // Load rental periods data
    const periodsPath = path.join(__dirname, '../public/excell/json-data/rental-periods-cleaned.json');
    const periodsData = JSON.parse(fs.readFileSync(periodsPath, 'utf8'));
    
    console.log(`📊 Found ${periodsData.length} rental periods to import\n`);

    // Get list of imported rentals to validate rentalId references
    const existingRentals = await prisma.rental.findMany({
      select: { id: true }
    });
    const rentalIds = new Set(existingRentals.map(r => r.id));
    console.log(`📋 Found ${rentalIds.size} existing rentals in database\n`);

    // Get list of imported CNAM bonds for potential linking
    const existingBonds = await prisma.cNAMBondRental.findMany({
      select: { id: true, rentalId: true }
    });
    const bondsByRental = new Map();
    existingBonds.forEach(bond => {
      if (bond.rentalId) {
        if (!bondsByRental.has(bond.rentalId)) {
          bondsByRental.set(bond.rentalId, []);
        }
        bondsByRental.get(bond.rentalId).push(bond.id);
      }
    });
    console.log(`📋 Found ${existingBonds.length} existing CNAM bonds in database\n`);

    // Clear existing rental periods data
    console.log('🧹 Cleaning existing rental periods data...');
    await prisma.rentalPeriod.deleteMany({});
    console.log('✅ Cleared existing rental periods data\n');

    // Import statistics
    const stats = {
      imported: 0,
      skipped: 0,
      errors: [],
      warnings: []
    };

    console.log('📦 Starting rental periods import...\n');

    // Import rental periods
    for (const [index, period] of periodsData.entries()) {
      try {
        console.log(`Processing period ${index + 1}/${periodsData.length}: ${period.id} (Rental: ${period.rentalId})`);

        // Validate required fields
        if (!rentalIds.has(period.rentalId)) {
          stats.errors.push(`Period ${period.id}: Rental not found - ${period.rentalId}`);
          stats.skipped++;
          continue;
        }

        // Map payment status to payment method if not provided
        let paymentMethod = period.paymentMethod || 'CNAM';
        if (!period.paymentMethod) {
          // Infer payment method from payment status and gap info
          if (period.isGapPeriod) {
            paymentMethod = 'CASH'; // Gap periods are usually cash paid
          } else if (period.paymentStatus === 'PAID' || period.paymentStatus === 'PENDING') {
            paymentMethod = 'CNAM'; // Most paid periods are CNAM
          } else {
            paymentMethod = 'CASH'; // Default fallback to cash
          }
        }

        // Handle gap period logic
        const isGapPeriod = period.isGapPeriod || false;
        const gapAmount = period.gapAmount || 0;
        const amount = parseFloat(period.amount) || 0;
        
        // If there's a gap amount but isGapPeriod is false, treat as gap period
        const finalIsGapPeriod = isGapPeriod || (gapAmount > 0);
        
        // Try to link to CNAM bond if this is a CNAM payment
        let cnamBondId = null;
        if (paymentMethod === 'CNAM' && bondsByRental.has(period.rentalId)) {
          const bonds = bondsByRental.get(period.rentalId);
          if (bonds.length > 0) {
            cnamBondId = bonds[0]; // Link to first bond for this rental
          }
        }

        // Prepare period data
        const periodData = {
          id: period.id, // Keep original ID
          rentalId: period.rentalId,
          startDate: new Date(period.startDate),
          endDate: new Date(period.endDate),
          amount: amount,
          paymentMethod: paymentMethod,
          isGapPeriod: finalIsGapPeriod,
          gapReason: period.gapReason || (finalIsGapPeriod ? `Gap period - Amount: ${gapAmount}` : null),
          notes: period.notes || (period.periodNumber ? `Period ${period.periodNumber}. Status: ${period.paymentStatus || 'Unknown'}` : null),
          paymentId: period.paymentId || null, // Usually null in the data
          cnamBondId: cnamBondId,
          createdAt: period.createdAt ? new Date(period.createdAt) : new Date(),
          updatedAt: period.updatedAt ? new Date(period.updatedAt) : new Date()
        };

        // Create the rental period
        await prisma.rentalPeriod.create({
          data: periodData
        });

        stats.imported++;
        
        // Add warnings for interesting cases
        if (gapAmount > 0 && !finalIsGapPeriod) {
          stats.warnings.push(`Period ${period.id}: Has gap amount (${gapAmount}) but not marked as gap period`);
        }
        
        if (paymentMethod === 'CNAM' && !cnamBondId) {
          stats.warnings.push(`Period ${period.id}: CNAM payment but no bond linked`);
        }

        const statusIcon = finalIsGapPeriod ? '📍' : (paymentMethod === 'CNAM' ? '🏥' : '👤');
        console.log(`✅ Imported: ${period.id} ${statusIcon} ${amount} (${paymentMethod})`);

      } catch (error) {
        stats.errors.push(`Period ${period.id}: ${error.message}`);
        stats.skipped++;
        console.error(`❌ Error importing period ${period.id}:`, error.message);
      }
    }

    // Final statistics
    console.log('\n' + '='.repeat(60));
    console.log('📊 RENTAL PERIODS IMPORT RESULTS');
    console.log('='.repeat(60));
    console.log(`✅ Successfully imported: ${stats.imported} periods`);
    console.log(`❌ Skipped due to errors: ${stats.skipped} periods`);
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
    const totalPeriods = await prisma.rentalPeriod.count();
    const cnamPeriods = await prisma.rentalPeriod.count({
      where: { paymentMethod: 'CNAM' }
    });
    const patientPeriods = await prisma.rentalPeriod.count({
      where: { paymentMethod: 'PATIENT' }
    });
    const gapPeriods = await prisma.rentalPeriod.count({
      where: { isGapPeriod: true }
    });
    const linkedToBonds = await prisma.rentalPeriod.count({
      where: { cnamBondId: { not: null } }
    });
    
    console.log(`\n📈 Verification:`);
    console.log(`   - Total periods in database: ${totalPeriods}`);
    console.log(`   - CNAM periods: ${cnamPeriods}`);
    console.log(`   - Patient periods: ${patientPeriods}`);
    console.log(`   - Gap periods: ${gapPeriods}`);
    console.log(`   - Periods linked to CNAM bonds: ${linkedToBonds}`);

    // Calculate total amounts
    const totalAmountResult = await prisma.rentalPeriod.aggregate({
      _sum: { amount: true }
    });
    const cnamAmountResult = await prisma.rentalPeriod.aggregate({
      where: { paymentMethod: 'CNAM' },
      _sum: { amount: true }
    });
    
    console.log(`\n💰 Financial summary:`);
    console.log(`   - Total period amounts: ${totalAmountResult._sum.amount || 0} TND`);
    console.log(`   - CNAM period amounts: ${cnamAmountResult._sum.amount || 0} TND`);

    // Show periods by rental
    const periodsPerRental = await prisma.rentalPeriod.groupBy({
      by: ['rentalId'],
      _count: { rentalId: true }
    });
    
    const avgPeriodsPerRental = periodsPerRental.length > 0 
      ? (totalPeriods / periodsPerRental.length).toFixed(1)
      : 0;
      
    console.log(`\n📋 Period distribution:`);
    console.log(`   - Rentals with periods: ${periodsPerRental.length}`);
    console.log(`   - Average periods per rental: ${avgPeriodsPerRental}`);

    // Show some sample periods with rental info
    const samplePeriods = await prisma.rentalPeriod.findMany({
      take: 5,
      include: {
        rental: {
          select: {
            rentalCode: true,
            patient: {
              select: {
                firstName: true,
                lastName: true
              }
            },
            medicalDevice: {
              select: {
                name: true,
                deviceCode: true
              }
            }
          }
        },
        cnamBond: {
          select: {
            bondNumber: true,
            bondType: true
          }
        }
      },
      orderBy: {
        amount: 'desc'
      }
    });

    console.log('\n📋 Sample imported periods (highest amounts):');
    samplePeriods.forEach(period => {
      const bondInfo = period.cnamBond 
        ? `→ Bond: ${period.cnamBond.bondNumber || 'N/A'}`
        : '';
      const gapInfo = period.isGapPeriod ? '📍 GAP ' : '';
      console.log(`   - ${period.rental.rentalCode}: ${period.rental.patient.firstName} ${period.rental.patient.lastName} ${gapInfo}${period.amount} TND (${period.paymentMethod}) ${bondInfo}`);
    });

  } catch (error) {
    console.error('❌ Fatal error during rental periods import:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the import
importRentalPeriods()
  .then(() => {
    console.log('\n✅ Rental periods import process completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Rental periods import failed:', error);
    process.exit(1);
  });