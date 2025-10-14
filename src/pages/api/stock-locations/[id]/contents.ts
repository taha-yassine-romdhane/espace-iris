import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (req.method !== 'GET' || !id) {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    const locationId = String(id);

    const products = await prisma.stock.count({
      where: { locationId },
    });

    const medicalDevices = await prisma.medicalDevice.count({
      where: { stockLocationId: locationId },
    });

    res.status(200).json({ products, medicalDevices });
  } catch (error) {
    console.error('Failed to fetch stock location contents:', error);
    res.status(500).json({ message: 'Failed to fetch stock location contents' });
  }
}
