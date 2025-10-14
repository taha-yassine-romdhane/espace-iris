import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import prisma from '@/lib/db';
import { migrateExistingPatientCodes, migrateExistingCompanyCodes } from '@/utils/idGenerator';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions);
  
  if (!session || session.user.role !== 'ADMIN') {
    return res.status(401).json({ error: 'Unauthorized - Admin access required' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { type } = req.body;
    
    let result = { 
      success: true, 
      message: '', 
      patientsUpdated: 0, 
      companiesUpdated: 0 
    };

    if (type === 'patients' || type === 'all') {
      console.log('Starting patient code migration...');
      await migrateExistingPatientCodes(prisma);
      
      // Count how many patients now have codes
      const patientsWithCodes = await prisma.patient.count({
        where: { patientCode: { not: null } }
      });
      result.patientsUpdated = patientsWithCodes;
      console.log(`Patient migration complete. ${patientsWithCodes} patients have codes.`);
    }

    if (type === 'companies' || type === 'all') {
      console.log('Starting company code migration...');
      await migrateExistingCompanyCodes(prisma);
      
      // Count how many companies now have codes
      const companiesWithCodes = await prisma.company.count({
        where: { companyCode: { not: null } }
      });
      result.companiesUpdated = companiesWithCodes;
      console.log(`Company migration complete. ${companiesWithCodes} companies have codes.`);
    }

    result.message = `Migration completed successfully. Patients: ${result.patientsUpdated}, Companies: ${result.companiesUpdated}`;
    
    return res.status(200).json(result);
  } catch (error) {
    console.error('Migration error:', error);
    return res.status(500).json({ 
      error: 'Migration failed', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
}