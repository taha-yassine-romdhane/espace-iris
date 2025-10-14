import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import prisma from '@/lib/db';

interface PatientDependencies {
  canDelete: boolean;
  blockers: {
    sales: number;
    rentals: number;
    payments: number;
    diagnostics: number;
    appointments: number;
  };
  cascadable: {
    files: number;
    notifications: number;
    medicalDevices: number;
    deviceParameters: number;
    patientHistory: number;
  };
  warnings: string[];
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Patient ID is required' });
  }

  try {
    // First, verify the patient exists
    const patient = await prisma.patient.findUnique({
      where: { id },
      select: { id: true, firstName: true, lastName: true }
    });

    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    // Check all dependencies
    const [
      salesCount,
      rentalsCount,
      paymentsCount,
      diagnosticsCount,
      appointmentsCount,
      filesCount,
      notificationsCount,
      medicalDevicesCount,
      deviceParametersCount,
      patientHistoryCount
    ] = await Promise.all([
      // Blockers - These prevent deletion
      prisma.sale.count({ where: { patientId: id } }),
      prisma.rental.count({ where: { patientId: id } }),
      prisma.payment.count({ where: { patientId: id } }),
      prisma.diagnostic.count({ where: { patientId: id } }),
      prisma.appointment.count({ where: { patientId: id } }),
      
      // Cascadable - These can be deleted with patient
      prisma.file.count({ where: { patientId: id } }),
      prisma.notification.count({ where: { patientId: id } }),
      prisma.medicalDevice.count({ where: { patientId: id } }),
      prisma.medicalDeviceParametre.count({ where: { patientId: id } }),
      prisma.patientHistory.count({ where: { patientId: id } })
    ]);

    const blockers = {
      sales: salesCount,
      rentals: rentalsCount,
      payments: paymentsCount,
      diagnostics: diagnosticsCount,
      appointments: appointmentsCount
    };

    const cascadable = {
      files: filesCount,
      notifications: notificationsCount,
      medicalDevices: medicalDevicesCount,
      deviceParameters: deviceParametersCount,
      patientHistory: patientHistoryCount
    };

    // Determine if deletion is blocked
    const totalBlockers = Object.values(blockers).reduce((sum, count) => sum + count, 0);
    const canDelete = totalBlockers === 0;

    // Generate warnings
    const warnings: string[] = [];
    
    if (blockers.sales > 0) {
      warnings.push(`${blockers.sales} vente(s) enregistrée(s)`);
    }
    if (blockers.rentals > 0) {
      warnings.push(`${blockers.rentals} location(s) active(s)`);
    }
    if (blockers.payments > 0) {
      warnings.push(`${blockers.payments} paiement(s) enregistré(s)`);
    }
    if (blockers.diagnostics > 0) {
      warnings.push(`${blockers.diagnostics} diagnostic(s) effectué(s)`);
    }
    if (blockers.appointments > 0) {
      warnings.push(`${blockers.appointments} rendez-vous programmé(s)`);
    }

    const dependencies: PatientDependencies = {
      canDelete,
      blockers,
      cascadable,
      warnings
    };

    res.status(200).json({
      patient: {
        id: patient.id,
        name: `${patient.firstName || ''} ${patient.lastName || ''}`.trim()
      },
      dependencies
    });

  } catch (error) {
    console.error('Error checking patient dependencies:', error);
    res.status(500).json({ error: 'Failed to check patient dependencies' });
  }
}