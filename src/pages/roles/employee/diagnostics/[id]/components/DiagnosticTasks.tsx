import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckSquare, Calendar, Clock, User, AlertCircle, CheckCircle } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/use-toast";
import { AddTaskButton } from "@/components/tasks/AddTaskButton";

interface DiagnosticTasksProps {
  diagnosticId: string;
  resultDueDate: string | null;
  patientId: string | null;
}

export function DiagnosticTasks({ diagnosticId, resultDueDate, patientId }: DiagnosticTasksProps) {
  const queryClient = useQueryClient();

  // Fetch tasks related to this diagnostic
  const { data: tasks, isLoading } = useQuery({
    queryKey: ["diagnostic-tasks", diagnosticId],
    queryFn: async () => {
      const response = await fetch(`/api/tasks?diagnosticId=${diagnosticId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch tasks");
      }
      return response.json();
    },
  });

  // Mutation for completing a task
  const completeTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const response = await fetch(`/api/tasks/${taskId}/complete`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to complete task');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["diagnostic-tasks", diagnosticId] });
      toast({
        title: "Tâche complétée",
        description: "La tâche a été marquée comme complétée avec succès.",
        variant: "default",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erreur",
        description: error.message || "Une erreur s'est produite lors de la complétion de la tâche.",
        variant: "destructive",
      });
    },
  });

  // Format date
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    return format(new Date(dateString), "PPP", { locale: fr });
  };

  // Format time
  const formatTime = (dateString: string | null) => {
    if (!dateString) return "";
    return format(new Date(dateString), "HH:mm", { locale: fr });
  };

  // Check if a due date is overdue
  const isOverdue = (dateString: string | null) => {
    if (!dateString) return false;
    return new Date() > new Date(dateString);
  };

  // Check if a due date is today
  const isToday = (dateString: string | null) => {
    if (!dateString) return false;
    const today = new Date();
    const dueDate = new Date(dateString);
    return (
      dueDate.getDate() === today.getDate() &&
      dueDate.getMonth() === today.getMonth() &&
      dueDate.getFullYear() === today.getFullYear()
    );
  };

  // Handle task completion
  const handleCompleteTask = (taskId: string) => {
    completeTaskMutation.mutate(taskId);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="bg-gray-50 border-b border-gray-100">
          <CardTitle className="text-lg flex items-center gap-2">
            <CheckSquare className="h-5 w-5 text-blue-600" />
            Tâches associées
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex justify-center items-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-900"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="bg-gray-50 border-b border-gray-100 flex flex-row items-center justify-between">
        <CardTitle className="text-lg flex items-center gap-2">
          <CheckSquare className="h-5 w-5 text-blue-600" />
          Tâches associées
        </CardTitle>
        
        <AddTaskButton 
          onClick={() => {}}
          variant="outline"
          size="sm"
          preselectedPatientId={patientId}
          preselectedDueDate={resultDueDate}
          diagnosticId={diagnosticId}
          onTaskCreated={() => {
            queryClient.invalidateQueries({ queryKey: ["diagnostic-tasks", diagnosticId] });
          }}
        />
      </CardHeader>
      
      <CardContent className="p-6">
        {!tasks || tasks.length === 0 ? (
          <div className="text-gray-500 italic">Aucune tâche associée à ce diagnostic</div>
        ) : (
          <div className="space-y-4">
            {tasks.map((task: any) => {
              const taskOverdue = isOverdue(task.dueDate);
              const taskDueToday = isToday(task.dueDate);
              
              return (
                <div 
                  key={task.id} 
                  className={`p-4 rounded-lg border ${
                    task.status === 'COMPLETED' 
                      ? 'border-green-200 bg-green-50/50' 
                      : taskOverdue 
                        ? 'border-red-200 bg-red-50/50' 
                        : taskDueToday 
                          ? 'border-yellow-200 bg-yellow-50/50' 
                          : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-gray-900">{task.title}</h3>
                        <Badge 
                          variant="outline" 
                          className={
                            task.status === 'COMPLETED' 
                              ? 'bg-green-100 text-green-800 border-green-200' 
                              : task.status === 'IN_PROGRESS' 
                                ? 'bg-blue-100 text-blue-800 border-blue-200' 
                                : 'bg-gray-100 text-gray-800 border-gray-200'
                          }
                        >
                          {task.status === 'COMPLETED' ? 'Complété' : task.status === 'IN_PROGRESS' ? 'En cours' : 'À faire'}
                        </Badge>
                        
                        {task.priority === 'HIGH' && (
                          <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200">
                            Priorité haute
                          </Badge>
                        )}
                      </div>
                      
                      {task.description && (
                        <p className="text-gray-700 text-sm mt-1">{task.description}</p>
                      )}
                      
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-3 text-sm">
                        {task.dueDate && (
                          <div className="flex items-center gap-1 text-gray-600">
                            <Calendar className="h-4 w-4" />
                            <span>{formatDate(task.dueDate)}</span>
                            {formatTime(task.dueDate) && (
                              <>
                                <span className="mx-1">à</span>
                                <Clock className="h-4 w-4" />
                                <span>{formatTime(task.dueDate)}</span>
                              </>
                            )}
                          </div>
                        )}
                        
                        {task.assignedTo && (
                          <div className="flex items-center gap-1 text-gray-600">
                            <User className="h-4 w-4" />
                            <span>Assigné à: {task.assignedTo.name}</span>
                          </div>
                        )}
                      </div>
                      
                      {taskOverdue && task.status !== 'COMPLETED' && (
                        <div className="flex items-center text-red-600 mt-2">
                          <AlertCircle className="h-4 w-4 mr-1" />
                          <span className="text-sm">En retard</span>
                        </div>
                      )}
                      
                      {task.completedAt && (
                        <div className="flex items-center text-green-600 mt-2">
                          <CheckCircle className="h-4 w-4 mr-1" />
                          <span className="text-sm">Complété le {formatDate(task.completedAt)}</span>
                        </div>
                      )}
                    </div>
                    
                    {task.status !== 'COMPLETED' && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="flex items-center gap-1"
                        onClick={() => handleCompleteTask(task.id)}
                        disabled={completeTaskMutation.isPending}
                      >
                        <CheckCircle className="h-4 w-4" />
                        <span>Compléter</span>
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default DiagnosticTasks;
