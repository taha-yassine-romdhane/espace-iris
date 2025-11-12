import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { useForm } from "react-hook-form";
import { useEffect } from "react";

interface ParametreCPAPFormProps {
  onSubmit: (values: any) => void;
  initialValues?: any;
  readOnly?: boolean;
}

export default function ParametreCPAPForm({ onSubmit, initialValues, readOnly = false }: ParametreCPAPFormProps) {
  const { register, handleSubmit, setValue, watch, reset } = useForm({
    defaultValues: {
      pressionRampe: '',
      dureeRampe: 0,
      auto1: false,
      pression: '',
      auto2: false,
      pressionTraitement: 0,
      epr: '',
    },
  });

  // Reset form with initialValues when they change
  useEffect(() => {
    console.log('[ParametreCPAPForm] Received initialValues:', initialValues);
    if (initialValues) {
      const formValues = {
        pressionRampe: initialValues.pressionRampe ?? '',
        dureeRampe: initialValues.dureeRampe ?? 0,
        auto1: initialValues.auto1 ?? false,
        pression: initialValues.pression ?? '',
        auto2: initialValues.auto2 ?? false,
        pressionTraitement: initialValues.pressionTraitement ?? 0,
        epr: initialValues.epr ?? initialValues.EPR ?? '', // Support both old and new format
      };
      console.log('[ParametreCPAPForm] Resetting form with:', formValues);
      reset(formValues);
    }
  }, [initialValues, reset]);

  return (
    <form className="bg-white rounded-xl p-6 w-full max-w-md mx-auto space-y-4" onSubmit={handleSubmit(onSubmit)}>
      <h2 className="text-2xl font-bold mb-2">paramètre CPAP</h2>
      <div>
        <label className="italic">Pression Rampe</label>
        <Input {...register("pressionRampe")} placeholder="Value" disabled={readOnly} />
      </div>
      <div>
        <label>Durée Rampe <span className="text-xs text-gray-400">0-45 min</span></label>
        <Slider
          min={0}
          max={45}
          step={1}
          value={[watch("dureeRampe") || 0]}
          onValueChange={v => !readOnly && setValue("dureeRampe", v[0])}
          disabled={readOnly}
        />
      </div>
      <div className="flex items-center gap-2">
        <Switch 
          checked={watch("auto1")} 
          onCheckedChange={v => !readOnly && setValue("auto1", v)} 
          disabled={readOnly}
        />
        <label>Auto</label>
      </div>
      <div>
        <label className="italic">pression</label>
        <Input {...register("pression")} placeholder="Value" disabled={readOnly} />
      </div>
      <div className="flex items-center gap-2">
        <Switch 
          checked={watch("auto2")} 
          onCheckedChange={v => !readOnly && setValue("auto2", v)} 
          disabled={readOnly}
        />
        <label>Auto</label>
      </div>
      <div>
        <label>Pression de traitement <span className="text-xs text-gray-400">0-20 Cm H₂O</span></label>
        <Slider
          min={0}
          max={20}
          step={1}
          value={[watch("pressionTraitement") || 0]}
          onValueChange={v => !readOnly && setValue("pressionTraitement", v[0])}
          disabled={readOnly}
        />
      </div>
      <div>
        <label className="italic">EPR</label>
        <Input {...register("epr")} placeholder="Value" disabled={readOnly} />
      </div>
      {!readOnly && <Button type="submit" className="w-full mt-4">Sauvegarder</Button>}
    </form>
  );
}
