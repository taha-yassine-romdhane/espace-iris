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
      // @ts-ignore - session.user exists
      const userId = session?.user?.id;
      // @ts-ignore - session.user.role exists
      const userRole = session?.user?.role;

      // Build query filter based on user role
      const whereClause: any = {};

      // If user is EMPLOYEE, only show companies assigned to them as technician
      if (userRole === 'EMPLOYEE' && userId) {
        whereClause.technicianId = userId;
      }
      // ADMIN and DOCTOR see all companies (no filter)

      const companies = await prisma.company.findMany({
        where: whereClause,
        orderBy: {
          companyName: 'asc',
        },
      });
      res.status(200).json(companies);
    } catch (error) {
      console.error('Error fetching companies:', error);
      res.status(500).json({ message: 'Internal Server Error' });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
