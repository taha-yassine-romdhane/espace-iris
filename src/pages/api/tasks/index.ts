import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import prisma from '@/lib/db';
import { generateTaskCode } from '@/utils/idGenerator';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    try {
      const { startDate, endDate, assignedTo, diagnosticId, patientId } = req.query;
      
      const tasks = await prisma.task.findMany({
        where: {
          ...(assignedTo ? { userId: assignedTo as string } : {}),
          ...(diagnosticId ? { diagnosticId: diagnosticId as string } : {}),
          ...(patientId ? { patientId: patientId as string } : {}),
          ...(startDate && endDate ? {
            createdAt: {
              gte: new Date(startDate as string),
              lte: new Date(endDate as string)
            }
          } : {})
        },
        include: {
          assignedTo: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              role: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      return res.status(200).json(tasks);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      return res.status(500).json({ error: 'Failed to fetch tasks' });
    }
  }

  if (req.method === 'POST') {
    try {
      const { title, description, status, priority, startDate, endDate } = req.body;

      const task = await prisma.$transaction(async (tx) => {
        const taskCode = await generateTaskCode(tx as any);
        const newTask = await tx.task.create({
          data: {
            taskCode: taskCode,
            title,
            description,
            status,
            priority,
            userId: session.user.id, // Always use the logged-in user's ID
            startDate: startDate ? new Date(startDate) : new Date(),
            endDate: endDate ? new Date(endDate) : new Date(),
          },
          include: {
            assignedTo: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                role: true
              }
            }
          }
        });

        await tx.userActionHistory.create({
          data: {
            userId: session.user.id,
            actionType: 'TASK_CREATION',
            relatedItemId: newTask.id,
            relatedItemType: 'Task',
            details: {
              title: newTask.title,
              status: newTask.status,
              priority: newTask.priority,
              assignedTo: newTask.assignedTo?.id,
            },
          },
        });

        return newTask;
      });

      return res.status(201).json(task);
    } catch (error) {
      console.error('Error creating task:', error);
      return res.status(500).json({ error: 'Failed to create task' });
    }
  }

  if (req.method === 'PUT') {
    try {
      const { id, title, description, status, priority, startDate, endDate } = req.body;

      const task = await prisma.$transaction(async (tx) => {
        const existingTask = await tx.task.findUnique({
          where: { id },
        });

        if (!existingTask || existingTask.userId !== session.user.id) {
          throw new Error('Not authorized to modify this task');
        }

        const updatedTask = await tx.task.update({
          where: { id },
          data: {
            title,
            description,
            status,
            priority,
            startDate: startDate ? new Date(startDate) : undefined,
            endDate: endDate ? new Date(endDate) : undefined,
          },
          include: {
            assignedTo: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                role: true,
              },
            },
          },
        });

        const changes = Object.keys(req.body).reduce((acc: { [key: string]: any }, key) => {
          if (req.body[key] !== undefined && (existingTask as any)[key] !== req.body[key]) {
            acc[key] = { old: (existingTask as any)[key], new: req.body[key] };
          }
          return acc;
        }, {});

        if (Object.keys(changes).length > 0) {
          await tx.userActionHistory.create({
            data: {
              userId: session.user.id,
              actionType: 'TASK_UPDATE',
              relatedItemId: updatedTask.id,
              relatedItemType: 'Task',
              details: {
                changes,
              },
            },
          });
        }

        return updatedTask;
      });

      return res.status(200).json(task);
    } catch (error) {
      console.error('Error updating task:', error);
      return res.status(500).json({ error: 'Failed to update task' });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const { id } = req.body;

      const task = await prisma.$transaction(async (tx) => {
        const existingTask = await tx.task.findUnique({
          where: { id },
        });

        if (!existingTask) {
          throw new Error('Task not found');
        }

        if (existingTask.userId !== session.user.id) {
          throw new Error('Not authorized to delete this task');
        }

        await tx.userActionHistory.create({
          data: {
            userId: session.user.id,
            actionType: 'TASK_DELETION',
            relatedItemId: id,
            relatedItemType: 'Task',
            details: {
              deletedTask: existingTask,
            },
          },
        });

        await tx.task.delete({ where: { id } });

        return existingTask;
      });

      return res.status(200).json({ message: 'Task deleted successfully', task });
    } catch (error) {
      console.error('Error deleting task:', error);
      return res.status(500).json({ error: 'Failed to delete task' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
