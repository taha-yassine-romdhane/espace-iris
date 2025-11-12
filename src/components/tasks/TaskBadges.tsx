import React from 'react';
import { Badge } from '@/components/ui/badge';
import { PRIORITY_CONFIG, STATUS_CONFIG, TaskPriority, TaskStatus } from '@/lib/taskConstants';

interface PriorityBadgeProps {
  priority: TaskPriority;
}

export const PriorityBadge: React.FC<PriorityBadgeProps> = ({ priority }) => {
  const config = PRIORITY_CONFIG[priority];
  if (!config) return null;

  return (
    <Badge className={config.className}>
      {config.label}
    </Badge>
  );
};

interface StatusBadgeProps {
  status: TaskStatus;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const config = STATUS_CONFIG[status];
  if (!config) return null;

  return (
    <Badge className={config.className}>
      {config.label}
    </Badge>
  );
};
