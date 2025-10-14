import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import { cn } from "@/lib/utils";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface TraiteFormProps {
  onSubmit: (data: any) => void;
  initialValues?: any;
  className?: string;
}

export default function TraiteForm({ onSubmit, initialValues, className }: TraiteFormProps) {
  const [classification, setClassification] = useState<"principale" | "garantie" | "complement">("principale");
  const [payeeToSociete, setPayeeToSociete] = useState<"oui" | "no">(initialValues?.payeeToSociete || "oui");
  
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm({
    defaultValues: initialValues || {
      nomTraite: "",
      montantTotal: "",
      dateCreation: null,
      dateEcheance: null,
      lieuCreation: "",
      banque: "",
      rib: "",
      acompte: "",
      reste: "",
      dateReste: null,
      nomTireur: "",
      adresseNomTireur: "",
      nomTire: "",
      adresseNomTire: "",
      nomCedant: "",
      domiciliation: "",
      aval: "",
      payeeToSociete: "oui",
      nomPrenom: "",
      telephone: "",
      cin: "",
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
    const montantTotal = parseFloat(data.montantTotal) || 0;
    const acompte = parseFloat(data.acompte) || 0;
    const reste = parseFloat(data.reste) || 0;

    onSubmit({
      ...data,
      type: "traite",
      classification,
      payeeToSociete,
      amount: montantTotal,
      acompte,
      reste
    });
  };

  const handlePayeeChange = (value: "oui" | "no") => {
    setPayeeToSociete(value);
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
          <Label htmlFor="nomTraite" className="font-medium italic">Nom Traite</Label>
          <Input 
            id="nomTraite"
            placeholder="Valeur"
            {...register("nomTraite", { required: "Nom traite est requis" })}
          />
          {errors.nomTraite && (
            <p className="text-sm text-red-500 mt-1">{errors.nomTraite.message as string}</p>
          )}
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
          <Label htmlFor="dateCreation" className="font-medium italic">Date Création</Label>
          <DatePicker
            id="dateCreation"
            value={watch("dateCreation")}
            onChange={(date) => setValue("dateCreation", date)}
            placeholder="Choisir Date"
          />
        </div>

        <div>
          <Label htmlFor="dateEcheance" className="font-medium italic">Date échéance</Label>
          <DatePicker
            id="dateEcheance"
            value={watch("dateEcheance")}
            onChange={(date) => setValue("dateEcheance", date)}
            placeholder="Choisir Date"
          />
        </div>

        <div>
          <Label htmlFor="lieuCreation" className="font-medium italic">Lieu Création</Label>
          <Input 
            id="lieuCreation"
            placeholder="Valeur"
            {...register("lieuCreation")}
          />
        </div>

        <div>
          <Label htmlFor="banque" className="font-medium italic">Banque</Label>
          <Input 
            id="banque"
            placeholder="Valeur"
            {...register("banque")}
          />
        </div>

        <div>
          <Label htmlFor="rib" className="font-medium italic">RIB</Label>
          <Input 
            id="rib"
            placeholder="Valeur"
            {...register("rib")}
          />
        </div>

        <div>
          <Label htmlFor="nomCedant" className="font-medium italic">Nom de cédant</Label>
          <Input 
            id="nomCedant"
            placeholder="Valeur"
            {...register("nomCedant")}
          />
        </div>

        <div>
          <Label htmlFor="domiciliation" className="font-medium italic">Domiciliation</Label>
          <Input 
            id="domiciliation"
            placeholder="Valeur"
            {...register("domiciliation")}
          />
        </div>

        <div>
          <Label htmlFor="aval" className="font-medium italic">Aval</Label>
          <Input 
            id="aval"
            placeholder="Valeur"
            {...register("aval")}
          />
        </div>

        <div>
          <Label htmlFor="adresseNomTire" className="font-medium italic">Adresse et nom du tiré</Label>
          <Input 
            id="adresseNomTire"
            placeholder="Valeur"
            {...register("adresseNomTire")}
          />
        </div>

        <div>
          <Label className="font-medium italic">Payée à l'ordre de Société</Label>
          <RadioGroup 
            defaultValue={payeeToSociete} 
            onValueChange={(value) => handlePayeeChange(value as "oui" | "no")}
            className="flex items-center space-x-4 pt-2"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="oui" id="payee-oui" />
              <Label htmlFor="payee-oui" className="cursor-pointer">Oui</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="no" id="payee-non" />
              <Label htmlFor="payee-non" className="cursor-pointer">Non</Label>
            </div>
          </RadioGroup>
        </div>

        {payeeToSociete === "no" && (
          <>
            <div>
              <Label htmlFor="nomPrenom" className="font-medium italic">Nom prénom</Label>
              <Input 
                id="nomPrenom"
                placeholder="Valeur"
                {...register("nomPrenom")}
              />
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
          </>
        )}
      </div>
      <Button type="submit" className="w-full">Sauvegarder</Button>
    </form>
  );
}
