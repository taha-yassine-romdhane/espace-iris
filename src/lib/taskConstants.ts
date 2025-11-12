import {
  Activity, Calendar, CreditCard, Stethoscope,
  Building2, FileText
} from 'lucide-react';

// Time constants for task status calculation (in days)
export const TASK_TIME_CONSTANTS = {
  DIAGNOSTIC_PENDING: {
    DUE_DAYS: 3,
    WARNING_DAYS: 3,
    URGENT_DAYS: 7,
  },
  RENTAL_EXPIRING: {
    WARNING_DAYS: 7,
    NOTICE_DAYS: 15,
  },
  PAYMENT_DUE: {
    URGENT_DAYS: 7,
  },
  CNAM_RENEWAL: {
    WARNING_DAYS: 30,
  },
  DEFAULT_RANGE_DAYS: 30,
} as const;

// Task type configuration
export const TASK_TYPE_CONFIG = {
  TASK: {
    icon: Activity,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    label: 'Tâche'
  },
  DIAGNOSTIC_PENDING: {
    icon: Stethoscope,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    label: 'Diagnostic'
  },
  RENTAL_EXPIRING: {
    icon: Building2,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    label: 'Location'
  },
  PAYMENT_DUE: {
    icon: CreditCard,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    label: 'Paiement'
  },
  APPOINTMENT_REMINDER: {
    icon: Calendar,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    label: 'RDV'
  },
  CNAM_RENEWAL: {
    icon: FileText,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50',
    borderColor: 'border-indigo-200',
    label: 'CNAM'
  },
  MAINTENANCE_DUE: {
    icon: Activity,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    label: 'Maintenance'
  }
} as const;

// Priority and status configurations
export const PRIORITY_CONFIG = {
  URGENT: {
    label: 'Urgent!',
    className: 'bg-red-100 text-red-800 border-red-200 animate-pulse'
  },
  HIGH: {
    label: 'Haute',
    className: 'bg-orange-100 text-orange-800 border-orange-200'
  },
  MEDIUM: {
    label: 'Moyenne',
    className: 'bg-yellow-100 text-yellow-800 border-yellow-200'
  },
  LOW: {
    label: 'Basse',
    className: 'bg-green-100 text-green-800 border-green-200'
  }
} as const;

export const STATUS_CONFIG = {
  OVERDUE: {
    label: 'En retard',
    className: 'bg-red-100 text-red-800 border-red-200'
  },
  IN_PROGRESS: {
    label: 'En cours',
    className: 'bg-blue-100 text-blue-800 border-blue-200'
  },
  COMPLETED: {
    label: 'Terminé',
    className: 'bg-green-100 text-green-800 border-green-200'
  },
  TODO: {
    label: 'À faire',
    className: 'bg-gray-100 text-gray-800 border-gray-200'
  }
} as const;

export type TaskType = keyof typeof TASK_TYPE_CONFIG;
export type TaskPriority = keyof typeof PRIORITY_CONFIG;
export type TaskStatus = keyof typeof STATUS_CONFIG;
