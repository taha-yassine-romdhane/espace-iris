import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface PaymentTypeCardProps {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  isActive: boolean;
  onClick: () => void;
}

export function PaymentTypeCard({ 
  id, 
  title, 
  description, 
  icon: Icon, 
  isActive, 
  onClick 
}: PaymentTypeCardProps) {
  return (
    <Card 
      className={cn(
        "p-4 cursor-pointer transition-all hover:shadow-md hover:border-blue-200",
        isActive ? "ring-2 ring-blue-500 border-blue-200" : ""
      )}
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        <div className="mt-1 p-2 rounded-full bg-blue-100 text-blue-600">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <h4 className="font-medium text-blue-900">{title}</h4>
          <p className="text-sm text-gray-500 mt-1">{description}</p>
        </div>
      </div>
    </Card>
  );
}

export default PaymentTypeCard;
