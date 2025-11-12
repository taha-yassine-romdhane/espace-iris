import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { TASK_TIME_CONSTANTS } from '@/lib/taskConstants';

interface ComprehensiveTask {
  id: string;
  title: string;
  description?: string;
  type: 'TASK' | 'DIAGNOSTIC_PENDING' | 'RENTAL_EXPIRING' | 'PAYMENT_DUE' | 'APPOINTMENT_REMINDER' | 'CNAM_RENEWAL' | 'MAINTENANCE_DUE';
  status: 'TODO' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  startDate: Date;
  endDate?: Date;
  dueDate?: Date;
  
  // Assignment info
  assignedTo?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
  };
  
  // Client info
  client?: {
    id: string;
    name: string;
    type: 'patient' | 'company';
    telephone?: string;
    patientCode?: string;
    avatar?: string;
  };
  
  // Related data
  relatedData?: {
    deviceName?: string;
    amount?: number;
    diagnosticId?: string;
    rentalId?: string;
    appointmentId?: string;
    paymentId?: string;
    bonNumber?: string;
    lastMaintenance?: Date;
  };
  
  // Action info
  actionUrl?: string;
  actionLabel?: string;
  canComplete?: boolean;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  completedBy?: string;
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

    const { startDate, endDate, filter = 'all', assignedUserId, assignedToMe, type } = req.query;
    const tasks: ComprehensiveTask[] = [];

    const start = startDate ? new Date(startDate as string) : new Date();
    const end = endDate ? new Date(endDate as string) : new Date(Date.now() + TASK_TIME_CONSTANTS.DEFAULT_RANGE_DAYS * 24 * 60 * 60 * 1000);

    // Determine if we should filter by current user
    const filterByCurrentUser = assignedToMe === 'true' || assignedUserId === session.user.id;
    const currentUserId = filterByCurrentUser ? session.user.id : (assignedUserId as string);

    // 1. Fetch actual tasks from database
    if (filter === 'all' || filter === 'TASK' || type === 'TASK') {
      const dbTasks = await prisma.task.findMany({
        where: {
          ...(currentUserId && {
            userId: currentUserId // Tasks assigned to user (only field available)
          }),
          OR: [
            {
              AND: [
                { startDate: { lte: end } },
                { endDate: { gte: start } }
              ]
            }
          ]
        },
        include: {
          assignedTo: true,
          completedBy: true,
          diagnostic: {
            include: {
              patient: true,
              medicalDevice: true
            }
          }
        }
      });

      dbTasks.forEach(task => {
        tasks.push({
          id: task.id,
          title: task.title,
          description: task.description || undefined,
          type: 'TASK',
          status: task.status as any,
          priority: task.priority as any,
          startDate: task.startDate,
          endDate: task.endDate,
          assignedTo: task.assignedTo ? {
            id: task.assignedTo.id,
            firstName: task.assignedTo.firstName,
            lastName: task.assignedTo.lastName,
            email: task.assignedTo.email,
            role: task.assignedTo.role
          } : undefined,
          client: task.diagnostic?.patient ? {
            id: task.diagnostic.patient.id,
            name: `${task.diagnostic.patient.firstName} ${task.diagnostic.patient.lastName}`,
            type: 'patient',
            telephone: task.diagnostic.patient.telephone,
            patientCode: task.diagnostic.patient.patientCode
          } : undefined,
          relatedData: task.diagnostic ? {
            deviceName: task.diagnostic.medicalDevice.name,
            diagnosticId: task.diagnostic.id
          } : undefined,
          actionUrl: task.diagnostic ? (session.user.role === 'ADMIN' ? `/roles/admin/diagnostics/${task.diagnostic.id}` : `/roles/employee/diagnostics/${task.diagnostic.id}`) : undefined,
          actionLabel: 'Voir la tâche',
          canComplete: task.status !== 'COMPLETED',
          createdAt: task.createdAt,
          updatedAt: task.updatedAt,
          completedAt: task.completedAt || undefined,
          completedBy: task.completedBy?.firstName && task.completedBy?.lastName 
            ? `${task.completedBy.firstName} ${task.completedBy.lastName}` 
            : undefined
        });
      });
    }

    // 2. Fetch pending diagnostics
    if (filter === 'all' || filter === 'DIAGNOSTIC_PENDING' || type === 'DIAGNOSTIC_PENDING') {
      const pendingDiagnostics = await prisma.diagnostic.findMany({
        where: {
          status: 'PENDING',
          diagnosticDate: { gte: start, lte: end },
          ...(currentUserId && {
            OR: [
              { performedById: currentUserId }, // Diagnostics performed by user
              { 
                patient: {
                  OR: [
                    { technicianId: currentUserId }, // Patient assigned to user as technician
                    { userId: currentUserId }        // Patient assigned to user
                  ]
                }
              }
            ]
          })
        },
        include: {
          patient: {
            include: {
              technician: true
            }
          },
          Company: true,
          medicalDevice: true,
          performedBy: true
        }
      });

      pendingDiagnostics.forEach(diagnostic => {
        const daysSince = Math.ceil((Date.now() - diagnostic.diagnosticDate.getTime()) / (1000 * 60 * 60 * 24));
        
        // Determine who should handle this diagnostic result
        const responsibleUser = diagnostic.patient?.technicianId ? 
          diagnostic.patient.technician : diagnostic.performedBy;
        
        tasks.push({
          id: `diagnostic-${diagnostic.id}`,
          title: `Résultat de diagnostic en attente`,
          description: `Diagnostic réalisé il y a ${daysSince} jours`,
          type: 'DIAGNOSTIC_PENDING',
          status: daysSince > TASK_TIME_CONSTANTS.DIAGNOSTIC_PENDING.URGENT_DAYS ? 'OVERDUE' : daysSince > TASK_TIME_CONSTANTS.DIAGNOSTIC_PENDING.WARNING_DAYS ? 'IN_PROGRESS' : 'TODO',
          priority: daysSince > TASK_TIME_CONSTANTS.DIAGNOSTIC_PENDING.URGENT_DAYS ? 'URGENT' : daysSince > TASK_TIME_CONSTANTS.DIAGNOSTIC_PENDING.WARNING_DAYS ? 'HIGH' : 'MEDIUM',
          startDate: diagnostic.diagnosticDate,
          dueDate: new Date(diagnostic.diagnosticDate.getTime() + TASK_TIME_CONSTANTS.DIAGNOSTIC_PENDING.DUE_DAYS * 24 * 60 * 60 * 1000),
          assignedTo: responsibleUser ? {
            id: responsibleUser.id,
            firstName: responsibleUser.firstName,
            lastName: responsibleUser.lastName,
            email: responsibleUser.email,
            role: responsibleUser.role
          } : undefined,
          client: diagnostic.patient ? {
            id: diagnostic.patient.id,
            name: `${diagnostic.patient.firstName} ${diagnostic.patient.lastName}`,
            type: 'patient',
            telephone: diagnostic.patient.telephone,
            patientCode: diagnostic.patient.patientCode
          } : diagnostic.Company ? {
            id: diagnostic.Company.id,
            name: diagnostic.Company.companyName,
            type: 'company',
            telephone: diagnostic.Company.telephone
          } : undefined,
          relatedData: {
            deviceName: diagnostic.medicalDevice.name,
            diagnosticId: diagnostic.id
          },
          actionUrl: session.user.role === 'ADMIN' ? `/roles/admin/diagnostics/${diagnostic.id}/results` : `/roles/employee/diagnostics/${diagnostic.id}/results`,
          actionLabel: 'Saisir le résultat',
          canComplete: true,
          createdAt: diagnostic.createdAt,
          updatedAt: diagnostic.updatedAt
        });
      });
    }

    // 3. Fetch expiring rentals
    if (filter === 'all' || filter === 'RENTAL_EXPIRING' || type === 'RENTAL_EXPIRING') {
      const expiringRentals = await prisma.rental.findMany({
        where: {
          endDate: { gte: start, lte: end },
          status: 'ACTIVE',
          ...(currentUserId && {
            patient: {
              OR: [
                { technicianId: currentUserId }, // Patient assigned to user as technician
                { userId: currentUserId }        // Patient assigned to user
              ]
            }
          })
        },
        include: {
          patient: {
            include: {
              technician: true
            }
          },
          medicalDevice: true
        }
      });

      expiringRentals.forEach(rental => {
        const daysUntil = Math.ceil((rental.endDate!.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        
        // Determine responsible user (technician assigned to patient)
        const responsibleUser = rental.patient?.technician;
        
        tasks.push({
          id: `rental-${rental.id}`,
          title: `Location expirante - ${rental.medicalDevice.name}`,
          description: `Expire dans ${daysUntil} jours`,
          type: 'RENTAL_EXPIRING',
          status: daysUntil <= 0 ? 'OVERDUE' : daysUntil <= TASK_TIME_CONSTANTS.RENTAL_EXPIRING.WARNING_DAYS ? 'IN_PROGRESS' : 'TODO',
          priority: daysUntil <= TASK_TIME_CONSTANTS.RENTAL_EXPIRING.WARNING_DAYS ? 'HIGH' : daysUntil <= TASK_TIME_CONSTANTS.RENTAL_EXPIRING.NOTICE_DAYS ? 'MEDIUM' : 'LOW',
          startDate: rental.startDate,
          endDate: rental.endDate!,
          dueDate: rental.endDate!,
          assignedTo: responsibleUser ? {
            id: responsibleUser.id,
            firstName: responsibleUser.firstName,
            lastName: responsibleUser.lastName,
            email: responsibleUser.email,
            role: responsibleUser.role
          } : undefined,
          client: rental.patient ? {
            id: rental.patient.id,
            name: `${rental.patient.firstName} ${rental.patient.lastName}`,
            type: 'patient',
            telephone: rental.patient.telephone,
            patientCode: rental.patient.patientCode
          } : undefined,
          relatedData: {
            deviceName: rental.medicalDevice.name,
            rentalId: rental.id
          },
          actionUrl: session.user.role === 'ADMIN' ? `/roles/admin/rentals/${rental.id}` : `/roles/employee/rentals/${rental.id}`,
          actionLabel: 'Voir la location',
          canComplete: true,
          createdAt: rental.createdAt,
          updatedAt: rental.updatedAt
        });
      });
    }

    // 4. Fetch overdue payments
    if (filter === 'all' || filter === 'PAYMENT_DUE' || type === 'PAYMENT_DUE') {
      const overduePayments = await prisma.payment.findMany({
        where: {
          status: 'PENDING',
          dueDate: { gte: start, lte: end },
          ...(currentUserId && {
            OR: [
              { 
                patient: {
                  OR: [
                    { technicianId: currentUserId }, // Patient assigned to user as technician
                    { userId: currentUserId }        // Patient assigned to user
                  ]
                }
              },
              { 
                company: {
                  OR: [
                    { technicianId: currentUserId }, // Company assigned to user as technician
                    { userId: currentUserId }        // Company assigned to user
                  ]
                }
              }
            ]
          })
        },
        include: {
          patient: true,
          company: true,
          rental: {
            include: { medicalDevice: true }
          }
        }
      });

      overduePayments.forEach(payment => {
        const daysOverdue = payment.dueDate ? Math.ceil((Date.now() - payment.dueDate.getTime()) / (1000 * 60 * 60 * 24)) : 0;
        tasks.push({
          id: `payment-${payment.id}`,
          title: `Paiement ${daysOverdue > 0 ? 'en retard' : 'à venir'}`,
          description: `${Number(payment.amount).toFixed(2)} TND - ${payment.method}`,
          type: 'PAYMENT_DUE',
          status: daysOverdue > 0 ? 'OVERDUE' : 'TODO',
          priority: daysOverdue > TASK_TIME_CONSTANTS.PAYMENT_DUE.URGENT_DAYS ? 'URGENT' : daysOverdue > 0 ? 'HIGH' : 'MEDIUM',
          startDate: payment.createdAt,
          dueDate: payment.dueDate!,
          client: payment.patient ? {
            id: payment.patient.id,
            name: `${payment.patient.firstName} ${payment.patient.lastName}`,
            type: 'patient',
            telephone: payment.patient.telephone,
            patientCode: payment.patient.patientCode
          } : payment.company ? {
            id: payment.company.id,
            name: payment.company.companyName,
            type: 'company',
            telephone: payment.company.telephone
          } : undefined,
          relatedData: {
            amount: Number(payment.amount),
            paymentId: payment.id,
            deviceName: payment.rental?.medicalDevice?.name
          },
          actionUrl: payment.rentalId ? (session.user.role === 'ADMIN' ? `/roles/admin/rentals/${payment.rentalId}` : `/roles/employee/rentals/${payment.rentalId}`) : '#',
          actionLabel: 'Voir le paiement',
          canComplete: true,
          createdAt: payment.createdAt,
          updatedAt: payment.updatedAt
        });
      });
    }

    // 5. Fetch upcoming appointments
    if (filter === 'all' || filter === 'APPOINTMENT_REMINDER' || type === 'APPOINTMENT_REMINDER') {
      const upcomingAppointments = await prisma.appointment.findMany({
        where: {
          scheduledDate: { gte: start, lte: end },
          status: { in: ['SCHEDULED', 'CONFIRMED'] },
          ...(currentUserId && {
            OR: [
              { assignedToId: currentUserId }, // Appointments assigned to user
              { createdById: currentUserId },  // Appointments created by user
              { 
                patient: {
                  OR: [
                    { technicianId: currentUserId }, // Patient assigned to user as technician
                    { userId: currentUserId }        // Patient assigned to user
                  ]
                }
              },
              { 
                company: {
                  OR: [
                    { technicianId: currentUserId }, // Company assigned to user as technician
                    { userId: currentUserId }        // Company assigned to user
                  ]
                }
              }
            ]
          })
        },
        include: {
          patient: true,
          company: true,
          assignedTo: true,
          createdBy: true
        }
      });

      upcomingAppointments.forEach(appointment => {
        const daysUntil = Math.ceil((appointment.scheduledDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        tasks.push({
          id: `appointment-${appointment.id}`,
          title: `Rendez-vous - ${appointment.appointmentType}`,
          description: `${appointment.location} - ${daysUntil === 0 ? "Aujourd'hui" : daysUntil === 1 ? "Demain" : `Dans ${daysUntil} jours`}`,
          type: 'APPOINTMENT_REMINDER',
          status: daysUntil < 0 ? 'OVERDUE' : daysUntil === 0 ? 'IN_PROGRESS' : 'TODO',
          priority: daysUntil <= 0 ? 'URGENT' : daysUntil === 1 ? 'HIGH' : 'MEDIUM',
          startDate: appointment.scheduledDate,
          dueDate: appointment.scheduledDate,
          assignedTo: appointment.assignedTo ? {
            id: appointment.assignedTo.id,
            firstName: appointment.assignedTo.firstName,
            lastName: appointment.assignedTo.lastName,
            email: appointment.assignedTo.email,
            role: appointment.assignedTo.role
          } : undefined,
          client: appointment.patient ? {
            id: appointment.patient.id,
            name: `${appointment.patient.firstName} ${appointment.patient.lastName}`,
            type: 'patient',
            telephone: appointment.patient.telephone,
            patientCode: appointment.patient.patientCode
          } : appointment.company ? {
            id: appointment.company.id,
            name: appointment.company.companyName,
            type: 'company',
            telephone: appointment.company.telephone
          } : undefined,
          relatedData: {
            appointmentId: appointment.id
          },
          actionUrl: session.user.role === 'ADMIN' ? `/roles/admin/appointments/${appointment.id}` : `/roles/employee/appointments/${appointment.id}`,
          actionLabel: 'Voir le rendez-vous',
          canComplete: true,
          createdAt: appointment.createdAt,
          updatedAt: appointment.updatedAt
        });
      });
    }

    // 6. Fetch CNAM renewals
    if (filter === 'all' || filter === 'CNAM_RENEWAL' || type === 'CNAM_RENEWAL') {
      const expiringBonds = await prisma.cNAMBonRental.findMany({
        where: {
          endDate: { gte: start, lte: end },
          status: 'APPROUVE',
          ...(currentUserId && {
            patient: {
              OR: [
                { technicianId: currentUserId }, // Patient assigned to user as technician
                { userId: currentUserId }        // Patient assigned to user
              ]
            }
          })
        },
        include: {
          patient: {
            include: {
              technician: true
            }
          },
          rental: {
            include: { medicalDevice: true }
          }
        }
      });

      expiringBonds.forEach(bond => {
        const daysUntil = Math.ceil((bond.endDate!.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

        // Use best available identifier: bonNumber > dossierNumber > equipment name > bonType
        const bondIdentifier = bond.bonNumber
          || bond.dossierNumber
          || (bond.rental?.medicalDevice?.name)
          || bond.bonType;

        // Determine responsible user (technician assigned to patient)
        const responsibleUser = bond.patient?.technician;

        tasks.push({
          id: `cnam-${bond.id}`,
          title: `Renouvellement CNAM - ${bond.bonType}`,
          description: `${bondIdentifier} expire dans ${daysUntil} jours`,
          type: 'CNAM_RENEWAL',
          status: daysUntil <= 0 ? 'OVERDUE' : daysUntil <= TASK_TIME_CONSTANTS.CNAM_RENEWAL.WARNING_DAYS ? 'IN_PROGRESS' : 'TODO',
          priority: daysUntil <= TASK_TIME_CONSTANTS.CNAM_RENEWAL.WARNING_DAYS ? 'HIGH' : 'MEDIUM',
          startDate: bond.startDate || bond.createdAt,
          endDate: bond.endDate!,
          dueDate: bond.endDate!,
          assignedTo: responsibleUser ? {
            id: responsibleUser.id,
            firstName: responsibleUser.firstName,
            lastName: responsibleUser.lastName,
            email: responsibleUser.email,
            role: responsibleUser.role
          } : undefined,
          client: {
            id: bond.patient.id,
            name: `${bond.patient.firstName} ${bond.patient.lastName}`,
            type: 'patient',
            telephone: bond.patient.telephone,
            patientCode: bond.patient.patientCode
          },
          relatedData: {
            bonNumber: bond.bonNumber || undefined,
            amount: Number(bond.bonAmount),
            deviceName: bond.rental?.medicalDevice?.name
          },
          actionUrl: bond.rentalId ? (session.user.role === 'ADMIN' ? `/roles/admin/rentals/${bond.rentalId}` : `/roles/employee/rentals/${bond.rentalId}`) : '#',
          actionLabel: 'Voir le dossier',
          canComplete: true,
          createdAt: bond.createdAt,
          updatedAt: bond.updatedAt
        });
      });
    }

    // Sort by priority and due date
    tasks.sort((a, b) => {
      const priorityOrder = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      return (a.dueDate?.getTime() || a.startDate.getTime()) - (b.dueDate?.getTime() || b.startDate.getTime());
    });

    // Calculate stats
    const stats = {
      total: tasks.length,
      byStatus: {
        TODO: tasks.filter(t => t.status === 'TODO').length,
        IN_PROGRESS: tasks.filter(t => t.status === 'IN_PROGRESS').length,
        COMPLETED: tasks.filter(t => t.status === 'COMPLETED').length,
        OVERDUE: tasks.filter(t => t.status === 'OVERDUE').length
      },
      byPriority: {
        URGENT: tasks.filter(t => t.priority === 'URGENT').length,
        HIGH: tasks.filter(t => t.priority === 'HIGH').length,
        MEDIUM: tasks.filter(t => t.priority === 'MEDIUM').length,
        LOW: tasks.filter(t => t.priority === 'LOW').length
      },
      byType: {
        TASK: tasks.filter(t => t.type === 'TASK').length,
        DIAGNOSTIC_PENDING: tasks.filter(t => t.type === 'DIAGNOSTIC_PENDING').length,
        RENTAL_EXPIRING: tasks.filter(t => t.type === 'RENTAL_EXPIRING').length,
        PAYMENT_DUE: tasks.filter(t => t.type === 'PAYMENT_DUE').length,
        APPOINTMENT_REMINDER: tasks.filter(t => t.type === 'APPOINTMENT_REMINDER').length,
        CNAM_RENEWAL: tasks.filter(t => t.type === 'CNAM_RENEWAL').length
      }
    };

    return res.status(200).json({
      tasks,
      stats,
      dateRange: { start, end }
    });

  } catch (error) {
    console.error('Error fetching comprehensive tasks:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}