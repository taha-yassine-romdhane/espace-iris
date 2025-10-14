import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Clock } from 'lucide-react';
import { Patient } from '@prisma/client';

export interface TaskFormData {
  title: string;
  description?: string;
  status: 'TODO' | 'IN_PROGRESS' | 'COMPLETED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  assignedToId?: string;
  patientId?: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'TODO' | 'IN_PROGRESS' | 'COMPLETED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  startDate: string;
  endDate: string;
  assignedTo?: {
    id: string;
    name: string;
  };
  patientId?: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface TaskFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: TaskFormData) => Promise<void>;
  task?: Task;
  initialDate?: Date;
  preselectedPatientId?: string;
  preselectedAssigneeId?: string;
}

export function TaskFormDialog({ 
  open, 
  onClose, 
  onSubmit, 
  task, 
  initialDate,
  preselectedPatientId,
  preselectedAssigneeId
}: TaskFormDialogProps) {
  const [startDateOpen, setStartDateOpen] = useState(false);
  const [endDateOpen, setEndDateOpen] = useState(false);
  
  // Set default dates based on props or current date
  const defaultStartDate = initialDate || new Date();
  const defaultEndDate = initialDate || new Date();
  
  // Format default dates for form
  const formattedStartDate = format(defaultStartDate, 'yyyy-MM-dd');
  const formattedEndDate = format(defaultEndDate, 'yyyy-MM-dd');

  const { register, handleSubmit, setValue, watch, reset, formState: { errors, isSubmitting } } = useForm<TaskFormData>({
    defaultValues: task ? {
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      startDate: format(new Date(task.startDate), 'yyyy-MM-dd'),
      startTime: format(new Date(task.startDate), 'HH:mm'),
      endDate: format(new Date(task.endDate), 'yyyy-MM-dd'),
      endTime: format(new Date(task.endDate), 'HH:mm'),
      assignedToId: task.assignedTo?.id,
      patientId: task.patientId
    } : {
      title: '',
      description: '',
      status: 'TODO',
      priority: 'MEDIUM',
      startDate: formattedStartDate,
      startTime: '09:00',
      endDate: formattedEndDate,
      endTime: '17:00',
      assignedToId: preselectedAssigneeId,
      patientId: preselectedPatientId
    }
  });

  // Fetch users for assignment - only employees
  const { data: users } = useQuery<User[]>({
    queryKey: ['users-employees'],
    queryFn: async () => {
      const response = await fetch('/api/users');
      if (!response.ok) throw new Error('Failed to fetch users');
      const allUsers = await response.json();
      // Filter to only show employees
      return allUsers.filter((user: User) => user.role === 'EMPLOYEE');
    }
  });

  // Fetch patients if needed
  const { data: patients } = useQuery({
    queryKey: ['patients'],
    queryFn: async () => {
      const response = await fetch('/api/clients?type=patient');
      if (!response.ok) throw new Error('Failed to fetch patients');
      const data = await response.json();
      // Transform the data to match expected format
      return data.map((patient: any) => ({
        id: patient.id,
        name: patient.name
      }));
    },
    enabled: open // Only fetch when dialog is open
  });

  const handleFormSubmit = async (data: TaskFormData) => {
    try {
      const startDateTime = new Date(`${data.startDate}T${data.startTime}`);
      const endDateTime = new Date(`${data.endDate}T${data.endTime}`);
      
      await onSubmit({
        ...data,
        startDate: startDateTime.toISOString(),
        endDate: endDateTime.toISOString()
      });
      
      reset();
      onClose();
    } catch (error) {
      console.error('Error submitting task:', error);
    }
  };

  const watchStartDate = watch('startDate');
  const watchEndDate = watch('endDate');

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) onClose();
    }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{task ? 'Modifier la tâche' : 'Nouvelle tâche'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="title">Titre</Label>
            <Input
              id="title"
              {...register("title", { required: "Le titre est requis" })}
            />
            {errors.title && (
              <span className="text-sm text-red-500">{errors.title.message}</span>
            )}
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              {...register("description")}
              placeholder="Description de la tâche..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Date de début</Label>
              <Popover open={startDateOpen} onOpenChange={setStartDateOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {watchStartDate ? format(new Date(watchStartDate), 'PPP', { locale: fr }) : "Sélectionner"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={watchStartDate ? new Date(watchStartDate) : undefined}
                    onSelect={(date) => {
                      if (date) {
                        setValue("startDate", format(date, 'yyyy-MM-dd'));
                        setStartDateOpen(false);
                      }
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <input type="hidden" {...register("startDate", { required: true })} />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="startTime">Heure de début</Label>
              <div className="relative">
                <Clock className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
                <Input
                  id="startTime"
                  type="time"
                  className="pl-10"
                  {...register("startTime", { required: true })}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Date de fin</Label>
              <Popover open={endDateOpen} onOpenChange={setEndDateOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {watchEndDate ? format(new Date(watchEndDate), 'PPP', { locale: fr }) : "Sélectionner"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={watchEndDate ? new Date(watchEndDate) : undefined}
                    onSelect={(date) => {
                      if (date) {
                        setValue("endDate", format(date, 'yyyy-MM-dd'));
                        setEndDateOpen(false);
                      }
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <input type="hidden" {...register("endDate", { required: true })} />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="endTime">Heure de fin</Label>
              <div className="relative">
                <Clock className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
                <Input
                  id="endTime"
                  type="time"
                  className="pl-10"
                  {...register("endTime", { required: true })}
                />
              </div>
            </div>
          </div>

          <div>
            <Label htmlFor="status">Statut</Label>
            <Select
              onValueChange={(value) => setValue("status", value as 'TODO' | 'IN_PROGRESS' | 'COMPLETED')}
              defaultValue={task?.status || 'TODO'}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner le statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODO">À faire</SelectItem>
                <SelectItem value="IN_PROGRESS">En cours</SelectItem>
                <SelectItem value="COMPLETED">Terminé</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="priority">Priorité</Label>
            <Select
              onValueChange={(value) => setValue("priority", value as 'LOW' | 'MEDIUM' | 'HIGH')}
              defaultValue={task?.priority || 'MEDIUM'}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner la priorité" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="LOW">Basse</SelectItem>
                <SelectItem value="MEDIUM">Moyenne</SelectItem>
                <SelectItem value="HIGH">Haute</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="assignedToId">Assigné à</Label>
            <Select
              onValueChange={(value) => setValue("assignedToId", value)}
              defaultValue={task?.assignedTo?.id || preselectedAssigneeId || ''}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un utilisateur" />
              </SelectTrigger>
              <SelectContent>
                {users?.map((user: User) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Patient selection if needed */}
          {patients && (
            <div>
              <Label htmlFor="patientId">Patient (optionnel)</Label>
              <Select
                onValueChange={(value) => setValue("patientId", value)}
                defaultValue={task?.patientId || preselectedPatientId || 'none'}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un patient" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucun patient</SelectItem>
                  {patients.map((patient: any) => (
                    <SelectItem key={patient.id} value={patient.id}>
                      {patient.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Chargement...' : task ? 'Mettre à jour' : 'Créer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
