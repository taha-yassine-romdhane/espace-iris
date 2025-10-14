import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { CalendarIcon, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface RentalDetailsStepProps {
  startDate: Date;
  endDate: Date;
  notes: string;
  onStartDateChange: (date: Date) => void;
  onEndDateChange: (date: Date) => void;
  onNotesChange: (notes: string) => void;
  onBack: () => void;
  onComplete: (data: any) => void;
  isSubmitting: boolean;
}

export function RentalDetailsStep({
  startDate,
  endDate,
  notes,
  onStartDateChange,
  onEndDateChange,
  onNotesChange,
  onBack,
  onComplete,
  isSubmitting
}: RentalDetailsStepProps) {
  const [startDateOpen, setStartDateOpen] = useState(false);
  const [endDateOpen, setEndDateOpen] = useState(false);

  // Calculate rental duration in days with defensive checks
  const rentalDuration = startDate && endDate ? 
    Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) : 
    0; // Default to 0 days if dates are undefined

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onComplete({
      startDate,
      endDate,
      notes
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-blue-900 mb-2">Détails de la Location</h2>
        <p className="text-gray-600">
          Configurez les dates et les détails de la location
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Start Date */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Date de début</label>
            <Popover open={startDateOpen} onOpenChange={setStartDateOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !startDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {startDate ? format(startDate, "PPP", { locale: fr }) : "Sélectionner une date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={(date) => {
                    if (date) {
                      onStartDateChange(date);
                      setStartDateOpen(false);
                    }
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* End Date */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Date de fin</label>
            <Popover open={endDateOpen} onOpenChange={setEndDateOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !endDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {endDate ? format(endDate, "PPP", { locale: fr }) : "Sélectionner une date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={endDate}
                  onSelect={(date) => {
                    if (date) {
                      onEndDateChange(date);
                      setEndDateOpen(false);
                    }
                  }}
                  disabled={(date) => date < startDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Rental Duration Summary */}
        <div className="bg-blue-50 p-4 rounded-md border border-blue-100">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-blue-900">Durée de location</h3>
              <p className="text-sm text-blue-700">
                {rentalDuration} {rentalDuration > 1 ? "jours" : "jour"}
              </p>
            </div>
            <div className="text-2xl font-bold text-blue-700">
              {rentalDuration} {rentalDuration > 1 ? "jours" : "jour"}
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Notes (optionnel)</label>
          <Textarea
            placeholder="Ajoutez des notes ou des détails supplémentaires concernant cette location..."
            value={notes}
            onChange={(e) => onNotesChange(e.target.value)}
            className="min-h-[100px]"
          />
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between pt-4">
          <Button type="button" variant="outline" onClick={onBack}>
            ← Retour
          </Button>
          <Button 
            type="submit" 
            disabled={isSubmitting}
            className="bg-[#1e3a8a] hover:bg-[#1e3a8a]/90"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Traitement...
              </>
            ) : (
              "Terminer"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}

export default RentalDetailsStep;