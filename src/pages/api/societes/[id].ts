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
    return res.status(400).json({ error: 'Company ID is required' });
  }

  try {
    if (req.method === 'GET') {
      const company = await prisma.company.findUnique({
        where: { id },
        include: {
          technician: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              role: true
            }
          }
        }
      });

      if (!company) {
        return res.status(404).json({ error: 'Company not found' });
      }

      // Format the response to match the expected structure for the sidebar
      const formattedCompany = {
        id: company.id,
        companyName: company.companyName,
        name: company.companyName,
        nomSociete: company.companyName,
        telephone: company.telephone,
        telephonePrincipale: company.telephone,
        telephoneSecondaire: company.telephoneSecondaire,
        address: `${company.governorate || ''} ${company.delegation || ''} ${company.detailedAddress || ''}`.trim(),
        adresseComplete: `${company.governorate || ''} ${company.delegation || ''} ${company.detailedAddress || ''}`.trim(),
        governorate: company.governorate,
        delegation: company.delegation,
        detailedAddress: company.detailedAddress,
        matriculeFiscale: company.taxId,
        fiscalNumber: company.taxId,
        generalNote: company.generalNote || '',
        createdAt: company.createdAt,
        technician: company.technician ? {
          id: company.technician.id,
          name: `${company.technician.firstName} ${company.technician.lastName}`,
          firstName: company.technician.firstName,
          lastName: company.technician.lastName,
          email: company.technician.email,
          role: company.technician.role
        } : null
      };

      return res.status(200).json(formattedCompany);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Error processing company request:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
