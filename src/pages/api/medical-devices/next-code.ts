import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get device type from query parameter (MEDICAL_DEVICE or DIAGNOSTIC_DEVICE)
    const deviceType = req.query.type as string;

    // Determine prefix based on device type
    const prefix = deviceType === 'DIAGNOSTIC_DEVICE' ? 'DIAG' : 'APP';

    // Get the highest device code to generate the next one
    const lastDevice = await prisma.medicalDevice.findFirst({
      where: {
        deviceCode: {
          startsWith: prefix
        }
      },
      orderBy: {
        deviceCode: 'desc'
      },
      select: {
        deviceCode: true
      }
    });

    let nextCodeNumber = 1;

    if (lastDevice?.deviceCode) {
      // Extract number from code like "APP0211" or "DIAG0003" -> 211 or 3
      const currentNumber = parseInt(lastDevice.deviceCode.replace(prefix, ''));
      if (!isNaN(currentNumber)) {
        nextCodeNumber = currentNumber + 1;
      }
    }

    // Format with leading zeros (APP0001, APP0002, DIAG0001, DIAG0002, etc.)
    const nextCode = `${prefix}${nextCodeNumber.toString().padStart(4, '0')}`;

    return res.status(200).json({ nextCode });

  } catch (error) {
    console.error('Error generating next device code:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}