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
import { Switch } from "@/components/ui/switch";
import { useState, useEffect } from "react";
import { Eye} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

// Import parameter form components
import {
  ParametreCPAPForm,
  ParametreVNIForm,
  ParametreConcentrateurForm,
  ParametreBouteilleForm,
  ParametreVIForm
} from "@/components/MedicaleDevicesParametreForms";

// Form validation schema for medical devices
const medicalDeviceSchema = z.object({
  deviceCode: z.string().optional(),
  name: z.string({ required_error: "Veuillez sélectionner un nom." }),
  customName: z.string().optional(),
  type: z.literal("MEDICAL_DEVICE"),
  brand: z.string().optional().nullable(),
  model: z.string().optional().nullable(),
  serialNumber: z.string().optional().nullable(),
  stockLocationId: z.string().optional().nullable(),
  purchasePrice: z.string().transform(val => val ? parseFloat(val) : null).nullable(),
  sellingPrice: z.string().transform(val => val ? parseFloat(val) : null).nullable(),
  technicalSpecs: z.string().optional().nullable(),
  configuration: z.string().optional().nullable(),
  status: z.enum(["ACTIVE", "MAINTENANCE", "RETIRED", "RESERVED", "SOLD"]).default("ACTIVE"),
  destination: z.enum(["FOR_SALE", "FOR_RENT"]).default("FOR_SALE"),
  rentalPrice: z.string().transform(val => val ? parseFloat(val) : null).nullable(),
  requiresMaintenance: z.boolean().default(false),
}).refine((data) => {
  if (data.name === 'Autre') {
    return !!data.customName && data.customName.length >= 2;
  }
  return true;
}, {
  message: "Le nom personnalisé doit contenir au moins 2 caractères.",
  path: ['customName'],
});

type MedicalDeviceFormValues = z.infer<typeof medicalDeviceSchema>;

interface MedicalDeviceFormProps {
  initialData?: any;
  onSubmit: (data: MedicalDeviceFormValues) => void;
  stockLocations: Array<{ id: string; name: string }>;
  isEditMode?: boolean;
}

