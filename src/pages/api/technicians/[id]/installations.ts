import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid technician ID' });
  }

  if (req.method === 'GET') {
    try {
      // First get the technician to find the associated user
      const technician = await prisma.technician.findUnique({
        where: { id },
        include: { user: true }
      });

      if (!technician) {
        return res.status(404).json({ error: 'Technician not found' });
      }

      // Get all medical devices installed by this technician
      // We'll use the MedicalDevice model which has an installationDate field
      // and is related to patients that this technician is assigned to
      const installations = await prisma.medicalDevice.findMany({
        where: {
          installationDate: { not: null },
          OR: [
            {
              Patient: {
                technicianId: technician.userId
              }
            },
            {
              Company: {
                technicianId: technician.userId
              }
            }
          ]
        },
        include: {
          Patient: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              doctorId: true,
              doctor: {
                include: {
                  user: {
                    select: {
                      firstName: true,
                      lastName: true
                    }
                  }
                }
              }
            }
          },
          Company: {
            select: {
              id: true,
              companyName: true
            }
          },
          deviceParameters: {
            select: {
              id: true,
              deviceType: true,
              pressionRampe: true,
              dureeRampe: true,
              pression: true,
              ipap: true,
              epap: true,
              debit: true
            }
          }
        },
        orderBy: {
          installationDate: 'desc'
        }
      });

      // Define the type for the parameters to match Prisma schema
      type DeviceParameter = {
        id: string;
        deviceType: string | null;
        pressionRampe: string | null;
        dureeRampe: number | null;
        pression: string | null;
        ipap: string | null;
        epap: string | null;
        debit: string | null;
      };
      
      // Transform the data to match our expected interface
      const formattedInstallations = installations.map(device => ({
        id: device.id,
        medicalDeviceId: device.id,
        medicalDevice: {
          id: device.id,
          name: device.name,
          type: device.type,
          brand: device.brand || '',
          model: device.model || ''
        },
        patientId: device.patientId || device.companyId || '',
        patient: device.Patient 
          ? { 
              id: device.Patient.id, 
              firstName: device.Patient.firstName, 
              lastName: device.Patient.lastName 
            }
          : device.Company 
            ? { 
                id: device.Company.id, 
                firstName: '', 
                lastName: device.Company.companyName 
              }
            : { id: '', firstName: 'N/A', lastName: '' },
        installationDate: device.installationDate?.toISOString() || new Date().toISOString(),
        parameters: (device.deviceParameters || []).map((param: DeviceParameter) => ({
          id: param.id,
          title: param.deviceType || '',
          value: param.pression || param.ipap || param.debit || param.pressionRampe || '',
          unit: param.deviceType === 'Concentrateur O²' || param.deviceType === 'Bouteil O²' ? 'L/min' : 'cmH₂O'
        })),
        doctorId: device.Patient?.doctorId || '',
        doctor: device.Patient?.doctor 
          ? {
              id: device.Patient.doctor.id,
              user: {
                firstName: device.Patient.doctor.user.firstName,
                lastName: device.Patient.doctor.user.lastName
              }
            }
          : undefined
      }));

      return res.status(200).json(formattedInstallations);
    } catch (error) {
      console.error('Error fetching technician installations:', error);
      return res.status(500).json({ error: 'Error fetching technician installations' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
