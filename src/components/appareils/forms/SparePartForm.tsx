import { useState, useEffect } from "react";
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
import { Plus, Trash2 } from "lucide-react";

// Status mapping for better user experience
const statusOptions = [
  { value: "FOR_SALE", label: "En Vente" },
  { value: "FOR_RENT", label: "En Location" },
  { value: "IN_REPAIR", label: "En Réparation" },
  { value: "OUT_OF_SERVICE", label: "Hors Service" },
];

// Stock location entry interface
interface StockEntry {
  locationId: string;
  quantity: number;
  status: string;
}

// Form validation schema for spare parts
const sparePartSchema = z.object({
  name: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
  type: z.literal("SPARE_PART"),
  brand: z.string().optional().nullable(),
  model: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  partNumber: z.string().optional().nullable(),
  compatibleWith: z.string().optional().nullable(),
  serialNumber: z.string().optional().nullable(),
  minQuantity: z.coerce.number().int().min(0).optional().nullable(),
  purchasePrice: z.coerce.number().min(0).optional().nullable(),
  sellingPrice: z.coerce.number().min(0).optional().nullable(),
  status: z.enum(['FOR_SALE', 'FOR_RENT', 'IN_REPAIR', 'OUT_OF_SERVICE']).default('FOR_SALE'),
});

type SparePartFormValues = z.infer<typeof sparePartSchema>;

interface SparePartFormProps {
  initialData?: any;
  onSubmit: (data: SparePartFormValues & { stockEntries: StockEntry[] }) => void;
  stockLocations: Array<{ id: string; name: string }>;
  isEditMode?: boolean;
}

