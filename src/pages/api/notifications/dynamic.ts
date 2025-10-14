import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';

interface DynamicNotification {
  id: string;
  type: 'RENTAL_EXPIRING' | 'PAYMENT_DUE' | 'DIAGNOSTIC_PENDING' | 'APPOINTMENT_REMINDER' | 'MAINTENANCE_DUE' | 'CNAM_RENEWAL';
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  title: string;
  message: string;
  clientName: string;
  clientType: 'patient' | 'company';
  clientId: string;
  actionUrl?: string;
  actionLabel?: string;
  dueDate?: Date;
  amount?: number;
  metadata?: any;
  createdAt: Date;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { filter = 'all', timeRange = '30' } = req.query;
    const notifications: DynamicNotification[] = [];
    const now = new Date();
    const timeRangeDays = parseInt(timeRange as string) || 30;
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + timeRangeDays);

    // 1. Check for expiring rentals
    if (filter === 'all' || filter === 'rentals') {
      const expiringRentals = await prisma.rental.findMany({
        where: {
          endDate: {
            gte: now,
            lte: futureDate
          },
          status: 'ACTIVE'
        },
        include: {
          patient: true,
          Company: true,
          medicalDevice: true
        }
      });

      expiringRentals.forEach(rental => {
        const daysUntilExpiry = Math.ceil((rental.endDate!.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        notifications.push({
          id: `rental-${rental.id}`,
          type: 'RENTAL_EXPIRING',
          priority: daysUntilExpiry <= 7 ? 'HIGH' : daysUntilExpiry <= 15 ? 'MEDIUM' : 'LOW',
          title: `Location expirante - ${rental.medicalDevice.name}`,
          message: `Expire dans ${daysUntilExpiry} jours`,
          clientName: rental.patient ? `${rental.patient.firstName} ${rental.patient.lastName}` : rental.Company?.companyName || '',
          clientType: rental.patient ? 'patient' : 'company',
          clientId: rental.patientId || rental.companyId || '',
          actionUrl: `/roles/admin/rentals/${rental.id}`,
          actionLabel: 'Voir la location',
          dueDate: rental.endDate!,
          metadata: { deviceName: rental.medicalDevice.name },
          createdAt: rental.createdAt
        });
      });
    }

    // 2. Check for overdue payments
    if (filter === 'all' || filter === 'payments') {
      const overduePayments = await prisma.payment.findMany({
        where: {
          status: 'PENDING',
          dueDate: {
            lte: now
          }
        },
        include: {
          patient: true,
          company: true,
          rental: {
            include: {
              medicalDevice: true
            }
          }
        }
      });

      overduePayments.forEach(payment => {
        const daysOverdue = Math.ceil((now.getTime() - payment.dueDate!.getTime()) / (1000 * 60 * 60 * 24));
        notifications.push({
          id: `payment-${payment.id}`,
          type: 'PAYMENT_DUE',
          priority: 'HIGH',
          title: `Paiement en retard`,
          message: `${daysOverdue} jours de retard - ${Number(payment.amount).toFixed(2)} TND`,
          clientName: payment.patient ? `${payment.patient.firstName} ${payment.patient.lastName}` : payment.company?.companyName || '',
          clientType: payment.patient ? 'patient' : 'company',
          clientId: payment.patientId || payment.companyId || '',
          actionUrl: payment.rentalId ? `/roles/admin/rentals/${payment.rentalId}` : '#',
          actionLabel: 'Voir le paiement',
          dueDate: payment.dueDate!,
          amount: Number(payment.amount),
          metadata: { 
            deviceName: payment.rental?.medicalDevice?.name,
            paymentMethod: payment.method 
          },
          createdAt: payment.createdAt
        });
      });
    }

    // 3. Check for pending diagnostics
    if (filter === 'all' || filter === 'diagnostics') {
      const pendingDiagnostics = await prisma.diagnostic.findMany({
        where: {
          status: 'PENDING',
          diagnosticDate: {
            gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
          }
        },
        include: {
          patient: true,
          Company: true,
          medicalDevice: true,
          result: true
        }
      });

      pendingDiagnostics.forEach(diagnostic => {
        const daysSinceDiagnostic = Math.ceil((now.getTime() - diagnostic.diagnosticDate.getTime()) / (1000 * 60 * 60 * 24));
        notifications.push({
          id: `diagnostic-${diagnostic.id}`,
          type: 'DIAGNOSTIC_PENDING',
          priority: daysSinceDiagnostic >= 3 ? 'HIGH' : 'MEDIUM',
          title: `Résultat de diagnostic en attente`,
          message: `${daysSinceDiagnostic} jours depuis le diagnostic`,
          clientName: diagnostic.patient ? `${diagnostic.patient.firstName} ${diagnostic.patient.lastName}` : diagnostic.Company?.companyName || '',
          clientType: diagnostic.patient ? 'patient' : 'company',
          clientId: diagnostic.patientId || diagnostic.companyId || '',
          actionUrl: `/roles/admin/diagnostics/${diagnostic.id}/results`,
          actionLabel: 'Saisir le résultat',
          dueDate: new Date(diagnostic.diagnosticDate.getTime() + 3 * 24 * 60 * 60 * 1000),
          metadata: { 
            deviceName: diagnostic.medicalDevice.name,
            hasResult: !!diagnostic.result 
          },
          createdAt: diagnostic.createdAt
        });
      });
    }

    // 4. Check for upcoming appointments
    if (filter === 'all' || filter === 'appointments') {
      const upcomingAppointments = await prisma.appointment.findMany({
        where: {
          scheduledDate: {
            gte: now,
            lte: futureDate
          },
          status: {
            in: ['SCHEDULED', 'CONFIRMED']
          }
        },
        include: {
          patient: true,
          company: true,
          assignedTo: true
        }
      });

      upcomingAppointments.forEach(appointment => {
        const daysUntil = Math.ceil((appointment.scheduledDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        if (daysUntil <= 2) { // Only show appointments within 2 days
          notifications.push({
            id: `appointment-${appointment.id}`,
            type: 'APPOINTMENT_REMINDER',
            priority: daysUntil === 0 ? 'HIGH' : 'MEDIUM',
            title: `Rendez-vous ${daysUntil === 0 ? "aujourd'hui" : daysUntil === 1 ? "demain" : `dans ${daysUntil} jours`}`,
            message: `${appointment.appointmentType} - ${appointment.location}`,
            clientName: appointment.patient ? `${appointment.patient.firstName} ${appointment.patient.lastName}` : appointment.company?.companyName || '',
            clientType: appointment.patient ? 'patient' : 'company',
            clientId: appointment.patientId || appointment.companyId || '',
            actionUrl: `/roles/admin/appointments/${appointment.id}`,
            actionLabel: 'Voir le rendez-vous',
            dueDate: appointment.scheduledDate,
            metadata: { 
              assignedTo: appointment.assignedTo ? `${appointment.assignedTo.firstName} ${appointment.assignedTo.lastName}` : null,
              priority: appointment.priority 
            },
            createdAt: appointment.createdAt
          });
        }
      });
    }

    // 5. Check for CNAM renewals
    if (filter === 'all' || filter === 'cnam') {
      const expiringCnamBonds = await prisma.cNAMBondRental.findMany({
        where: {
          endDate: {
            gte: now,
            lte: futureDate
          },
          status: 'APPROUVE'
        },
        include: {
          patient: true,
          rental: {
            include: {
              medicalDevice: true
            }
          }
        }
      });

      expiringCnamBonds.forEach(bond => {
        const daysUntilExpiry = Math.ceil((bond.endDate!.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        notifications.push({
          id: `cnam-${bond.id}`,
          type: 'CNAM_RENEWAL',
          priority: daysUntilExpiry <= 30 ? 'HIGH' : 'MEDIUM',
          title: `Renouvellement CNAM requis`,
          message: `Bon ${bond.bondNumber || 'N/A'} expire dans ${daysUntilExpiry} jours`,
          clientName: `${bond.patient.firstName} ${bond.patient.lastName}`,
          clientType: 'patient',
          clientId: bond.patientId,
          actionUrl: bond.rentalId ? `/roles/admin/rentals/${bond.rentalId}` : '#',
          actionLabel: 'Voir le dossier',
          dueDate: bond.endDate!,
          metadata: { 
            bondType: bond.bondType,
            deviceName: bond.rental?.medicalDevice?.name,
            monthlyAmount: Number(bond.monthlyAmount)
          },
          createdAt: bond.createdAt
        });
      });
    }

    // Sort notifications by priority and due date
    notifications.sort((a, b) => {
      const priorityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      return (a.dueDate?.getTime() || 0) - (b.dueDate?.getTime() || 0);
    });

    // Group notifications by type
    const groupedNotifications = notifications.reduce((acc, notification) => {
      if (!acc[notification.type]) {
        acc[notification.type] = [];
      }
      acc[notification.type].push(notification);
      return acc;
    }, {} as Record<string, DynamicNotification[]>);

    return res.status(200).json({
      notifications,
      grouped: groupedNotifications,
      stats: {
        total: notifications.length,
        high: notifications.filter(n => n.priority === 'HIGH').length,
        medium: notifications.filter(n => n.priority === 'MEDIUM').length,
        low: notifications.filter(n => n.priority === 'LOW').length,
        byType: Object.keys(groupedNotifications).map(type => ({
          type,
          count: groupedNotifications[type].length
        }))
      }
    });

  } catch (error) {
    console.error('Error fetching dynamic notifications:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}