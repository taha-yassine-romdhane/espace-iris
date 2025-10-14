import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.query;
    const { iah, idValue, remarque, status } = req.body;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'Invalid diagnostic result ID' });
    }

    // Find the diagnostic result
    const diagnosticResult = await prisma.diagnosticResult.findUnique({
      where: { id },
      include: {
        diagnostic: true
      }
    });

    if (!diagnosticResult) {
      return res.status(404).json({ error: 'Diagnostic result not found' });
    }

    // Update the diagnostic result
    const updatedResult = await prisma.diagnosticResult.update({
      where: { id },
      data: {
        iah: iah !== undefined ? iah : diagnosticResult.iah,
        idValue: idValue !== undefined ? idValue : diagnosticResult.idValue,
        remarque: remarque !== undefined ? remarque : diagnosticResult.remarque,
        status: status || diagnosticResult.status,
        updatedAt: new Date()
      }
    });

    // Update the diagnostic status if the result is completed
    if (status === 'COMPLETED') {
      await prisma.diagnostic.update({
        where: { id: diagnosticResult.diagnosticId },
        data: {
          status: 'COMPLETED',
          updatedAt: new Date()
        }
      });

      // Release the medical device - set back to ACTIVE since diagnostic is done
      // Also clear the reservedUntil date
      if (diagnosticResult.diagnostic.medicalDeviceId) {
        await prisma.medicalDevice.update({
          where: { id: diagnosticResult.diagnostic.medicalDeviceId },
          data: {
            status: 'ACTIVE',
            reservedUntil: null  // Clear the reservation date
          }
        });
      }
    }

    return res.status(200).json({
      success: true,
      result: updatedResult
    });

  } catch (error) {
    console.error('Error updating diagnostic result:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}