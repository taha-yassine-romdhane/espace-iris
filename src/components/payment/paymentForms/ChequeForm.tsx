import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import { cn } from "@/lib/utils";
import { Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ChequeFormProps {
  onSubmit: (data: any) => void;
  initialValues?: any;
  className?: string;
}

export default function ChequeForm({ onSubmit, initialValues, className }: ChequeFormProps) {
  // State for payment classification
  const [classification, setClassification] = useState<'principale' | 'garantie' | 'complement'>(
    initialValues?.classification || 'principale'
  );
  
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm({
    defaultValues: initialValues || {
      montantTotal: "",
      acompte: "",
      reste: "",
      nomPrenom: "",
      telephone: "",
      cin: "",
      numCheque: "",
      banque: "",
      dateEcheance: null,
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
      type: "cheque",
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
          <Label htmlFor="nomPrenom" className="font-medium italic">Nom prénom</Label>
          <Input 
            id="nomPrenom"
            placeholder="Valeur"
            {...register("nomPrenom", { required: "Nom prénom est requis" })}
          />
          {errors.nomPrenom && (
            <p className="text-sm text-red-500 mt-1">{errors.nomPrenom.message as string}</p>
          )}
        </div>

        <div>
          <Label htmlFor="telephone" className="font-medium italic">Téléphone</Label>
          <Input 
            id="telephone"
            placeholder="Valeur"
            {...register("telephone")}
          />
        </div>

        <div>
          <Label htmlFor="cin" className="font-medium italic">CIN</Label>
          <Input 
            id="cin"
            placeholder="Valeur"
            {...register("cin")}
          />
        </div>

        <div>
          <Label htmlFor="numCheque" className="font-medium italic">Num chèque</Label>
          <Input 
            id="numCheque"
            placeholder="Valeur"
            {...register("numCheque", { required: "Numéro de chèque est requis" })}
          />
          {errors.numCheque && (
            <p className="text-sm text-red-500 mt-1">{errors.numCheque.message as string}</p>
          )}
        </div>

        <div>
          <Label htmlFor="banque" className="font-medium italic">Banque</Label>
          <Input 
            id="banque"
            placeholder="Valeur"
            {...register("banque", { required: "Banque est requise" })}
          />
          {errors.banque && (
            <p className="text-sm text-red-500 mt-1">{errors.banque.message as string}</p>
          )}
        </div>

        <div>
          <Label htmlFor="dateEcheance" className="font-medium italic">Date échéance</Label>
          <DatePicker
            id="dateEcheance"
            value={watch("dateEcheance")}
            onChange={(date) => setValue("dateEcheance", date)}
            placeholder="Choisir Date"
          />
          {parseFloat(watch("reste")) > 0 && !watch("dateEcheance") && (
            <p className="text-sm text-amber-500 mt-1">Date d'échéance requise pour les paiements partiels</p>
          )}
        </div>
      </div>
      <Button type="submit" className="w-full">Sauvegarder</Button>
    </form>
  );
}
