import prisma from '@/lib/db';
import { NotificationType, NotificationStatus } from '@prisma/client';

interface CreateNotificationParams {
  title: string;
  message: string;
  type: NotificationType;
  userId: string;
  patientId?: string;
  companyId?: string;
  dueDate?: Date;
  metadata?: any;
}

export async function createNotification(params: CreateNotificationParams) {
  const {
    title,
    message,
    type,
    userId,
    patientId,
    companyId,
    dueDate,
    metadata = {}
  } = params;

  return await prisma.notification.create({
    data: {
      title,
      message,
      type,
      status: 'PENDING' as NotificationStatus,
      userId,
      patientId,
      companyId,
      dueDate,
      metadata,
      isRead: false
    }
  });
}

// Helper functions for specific notification types

export async function createDiagnosticResultNotification(
  deviceId: string,
  deviceName: string,
  patientId: string,
  patientName: string,
  parameterId: string,
  parameterName: string,
  userId: string,
  dueDate: Date
) {
  return createNotification({
    title: `Résultat de diagnostic attendu`,
    message: `Résultat du diagnostic pour ${patientName} attendu avec l'appareil ${deviceName}`,
    type: 'FOLLOW_UP',
    userId,
    patientId,
    dueDate,
    metadata: {
      deviceId,
      deviceName,
      parameterId,
      parameterName
    }
  });
}

export async function createDiagnosticCreationNotification(
  deviceId: string,
  deviceName: string,
  patientId: string,
  patientName: string,
  diagnosticId: string,
  userId: string
) {
  return createNotification({
    title: `Diagnostic créé`,
    message: `Diagnostic créé pour le patient ${patientName} avec l'appareil ${deviceName}`,
    type: NotificationType.OTHER,
    userId,
    patientId,
    dueDate: new Date(), // Show immediately
    metadata: {
      deviceId,
      deviceName,
      diagnosticId,
      type: 'DIAGNOSTIC_CREATION'
    }
  });
}

export async function createTaskNotification(
  taskTitle: string,
  taskDescription: string,
  assigneeId: string,
  dueDate: Date,
  taskId?: string
) {
  return createNotification({
    title: taskTitle,
    message: taskDescription,
    type: 'MAINTENANCE',
    userId: assigneeId,
    dueDate,
    metadata: {
      taskId: taskId || 'pending',
      assigneeId,
      taskType: 'TASK'
    }
  });
}

export async function createRepairNotification(
  deviceId: string,
  deviceName: string,
  technicianId: string,
  repairId: string,
  description: string
) {
  return createNotification({
    title: `Réparation requise - ${deviceName}`,
    message: description,
    type: 'MAINTENANCE',
    userId: technicianId,
    metadata: {
      deviceId,
      deviceName,
      repairId,
      technicianId,
      repairType: 'REPAIR'
    }
  });
}

export async function createPaymentDueNotification(
  patientId: string,
  patientName: string,
  amount: number,
  dueDate: Date,
  userId: string,
  paymentId?: string
) {
  return createNotification({
    title: `Paiement en retard - ${patientName}`,
    message: `Un paiement de ${amount} TND est en retard`,
    type: 'PAYMENT_DUE',
    userId,
    patientId,
    dueDate,
    metadata: {
      amount,
      paymentId
    }
  });
}

export async function createAppointmentReminderNotification(
  appointmentId: string,
  patientId: string,
  patientName: string,
  appointmentDate: Date,
  userId: string
) {
  const oneDayBefore = new Date(appointmentDate);
  oneDayBefore.setDate(oneDayBefore.getDate() - 1);

  return createNotification({
    title: `Rappel de rendez-vous - ${patientName}`,
    message: `Rendez-vous prévu le ${appointmentDate.toLocaleDateString('fr-FR')}`,
    type: 'APPOINTMENT',
    userId,
    patientId,
    dueDate: oneDayBefore,
    metadata: {
      appointmentId,
      appointmentDate: appointmentDate.toISOString()
    }
  });
}

export async function createRentalExpirationNotification(
  rentalId: string,
  deviceName: string,
  patientId: string,
  patientName: string,
  expirationDate: Date,
  userId: string
) {
  const thirtyDaysBefore = new Date(expirationDate);
  thirtyDaysBefore.setDate(thirtyDaysBefore.getDate() - 30);

  return createNotification({
    title: `Location expirante - ${deviceName}`,
    message: `La location pour ${patientName} expire le ${expirationDate.toLocaleDateString('fr-FR')}`,
    type: 'FOLLOW_UP',
    userId,
    patientId,
    dueDate: thirtyDaysBefore,
    metadata: {
      rentalId,
      deviceName,
      expirationDate: expirationDate.toISOString()
    }
  });
}

// Function to check and create overdue notifications
export async function checkAndCreateOverdueNotifications() {
  const now = new Date();

  // Check for overdue payments
  const overduePayments = await prisma.payment.findMany({
    where: {
      status: 'PENDING',
      dueDate: {
        lt: now
      }
    },
    include: {
      patient: true,
      company: true
    }
  });

  for (const payment of overduePayments) {
    const existingNotification = await prisma.notification.findFirst({
      where: {
        metadata: {
          path: ['paymentId'],
          equals: payment.id
        },
        type: 'PAYMENT_DUE'
      }
    });

    if (!existingNotification) {
      const clientName = payment.patient 
        ? `${payment.patient.firstName} ${payment.patient.lastName}`
        : payment.company?.companyName || 'Unknown';
      
      // Find the user responsible for this client
      const userId = payment.patient?.userId || payment.company?.userId;
      
      if (userId && payment.patientId) {
        await createPaymentDueNotification(
          payment.patientId,
          clientName,
          Number(payment.amount),
          payment.dueDate!,
          userId,
          payment.id
        );
      }
    }
  }

  // Check for upcoming appointments
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const upcomingAppointments = await prisma.appointment.findMany({
    where: {
      scheduledDate: {
        gte: now,
        lte: tomorrow
      },
      status: {
        in: ['SCHEDULED', 'CONFIRMED']
      }
    },
    include: {
      patient: true,
      assignedTo: true
    }
  });

  for (const appointment of upcomingAppointments) {
    const existingNotification = await prisma.notification.findFirst({
      where: {
        metadata: {
          path: ['appointmentId'],
          equals: appointment.id
        },
        type: 'APPOINTMENT'
      }
    });

    if (!existingNotification && appointment.patient && appointment.assignedTo) {
      await createAppointmentReminderNotification(
        appointment.id,
        appointment.patientId!,
        `${appointment.patient.firstName} ${appointment.patient.lastName}`,
        appointment.scheduledDate,
        appointment.assignedToId!
      );
    }
  }
}