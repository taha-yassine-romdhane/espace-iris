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

  const userId = session.user.id;
  const userRole = session.user.role;

  try {
    if (req.method === 'GET') {
      // GET: Fetch manual tasks
      // Admin sees all tasks, Employee sees only their assigned tasks
      const where = userRole === 'ADMIN' ? {} : { assignedToId: userId };

      const tasks = await prisma.manualTask.findMany({
        where,
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
        orderBy: {
          createdAt: 'desc',
        },
      });

      // Generate task codes for tasks without one
      for (const task of tasks) {
        if (!task.taskCode) {
          const taskNumber = String(tasks.indexOf(task) + 1).padStart(4, '0');
          const generatedCode = `MT-${taskNumber}`;
          await prisma.manualTask.update({
            where: { id: task.id },
            data: { taskCode: generatedCode },
          });
          task.taskCode = generatedCode;
        }
      }

      return res.status(200).json(tasks);
    } else if (req.method === 'POST') {
      // POST: Create a new manual task (Admin only)
      if (userRole !== 'ADMIN') {
        return res.status(403).json({ error: 'Only admins can create tasks' });
      }

      const { taskType, patientId, assignedToId, adminNotes } = req.body;

      if (!taskType || !patientId || !assignedToId) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      // Generate task code
      const count = await prisma.manualTask.count();
      const taskNumber = String(count + 1).padStart(4, '0');
      const taskCode = `MT-${taskNumber}`;

      const newTask = await prisma.manualTask.create({
        data: {
          taskCode,
          taskType,
          patientId,
          assignedToId,
          createdById: userId,
          adminNotes,
          status: 'PENDING',
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

      return res.status(201).json(newTask);
    } else {
      res.setHeader('Allow', ['GET', 'POST']);
      return res.status(405).json({ error: `Method ${req.method} not allowed` });
    }
  } catch (error) {
    console.error('Error in manual-tasks API:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
