import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { prisma } from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  
  if (!session) {
    return res.status(401).json({ message: 'Non autorisé' });
  }

  try {
    if (req.method === 'GET') {
      const { type, userId, assignedTo, priority, dueDate, search } = req.query;
      
      let data = {};

      switch (type) {
        case 'tasks':
          data = await getTasks(userId as string, assignedTo as string, priority as string, dueDate as string, search as string);
          break;
        case 'appointments':
          data = await getAppointments(userId as string, assignedTo as string, search as string);
          break;
        case 'diagnostics':
          data = await getDiagnostics(userId as string, search as string);
          break;
        case 'sales':
          data = await getSales(userId as string, search as string);
          break;
        case 'rentals':
          data = await getRentals(userId as string, search as string);
          break;
        case 'stockRequests':
          data = await getStockRequests(userId as string, search as string);
          break;
        case 'cnamDossiers':
          data = await getCNAMDossiers(userId as string, search as string);
          break;
        case 'notifications':
          data = await getNotifications(userId as string, search as string);
          break;
        default:
          return res.status(400).json({ message: 'Type non valide' });
      }

      res.status(200).json(data);
    } else if (req.method === 'PUT') {
      const { id, status, type } = req.body;
      
      let updatedItem;
      
      switch (type) {
        case 'tasks':
          updatedItem = await prisma.task.update({
            where: { id },
            data: { status, updatedAt: new Date() }
          });
          break;
        case 'appointments':
          updatedItem = await prisma.appointment.update({
            where: { id },
            data: { status, updatedAt: new Date() }
          });
          break;
        case 'diagnostics':
          updatedItem = await prisma.diagnostic.update({
            where: { id },
            data: { status, updatedAt: new Date() }
          });
          break;
        case 'sales':
          updatedItem = await prisma.sale.update({
            where: { id },
            data: { status, updatedAt: new Date() }
          });
          break;
        case 'rentals':
          updatedItem = await prisma.rental.update({
            where: { id },
            data: { status, updatedAt: new Date() }
          });
          break;
        case 'stockRequests':
          updatedItem = await prisma.stockTransferRequest.update({
            where: { id },
            data: { status, updatedAt: new Date() }
          });
          break;
        case 'cnamDossiers':
          updatedItem = await prisma.cNAMDossier.update({
            where: { id },
            data: { status, updatedAt: new Date() }
          });
          break;
        case 'notifications':
          updatedItem = await prisma.notification.update({
            where: { id },
            data: { status, updatedAt: new Date() }
          });
          break;
        default:
          return res.status(400).json({ message: 'Type non valide' });
      }

      res.status(200).json(updatedItem);
    } else {
      res.setHeader('Allow', ['GET', 'PUT']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    console.error('Kanban API Error:', error);
    res.status(500).json({ message: 'Erreur interne du serveur' });
  }
}

async function getTasks(userId?: string, assignedTo?: string, priority?: string, dueDate?: string, search?: string) {
  const where: any = {};
  
  if (userId && userId !== 'all') {
    where.userId = userId;
  }
  if (assignedTo && assignedTo !== 'all') {
    where.userId = assignedTo;
  }
  if (priority && priority !== 'all') {
    where.priority = priority;
  }
  if (dueDate) {
    where.endDate = {
      gte: new Date(dueDate),
      lt: new Date(new Date(dueDate).getTime() + 24 * 60 * 60 * 1000)
    };
  }
  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } }
    ];
  }

  return await prisma.task.findMany({
    where,
    include: {
      assignedTo: {
        select: { firstName: true, lastName: true, email: true }
      },
      completedBy: {
        select: { firstName: true, lastName: true, email: true }
      },
      diagnostic: {
        select: { id: true, patient: { select: { firstName: true, lastName: true } } }
      }
    },
    orderBy: { createdAt: 'desc' }
  });
}

async function getAppointments(userId?: string, assignedTo?: string, search?: string) {
  const where: any = {};
  
  if (userId && userId !== 'all') {
    where.createdById = userId;
  }
  if (assignedTo && assignedTo !== 'all') {
    where.assignedToId = assignedTo;
  }
  if (search) {
    where.OR = [
      { notes: { contains: search, mode: 'insensitive' } },
      { location: { contains: search, mode: 'insensitive' } },
      { patient: { 
        OR: [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } }
        ]
      } },
      { company: { companyName: { contains: search, mode: 'insensitive' } } }
    ];
  }

  return await prisma.appointment.findMany({
    where,
    include: {
      patient: {
        select: { firstName: true, lastName: true, telephone: true }
      },
      company: {
        select: { companyName: true, telephone: true }
      },
      assignedTo: {
        select: { firstName: true, lastName: true, email: true }
      },
      createdBy: {
        select: { firstName: true, lastName: true, email: true }
      }
    },
    orderBy: { scheduledDate: 'desc' }
  });
}

async function getDiagnostics(userId?: string, search?: string) {
  const where: any = {};
  
  if (userId && userId !== 'all') {
    where.performedById = userId;
  }
  if (search) {
    where.OR = [
      { notes: { contains: search, mode: 'insensitive' } },
      { patient: { 
        OR: [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } }
        ]
      } },
      { medicalDevice: { name: { contains: search, mode: 'insensitive' } } }
    ];
  }

  return await prisma.diagnostic.findMany({
    where,
    include: {
      patient: {
        select: { firstName: true, lastName: true, telephone: true }
      },
      medicalDevice: {
        select: { name: true, type: true, serialNumber: true }
      },
      performedBy: {
        select: { firstName: true, lastName: true, email: true }
      },
      Company: {
        select: { companyName: true }
      },
      result: true
    },
    orderBy: { diagnosticDate: 'desc' }
  });
}

async function getSales(userId?: string, search?: string) {
  const where: any = {};
  
  if (userId && userId !== 'all') {
    where.processedById = userId;
  }
  if (search) {
    where.OR = [
      { invoiceNumber: { contains: search, mode: 'insensitive' } },
      { notes: { contains: search, mode: 'insensitive' } },
      { patient: { 
        OR: [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } }
        ]
      } },
      { company: { companyName: { contains: search, mode: 'insensitive' } } }
    ];
  }

  return await prisma.sale.findMany({
    where,
    include: {
      patient: {
        select: { firstName: true, lastName: true, telephone: true }
      },
      company: {
        select: { companyName: true, telephone: true }
      },
      processedBy: {
        select: { firstName: true, lastName: true, email: true }
      },
      items: {
        include: {
          product: { select: { name: true, type: true } },
          medicalDevice: { select: { name: true, type: true } }
        }
      },
      payment: true
    },
    orderBy: { saleDate: 'desc' }
  });
}

async function getRentals(userId?: string, search?: string) {
  const where: any = {};
  
  if (search) {
    where.OR = [
      { invoiceNumber: { contains: search, mode: 'insensitive' } },
      { notes: { contains: search, mode: 'insensitive' } },
      { patient: { 
        OR: [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } }
        ]
      } },
      { Company: { companyName: { contains: search, mode: 'insensitive' } } },
      { medicalDevice: { name: { contains: search, mode: 'insensitive' } } }
    ];
  }

  return await prisma.rental.findMany({
    where,
    include: {
      patient: {
        select: { firstName: true, lastName: true, telephone: true }
      },
      Company: {
        select: { companyName: true, telephone: true }
      },
      medicalDevice: {
        select: { name: true, type: true, serialNumber: true }
      },
      payment: true,
      accessories: {
        include: {
          product: { select: { name: true, type: true } }
        }
      }
    },
    orderBy: { startDate: 'desc' }
  });
}

async function getStockRequests(userId?: string, search?: string) {
  const where: any = {};
  
  if (userId && userId !== 'all') {
    where.requestedById = userId;
  }
  if (search) {
    where.OR = [
      { reason: { contains: search, mode: 'insensitive' } },
      { reviewNotes: { contains: search, mode: 'insensitive' } },
      { product: { name: { contains: search, mode: 'insensitive' } } },
      { medicalDevice: { name: { contains: search, mode: 'insensitive' } } }
    ];
  }

  return await prisma.stockTransferRequest.findMany({
    where,
    include: {
      fromLocation: { select: { name: true } },
      toLocation: { select: { name: true } },
      product: { select: { name: true, type: true } },
      medicalDevice: { select: { name: true, type: true } },
      requestedBy: {
        select: { firstName: true, lastName: true, email: true }
      },
      reviewedBy: {
        select: { firstName: true, lastName: true, email: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  });
}

async function getCNAMDossiers(userId?: string, search?: string) {
  const where: any = {};
  
  if (search) {
    where.OR = [
      { dossierNumber: { contains: search, mode: 'insensitive' } },
      { notes: { contains: search, mode: 'insensitive' } },
      { patient: { 
        OR: [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } }
        ]
      } }
    ];
  }

  return await prisma.cNAMDossier.findMany({
    where,
    include: {
      patient: {
        select: { firstName: true, lastName: true, telephone: true }
      },
      sale: {
        include: {
          processedBy: {
            select: { firstName: true, lastName: true, email: true }
          }
        }
      },
      stepHistory: {
        orderBy: { changeDate: 'desc' },
        take: 1,
        include: {
          changedBy: {
            select: { firstName: true, lastName: true, email: true }
          }
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });
}

async function getNotifications(userId?: string, search?: string) {
  const where: any = {};
  
  if (userId && userId !== 'all') {
    where.userId = userId;
  }
  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { message: { contains: search, mode: 'insensitive' } },
      { patient: { 
        OR: [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } }
        ]
      } },
      { company: { companyName: { contains: search, mode: 'insensitive' } } }
    ];
  }

  return await prisma.notification.findMany({
    where,
    include: {
      patient: {
        select: { firstName: true, lastName: true, telephone: true }
      },
      company: {
        select: { companyName: true, telephone: true }
      },
      user: {
        select: { firstName: true, lastName: true, email: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  });
}