export function SparePartForm({ initialData, onSubmit, stockLocations, isEditMode = false }: SparePartFormProps) {
  // Initialize stock entries from initialData or empty array
  const [stockEntries, setStockEntries] = useState<StockEntry[]>([]);

  const form = useForm<SparePartFormValues>({
    resolver: zodResolver(sparePartSchema),
    defaultValues: {
      type: "SPARE_PART",
      name: initialData?.name || "",
      brand: initialData?.brand || "",
      model: initialData?.model || "",
      description: initialData?.description || "",
      partNumber: initialData?.partNumber || "",
      compatibleWith: initialData?.compatibleWith || "",
      serialNumber: initialData?.serialNumber || "",
      minQuantity: initialData?.minQuantity || null,
      purchasePrice: initialData?.purchasePrice || null,
      sellingPrice: initialData?.sellingPrice || null,
      status: initialData?.status || "FOR_SALE",
    },
  });

  // Update stock entries when initialData changes (for edit mode)
  useEffect(() => {
    console.log('SparePartForm useEffect triggered:', {
      isEditMode,
      hasInitialData: !!initialData,
      hasStocks: !!initialData?.stocks,
      stocksLength: initialData?.stocks?.length,
      stocks: initialData?.stocks
    });

    if (isEditMode && initialData?.stocks && initialData.stocks.length > 0) {
      const entries = initialData.stocks.map((stock: any) => ({
        locationId: stock.location?.id || stock.locationId,
        quantity: stock.quantity,
        status: stock.status || 'FOR_SALE'
      }));
      setStockEntries(entries);
      console.log('✅ Loaded stock entries for edit:', entries);
    } else if (isEditMode && initialData) {
      console.log('⚠️ Edit mode but no stocks found in initialData');
    }
  }, [isEditMode, initialData]);

  // Update form values when initialData changes
  useEffect(() => {
    if (initialData) {
      form.reset({
        type: "SPARE_PART",
        name: initialData.name || "",
        brand: initialData.brand || "",
        model: initialData.model || "",
        description: initialData.description || "",
        partNumber: initialData.partNumber || "",
        compatibleWith: initialData.compatibleWith || "",
        serialNumber: initialData.serialNumber || "",
        minQuantity: initialData.minQuantity || null,
        purchasePrice: initialData.purchasePrice || null,
        sellingPrice: initialData.sellingPrice || null,
        status: initialData.status || "FOR_SALE",
      });
    }
  }, [initialData, form]);

  const addStockEntry = () => {
    setStockEntries([...stockEntries, { locationId: "", quantity: 1, status: "FOR_SALE" }]);
  };

  const removeStockEntry = (index: number) => {
    setStockEntries(stockEntries.filter((_, i) => i !== index));
  };

  const updateStockEntry = (index: number, field: keyof StockEntry, value: string | number) => {
    const updated = [...stockEntries];
    updated[index] = { ...updated[index], [field]: value };
    setStockEntries(updated);
  };

  const handleSubmit = (data: SparePartFormValues) => {
    // Validate that at least one stock entry exists
    if (stockEntries.length === 0) {
      alert("Veuillez ajouter au moins un emplacement de stock");
      return;
    }

    // Validate that all stock entries have a location selected
    const hasEmptyLocation = stockEntries.some(entry => !entry.locationId);
    if (hasEmptyLocation) {
      alert("Veuillez sélectionner un emplacement pour chaque stock");
      return;
    }

    // Validate quantities are positive
    const hasInvalidQuantity = stockEntries.some(entry => entry.quantity <= 0);
    if (hasInvalidQuantity) {
      alert("Les quantités doivent être supérieures à 0");
      return;
    }

    onSubmit({ ...data, stockEntries });
  };

  // Get available locations (excluding already selected ones)
  const getAvailableLocations = (currentLocationId?: string) => {
    const selectedLocationIds = stockEntries
      .map(entry => entry.locationId)
      .filter(id => id !== currentLocationId);

    return stockLocations.filter(loc =>
      !selectedLocationIds.includes(loc.id) || loc.id === currentLocationId
    );
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="basic">Information de Base</TabsTrigger>
            <TabsTrigger value="stock">Stock</TabsTrigger>
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

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value ?? ''} placeholder="Description de la pièce détachée" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="partNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Numéro de Pièce</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value ?? ''} placeholder="ex: P-12345" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="serialNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Numéro de Série</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value ?? ''} placeholder="Optionnel" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="compatibleWith"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Compatible Avec</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value ?? ''} placeholder="ex: CPAP Model X, BiPAP Model Y" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="stock">
            <Card>
              <CardContent className="space-y-4 pt-4">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h3 className="text-lg font-semibold">Emplacements de Stock</h3>
                    <p className="text-sm text-muted-foreground">
                      Ajoutez cette pièce à un ou plusieurs emplacements
                    </p>
                  </div>
                  <Button
                    type="button"
                    onClick={addStockEntry}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Ajouter un emplacement
                  </Button>
                </div>

                {stockEntries.length === 0 ? (
                  <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                    <p className="text-gray-500 mb-4">Aucun emplacement de stock ajouté</p>
                    <Button
                      type="button"
                      onClick={addStockEntry}
                      variant="default"
                      size="sm"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Ajouter le premier emplacement
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {stockEntries.map((entry, index) => (
                      <Card key={index} className="border-2">
                        <CardContent className="pt-4">
                          <div className="flex gap-4 items-start">
                            <div className="flex-1 space-y-4">
                              <div>
                                <label className="text-sm font-medium mb-2 block">
                                  Emplacement
                                </label>
                                <Select
                                  value={entry.locationId}
                                  onValueChange={(value) => updateStockEntry(index, 'locationId', value)}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Sélectionner un emplacement" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {getAvailableLocations(entry.locationId).map((location) => (
                                      <SelectItem key={location.id} value={location.id}>
                                        {location.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>

                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="text-sm font-medium mb-2 block">
                                    Quantité
                                  </label>
                                  <Input
                                    type="number"
                                    min="1"
                                    value={entry.quantity}
                                    onChange={(e) => updateStockEntry(index, 'quantity', parseInt(e.target.value) || 0)}
                                  />
                                </div>

                                <div>
                                  <label className="text-sm font-medium mb-2 block">
                                    Statut
                                  </label>
                                  <Select
                                    value={entry.status}
                                    onValueChange={(value) => updateStockEntry(index, 'status', value)}
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

                            <Button
                              type="button"
                              variant="destructive"
                              size="icon"
                              onClick={() => removeStockEntry(index)}
                              className="mt-8"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}

                <div className="mt-6 pt-6 border-t">
                  <FormField
                    control={form.control}
                    name="minQuantity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Quantité Minimale d'Alerte</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            {...field}
                            value={field.value ?? ''}
                            placeholder="Seuil d'alerte pour le stock bas"
                          />
                        </FormControl>
                        <p className="text-sm text-muted-foreground">
                          Vous serez alerté lorsque le stock total descend en dessous de cette quantité
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
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
export default SparePartForm;
