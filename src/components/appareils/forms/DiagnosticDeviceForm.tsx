import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { useState } from "react";

// Define Parameter interface for type safety
interface Parameter {
  id?: string;
  title: string;
  type: 'INPUT' | 'CHECKBOX' | 'NUMBER' | 'RANGE' | 'DATE'; // Added DATE type to match DynamicParameterBuilder
  unit?: string;
  minValue?: number;
  maxValue?: number;
  isRequired: boolean;
  isAutomatic?: boolean;
  value?: string;
  parameterType: 'PARAMETER' | 'RESULT'; // Made required to match DynamicParameterBuilder
  resultDueDate?: string;
  resultDueDays?: number; // Added to match DynamicParameterBuilder
}

// Form validation schema for diagnostic devices
const diagnosticDeviceSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
  type: z.literal("DIAGNOSTIC_DEVICE"),
  brand: z.string().optional().nullable(),
  model: z.string().optional().nullable(),
  serialNumber: z.string().optional().nullable(),
  
  stockLocationId: z.string().optional().nullable(),
  stockQuantity: z.coerce.number().min(0).default(1),
  minStock: z.coerce.number().min(0).nullable(),
  maxStock: z.coerce.number().min(0).nullable(),
  alertThreshold: z.coerce.number().min(0).nullable(),
  
  purchasePrice: z.coerce.number().min(0).nullable(),
  sellingPrice: z.coerce.number().min(0).nullable(),
  technicalSpecs: z.string().optional().nullable(),
  warranty: z.string().optional().nullable(),
  configuration: z.string().optional().nullable(),
  destination: z.enum(["FOR_SALE", "FOR_RENT"]).default("FOR_SALE"),
  requiresMaintenance: z.boolean().optional().default(false),
  status: z.enum(["ACTIVE", "MAINTENANCE", "RETIRED", "RESERVED", "SOLD"]).default("ACTIVE"),
  parameters: z.record(z.any()).optional(),
});

type DiagnosticDeviceFormValues = z.infer<typeof diagnosticDeviceSchema>;

interface DiagnosticDeviceFormProps {
  initialData?: any;
  onSubmit: (data: DiagnosticDeviceFormValues) => Promise<any>;
  stockLocations: Array<{ id: string; name: string }>;
  isEditMode?: boolean;
}

