import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('🌱 Starting database seeding...');
    
    // Hash the password with the same configuration as the application (12 rounds)
    const hashedPassword = await hash('22984695', 12);
    
    // Check if admin user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: 'taha.romdhane1999@gmail.com' }
    });
    
    if (existingUser) {
      console.log('⚠️  Admin user already exists with email: taha.romdhane1999@gmail.com');
      return;
    }
    
    // Create the admin user
    const adminUser = await prisma.user.create({
      data: {
        firstName: 'taha',
        lastName: 'yasse',
        email: 'taha.romdhane1999@gmail.com',
        password: hashedPassword,
        role: 'ADMIN',
        isActive: true,
        // Optional fields can be added later if needed
        telephone: null,
        speciality: null,
        address: null,
      }
    });
    
    console.log('✅ Admin user created successfully:');
    console.log(`   - ID: ${adminUser.id}`);
    console.log(`   - Name: ${adminUser.firstName} ${adminUser.lastName}`);
    console.log(`   - Email: ${adminUser.email}`);
    console.log(`   - Role: ${adminUser.role}`);
    console.log(`   - Created At: ${adminUser.createdAt}`);
    
  } catch (error) {
    console.error('❌ Error during seeding:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    console.log('🔌 Database connection closed.');
  });