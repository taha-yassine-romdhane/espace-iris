// Notification Types
export const NOTIFICATION_TYPES = {
  FOLLOW_UP: 'FOLLOW_UP',
  MAINTENANCE: 'MAINTENANCE',
  APPOINTMENT: 'APPOINTMENT',
  PAYMENT_DUE: 'PAYMENT_DUE',
  RENTAL_EXPIRING: 'RENTAL_EXPIRING',
  RENTAL_RETURN: 'RENTAL_RETURN',
  SALE_COMPLETED: 'SALE_COMPLETED',
  TASK_ASSIGNED: 'TASK_ASSIGNED',
  TASK_COMPLETED: 'TASK_COMPLETED',
  STOCK_LOW: 'STOCK_LOW',
  TRANSFER: 'TRANSFER',
  TRANSFER_APPROVED: 'TRANSFER_APPROVED',
  TRANSFER_REJECTED: 'TRANSFER_REJECTED',
  CNAM_RENEWAL: 'CNAM_RENEWAL',
  DIAGNOSTIC_PENDING: 'DIAGNOSTIC_PENDING',
  OTHER: 'OTHER',
} as const;

export type NotificationType = typeof NOTIFICATION_TYPES[keyof typeof NOTIFICATION_TYPES];

// Notification Status
export const NOTIFICATION_STATUS = {
  PENDING: 'PENDING',
  COMPLETED: 'COMPLETED',
  DISMISSED: 'DISMISSED',
  READ: 'READ',
} as const;

export type NotificationStatus = typeof NOTIFICATION_STATUS[keyof typeof NOTIFICATION_STATUS];

// Notification Priority
export const NOTIFICATION_PRIORITY = {
  LOW: 'LOW',
  NORMAL: 'NORMAL',
  HIGH: 'HIGH',
  URGENT: 'URGENT',
} as const;

export type NotificationPriority = typeof NOTIFICATION_PRIORITY[keyof typeof NOTIFICATION_PRIORITY];

// Notification Type Labels (French)
export const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  [NOTIFICATION_TYPES.FOLLOW_UP]: 'Suivi',
  [NOTIFICATION_TYPES.MAINTENANCE]: 'Maintenance',
  [NOTIFICATION_TYPES.APPOINTMENT]: 'Rendez-vous',
  [NOTIFICATION_TYPES.PAYMENT_DUE]: 'Paiement en retard',
  [NOTIFICATION_TYPES.RENTAL_EXPIRING]: 'Location expirante',
  [NOTIFICATION_TYPES.RENTAL_RETURN]: 'Retour de location',
  [NOTIFICATION_TYPES.SALE_COMPLETED]: 'Vente terminée',
  [NOTIFICATION_TYPES.TASK_ASSIGNED]: 'Tâche assignée',
  [NOTIFICATION_TYPES.TASK_COMPLETED]: 'Tâche terminée',
  [NOTIFICATION_TYPES.STOCK_LOW]: 'Stock faible',
  [NOTIFICATION_TYPES.TRANSFER]: 'Transfert',
  [NOTIFICATION_TYPES.TRANSFER_APPROVED]: 'Transfert approuvé',
  [NOTIFICATION_TYPES.TRANSFER_REJECTED]: 'Transfert rejeté',
  [NOTIFICATION_TYPES.CNAM_RENEWAL]: 'Renouvellement CNAM',
  [NOTIFICATION_TYPES.DIAGNOSTIC_PENDING]: 'Diagnostic en attente',
  [NOTIFICATION_TYPES.OTHER]: 'Autre',
};

// Status Labels (French)
export const NOTIFICATION_STATUS_LABELS: Record<NotificationStatus, string> = {
  [NOTIFICATION_STATUS.PENDING]: 'En attente',
  [NOTIFICATION_STATUS.COMPLETED]: 'Terminé',
  [NOTIFICATION_STATUS.DISMISSED]: 'Ignoré',
  [NOTIFICATION_STATUS.READ]: 'Lu',
};

// Priority Labels (French)
export const NOTIFICATION_PRIORITY_LABELS: Record<NotificationPriority, string> = {
  [NOTIFICATION_PRIORITY.LOW]: 'Faible',
  [NOTIFICATION_PRIORITY.NORMAL]: 'Normal',
  [NOTIFICATION_PRIORITY.HIGH]: 'Élevée',
  [NOTIFICATION_PRIORITY.URGENT]: 'Urgent',
};

// Priority Colors (Tailwind classes)
export const NOTIFICATION_PRIORITY_COLORS: Record<NotificationPriority, string> = {
  [NOTIFICATION_PRIORITY.LOW]: 'bg-gray-100 text-gray-800',
  [NOTIFICATION_PRIORITY.NORMAL]: 'bg-blue-100 text-blue-800',
  [NOTIFICATION_PRIORITY.HIGH]: 'bg-orange-100 text-orange-800',
  [NOTIFICATION_PRIORITY.URGENT]: 'bg-red-100 text-red-800',
};

