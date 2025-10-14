import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { AlertCircle, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useQuery, useMutation } from "@tanstack/react-query";

interface ParameterValue {
  id?: string;
  value: string;
  parameterId: string;
  medicalDeviceId: string;
}

interface Parameter {
  id?: string;
  title: string;
  type: 'INPUT' | 'CHECKBOX' | 'NUMBER' | 'RANGE' | 'DATE';
  unit?: string;
  minValue?: number;
  maxValue?: number;
  isRequired: boolean;
  isAutomatic?: boolean;
  value?: string;
  parameterType?: 'PARAMETER' | 'RESULT';
  resultDueDate?: string;
}

interface ParameterConsumerProps {
  deviceId: string;
  onSubmit: (parameters: Parameter[]) => void;
  initialValues?: Parameter[];
  patientId?: string;
}

export function ParameterConsumer({
  deviceId,
  onSubmit,
  initialValues = [],
  patientId
}: ParameterConsumerProps) {
  const [parameters, setParameters] = useState<Parameter[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Fetch parameters for the device
  const { data: fetchedParameters, isLoading: isFetching, error: fetchError } = useQuery({
    queryKey: ['diagnostic-parameters', deviceId],
    queryFn: async () => {
      const response = await fetch(`/api/diagnostic-parameters?deviceId=${deviceId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch parameters');
      }
      return response.json();
    },
    enabled: !!deviceId,
  });

  // Fetch existing parameter values
  const { data: existingValues, isLoading: isLoadingValues } = useQuery({
    queryKey: ['parameter-values', deviceId],
    queryFn: async () => {
      const response = await fetch(`/api/parameter-values?medicalDeviceId=${deviceId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch parameter values');
      }
      return response.json();
    },
    enabled: !!deviceId,
  });

  // Save parameter values mutation
  const { mutate: saveParameterValues, isPending: isSaving } = useMutation({
    mutationFn: async (paramValues: ParameterValue[]) => {
      const response = await fetch('/api/parameter-values', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ parameterValues: paramValues }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to save parameter values');
      }
      
      return response.json();
    },
    onSuccess: () => {
      // Call the onSubmit callback with updated parameters
      onSubmit(parameters);
    },
    onError: (error) => {
      setError(`Erreur lors de l'enregistrement des paramètres: ${error.message}`);
    }
  });

  // Initialize parameters with fetched data, existing values, or initial values
  useEffect(() => {
    if (fetchedParameters) {
      let mergedParameters = [...fetchedParameters];
      
      // First apply any existing values from the database
      if (existingValues && existingValues.length > 0) {
        mergedParameters = mergedParameters.map((param: Parameter) => {
          const existingValue = existingValues.find((v: ParameterValue) => v.parameterId === param.id);
          return existingValue ? { ...param, value: existingValue.value } : param;
        });
      }
      
      // Then apply any initial values passed to the component (from previous steps)
      if (initialValues && initialValues.length > 0) {
        mergedParameters = mergedParameters.map((param: Parameter) => {
          const initialParam = initialValues.find(p => p.id === param.id || p.title === param.title);
          return initialParam && initialParam.value ? { ...param, value: initialParam.value } : param;
        });
      }
      
      setParameters(mergedParameters);
    } else if (initialValues && initialValues.length > 0) {
      setParameters(initialValues);
    }
  }, [fetchedParameters, existingValues, initialValues]);

  const handleParameterValueChange = (index: number, value: string | number) => {
    const newParameters = [...parameters];
    newParameters[index].value = value.toString();
    setParameters(newParameters);
  };

  const handleSubmit = () => {
    // Only validate required fields for configuration parameters
    // Result parameters will be filled later
    const configParameters = parameters.filter(p => !p.parameterType || p.parameterType === 'PARAMETER');
    const missingRequiredFields = configParameters.filter(param => param.isRequired && !param.value);
    
    if (missingRequiredFields.length > 0) {
      setError(`Veuillez remplir tous les champs obligatoires (${missingRequiredFields.length})`);
      return;
    }
    
    // If we have a deviceId, save parameter values to the database
    if (deviceId) {
      // Only save values for configuration parameters, not result parameters
      const paramValues = parameters
        .filter(param => param.id && param.value && (!param.parameterType || param.parameterType === 'PARAMETER')) 
        .map(param => ({
          parameterId: param.id!,
          medicalDeviceId: deviceId,
          value: param.value!
        }));
      
      if (paramValues.length > 0) {
        saveParameterValues(paramValues);
      } else {
        // If no values to save, just call onSubmit with the parameters
        onSubmit(parameters);
      }
    } else {
      // If no deviceId, just call onSubmit with the parameters
      onSubmit(parameters);
    }
    
    // Create notifications for result parameters if they have a due date
    const resultParameters = parameters.filter(p => p.parameterType === 'RESULT' && p.resultDueDate);
    if (resultParameters.length > 0 && deviceId) {
      console.log('Creating notifications for result parameters:', resultParameters);
      
      // Create a notification and task for each result parameter
      resultParameters.forEach(async (param) => {
        if (!param.resultDueDate) return;
        
        try {
          // Get device information
          const deviceResponse = await fetch(`/api/medical-devices/${deviceId}`);
          const deviceData = await deviceResponse.json();
          
          // 1. Create notification
          const notificationResponse = await fetch('/api/notifications', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              title: `Résultat à obtenir: ${param.title}`,
              message: `Résultat à obtenir pour l'appareil ${deviceData?.name || 'diagnostic'} - Paramètre: ${param.title}`,
              type: 'FOLLOW_UP', // Use FOLLOW_UP type from the NotificationType enum
              status: 'PENDING',
              dueDate: param.resultDueDate,
              patientId: patientId, // Use the patientId passed as prop
              deviceId: deviceId,
              deviceName: deviceData?.name || 'Appareil médical',
              parameterId: param.id,
              parameterName: param.title,
              resultDueDate: param.resultDueDate
            }),
          });
          
          // 3. Update the device status to mark it as reserved for this patient until the result date
          if (patientId) {
            const updateDeviceResponse = await fetch(`/api/medical-devices/${deviceId}`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                patientId: patientId,
                location: 'PATIENT_HOME', // Indicate that the device is at the patient's home
                status: 'RESERVED', // Mark the device as reserved
                reservedUntil: param.resultDueDate // Reserve the device until the result date
              }),
            });
            
            if (!updateDeviceResponse.ok) {
              console.error('Failed to update device reservation status');
            } else {
              console.log('Device reserved for patient until result date:', param.resultDueDate);
            }
          }
          
          if (!notificationResponse.ok) {
            console.error('Failed to create notification for result parameter:', param.title);
          } else {
            console.log('Notification created for result parameter:', param.title);
          }
          
          // 2. Create task for the calendar
          const dueDate = new Date(param.resultDueDate);
          
          // Get patient details if we have a patientId
          let patientDetails = '';
          if (patientId) {
            try {
              // First try the new patient API endpoint
              let patientResponse = await fetch(`/api/patients/${patientId}`);
              
              // If that fails, try the clients API as fallback
              if (!patientResponse.ok) {
                console.log('Trying fallback client API for patient details');
                patientResponse = await fetch(`/api/clients?id=${patientId}`);
              }
              
              if (patientResponse.ok) {
                const patientData = await patientResponse.json();
                // Handle both single patient and array response formats
                const patient = Array.isArray(patientData) ? patientData[0] : patientData;
                
                if (patient) {
                  patientDetails = `\nPatient: ${patient.firstName} ${patient.lastName}\nTéléphone: ${patient.telephone || 'Non disponible'}`;
                } else {
                  patientDetails = `\nPatient ID: ${patientId} (Détails non disponibles)`;
                }
              } else {
                // If all APIs fail, at least include the ID
                patientDetails = `\nPatient ID: ${patientId}`;
              }
            } catch (error) {
              console.error('Error fetching patient details:', error);
              patientDetails = `\nPatient ID: ${patientId} (Erreur lors de la récupération des détails)`;
            }
          }
          
          // Create task with detailed information
          const taskResponse = await fetch('/api/tasks', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              title: `Résultat à obtenir: ${param.title}`,
              description: `Résultat à obtenir pour l'appareil ${deviceData?.name || 'diagnostic'}\nParamètre: ${param.title}${patientDetails}`,
              status: 'TODO',
              priority: 'MEDIUM',
              startDate: dueDate.toISOString(),
              endDate: new Date(dueDate.getTime() + (60 * 60 * 1000)).toISOString(), // End date is 1 hour after start date
            }),
          });
          
          if (!taskResponse.ok) {
            console.error('Failed to create task for result parameter:', param.title);
          } else {
            console.log('Task created for result parameter:', param.title);
          }
        } catch (error) {
          console.error('Error creating notification and task:', error);
        }
      });
    }

  };

  const renderParameterInput = (parameter: Parameter, index: number) => {
    const isRequired = parameter.isRequired;
    
    switch (parameter.type) {
      case 'CHECKBOX':
        return (
          <div className="flex items-center space-x-2">
            <Switch
              checked={parameter.value === 'true'}
              onCheckedChange={(checked) => 
                handleParameterValueChange(index, checked.toString())
              }
            />
            <Label>Oui</Label>
          </div>
        );
      case 'RANGE':
        return (
          <div className="w-full space-y-2">
            <div className="flex justify-between text-xs text-gray-500">
              <span>{parameter.minValue || 0}</span>
              <span>{parameter.unit}</span>
              <span>{parameter.maxValue || 100}</span>
            </div>
            <Slider
              min={parameter.minValue || 0}
              max={parameter.maxValue || 100}
              step={1}
              value={[parameter.value ? parseFloat(parameter.value) : parameter.minValue || 0]}
              onValueChange={(value) => handleParameterValueChange(index, value[0].toString())}
            />
            <div className="text-center text-sm font-medium">
              {parameter.value || parameter.minValue || 0} {parameter.unit}
            </div>
          </div>
        );
      case 'NUMBER':
        return (
          <div className="flex items-center space-x-2">
            <Input
              type="number"
              value={parameter.value || ''}
              min={parameter.minValue}
              max={parameter.maxValue}
              onChange={(e) => handleParameterValueChange(index, e.target.value)}
              placeholder={`Valeur${isRequired ? ' *' : ''}`}
              className={`flex-1 ${isRequired ? 'border-red-300' : ''}`}
            />
            {parameter.unit && (
              <span className="text-sm text-gray-500 min-w-[60px]">{parameter.unit}</span>
            )}
          </div>
        );
      case 'DATE':
        return (
          <div className="flex items-center space-x-2">
            <Input
              type="date"
              value={parameter.value || ''}
              onChange={(e) => handleParameterValueChange(index, e.target.value)}
              placeholder={`Date${isRequired ? ' *' : ''}`}
              className={`flex-1 ${isRequired ? 'border-red-300' : ''}`}
            />
          </div>
        );
      default:
        return (
          <Input
            type="text"
            value={parameter.value || ''}
            onChange={(e) => handleParameterValueChange(index, e.target.value)}
            placeholder={`Valeur${isRequired ? ' *' : ''}`}
            className={isRequired ? 'border-red-300' : ''}
          />
        );
    }
  };

  if (isFetching || isLoadingValues) {
    return (
      <div className="py-8 text-center flex flex-col items-center gap-2">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p>Chargement des paramètres...</p>
      </div>
    );
  }

  if (fetchError) {
    return (
      <Alert variant="destructive" className="mb-4">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Erreur lors du chargement des paramètres. Veuillez réessayer.
        </AlertDescription>
      </Alert>
    );
  }

  if (parameters.length === 0) {
    return (
      <div className="py-4 text-center text-gray-500">
        Aucun paramètre disponible pour ce dispositif.
      </div>
    );
  }

  // Separate parameters into configuration parameters and result parameters
  const configParameters = parameters.filter(p => !p.parameterType || p.parameterType === 'PARAMETER');
  const resultParameters = parameters.filter(p => p.parameterType === 'RESULT');
  
  // Log parameters to console for debugging
  console.log('All parameters:', parameters);
  console.log('Config parameters:', configParameters);
  console.log('Result parameters:', resultParameters);

  return (
    <div className="space-y-6">
      {/* Configuration Parameters Section */}
      {configParameters.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <h3 className="text-lg font-medium">Paramètres de Configuration</h3>
            <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full font-medium">Configuration</span>
          </div>
          <div className="space-y-4">
            {configParameters.map((parameter, index) => (
              <div key={index} className="p-4 border border-blue-200 rounded-md bg-blue-50">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="font-medium flex items-center">
                      {parameter.title}
                      {parameter.isRequired && <span className="text-red-500 ml-1">*</span>}
                    </h4>
                    {parameter.unit && (
                      <p className="text-sm text-gray-500">Unité: {parameter.unit}</p>
                    )}
                  </div>
                  <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">Config</span>
                </div>
                {renderParameterInput(parameter, parameters.indexOf(parameter))}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Result Parameters Section */}
      {resultParameters.length > 0 && (
        <div className="mt-8">
          <div className="flex items-center gap-2 mb-4">
            <h3 className="text-lg font-medium">Résultats à Obtenir</h3>
            <span className="px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded-full font-medium">Résultats</span>
          </div>
          <div className="space-y-4">
            {resultParameters.map((parameter, index) => {
              // Format the due date for display
              const dueDate = parameter.resultDueDate ? new Date(parameter.resultDueDate) : null;
              const formattedDueDate = dueDate ? dueDate.toLocaleDateString('fr-FR') : '';
              const isPastDue = dueDate ? new Date() > dueDate : false;
              
              return (
                <div key={index} className="p-4 border border-purple-200 rounded-md bg-purple-50">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-medium flex items-center">
                        {parameter.title}
                        {parameter.isRequired && <span className="text-red-500 ml-1">*</span>}
                      </h4>
                      {parameter.unit && (
                        <p className="text-sm text-gray-500">Unité: {parameter.unit}</p>
                      )}
                      {parameter.resultDueDate && (
                        <div className="mt-1">
                          <p className="text-sm font-medium flex items-center">
                            <span className={`mr-1 ${isPastDue ? 'text-red-600' : 'text-amber-600'}`}>
                              {isPastDue ? '⚠️ Résultat en retard' : '⏱️ Résultat à venir'}
                            </span>
                          </p>
                          <p className="text-sm text-gray-500">Date prévue: {formattedDueDate}</p>
                          <p className="text-xs text-gray-500 mt-1 italic">
                            Les résultats seront à remplir à cette date et généreront une tâche dans le calendrier
                          </p>
                        </div>
                      )}
                    </div>
                    <span className="px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded-full">Résultat</span>
                  </div>
                  
                  {/* Disable input for result parameters during initial configuration */}
                  <div className="opacity-50 pointer-events-none">
                    {renderParameterInput(parameter, parameters.indexOf(parameter))}
                  </div>
                  <div className="mt-2 text-xs text-gray-500 bg-gray-100 p-2 rounded">
                    Ce résultat sera à remplir ultérieurement. Une tâche sera créée dans le calendrier.
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="pt-4 flex justify-end">
        <Button 
          onClick={handleSubmit} 
          className="bg-[#1e3a8a] hover:bg-[#1e3a8a]/90"
          disabled={isSaving}
        >
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Enregistrement...
            </>
          ) : (
            'Sauvegarder les paramètres'
          )}
        </Button>
      </div>
    </div>
  );
}

export default ParameterConsumer;

