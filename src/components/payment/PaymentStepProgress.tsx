import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PaymentStep {
  id: string;
  label: string;
  description: string;
  completed: boolean;
}

interface PaymentStepProgressProps {
  steps: PaymentStep[];
  onStepComplete: (stepId: string) => void;
}

export function PaymentStepProgress({ steps, onStepComplete }: PaymentStepProgressProps) {
  // Find the first not completed step
  const currentStepIndex = steps.findIndex(step => !step.completed);
  const completedCount = steps.filter(step => step.completed).length;
  
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        {steps.map((step, index) => {
          const isActive = index === currentStepIndex;
          const completed = step.completed;
          
          return (
            <div 
              key={step.id} 
              className={cn(
                "rounded-lg p-3 border transition-all",
                completed ? "bg-green-50 border-green-200" : 
                isActive ? "bg-blue-50 border-blue-200" : 
                "bg-gray-50 border-gray-200"
              )}
            >
              <div className="flex items-center gap-2">
                <div className={cn(
                  "h-7 w-7 rounded-full flex items-center justify-center",
                  completed ? "bg-green-500 text-white" : 
                  isActive ? "bg-blue-500 text-white" : 
                  "bg-gray-300 text-white"
                )}>
                  {completed ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <span className="text-xs font-medium">{index + 1}</span>
                  )}
                </div>
                <div>
                  <p className={cn(
                    "font-medium text-sm",
                    completed ? "text-green-700" : 
                    isActive ? "text-blue-700" : 
                    "text-gray-500"
                  )}>
                    {step.label}
                  </p>
                  <p className="text-xs text-gray-500">{step.description}</p>
                </div>
              </div>
              
              {isActive && !completed && (
                <Button
                  size="sm"
                  className="mt-2 w-full bg-blue-500 hover:bg-blue-600 text-white"
                  onClick={() => onStepComplete(step.id)}
                >
                  Marquer comme complété
                </Button>
              )}
            </div>
          );
        })}
      </div>
      
      {/* Progress Bar */}
      <div className="mt-6 space-y-2">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>Progression</span>
          <span>
            {completedCount} / {steps.length}
          </span>
        </div>
        <Progress 
          value={(completedCount / steps.length) * 100} 
          className="h-2"
        />
      </div>
    </div>
  );
}

export default PaymentStepProgress;
