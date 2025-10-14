import { NextApiRequest, NextApiResponse } from 'next';
import { Prisma } from '@prisma/client';
import prisma from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { generateRepairCode } from '@/utils/idGenerator';
import type { RepairLog, DeviceStatus } from '@prisma/client';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    if (req.method === 'GET') {
      const { medicalDeviceId } = req.query;

      const repairs = await prisma.repairLog.findMany({
        where: medicalDeviceId
          ? { medicalDeviceId: medicalDeviceId as string }
          : {},
        include: {
          medicalDevice: true,
          location: true,
          technician: {
            include: {
              user: true,
            },
          },
          spareParts: {
            include: {
              product: true,
            },
          },
        },
        orderBy: {
          repairDate: 'desc',
        },
      });

      return res.status(200).json(repairs);
    }

    if (req.method === 'POST') {
      const session = await getServerSession(req, res, authOptions);

      if (!session) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { 
        medicalDeviceId, 
        notes, 
        locationId, 
        employeeId, 
        repairCost, 
        repairDate,
        spareParts,
        deviceStatus
      } = req.body;

      // First find or create the technician record for this employee
      let technician = await prisma.technician.findFirst({
        where: {
          userId: employeeId
        }
      });

      if (!technician) {
        technician = await prisma.technician.create({
          data: {
            user: {
              connect: {
                id: employeeId
              }
            }
          }
        });
      }

      // Create the repair log with spare parts
      const repair = await prisma.$transaction(async (tx) => {
        // Update device status
        await tx.medicalDevice.update({
          where: {
            id: medicalDeviceId
          },
          data: {
            status: deviceStatus
          }
        });

        // Generate repair code
        const repairCode = await generateRepairCode(tx as any);
        // Create repair log
        return await tx.repairLog.create({
          data: {
            repairCode: repairCode,
            notes,
            repairCost: new Prisma.Decimal(repairCost),
            repairDate: new Date(repairDate),
            medicalDevice: {
              connect: {
                id: medicalDeviceId
              }
            },
            location: {
              connect: {
                id: locationId
              }
            },
            technician: {
              connect: {
                id: technician.id
              }
            },
            spareParts: spareParts?.length > 0 ? {
              create: spareParts.map((part: { id: string; quantity: number }) => ({
                product: {
                  connect: {
                    id: part.id
                  }
                },
                quantity: part.quantity
              }))
            } : undefined
          },
          include: {
            medicalDevice: true,
            location: true,
            technician: {
              include: {
                user: true
              }
            },
            spareParts: {
              include: {
                product: true
              }
            }
          }
        });
      });

      // Update the stock quantities for used spare parts
      if (spareParts?.length > 0) {
        for (const part of spareParts) {
          // Get current stock
          const currentStock = await prisma.stock.findFirst({
            where: {
              productId: part.id
            }
          });

          if (currentStock) {
            // Update stock quantity
            await prisma.stock.update({
              where: {
                id: currentStock.id
              },
              data: {
                quantity: currentStock.quantity - part.quantity
              }
            });
          }
        }
      }

      return res.status(201).json(repair);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
