import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { CNAMStatus } from '@prisma/client';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.query;
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'Invalid dossier ID' });
    }

    if (req.method === 'GET') {
      // Get CNAM dossier details
      const dossier = await prisma.cNAMDossier.findUnique({
        where: { id },
        include: {
          patient: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              telephone: true,
              cnamId: true
            }
          },
          sale: {
            select: {
              id: true,
              invoiceNumber: true,
              saleDate: true,
              totalAmount: true,
              finalAmount: true
            }
          },
          paymentDetail: {
            select: {
              id: true,
              amount: true,
              reference: true
            }
          },
          stepHistory: {
            include: {
              changedBy: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true
                }
              }
            },
            orderBy: {
              changeDate: 'desc'
            }
          }
        }
      });

      if (!dossier) {
        return res.status(404).json({ error: 'CNAM dossier not found' });
      }

      return res.status(200).json(dossier);
    }

    if (req.method === 'PUT') {
      // Update CNAM dossier step/status
      const { currentStep, status, notes } = req.body;

      // Validate the data
      if (currentStep && (currentStep < 1 || currentStep > 10)) {
        return res.status(400).json({ error: 'Step must be between 1 and 10' });
      }

      if (status && !['EN_ATTENTE_APPROBATION', 'APPROUVE', 'EN_COURS', 'TERMINE', 'REFUSE'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
      }

      // Get current dossier for comparison
      const currentDossier = await prisma.cNAMDossier.findUnique({
        where: { id }
      });

      if (!currentDossier) {
        return res.status(404).json({ error: 'CNAM dossier not found' });
      }

      // Update the dossier
      const updatedDossier = await prisma.$transaction(async (tx) => {
        // Update the dossier
        const dossier = await tx.cNAMDossier.update({
          where: { id },
          data: {
            ...(currentStep && { currentStep }),
            ...(status && { status: status as CNAMStatus }),
            ...(notes !== undefined && { notes }),
            updatedAt: new Date()
          }
        });

        // Create step history entry if step or status changed
        if ((currentStep && currentStep !== currentDossier.currentStep) || 
            (status && status !== currentDossier.status)) {
          await tx.cNAMStepHistory.create({
            data: {
              dossierId: id,
              fromStep: currentDossier.currentStep,
              toStep: currentStep || currentDossier.currentStep,
              fromStatus: currentDossier.status,
              toStatus: (status as CNAMStatus) || currentDossier.status,
              notes: notes || 'Mise à jour du statut/étape',
              changedById: session.user.id,
              changeDate: new Date()
            }
          });
        }

        return dossier;
      });

      return res.status(200).json(updatedDossier);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('CNAM dossier API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}