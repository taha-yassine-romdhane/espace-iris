import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const session = await getServerSession(req, res, authOptions);

    // Only allow ADMIN users to import data
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Unauthorized. Admin access required.' });
    }

    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { step } = req.body;

    // Import happens in steps to handle dependencies
    // Step 1: Import Doctors and Employees (Users)
    // Step 2: Import Patients
    // Step 3: Import Devices
    // Step 4: Import Rentals
    // Step 5: Import Payments/Periods

    const importDir = path.join(process.cwd(), 'public/Data-base-excell/import-ready');
    const transformedDir = path.join(process.cwd(), 'public/Data-base-excell/transformed');

    if (step === 'users' || step === 'all') {
      console.log('📥 Importing Users (Doctors & Employees)...');

      const doctorsData = JSON.parse(fs.readFileSync(path.join(importDir, 'doctors-import.json'), 'utf8'));
      const employeesData = JSON.parse(fs.readFileSync(path.join(importDir, 'employees-import.json'), 'utf8'));

      let doctorsCreated = 0;
      let employeesCreated = 0;

      // Import Doctors
      for (const doctor of doctorsData) {
        try {
          const hashedPassword = await bcrypt.hash(doctor.password, 10);

          // Check if user already exists
          const existingUser = await prisma.user.findUnique({
            where: { email: doctor.email }
          });

          if (!existingUser) {
            await prisma.user.create({
              data: {
                email: doctor.email,
                password: hashedPassword,
                role: 'DOCTOR',
                firstName: doctor.firstName,
                lastName: doctor.lastName,
                isActive: true,
                doctor: {
                  create: {}
                }
              }
            });
            doctorsCreated++;
          }
        } catch (error) {
          console.error(`Error creating doctor ${doctor.email}:`, error);
        }
      }

      // Import Employees
      for (const employee of employeesData) {
        try {
          const hashedPassword = await bcrypt.hash(employee.password, 10);

          const existingUser = await prisma.user.findUnique({
            where: { email: employee.email }
          });

          if (!existingUser) {
            await prisma.user.create({
              data: {
                email: employee.email,
                password: hashedPassword,
                role: 'EMPLOYEE',
                firstName: employee.firstName,
                lastName: employee.lastName,
                isActive: true,
              }
            });
            employeesCreated++;
          }
        } catch (error) {
          console.error(`Error creating employee ${employee.email}:`, error);
        }
      }

      if (step === 'users') {
        return res.status(200).json({
          success: true,
          step: 'users',
          results: {
            doctorsCreated,
            employeesCreated,
            totalUsers: doctorsCreated + employeesCreated
          }
        });
      }
    }

    if (step === 'patients' || step === 'all') {
      console.log('📥 Importing Patients...');

      const patientsData = JSON.parse(fs.readFileSync(path.join(transformedDir, 'patients.json'), 'utf8'));
      let patientsCreated = 0;

      for (const patient of patientsData) {
        try {
          // Find doctor by name
          let doctorId = null;
          if (patient.doctorName) {
            const doctor = await prisma.user.findFirst({
              where: {
                role: 'DOCTOR',
                OR: [
                  { firstName: { contains: patient.doctorName.split(' ')[0], mode: 'insensitive' } },
                  { lastName: { contains: patient.doctorName.split(' ').pop(), mode: 'insensitive' } }
                ]
              },
              include: { doctor: true }
            });
            doctorId = doctor?.doctor?.id || null;
          }

          // Check if patient already exists by patientCode
          const existingPatient = await prisma.patient.findUnique({
            where: { patientCode: patient.patientCode }
          });

          if (!existingPatient) {
            await prisma.patient.create({
              data: {
                patientCode: patient.patientCode,
                firstName: patient.firstName,
                lastName: patient.lastName,
                cin: patient.cin,
                dateOfBirth: patient.dateOfBirth ? new Date(patient.dateOfBirth) : null,
                governorate: patient.region,
                delegation: patient.delegation,
                detailedAddress: patient.address,
                telephone: patient.telephone,
                telephoneTwo: patient.telephoneTwo,
                cnamId: patient.cnamId,
                doctorId: doctorId,
                generalNote: patient.notes,
                userId: session.user.id,
              }
            });
            patientsCreated++;
          }
        } catch (error) {
          console.error(`Error creating patient ${patient.patientCode}:`, error);
        }
      }

      if (step === 'patients') {
        return res.status(200).json({
          success: true,
          step: 'patients',
          results: { patientsCreated }
        });
      }
    }

    if (step === 'devices' || step === 'all') {
      console.log('📥 Importing Devices...');

      const devicesData = JSON.parse(fs.readFileSync(path.join(transformedDir, 'devices.json'), 'utf8'));
      let devicesCreated = 0;

      for (const device of devicesData) {
        try {
          // Check if device already exists by deviceCode
          const existingDevice = await prisma.medicalDevice.findUnique({
            where: { deviceCode: device.deviceCode }
          });

          if (!existingDevice) {
            await prisma.medicalDevice.create({
              data: {
                deviceCode: device.deviceCode,
                type: device.type,
                name: device.name,
                serialNumber: device.serialNumber,
                status: device.status,
                location: device.location,
              }
            });
            devicesCreated++;
          }
        } catch (error) {
          console.error(`Error creating device ${device.deviceCode}:`, error);
        }
      }

      if (step === 'devices') {
        return res.status(200).json({
          success: true,
          step: 'devices',
          results: { devicesCreated }
        });
      }
    }

    if (step === 'rentals' || step === 'all') {
      console.log('📥 Importing Rentals...');

      const rentalsData = JSON.parse(fs.readFileSync(path.join(transformedDir, 'rentals.json'), 'utf8'));
      let rentalsCreated = 0;

      for (const rental of rentalsData) {
        try {
          // Find patient by patientCode
          const patient = await prisma.patient.findUnique({
            where: { patientCode: rental.patientId }
          });

          if (!patient) {
            console.warn(`Patient not found: ${rental.patientId}`);
            continue;
          }

          // Find device by deviceCode
          const device = await prisma.medicalDevice.findUnique({
            where: { deviceCode: rental.deviceId }
          });

          if (!device) {
            console.warn(`Device not found: ${rental.deviceId}`);
            continue;
          }

          // Find technician by name
          let technicianId = null;
          if (rental.technicianName) {
            const technician = await prisma.user.findFirst({
              where: {
                role: 'EMPLOYEE',
                OR: [
                  { firstName: { contains: rental.technicianName.split(' ')[0], mode: 'insensitive' } },
                  { lastName: { contains: rental.technicianName.split(' ').pop(), mode: 'insensitive' } }
                ]
              }
            });
            technicianId = technician?.id || null;
          }

          // Find supervisor by name
          let supervisorId = null;
          if (rental.supervisorName) {
            const supervisor = await prisma.user.findFirst({
              where: {
                role: 'EMPLOYEE',
                OR: [
                  { firstName: { contains: rental.supervisorName.split(' ')[0], mode: 'insensitive' } },
                  { lastName: { contains: rental.supervisorName.split(' ').pop(), mode: 'insensitive' } }
                ]
              }
            });
            supervisorId = supervisor?.id || null;
          }

          // Check if rental already exists
          const existingRental = await prisma.rental.findFirst({
            where: { rentalCode: rental.rentalCode }
          });

          if (!existingRental) {
            await prisma.rental.create({
              data: {
                rentalCode: rental.rentalCode,
                patientId: patient.id,
                medicalDeviceId: device.id,
                startDate: new Date(rental.startDate),
                endDate: rental.endDate ? new Date(rental.endDate) : null,
                status: rental.status,
                createdById: technicianId || session.user.id,
                assignedToId: supervisorId,
                notes: rental.notes,
                configuration: {
                  create: {
                    rentalRate: rental.monthlyRate,
                    billingCycle: 'MONTHLY',
                    isGlobalOpenEnded: rental.endDate ? false : true,
                    cnamEligible: !!patient.cnamId,
                  }
                }
              }
            });
            rentalsCreated++;
          }
        } catch (error) {
          console.error(`Error creating rental ${rental.rentalCode}:`, error);
        }
      }

      if (step === 'rentals') {
        return res.status(200).json({
          success: true,
          step: 'rentals',
          results: { rentalsCreated }
        });
      }
    }

    if (step === 'payments' || step === 'all') {
      console.log('📥 Importing Payments/Periods...');

      const paymentsData = JSON.parse(fs.readFileSync(path.join(transformedDir, 'payments.json'), 'utf8'));
      let paymentsCreated = 0;
      let periodsCreated = 0;

      for (const payment of paymentsData) {
        try {
          // Find rental by rentalCode
          const rental = await prisma.rental.findFirst({
            where: { rentalCode: payment.rentalId }
          });

          if (!rental) {
            console.warn(`Rental not found: ${payment.rentalId}`);
            continue;
          }

          // Create payment
          const createdPayment = await prisma.payment.create({
            data: {
              paymentCode: payment.originalId,
              rentalId: rental.id,
              amount: payment.amount,
              paymentDate: new Date(payment.periodEndDate), // Use end date as payment date
              periodStartDate: new Date(payment.periodStartDate),
              periodEndDate: new Date(payment.periodEndDate),
              method: payment.paymentType,
              paymentType: 'RENTAL',
              status: 'PAID',
            }
          });
          paymentsCreated++;

          // Also create rental period
          await prisma.rentalPeriod.create({
            data: {
              rentalId: rental.id,
              startDate: new Date(payment.periodStartDate),
              endDate: new Date(payment.periodEndDate),
              expectedAmount: payment.amount,
              isGapPeriod: payment.hasGap,
              gapReason: payment.hasGap ? `Gap of ${payment.gapDays} days` : null,
            }
          });
          periodsCreated++;

        } catch (error) {
          console.error(`Error creating payment ${payment.originalId}:`, error);
        }
      }

      if (step === 'payments') {
        return res.status(200).json({
          success: true,
          step: 'payments',
          results: { paymentsCreated, periodsCreated }
        });
      }
    }

    // If step is 'all', return combined results
    return res.status(200).json({
      success: true,
      step: 'all',
      message: 'All data imported successfully'
    });

  } catch (error) {
    console.error('Error in import:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
