import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import { cn } from "@/lib/utils";
import { usePayment } from "./PaymentFormsMain";

interface EspecesFormProps {
  onSubmit: (data: any) => void;
  initialValues?: any;
  className?: string;
  onCancel?: () => void;
  totalRequired?: number;
}

export default function EspecesForm({ onSubmit, initialValues, className, onCancel, totalRequired }: EspecesFormProps) {
  // Get payment context to access the required amount
  const paymentContext = usePayment();
  
  // Use the totalRequired prop or fall back to the context's requiredAmount
  const requiredAmount = totalRequired || paymentContext?.requiredAmount || 0;
  
  const [classification, setClassification] = useState<"principale" | "garantie" | "complement">("principale");
  
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm({
    defaultValues: initialValues || {
      montantTotal: requiredAmount.toString(),
      acompte: "",
      reste: "",
      dateReste: null,
    }
  });
  
  // Watch the montantTotal and acompte fields to calculate reste automatically
  const montantTotal = watch("montantTotal");
  const acompte = watch("acompte");
  
  // Calculate reste whenever montantTotal or acompte changes
  useEffect(() => {
    const total = parseFloat(montantTotal) || 0;
    const advance = parseFloat(acompte) || 0;
    
    if (total > 0 && advance > 0 && advance <= total) {
      setValue("reste", (total - advance).toFixed(2));
    } else if (total > 0) {
      setValue("reste", total.toFixed(2));
    } else {
      setValue("reste", "");
    }
  }, [montantTotal, acompte, setValue]);

  const handleFormSubmit = (data: any) => {
    // Convert string values to numbers
    const montantTotal = parseFloat(data.montantTotal) || 0;
    const acompte = parseFloat(data.acompte) || 0;
    
    // If there's an acompte, create two payment entries
    if (acompte > 0 && acompte < montantTotal) {
      // First payment for the acompte (down payment)
      onSubmit({
        type: "especes",
        classification: "principale",
        amount: acompte,
        description: "Acompte"
      });
      
      // Second payment for the reste (remaining amount)
      onSubmit({
        type: "especes",
        classification: "complement",
        amount: montantTotal - acompte,
        dueDate: data.dateReste,
        description: "Reste à payer"
      });
    } else {
      // Single payment for the full amount
      onSubmit({
        type: "especes",
        classification,
        amount: montantTotal,
        description: "Paiement complet"
      });
    }
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className={cn("space-y-6", className)}>
      {/* Classification buttons */}
      <div className="flex space-x-2 mb-4">
        {["principale", "garantie", "complement"].map((type) => (
          <Button
            key={type}
            type="button"
            variant={classification === type ? "default" : "outline"}
            onClick={() => setClassification(type as "principale" | "garantie" | "complement")}
            className={cn(
              "flex-1 capitalize",
              classification === type ? "bg-blue-600 hover:bg-blue-700" : ""
            )}
          >
            {type === "principale" ? "Principal" : type === "garantie" ? "Garantie" : "Complément"}
          </Button>
        ))}
      </div>

      {/* Form Fields */}
      <div className="space-y-4">
        <div>
          <Label htmlFor="montantTotal" className="font-medium">Montant Total</Label>
          <Input 
            id="montantTotal"
            placeholder="Valeur"
            type="number"
            step="0.01"
            className="mt-1"
            {...register("montantTotal", { 
              required: "Montant total est requis",
              min: { value: 0.01, message: "Le montant doit être positif" }
            })}
          />
          {errors.montantTotal && (
            <p className="text-sm text-red-500 mt-1">{errors.montantTotal.message as string}</p>
          )}
        </div>

        <div>
          <Label htmlFor="acompte" className="font-medium">Acompte</Label>
          <Input 
            id="acompte"
            placeholder="Valeur"
            type="number"
            step="0.01"
            className="mt-1"
            {...register("acompte", {
              min: { value: 0, message: "L'acompte ne peut pas être négatif" },
              validate: value => {
                const total = parseFloat(montantTotal) || 0;
                const advance = parseFloat(value) || 0;
                return advance <= total || "L'acompte ne peut pas dépasser le montant total";
              }
            })}
          />
          {errors.acompte && (
            <p className="text-sm text-red-500 mt-1">{errors.acompte.message as string}</p>
          )}
        </div>

        <div>
          <Label htmlFor="reste" className="font-medium">Reste</Label>
          <Input 
            id="reste"
            placeholder="Calculé automatiquement"
            className="mt-1 bg-gray-50"
            disabled
            {...register("reste")}
          />
          <p className="text-xs text-gray-500 mt-1">Calculé automatiquement</p>
        </div>

        {acompte && parseFloat(acompte) > 0 && parseFloat(acompte) < parseFloat(montantTotal || '0') && (
          <div>
            <Label htmlFor="dateReste" className="font-medium">Date Échéance</Label>
            <DatePicker
              id="dateReste"
              value={watch("dateReste")}
              onChange={(date) => setValue("dateReste", date)}
              placeholder="Choisir Date"
              className="mt-1 w-full"
            />
            <p className="text-xs text-gray-500 mt-1">Date prévue pour le paiement du reste</p>
          </div>
        )}
      </div>

      <div className="flex space-x-3 pt-2">
        {onCancel && (
          <Button type="button" variant="outline" className="flex-1" onClick={onCancel}>
            Annuler
          </Button>
        )}
        <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700">
          Sauvegarder
        </Button>
      </div>
    </form>
  );
}
