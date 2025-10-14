import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from './auth/[...nextauth]';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    
    if (!session?.user?.id) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const userId = session.user.id;
    
    // Get query parameters for pagination and filtering
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;
    const type = req.query.type as string;
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : null;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : null;
    const search = req.query.search as string;

    const activities: Array<{
      [key: string]: any;
    }> = [];

    // Build date filter
    const dateFilter: any = {};
    if (startDate) {
      dateFilter.gte = startDate;
    }
    if (endDate) {
      dateFilter.lte = endDate;
    }

    // Get diagnostics
    if (!type || type === 'diagnostic') {
      const diagnostics = await prisma.diagnostic.findMany({
        where: {
          performedById: userId,
          ...(Object.keys(dateFilter).length > 0 && { updatedAt: dateFilter }),
          ...(search && {
            OR: [
              { notes: { contains: search, mode: 'insensitive' } },
              { patient: { firstName: { contains: search, mode: 'insensitive' } } },
              { patient: { lastName: { contains: search, mode: 'insensitive' } } }
            ]
          })
        },
        include: {
          patient: true,
          medicalDevice: true
        },
        orderBy: { updatedAt: 'desc' }
      });

      diagnostics.forEach(diagnostic => {
        activities.push({
          id: diagnostic.id,
          type: 'diagnostic',
          title: diagnostic.status === 'COMPLETED' ? 'Diagnostic complété' : 'Diagnostic en cours',
          subtitle: `Patient: ${diagnostic.patient?.firstName || ''} ${diagnostic.patient?.lastName || 'N/A'}`,
          description: diagnostic.notes || 'Aucune note',
          device: diagnostic.medicalDevice?.name || 'Appareil non spécifié',
          timestamp: diagnostic.updatedAt,
          status: diagnostic.status,
          icon: 'Activity',
          color: diagnostic.status === 'COMPLETED' ? 'text-green-600 bg-green-100' : 'text-yellow-600 bg-yellow-100'
        });
      });
    }

    // Get appointments
    if (!type || type === 'appointment') {
      const appointments = await prisma.appointment.findMany({
        where: {
          OR: [
            { assignedToId: userId },
            { createdById: userId }
          ],
          ...(Object.keys(dateFilter).length > 0 && { scheduledDate: dateFilter }),
          ...(search && {
            OR: [
              { notes: { contains: search, mode: 'insensitive' } },
              { location: { contains: search, mode: 'insensitive' } },
              { patient: { firstName: { contains: search, mode: 'insensitive' } } },
              { patient: { lastName: { contains: search, mode: 'insensitive' } } }
            ]
          })
        },
        include: {
          patient: true,
          company: true
        },
        orderBy: { scheduledDate: 'desc' }
      });

      appointments.forEach(appointment => {
        const appointmentTime = new Date(appointment.scheduledDate);
        activities.push({
          id: appointment.id,
          type: 'appointment',
          title: `Rendez-vous ${appointment.status}`,
          subtitle: appointment.patient 
            ? `${appointment.patient.firstName || ''} ${appointment.patient.lastName || 'N/A'}`
            : appointment.company?.companyName || 'Client non spécifié',
          description: appointment.notes || appointment.appointmentType,
          location: appointment.location,
          timestamp: appointment.scheduledDate,
          createdAt: appointment.createdAt,
          status: appointment.status,
          priority: appointment.priority,
          icon: 'Calendar',
          color: appointment.status === 'COMPLETED' ? 'text-blue-600 bg-blue-100' : 'text-gray-600 bg-gray-100'
        });
      });
    }

    // Get tasks
    if (!type || type === 'task') {
      const tasks = await prisma.task.findMany({
        where: {
          userId: userId,
          ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter }),
          ...(search && {
            OR: [
              { title: { contains: search, mode: 'insensitive' } },
              { description: { contains: search, mode: 'insensitive' } }
            ]
          })
        },
        include: {
          diagnostic: {
            include: {
              patient: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      tasks.forEach(task => {
        activities.push({
          id: task.id,
          type: 'task',
          title: task.title,
          subtitle: task.diagnostic?.patient 
            ? `Patient: ${task.diagnostic.patient.firstName || ''} ${task.diagnostic.patient.lastName || ''}`
            : 'Tâche générale',
          description: task.description || '',
          timestamp: task.createdAt,
          dueDate: task.endDate,
          completedAt: task.completedAt,
          status: task.status,
          priority: task.priority,
          icon: 'Clipboard',
          color: task.priority === 'HIGH' 
            ? 'text-red-600 bg-red-100' 
            : task.status === 'COMPLETED' 
            ? 'text-green-600 bg-green-100' 
            : 'text-orange-600 bg-orange-100'
        });
      });
    }

    // Get rentals (through patient's technician)
    if (!type || type === 'rental') {
      const rentals = await prisma.rental.findMany({
        where: {
          patient: {
            OR: [
              { technicianId: userId },
              { userId: userId }
            ]
          },
          ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter }),
          ...(search && {
            OR: [
              { patient: { firstName: { contains: search, mode: 'insensitive' } } },
              { patient: { lastName: { contains: search, mode: 'insensitive' } } },
              { accessories: { some: { product: { name: { contains: search, mode: 'insensitive' } } } } }
            ]
          })
        },
        include: {
          patient: true,
          accessories: {
            include: {
              product: true
            }
          },
          medicalDevice: true
        },
        orderBy: { createdAt: 'desc' }
      });

      rentals.forEach(rental => {
        activities.push({
          id: rental.id,
          type: 'rental',
          title: `Location ${rental.status}`,
          subtitle: `Patient: ${rental.patient?.firstName || ''} ${rental.patient?.lastName || 'N/A'}`,
          description: rental.medicalDevice?.name || `${rental.accessories?.length || 0} accessoire(s)`,
          timestamp: rental.createdAt,
          startDate: rental.startDate,
          endDate: rental.endDate,
          status: rental.status,
          icon: 'Package',
          color: rental.status === 'ACTIVE' ? 'text-purple-600 bg-purple-100' : 'text-gray-600 bg-gray-100'
        });
      });
    }

    // Get sales
    if (!type || type === 'sale') {
      const sales = await prisma.sale.findMany({
        where: {
          processedById: userId,
          ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter }),
          ...(search && {
            OR: [
              { patient: { firstName: { contains: search, mode: 'insensitive' } } },
              { patient: { lastName: { contains: search, mode: 'insensitive' } } },
              { company: { companyName: { contains: search, mode: 'insensitive' } } },
              { items: { some: { product: { name: { contains: search, mode: 'insensitive' } } } } }
            ]
          })
        },
        include: {
          patient: true,
          company: true,
          items: {
            include: {
              product: true,
              medicalDevice: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      sales.forEach(sale => {
        activities.push({
          id: sale.id,
          type: 'sale',
          title: `Vente ${sale.status}`,
          subtitle: sale.patient 
            ? `${sale.patient.firstName || ''} ${sale.patient.lastName || 'N/A'}`
            : sale.company?.companyName || 'Client non spécifié',
          description: `${sale.items.length} article(s) - ${sale.finalAmount}€`,
          timestamp: sale.createdAt,
          status: sale.status,
          totalAmount: sale.finalAmount,
          icon: 'ShoppingCart',
          color: sale.status === 'COMPLETED' ? 'text-green-600 bg-green-100' : 'text-yellow-600 bg-yellow-100'
        });
      });
    }

    // Get stock transfers (if employee has stock location)
    if (!type || type === 'stock') {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { stockLocation: true }
      });

      if (user?.stockLocation?.id) {
        const stockTransfers = await prisma.stockTransfer.findMany({
          where: {
            OR: [
              { fromLocationId: user.stockLocation.id },
              { toLocationId: user.stockLocation.id },
              { transferredById: userId },
              { sentById: userId },
              { receivedById: userId }
            ],
            ...(Object.keys(dateFilter).length > 0 && { transferDate: dateFilter }),
            ...(search && {
              product: { name: { contains: search, mode: 'insensitive' } }
            })
          },
          include: {
            product: true,
            fromLocation: true,
            toLocation: true
          },
          orderBy: { transferDate: 'desc' }
        });

        stockTransfers.forEach(transfer => {
          activities.push({
            id: transfer.id,
            type: 'stock',
            title: `Transfert de stock`,
            subtitle: `${transfer.product?.name || 'Produit'} (${transfer.quantity} unités)`,
            description: transfer.notes || '',
            from: transfer.fromLocation?.name,
            to: transfer.toLocation?.name,
            timestamp: transfer.transferDate,
            status: transfer.isVerified ? 'VERIFIED' : 'PENDING',
            icon: 'Box',
            color: 'text-indigo-600 bg-indigo-100'
          });
        });

        // Also get stock transfer requests
        const stockRequests = await prisma.stockTransferRequest.findMany({
          where: {
            OR: [
              { fromLocationId: user.stockLocation.id },
              { toLocationId: user.stockLocation.id },
              { requestedById: userId },
              { reviewedById: userId }
            ],
            ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter }),
            ...(search && {
              OR: [
                { product: { name: { contains: search, mode: 'insensitive' } } },
                { reason: { contains: search, mode: 'insensitive' } }
              ]
            })
          },
          include: {
            product: true,
            fromLocation: true,
            toLocation: true
          },
          orderBy: { createdAt: 'desc' }
        });

        stockRequests.forEach(request => {
          activities.push({
            id: request.id,
            type: 'stock',
            title: `Demande de transfert ${request.status}`,
            subtitle: `${request.product?.name || 'Produit'} (${request.requestedQuantity} unités demandées)`,
            description: request.reason,
            from: request.fromLocation?.name,
            to: request.toLocation?.name,
            timestamp: request.createdAt,
            status: request.status,
            urgency: request.urgency,
            icon: 'Box',
            color: request.urgency === 'HIGH' ? 'text-red-600 bg-red-100' : 'text-indigo-600 bg-indigo-100'
          });
        });
      }
    }

    // Sort all activities by timestamp
    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Apply pagination
    const totalCount = activities.length;
    const paginatedActivities = activities.slice(skip, skip + limit);

    // Format timestamps
    const formattedActivities = paginatedActivities.map(activity => {
      const date = new Date(activity.timestamp);
      return {
        ...activity,
        date: date.toLocaleDateString('fr-FR'),
        time: date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        relativeTime: getRelativeTime(date)
      };
    });

    return res.status(200).json({
      activities: formattedActivities,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasNext: page * limit < totalCount,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Error fetching employee history:', error);
    return res.status(500).json({ 
      message: 'Error fetching history',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

function getRelativeTime(date: Date): string {
  const now = Date.now();
  const activityTime = date.getTime();
  const diffInMinutes = Math.floor((now - activityTime) / (1000 * 60));
  const diffInHours = Math.floor(diffInMinutes / 60);
  const diffInDays = Math.floor(diffInHours / 24);
  const diffInWeeks = Math.floor(diffInDays / 7);
  const diffInMonths = Math.floor(diffInDays / 30);

  if (diffInMinutes < 1) return 'À l\'instant';
  if (diffInMinutes < 60) return `Il y a ${diffInMinutes} min`;
  if (diffInHours < 24) return `Il y a ${diffInHours}h`;
  if (diffInDays < 7) return `Il y a ${diffInDays}j`;
  if (diffInWeeks < 4) return `Il y a ${diffInWeeks} sem`;
  return `Il y a ${diffInMonths} mois`;
}