export function MedicalDeviceForm({ initialData, onSubmit, stockLocations, isEditMode = false }: MedicalDeviceFormProps) {
  // State to control parameter preview dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [nextDeviceCode, setNextDeviceCode] = useState<string>('');

  const standardDeviceNames = ["CPAP", "VNI", "Concentrateur O²", "Vi", "Bouteil O²"];
  const isCustomName = isEditMode && initialData?.name && !standardDeviceNames.includes(initialData.name);

  // Generate next device code for new devices
  useEffect(() => {
    if (!isEditMode && !nextDeviceCode) {
      fetchNextDeviceCode();
    }
  }, [isEditMode, nextDeviceCode]);

  const fetchNextDeviceCode = async () => {
    try {
      const response = await fetch('/api/medical-devices/next-code');
      if (response.ok) {
        const { nextCode } = await response.json();
        setNextDeviceCode(nextCode);
      } else {
        // Fallback: generate a random code if API fails
        const timestamp = Date.now().toString().slice(-4);
        setNextDeviceCode(`APP${timestamp}`);
      }
    } catch (error) {
      console.error('Error fetching next device code:', error);
      // Fallback: generate a random code if API fails
      const timestamp = Date.now().toString().slice(-4);
      setNextDeviceCode(`APP${timestamp}`);
    }
  };

  const form = useForm<MedicalDeviceFormValues>({
    resolver: zodResolver(medicalDeviceSchema),
    defaultValues: {
      ...initialData,
      deviceCode: isEditMode ? initialData?.deviceCode : nextDeviceCode,
      name: isCustomName ? 'Autre' : initialData?.name,
      customName: isCustomName ? initialData.name : undefined,
      type: "MEDICAL_DEVICE",
      requiresMaintenance: initialData?.requiresMaintenance || false,
      status: initialData?.status || "ACTIVE",
      destination: initialData?.destination || "FOR_SALE"
    },
  });

  // Update device code in form when it's generated
  useEffect(() => {
    if (!isEditMode && nextDeviceCode) {
      form.setValue('deviceCode', nextDeviceCode);
    }
  }, [nextDeviceCode, form, isEditMode]);

  const handleSubmit = async (values: MedicalDeviceFormValues) => {
    try {
      const { customName, ...rest } = values;
      const submissionValues = { ...rest };

      if (values.name === 'Autre') {
        submissionValues.name = customName || '';
      }
      
      const cleanedValues = Object.entries(submissionValues).reduce((acc, [key, value]) => {
        acc[key] = value === "" ? null : value;
        return acc;
      }, {} as any);

      await onSubmit(cleanedValues);
    } catch (error) {
      console.error("Error in form submission:", error);
      throw error;
    }
  };

  // Get the selected device name to determine which parameter form to show
  const selectedName = form.watch('name');

  // Select the appropriate parameter form component based on the selected device name
  let ParamPreview = null;
  if (selectedName === 'CPAP') {
    ParamPreview = ParametreCPAPForm;
  } else if (selectedName === 'VNI') {
    ParamPreview = ParametreVNIForm;
  } else if (selectedName === 'Concentrateur O²') {
    ParamPreview = ParametreConcentrateurForm;
  } else if (selectedName === 'Bouteil O²') {
    ParamPreview = ParametreBouteilleForm;
  } else if (selectedName === 'Vi') {
    ParamPreview = ParametreVIForm;
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <div className="flex flex-col lg:flex-row gap-0 lg:gap-6 relative">
          {/* Main Form */}
          <div className="w-full min-w-0 p-0 lg:pr-6">
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="basic">Information de Base</TabsTrigger>
                <TabsTrigger value="stock">Stock</TabsTrigger>
                <TabsTrigger value="financial">Finance</TabsTrigger>
                <TabsTrigger value="technical">Technique</TabsTrigger>
              </TabsList>

              <TabsContent value="basic">
                <Card>
                  <CardContent className="space-y-4 pt-4">
                    <FormField
                      control={form.control}
                      name="deviceCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Code de l'appareil</FormLabel>
                          <FormControl>
                            <div className="flex items-center space-x-2">
                              <Input
                                {...field}
                                value={field.value || (isEditMode ? 'Code existant' : nextDeviceCode || 'Génération...')}
                                readOnly
                                className="bg-gray-50 font-mono text-lg font-semibold text-blue-600"
                                placeholder="Code automatique..."
                              />
                              {!isEditMode && (
                                <div className="text-sm text-gray-500 whitespace-nowrap">
                                  Auto-généré
                                </div>
                              )}
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nom</FormLabel>
                          <FormControl>
                            <Select
                              value={field.value}
                              onValueChange={field.onChange}
                              required
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Sélectionner le type d'appareil" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="CPAP">CPAP</SelectItem>
                                <SelectItem value="VNI">VNI</SelectItem>
                                <SelectItem value="Concentrateur O²">Concentrateur O²</SelectItem>
                                <SelectItem value="Vi">Vi</SelectItem>
                                <SelectItem value="Bouteil O²">Bouteil O²</SelectItem>
                                <SelectItem value="Autre">Autre</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {selectedName === 'Autre' && (
                      <FormField
                        control={form.control}
                        name="customName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nom de l'appareil personnalisé</FormLabel>
                            <FormControl>
                              <Input placeholder="Ex: Lit médical" {...field} value={field.value || ''} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="brand"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Marque</FormLabel>
                            <FormControl>
                              <Input {...field} value={field.value || ''} />
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
                              <Input {...field} value={field.value || ''} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="serialNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Numéro de Série</FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value || ''} />
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
                    <FormField
                      control={form.control}
                      name="stockLocationId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Emplacement</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value || undefined}
                          >
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
                           <FormField
                        control={form.control}
                        name="rentalPrice"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Prix de Location par jour</FormLabel>
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

              <TabsContent value="technical">
                <Card>
                  <CardContent className="space-y-4 pt-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="status"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Statut de l'Appareil</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Sélectionner le statut" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="ACTIVE">Actif</SelectItem>
                                <SelectItem value="MAINTENANCE">En Maintenance</SelectItem>
                                <SelectItem value="RETIRED">Retiré</SelectItem>
                                <SelectItem value="RESERVED">Réservé</SelectItem>
                                <SelectItem value="SOLD">Vendu</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="destination"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Destination</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Sélectionner la destination" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="FOR_SALE">Vente</SelectItem>
                                <SelectItem value="FOR_RENT">Location</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="requiresMaintenance"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">
                              Nécessite Maintenance
                            </FormLabel>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Parameter Preview Dialog Button - Only show if a device type is selected */}
          {ParamPreview && (
            <div className="mt-4">
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="flex items-center gap-2 text-blue-700 border-blue-200 hover:bg-blue-50"
                  >
                    <Eye size={16} />
                    Voir les paramètres
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <div className="flex justify-between items-center">
                      <DialogTitle className="text-blue-700">Paramètres de l'appareil</DialogTitle>
                    </div>
                    <DialogDescription>
                      Aperçu des paramètres pour {selectedName}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="max-h-[70vh] overflow-y-auto mt-4">
                    {ParamPreview && (
                      <ParamPreview
                        onSubmit={() => { }}
                        initialValues={{}}
                        readOnly={true}
                      />
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          )}
        </div>

        <div className="flex justify-end space-x-4">
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

export default MedicalDeviceForm;