import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]';
import prisma from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Only allow admin access
  if (session.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Access denied. Admin role required.' });
  }

  if (req.method === 'PATCH') {
    try {
      const { id } = req.query;
      const { action, reviewNotes } = req.body;

      if (!id || typeof id !== 'string') {
        return res.status(400).json({ error: 'Invalid request ID' });
      }

      if (!action || (action !== 'APPROVED' && action !== 'REJECTED')) {
        return res.status(400).json({ error: 'Invalid action. Must be APPROVED or REJECTED' });
      }

      // Get the transfer request to check its current status
      const transferRequest = await prisma.stockTransferRequest.findUnique({
        where: { id },
        include: {
          fromLocation: true,
          toLocation: true,
          product: true,
          medicalDevice: true,
          requestedBy: true
        }
      });

      if (!transferRequest) {
        return res.status(404).json({ error: 'Transfer request not found' });
      }

      if (transferRequest.status !== 'PENDING') {
        return res.status(400).json({ 
          error: 'Transfer request has already been reviewed',
          currentStatus: transferRequest.status
        });
      }

      // Perform all operations in a transaction
      const result = await prisma.$transaction(async (tx) => {
        // Update the transfer request status
        const updatedRequest = await tx.stockTransferRequest.update({
          where: { id },
          data: {
            status: action as 'APPROVED' | 'REJECTED',
            reviewedById: session.user.id,
            reviewedAt: new Date(),
            reviewNotes: reviewNotes?.trim() || null
          },
          include: {
            fromLocation: true,
            toLocation: true,
            product: true,
            medicalDevice: true,
            requestedBy: true,
            reviewedBy: true
          }
        });

        // If approved, actually perform the transfer
        if (action === 'APPROVED') {
          // Determine if it's a medical device or regular product
          const isDevice = !!transferRequest.medicalDevice;
          
          if (isDevice) {
            // Move medical device to new location
            await tx.medicalDevice.update({
              where: { id: transferRequest.medicalDeviceId! },
              data: {
                stockLocationId: transferRequest.toLocationId
              }
            });
          } else {
            // Handle regular product transfer
            const productId = transferRequest.productId!;
            const fromLocationId = transferRequest.fromLocationId;
            const toLocationId = transferRequest.toLocationId;
            const quantity = transferRequest.requestedQuantity;
            
            // Find source stock
            const sourceStock = await tx.stock.findFirst({
              where: {
                locationId: fromLocationId,
                productId: productId
              }
            });
            
            if (!sourceStock || sourceStock.quantity < quantity) {
              throw new Error('Insufficient stock at source location');
            }
            
            // Decrease quantity at source location
            if (sourceStock.quantity === quantity) {
              // Remove source stock if quantity becomes 0
              await tx.stock.delete({
                where: { id: sourceStock.id }
              });
            } else {
              await tx.stock.update({
                where: { id: sourceStock.id },
                data: {
                  quantity: sourceStock.quantity - quantity
                }
              });
            }
            
            // Find or create destination stock
            const destinationStock = await tx.stock.findFirst({
              where: {
                locationId: toLocationId,
                productId: productId
              }
            });
            
            if (destinationStock) {
              // Update existing destination stock
              await tx.stock.update({
                where: { id: destinationStock.id },
                data: {
                  quantity: destinationStock.quantity + quantity
                }
              });
            } else {
              // Create new destination stock
              await tx.stock.create({
                data: {
                  locationId: toLocationId,
                  productId: productId,
                  quantity: quantity,
                  status: 'FOR_SALE' // Default status
                }
              });
            }
          }
          
          // Create a transfer record for audit trail (only for regular products)
          // Medical devices are tracked differently and don't use the StockTransfer table
          if (!isDevice && transferRequest.productId) {
            await tx.stockTransfer.create({
              data: {
                fromLocationId: transferRequest.fromLocationId,
                toLocationId: transferRequest.toLocationId,
                productId: transferRequest.productId,
                quantity: transferRequest.requestedQuantity,
                transferredById: session.user.id,
                sentById: session.user.id,
                receivedById: transferRequest.requestedById,
                notes: `Transfer approved from employee request: ${transferRequest.reason}`,
                isVerified: true,
                verificationDate: new Date(),
                verifiedById: session.user.id
              }
            });
          }
          
          // Update the request status to COMPLETED since the transfer is done
          const finalRequest = await tx.stockTransferRequest.update({
            where: { id },
            data: {
              status: 'COMPLETED'
            },
            include: {
              fromLocation: true,
              toLocation: true,
              product: true,
              medicalDevice: true,
              requestedBy: true,
              reviewedBy: true
            }
          });
          
          return finalRequest;
        }
        
        return updatedRequest;
      });

      return res.status(200).json({
        message: `Transfer request ${action.toLowerCase()} successfully${action === 'APPROVED' ? ' and transfer completed' : ''}`,
        transferRequest: result
      });
    } catch (error) {
      console.error('Error reviewing transfer request:', error);
      return res.status(500).json({ error: 'Failed to review transfer request' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}