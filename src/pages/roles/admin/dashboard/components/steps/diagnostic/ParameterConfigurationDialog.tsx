import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, addDays } from "date-fns";
import { fr } from "date-fns/locale";
import { CalendarIcon, Info } from "lucide-react";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";
import { toast } from "@/components/ui/use-toast";
import { useQueryClient } from "@tanstack/react-query";

interface ParameterConfigurationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (resultDueDate: Date) => void;
  deviceId: string;
  deviceName: string;
  resultDueDate?: Date;
  onResultDueDateChange?: (date: Date | undefined) => void;
}

export function ParameterConfigurationDialog({
  isOpen,
  onClose,
  onSubmit,
  deviceId,
  deviceName,
  resultDueDate,
  onResultDueDateChange = () => {}
}: ParameterConfigurationDialogProps) {
  const queryClient = useQueryClient();
  
  // Set default date to 7 days from now if not provided
  const defaultDate = resultDueDate || addDays(new Date(), 7);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(defaultDate);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Update local state when prop changes
  useEffect(() => {
    setSelectedDate(resultDueDate || defaultDate);
  }, [resultDueDate, defaultDate]);
  
  // Format date as a string for display
  const formatDate = (date?: Date) => {
    if (!date) return "";
    return format(date, 'PPP', { locale: fr });
  };
  
  // Handle date change locally
  const handleDateChange = (date: Date | undefined) => {
    setSelectedDate(date);
    onResultDueDateChange(date);
  };
  
  // Handle form submission
  const handleSubmit = async () => {
    if (!selectedDate) {
      setError("Veuillez sélectionner une date pour les résultats");
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Call the API to save the configuration
      const response = await fetch(`/api/diagnostic-parameters`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          deviceId,
          resultDueDate: selectedDate.toISOString()
        }),
      });
      
      if (!response.ok) {
        throw new Error('Erreur lors de la sauvegarde des paramètres');
      }
      
      // Invalidate and refetch the diagnostic products query to show updated status
      await queryClient.invalidateQueries({
        queryKey: ["products", "diagnostic"]
      });
      
      // Call the onSubmit callback with the selected date
      onSubmit(selectedDate);
      
      // Close the dialog
      onClose();
      
      // Show success toast
      toast({
        title: "Configuration sauvegardée",
        description: `L'appareil est réservé jusqu'au ${formatDate(selectedDate)}`,
      });
    } catch (err) {
      console.error('Error saving configuration:', err);
      setError("Impossible de sauvegarder la configuration. Veuillez réessayer.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            Configurer les Paramètres - {deviceName}
          </DialogTitle>
        </DialogHeader>
        
        {/* Date selector for results */}
        <div className="mb-6 bg-blue-50 p-4 rounded-md border border-blue-100">
          <h3 className="font-medium text-blue-800 mb-2 flex items-center gap-2">
            <Info className="h-4 w-4" />
            Date prévue pour les résultats
          </h3>
          <p className="text-sm text-blue-700 mb-3">
            Définissez la date à laquelle les résultats seront attendus. Une tâche sera créée dans le calendrier pour cette date.
          </p>
          
          <div className="flex flex-col space-y-2">
            <Label htmlFor="result-date" className="text-sm font-medium text-gray-700">Date des résultats attendus</Label>
            <div className="relative">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="result-date"
                    variant="outline"
                    className="w-full justify-start text-left font-normal bg-white border-gray-300"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4 text-gray-500" />
                    {selectedDate ? (
                      formatDate(selectedDate)
                    ) : (
                      <span className="text-gray-500">Sélectionner une date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 border border-gray-200 shadow-md rounded-md" align="start">
                  <div className="p-2 border-b border-gray-100">
                    <div className="font-medium text-center py-1">Date des résultats</div>
                  </div>
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={handleDateChange}
                    initialFocus
                    disabled={{
                      before: new Date(),
                    }}
                    className="rounded-md border-0"
                    classNames={{
                      day_selected: "bg-blue-900 text-white hover:bg-blue-900 hover:text-white focus:bg-blue-900 focus:text-white",
                      day_today: "bg-gray-100 text-gray-900"
                    }}
                  />
                </PopoverContent>
              </Popover>
            </div>
            
            {/* Show selected date as text for clarity */}
            {selectedDate && (
              <div className="text-sm text-blue-800 mt-1 flex items-center">
                <CalendarIcon className="h-3.5 w-3.5 mr-1.5" />
                Résultats attendus le {formatDate(selectedDate)}
              </div>
            )}
          </div>
        </div>
        
        {/* Error message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
            {error}
          </div>
        )}
        
        {/* Action buttons */}
        <div className="flex justify-end space-x-2 pt-4 border-t border-gray-100">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Annuler
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isLoading || !selectedDate}
            className="bg-blue-900 hover:bg-blue-800 text-white"
          >
            {isLoading ? 'Enregistrement...' : 'Enregistrer'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default ParameterConfigurationDialog;