// Type Icons (Lucide icon names)
export const NOTIFICATION_TYPE_ICONS: Record<NotificationType, string> = {
  [NOTIFICATION_TYPES.FOLLOW_UP]: 'ClipboardList',
  [NOTIFICATION_TYPES.MAINTENANCE]: 'Wrench',
  [NOTIFICATION_TYPES.APPOINTMENT]: 'Calendar',
  [NOTIFICATION_TYPES.PAYMENT_DUE]: 'CreditCard',
  [NOTIFICATION_TYPES.RENTAL_EXPIRING]: 'Clock',
  [NOTIFICATION_TYPES.RENTAL_RETURN]: 'PackageCheck',
  [NOTIFICATION_TYPES.SALE_COMPLETED]: 'ShoppingCart',
  [NOTIFICATION_TYPES.TASK_ASSIGNED]: 'UserCheck',
  [NOTIFICATION_TYPES.TASK_COMPLETED]: 'CheckCircle',
  [NOTIFICATION_TYPES.STOCK_LOW]: 'AlertTriangle',
  [NOTIFICATION_TYPES.TRANSFER]: 'ArrowRightLeft',
  [NOTIFICATION_TYPES.TRANSFER_APPROVED]: 'CheckCircle2',
  [NOTIFICATION_TYPES.TRANSFER_REJECTED]: 'XCircle',
  [NOTIFICATION_TYPES.CNAM_RENEWAL]: 'FileText',
  [NOTIFICATION_TYPES.DIAGNOSTIC_PENDING]: 'Stethoscope',
  [NOTIFICATION_TYPES.OTHER]: 'Bell',
};

// Validation functions
export function isValidNotificationType(type: string): type is NotificationType {
  return Object.values(NOTIFICATION_TYPES).includes(type as NotificationType);
}

export function isValidNotificationStatus(status: string): status is NotificationStatus {
  return Object.values(NOTIFICATION_STATUS).includes(status as NotificationStatus);
}

export function isValidNotificationPriority(priority: string): priority is NotificationPriority {
  return Object.values(NOTIFICATION_PRIORITY).includes(priority as NotificationPriority);
}

// Calculate priority based on due date
export function calculatePriority(dueDate?: Date | null): NotificationPriority {
  if (!dueDate) return NOTIFICATION_PRIORITY.NORMAL;

  const now = new Date();
  const timeDiff = dueDate.getTime() - now.getTime();
  const daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

  if (daysDiff < 0) {
    // Overdue
    return NOTIFICATION_PRIORITY.URGENT;
  } else if (daysDiff <= 3) {
    // Due within 3 days
    return NOTIFICATION_PRIORITY.HIGH;
  } else if (daysDiff <= 7) {
    // Due within a week
    return NOTIFICATION_PRIORITY.NORMAL;
  } else {
    // Due later
    return NOTIFICATION_PRIORITY.LOW;
  }
}

// Generate action URL based on notification type and IDs
export function generateActionUrl(
  type: NotificationType,
  role: 'ADMIN' | 'EMPLOYEE',
  ids: {
    rentalId?: string;
    saleId?: string;
    diagnosticId?: string;
    appointmentId?: string;
    manualTaskId?: string;
    paymentId?: string;
    patientId?: string;
    stockTransferRequestId?: string;
  }
): string {
  const baseUrl = `/roles/${role.toLowerCase()}`;

  switch (type) {
    case NOTIFICATION_TYPES.RENTAL_EXPIRING:
    case NOTIFICATION_TYPES.RENTAL_RETURN:
      if (ids.rentalId) return `${baseUrl}/location/${ids.rentalId}`;
      if (ids.patientId) return `${baseUrl}/renseignement/patient/${ids.patientId}`;
      return `${baseUrl}/location`;

    case NOTIFICATION_TYPES.SALE_COMPLETED:
      if (ids.saleId) return `${baseUrl}/sales/${ids.saleId}`;
      if (ids.patientId) return `${baseUrl}/renseignement/patient/${ids.patientId}`;
      return `${baseUrl}/sales`;

    case NOTIFICATION_TYPES.DIAGNOSTIC_PENDING:
      if (ids.diagnosticId) return `${baseUrl}/diagnostics/${ids.diagnosticId}`;
      if (ids.patientId) return `${baseUrl}/renseignement/patient/${ids.patientId}`;
      return `${baseUrl}/diagnostics`;

    case NOTIFICATION_TYPES.APPOINTMENT:
      if (ids.appointmentId) return `${baseUrl}/appointments/${ids.appointmentId}`;
      if (ids.patientId) return `${baseUrl}/renseignement/patient/${ids.patientId}`;
      return `${baseUrl}/appointments`;

    case NOTIFICATION_TYPES.TASK_ASSIGNED:
    case NOTIFICATION_TYPES.TASK_COMPLETED:
      if (ids.patientId) return `${baseUrl}/renseignement/patient/${ids.patientId}`;
      return `${baseUrl}/manual-tasks`;

    case NOTIFICATION_TYPES.PAYMENT_DUE:
      if (ids.paymentId && ids.rentalId) return `${baseUrl}/location/${ids.rentalId}`;
      if (ids.patientId) return `${baseUrl}/renseignement/patient/${ids.patientId}`;
      return `${baseUrl}/location`;

    case NOTIFICATION_TYPES.TRANSFER:
    case NOTIFICATION_TYPES.TRANSFER_APPROVED:
    case NOTIFICATION_TYPES.TRANSFER_REJECTED:
      if (ids.stockTransferRequestId) return `${baseUrl}/stock#transfers`;
      return `${baseUrl}/stock`;

    case NOTIFICATION_TYPES.STOCK_LOW:
      return `${baseUrl}/stock`;

    case NOTIFICATION_TYPES.CNAM_RENEWAL:
      if (ids.patientId) return `${baseUrl}/renseignement/patient/${ids.patientId}`;
      return `${baseUrl}/sales`;

    case NOTIFICATION_TYPES.MAINTENANCE:
    case NOTIFICATION_TYPES.FOLLOW_UP:
      if (ids.patientId) return `${baseUrl}/renseignement/patient/${ids.patientId}`;
      return `${baseUrl}/dashboard`;

    default:
      return `${baseUrl}/notifications`;
  }
}
