import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/db';
import { getToken } from 'next-auth/jwt';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token || token.userRole !== 'ADMIN') {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const { id } = req.query as { id: string };

  if (req.method === 'PATCH') {
    try {
      const { assigneeId, assigneeType } = req.body;

      if (!assigneeId || !assigneeType || !['PATIENT', 'COMPANY'].includes(assigneeType)) {
        return res.status(400).json({ message: 'Invalid request body' });
      }

      const updateData = assigneeType === 'PATIENT'
        ? { patientId: assigneeId, companyId: null }
        : { companyId: assigneeId, patientId: null };

      const updatedDevice = await prisma.medicalDevice.update({
        where: { id },
        data: updateData,
      });

      res.status(200).json(updatedDevice);
    } catch (error) {
      console.error('Error assigning medical device:', error);
      res.status(500).json({ message: 'Internal Server Error' });
    }
  } else {
    res.setHeader('Allow', ['PATCH']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
