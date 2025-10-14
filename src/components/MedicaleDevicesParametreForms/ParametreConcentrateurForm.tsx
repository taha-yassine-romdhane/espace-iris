import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";

interface ParametreConcentrateurFormProps {
  onSubmit: (values: any) => void;
  initialValues?: any;
}

export default function ParametreConcentrateurForm({ onSubmit, initialValues }: ParametreConcentrateurFormProps) {
  const { register, handleSubmit } = useForm({
    defaultValues: initialValues || {
      debit: '',
    },
  });

  return (
    <form className="bg-white rounded-xl p-6 w-full max-w-xs mx-auto space-y-4" onSubmit={handleSubmit(onSubmit)}>
      <h2 className="text-2xl font-bold mb-2">paramètre Concentrateur</h2>
      <div>
        <label className="italic">Débit</label>
        <Input {...register("debit")} placeholder="Value" />
      </div>
      <Button type="submit" className="w-full mt-4">Sauvegarder</Button>
    </form>
  );
}
