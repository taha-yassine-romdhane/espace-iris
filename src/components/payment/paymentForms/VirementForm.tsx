import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface VirementFormProps {
  onSubmit: (data: any) => void;
  initialValues?: any;
  className?: string;
}

export default function VirementForm({ onSubmit, initialValues, className }: VirementFormProps) {
  // State for payment classification
  const [classification, setClassification] = useState<'principale' | 'garantie' | 'complement'>(
    initialValues?.classification || 'principale'
  );
  
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm({
    defaultValues: initialValues || {
      montantTotal: "",
      acompte: "",
      reste: "",
      reference: "",
      dateReste: null,
    }
  });
  
  // Watch for changes in montantTotal and acompte to calculate reste
  const montantTotal = watch("montantTotal");
  const acompte = watch("acompte");
  
  // Calculate remaining amount when total or down payment changes
  useEffect(() => {
    const total = parseFloat(montantTotal) || 0;
    const downPayment = parseFloat(acompte) || 0;
    
    // Ensure down payment doesn't exceed total
    if (downPayment > total) {
      setValue("acompte", total.toString());
      setValue("reste", "0");
    } else {
      const remaining = total - downPayment;
      setValue("reste", remaining.toString());
    }
  }, [montantTotal, acompte, setValue]);

  const handleFormSubmit = (data: any) => {
    onSubmit({
      ...data,
      type: "virement",
      classification,
      amount: parseFloat(data.montantTotal) || 0,
    });
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className={cn("space-y-6", className)}>
      
      {/* Payment Classification */}
      <div className="flex flex-wrap gap-2 mb-4">
        <Badge 
          className={cn(
            "cursor-pointer hover:bg-blue-600", 
            classification === 'principale' ? "bg-blue-600" : "bg-gray-300"
          )}
          onClick={() => setClassification('principale')}
        >
          Principale
        </Badge>
        <Badge 
          className={cn(
            "cursor-pointer hover:bg-blue-600", 
            classification === 'garantie' ? "bg-blue-600" : "bg-gray-300"
          )}
          onClick={() => setClassification('garantie')}
        >
          Garantie
        </Badge>
        <Badge 
          className={cn(
            "cursor-pointer hover:bg-blue-600", 
            classification === 'complement' ? "bg-blue-600" : "bg-gray-300"
          )}
          onClick={() => setClassification('complement')}
        >
          Complément
        </Badge>
      </div>

      {/* Form Fields */}
      <div className="space-y-4">
        <div>
          <Label htmlFor="montantTotal" className="font-medium italic">Montant Total</Label>
          <Input 
            id="montantTotal"
            placeholder="Valeur"
            type="number"
            {...register("montantTotal", { 
              required: "Montant total est requis",
              min: { value: 0, message: "Le montant doit être positif" }
            })}
          />
          {errors.montantTotal && (
            <p className="text-sm text-red-500 mt-1">{errors.montantTotal.message as string}</p>
          )}
        </div>

        <div>
          <Label htmlFor="reference" className="font-medium italic">Référence du virement</Label>
          <Input 
            id="reference"
            placeholder="Référence"
            {...register("reference", { required: "La référence est requise" })}
          />
          {errors.reference && (
            <p className="text-sm text-red-500 mt-1">{errors.reference.message as string}</p>
          )}
        </div>

        <div>
          <Label htmlFor="acompte" className="font-medium italic">Acompte</Label>
          <Input 
            id="acompte"
            placeholder="Valeur"
            type="number"
            {...register("acompte", { 
              min: { value: 0, message: "L'acompte doit être positif" }
            })}
          />
          {errors.acompte && (
            <p className="text-sm text-red-500 mt-1">{errors.acompte.message as string}</p>
          )}
        </div>

        <div>
          <Label htmlFor="reste" className="font-medium italic">Reste</Label>
          <Input 
            id="reste"
            placeholder="Valeur"
            disabled
            className="bg-gray-100"
            {...register("reste")}
          />
        </div>

        <div>
          <Label htmlFor="dateReste" className="font-medium italic">Date Échéance</Label>
          <DatePicker
            id="dateReste"
            value={watch("dateReste")}
            onChange={(date) => setValue("dateReste", date)}
            placeholder="Choisir Date"
          />
          {parseFloat(watch("reste")) > 0 && !watch("dateReste") && (
            <p className="text-sm text-amber-500 mt-1">Date d'échéance requise pour les paiements partiels</p>
          )}
        </div>
      </div>

      <Button type="submit" className="w-full">Sauvegarder</Button>
    </form>
  );
}
