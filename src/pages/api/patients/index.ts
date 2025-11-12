import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/db';
import { getSession } from 'next-auth/react';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSession({ req });
  if (!session) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    try {
      const patients = await prisma.patient.findMany({
        orderBy: {
          lastName: 'asc',
        },
      });

      // Transform patients to include name field
      const transformedPatients = patients.map(patient => ({
        ...patient,
        name: `${patient.firstName || ''} ${patient.lastName || ''}`.trim() || 'Patient sans nom'
      }));

      res.status(200).json(transformedPatients);
    } catch (error) {
      console.error('Error fetching patients:', error);
      res.status(500).json({ message: 'Internal Server Error' });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
