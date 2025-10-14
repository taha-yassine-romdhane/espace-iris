import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { useForm } from "react-hook-form";

interface ParametreVNIFormProps {
  onSubmit: (values: any) => void;
  initialValues?: any;
}

export default function ParametreVNIForm({ onSubmit, initialValues }: ParametreVNIFormProps) {
  const { register, handleSubmit, setValue, watch } = useForm({
    defaultValues: initialValues || {
      pressionRampe: '',
      dureeRampe: 0,
      IPAP: '',
      EPAP: '',
      AID: '',
      frequenceRespiratoire: '',
      volumeCourant: '',
      mode: '',
    },
  });

  return (
    <form className="bg-white rounded-xl p-6 w-full max-w-md mx-auto space-y-4" onSubmit={handleSubmit(onSubmit)}>
      <h2 className="text-2xl font-bold mb-2">paramètre VNI</h2>
      <div>
        <label className="italic">Pression Rampe</label>
        <Input {...register("pressionRampe")} placeholder="Value" />
      </div>
      <div>
        <label>Durée Rampe <span className="text-xs text-gray-400">0-45 min</span></label>
        <Slider min={0} max={45} step={1} defaultValue={[watch("dureeRampe")]} onValueChange={v => setValue("dureeRampe", v[0])} />
      </div>
      <div>
        <label>IPAP</label>
        <Input {...register("IPAP")} placeholder="Value" />
      </div>
      <div>
        <label>EPAP</label>
        <Input {...register("EPAP")} placeholder="Value" />
      </div>
      <div>
        <label>AID</label>
        <Input {...register("AID")} placeholder="Value" />
      </div>
      <div>
        <label className="italic">Fréquence Respiratoire</label>
        <Input {...register("frequenceRespiratoire")} placeholder="Value" />
      </div>
      <div>
        <label className="italic">Volume Courant</label>
        <Input {...register("volumeCourant")} placeholder="Value" />
      </div>
      <div>
        <label>mode</label>
        <select className="w-full border rounded px-3 py-2" {...register("mode")}> {/* You can replace with a custom Select */}
          <option value="">S</option>
          <option value="">ST</option>
          <option value="">T</option>
          <option value="">Auto</option>
          <option value="">VGPS</option>
          <option value="">VS aide</option>
        </select>
      </div>
      <Button type="submit" className="w-full mt-4">Sauvegarder</Button>
    </form>
  );
}
