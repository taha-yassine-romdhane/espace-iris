import { DeviceStatus } from '@prisma/client';
import { CheckCircle, XCircle, Wrench, Archive, HelpCircle } from 'lucide-react';

export const getDeviceStatusInfo = (status: DeviceStatus | string | null) => {
  switch (status) {
    case DeviceStatus.ACTIVE:
      return { label: 'Disponible', color: 'text-green-600 bg-green-100', Icon: CheckCircle };
    case DeviceStatus.SOLD:
      return { label: 'Vendu', color: 'text-red-600 bg-red-100', Icon: XCircle };
    case DeviceStatus.MAINTENANCE:
      return { label: 'En maintenance', color: 'text-orange-600 bg-orange-100', Icon: Wrench };
    case DeviceStatus.RESERVED:
      return { label: 'Réservé', color: 'text-blue-600 bg-blue-100', Icon: Archive };
    case DeviceStatus.RETIRED:
      return { label: 'Retiré', color: 'text-gray-600 bg-gray-100', Icon: Archive };
    default:
      return { label: 'État inconnu', color: 'text-gray-500 bg-gray-200', Icon: HelpCircle };
  }
};
