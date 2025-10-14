import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';
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

    const { id } = req.query;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'ID patient requis' });
    }

    // Get doctor record
    const doctor = await prisma.doctor.findUnique({
      where: { userId: session.user.id }
    });

    if (!doctor) {
      return res.status(404).json({ error: 'Docteur non trouvé' });
    }

    // Fetch patient details - make sure it belongs to this doctor
    const patient = await prisma.patient.findFirst({
      where: { 
        id: id,
        doctorId: doctor.id // Ensure the patient belongs to this doctor
      },
      include: {
        medicalDevices: {
          where: { status: 'ACTIVE' },
          orderBy: { createdAt: 'desc' }
        },
        diagnostics: {
          orderBy: { createdAt: 'desc' },
          include: {
            result: true,
            medicalDevice: {
              select: {
                name: true,
                type: true
              }
            }
          }
        },
        appointments: {
          orderBy: { scheduledDate: 'desc' },
          take: 10
        },
        rentals: {
          orderBy: { createdAt: 'desc' },
          include: {
            medicalDevice: {
              select: {
                name: true,
                type: true
              }
            }
          },
          take: 10
        }
      }
    });

    if (!patient) {
      return res.status(404).json({ error: 'Patient non trouvé ou non accessible' });
    }

    // Transform the data for frontend
    const transformedPatient = {
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
        status: device.status,
        installationDate: device.installationDate?.toISOString(),
        configuration: device.configuration
      })),
      diagnostics: patient.diagnostics.map(diagnostic => ({
        id: diagnostic.id,
        diagnosticDate: diagnostic.diagnosticDate.toISOString(),
        status: diagnostic.status,
        notes: diagnostic.notes,
        medicalDevice: {
          name: diagnostic.medicalDevice.name,
          type: diagnostic.medicalDevice.type
        },
        result: diagnostic.result ? {
          iah: diagnostic.result.iah,
          idValue: diagnostic.result.idValue,
          remarque: diagnostic.result.remarque,
          status: diagnostic.result.status
        } : null
      })),
      appointments: patient.appointments.map(appointment => ({
        id: appointment.id,
        scheduledDate: appointment.scheduledDate.toISOString(),
        appointmentType: appointment.appointmentType,
        status: appointment.status,
        location: appointment.location,
        notes: appointment.notes
      })),
      rentals: patient.rentals.map(rental => ({
        id: rental.id,
        startDate: rental.startDate.toISOString(),
        endDate: rental.endDate?.toISOString(),
        status: rental.status,
        medicalDevice: {
          name: rental.medicalDevice.name,
          type: rental.medicalDevice.type
        }
      }))
    };

    return res.status(200).json({
      patient: transformedPatient
    });

  } catch (error) {
    console.error('Error fetching patient detail:', error);
    return res.status(500).json({ 
      error: 'Erreur lors du chargement du patient' 
    });
  }
}