import React from 'react';
import { AlertTriangle, ArrowLeft, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import ErrorBoundary from './ErrorBoundary';

interface StepperErrorBoundaryProps {
  children: React.ReactNode;
  onReset?: () => void;
  onGoBack?: () => void;
  stepperType?: 'sale' | 'rental' | 'diagnostic' | 'appointment';
}

const StepperErrorFallback: React.FC<{
  onReset?: () => void;
  onGoBack?: () => void;
  stepperType?: string;
}> = ({ onReset, onGoBack, stepperType = 'processus' }) => {
  const getStepperDisplayName = (type: string) => {
    switch (type) {
      case 'sale': return 'vente';
      case 'rental': return 'location';
      case 'diagnostic': return 'diagnostic';
      case 'appointment': return 'rendez-vous';
      default: return 'processus';
    }
  };

  const displayName = getStepperDisplayName(stepperType);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <Card className="max-w-md w-full border-amber-200 bg-amber-50">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <AlertTriangle className="h-16 w-16 text-amber-500" />
          </div>
          <CardTitle className="text-amber-800 text-xl">
            Erreur dans le {displayName}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center">
            <p className="text-gray-700 mb-2">
              Une erreur s'est produite lors du {displayName}.
            </p>
            <p className="text-sm text-gray-600">
              Vos données sont sauvegardées automatiquement. Vous pouvez reprendre où vous vous êtes arrêté.
            </p>
          </div>

          <div className="space-y-3">
            {onReset && (
              <Button
                onClick={onReset}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                Recommencer le {displayName}
              </Button>
            )}
            
            {onGoBack && (
              <Button
                onClick={onGoBack}
                variant="outline"
                className="w-full flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Retour à l'étape précédente
              </Button>
            )}
            
            <Button
              onClick={() => window.location.href = '/roles/admin/dashboard'}
              variant="outline"
              className="w-full flex items-center gap-2"
            >
              <Home className="h-4 w-4" />
              Retour au tableau de bord
            </Button>
          </div>

          <div className="text-xs text-gray-500 text-center border-t pt-4">
            <p>Si le problème persiste, contactez l'équipe technique.</p>
            <p>Code d'erreur: STEPPER_ERROR_{Date.now()}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const StepperErrorBoundary: React.FC<StepperErrorBoundaryProps> = ({
  children,
  onReset,
  onGoBack,
  stepperType,
}) => {
  const handleError = (error: Error, errorInfo: React.ErrorInfo) => {
    // Log stepper-specific error information
    console.error(`Stepper Error (${stepperType}):`, {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      stepperType,
    });

    // In production, you might want to send this to an error tracking service
    if (process.env.NODE_ENV === 'production') {
      // Example: sendErrorToService({ error, errorInfo, stepperType })
    }
  };

  return (
    <ErrorBoundary
      onError={handleError}
      fallback={
        <StepperErrorFallback
          onReset={onReset}
          onGoBack={onGoBack}
          stepperType={stepperType}
        />
      }
    >
      {children}
    </ErrorBoundary>
  );
};

export default StepperErrorBoundary;