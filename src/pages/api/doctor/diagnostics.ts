import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { prisma } from '@/lib/prisma';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);

    if (!session?.user || session.user.role !== 'DOCTOR') {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Get all diagnostics for patients assigned to this doctor
    const diagnostics = await prisma.diagnostic.findMany({
      where: {
        patient: {
          userId: session.user.id
        }
      },
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        },
        medicalDevice: {
          select: {
            id: true,
            name: true,
            type: true
          }
        },
        result: {
          select: {
            iah: true,
            idValue: true,
            remarque: true,
            status: true
          }
        }
      },
      orderBy: {
        diagnosticDate: 'desc'
      }
    });

    // Format the diagnostics data
    const formattedDiagnostics = diagnostics.map(diagnostic => ({
      id: diagnostic.id,
      patientName: `${diagnostic.patient.firstName} ${diagnostic.patient.lastName}`,
      patientId: diagnostic.patient.id,
      diagnosticDate: diagnostic.diagnosticDate,
      status: diagnostic.status,
      medicalDevice: diagnostic.medicalDevice,
      result: diagnostic.result ? {
        iah: diagnostic.result.iah,
        idValue: diagnostic.result.idValue,
        remarque: diagnostic.result.remarque,
        status: diagnostic.result.status
      } : null
    }));

    return res.status(200).json({ diagnostics: formattedDiagnostics });
  } catch (error) {
    console.error('Error fetching diagnostics:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}