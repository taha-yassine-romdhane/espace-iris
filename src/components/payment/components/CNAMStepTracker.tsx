import React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * Step interface for CNAM step tracker
 */
export interface CNAMStep {
  id: number;
  name: string;
  description: string;
  completed: boolean;
}

/**
 * Props for the CNAMStepTracker component
 */
export interface CNAMStepTrackerProps {
  steps: CNAMStep[];
  currentStep: number;
  onStepComplete: (stepId: number) => void;
}

/**
 * Component for tracking CNAM steps
 */
export const CNAMStepTracker: React.FC<CNAMStepTrackerProps> = ({ 
  steps, 
  currentStep, 
  onStepComplete 
}) => {
  return (
    <div className="mt-4 space-y-3">
      <h3 className="font-medium text-blue-900">Suivi du Dossier CNAM</h3>
      <div className="space-y-2">
        {steps.map((step) => (
          <div
            key={step.id}
            className={cn(
              "border rounded-lg p-3",
              step.completed ? "bg-green-50 border-green-200" :
                step.id === currentStep ? "bg-blue-50 border-blue-200" : ""
            )}
          >
            <div className="flex items-center gap-3">
              <div className={cn(
                "h-6 w-6 rounded-full flex items-center justify-center text-xs",
                step.completed ? "bg-green-500 text-white" :
                  step.id === currentStep ? "bg-blue-500 text-white" : "bg-gray-200"
              )}>
                {step.id}
              </div>
              <div>
                <div className="font-medium">{step.name}</div>
                <div className="text-sm text-gray-500">{step.description}</div>
              </div>
              {step.id === currentStep && !step.completed && (
                <Button
                  size="sm"
                  className="ml-auto"
                  onClick={() => onStepComplete(step.id)}
                >
                  Marquer comme terminé
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CNAMStepTracker;
