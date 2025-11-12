import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { id } = req.query;
  const userId = session.user.id;
  const userRole = session.user.role;

  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid task ID' });
  }

  try {
    if (req.method === 'GET') {
      // GET: Fetch single task
      const task = await prisma.manualTask.findUnique({
        where: { id },
        include: {
          patient: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              telephone: true,
              patientCode: true,
            },
          },
          assignedTo: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          createdBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      if (!task) {
        return res.status(404).json({ error: 'Task not found' });
      }

      // Employee can only view their assigned tasks
      if (userRole !== 'ADMIN' && task.assignedToId !== userId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      return res.status(200).json(task);
    } else if (req.method === 'PUT') {
      // PUT: Update task
      const task = await prisma.manualTask.findUnique({ where: { id } });

      if (!task) {
        return res.status(404).json({ error: 'Task not found' });
      }

      const { taskType, patientId, assignedToId, adminNotes, employeeNotes, status } = req.body;

      // Admin can update everything, Employee can only update their assigned tasks' status and notes
      if (userRole === 'ADMIN') {
        const updatedTask = await prisma.manualTask.update({
          where: { id },
          data: {
            ...(taskType && { taskType }),
            ...(patientId && { patientId }),
            ...(assignedToId && { assignedToId }),
            ...(adminNotes !== undefined && { adminNotes }),
            ...(status && {
              status,
              ...(status === 'COMPLETED' && !task.completedAt && { completedAt: new Date() }),
            }),
          },
          include: {
            patient: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                telephone: true,
                patientCode: true,
              },
            },
            assignedTo: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
            createdBy: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        });

        return res.status(200).json(updatedTask);
      } else {
        // Employee can only update their own assigned tasks
        if (task.assignedToId !== userId) {
          return res.status(403).json({ error: 'You can only update tasks assigned to you' });
        }

        // Employee can only update status and employeeNotes
        const updatedTask = await prisma.manualTask.update({
          where: { id },
          data: {
            ...(employeeNotes !== undefined && { employeeNotes }),
            ...(status && {
              status,
              ...(status === 'COMPLETED' && !task.completedAt && { completedAt: new Date() }),
            }),
          },
          include: {
            patient: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                telephone: true,
                patientCode: true,
              },
            },
            assignedTo: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
            createdBy: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        });

        return res.status(200).json(updatedTask);
      }
    } else if (req.method === 'DELETE') {
      // DELETE: Delete task (Admin only)
      if (userRole !== 'ADMIN') {
        return res.status(403).json({ error: 'Only admins can delete tasks' });
      }

      await prisma.manualTask.delete({ where: { id } });

      return res.status(200).json({ message: 'Task deleted successfully' });
    } else {
      res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
      return res.status(405).json({ error: `Method ${req.method} not allowed` });
    }
  } catch (error) {
    console.error('Error in manual-tasks/[id] API:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
