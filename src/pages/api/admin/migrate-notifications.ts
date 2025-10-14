import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session || session.user.role !== 'ADMIN') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Find all FOLLOW_UP notifications that might be diagnostic results
    const notifications = await prisma.notification.findMany({
      where: {
        type: 'FOLLOW_UP',
        title: 'Nouveau diagnostic créé'
      },
      include: {
        patient: true
      }
    });

    let updated = 0;
    let errors = 0;

    for (const notification of notifications) {
      try {
        // Extract diagnostic ID from metadata if available
        let diagnosticId = null;
        if (notification.metadata && typeof notification.metadata === 'object') {
          diagnosticId = (notification.metadata as any).diagnosticId;
        }

        // If we have a diagnostic ID, fetch the diagnostic details
        if (diagnosticId) {
          const diagnostic = await prisma.diagnostic.findUnique({
            where: { id: diagnosticId },
            include: {
              medicalDevice: true,
              patient: true
            }
          });

          if (diagnostic) {
            // Update the notification with proper metadata
            await prisma.notification.update({
              where: { id: notification.id },
              data: {
                dueDate: notification.dueDate || new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from creation if not set
                metadata: {
                  diagnosticId,
                  deviceId: diagnostic.medicalDeviceId,
                  deviceName: diagnostic.medicalDevice.name,
                  parameterId: diagnosticId, // Using diagnostic ID as parameter ID
                  parameterName: 'Résultat de diagnostic'
                }
              }
            });
            updated++;
          }
        } else {
          // For notifications without diagnostic ID, just ensure they have a proper due date
          if (!notification.dueDate) {
            await prisma.notification.update({
              where: { id: notification.id },
              data: {
                dueDate: new Date(notification.createdAt.getTime() + 3 * 24 * 60 * 60 * 1000) // 3 days from creation
              }
            });
            updated++;
          }
        }
      } catch (error) {
        console.error(`Failed to update notification ${notification.id}:`, error);
        errors++;
      }
    }

    return res.status(200).json({
      success: true,
      message: `Migration completed. Updated ${updated} notifications, ${errors} errors.`,
      stats: {
        total: notifications.length,
        updated,
        errors
      }
    });

  } catch (error) {
    console.error('Migration failed:', error);
    return res.status(500).json({ error: 'Migration failed' });
  }
}