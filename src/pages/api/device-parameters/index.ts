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

  // Set CORS headers
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  switch (req.method) {
    case 'GET':
      try {
        const { deviceId, patientId } = req.query;

        if (!deviceId || !patientId) {
          return res.status(400).json({ error: 'Device ID and Patient ID are required' });
        }

        // Fetch device parameters
        const parameters = await prisma.medicalDeviceParametre.findFirst({
          where: {
            deviceId: deviceId as string,
            patientId: patientId as string,
          },
          include: {
            device: {
              select: {
                name: true,
                type: true,
                serialNumber: true,
              }
            },
            patient: {
              select: {
                firstName: true,
                lastName: true,
              }
            }
          }
        });

        return res.status(200).json({ 
          parameters,
          success: true 
        });

      } catch (error) {
        console.error('Error fetching device parameters:', error);
        return res.status(500).json({ error: 'Failed to fetch device parameters' });
      }

    case 'POST':
      try {
        const {
          medicalDeviceId,
          patientId,
          deviceType,
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

        if (!medicalDeviceId || !patientId) {
          return res.status(400).json({ error: 'Medical Device ID and Patient ID are required' });
        }

        // Check if parameters already exist
        const existingParams = await prisma.medicalDeviceParametre.findFirst({
          where: {
            deviceId: medicalDeviceId,
            patientId,
          }
        });

        let parameters;

        if (existingParams) {
          // Update existing parameters
          parameters = await prisma.medicalDeviceParametre.update({
            where: { id: existingParams.id },
            data: {
              // CPAP Parameters - using string as per schema
              ...(pression !== undefined && { pression: pression.toString() }),
              ...(pressionRampe !== undefined && { pressionRampe: pressionRampe.toString() }),
              ...(dureeRampe !== undefined && { dureeRampe: parseInt(dureeRampe) }),
              ...(epr !== undefined && { epr: epr.toString() }),
              ...(autoPression !== undefined && { autoPression }),
              ...(autoRampe !== undefined && { autoRampe }),
              // VNI Parameters - using string as per schema
              ...(ipap !== undefined && { ipap: ipap.toString() }),
              ...(epap !== undefined && { epap: epap.toString() }),
              ...(aid !== undefined && { aid: aid.toString() }),
              ...(frequenceRespiratoire !== undefined && { frequenceRespiratoire: frequenceRespiratoire.toString() }),
              ...(volumeCourant !== undefined && { volumeCourant: volumeCourant.toString() }),
              ...(mode !== undefined && { mode }),
              // Concentrateur & Bouteille - using string as per schema
              ...(debit !== undefined && { debit: debit.toString() }),
              updatedAt: new Date(),
            },
            include: {
              device: {
                select: {
                  name: true,
                  type: true,
                  serialNumber: true,
                }
              },
              patient: {
                select: {
                  firstName: true,
                  lastName: true,
                }
              }
            }
          });
        } else {
          // Create new parameters
          parameters = await prisma.medicalDeviceParametre.create({
            data: {
              deviceId: medicalDeviceId,
              patientId,
              deviceType,
              // CPAP Parameters - using string as per schema
              ...(pression !== undefined && { pression: pression.toString() }),
              ...(pressionRampe !== undefined && { pressionRampe: pressionRampe.toString() }),
              ...(dureeRampe !== undefined && { dureeRampe: parseInt(dureeRampe) }),
              ...(epr !== undefined && { epr: epr.toString() }),
              ...(autoPression !== undefined && { autoPression }),
              ...(autoRampe !== undefined && { autoRampe }),
              // VNI Parameters - using string as per schema
              ...(ipap !== undefined && { ipap: ipap.toString() }),
              ...(epap !== undefined && { epap: epap.toString() }),
              ...(aid !== undefined && { aid: aid.toString() }),
              ...(frequenceRespiratoire !== undefined && { frequenceRespiratoire: frequenceRespiratoire.toString() }),
              ...(volumeCourant !== undefined && { volumeCourant: volumeCourant.toString() }),
              ...(mode !== undefined && { mode }),
              // Concentrateur & Bouteille - using string as per schema
              ...(debit !== undefined && { debit: debit.toString() }),
            },
            include: {
              device: {
                select: {
                  name: true,
                  type: true,
                  serialNumber: true,
                }
              },
              patient: {
                select: {
                  firstName: true,
                  lastName: true,
                }
              }
            }
          });
        }

        return res.status(200).json({
          success: true,
          parameters,
          message: existingParams ? 'Parameters updated successfully' : 'Parameters created successfully'
        });

      } catch (error) {
        console.error('Error creating/updating device parameters:', error);
        return res.status(500).json({ 
          error: 'Failed to save device parameters',
          details: error instanceof Error ? error.message : 'Unknown error'
        });
      }

    default:
      return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
}