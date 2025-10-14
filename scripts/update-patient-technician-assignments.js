const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function updatePatientTechnicianAssignments() {
  try {
    console.log('🚀 Updating patient-technician assignments...\n');

    // Get Souhaieb's user ID
    const souhaiebUser = await prisma.user.findFirst({
      where: {
        firstName: 'Souhaieb',
        lastName: 'Ben Sahra'
      }
    });

    if (!souhaiebUser) {
      throw new Error('Souhaieb Ben Sahra user not found');
    }

    console.log(`📋 Found Souhaieb user: ${souhaiebUser.firstName} ${souhaiebUser.lastName} (${souhaiebUser.id})\n`);

    // Get all patients that should be assigned to Souhaieb based on rental configurations
    const patientsToAssign = await prisma.$queryRaw`
      SELECT DISTINCT r."patientId", p."firstName", p."lastName", p."patientCode", p."technicianId"
      FROM "RentalConfiguration" rc
      JOIN "Rental" r ON rc."rentalId" = r.id
      JOIN "Patient" p ON r."patientId" = p.id
      WHERE rc.notes LIKE '%SOUHAIEB%'
      ORDER BY p."lastName", p."firstName"
    `;

    console.log(`📊 Found ${patientsToAssign.length} patients to assign to Souhaieb\n`);

    // Update each patient's technician assignment
    const stats = {
      updated: 0,
      alreadyAssigned: 0,
      reassigned: 0,
      errors: []
    };

    for (const patient of patientsToAssign) {
      try {
        const currentTechnicianId = patient.technicianId;
        
        if (currentTechnicianId === souhaiebUser.id) {
          stats.alreadyAssigned++;
          console.log(`✅ ${patient.firstName} ${patient.lastName} (${patient.patientCode}) - Already assigned to Souhaieb`);
        } else {
          // Update the patient's technician assignment
          await prisma.patient.update({
            where: { id: patient.patientId },
            data: { technicianId: souhaiebUser.id }
          });

          if (currentTechnicianId) {
            stats.reassigned++;
            console.log(`🔄 ${patient.firstName} ${patient.lastName} (${patient.patientCode}) - Reassigned from ${currentTechnicianId} to Souhaieb`);
          } else {
            stats.updated++;
            console.log(`✅ ${patient.firstName} ${patient.lastName} (${patient.patientCode}) - Assigned to Souhaieb`);
          }
        }

      } catch (error) {
        stats.errors.push(`${patient.firstName} ${patient.lastName}: ${error.message}`);
        console.error(`❌ Error updating ${patient.firstName} ${patient.lastName}:`, error.message);
      }
    }

    // Final statistics
    console.log('\n' + '='.repeat(60));
    console.log('📊 PATIENT ASSIGNMENT UPDATE RESULTS');
    console.log('='.repeat(60));
    console.log(`✅ Newly assigned: ${stats.updated} patients`);
    console.log(`🔄 Reassigned: ${stats.reassigned} patients`);
    console.log(`✅ Already assigned: ${stats.alreadyAssigned} patients`);
    console.log(`❌ Errors: ${stats.errors.length}`);

    if (stats.errors.length > 0) {
      console.log('\n❌ ERRORS:');
      stats.errors.forEach(error => console.log(`   - ${error}`));
    }

    // Verification - get current patient-technician assignments
    const totalAssignments = await prisma.patient.count({
      where: { technicianId: { not: null } }
    });

    const souhaiebAssignments = await prisma.patient.count({
      where: { technicianId: souhaiebUser.id }
    });

    console.log(`\n📈 Current assignments:`);
    console.log(`   - Total patients with technicians: ${totalAssignments}`);
    console.log(`   - Patients assigned to Souhaieb: ${souhaiebAssignments}`);

    // Show Souhaieb's patients
    const souhaiebPatients = await prisma.patient.findMany({
      where: { technicianId: souhaiebUser.id },
      select: {
        firstName: true,
        lastName: true,
        patientCode: true,
        telephone: true
      },
      orderBy: [
        { lastName: 'asc' },
        { firstName: 'asc' }
      ]
    });

    console.log(`\n👥 Souhaieb's assigned patients (${souhaiebPatients.length}):`);
    souhaiebPatients.forEach((patient, index) => {
      console.log(`   ${index + 1}. ${patient.firstName} ${patient.lastName} (${patient.patientCode}) - ${patient.telephone || 'No phone'}`);
    });

    // Show technician distribution
    const technicianDistribution = await prisma.patient.groupBy({
      by: ['technicianId'],
      _count: { technicianId: true },
      where: { technicianId: { not: null } }
    });

    console.log(`\n📊 Patient distribution by technician:`);
    for (const dist of technicianDistribution) {
      if (dist.technicianId) {
        const tech = await prisma.user.findUnique({
          where: { id: dist.technicianId },
          select: { firstName: true, lastName: true }
        });
        console.log(`   - ${tech?.firstName} ${tech?.lastName}: ${dist._count.technicianId} patients`);
      }
    }

  } catch (error) {
    console.error('❌ Fatal error updating patient assignments:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the update
updatePatientTechnicianAssignments()
  .then(() => {
    console.log('\n✅ Patient-technician assignment update completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Patient assignment update failed:', error);
    process.exit(1);
  });