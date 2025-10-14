import React from 'react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

/**
 * Props for the PaymentTypeCard component
 */
export interface PaymentTypeCardProps {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  isActive: boolean;
  onClick: () => void;
}

/**
 * Component for displaying a payment type card
 */
export const PaymentTypeCard: React.FC<PaymentTypeCardProps> = ({
  id,
  title,
  description,
  icon: Icon,
  isActive,
  onClick
}) => {
  return (
    <Card
      className={cn(
        "p-4 cursor-pointer transition-all hover:shadow-md hover:border-blue-200",
        isActive ? "ring-2 ring-blue-500 border-blue-200" : ""
      )}
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        <div className={cn(
          "p-2 rounded-md",
          isActive ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"
        )}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <h3 className="font-medium">{title}</h3>
          <p className="text-sm text-gray-500">{description}</p>
        </div>
      </div>
    </Card>
  );
};

export default PaymentTypeCard;
