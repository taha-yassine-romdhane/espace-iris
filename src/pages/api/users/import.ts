import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { users } = req.body;

    if (!users || !Array.isArray(users)) {
      return res.status(400).json({ error: 'Invalid data format' });
    }

    let imported = 0;
    const errors: string[] = [];

    for (const userData of users) {
      try {
        const { firstName, lastName, email, password, role, telephone, address, speciality, isActive } = userData;

        // Validate required fields
        if (!email || !password || !firstName || !lastName) {
          errors.push(`Missing required fields for user: ${email || 'unknown'}`);
          continue;
        }

        // Ensure password is a string (Excel might convert to number)
        const passwordString = String(password).trim();
        if (!passwordString || passwordString.length < 1) {
          errors.push(`Invalid password for user: ${email}`);
          continue;
        }

        // Validate role
        const validRoles = ['ADMIN', 'MANAGER', 'DOCTOR', 'EMPLOYEE'];
        const userRole = String(role || 'EMPLOYEE').trim().toUpperCase();
        if (!validRoles.includes(userRole)) {
          errors.push(`Invalid role '${role}' for user: ${email}. Valid roles are: ${validRoles.join(', ')}`);
          continue;
        }

        // Check if user already exists
        const existingUser = await prisma.user.findUnique({
          where: { email },
        });

        if (existingUser) {
          errors.push(`User with email ${email} already exists`);
          continue;
        }

        // Hash the password (ensure it's a string)
        const hashedPassword = await bcrypt.hash(passwordString, 12);

        // Create the user with transaction to handle related records
        await prisma.$transaction(async (tx) => {
          const newUser = await tx.user.create({
            data: {
              email,
              password: hashedPassword,
              firstName,
              lastName,
              role: userRole as Role,
              telephone: telephone || null,
              address: address || null,
              speciality: speciality || null,
              isActive: isActive !== undefined ? isActive : true,
            },
          });

          // Create related records based on role
          if (newUser.role === 'DOCTOR') {
            await tx.doctor.create({ 
              data: { userId: newUser.id } 
            });
          }
          if (newUser.role === 'EMPLOYEE') {
            await tx.technician.create({ 
              data: { 
                userId: newUser.id, 
                specialty: speciality || null 
              } 
            });
          }
        });

        imported++;
      } catch (error) {
        console.error('Error importing user:', error);
        errors.push(`Failed to import user: ${userData.email || 'unknown'}`);
      }
    }

    return res.status(200).json({
      imported,
      total: users.length,
      errors: errors.length > 0 ? errors : undefined,
      message: `Successfully imported ${imported} out of ${users.length} users`,
    });
  } catch (error) {
    console.error('Import error:', error);
    return res.status(500).json({ error: 'Failed to import users' });
  }
}