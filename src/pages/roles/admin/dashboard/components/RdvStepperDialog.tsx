import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { DatePicker } from '@/components/ui/date-picker';
import { TimePicker } from '@/components/ui/time-picker';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { 
  Calendar, 
  Clock, 
  User, 
  FileText, 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft,
  MapPin,
  Stethoscope
} from 'lucide-react';

// Import step components
import { AppointmentClientSelectionStep } from './steps/AppointmentClientSelectionStep';

// Type definitions
interface Client {
  id: string;
  name: string;
  type: 'patient';
  telephone?: string;
  firstName?: string;
  lastName?: string;
}

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
  speciality?: string;
  isActive: boolean;
}

interface AppointmentData {
  client: Client | null;
  appointmentType: string;
  appointmentDate: Date | null;
  appointmentTime: string;
  location: string;
  notes: string;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  status: 'SCHEDULED' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';
  assignedTechnician: Employee | null;
}

interface RdvStepperDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function RdvStepperDialog({ isOpen, onClose }: RdvStepperDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // State management
  const [currentStep, setCurrentStep] = useState(1);
  const [appointmentData, setAppointmentData] = useState<AppointmentData>({
    client: null,
    appointmentType: '',
    appointmentDate: null as Date | null,
    appointmentTime: '',
    location: '',
    notes: '',
    priority: 'NORMAL' as 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT',
    status: 'SCHEDULED' as 'SCHEDULED' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED',
    assignedTechnician: null
  });

  // Check for existing appointments
  const { data: existingAppointments, refetch: refetchAppointments } = useQuery({
    queryKey: ['appointments', appointmentData.client?.id, appointmentData.appointmentDate],
    queryFn: async () => {
      if (!appointmentData.client?.id || !appointmentData.appointmentDate) return [];
      
      const response = await fetch(`/api/appointments?patientId=${appointmentData.client.id}`);
      if (!response.ok) throw new Error('Failed to fetch appointments');
      
      const data = await response.json();
      
      // Handle both array and object response formats
      const appointments = Array.isArray(data) ? data : (data.appointments || []);
      
      // Filter appointments for the same date
      const selectedDate = new Date(appointmentData.appointmentDate);
      return appointments.filter((apt: any) => {
        const aptDate = new Date(apt.scheduledDate);
        return aptDate.toDateString() === selectedDate.toDateString() &&
               apt.status !== 'CANCELLED';
      });
    },
    enabled: !!appointmentData.client?.id && !!appointmentData.appointmentDate,
  });

  // Dynamic steps configuration based on appointment type
  const getSteps = () => {
    const baseSteps = [
      { 
        id: 1, 
        title: 'Sélection Client', 
        icon: <User className="h-5 w-5" />,
        description: 'Choisir le patient ou la société'
      },
      { 
        id: 2, 
        title: 'Type de Rendez-vous', 
        icon: <Stethoscope className="h-5 w-5" />,
        description: 'Définir le type et motif'
      }
    ];

    // Add technician selection step for diagnostic visits
    if (appointmentData.appointmentType === 'DIAGNOSTIC_VISIT') {
      baseSteps.push({
        id: 3,
        title: 'Sélection Technicien',
        icon: <User className="h-5 w-5" />,
        description: 'Assigner un employé'
      });
    }

    baseSteps.push(
      { 
        id: appointmentData.appointmentType === 'DIAGNOSTIC_VISIT' ? 4 : 3, 
        title: 'Date et Heure', 
        icon: <Calendar className="h-5 w-5" />,
        description: 'Planifier le rendez-vous'
      },
      { 
        id: appointmentData.appointmentType === 'DIAGNOSTIC_VISIT' ? 5 : 4, 
        title: 'Récapitulatif', 
        icon: <CheckCircle2 className="h-5 w-5" />,
        description: 'Vérifier et confirmer'
      }
    );

    return baseSteps;
  };

  const steps = getSteps();

  // Create appointment mutation
  const createAppointmentMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        throw new Error('Failed to create appointment');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Rendez-vous créé',
        description: 'Le rendez-vous a été créé avec succès',
      });
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      onClose();
      resetForm();
    },
    onError: () => {
      toast({
        title: 'Erreur',
        description: 'Impossible de créer le rendez-vous',
        variant: 'destructive',
      });
    },
  });

  const resetForm = () => {
    setCurrentStep(1);
    setAppointmentData({
      client: null,
      appointmentType: '',
      appointmentDate: null,
      appointmentTime: '',
      location: '',
      notes: '',
      priority: 'NORMAL',
      status: 'SCHEDULED',
      assignedTechnician: null
    });
  };

  const handleNext = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = () => {
    if (!appointmentData.appointmentDate || !appointmentData.appointmentTime) {
      toast({
        title: 'Erreur',
        description: 'Date et heure sont requises',
        variant: 'destructive',
      });
      return;
    }

    // Combine date and time into a single Date object
    const [hours, minutes] = appointmentData.appointmentTime.split(':');
    const scheduledDate = new Date(appointmentData.appointmentDate);
    scheduledDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);

    const payload = {
      patientId: appointmentData.client ? appointmentData.client.id : null,
      companyId: null, // Appointments are only for patients
      appointmentType: appointmentData.appointmentType,
      scheduledDate: scheduledDate,
      location: appointmentData.location,
      notes: appointmentData.notes,
      priority: appointmentData.priority,
      status: appointmentData.status,
      assignedToId: appointmentData.assignedTechnician ? appointmentData.assignedTechnician.id : null,
      // Flag to auto-create task for diagnostic visits
      createDiagnosticTask: appointmentData.appointmentType === 'DIAGNOSTIC_VISIT'
    };

    createAppointmentMutation.mutate(payload);
  };

  const renderStepContent = () => {
    const isDiagnosticVisit = appointmentData.appointmentType === 'DIAGNOSTIC_VISIT';
    
    switch (currentStep) {
      case 1:
        return (
          <AppointmentClientSelectionStep
            selectedClient={appointmentData.client}
            onClientSelect={(client) => 
              setAppointmentData(prev => ({ ...prev, client }))
            }
          />
        );

      case 2:
        return (
          <AppointmentTypeStep
            appointmentType={appointmentData.appointmentType}
            location={appointmentData.location}
            priority={appointmentData.priority}
            notes={appointmentData.notes}
            onUpdate={(updates) => 
              setAppointmentData(prev => ({ ...prev, ...updates }))
            }
          />
        );

      case 3:
        if (isDiagnosticVisit) {
          return (
            <TechnicianSelectionStep
              selectedTechnician={appointmentData.assignedTechnician}
              onTechnicianSelect={(technician) => 
                setAppointmentData(prev => ({ ...prev, assignedTechnician: technician }))
              }
            />
          );
        }
        return (
          <DateTimeStep
            appointmentDate={appointmentData.appointmentDate}
            appointmentTime={appointmentData.appointmentTime}
            existingAppointments={existingAppointments || []}
            patientName={appointmentData.client?.name || ''}
            onUpdate={(updates) => 
              setAppointmentData(prev => ({ ...prev, ...updates }))
            }
          />
        );

      case 4:
        if (isDiagnosticVisit) {
          return (
            <DateTimeStep
              appointmentDate={appointmentData.appointmentDate}
              appointmentTime={appointmentData.appointmentTime}
              existingAppointments={existingAppointments || []}
              patientName={appointmentData.client?.name || ''}
              onUpdate={(updates) => 
                setAppointmentData(prev => ({ ...prev, ...updates }))
              }
            />
          );
        }
        return (
          <AppointmentSummaryStep
            appointmentData={appointmentData}
            onSubmit={handleSubmit}
            isLoading={createAppointmentMutation.isPending}
          />
        );

      case 5:
        if (isDiagnosticVisit) {
          return (
            <AppointmentSummaryStep
              appointmentData={appointmentData}
              onSubmit={handleSubmit}
              isLoading={createAppointmentMutation.isPending}
            />
          );
        }
        return null;

      default:
        return null;
    }
  };

  const isStepValid = () => {
    const isDiagnosticVisit = appointmentData.appointmentType === 'DIAGNOSTIC_VISIT';
    
    switch (currentStep) {
      case 1:
        return appointmentData.client !== null;
      case 2:
        return appointmentData.appointmentType && appointmentData.location;
      case 3:
        if (isDiagnosticVisit) {
          return appointmentData.assignedTechnician !== null;
        }
        return appointmentData.appointmentDate && appointmentData.appointmentTime;
      case 4:
        if (isDiagnosticVisit) {
          return appointmentData.appointmentDate && appointmentData.appointmentTime;
        }
        return true;
      case 5:
        if (isDiagnosticVisit) {
          return true;
        }
        return false;
      default:
        return false;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Calendar className="h-6 w-6 text-blue-600" />
            Nouveau Rendez-vous
          </DialogTitle>
        </DialogHeader>

        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-6 px-4">
          {steps.map((step, index) => (
            <React.Fragment key={step.id}>
              <div className="flex flex-col items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    currentStep >= step.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {currentStep > step.id ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : (
                    step.icon
                  )}
                </div>
                <div className="mt-2 text-center">
                  <div className="text-sm font-medium">{step.title}</div>
                  <div className="text-xs text-gray-500">{step.description}</div>
                </div>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-4 ${
                    currentStep > step.id ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                />
              )}
            </React.Fragment>
          ))}
        </div>

        <Separator />

        {/* Step Content */}
        <div className="min-h-[400px] py-6">
          {renderStepContent()}
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between items-center pt-4 border-t">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 1}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Précédent
          </Button>

          <div className="text-sm text-gray-500">
            Étape {currentStep} sur {steps.length}
          </div>

          {currentStep < steps.length ? (
            <Button
              onClick={handleNext}
              disabled={!isStepValid()}
              className="flex items-center gap-2"
            >
              Suivant
              <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={!isStepValid() || createAppointmentMutation.isPending}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
            >
              {createAppointmentMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  Création...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Créer le Rendez-vous
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Step Components
interface AppointmentTypeStepProps {
  appointmentType: string;
  location: string;
  priority: string;
  notes: string;
  onUpdate: (updates: Partial<AppointmentData>) => void;
}

function AppointmentTypeStep({ 
  appointmentType, 
  location, 
  priority, 
  notes, 
  onUpdate 
}: AppointmentTypeStepProps) {
  const appointmentTypes = [
    { value: 'DIAGNOSTIC_VISIT', label: 'Visite Diagnostique', icon: <Stethoscope className="h-4 w-4" />, description: 'Polygraphie à domicile par un technicien' },
    { value: 'CONSULTATION', label: 'Consultation', icon: <Stethoscope className="h-4 w-4" />, description: 'Rendez-vous médical' },
    { value: 'LOCATION', label: 'Location', icon: <FileText className="h-4 w-4" />, description: 'Location d’équipement' },
    { value: 'VENTE', label: 'Vente', icon: <FileText className="h-4 w-4" />, description: 'Vente de produit' },
    { value: 'DIAGNOSTIC', label: 'Diagnostic', icon: <FileText className="h-4 w-4" />, description: 'Examen en clinique' },
    { value: 'MAINTENANCE', label: 'Maintenance', icon: <FileText className="h-4 w-4" />, description: 'Maintenance équipement' },
    { value: 'RECUPERATION', label: 'Récupération', icon: <FileText className="h-4 w-4" />, description: 'Récupération matériel' }
  ];

  const priorities = [
    { value: 'LOW', label: 'Faible', color: 'bg-green-100 text-green-800' },
    { value: 'NORMAL', label: 'Normal', color: 'bg-blue-100 text-blue-800' },
    { value: 'HIGH', label: 'Élevée', color: 'bg-orange-100 text-orange-800' },
    { value: 'URGENT', label: 'Urgent', color: 'bg-red-100 text-red-800' }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Type de Rendez-vous</h3>
        <div className="grid grid-cols-1 gap-3">
          {appointmentTypes.map((type) => (
            <button
              key={type.value}
              onClick={() => onUpdate({ appointmentType: type.value })}
              className={`p-4 border rounded-lg flex items-start gap-3 text-left transition-colors ${
                appointmentType === type.value
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="mt-1">{type.icon}</div>
              <div className="flex-1">
                <div className="font-medium">{type.label}</div>
                {type.description && (
                  <div className="text-sm text-gray-600 mt-1">{type.description}</div>
                )}
                {type.value === 'DIAGNOSTIC_VISIT' && (
                  <div className="text-xs text-blue-600 mt-2 font-medium">
                    ⚡ Nécessite l'assignation d'un technicien
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Lieu</label>
        <div className="relative">
          <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={location}
            onChange={(e) => onUpdate({ location: e.target.value })}
            placeholder="Adresse ou lieu du rendez-vous"
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Priorité</label>
        <div className="flex gap-2">
          {priorities.map((prio) => (
            <button
              key={prio.value}
              onClick={() => onUpdate({ priority: prio.value as 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT' })}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                priority === prio.value
                  ? prio.color
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {prio.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Notes (optionnel)</label>
        <textarea
          value={notes}
          onChange={(e) => onUpdate({ notes: e.target.value })}
          placeholder="Informations complémentaires..."
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>
    </div>
  );
}

interface DateTimeStepProps {
  appointmentDate: Date | null;
  appointmentTime: string;
  existingAppointments: any[];
  patientName: string;
  onUpdate: (updates: Partial<AppointmentData>) => void;
}

function DateTimeStep({ 
  appointmentDate, 
  appointmentTime,
  existingAppointments,
  patientName,
  onUpdate 
}: DateTimeStepProps) {

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold mb-4">Planification du Rendez-vous</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Date</label>
          <DatePicker
            value={appointmentDate || undefined}
            onChange={(date) => onUpdate({ appointmentDate: date || null })}
            placeholder="Sélectionner une date"
            className="w-full"
            minDate={new Date()}
          />
          <p className="text-xs text-gray-500">Choisissez la date du rendez-vous</p>
        </div>
        
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Heure</label>
          <TimePicker
            value={appointmentTime}
            onChange={(time) => onUpdate({ appointmentTime: time })}
            placeholder="Sélectionner l'heure"
            className="w-full"
          />
          <p className="text-xs text-gray-500">Choisissez l'heure du rendez-vous</p>
        </div>
      </div>


      {/* Existing Appointments Warning */}
      {existingAppointments && existingAppointments.length > 0 && (
        <Alert className="border-orange-200 bg-orange-50">
          <AlertCircle className="h-4 w-4 text-orange-600" />
          <AlertTitle className="text-orange-800">⚠️ Rendez-vous existants détectés</AlertTitle>
          <AlertDescription className="text-orange-700">
            <p className="mb-2">{patientName} a déjà {existingAppointments.length} rendez-vous le {appointmentDate?.toLocaleDateString('fr-FR')} :</p>
            <ul className="list-disc list-inside space-y-1">
              {existingAppointments.map((apt: any, index: number) => {
                const time = new Date(apt.scheduledDate).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
                return (
                  <li key={index} className="text-sm">
                    {time} - {apt.appointmentType} ({apt.status === 'CONFIRMED' ? 'Confirmé' : 'Planifié'})
                    {apt.location && ` - ${apt.location}`}
                  </li>
                );
              })}
            </ul>
            <p className="mt-2 text-xs text-orange-600">
              ℹ️ Vous pouvez continuer si vous souhaitez créer un autre rendez-vous pour ce patient.
            </p>
          </AlertDescription>
        </Alert>
      )}

      {/* Preview Section */}
      {appointmentDate && appointmentTime && (
        <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h4 className="font-medium text-blue-900 mb-2">Aperçu du créneau</h4>
          <div className="flex items-center gap-4 text-sm text-blue-800">
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span>{appointmentDate.toLocaleDateString('fr-FR', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>{appointmentTime}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface AppointmentSummaryStepProps {
  appointmentData: AppointmentData;
  onSubmit: () => void;
  isLoading: boolean;
}

function AppointmentSummaryStep({ 
  appointmentData
}: AppointmentSummaryStepProps) {
  const formatDate = (date: Date | null) => {
    if (!date) return 'Date non sélectionnée';
    return date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (time: string) => {
    return time || 'Heure non sélectionnée';
  };

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">Récapitulatif du Rendez-vous</h3>
      
      <div className="bg-gray-50 rounded-lg p-4 space-y-4">
        <div className="flex items-center gap-3">
          <User className="h-5 w-5 text-blue-600" />
          <div>
            <p className="font-medium">{appointmentData.client?.name}</p>
            <p className="text-sm text-gray-600">Patient</p>
          </div>
        </div>

        <Separator />

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600">Type</p>
            <p className="font-medium">
              {appointmentData.appointmentType === 'DIAGNOSTIC_VISIT' ? 'Visite Diagnostique' : appointmentData.appointmentType}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Priorité</p>
            <Badge className="w-fit">{appointmentData.priority}</Badge>
          </div>
        </div>

        {appointmentData.assignedTechnician && (
          <div>
            <p className="text-sm text-gray-600">Technicien assigné</p>
            <div className="flex items-center gap-2 mt-1">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-semibold ${
                appointmentData.assignedTechnician.role === 'EMPLOYEE' ? 'bg-green-500' : 'bg-purple-500'
              }`}>
                {appointmentData.assignedTechnician.firstName.charAt(0)}{appointmentData.assignedTechnician.lastName.charAt(0)}
              </div>
              <p className="font-medium">
                {appointmentData.assignedTechnician.firstName} {appointmentData.assignedTechnician.lastName}
              </p>
            </div>
          </div>
        )}

        <div>
          <p className="text-sm text-gray-600">Date et heure</p>
          <p className="font-medium">
            {formatDate(appointmentData.appointmentDate)} à {formatTime(appointmentData.appointmentTime)}
          </p>
        </div>

        <div>
          <p className="text-sm text-gray-600">Lieu</p>
          <p className="font-medium">{appointmentData.location}</p>
        </div>

        {appointmentData.notes && (
          <div>
            <p className="text-sm text-gray-600">Notes</p>
            <p className="text-sm">{appointmentData.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// Technician Selection Step Component
interface TechnicianSelectionStepProps {
  selectedTechnician: Employee | null;
  onTechnicianSelect: (technician: Employee) => void;
}

function TechnicianSelectionStep({ selectedTechnician, onTechnicianSelect }: TechnicianSelectionStepProps) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch employees on component mount
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/users/employees-stats');
        if (!response.ok) throw new Error('Failed to fetch employees');
        
        const data = await response.json();
        // Filter only active employees
        const activeEmployees = data.filter((emp: any) => emp.isActive);
        setEmployees(activeEmployees);
      } catch (err) {
        setError('Impossible de charger la liste des employés');
        console.error('Error fetching employees:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchEmployees();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <h3 className="text-lg font-semibold mb-4">Sélection du Technicien</h3>
        <div className="flex justify-center items-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h3 className="text-lg font-semibold mb-4">Sélection du Technicien</h3>
        <div className="text-center py-8">
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Sélection du Technicien</h3>
        <p className="text-gray-600 mb-6">
          Choisissez l'employé qui effectuera la visite diagnostique chez le patient.
        </p>
      </div>

      {employees.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500">Aucun employé disponible</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 max-h-96 overflow-y-auto">
          {employees.map((employee) => (
            <button
              key={employee.id}
              onClick={() => onTechnicianSelect(employee)}
              className={`p-4 border rounded-lg text-left transition-all duration-200 hover:shadow-md ${
                selectedTechnician?.id === employee.id
                  ? 'border-blue-500 bg-blue-50 shadow-md'
                  : 'border-gray-200 hover:border-blue-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold ${
                    employee.role === 'EMPLOYEE' ? 'bg-green-500' : 'bg-purple-500'
                  }`}>
                    {employee.firstName.charAt(0)}{employee.lastName.charAt(0)}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">
                      {employee.firstName} {employee.lastName}
                    </div>
                    <div className="text-sm text-gray-600">
                      {employee.role === 'EMPLOYEE' ? 'Employé' : 'Manager'}
                      {employee.speciality && ` • ${employee.speciality}`}
                    </div>
                  </div>
                </div>
                <div className="flex items-center">
                  {selectedTechnician?.id === employee.id && (
                    <CheckCircle2 className="h-5 w-5 text-blue-600" />
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {selectedTechnician && (
        <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h4 className="font-medium text-blue-900 mb-2">Technicien sélectionné</h4>
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold ${
              selectedTechnician.role === 'EMPLOYEE' ? 'bg-green-500' : 'bg-purple-500'
            }`}>
              {selectedTechnician.firstName.charAt(0)}{selectedTechnician.lastName.charAt(0)}
            </div>
            <div>
              <div className="font-medium text-blue-900">
                {selectedTechnician.firstName} {selectedTechnician.lastName}
              </div>
              <div className="text-sm text-blue-700">
                {selectedTechnician.role === 'EMPLOYEE' ? 'Employé' : 'Manager'}
                {selectedTechnician.speciality && ` • ${selectedTechnician.speciality}`}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default RdvStepperDialog;