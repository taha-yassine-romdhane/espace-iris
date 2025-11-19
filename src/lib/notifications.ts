import prisma from '@/lib/db';
import {
  NOTIFICATION_TYPES,
  NOTIFICATION_STATUS,
  NOTIFICATION_PRIORITY,
  calculatePriority,
  generateActionUrl,
  type NotificationType,
  type NotificationStatus,
  type NotificationPriority,
} from './notificationConstants';

interface CreateNotificationParams {
  title: string;
  message: string;
  type: NotificationType | string;
  userId: string;
  userRole?: 'ADMIN' | 'EMPLOYEE';
  patientId?: string;
  companyId?: string;
  dueDate?: Date;
  priority?: NotificationPriority;
  // Foreign key IDs
  rentalId?: string;
  saleId?: string;
  diagnosticId?: string;
  appointmentId?: string;
  manualTaskId?: string;
  paymentId?: string;
  stockTransferRequestId?: string;
  // Metadata
  metadata?: any;
  actionUrl?: string;
}

export async function createNotification(params: CreateNotificationParams) {
  const {
    title,
    message,
    type,
    userId,
    userRole = 'EMPLOYEE',
    patientId,
    companyId,
    dueDate,
    priority,
    rentalId,
    saleId,
    diagnosticId,
    appointmentId,
    manualTaskId,
    paymentId,
    stockTransferRequestId,
    metadata = {},
    actionUrl
  } = params;

  // Calculate priority if not provided
  const calculatedPriority = priority || calculatePriority(dueDate);

  // Generate action URL if not provided
  const generatedActionUrl = actionUrl || generateActionUrl(
    type as NotificationType,
    userRole,
    { rentalId, saleId, diagnosticId, appointmentId, manualTaskId, paymentId, patientId, stockTransferRequestId }
  );

  return await prisma.notification.create({
    data: {
      title,
      message,
      type,
      status: NOTIFICATION_STATUS.PENDING,
      priority: calculatedPriority,
      userId,
      patientId,
      companyId,
      dueDate,
      rentalId,
      saleId,
      diagnosticId,
      appointmentId,
      manualTaskId,
      paymentId,
      stockTransferRequestId,
      actionUrl: generatedActionUrl,
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
  dueDate: Date,
  diagnosticId?: string
) {
  return createNotification({
    title: `Résultat de diagnostic attendu`,
    message: `Résultat du diagnostic pour ${patientName} attendu avec l'appareil ${deviceName}`,
    type: NOTIFICATION_TYPES.FOLLOW_UP,
    userId,
    patientId,
    diagnosticId,
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
    type: NOTIFICATION_TYPES.DIAGNOSTIC_PENDING,
    userId,
    patientId,
    diagnosticId,
    dueDate: new Date(), // Show immediately
    priority: NOTIFICATION_PRIORITY.NORMAL,
    metadata: {
      deviceId,
      deviceName,
      type: 'DIAGNOSTIC_CREATION'
    }
  });
}

export async function createTaskNotification(
  taskTitle: string,
  taskDescription: string,
  assigneeId: string,
  dueDate: Date,
  taskId?: string,
  patientId?: string
) {
  return createNotification({
    title: taskTitle,
    message: taskDescription,
    type: NOTIFICATION_TYPES.TASK_ASSIGNED,
    userId: assigneeId,
    patientId,
    manualTaskId: taskId,
    dueDate,
    metadata: {
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
  description: string,
  patientId?: string
) {
  return createNotification({
    title: `Réparation requise - ${deviceName}`,
    message: description,
    type: NOTIFICATION_TYPES.MAINTENANCE,
    userId: technicianId,
    patientId,
    priority: NOTIFICATION_PRIORITY.HIGH,
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
  paymentId?: string,
  rentalId?: string
) {
  return createNotification({
    title: `Paiement en retard - ${patientName}`,
    message: `Un paiement de ${amount} TND est en retard`,
    type: NOTIFICATION_TYPES.PAYMENT_DUE,
    userId,
    patientId,
    paymentId,
    rentalId,
    dueDate,
    metadata: {
      amount
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
    type: NOTIFICATION_TYPES.APPOINTMENT,
    userId,
    patientId,
    appointmentId,
    dueDate: oneDayBefore,
    metadata: {
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
    type: NOTIFICATION_TYPES.RENTAL_EXPIRING,
    userId,
    patientId,
    rentalId,
    dueDate: thirtyDaysBefore,
    metadata: {
      deviceName,
      expirationDate: expirationDate.toISOString()
    }
  });
}

// New notification functions for missing events

export async function createSaleCompletedNotification(
  saleId: string,
  patientId: string,
  patientName: string,
  amount: number,
  userId: string
) {
  return createNotification({
    title: `Vente terminée - ${patientName}`,
    message: `Vente de ${amount} TND terminée pour ${patientName}`,
    type: NOTIFICATION_TYPES.SALE_COMPLETED,
    userId,
    patientId,
    saleId,
    priority: NOTIFICATION_PRIORITY.NORMAL,
    metadata: {
      amount
    }
  });
}

export async function createRentalReturnNotification(
  rentalId: string,
  deviceName: string,
  patientId: string,
  patientName: string,
  returnDate: Date,
  userId: string
) {
  return createNotification({
    title: `Retour de location - ${deviceName}`,
    message: `Retour de ${deviceName} prévu pour ${patientName} le ${returnDate.toLocaleDateString('fr-FR')}`,
    type: NOTIFICATION_TYPES.RENTAL_RETURN,
    userId,
    patientId,
    rentalId,
    dueDate: returnDate,
    metadata: {
      deviceName
    }
  });
}

export async function createTaskCompletedNotification(
  taskId: string,
  taskTitle: string,
  completedBy: string,
  supervisorId: string,
  patientId?: string
) {
  return createNotification({
    title: `Tâche terminée - ${taskTitle}`,
    message: `La tâche "${taskTitle}" a été terminée`,
    type: NOTIFICATION_TYPES.TASK_COMPLETED,
    userId: supervisorId,
    patientId,
    manualTaskId: taskId,
    priority: NOTIFICATION_PRIORITY.LOW,
    metadata: {
      completedBy,
      completedAt: new Date().toISOString()
    }
  });
}

export async function createStockLowNotification(
  productId: string,
  productName: string,
  currentStock: number,
  minStock: number,
  userId: string
) {
  return createNotification({
    title: `Stock faible - ${productName}`,
    message: `Le stock de ${productName} est faible (${currentStock}/${minStock})`,
    type: NOTIFICATION_TYPES.STOCK_LOW,
    userId,
    priority: NOTIFICATION_PRIORITY.HIGH,
    metadata: {
      productId,
      productName,
      currentStock,
      minStock
    }
  });
}

export async function createTransferNotification(
  transferRequestId: string,
  productName: string,
  fromLocation: string,
  toLocation: string,
  userId: string,
  type: 'TRANSFER' | 'TRANSFER_APPROVED' | 'TRANSFER_REJECTED' = 'TRANSFER'
) {
  const typeMap = {
    'TRANSFER': {
      title: `Demande de transfert - ${productName}`,
      message: `Transfert de ${productName} de ${fromLocation} vers ${toLocation}`,
      priority: NOTIFICATION_PRIORITY.NORMAL
    },
    'TRANSFER_APPROVED': {
      title: `Transfert approuvé - ${productName}`,
      message: `Votre demande de transfert de ${productName} a été approuvée`,
      priority: NOTIFICATION_PRIORITY.NORMAL
    },
    'TRANSFER_REJECTED': {
      title: `Transfert rejeté - ${productName}`,
      message: `Votre demande de transfert de ${productName} a été rejetée`,
      priority: NOTIFICATION_PRIORITY.HIGH
    }
  };

  const config = typeMap[type];

  return createNotification({
    title: config.title,
    message: config.message,
    type: NOTIFICATION_TYPES[type],
    userId,
    stockTransferRequestId: transferRequestId,
    priority: config.priority,
    metadata: {
      productName,
      fromLocation,
      toLocation
    }
  });
}

export async function createCNAMRenewalNotification(
  patientId: string,
  patientName: string,
  renewalDate: Date,
  userId: string,
  rentalId?: string
) {
  const thirtyDaysBefore = new Date(renewalDate);
  thirtyDaysBefore.setDate(thirtyDaysBefore.getDate() - 30);

  return createNotification({
    title: `Renouvellement CNAM - ${patientName}`,
    message: `Le bon CNAM pour ${patientName} doit être renouvelé le ${renewalDate.toLocaleDateString('fr-FR')}`,
    type: NOTIFICATION_TYPES.CNAM_RENEWAL,
    userId,
    patientId,
    rentalId,
    dueDate: thirtyDaysBefore,
    metadata: {
      renewalDate: renewalDate.toISOString()
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
        type: NOTIFICATION_TYPES.PAYMENT_DUE
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
        type: NOTIFICATION_TYPES.APPOINTMENT
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