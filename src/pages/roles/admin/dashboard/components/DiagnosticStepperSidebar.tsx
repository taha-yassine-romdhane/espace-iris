import { cn } from "@/lib/utils";
import { PatientInfoCard } from "./PatientInfoCard";
import { CheckCircle2, Circle } from "lucide-react";

interface Step {
  id: number;
  name: string;
  description: string;
}

interface StepperSidebarProps {
  steps: ReadonlyArray<Step> | readonly {
    id: number;
    name: string;
    description: string;
  }[];
  currentStep: number;
   
  clientDetails: any | null;
  totalPrice?: string;
}

export function DiagnosticStepperSidebar({ 
  steps = [], 
  currentStep, 
  clientDetails,
  totalPrice 
}: StepperSidebarProps) {
  return (
    <div className="w-80 border-r flex-shrink-0 flex flex-col bg-gradient-to-b from-gray-50 to-white">
      <div className="p-5 flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
        {/* Patient Info Card - Show when a patient is selected */}
        {clientDetails && (
          <PatientInfoCard patient={clientDetails} />
        )}
        
        {/* Stepper */}
        <div className="relative space-y-6 mt-2">
          {steps?.map((step, index) => {
            const isActive = currentStep === step.id;
            const isCompleted = currentStep > step.id;
            
            return (
              <div key={step.id} className="relative">
                {/* Connecting line to previous step */}
                {index > 0 && (
                  <div
                    className={cn(
                      "absolute top-0 left-5 w-0.5",
                      "h-6 -translate-y-6", // Fixed height and position
                      isCompleted ? "bg-blue-600" : "bg-gray-200"
                    )}
                  />
                )}
                <div className="flex gap-4 relative">
                  <div className="flex-shrink-0 mt-0.5">
                    {isCompleted ? (
                      <CheckCircle2 className="h-10 w-10 text-blue-600 fill-blue-100" />
                    ) : isActive ? (
                      <div className="h-10 w-10 rounded-full border-2 border-blue-600 bg-blue-50 flex items-center justify-center text-blue-600 font-medium">
                        {step.id}
                      </div>
                    ) : (
                      <Circle className="h-10 w-10 text-gray-300" />
                    )}
                  </div>
                  <div className="space-y-1">
                    <h3
                      className={cn(
                        "font-medium",
                        isActive
                          ? "text-blue-600"
                          : isCompleted
                          ? "text-blue-700"
                          : "text-gray-400"
                      )}
                    >
                      {step.name}
                    </h3>
                    <p
                      className={cn(
                        "text-sm",
                        isActive || isCompleted
                          ? "text-gray-600"
                          : "text-gray-400"
                      )}
                    >
                      {step.description}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Total Price - Fixed at bottom */}
      {totalPrice && (
        <div className="p-4 border-t bg-gradient-to-r from-blue-50 to-indigo-50 sticky bottom-0">
          <div className="flex justify-between items-center">
            <div>
              <span className="text-sm text-gray-600">Montant Total</span>
              <div className="text-l font-bold text-blue-700">
                <p>Cette Operation est gratuit</p>
              </div>
            </div>
            <div className="bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-medium">
              En cours
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DiagnosticStepperSidebar;
