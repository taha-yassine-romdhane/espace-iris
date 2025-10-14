import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import prisma from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  try {
    const { fromLocationId, toLocationId, productId, newStatus, notes } = req.body;

    // Validate required fields
    if (!fromLocationId || !toLocationId || !productId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check if device exists and is in the source location
    const device = await prisma.medicalDevice.findFirst({
      where: {
        id: productId,
        stockLocationId: fromLocationId
      }
    });

    if (!device) {
      return res.status(404).json({ error: 'Device not found in source location' });
    }

    // Check if device is available for transfer (not reserved or in use)
    if (device.patientId || (device.reservedUntil && new Date(device.reservedUntil) > new Date())) {
      return res.status(400).json({ error: 'Device is currently reserved or assigned to a patient' });
    }

    // Create a transfer record
    const transfer = await prisma.$transaction(async (tx) => {
      // 1. Update the device's location
      const updatedDevice = await tx.medicalDevice.update({
        where: { id: productId },
        data: {
          stockLocationId: toLocationId,
          status: newStatus || device.status
        }
      });

      // 2. Find or create a placeholder product for medical device transfers
      // This is needed because StockTransfer requires a productId
      let placeholderProduct = await tx.product.findFirst({
        where: {
          name: `MEDICAL_DEVICE_${device.type}_${device.id}`,
          type: 'MEDICAL_DEVICE'
        }
      });

      if (!placeholderProduct) {
        // Create a specific product entry for this medical device
        // This allows us to track transfers without using metadata
        placeholderProduct = await tx.product.create({
          data: {
            name: `${device.name} - ${device.id}`,
            type: 'MEDICAL_DEVICE',
            brand: device.brand || undefined,
            model: device.model || undefined,
            serialNumber: device.serialNumber || undefined,
            notes: `Placeholder for medical device transfer. Original device ID: ${device.id}`,
            status: 'ACTIVE'
          }
        });
      }

      // 3. Create a transfer record
      const transferRecord = await tx.stockTransfer.create({
        data: {
          fromLocationId,
          toLocationId,
          // Use the placeholder product ID
          productId: placeholderProduct.id,
          notes: notes ? `${notes} (Device ID: ${device.id})` : `Transfer of medical device: ${device.name} (ID: ${device.id})`,
          sentById: session.user.id,
          transferredById: session.user.id,
          // For medical devices, we always transfer quantity of 1
          quantity: 1,
          newStatus: newStatus as any || undefined
        }
      });

      // 3. Log the action in user history
      await tx.userActionHistory.create({
        data: {
          userId: session.user.id,
          actionType: 'MAINTENANCE',
          details: {
            action: 'DEVICE_TRANSFER',
            deviceId: productId,
            deviceName: device.name,
            fromLocation: fromLocationId,
            toLocation: toLocationId,
            newStatus: newStatus || device.status
          },
          relatedItemId: productId,
          relatedItemType: 'MEDICAL_DEVICE',
          performedAt: new Date()
        }
      });

      return { transfer: transferRecord, device: updatedDevice };
    });

    return res.status(200).json({
      message: 'Device transferred successfully',
      transfer: transfer.transfer,
      device: transfer.device
    });
  } catch (error) {
    console.error('Error transferring device:', error);
    return res.status(500).json({ error: 'Failed to transfer device' });
  }
}
