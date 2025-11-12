import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import prisma from '@/lib/db';
import fs from 'fs/promises';
import path from 'path';

const STORAGE_BASE_PATH = '/home/taha/Desktop/projects/espace-elite-files';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;
  const { forceDelete } = req.body || {};

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Patient ID is required' });
  }

  try {
    // First, verify the patient exists and get their data
    const patient = await prisma.patient.findUnique({
      where: { id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        files: true
      }
    });

    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    // Check if patient has blockers (unless force delete is enabled)
    if (!forceDelete) {
      const [salesCount, rentalsCount, paymentsCount, diagnosticsCount, appointmentsCount] = await Promise.all([
        prisma.sale.count({ where: { patientId: id } }),
        prisma.rental.count({ where: { patientId: id } }),
        prisma.payment.count({ where: { patientId: id } }),
        prisma.diagnostic.count({ where: { patientId: id } }),
        prisma.appointment.count({ where: { patientId: id } })
      ]);

      const totalBlockers = salesCount + rentalsCount + paymentsCount + diagnosticsCount + appointmentsCount;
      
      if (totalBlockers > 0) {
        return res.status(400).json({ 
          error: 'Patient has linked records that prevent deletion',
          blockers: {
            sales: salesCount,
            rentals: rentalsCount,
            payments: paymentsCount,
            diagnostics: diagnosticsCount,
            appointments: appointmentsCount
          }
        });
      }
    }

    // Start transaction for cascade deletion
    const deletionResult = await prisma.$transaction(async (tx) => {
      const deletedCounts = {
        files: 0,
        notifications: 0,
        medicalDevices: 0,
        deviceParameters: 0,
        patientHistory: 0,
        sales: 0,
        rentals: 0,
        payments: 0,
        diagnostics: 0,
        appointments: 0
      };

      // Delete cascadable items first
      deletedCounts.files = (await tx.file.deleteMany({ where: { patientId: id } })).count;
      deletedCounts.notifications = (await tx.notification.deleteMany({ where: { patientId: id } })).count;
      deletedCounts.deviceParameters = (await tx.medicalDeviceParametre.deleteMany({ where: { patientId: id } })).count;
      // Medical devices are no longer directly linked to patients - skip this deletion
      deletedCounts.medicalDevices = 0;
      deletedCounts.patientHistory = (await tx.patientHistory.deleteMany({ where: { patientId: id } })).count;

      // If force delete is enabled, also delete blockers
      if (forceDelete) {
        // Delete related records for sales
        await tx.paymentDetail.deleteMany({
          where: {
            payment: {
              sale: {
                patientId: id
              }
            }
          }
        });

        // Delete payments for sales
        await tx.payment.deleteMany({
          where: {
            sale: {
              patientId: id
            }
          }
        });

        // Delete sales
        deletedCounts.sales = (await tx.sale.deleteMany({ where: { patientId: id } })).count;

        // Delete rentals
        deletedCounts.rentals = (await tx.rental.deleteMany({ where: { patientId: id } })).count;

        // Delete payments (direct)
        deletedCounts.payments = (await tx.payment.deleteMany({ where: { patientId: id } })).count;

        // Delete diagnostic results first, then diagnostics
        await tx.diagnosticResult.deleteMany({
          where: {
            diagnostic: {
              patientId: id
            }
          }
        });
        deletedCounts.diagnostics = (await tx.diagnostic.deleteMany({ where: { patientId: id } })).count;

        // Delete appointments
        deletedCounts.appointments = (await tx.appointment.deleteMany({ where: { patientId: id } })).count;
      }

      // Finally, delete the patient
      const deletedPatient = await tx.patient.delete({
        where: { id }
      });

      return { deletedPatient, deletedCounts };
    });

    // Delete physical files from filesystem
    if (patient.files && patient.files.length > 0) {
      try {
        const patientFolderPath = path.join(STORAGE_BASE_PATH, 'patients', id);
        await fs.rmdir(patientFolderPath, { recursive: true });
        console.log(`Deleted patient folder: ${patientFolderPath}`);
      } catch (fsError) {
        console.error('Error deleting patient files from filesystem:', fsError);
        // Don't fail the request if file deletion fails
      }
    }

    const patientName = `${patient.firstName || ''} ${patient.lastName || ''}`.trim();
    console.log(`Patient ${patientName} (${id}) deleted successfully`);
    console.log('Deletion summary:', deletionResult.deletedCounts);

    res.status(200).json({
      message: `Patient ${patientName} deleted successfully`,
      deletedRecords: deletionResult.deletedCounts,
      forceDelete: !!forceDelete
    });

  } catch (error) {
    console.error('Error deleting patient with cascade:', error);
    res.status(500).json({ error: 'Failed to delete patient' });
  }
}