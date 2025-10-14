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
    const activities: Array<{
      type: string;
      title: string;
      subtitle: string;
      timestamp: Date;
      icon: string;
      color: string;
    }> = [];

    // Get recent diagnostics (completed in last 24 hours)
    const recentDiagnostics = await prisma.diagnostic.findMany({
      where: {
        performedById: userId,
        updatedAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
        }
      },
      include: {
        patient: true
      },
      orderBy: {
        updatedAt: 'desc'
      },
      take: 5
    });

    // Add diagnostics to activities
    recentDiagnostics.forEach(diagnostic => {
      activities.push({
        type: 'diagnostic',
        title: diagnostic.status === 'COMPLETED' ? 'Diagnostic complété' : 'Diagnostic en cours',
        subtitle: `Patient: ${diagnostic.patient?.firstName || ''} ${diagnostic.patient?.lastName || 'N/A'}`,
        timestamp: diagnostic.updatedAt,
        icon: 'CheckCircle',
        color: diagnostic.status === 'COMPLETED' ? 'text-green-600 bg-green-100' : 'text-yellow-600 bg-yellow-100'
      });
    });

    // Get recent appointments (today and upcoming)
    const recentAppointments = await prisma.appointment.findMany({
      where: {
        OR: [
          { assignedToId: userId },
          { createdById: userId }
        ],
        scheduledDate: {
          gte: new Date(new Date().setHours(0, 0, 0, 0))
        }
      },
      include: {
        patient: true
      },
      orderBy: {
        scheduledDate: 'asc'
      },
      take: 5
    });

    // Add appointments to activities
    recentAppointments.forEach(appointment => {
      const appointmentTime = new Date(appointment.scheduledDate);
      const timeString = appointmentTime.toLocaleTimeString('fr-FR', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
      
      activities.push({
        type: 'appointment',
        title: 'Rendez-vous programmé',
        subtitle: `${appointment.patient?.firstName || ''} ${appointment.patient?.lastName || 'N/A'} - ${timeString}`,
        timestamp: appointment.createdAt,
        icon: 'Clock',
        color: 'text-blue-600 bg-blue-100'
      });
    });

    // TODO: Get recent stock movements (if employee has stock location)
    // const user = await prisma.user.findUnique({
    //   where: { id: userId },
    //   include: { stockLocation: true }
    // });

    // if (user?.stockLocation?.id) {
    //   const stockMovements = await prisma.stockMovement.findMany({
    //     where: {
    //       OR: [
    //         { fromLocationId: user.stockLocation.id },
    //         { toLocationId: user.stockLocation.id }
    //       ],
    //       createdAt: {
    //         gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
    //       }
    //     },
    //     include: {
    //       product: true
    //     },
    //     orderBy: {
    //       createdAt: 'desc'
    //     },
    //     take: 5
    //   });

    //   // Add stock movements to activities
    //   stockMovements.forEach(movement => {
    //     activities.push({
    //       type: 'stock',
    //       title: 'Stock mis à jour',
    //       subtitle: `${movement.quantity} ${movement.product?.name || 'articles'}`,
    //       timestamp: movement.createdAt,
    //       icon: 'Package',
    //       color: 'text-purple-600 bg-purple-100'
    //     });
    //   });
    // }

    // Get recent tasks assigned to employee
    const recentTasks = await prisma.task.findMany({
      where: {
        userId: userId,
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 5
    });

    // Add tasks to activities
    recentTasks.forEach(task => {
      activities.push({
        type: 'task',
        title: task.priority === 'HIGH' ? 'Tâche urgente assignée' : 'Nouvelle tâche assignée',
        subtitle: task.title,
        timestamp: task.createdAt,
        icon: 'AlertCircle',
        color: task.priority === 'HIGH' ? 'text-orange-600 bg-orange-100' : 'text-gray-600 bg-gray-100'
      });
    });

    // Sort all activities by timestamp (most recent first)
    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Take only the 10 most recent activities
    const recentActivities = activities.slice(0, 10).map(activity => {
      const now = Date.now();
      const activityTime = new Date(activity.timestamp).getTime();
      const diffInMinutes = Math.floor((now - activityTime) / (1000 * 60));
      const diffInHours = Math.floor(diffInMinutes / 60);
      const diffInDays = Math.floor(diffInHours / 24);

      let timeAgo = '';
      if (diffInMinutes < 1) {
        timeAgo = 'À l\'instant';
      } else if (diffInMinutes < 60) {
        timeAgo = `Il y a ${diffInMinutes} min`;
      } else if (diffInHours < 24) {
        timeAgo = `Il y a ${diffInHours}h`;
      } else {
        timeAgo = `Il y a ${diffInDays}j`;
      }

      return {
        ...activity,
        time: timeAgo
      };
    });

    return res.status(200).json({ activities: recentActivities });
  } catch (error) {
    console.error('Error fetching employee activities:', error);
    return res.status(500).json({ 
      message: 'Error fetching activities',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}