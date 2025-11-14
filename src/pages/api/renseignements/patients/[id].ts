import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]';
import prisma from '@/lib/db';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const { id } = req.query;
  
  if (!id || typeof id !== 'string') {
    res.status(400).json({ error: 'Patient ID is required' });
    return;
  }

  try {
    if (req.method === 'GET') {
      // Get a specific patient by ID
      const patient = await prisma.patient.findUnique({
        where: { id },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          telephone: true,
          telephoneTwo: true,
          governorate: true,
          delegation: true,
          detailedAddress: true,
          addressCoordinates: true,
          cin: true,
          cnamId: true,
          antecedant: true,
          height: true,
          weight: true,
          dateOfBirth: true,
          beneficiaryType: true,
          affiliation: true,
          generalNote: true,
          doctorId: true,
          technicianId: true,
          supervisorId: true,
          createdAt: true,
          updatedAt: true,
          doctor: {
            include: {
              user: true
            }
          },
          technician: true,
          supervisor: true,
          assignedTo: true,
          files: true
        }
      });

      if (!patient) {
        return res.status(404).json({ error: 'Patient not found' });
      }

      return res.status(200).json(patient);
    } else if (req.method === 'DELETE') {
      console.log(`Attempting to delete patient with ID: ${id}`);

      // Check if patient exists first
      const patientExists = await prisma.patient.findUnique({
        where: { id },
        include: {
          rentals: true,
          sales: true,
          diagnostics: true,
          payments: true,
          PatientHistory: true,
          appointments: true,
          notifications: true,
          cnamBonRentals: true,
          cnamDossiers: true,
          manualTasks: true,
        }
      });

      if (!patientExists) {
        console.log(`Patient with ID ${id} does not exist`);
        return res.status(404).json({ error: 'Patient not found' });
      }

      // Check for blocking relationships
      const hasRentals = patientExists.rentals.length > 0;
      const hasSales = patientExists.sales.length > 0;
      const hasDiagnostics = patientExists.diagnostics.length > 0;
      const hasPayments = patientExists.payments.length > 0;

      if (hasRentals || hasSales || hasDiagnostics || hasPayments) {
        console.log(`Patient has related records: rentals=${hasRentals}, sales=${hasSales}, diagnostics=${hasDiagnostics}, payments=${hasPayments}`);
        return res.status(400).json({
          error: 'Impossible de supprimer ce patient car il a des enregistrements associés (locations, ventes, diagnostics ou paiements). Veuillez d\'abord supprimer ces enregistrements.'
        });
      }

      // Use transaction to delete all related records safely
      await prisma.$transaction(async (tx) => {
        // Delete patient history
        await tx.patientHistory.deleteMany({
          where: { patientId: id }
        });
        console.log(`Deleted patient history for patient: ${id}`);

        // Delete notifications
        await tx.notification.deleteMany({
          where: { patientId: id }
        });
        console.log(`Deleted notifications for patient: ${id}`);

        // Delete appointments
        await tx.appointment.deleteMany({
          where: { patientId: id }
        });
        console.log(`Deleted appointments for patient: ${id}`);

        // Delete manual tasks
        await tx.manualTask.deleteMany({
          where: { patientId: id }
        });
        console.log(`Deleted manual tasks for patient: ${id}`);

        // Delete CNAM bon rentals
        await tx.cNAMBonRental.deleteMany({
          where: { patientId: id }
        });
        console.log(`Deleted CNAM bon rentals for patient: ${id}`);

        // Delete CNAM dossiers
        await tx.cNAMDossier.deleteMany({
          where: { patientId: id }
        });
        console.log(`Deleted CNAM dossiers for patient: ${id}`);

        // Delete medical device parameters
        await tx.medicalDeviceParametre.deleteMany({
          where: { patientId: id }
        });
        console.log(`Deleted medical device parameters for patient: ${id}`);

        // Delete files
        await tx.file.deleteMany({
          where: { patientId: id }
        });
        console.log(`Deleted files for patient: ${id}`);

        // Finally delete the patient
        const deletedPatient = await tx.patient.delete({
          where: { id }
        });
        console.log(`Successfully deleted patient: ${id}`);

        return deletedPatient;
      });

      return res.status(200).json({
        message: 'Patient deleted successfully'
      });
    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Error handling patient request:', error);
    
    res.status(500).json({ error: 'Failed to process patient request' });
  }
}
