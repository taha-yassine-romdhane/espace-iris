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
      
      // First delete associated files
      await prisma.file.deleteMany({
        where: {
          patientId: id
        }
      });
      
      console.log(`Deleted associated files for patient: ${id}`);

      // Then delete the patient
      const deletedPatient = await prisma.patient.delete({
        where: { id }
      });
      
      console.log(`Successfully deleted patient: ${id}`);

      return res.status(200).json({ 
        message: 'Patient deleted successfully',
        deletedPatient
      });
    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Error handling patient request:', error);
    
    res.status(500).json({ error: 'Failed to process patient request' });
  }
}
