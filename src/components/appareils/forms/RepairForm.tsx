import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Check, ChevronsUpDown, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { useToast } from "@/components/ui/use-toast";
import { useQuery } from "@tanstack/react-query";


interface RepairFormProps {
  medicalDeviceId: string;
  productName: string;
  onSuccess: () => void;
}

interface RepairFormData {
  notes: string;
  locationId: string;
  repairCost: string;
  additionalCost: string;
  employeeId: string;
  repairDate: string;
  spareParts: { id: string; quantity: number }[];
  deviceStatus: string;
}

interface Employee {
  id: string;
  name: string;
}

interface Location {
  id: string;
  name: string;
  address?: string;
  type: string;
}

interface SparePart {
  id: string;
  name: string;
  stockQuantity: number;
  purchasePrice: number;
}

export function RepairForm({ medicalDeviceId, productName, onSuccess }: RepairFormProps) {
  const { toast } = useToast();
  const [selectedSpareParts, setSelectedSpareParts] = useState<{ id: string; name: string; quantity: number; purchasePrice: number }[]>([]);
  const [sparePartOpen, setSparePartOpen] = useState(false);
  const [totalCost, setTotalCost] = useState(0);

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<RepairFormData>({
    defaultValues: {
      repairDate: new Date().toISOString().split('T')[0],
      repairCost: "0.00",
      additionalCost: "0.00",
      spareParts: [],
      deviceStatus: 'ACTIVE'
    }
  });

  const additionalCost = watch('additionalCost');

  useEffect(() => {
    const sparePartsCost = selectedSpareParts.reduce((total, part) => {
      return total + (part.purchasePrice * part.quantity);
    }, 0);
    
    const additional = parseFloat(additionalCost) || 0;
    const total = sparePartsCost + additional;
    
    setTotalCost(total);
    setValue('repairCost', total.toFixed(2));
  }, [selectedSpareParts, additionalCost, setValue]);

  // Fetch repair locations
  const { data: repairLocations } = useQuery<Location[]>({
    queryKey: ["repair-locations"],
    queryFn: async () => {
      const response = await fetch("/api/repair-locations");
      if (!response.ok) throw new Error("Failed to fetch repair locations");
      return response.json();
    },
  });

  // Fetch employees
  const { data: employees, isLoading: isLoadingEmployees } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const response = await fetch('/api/users/employees');
      if (!response.ok) {
        throw new Error('Failed to fetch employees');
      }
      return response.json();
    },
  });

  // Add spare parts query
  const { data: spareParts } = useQuery<SparePart[]>({
    queryKey: ['spare-parts'],
    queryFn: async () => {
      const response = await fetch('/api/products?type=SPARE_PART');
      if (!response.ok) {
        throw new Error('Failed to fetch spare parts');
      }
      const data = await response.json();
      console.log('Fetched spare parts:', data); // Debug log
      return data;
    },
  });

  const handleSparePartSelect = (partId: string) => {
    const part = spareParts?.find(p => p.id === partId);
    if (part) {
      const newPart = { 
        id: partId, 
        name: part.name, 
        quantity: 1,
        purchasePrice: parseFloat(part.purchasePrice?.toString() || '0')
      };
      setSelectedSpareParts(prev => {
        if (!prev.find(sp => sp.id === partId)) {
          return [...prev, newPart];
        }
        return prev;
      });
      setValue('spareParts', selectedSpareParts.map(({ id, quantity }) => ({ id, quantity })));
      setSparePartOpen(false);
    }
  };

  const handleSparePartQuantityChange = (partId: string, quantity: number) => {
    const newSelectedParts = selectedSpareParts.map(part => 
      part.id === partId ? { ...part, quantity } : part
    );
    setSelectedSpareParts(newSelectedParts);
    setValue('spareParts', newSelectedParts.map(({ id, quantity }) => ({ id, quantity })));
  };

  const handleSparePartRemove = (partId: string) => {
    setSelectedSpareParts(selectedSpareParts.filter(part => part.id !== partId));
    setValue('spareParts', selectedSpareParts.filter(part => part.id !== partId).map(({ id, quantity }) => ({ id, quantity })));
  };

  const onSubmit = async (data: RepairFormData) => {
    try {
      const response = await fetch("/api/repairs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...data,
          medicalDeviceId,
          repairCost: parseFloat(data.repairCost),
          spareParts: data.spareParts
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create repair record");
      }

      toast({
        title: "Réparation enregistrée",
        description: "La réparation a été enregistrée avec succès.",
      });

      reset();
      setSelectedSpareParts([]);
      onSuccess();
    } catch (error) {
      console.error("Error creating repair:", error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Une erreur est survenue lors de l'enregistrement de la réparation.",
      });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label>Appareil</Label>
        <Input value={productName} disabled />
      </div>

      <div>
        <Label htmlFor="notes">Description du problème</Label>
        <Textarea
          id="notes"
          placeholder="Décrivez le problème à réparer..."
          {...register("notes", { required: true })}
        />
        {errors.notes && (
          <span className="text-sm text-red-500">Ce champ est requis</span>
        )}
      </div>

      <div>
        <Label htmlFor="locationId">Lieu de réparation</Label>
        <Select
          onValueChange={(value) => setValue("locationId", value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Sélectionner un lieu" />
          </SelectTrigger>
          <SelectContent>
            {repairLocations?.map((location) => (
              <SelectItem key={location.id} value={location.id}>
                {location.name} {location.type && `(${location.type})`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.locationId && (
          <span className="text-sm text-red-500">Ce champ est requis</span>
        )}
      </div>

      <div>
        <Label htmlFor="employeeId">Employé</Label>
        <Select
          onValueChange={(value) => setValue("employeeId", value)}
          {...register("employeeId", { required: true })}
        >
          <SelectTrigger>
            <SelectValue placeholder={isLoadingEmployees ? "Chargement..." : "Sélectionner un employé"} />
          </SelectTrigger>
          <SelectContent>
            {employees?.map((employee: Employee) => (
              <SelectItem key={employee.id} value={employee.id}>
                {employee.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.employeeId && (
          <span className="text-sm text-red-500">Ce champ est requis</span>
        )}
      </div>

      <div>
        <Label>Pièces de rechange utilisées</Label>
        <Popover open={sparePartOpen} onOpenChange={setSparePartOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={sparePartOpen}
              className="w-full justify-between"
            >
              Sélectionner des pièces
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-full p-0">
            <Command>
              <CommandInput placeholder="Rechercher une pièce..." />
              <CommandEmpty>Aucune pièce trouvée.</CommandEmpty>
              <CommandGroup>
                {spareParts?.length === 0 && (
                  <CommandItem disabled>
                    Aucune pièce de rechange disponible
                  </CommandItem>
                )}
                {spareParts?.map((part) => (
                  <CommandItem
                    key={part.id}
                    onSelect={() => handleSparePartSelect(part.id)}
                    className="cursor-pointer"
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        selectedSpareParts.find(sp => sp.id === part.id) ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <span>{part.name}</span>
                    {part.stockQuantity > 0 && (
                      <span className="ml-2 text-sm text-gray-500">
                        (Stock: {part.stockQuantity})
                      </span>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            </Command>
          </PopoverContent>
        </Popover>

        <div className="mt-2 space-y-2">
          {selectedSpareParts.map((part) => (
            <div key={part.id} className="flex items-center gap-2 rounded-md border p-2">
              <div className="flex-1">
                <div>{part.name}</div>
                <div className="text-sm text-gray-500">
                  Prix unitaire: {part.purchasePrice.toFixed(2)} DT
                </div>
              </div>
              <Input
                type="number"
                value={part.quantity}
                onChange={(e) => handleSparePartQuantityChange(part.id, parseInt(e.target.value))}
                className="w-20"
                min="1"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleSparePartRemove(part.id)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      <div>
        <Label htmlFor="additionalCost">Coût additionnel</Label>
        <Input
          id="additionalCost"
          type="number"
          step="0.01"
          min="0"
          {...register("additionalCost")}
        />
      </div>

      <div>
        <Label htmlFor="repairCost">Coût total de réparation</Label>
        <Input
          id="repairCost"
          type="number"
          step="0.01"
          min="0"
          value={totalCost.toFixed(2)}
          disabled
          className="bg-gray-100"
        />
        <div className="text-sm text-gray-500 mt-1">
          Pièces: {selectedSpareParts.reduce((total, part) => total + (part.purchasePrice * part.quantity), 0).toFixed(2)} DT
          {parseFloat(additionalCost) > 0 && ` + Additionnel: ${parseFloat(additionalCost).toFixed(2)} DT`}
        </div>
      </div>

      <div>
        <Label htmlFor="repairDate">Date de réparation</Label>
        <Input
          id="repairDate"
          type="date"
          {...register("repairDate", { required: true })}
        />
        {errors.repairDate && (
          <span className="text-sm text-red-500">Ce champ est requis</span>
        )}
      </div>

      <div>
        <Label htmlFor="deviceStatus">État de l&apos;appareil après réparation</Label>
        <Select onValueChange={(value) => setValue("deviceStatus", value)} defaultValue="ACTIVE">
          <SelectTrigger>
            <SelectValue placeholder="Sélectionner l'état" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ACTIVE">En service</SelectItem>
            <SelectItem value="MAINTENANCE">En maintenance</SelectItem>
            <SelectItem value="RETIRED">Retiré</SelectItem>
          </SelectContent>
        </Select>
        {errors.deviceStatus && (
          <span className="text-sm text-red-500">Ce champ est requis</span>
        )}
      </div>

      <Button type="submit" className="w-full">
        Enregistrer la réparation
      </Button>
    </form>
  );
}


export default RepairForm;