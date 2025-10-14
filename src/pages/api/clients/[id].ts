import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import prisma from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Client ID is required' });
  }

  try {
    if (req.method === 'GET') {
      // First try to find a patient with this ID
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
          dateOfBirth: true,
          cin: true,
          cnamId: true,
          affiliation: true,
          beneficiaryType: true,
          doctor: {
            select: {
              id: true,
              user: {
                select: {
                  firstName: true,
                  lastName: true
                }
              }
            }
          }
        }
      });

      if (patient) {
        return res.status(200).json({
          id: patient.id,
          firstName: patient.firstName,
          lastName: patient.lastName,
          nomComplet: `${patient.firstName} ${patient.lastName}`,
          telephone: patient.telephone,
          telephoneTwo: patient.telephoneTwo,
          address: `${patient.governorate || ''} ${patient.delegation || ''} ${patient.detailedAddress || ''}`.trim(),
          type: 'patient', // Match expected type format
          dateOfBirth: patient.dateOfBirth,
          cin: patient.cin,
          cnamId: patient.cnamId,
          affiliation: patient.affiliation,
          beneficiaryType: patient.beneficiaryType,
          doctorName: patient.doctor ? `${patient.doctor.user.firstName} ${patient.doctor.user.lastName}` : null
        });
      }

      // If not a patient, try to find a company
      const company = await prisma.company.findUnique({
        where: { id },
        select: {
          id: true,
          companyName: true,
          telephone: true,
          telephoneSecondaire: true,
          governorate: true,
          delegation: true,
          detailedAddress: true,
          taxId: true
        }
      });

      if (company) {
        return res.status(200).json({
          id: company.id,
          firstName: company.companyName, // Use companyName as firstName for consistency
          lastName: '',
          nomComplet: company.companyName,
          nomSociete: company.companyName,
          telephone: company.telephone,
          telephoneTwo: company.telephoneSecondaire,
          address: `${company.governorate || ''} ${company.delegation || ''} ${company.detailedAddress || ''}`.trim(),
          type: 'societe', // Match expected type format
          matriculeFiscale: company.taxId,
          taxId: company.taxId
        });
      }

      return res.status(404).json({ error: 'Client not found' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Error processing client request:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
