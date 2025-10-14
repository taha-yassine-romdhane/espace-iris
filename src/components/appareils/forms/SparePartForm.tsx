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

// Status mapping for better user experience
const statusOptions = [
  { value: "EN_VENTE", label: "En Vente" },
  { value: "EN_LOCATION", label: "En Location" },
  { value: "EN_REPARATION", label: "En Réparation" },
  { value: "HORS_SERVICE", label: "Hors Service" },
];

// Form validation schema for spare parts
const sparePartSchema = z.object({
  name: z.string().min(1, { message: "Le nom est requis" }),
  brand: z.string().optional().nullable(),
  model: z.string().optional().nullable(),
  stockLocationId: z.string().optional().nullable(),
  stockQuantity: z.coerce.number().min(0),
  status: z.string(),
  type: z.literal("SPARE_PART"),  // Ensure type is always SPARE_PART
  purchasePrice: z.coerce.number().min(0).nullable(),
  sellingPrice: z.coerce.number().min(0).nullable(),
});

type SparePartFormValues = z.infer<typeof sparePartSchema>;

interface SparePartFormProps {
  initialData?: any;
  onSubmit: (data: SparePartFormValues) => void;
  stockLocations: Array<{ id: string; name: string }>;
  isEditMode?: boolean;
}

export function SparePartForm({ initialData, onSubmit, stockLocations, isEditMode = false }: SparePartFormProps) {
  const defaultValues = {
    name: initialData?.name || "",
    brand: initialData?.brand || "",
    model: initialData?.model || "",
    purchasePrice: initialData?.purchasePrice || "",
    sellingPrice: initialData?.sellingPrice || "",
    stockLocationId: initialData?.stockLocationId || "",
    stockQuantity: initialData?.stockQuantity || 0,
    status: initialData?.status || "EN_VENTE",
    type: "SPARE_PART" as const,  // Type assertion to ensure it's SPARE_PART
  };

  const form = useForm<SparePartFormValues>({
    resolver: zodResolver(sparePartSchema),
    defaultValues,
  });

  const handleSubmit = async (values: SparePartFormValues) => {
    try {
      const cleanedValues = Object.entries(values).reduce((acc, [key, value]) => {
        acc[key] = value;
        // Handle empty strings
        if (value === "") {
          acc[key] = null;
        }
        // Handle numeric fields
        else if (["purchasePrice", "sellingPrice"].includes(key)) {
          acc[key] = value ? parseFloat(value.toString()) : null;
        }
        // Handle stock quantity
        else if (key === "stockQuantity") {
          acc[key] = value ? parseInt(value.toString()) : 0;
        }
        return acc;
      }, {} as any);

      // Ensure type is always SPARE_PART
      cleanedValues.type = "SPARE_PART";

      await onSubmit(cleanedValues);
    } catch (error) {
      console.error("Error in spare part form submission:", error);
      throw error;
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 bg-white rounded-lg overflow-hidden">
        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="basic">Information de Base</TabsTrigger>
            <TabsTrigger value="stock">Stock</TabsTrigger>
            <TabsTrigger value="financial">Finance</TabsTrigger>
          </TabsList>

          <TabsContent value="basic">
            <Card className="border-0 shadow-none">
              <CardContent className="space-y-4 pt-4 px-5">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nom*</FormLabel>
                      <FormControl>
                        <Input {...field} />
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
                          <Input {...field} value={field.value || ""} />
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
                          <Input {...field} value={field.value || ""} />
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
            <Card className="border-0 shadow-none">
              <CardContent className="space-y-4 pt-4 px-5">
                <FormField
                  control={form.control}
                  name="stockLocationId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Emplacement</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value || ""} >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner l'emplacement" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {stockLocations.map((location) => (
                            <SelectItem key={location.id} value={location.id}>
                              {location.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Statut</FormLabel>
                      <FormControl>
                        <Select onValueChange={field.onChange} defaultValue={field.value ?? ''}>
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner le statut" />
                          </SelectTrigger>
                          <SelectContent>
                            {statusOptions.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="stockQuantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quantité en Stock</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          {...field}
                          onChange={(e) => field.onChange(e.target.valueAsNumber)}
                          value={field.value || 0}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="financial">
            <Card className="border-0 shadow-none">
              <CardContent className="space-y-4 pt-4 px-5">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="purchasePrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Prix d&apos;Achat</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" min="0" {...field} value={field.value || ''} />
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
                          <Input type="number" step="0.01" min="0" {...field} value={field.value || ''} />
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

        <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-end space-x-4">
          <Button
            type="submit"
            disabled={form.formState.isSubmitting}
          >
            {form.formState.isSubmitting ? (
              "Chargement..."
            ) : (
              isEditMode ? "Mettre à jour" : "Ajouter"
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}

export default SparePartForm;
