import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/db';
import { Prisma, Role } from '@prisma/client';
import { hash } from 'bcryptjs';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!prisma) {
    return res.status(500).json({ error: 'Database connection not initialized' });
  }

  // CREATE user
  if (req.method === 'POST') {
    try {
      const { firstName, lastName, email, password, telephone, role, address, speciality } = req.body;
      if (!firstName || !lastName || !email || !password || !role) {
        return res.status(400).json({ error: 'Missing required fields' });
      }
      const hashedPassword = await hash(password, 12);
      const user = await prisma.$transaction(async (tx) => {
        const newUser = await tx.user.create({
          data: {
            firstName, lastName, email, password: hashedPassword,
            telephone: telephone || null, address: address || null, speciality: speciality || null,
            role: role as Role, isActive: true,
          },
        });
        if (newUser.role === 'DOCTOR') {
          await tx.doctor.create({ data: { userId: newUser.id } });
        }
        if (newUser.role === 'EMPLOYEE') {
          await tx.technician.create({ data: { userId: newUser.id, specialty: speciality || null } });
        }
        return newUser;
      });
      return res.status(201).json(user);
    } catch (error) {
      console.error('Error creating user:', error);
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        return res.status(400).json({ error: 'Email already exists' });
      }
      return res.status(500).json({ error: 'Internal server error while creating user.' });
    }
  }
  // GET users
  else if (req.method === 'GET') {
    try {
      const users = await prisma.user.findMany({
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, firstName: true, lastName: true, email: true, telephone: true,
          address: true, speciality: true, role: true, isActive: true,
          _count: {
            select: {
              supervisorPatients: true,
              technicianPatients: true,
              assignedPatients: true,
              performedDiagnostics: true,
              tasks: true,
            }
          }
        },
      });

      // Get additional counts for employees and admins
      const transformedUsers = await Promise.all(users.map(async (user) => {
        let stockCount = 0;
        let devicesCount = 0;
        let productsCount = 0;
        let patientCount = 0;

        if (user.role === 'EMPLOYEE') {
          // Get stock locations for this employee
          const stockLocations = await prisma.stockLocation.findMany({
            where: { userId: user.id },
            select: { id: true }
          });

          stockCount = stockLocations.length;

          // Count medical devices in this employee's stock locations
          for (const location of stockLocations) {
            const deviceCount = await prisma.medicalDevice.count({
              where: { stockLocationId: location.id }
            });
            devicesCount += deviceCount;

            const productCount = await prisma.stock.count({
              where: { locationId: location.id }
            });
            productsCount += productCount;
          }

          // Count patients for employees
          patientCount = user._count.supervisorPatients + user._count.technicianPatients + user._count.assignedPatients;
        } else if (user.role === 'ADMIN') {
          // Count medical devices in admin's stock location (if they have one)
          const adminStockLocation = await prisma.stockLocation.findFirst({
            where: { userId: user.id },
            select: { id: true }
          });

          if (adminStockLocation) {
            devicesCount = await prisma.medicalDevice.count({
              where: { stockLocationId: adminStockLocation.id }
            });
          }

          // Count patients for admins
          patientCount = user._count.supervisorPatients + user._count.technicianPatients + user._count.assignedPatients;
        } else if (user.role === 'DOCTOR') {
          // For doctors, count patients through the Doctor relation
          const doctor = await prisma.doctor.findUnique({
            where: { userId: user.id },
            select: {
              _count: {
                select: { patients: true }
              }
            }
          });

          patientCount = doctor?._count.patients || 0;
        }

        return {
          ...user,
          name: `${user.firstName} ${user.lastName}`.trim(),
          stats: {
            patients: patientCount,
            sales: 0, // Not directly tracked
            diagnostics: user._count.performedDiagnostics,
            tasks: user._count.tasks,
            stockLocations: stockCount,
            devices: devicesCount,
            products: productsCount,
          }
        };
      }));

      return res.status(200).json({ users: transformedUsers });
    } catch (error) {
      console.error('Error fetching users:', error);
      return res.status(500).json({ error: 'Internal server error while fetching users.' });
    }
  }
  // UPDATE user
  else if (req.method === 'PUT') {
    try {
      const { id, firstName, lastName, email, password, telephone, address, speciality, role, isActive } = req.body;
      if (!id || !firstName || !lastName || !email || !role) {
        return res.status(400).json({ error: 'Missing required fields' });
      }
      const updateData: Prisma.UserUpdateInput = {
        firstName, lastName, email, role: role as Role, isActive,
        telephone: telephone || null, address: address || null, speciality: speciality || null,
      };
      if (password) {
        updateData.password = await hash(password, 12);
      }

      const user = await prisma.$transaction(async (tx) => {
        const currentUser = await tx.user.findUnique({ where: { id }, select: { role: true } });
        const updatedUser = await tx.user.update({ where: { id }, data: updateData });

        if (currentUser && currentUser.role !== updatedUser.role) {
          if (updatedUser.role === 'DOCTOR') {
            const existingDoctor = await tx.doctor.findUnique({ where: { userId: updatedUser.id } });
            if (!existingDoctor) await tx.doctor.create({ data: { userId: updatedUser.id } });
          } else if (updatedUser.role === 'EMPLOYEE') {
            const existingTechnician = await tx.technician.findFirst({ where: { userId: updatedUser.id } });
            if (!existingTechnician) await tx.technician.create({ data: { userId: updatedUser.id, specialty: speciality || null } });
          }
        }
        return updatedUser;
      });

      return res.status(200).json(user);
    } catch (error) {
      console.error('Error updating user:', error);
      return res.status(500).json({ error: 'Internal server error while updating user.' });
    }
  }
  // DELETE user
  else if (req.method === 'DELETE') {
    const { id } = req.query;
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'User ID is required' });
    }
    try {
      await prisma.$transaction(async (tx) => {
        // First, check if user exists
        const userExists = await tx.user.findUnique({ where: { id } });
        if (!userExists) {
          throw new Error('User not found');
        }

        // Step 1: Handle optional relations - Set foreign keys to null

        // Update patients where user is doctor (doctorId is optional)
        await tx.patient.updateMany({
          where: { doctorId: id },
          data: { doctorId: null }
        });

        // Update patients where user is technician (technicianId is optional)
        await tx.patient.updateMany({
          where: { technicianId: id },
          data: { technicianId: null }
        });

        // Update companies where user is technician (technicianId is optional)
        await tx.company.updateMany({
          where: { technicianId: id },
          data: { technicianId: null }
        });
        
        // Update tasks where user completed them
        await tx.task.updateMany({ 
          where: { completedById: id }, 
          data: { completedById: null } 
        });
        
        // Update stock locations where user is assigned
        await tx.stockLocation.updateMany({ 
          where: { userId: id }, 
          data: { userId: null } 
        });
        
        // Update stock transfers - set optional user fields to null
        await tx.stockTransfer.updateMany({ 
          where: { sentById: id }, 
          data: { sentById: null } 
        });
        
        await tx.stockTransfer.updateMany({ 
          where: { receivedById: id }, 
          data: { receivedById: null } 
        });
        
        await tx.stockTransfer.updateMany({ 
          where: { verifiedById: id }, 
          data: { verifiedById: null } 
        });
        
        // Update diagnostics where user performed them
        await tx.diagnostic.updateMany({ 
          where: { performedById: id }, 
          data: { performedById: null } 
        });

        // Step 2: Delete records with mandatory relations to this user
        
        // Delete sales processed by this user
        await tx.sale.deleteMany({ 
          where: { processedById: id } 
        });
        
        // Delete stock transfers initiated by this user (mandatory relation)
        await tx.stockTransfer.deleteMany({ 
          where: { transferredById: id } 
        });
        
        // Delete tasks assigned to this user
        await tx.task.deleteMany({ 
          where: { userId: id } 
        });
        
        // Delete notifications for this user
        await tx.notification.deleteMany({ 
          where: { userId: id } 
        });
        
        // Delete user action history
        await tx.userActionHistory.deleteMany({ 
          where: { userId: id } 
        });
        
        // Delete patient history performed by this user
        await tx.patientHistory.deleteMany({ 
          where: { performedById: id } 
        });

        // Step 3: Delete role-specific records
        
        // Delete doctor record if exists
        await tx.doctor.deleteMany({ 
          where: { userId: id } 
        });
        
        // Delete technician records if exist
        await tx.technician.deleteMany({ 
          where: { userId: id } 
        });

        // Step 4: Handle records created by user (patients and companies have mandatory userId)
        // Note: userId is mandatory in both Patient and Company models
        
        // Get all patients created by this user
        const userPatients = await tx.patient.findMany({ 
          where: { userId: id },
          select: { id: true }
        });
        
        // Get all companies created by this user  
        const userCompanies = await tx.company.findMany({ 
          where: { userId: id },
          select: { id: true }
        });
        
        // Delete related records for patients created by this user
        for (const patient of userPatients) {
          await tx.file.deleteMany({ where: { patientId: patient.id } });
          await tx.payment.deleteMany({ where: { patientId: patient.id } });
          await tx.diagnostic.deleteMany({ where: { patientId: patient.id } });
          await tx.appointment.deleteMany({ where: { patientId: patient.id } });
          await tx.rental.deleteMany({ where: { patientId: patient.id } });
          await tx.notification.deleteMany({ where: { patientId: patient.id } });
          await tx.sale.deleteMany({ where: { patientId: patient.id } });
          await tx.patientHistory.deleteMany({ where: { patientId: patient.id } });
          await tx.medicalDeviceParametre.deleteMany({ where: { patientId: patient.id } });
        }
        
        // Delete related records for companies created by this user
        for (const company of userCompanies) {
          await tx.file.deleteMany({ where: { companyId: company.id } });
          await tx.payment.deleteMany({ where: { companyId: company.id } });
          await tx.diagnostic.deleteMany({ where: { companyId: company.id } });
          await tx.appointment.deleteMany({ where: { companyId: company.id } });
          await tx.notification.deleteMany({ where: { companyId: company.id } });
          await tx.sale.deleteMany({ where: { companyId: company.id } });
        }
        
        // Now delete the patients and companies (they have mandatory userId)
        await tx.patient.deleteMany({ where: { userId: id } });
        await tx.company.deleteMany({ where: { userId: id } });

        // Step 5: Finally, delete the user
        await tx.user.delete({ where: { id } });
      });
      
      return res.status(204).end();
    } catch (error) {
      console.error('Error deleting user:', error);
      
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          return res.status(404).json({ error: 'User not found' });
        }
        if (error.code === 'P2003') {
          return res.status(409).json({ error: 'Cannot delete user due to existing relations that cannot be removed.' });
        }
      }
      
      if (error instanceof Error && error.message === 'User not found') {
        return res.status(404).json({ error: 'User not found' });
      }
      
      return res.status(500).json({ error: 'Failed to delete user and associated data.' });
    }
  } else {
    res.setHeader('Allow', ['POST', 'GET', 'PUT', 'DELETE']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}