import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { NotificationType, NotificationStatus } from '@prisma/client';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Only allow POST requests
    if (req.method !== 'POST') {
      return res.status(405).json({ message: 'Method not allowed' });
    }

    // Get the current user session
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).json({ message: 'Non autorisé' });
    }

    // Only allow admins to verify transfers
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, role: true }
    });

    if (!user || user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Seuls les administrateurs peuvent vérifier les transferts' });
    }

    // Get the transfer ID from the URL
    const { id } = req.query;
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ message: 'ID de transfert invalide' });
    }

    // Get verification status from the request body
    const { verified } = req.body;
    if (verified === undefined) {
      return res.status(400).json({ message: 'Le statut de vérification est requis' });
    }

    const updatedTransfer = await prisma.$transaction(async (tx) => {
      const transfer = await tx.stockTransfer.update({
        where: { id },
        data: {
          isVerified: verified,
          verifiedById: user.id,
          verificationDate: new Date(),
        },
      });

      await tx.userActionHistory.create({
        data: {
          userId: user.id,
          actionType: 'UPDATE',
          relatedItemId: transfer.id,
          relatedItemType: 'StockTransfer',
          details: {
            action: 'Verification',
            status: verified ? 'Approved' : 'Rejected',
            message: `Stock transfer verification status updated to ${verified ? 'approved' : 'rejected'}.`,
          },
        },
      });

      if (verified === false) {
        await tx.notification.create({
          data: {
            title: 'Transfert rejeté',
            message: `Votre transfert de stock a été rejeté par un administrateur. Consultez les détails du transfert pour plus d'informations.`,
            userId: transfer.transferredById,
            type: NotificationType.TRANSFER,
            isRead: false,
            status: NotificationStatus.PENDING,
            metadata: { transferId: id },
          },
        });
      }

      return transfer;
    });

    return res.status(200).json(updatedTransfer);
  } catch (error) {
    console.error('Error verifying transfer:', error);
    return res.status(500).json({ message: 'Une erreur est survenue lors de la vérification du transfert' });
  }
}