export function DiagnosticDeviceForm({ initialData, onSubmit, stockLocations, isEditMode = false }: DiagnosticDeviceFormProps) {
  const form = useForm<DiagnosticDeviceFormValues>({
    resolver: zodResolver(diagnosticDeviceSchema),
    defaultValues: {
      id: initialData?.id || undefined,
      ...initialData,
      type: "DIAGNOSTIC_DEVICE",
      brand: initialData?.brand || '',
      model: initialData?.model || '',
      serialNumber: initialData?.serialNumber || '',
      stockQuantity: initialData?.stockQuantity || 1,
      minStock: initialData?.minStock || null,
      maxStock: initialData?.maxStock || null,
      alertThreshold: initialData?.alertThreshold || null,
      purchasePrice: initialData?.purchasePrice || null,
      sellingPrice: initialData?.sellingPrice || null,
      technicalSpecs: initialData?.technicalSpecs || '',
      warranty: initialData?.warranty || '',
      configuration: initialData?.configuration || '',
      destination: initialData?.destination || "FOR_SALE",
      requiresMaintenance: initialData?.requiresMaintenance || false,
      status: initialData?.status || "ACTIVE"
    },
  });

  const handleSubmit = async (values: DiagnosticDeviceFormValues) => {
    try {
      console.log('DiagnosticDeviceForm handleSubmit called with values:', values);
      
      // Force type to be DIAGNOSTIC_DEVICE
      values.type = "DIAGNOSTIC_DEVICE";
      
      // Ensure type is set correctly
      const cleanedValues = Object.entries(values).reduce((acc, [key, value]) => {
        // Handle empty strings
        if (value === "") {
          acc[key] = null;
        } 
        // Handle numeric fields
        else if (["purchasePrice", "sellingPrice"].includes(key)) {
          acc[key] = value ? parseFloat(value.toString()) : null;
        }
        else if (["stockQuantity", "minStock", "maxStock", "alertThreshold"].includes(key)) {
          acc[key] = value ? parseInt(value.toString()) : null;
        }
        // Handle boolean fields
        else if (["requiresMaintenance"].includes(key)) {
          acc[key] = value || false;
        }
        // All other fields
        else {
          acc[key] = value;
        }
        return acc;
      }, {} as any);

      console.log('Cleaned values:', cleanedValues);
      
      const formData = {
        ...cleanedValues,
        type: "DIAGNOSTIC_DEVICE" // Ensure type is explicitly set
      };

      console.log('Final form data being submitted:', formData);
      console.log('Calling onSubmit function...');
      
      // First save the device to get its ID
      const savedDevice: { id: string } = await onSubmit(formData) || {};
      console.log('Device saved successfully:', savedDevice);
      
      
      console.log('onSubmit completed successfully');
      return savedDevice;
    } catch (error) {
      console.error("Error in diagnostic device form submission:", error);
      throw error;
    }
  };



  return (
    <div className="p-6">
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="w-full ">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              <Tabs defaultValue="basic" className="w-full">
                <TabsList className="grid w-full grid-cols-4 mb-4">
                  <TabsTrigger value="basic" className="text-base py-1">Info de Base</TabsTrigger>
                  <TabsTrigger value="stock" className="text-base py-1">Stock</TabsTrigger>
                  <TabsTrigger value="finance" className="text-base py-1">Finance</TabsTrigger>
                  <TabsTrigger value="technical" className="text-base py-1">Technique</TabsTrigger>
                </TabsList>

                <TabsContent value="basic">
                  <Card>
                    <CardContent className="space-y-4 pt-4">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-base">Nom</FormLabel>
                            <FormControl>
                              <Input {...field} value={field.value || ''} className="h-12" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="brand"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-base">Marque</FormLabel>
                            <FormControl>
                              <Input {...field} value={field.value || ''} className="h-12" />
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
                            <FormLabel className="text-base">Modèle</FormLabel>
                            <FormControl>
                              <Input {...field} value={field.value || ''} className="h-12" />
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
                            <FormLabel className="text-base">Numéro de série</FormLabel>
                            <FormControl>
                              <Input {...field} value={field.value || ''} className="h-12" />
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
                            <FormLabel className="text-base">Emplacement</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value || ''}>
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

                <TabsContent value="finance">
                  <Card>
                    <CardContent className="space-y-4 pt-4">
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="purchasePrice"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-base">Prix d&apos;achat</FormLabel>
                              <FormControl>
                                <Input type="number" step="0.01" min="0" {...field} value={field.value || ''} className="h-12" />
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
                              <FormLabel className="text-base">Prix de diagnostic</FormLabel>
                              <FormControl>
                                <Input type="number" step="0.01" min="0" {...field} value={field.value || ''} className="h-12" />
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
                              <FormLabel className="text-base">Statut de l'Appareil</FormLabel>
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
                              <FormLabel className="text-base">Destination</FormLabel>
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
                                Nécessite maintenance
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

              <div className="flex justify-end space-x-4 mt-4">
                <Button 
                  type="button" 
                  size="lg" 
                  className="px-8"
                  onClick={async () => {
                    try {
                      console.log('Submit button clicked directly');
                      
                      // Get current form values
                      const values = form.getValues();
                      console.log('Current form values:', values);
                      
                      // Force type to be DIAGNOSTIC_DEVICE
                      values.type = "DIAGNOSTIC_DEVICE";
                      
                      // Create cleaned data object
                      const formData = {
                        ...values,
                        type: "DIAGNOSTIC_DEVICE" as const,
                        purchasePrice: values.purchasePrice ? parseFloat(values.purchasePrice.toString()) : null,
                        sellingPrice: values.sellingPrice ? parseFloat(values.sellingPrice.toString()) : null,
                        stockQuantity: values.stockQuantity ? parseInt(values.stockQuantity.toString()) : 1,
                        destination: values.destination || "FOR_SALE",
                        requiresMaintenance: values.requiresMaintenance || false
                      };
                      
                      console.log('Submitting form data directly:', formData);
                      
                      // Call onSubmit directly
                      await onSubmit(formData);
                      
                      console.log('Form submitted successfully');
                    } catch (error) {
                      console.error('Error submitting form:', error);
                    }
                  }}
                >
                  {isEditMode ? "Mettre à jour" : "Ajouter"}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}
export default DiagnosticDeviceForm;