import { Button, ButtonProps } from '@/components/ui/button';
import { Plus } from 'lucide-react';

interface AddTaskButtonProps extends ButtonProps {
  onClick: () => void;
  label?: string;
  showIcon?: boolean;
  variant?: 'default' | 'outline' | 'secondary';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  preselectedPatientId?: string | null;
  preselectedDueDate?: string | null;
  diagnosticId?: string;
  onTaskCreated?: () => void;
  className?: string;
}

export function AddTaskButton({
  onClick,
  label = 'Ajout tâche',
  showIcon = true,
  variant = 'default',
  size = 'default',
  className,
  ...props
}: AddTaskButtonProps) {
  return (
    <Button 
      onClick={onClick} 
      variant={variant} 
      size={size}
      className={className}
      {...props}
    >
      {showIcon && <Plus className="h-4 w-4 mr-2" />}
      {label}
    </Button>
  );
}
