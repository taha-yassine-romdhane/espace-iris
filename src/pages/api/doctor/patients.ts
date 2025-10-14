import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { prisma } from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session || !session.user) {
      return res.status(401).json({ error: 'Non autorisé' });
    }

    if (session.user.role !== 'DOCTOR') {
      return res.status(403).json({ error: 'Accès refusé' });
    }

    // Get doctor record
    const doctor = await prisma.doctor.findUnique({
      where: { userId: session.user.id }
    });

    if (!doctor) {
      return res.status(404).json({ error: 'Docteur non trouvé' });
    }

    // Fetch patients assigned to this doctor
    const patients = await prisma.patient.findMany({
      where: { doctorId: doctor.id },
      include: {
        medicalDevices: {
          where: { status: 'ACTIVE' },
          take: 3
        },
        diagnostics: {
          orderBy: { createdAt: 'desc' },
          take: 3,
          include: {
            result: true
          }
        },
        appointments: {
          where: {
            scheduledDate: { gte: new Date() }
          },
          orderBy: { scheduledDate: 'asc' },
          take: 3
        }
      },
      orderBy: { updatedAt: 'desc' }
    });

    // Transform the data for frontend
    const transformedPatients = patients.map(patient => ({
      id: patient.id,
      firstName: patient.firstName,
      lastName: patient.lastName,
      telephone: patient.telephone,
      telephoneTwo: patient.telephoneTwo,
      governorate: patient.governorate,
      delegation: patient.delegation,
      detailedAddress: patient.detailedAddress,
      dateOfBirth: patient.dateOfBirth?.toISOString(),
      cin: patient.cin,
      cnamId: patient.cnamId,
      beneficiaryType: patient.beneficiaryType,
      affiliation: patient.affiliation,
      medicalHistory: patient.medicalHistory,
      generalNote: patient.generalNote,
      weight: patient.weight,
      height: patient.height,
      imc: patient.imc,
      createdAt: patient.createdAt.toISOString(),
      updatedAt: patient.updatedAt.toISOString(),
      medicalDevices: patient.medicalDevices.map(device => ({
        id: device.id,
        name: device.name,
        type: device.type,
        status: device.status
      })),
      diagnostics: patient.diagnostics.map(diagnostic => ({
        id: diagnostic.id,
        diagnosticDate: diagnostic.diagnosticDate.toISOString(),
        status: diagnostic.status,
        notes: diagnostic.notes
      })),
      appointments: patient.appointments.map(appointment => ({
        id: appointment.id,
        scheduledDate: appointment.scheduledDate.toISOString(),
        appointmentType: appointment.appointmentType,
        status: appointment.status
      }))
    }));

    return res.status(200).json({
      patients: transformedPatients,
      total: transformedPatients.length
    });

  } catch (error) {
    console.error('Error fetching doctor patients:', error);
    return res.status(500).json({ 
      error: 'Erreur lors du chargement des patients' 
    });
  }
}