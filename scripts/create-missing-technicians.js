const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function createMissingTechnicians() {
  try {
    console.log('🚀 Creating missing technicians...\n');

    // Load technician mappings
    const mappingsPath = path.join(__dirname, '../public/excell/json-data/technician-mappings.json');
    const mappings = JSON.parse(fs.readFileSync(mappingsPath, 'utf8'));
    
    const newUsers = mappings.newUsersToCreate;
    console.log(`📋 Found ${newUsers.length} users to create\n`);

    const createdUsers = [];

    for (const userData of newUsers) {
      try {
        console.log(`Creating user: ${userData.firstName} ${userData.lastName}`);
        
        // Hash password
        const hashedPassword = await bcrypt.hash(userData.password, 12);
        
        // Create user and technician in a transaction
        const result = await prisma.$transaction(async (tx) => {
          // Create user
          const newUser = await tx.user.create({
            data: {
              email: userData.email,
              password: hashedPassword,
              firstName: userData.firstName,
              lastName: userData.lastName,
              role: userData.role,
              telephone: userData.telephone || null,
              isActive: userData.isActive
            }
          });

          // Create technician record
          const newTechnician = await tx.technician.create({
            data: {
              userId: newUser.id
            }
          });

          return { user: newUser, technician: newTechnician };
        });

        createdUsers.push(result);
        console.log(`✅ Created: ${userData.firstName} ${userData.lastName} (${userData.email})`);
        
      } catch (error) {
        console.error(`❌ Error creating ${userData.firstName} ${userData.lastName}:`, error.message);
      }
    }

    console.log(`\n📊 Created ${createdUsers.length} technicians\n`);

    // Now update the rental mappings and fix rental assignments
    if (createdUsers.length > 0) {
      console.log('🔧 Updating rental assignments...\n');
      
      // Find Souhaieb's user ID
      const souhaiebUser = createdUsers.find(u => 
        u.user.firstName.toUpperCase() === 'SOUHAIEB'
      );
      
      if (souhaiebUser) {
        console.log(`Found Souhaieb user ID: ${souhaiebUser.user.id}`);
        
        // Update rental configurations that were incorrectly mapped
        // Find configurations that mention Souhaieb in notes
        const configurationsToUpdate = await prisma.rentalConfiguration.findMany({
          where: {
            notes: {
              contains: 'SOUHAIEB BEN SAHRA'
            }
          },
          include: {
            rental: true
          }
        });
        
        console.log(`📋 Found ${configurationsToUpdate.length} rental configurations mentioning Souhaieb`);
        
        // Update the notes to reflect correct technician
        for (const config of configurationsToUpdate) {
          const updatedNotes = config.notes.replace(
            /Technician: ([^,]+)/,
            `Technician: SOUHAIEB BEN SAHRA (ID: ${souhaiebUser.user.id})`
          );
          
          await prisma.rentalConfiguration.update({
            where: { id: config.id },
            data: { notes: updatedNotes }
          });
          
          console.log(`✅ Updated configuration for rental: ${config.rental.rentalCode}`);
        }
      }

      // Create updated mappings file
      const updatedMappings = {
        ...mappings,
        technicianMappings: {
          ...mappings.technicianMappings,
          "SOUHAIEB BEN SAHRA": {
            userId: souhaiebUser?.user.id || null,
            fullName: `${souhaiebUser?.user.firstName} ${souhaiebUser?.user.lastName}`,
            email: souhaiebUser?.user.email,
            note: "Created successfully"
          },
          "SOUHAIEB": {
            userId: souhaiebUser?.user.id || null,
            fullName: `${souhaiebUser?.user.firstName} ${souhaiebUser?.user.lastName}`,
            email: souhaiebUser?.user.email,
            note: "Created successfully"
          }
        },
        supervisorMappings: {
          ...mappings.supervisorMappings,
          "SOUHAIEB BEN SAHRA": {
            userId: souhaiebUser?.user.id || null,
            fullName: `${souhaiebUser?.user.firstName} ${souhaiebUser?.user.lastName}`,
            email: souhaiebUser?.user.email,
            note: "Created successfully"
          }
        }
      };

      // Save updated mappings
      const updatedMappingsPath = path.join(__dirname, '../public/excell/json-data/rental-mappings-updated.json');
      fs.writeFileSync(updatedMappingsPath, JSON.stringify(updatedMappings, null, 2));
      console.log(`💾 Updated mappings saved to: ${updatedMappingsPath}`);
    }

    // Verification
    const totalTechnicians = await prisma.technician.count();
    const totalUsers = await prisma.user.count({
      where: { role: 'EMPLOYEE' }
    });
    
    console.log(`\n📈 Final counts:`);
    console.log(`   - Total technicians: ${totalTechnicians}`);
    console.log(`   - Total employee users: ${totalUsers}`);

    // Show all technicians
    const allTechnicians = await prisma.technician.findMany({
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });

    console.log('\n👥 All technicians in database:');
    allTechnicians.forEach(tech => {
      console.log(`   - ${tech.user.firstName} ${tech.user.lastName} (${tech.user.email})`);
    });

  } catch (error) {
    console.error('❌ Fatal error creating technicians:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the creation
createMissingTechnicians()
  .then(() => {
    console.log('\n✅ Missing technicians creation completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Technicians creation failed:', error);
    process.exit(1);
  });