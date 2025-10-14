import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/db';
import { checkAndCreateOverdueNotifications } from '@/lib/notifications';

// This endpoint should be called daily by a cron job
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Verify this is an authorized cron request
  // In production, you should use a secret token
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Check and create overdue payment notifications
    await checkAndCreateOverdueNotifications();

    // Check for rental expirations in next 30 days
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const expiringRentals = await prisma.rental.findMany({
      where: {
        endDate: {
          gte: new Date(),
          lte: thirtyDaysFromNow
        },
        status: 'ACTIVE'
      },
      include: {
        patient: true,
        medicalDevice: true
      }
    });

    // Check if notification already exists for each expiring rental
    for (const rental of expiringRentals) {
      if (!rental.patientId) continue;

      const existingNotification = await prisma.notification.findFirst({
        where: {
          metadata: {
            path: ['rentalId'],
            equals: rental.id
          },
          type: 'FOLLOW_UP'
        }
      });

      if (!existingNotification && rental.endDate) {
        const { createRentalExpirationNotification } = await import('@/lib/notifications');
        await createRentalExpirationNotification(
          rental.id,
          rental.medicalDevice.name,
          rental.patientId,
          `${rental.patient!.firstName} ${rental.patient!.lastName}`,
          rental.endDate,
          rental.patient!.userId
        );
      }
    }

    // Check for CNAM bond renewals
    const cnamBonds = await prisma.cNAMBondRental.findMany({
      where: {
        endDate: {
          gte: new Date(),
          lte: thirtyDaysFromNow
        },
        status: 'APPROUVE'
      },
      include: {
        patient: true
      }
    });

    for (const bond of cnamBonds) {
      const existingNotification = await prisma.notification.findFirst({
        where: {
          metadata: {
            path: ['cnamBondId'],
            equals: bond.id
          },
          type: 'FOLLOW_UP'
        }
      });

      if (!existingNotification && bond.endDate) {
        await prisma.notification.create({
          data: {
            title: 'Renouvellement CNAM requis',
            message: `Le bon CNAM pour ${bond.patient.firstName} ${bond.patient.lastName} expire le ${bond.endDate.toLocaleDateString('fr-FR')}`,
            type: 'FOLLOW_UP',
            status: 'PENDING',
            userId: bond.patient.userId,
            patientId: bond.patientId,
            dueDate: bond.endDate,
            metadata: {
              cnamBondId: bond.id,
              bondNumber: bond.bondNumber,
              bondType: bond.bondType
            }
          }
        });
      }
    }

    // Check for maintenance due
    const maintenanceDueDevices = await prisma.medicalDevice.findMany({
      where: {
        requiresMaintenance: true,
        status: 'ACTIVE'
      },
      include: {
        Patient: true,
        Company: true
      }
    });

    for (const device of maintenanceDueDevices) {
      // Check last maintenance date from repair logs
      const lastMaintenance = await prisma.repairLog.findFirst({
        where: {
          medicalDeviceId: device.id
        },
        orderBy: {
          repairDate: 'desc'
        }
      });

      // If last maintenance was more than 6 months ago or no maintenance record
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      if (!lastMaintenance || lastMaintenance.repairDate < sixMonthsAgo) {
        const existingNotification = await prisma.notification.findFirst({
          where: {
            metadata: {
              path: ['deviceId'],
              equals: device.id
            },
            type: 'MAINTENANCE'
          }
        });

        if (!existingNotification) {
          const userId = device.Patient?.userId || device.Company?.userId;
          if (userId) {
            await prisma.notification.create({
              data: {
                title: 'Maintenance requise',
                message: `Le dispositif ${device.name} nécessite une maintenance`,
                type: 'MAINTENANCE',
                status: 'PENDING',
                userId,
                patientId: device.patientId,
                companyId: device.companyId,
                dueDate: new Date(),
                metadata: {
                  deviceId: device.id,
                  deviceName: device.name,
                  lastMaintenance: lastMaintenance?.repairDate || null
                }
              }
            });
          }
        }
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Notification check completed',
      stats: {
        expiringRentals: expiringRentals.length,
        cnamBondsToRenew: cnamBonds.length,
        maintenanceDue: maintenanceDueDevices.length
      }
    });

  } catch (error) {
    console.error('Error in notification cron job:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}