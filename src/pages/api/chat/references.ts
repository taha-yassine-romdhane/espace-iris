import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import prisma from '@/lib/db';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);

    if (!session?.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { type, search } = req.query;
    const searchTerm = search as string || '';

    let results: any[] = [];

    switch (type) {
      case 'patients':
        const patients = await prisma.patient.findMany({
          where: searchTerm ? {
            OR: [
              { firstName: { contains: searchTerm, mode: 'insensitive' } },
              { lastName: { contains: searchTerm, mode: 'insensitive' } },
              { cin: { contains: searchTerm, mode: 'insensitive' } },
              { telephone: { contains: searchTerm } }
            ]
          } : {},
          select: {
            id: true,
            firstName: true,
            lastName: true,
            cin: true,
            telephone: true,
            dateOfBirth: true
          },
          take: 10,
          orderBy: [
            { firstName: 'asc' },
            { lastName: 'asc' }
          ]
        });

        results = patients.map(patient => ({
          id: patient.id,
          type: 'patient',
          title: `${patient.firstName} ${patient.lastName}`,
          subtitle: `CIN: ${patient.cin || 'N/A'} • Tel: ${patient.telephone || 'N/A'}`,
          metadata: {
            dateOfBirth: patient.dateOfBirth,
            cin: patient.cin,
            telephone: patient.telephone
          }
        }));
        break;

      case 'devices':
        const devices = await prisma.medicalDevice.findMany({
          where: searchTerm ? {
            OR: [
              { name: { contains: searchTerm, mode: 'insensitive' } },
              { serialNumber: { contains: searchTerm, mode: 'insensitive' } },
              { brand: { contains: searchTerm, mode: 'insensitive' } }
            ]
          } : {},
          include: {
            stockLocation: true,
            Patient: {
              select: {
                firstName: true,
                lastName: true
              }
            }
          },
          take: 10,
          orderBy: { name: 'asc' }
        });

        results = devices.map(device => ({
          id: device.id,
          type: 'device',
          title: device.name,
          subtitle: `S/N: ${device.serialNumber || 'N/A'} • ${device.Patient ? `Assigné à ${device.Patient.firstName} ${device.Patient.lastName}` : 'Disponible'}`,
          metadata: {
            serialNumber: device.serialNumber,
            brand: device.brand,
            model: device.model,
            status: device.status,
            assignedTo: device.Patient ? `${device.Patient.firstName} ${device.Patient.lastName}` : null,
            location: device.stockLocation?.name
          }
        }));
        break;

      case 'appointments':
        const appointments = await prisma.appointment.findMany({
          where: {
            AND: [
              searchTerm ? {
                OR: [
                  { appointmentType: { contains: searchTerm, mode: 'insensitive' } },
                  { notes: { contains: searchTerm, mode: 'insensitive' } },
                  { location: { contains: searchTerm, mode: 'insensitive' } },
                  { patient: { firstName: { contains: searchTerm, mode: 'insensitive' } } },
                  { patient: { lastName: { contains: searchTerm, mode: 'insensitive' } } }
                ]
              } : {},
              { scheduledDate: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } // Last 30 days
            ]
          },
          include: {
            patient: {
              select: {
                firstName: true,
                lastName: true,
                telephone: true
              }
            },
            assignedTo: {
              select: {
                firstName: true,
                lastName: true
              }
            }
          },
          take: 10,
          orderBy: { scheduledDate: 'desc' }
        });

        results = appointments.map(appointment => ({
          id: appointment.id,
          type: 'appointment',
          title: appointment.appointmentType || 'Rendez-vous',
          subtitle: `${appointment.patient?.firstName} ${appointment.patient?.lastName} • ${new Date(appointment.scheduledDate).toLocaleDateString('fr-FR')}`,
          metadata: {
            scheduledDate: appointment.scheduledDate,
            status: appointment.status,
            patient: appointment.patient ? `${appointment.patient.firstName} ${appointment.patient.lastName}` : null,
            assignedTo: appointment.assignedTo ? `${appointment.assignedTo.firstName} ${appointment.assignedTo.lastName}` : null,
            notes: appointment.notes,
            location: appointment.location,
            priority: appointment.priority
          }
        }));
        break;

      case 'rentals':
        const rentals = await prisma.rental.findMany({
          where: searchTerm ? {
            OR: [
              { patient: { firstName: { contains: searchTerm, mode: 'insensitive' } } },
              { patient: { lastName: { contains: searchTerm, mode: 'insensitive' } } },
              { medicalDevice: { name: { contains: searchTerm, mode: 'insensitive' } } },
              { invoiceNumber: { contains: searchTerm, mode: 'insensitive' } }
            ]
          } : {},
          include: {
            patient: {
              select: {
                firstName: true,
                lastName: true,
                telephone: true
              }
            },
            medicalDevice: {
              select: {
                name: true,
                serialNumber: true
              }
            }
          },
          take: 10,
          orderBy: { createdAt: 'desc' }
        });

        results = rentals.map(rental => ({
          id: rental.id,
          type: 'rental',
          title: `Location ${rental.medicalDevice?.name || 'Équipement'}`,
          subtitle: `${rental.patient?.firstName} ${rental.patient?.lastName} • Du ${new Date(rental.startDate).toLocaleDateString('fr-FR')}`,
          metadata: {
            startDate: rental.startDate,
            endDate: rental.endDate,
            status: rental.status,
            patient: rental.patient ? `${rental.patient.firstName} ${rental.patient.lastName}` : null,
            device: rental.medicalDevice?.name,
            invoiceNumber: rental.invoiceNumber
          }
        }));
        break;

      case 'users':
        const users = await prisma.user.findMany({
          where: {
            AND: [
              { isActive: true },
              searchTerm ? {
                OR: [
                  { firstName: { contains: searchTerm, mode: 'insensitive' } },
                  { lastName: { contains: searchTerm, mode: 'insensitive' } },
                  { email: { contains: searchTerm, mode: 'insensitive' } }
                ]
              } : {}
            ]
          },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
            telephone: true,
            speciality: true
          },
          take: 10,
          orderBy: [
            { firstName: 'asc' },
            { lastName: 'asc' }
          ]
        });

        results = users.map(user => ({
          id: user.id,
          type: 'user',
          title: `${user.firstName} ${user.lastName}`,
          subtitle: `${user.role} • ${user.email}`,
          metadata: {
            role: user.role,
            email: user.email,
            telephone: user.telephone,
            speciality: user.speciality
          }
        }));
        break;

      default:
        return res.status(400).json({ message: 'Invalid reference type' });
    }

    return res.status(200).json({ references: results });
  } catch (error) {
    console.error('References API error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}