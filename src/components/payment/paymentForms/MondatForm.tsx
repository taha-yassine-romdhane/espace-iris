import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";

interface MondatFormProps {
  onSubmit: (data: any) => void;
  initialValues?: any;
  className?: string;
}

export default function MondatForm({ onSubmit, initialValues, className }: MondatFormProps) {
  const [classification, setClassification] = useState<"principale" | "garantie" | "complement">("principale");
  
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm({
    defaultValues: initialValues || {
      montantTotal: "",
      acompte: "",
      reste: "",
      dateReste: null,
      benificiere: "",
      bureauEmission: "",
      dateEmission: null,
    }
  });

  // Watch for changes in montantTotal and acompte to calculate reste
  const montantTotal = watch("montantTotal");
  const acompte = watch("acompte");

  useEffect(() => {
    const total = parseFloat(montantTotal) || 0;
    const acompteValue = parseFloat(acompte) || 0;
    const reste = Math.max(0, total - acompteValue);
    setValue("reste", reste.toString());
  }, [montantTotal, acompte, setValue]);

  const handleFormSubmit = (data: any) => {
    onSubmit({
      ...data,
      type: "mondat",
      classification
    });
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className={cn("space-y-6", className)}>

      {/* Form Fields */}
      <div className="space-y-4">
        <div>
          <Label className="font-medium italic">Classification</Label>
          <RadioGroup 
            defaultValue={classification} 
            onValueChange={(value) => setClassification(value as "principale" | "garantie" | "complement")}
            className="flex items-center space-x-4 pt-2"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="principale" id="principale" />
              <Label htmlFor="principale">Principale</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="garantie" id="garantie" />
              <Label htmlFor="garantie">Garantie</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="complement" id="complement" />
              <Label htmlFor="complement">Complément</Label>
            </div>
          </RadioGroup>
        </div>

        <div>
          <Label htmlFor="montantTotal" className="font-medium italic">Montant Total</Label>
          <Input 
            id="montantTotal"
            placeholder="Valeur"
            {...register("montantTotal", { required: "Montant total est requis" })}
          />
          {errors.montantTotal && (
            <p className="text-sm text-red-500 mt-1">{errors.montantTotal.message as string}</p>
          )}
        </div>

        <div>
          <Label htmlFor="acompte" className="font-medium italic">Acompte</Label>
          <Input 
            id="acompte"
            placeholder="Valeur"
            {...register("acompte")}
          />
        </div>

        <div>
          <Label htmlFor="reste" className="font-medium italic">Reste</Label>
          <Input 
            id="reste"
            placeholder="Calculé automatiquement"
            className="bg-gray-100"
            disabled
            {...register("reste")}
          />
          {parseFloat(watch("reste")) > 0 && !watch("dateReste") && (
            <p className="text-sm text-amber-500 mt-1">Date d'échéance requise pour les paiements partiels</p>
          )}
        </div>

        <div>
          <Label htmlFor="dateReste" className="font-medium italic">Date Reste</Label>
          <DatePicker
            id="dateReste"
            value={watch("dateReste")}
            onChange={(date) => setValue("dateReste", date)}
            placeholder="Choisir Date"
          />
        </div>

        <div>
          <Label htmlFor="benificiere" className="font-medium italic">Bénificiére</Label>
          <Input 
            id="benificiere"
            placeholder="Valeur"
            {...register("benificiere", { required: "Bénificiére est requis" })}
          />
          {errors.benificiere && (
            <p className="text-sm text-red-500 mt-1">{errors.benificiere.message as string}</p>
          )}
        </div>

        <div>
          <Label htmlFor="bureauEmission" className="font-medium italic">Bureau d'émission</Label>
          <Input 
            id="bureauEmission"
            placeholder="Valeur"
            {...register("bureauEmission", { required: "Bureau d'émission est requis" })}
          />
          {errors.bureauEmission && (
            <p className="text-sm text-red-500 mt-1">{errors.bureauEmission.message as string}</p>
          )}
        </div>

        <div>
          <Label htmlFor="dateEmission" className="font-medium italic">Date d'émission</Label>
          <DatePicker
            id="dateEmission"
            value={watch("dateEmission")}
            onChange={(date) => setValue("dateEmission", date)}
            placeholder="Choisir Date"
          />
        </div>
      </div>

      <Button type="submit" className="w-full">Sauvegarder</Button>
    </form>
  );
}
