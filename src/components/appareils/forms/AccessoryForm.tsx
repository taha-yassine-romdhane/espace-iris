import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { useState } from "react";
import { PlusCircle, X } from "lucide-react";

// Stock location entry schema
const stockLocationEntrySchema = z.object({
  locationId: z.string().min(1, "Emplacement requis"),
  quantity: z.coerce.number().min(1, "La quantité doit être au moins 1"),
  status: z.enum(['FOR_SALE', 'FOR_RENT', 'IN_REPAIR', 'OUT_OF_SERVICE']).default('FOR_SALE'),
});

// Form validation schema for accessories
const accessorySchema = z.object({
  name: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
  type: z.literal("ACCESSORY"),
  brand: z.string().optional().nullable(),
  model: z.string().optional().nullable(),
  purchasePrice: z.coerce.number().min(0).optional().nullable(),
  sellingPrice: z.coerce.number().min(0).optional().nullable(),
  stockLocations: z.array(stockLocationEntrySchema).min(1, "Au moins un emplacement est requis"),
});

type AccessoryFormValues = z.infer<typeof accessorySchema>;

interface StockLocationEntry {
  locationId: string;
  quantity: number;
  status: 'FOR_SALE' | 'FOR_RENT' | 'IN_REPAIR' | 'OUT_OF_SERVICE';
}

interface AccessoryFormProps {
  initialData?: any;
  onSubmit: (data: AccessoryFormValues) => void;
  stockLocations: Array<{ id: string; name: string }>;
  isEditMode?: boolean;
}

// Status options
const statusOptions = [
  { value: "FOR_SALE", label: "À Vendre" },
  { value: "FOR_RENT", label: "À Louer" },
  { value: "IN_REPAIR", label: "En Réparation" },
  { value: "OUT_OF_SERVICE", label: "Hors Service" },
];

export function AccessoryForm({ initialData, onSubmit, stockLocations, isEditMode = false }: AccessoryFormProps) {
  // Transform initialData stocks to match our form structure
  const initialStockLocations: StockLocationEntry[] = initialData?.stocks?.map((stock: any) => ({
    locationId: stock.locationId || stock.location?.id,
    quantity: stock.quantity,
    status: stock.status || 'FOR_SALE',
  })) || [{ locationId: '', quantity: 1, status: 'FOR_SALE' as const }];

  const [stockLocationEntries, setStockLocationEntries] = useState<StockLocationEntry[]>(initialStockLocations);

  const form = useForm<AccessoryFormValues>({
    resolver: zodResolver(accessorySchema),
    defaultValues: {
      type: "ACCESSORY",
      name: initialData?.name || "",
      brand: initialData?.brand || "",
      model: initialData?.model || "",
      purchasePrice: initialData?.purchasePrice || null,
      sellingPrice: initialData?.sellingPrice || null,
      stockLocations: initialStockLocations,
    },
  });

  const handleSubmit = (data: AccessoryFormValues) => {
    onSubmit(data);
  };

  const addStockLocation = () => {
    const newEntry: StockLocationEntry = {
      locationId: '',
      quantity: 1,
      status: 'FOR_SALE',
    };
    const updatedEntries = [...stockLocationEntries, newEntry];
    setStockLocationEntries(updatedEntries);
    form.setValue('stockLocations', updatedEntries);
  };

  const removeStockLocation = (index: number) => {
    const updatedEntries = stockLocationEntries.filter((_, i) => i !== index);
    setStockLocationEntries(updatedEntries);
    form.setValue('stockLocations', updatedEntries);
  };

  const updateStockLocation = (index: number, field: keyof StockLocationEntry, value: any) => {
    const updatedEntries = [...stockLocationEntries];
    updatedEntries[index] = { ...updatedEntries[index], [field]: value };
    setStockLocationEntries(updatedEntries);
    form.setValue('stockLocations', updatedEntries);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="basic">Information de Base</TabsTrigger>
            <TabsTrigger value="stock">Stock par Emplacement</TabsTrigger>
            <TabsTrigger value="financial">Finance</TabsTrigger>
          </TabsList>

          <TabsContent value="basic">
            <Card>
              <CardContent className="space-y-4 pt-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nom</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value ?? ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="brand"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Marque</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value ?? ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="model"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Modèle</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value ?? ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="stock">
            <Card>
              <CardContent className="space-y-4 pt-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">Emplacements de Stock</h3>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addStockLocation}
                  >
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Ajouter un emplacement
                  </Button>
                </div>

                {stockLocationEntries.map((entry, index) => (
                  <div key={index} className="border rounded-lg p-4 space-y-3 relative">
                    {stockLocationEntries.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute top-2 right-2"
                        onClick={() => removeStockLocation(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}

                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Emplacement</label>
                        <Select
                          value={entry.locationId}
                          onValueChange={(value) => updateStockLocation(index, 'locationId', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner" />
                          </SelectTrigger>
                          <SelectContent>
                            {stockLocations.map((location) => (
                              <SelectItem key={location.id} value={location.id}>
                                {location.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">Quantité</label>
                        <Input
                          type="number"
                          min="1"
                          value={entry.quantity}
                          onChange={(e) => updateStockLocation(index, 'quantity', parseInt(e.target.value) || 1)}
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">Statut</label>
                        <Select
                          value={entry.status}
                          onValueChange={(value) => updateStockLocation(index, 'status', value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {statusOptions.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                ))}

                <FormField
                  control={form.control}
                  name="stockLocations"
                  render={() => (
                    <FormItem>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="financial">
            <Card>
              <CardContent className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="purchasePrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Prix d&apos;Achat</FormLabel>
                        <FormControl>
                          <Input type="number" min="0" step="0.01" {...field} value={field.value ?? ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="sellingPrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Prix de Vente</FormLabel>
                        <FormControl>
                          <Input type="number" min="0" step="0.01" {...field} value={field.value ?? ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end">
          <Button type="submit">{isEditMode ? "Mettre à jour" : "Ajouter"}</Button>
        </div>
      </form>
    </Form>
  );
}
export default AccessoryForm;
