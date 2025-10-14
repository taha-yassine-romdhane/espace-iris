import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ClipboardList, Save, CheckCircle, Clock, Settings } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/use-toast";

interface DiagnosticResultsFormProps {
  diagnosticResult: {
    id: string;
    iah: number | null;
    idValue: number | null;
    remarque: string | null;
    status: string;
  } | null;
  status: string;
  diagnosticId: string;
  resultDueDate?: Date | null;
}

export function DiagnosticResultsForm({ 
  diagnosticResult, 
  status, 
  diagnosticId, 
  resultDueDate 
}: DiagnosticResultsFormProps) {
  // State for the diagnostic result values
  const [resultValues, setResultValues] = useState({
    iah: diagnosticResult?.iah !== null ? String(diagnosticResult?.iah) : '',
    idValue: diagnosticResult?.idValue !== null ? String(diagnosticResult?.idValue) : '',
    remarque: diagnosticResult?.remarque || '',
    status: diagnosticResult?.status || 'PENDING'
  });
  const [isEditing, setIsEditing] = useState(false);
  const queryClient = useQueryClient();

  // Initialize result values from existing data
  useEffect(() => {
    if (diagnosticResult) {
      setResultValues({
        iah: diagnosticResult.iah !== null ? String(diagnosticResult.iah) : '',
        idValue: diagnosticResult.idValue !== null ? String(diagnosticResult.idValue) : '',
        remarque: diagnosticResult.remarque || '',
        status: diagnosticResult.status || 'PENDING'
      });
    }
  }, [diagnosticResult]);
  
  // Mutation for saving diagnostic result values
  const saveResultMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch(`/api/diagnostic-results/${diagnosticResult?.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save diagnostic result');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['diagnostic', diagnosticId] });
      setIsEditing(false);
      toast({
        title: "Résultats enregistrés",
        description: "Les résultats du diagnostic ont été mis à jour avec succès.",
        variant: "default",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erreur",
        description: error.message || "Une erreur s'est produite lors de l'enregistrement des résultats.",
        variant: "destructive",
      });
    },
  });

  // Handle result value change
  const handleResultChange = (field: keyof typeof resultValues, value: string) => {
    setResultValues(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  // Handle save results
  const handleSaveResults = () => {
    // Convert string values to appropriate types
    const resultData = {
      iah: resultValues.iah ? parseFloat(resultValues.iah) : null,
      idValue: resultValues.idValue ? parseFloat(resultValues.idValue) : null,
      remarque: resultValues.remarque || null,
      status: 'COMPLETED', // Mark as completed when saving results
    };
    
    saveResultMutation.mutate(resultData);
  };

  // Define our fixed diagnostic result parameters
  const resultParams = [
    {
      id: 'iah' as const,
      title: 'IAH',
      description: 'Indice d\'apnée-hypopnée',
      type: 'NUMBER',
      unit: 'événements/heure',
      minValue: 0,
      maxValue: 30,
      resultRequired: true
    },
    {
      id: 'idValue' as const,
      title: 'ID',
      description: 'Indice de désaturation',
      type: 'NUMBER',
      unit: 'événements/heure',
      minValue: 0,
      maxValue: 30,
      resultRequired: true
    },
    {
      id: 'remarque' as const,
      title: 'Remarque',
      description: 'Observations et notes complémentaires',
      type: 'TEXT',
      resultRequired: false
    }
  ];

  // Check if there are any parameters that need results
  const hasResultsToFill = resultParams.some(p => !resultValues[p.id] || resultValues[p.id] === '');

  if (!diagnosticResult) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            Résultats du diagnostic
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            Aucun résultat disponible pour ce diagnostic.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="bg-gray-50 border-b border-gray-100">
        <CardTitle className="text-lg flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-blue-600" />
          Résultats du diagnostic
          <Badge variant="outline" className={`ml-2 ${status === 'COMPLETED' ? 'bg-green-100 text-green-800 border-green-200' : ''}`}>
            {status === 'COMPLETED' ? 'Complété' : 'En attente'}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-6">
          {/* Actions */}
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-500">
              {hasResultsToFill ? (
                <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200">
                  <Clock className="h-3 w-3 mr-1" />
                  Résultats à compléter
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Tous les résultats sont renseignés
                </Badge>
              )}
            </div>
            
            <div>
              {isEditing ? (
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setIsEditing(false)}
                    disabled={saveResultMutation.isPending}
                  >
                    Annuler
                  </Button>
                  <Button 
                    variant="default" 
                    size="sm" 
                    onClick={handleSaveResults}
                    disabled={saveResultMutation.isPending}
                  >
                    {saveResultMutation.isPending ? (
                      <>
                        <span className="animate-spin mr-2">⏳</span>
                        Enregistrement...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Enregistrer
                      </>
                    )}
                  </Button>
                </div>
              ) : (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setIsEditing(true)}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Modifier les résultats
                </Button>
              )}
            </div>
          </div>

          {/* Result Parameters */}
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
            <h3 className="text-sm font-medium mb-3 text-blue-800">Résultats à collecter</h3>
            <div className="space-y-3">
              {resultParams.map((param) => {
                // Get the current value from our state
                const currentValue = resultValues[param.id];
                
                // Calculate due date if available
                const dueDate = resultDueDate ? new Date(resultDueDate) : null;
                const now = new Date();
                const isDue = dueDate ? dueDate < now : false;
                
                return (
                  <div key={param.id} className="bg-white rounded-md p-4 border border-gray-100">
                    <div className="flex flex-col md:flex-row gap-4">
                      <div className="flex-1">
                        <div className="flex flex-col space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="font-medium">{param.title || 'Résultat'}</div>
                            
                            {/* Status badges */}
                            <div className="flex gap-1">
                              {!currentValue ? (
                                <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200 text-xs flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  Résultat à compléter
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200 text-xs flex items-center gap-1">
                                  <CheckCircle className="h-3 w-3" />
                                  Résultat renseigné
                                </Badge>
                              )}
                              
                              {dueDate && (
                                <Badge variant="outline" className={`${isDue ? 'bg-red-100 text-red-800 border-red-200' : 'bg-gray-100 text-gray-800 border-gray-200'} text-xs`}>
                                  {isDue ? 'En retard' : 'À collecter'}: {dueDate.toLocaleDateString()}
                                </Badge>
                              )}
                            </div>
                          </div>
                          
                          {/* Description */}
                          {param.description && (
                            <div className="text-sm text-gray-600">{param.description}</div>
                          )}
                          
                          {/* Unit information */}
                          {param.unit && (
                            <div className="text-xs text-gray-500 mt-1">
                              Unité: {param.unit}
                            </div>
                          )}
                          
                          {/* Normal range information */}
                          {(param.minValue !== undefined || param.maxValue !== undefined) && (
                            <div className="text-xs text-gray-500 mt-1">
                              Plage normale: 
                              {param.minValue !== undefined ? ` ${param.minValue}` : ' -'} 
                              {param.maxValue !== undefined ? ` à ${param.maxValue}` : ' et plus'}
                              {param.unit ? ` ${param.unit}` : ''}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="w-full mt-3">
                      {isEditing ? (
                        param.type === 'TEXT' ? (
                          <Textarea
                            value={resultValues[param.id]}
                            onChange={(e) => handleResultChange(param.id, e.target.value)}
                            placeholder="Entrez le résultat..."
                            className="w-full"
                          />
                        ) : (
                          <Input
                            type={param.type === 'NUMBER' ? 'number' : 'text'}
                            value={resultValues[param.id]}
                            onChange={(e) => handleResultChange(param.id, e.target.value)}
                            placeholder="Entrez le résultat..."
                            className="w-full"
                          />
                        )
                      ) : (
                        <div className={`border rounded-md p-3 min-h-[40px] ${currentValue ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                          {currentValue ? (
                            <div className="flex items-center gap-1">
                              <CheckCircle className="h-4 w-4 text-green-600" />
                              <span className="font-medium">
                                {currentValue} {param.unit}
                              </span>
                            </div>
                          ) : (
                            <div className="text-gray-500 italic text-sm">Résultat non renseigné</div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default DiagnosticResultsForm;
