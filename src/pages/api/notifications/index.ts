import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import type { Notification } from '@prisma/client';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    if (req.method === 'GET') {
      const session = await getServerSession(req, res, authOptions);

      if (!session) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { type = 'all', status, startDate, endDate } = req.query;

      // Build query conditions
      const where: any = {
        userId: session.user.id
      };

      // Filter by type if specified
      if (type !== 'all') {
        const typeMap: Record<string, string> = {
          'diagnostic': 'FOLLOW_UP',  // Map diagnostic to FOLLOW_UP type
          'task': 'MAINTENANCE',
          'repair': 'MAINTENANCE',
          'payment': 'PAYMENT_DUE',
          'other': 'OTHER',
          'appointment': 'APPOINTMENT'
        };

        const notificationType = typeMap[type as string];
        if (notificationType) {
          where.type = notificationType;
        }
      }

      // Filter by status if specified
      if (status) {
        where.status = status;
      }

      // Filter by date range if specified
      if (startDate && endDate) {
        where.dueDate = {
          gte: new Date(startDate as string),
          lte: new Date(endDate as string)
        };
      }

      const notifications = await prisma.notification.findMany({
        where,
        include: {
          patient: true,
          company: true
        },
        orderBy: [
          { dueDate: 'asc' },
          { createdAt: 'desc' }
        ]
      });

      // Format the response
      const formattedNotifications = notifications.map(notification => {
        // Parse metadata field if it contains JSON data
        let metadata: any = {};
        try {
          if (notification.metadata) {
            metadata = notification.metadata as any;
          }
        } catch  {
          // If parsing fails, just use empty object
        }

        // Map schema notification types to frontend expected types
        let frontendType: any = notification.type;
        if (notification.type === 'FOLLOW_UP') {
          frontendType = 'DIAGNOSTIC_RESULT';
        } else if (notification.type === 'MAINTENANCE') {
          // Check metadata to determine if it's task or repair
          if (metadata && 'taskId' in metadata) {
            frontendType = 'TASK';
          } else if (metadata && 'repairId' in metadata) {
            frontendType = 'REPAIR';
          }
        }

        // Determine priority based on due date and status
        let priority = 'MEDIUM';
        if (notification.dueDate) {
          const daysUntilDue = Math.floor((new Date(notification.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
          if (daysUntilDue <= 1) {
            priority = 'HIGH';
          } else if (daysUntilDue > 7) {
            priority = 'LOW';
          }
        }

        return {
          id: notification.id,
          title: notification.title,
          description: notification.message,
          type: frontendType,
          status: notification.status,
          priority,
          dueDate: notification.dueDate,
          createdAt: notification.createdAt,
          updatedAt: notification.updatedAt,
          patientId: notification.patientId,
          patientName: notification.patient ? `${notification.patient.firstName} ${notification.patient.lastName}` : null,
          companyId: notification.companyId,
          companyName: notification.company ? notification.company.companyName : null,
          // Include metadata fields for specific notification types
          ...(frontendType === 'DIAGNOSTIC_RESULT' && {
            deviceId: metadata.deviceId,
            deviceName: metadata.deviceName,
            parameterId: metadata.parameterId,
            parameterName: metadata.parameterName,
          }),
          ...(frontendType === 'TASK' && {
            taskId: metadata.taskId,
            assigneeId: metadata.assigneeId,
            assigneeName: metadata.assigneeName,
          }),
          ...(frontendType === 'REPAIR' && {
            deviceId: metadata.deviceId,
            deviceName: metadata.deviceName,
            repairId: metadata.repairId,
            technicianId: metadata.technicianId,
            technicianName: metadata.technicianName,
          }),
        };
      });

      return res.status(200).json(formattedNotifications);
    }

    if (req.method === 'POST') {
      const session = await getServerSession(req, res, authOptions);

      if (!session) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { 
        title, 
        message, 
        type, 
        status = 'PENDING',
        dueDate,
        patientId,
        companyId,
        metadata = {},
        ...additionalData 
      } = req.body;

      if (!title || !type) {
        return res.status(400).json({ message: 'Missing required fields: title and type are required' });
      }

      // Map frontend types to schema types
      let schemaType = type;
      const enrichedMetadata = { ...metadata, ...additionalData };
      
      if (type === 'DIAGNOSTIC_RESULT') {
        schemaType = 'FOLLOW_UP';
      } else if (type === 'TASK' || type === 'REPAIR') {
        schemaType = 'MAINTENANCE';
        // Add type identifier to metadata
        if (type === 'TASK') {
          enrichedMetadata.taskId = enrichedMetadata.taskId || 'pending';
        } else if (type === 'REPAIR') {
          enrichedMetadata.repairId = enrichedMetadata.repairId || 'pending';
        }
      }

      const notification = await prisma.notification.create({
        data: {
          title,
          message: message || '',
          type: schemaType,
          status,
          dueDate: dueDate ? new Date(dueDate) : undefined,
          patientId,
          companyId,
          userId: session.user.id,
          metadata: enrichedMetadata
        }
      });

      return res.status(201).json(notification);
    }

    if (req.method === 'PUT') {
      const session = await getServerSession(req, res, authOptions);

      if (!session) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { id, status } = req.body;

      if (!id || !status) {
        return res.status(400).json({ message: 'Missing required fields: id and status are required' });
      }

      const notification = await prisma.notification.update({
        where: { id },
        data: { status }
      });

      return res.status(200).json(notification);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
