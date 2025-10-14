import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    return res.status(401).json({ message: 'Non autorisé' });
  }

  const { id } = req.query;
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ message: 'ID de transfert invalide' });
  }

  if (req.method === 'GET') {
    try {
      const transfer = await prisma.stockTransfer.findUnique({
        where: { id },
        include: {
          fromLocation: true,
          toLocation: true,
          product: true,
          transferredBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              role: true,
            },
          },
          sentBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
          receivedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
          verifiedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      if (!transfer) {
        return res.status(404).json({ message: 'Transfert non trouvé' });
      }

      return res.status(200).json(transfer);
    } catch (error) {
      console.error('Error fetching transfer details:', error);
      return res.status(500).json({ message: 'Une erreur est survenue lors de la récupération des détails du transfert' });
    }
  }

  if (req.method === 'PUT') {
    try {
      const { notes } = req.body;
      const updatedTransfer = await prisma.$transaction(async (tx) => {
        const existingTransfer = await tx.stockTransfer.findUnique({ where: { id: id as string } });
        if (!existingTransfer) {
          throw new Error('Transfert non trouvé');
        }

        const transfer = await tx.stockTransfer.update({
          where: { id: id as string },
          data: { notes },
        });

        await tx.userActionHistory.create({
          data: {
            userId: session.user.id,
            actionType: 'UPDATE',
            relatedItemId: id as string,
            relatedItemType: 'StockTransfer',
            details: {
              change: 'Updated notes',
              from: { notes: existingTransfer.notes },
              to: { notes },
            },
          },
        });

        return transfer;
      });
      return res.status(200).json(updatedTransfer);
    } catch (error: any) {
      console.error('Error updating transfer:', error);
      return res.status(500).json({ message: error.message || 'Failed to update transfer' });
    }
  }

  if (req.method === 'DELETE') {
    try {
      if (session.user.role !== 'ADMIN') {
        return res.status(403).json({ message: 'Action non autorisée. Seuls les administrateurs peuvent supprimer les transferts.' });
      }

      const deletedTransfer = await prisma.$transaction(async (tx) => {
        const transfer = await tx.stockTransfer.findUnique({
          where: { id: id as string },
        });

        if (!transfer) {
          throw new Error('Transfert non trouvé');
        }

        if (transfer.isVerified) {
          throw new Error('Impossible de supprimer un transfert qui a déjà été vérifié.');
        }

        // Revert stock quantities
        await tx.stock.updateMany({
          where: { locationId: transfer.fromLocationId, productId: transfer.productId },
          data: { quantity: { increment: transfer.quantity } },
        });

        await tx.stock.updateMany({
          where: { locationId: transfer.toLocationId, productId: transfer.productId },
          data: { quantity: { decrement: transfer.quantity } },
        });

        // Delete the transfer
        const deleted = await tx.stockTransfer.delete({
          where: { id: id as string },
        });

        await tx.userActionHistory.create({
          data: {
            userId: session.user.id,
            actionType: 'DELETE',
            relatedItemId: id as string,
            relatedItemType: 'StockTransfer',
            details: {
              change: 'Deleted stock transfer',
              deletedItem: transfer,
            },
          },
        });

        return deleted;
      });

      return res.status(200).json({ message: 'Transfert supprimé avec succès', transfer: deletedTransfer });
    } catch (error: any) {
      console.error('Error deleting transfer:', error);
      return res.status(500).json({ message: error.message || 'Failed to delete transfer' });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}
