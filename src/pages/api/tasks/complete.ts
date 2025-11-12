import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { taskId, taskType } = req.body;

    if (!taskId || !taskType) {
      return res.status(400).json({ error: 'Missing taskId or taskType' });
    }

    // Handle completion based on task type
    switch (taskType) {
      case 'TASK':
        // Complete manual task
        const task = await prisma.task.findUnique({
          where: { id: taskId }
        });

        if (!task) {
          return res.status(404).json({ error: 'Task not found' });
        }

        const updatedTask = await prisma.task.update({
          where: { id: taskId },
          data: {
            status: 'COMPLETED',
            completedAt: new Date(),
            completedById: session.user.id
          }
        });

        return res.status(200).json({
          success: true,
          task: updatedTask
        });

      case 'DIAGNOSTIC_PENDING':
        // Extract diagnostic ID from composite ID (format: "diagnostic-{id}")
        const diagnosticId = taskId.replace('diagnostic-', '');

        // Redirect message - this needs to be handled on the frontend
        return res.status(200).json({
          success: true,
          message: 'Please complete the diagnostic result form',
          redirectUrl: session.user.role === 'ADMIN'
            ? `/roles/admin/diagnostics/${diagnosticId}/results`
            : `/roles/employee/diagnostics/${diagnosticId}/results`
        });

      case 'RENTAL_EXPIRING':
        const rentalId = taskId.replace('rental-', '');

        return res.status(200).json({
          success: true,
          message: 'Please handle the rental expiration',
          redirectUrl: session.user.role === 'ADMIN'
            ? `/roles/admin/location/${rentalId}`
            : `/roles/employee/location/${rentalId}`
        });

      case 'PAYMENT_DUE':
        const paymentId = taskId.replace('payment-', '');

        // Mark payment as completed
        await prisma.payment.update({
          where: { id: paymentId },
          data: { status: 'COMPLETED' }
        });

        return res.status(200).json({
          success: true,
          message: 'Payment marked as completed'
        });

      case 'APPOINTMENT_REMINDER':
        const appointmentId = taskId.replace('appointment-', '');

        // Mark appointment as completed
        await prisma.appointment.update({
          where: { id: appointmentId },
          data: { status: 'COMPLETED' }
        });

        return res.status(200).json({
          success: true,
          message: 'Appointment marked as completed'
        });

      case 'CNAM_RENEWAL':
        const bondId = taskId.replace('cnam-', '');

        return res.status(200).json({
          success: true,
          message: 'Please renew the CNAM bond',
          redirectUrl: session.user.role === 'ADMIN'
            ? `/roles/admin/cnam-management`
            : `/roles/employee/cnam-management`
        });

      default:
        return res.status(400).json({ error: 'Invalid task type' });
    }

  } catch (error) {
    console.error('Error completing task:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
