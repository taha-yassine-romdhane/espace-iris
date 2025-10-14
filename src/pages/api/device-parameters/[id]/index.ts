import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import prisma from '@/lib/db';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Check authentication
  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { id } = req.query;
  
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid parameter ID' });
  }

  // Set CORS headers
  res.setHeader('Access-Control-Allow-Methods', 'GET, PATCH, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  switch (req.method) {
    case 'PATCH':
      try {
        const {
          // CPAP Parameters
          pression,
          pressionRampe,
          dureeRampe,
          epr,
          autoPression,
          autoRampe,
          // VNI Parameters
          ipap,
          epap,
          aid,
          frequenceRespiratoire,
          volumeCourant,
          mode,
          // Concentrateur & Bouteille
          debit,
          // Common
          notes,
        } = req.body;

        const parameters = await prisma.medicalDeviceParametre.update({
          where: { id },
          data: {
            // CPAP Parameters
            ...(pression !== undefined && { pression: pression || null }),
            ...(pressionRampe !== undefined && { pressionRampe: pressionRampe || null }),
            ...(dureeRampe !== undefined && { dureeRampe: dureeRampe ? parseInt(dureeRampe) : null }),
            ...(epr !== undefined && { epr: epr || null }),
            ...(autoPression !== undefined && { autoPression }),
            ...(autoRampe !== undefined && { autoRampe }),
            // VNI Parameters
            ...(ipap !== undefined && { ipap: ipap || null }),
            ...(epap !== undefined && { epap: epap || null }),
            ...(aid !== undefined && { aid: aid || null }),
            ...(frequenceRespiratoire !== undefined && { frequenceRespiratoire: frequenceRespiratoire || null }),
            ...(volumeCourant !== undefined && { volumeCourant: volumeCourant || null }),
            ...(mode !== undefined && { mode }),
            // Concentrateur & Bouteille
            ...(debit !== undefined && { debit: debit || null }),
            // Common
            ...(notes !== undefined && { notes }),
            updatedAt: new Date(),
          },
          include: {
            patient: {
              select: {
                firstName: true,
                lastName: true,
              }
            }
          }
        });

        return res.status(200).json({
          success: true,
          parameters,
          message: 'Parameters updated successfully'
        });

      } catch (error) {
        console.error('Error updating device parameters:', error);
        return res.status(500).json({ 
          error: 'Failed to update device parameters',
          details: error instanceof Error ? error.message : 'Unknown error'
        });
      }

    case 'DELETE':
      try {
        await prisma.medicalDeviceParametre.delete({
          where: { id }
        });

        return res.status(200).json({
          success: true,
          message: 'Parameters deleted successfully'
        });

      } catch (error) {
        console.error('Error deleting device parameters:', error);
        return res.status(500).json({ 
          error: 'Failed to delete device parameters',
          details: error instanceof Error ? error.message : 'Unknown error'
        });
      }

    default:
      return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
}