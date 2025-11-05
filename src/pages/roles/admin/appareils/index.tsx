import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/components/ui/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { TabSwitcher } from "@/components/appareils/TabSwitcher";
import { MedicalDeviceForm } from "@/components/appareils/forms/MedicalDeviceForm";
import { DiagnosticDeviceForm } from "@/components/appareils/forms/DiagnosticDeviceForm";
import { AccessoryForm } from "@/components/appareils/forms/AccessoryForm";
import { SparePartForm } from "@/components/appareils/forms/SparePartForm";
import { MedicalDevicesExcelTable } from "@/components/appareils/MedicalDevicesExcelTable";
import { DiagnosticDevicesExcelTable } from "@/components/appareils/DiagnosticDevicesExcelTable";
import { AccessoriesExcelTable } from "@/components/appareils/AccessoriesExcelTable";
import { SparePartsExcelTable } from "@/components/appareils/SparePartsExcelTable";
import { StockLocationsExcelTable } from "@/components/appareils/StockLocationsExcelTable";
import { LocationForm } from "@/components/appareils/LocationForm";
import { ParametersViewDialog } from "@/components/appareils/ParametersViewDialog";
import { Product, ProductType } from "@/types";
import { PlusCircle } from "lucide-react";
import { Wrench, Trash2, Pencil } from "lucide-react";
import { RepairForm } from "@/components/appareils/forms/RepairForm";
import { RepairHistoryDialog } from "@/components/appareils/RepairHistoryDialog";
import AccessoryImportExport from "@/components/accessories/AccessoryImportExport";
import SparePartImportExport from "@/components/spareparts/SparePartImportExport";
import MedicalDeviceImportExport from "@/components/medicaldevices/MedicalDeviceImportExport";
import DiagnosticDeviceImportExport from "@/components/diagnosticdevices/DiagnosticDeviceImportExport";

export default function AppareilsPage() {
  const [activeTab, setActiveTab] = useState<string>("medical-devices");
  const [isOpen, setIsOpen] = useState(false);
  const [isLocationFormOpen, setIsLocationFormOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentProduct, setCurrentProduct] = useState<Product | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [isRepairDialogOpen, setIsRepairDialogOpen] = useState(false);
  const [productToRepair, setProductToRepair] = useState<Product | null>(null);
  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);
  const [productToViewHistory, setProductToViewHistory] = useState<Product | null>(null);
  const [isParametersDialogOpen, setIsParametersDialogOpen] = useState(false);
  const [productToViewParameters, setProductToViewParameters] = useState<Product | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch devices
  const { data: products } = useQuery({
    queryKey: ["medical-devices"],
    queryFn: async () => {
      const response = await fetch("/api/medical-devices");
      if (!response.ok) {
        throw new Error("Failed to fetch devices");
      }
      return response.json();
    },
  });

  // Fetch stock locations
  const { data: stockLocations } = useQuery({
    queryKey: ["stock-locations"],
    queryFn: async () => {
      const response = await fetch("/api/stock-locations");
      if (!response.ok) {
        throw new Error("Failed to fetch stock locations");
      }
      return response.json();
    },
  });

  // Add device mutation
  const addDeviceMutation = useMutation({
    mutationFn: async (newProduct: Product) => {
      const response = await fetch("/api/medical-devices", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newProduct),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error:', response.status, errorText);
        throw new Error(`Failed to add device: ${response.status} - ${errorText}`);
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["medical-devices"] });
      setIsOpen(false);
      toast({
        title: "Succès",
        description: "L'appareil a été ajouté avec succès",
      });
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de l'ajout de l'appareil",
        variant: "destructive",
      });
    },
  });

  // Delete device mutation
  const deleteDeviceMutation = useMutation({
    mutationFn: async (product: Product) => {
      const response = await fetch(`/api/medical-devices/${product.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete device");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["medical-devices"] });
      toast({
        title: "Succès",
        description: "L'appareil a été supprimé avec succès",
      });
    },
  });

  const handleEdit = async (product: Product) => {
    try {
      // Fetch complete product data when editing
      const response = await fetch(`/api/medical-devices/${product.id}`);
      if (!response.ok) {
        toast({
          title: "Erreur",
          description: "Impossible de récupérer les données du produit",
          variant: "destructive",
        });
        return;
      }
      const completeProduct = await response.json();

      // Transform numeric values to strings for form
      const formattedProduct = {
        ...completeProduct,
        purchasePrice: completeProduct.purchasePrice?.toString() || "",
        sellingPrice: completeProduct.sellingPrice?.toString() || "",
      };

      // If it's a diagnostic device, fetch its parameters
      if (product.type === 'DIAGNOSTIC_DEVICE') {
        try {
          const parametersResponse = await fetch(`/api/diagnostic-parameters/${product.id}`);
          if (parametersResponse.ok) {
            const parametersData = await parametersResponse.json();
            formattedProduct.parameters = parametersData;
          }
        } catch (paramError) {
          console.error("Error fetching parameters:", paramError);
          // Continue even if parameters fetch fails
        }
      }

      setCurrentProduct(formattedProduct);
      setIsEditMode(true);
      setIsOpen(true);
    } catch (error) {
      console.error("Error fetching product details:", error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de la récupération des données",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (data: any) => {
    try {
      if (isEditMode && currentProduct) {
        // Use the medical-devices endpoint for all device types
        const apiEndpoint = '/api/medical-devices';

        // Update existing product
        const response = await fetch(`${apiEndpoint}/${currentProduct.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...data,
            type: currentProduct.type,
          }),
        });


        const responseData = await response.json();

        if (!response.ok) {
          console.error("Update error:", responseData);
          toast({
            title: "Erreur",
            description: responseData.error || "Une erreur est survenue lors de la modification",
            variant: "destructive",
          });
          return;
        }

        await queryClient.invalidateQueries({ queryKey: ["medical-devices"] });
        toast({
          title: "Succès",
          description: "L'appareil a été modifié avec succès",
        });
        setIsOpen(false);
        setCurrentProduct(null);
        setIsEditMode(false);
      } else {
        // Add new product
        await addDeviceMutation.mutateAsync(data);
        setIsOpen(false);
        setCurrentProduct(null);
        setIsEditMode(false);
      }
    } catch (error) {
      console.error("Submit error:", error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de l'opération",
        variant: "destructive",
      });
    }
  };

  const handleDelete = (product: Product) => {
    setProductToDelete(product);
    setIsDeleteDialogOpen(true);
  };

  const handleRepair = (product: Product) => {
    setProductToRepair(product);
    setIsRepairDialogOpen(true);
  };

  const handleViewParameters = (product: Product) => {
    setProductToViewParameters(product);
    setIsParametersDialogOpen(true);
  };

  const confirmDelete = () => {
    if (productToDelete) {
      deleteDeviceMutation.mutate(productToDelete);
      setIsDeleteDialogOpen(false);
      setProductToDelete(null);
    }
  };


  const getFormComponent = () => {
    if (!currentProduct && !isEditMode) {
      // For new products, show form based on active tab
      switch (activeTab) {
        case "medical-devices":
          return <MedicalDeviceForm onSubmit={handleSubmit} stockLocations={stockLocations || []} />;
        case "diagnostic-devices":
          return <DiagnosticDeviceForm onSubmit={handleSubmit} stockLocations={stockLocations || []} />;
        case "accessories":
          return <AccessoryForm onSubmit={handleSubmit} stockLocations={stockLocations || []} />;
        case "spare-parts":
          return <SparePartForm onSubmit={handleSubmit} stockLocations={stockLocations || []} />;
        default:
          return null;
      }
    }

    // For editing existing products
    if (currentProduct) {
      switch (currentProduct.type) {
        case "MEDICAL_DEVICE":
          return <MedicalDeviceForm initialData={currentProduct} onSubmit={handleSubmit} stockLocations={stockLocations || []} isEditMode />;
        case "DIAGNOSTIC_DEVICE":
          return <DiagnosticDeviceForm initialData={currentProduct} onSubmit={handleSubmit} stockLocations={stockLocations || []} isEditMode />;
        case "ACCESSORY":
          return <AccessoryForm initialData={currentProduct} onSubmit={handleSubmit} stockLocations={stockLocations || []} isEditMode />;
        case "SPARE_PART":
          return <SparePartForm initialData={currentProduct} onSubmit={handleSubmit} stockLocations={stockLocations || []} isEditMode />;
        default:
          return null;
      }
    }
  };

  const renderActionButtons = (product: Product) => {
    const canRepair = product.type === ProductType.MEDICAL_DEVICE ||
      product.type === ProductType.DIAGNOSTIC_DEVICE;

    return (
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          onClick={() => handleEdit(product)}
        >
          <Pencil className="h-4 w-4" />
        </Button>
        {canRepair && (
          <Button
            variant="outline"
            size="icon"
            onClick={() => handleRepair(product)}
          >
            <Wrench className="h-4 w-4" />
          </Button>
        )}
        <Button
          variant="outline"
          size="icon"
          onClick={() => handleDelete(product)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    );
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Gestion des Appareils</h1>
      </div>

      <TabSwitcher activeTab={activeTab} onTabChange={setActiveTab} />

      <div className="mt-4">
        {activeTab === "medical-devices" && (
          <div className="space-y-6">
            <MedicalDevicesExcelTable
              devices={products?.filter((p: any) => p.type === 'MEDICAL_DEVICE') || []}
              stockLocations={stockLocations || []}
              onDeviceCreate={async (device) => {
                await addDeviceMutation.mutateAsync({ ...device, type: 'MEDICAL_DEVICE' } as any);
              }}
              onDeviceUpdate={async (device) => {
                const response = await fetch(`/api/medical-devices/${device.id}`, {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ ...device, type: 'MEDICAL_DEVICE' }),
                });
                if (!response.ok) throw new Error("Failed to update");
                await queryClient.invalidateQueries({ queryKey: ["medical-devices"] });
              }}
              onDeviceDelete={async (id) => {
                const response = await fetch(`/api/medical-devices/${id}`, {
                  method: "DELETE",
                });
                if (!response.ok) throw new Error("Failed to delete");
                await queryClient.invalidateQueries({ queryKey: ["medical-devices"] });
              }}
              importExportComponent={
                <MedicalDeviceImportExport
                  onImportSuccess={() => {
                    queryClient.invalidateQueries({ queryKey: ["medical-devices"] });
                  }}
                  stockLocations={stockLocations || []}
                />
              }
            />
          </div>
        )}
        {activeTab === "diagnostic-devices" && (
          <div className="space-y-6">
            <DiagnosticDevicesExcelTable
              devices={products?.filter((p: any) => p.type === 'DIAGNOSTIC_DEVICE') || []}
              stockLocations={stockLocations || []}
              onDeviceCreate={async (device) => {
                await addDeviceMutation.mutateAsync({ ...device, type: 'DIAGNOSTIC_DEVICE' } as any);
              }}
              onDeviceUpdate={async (device) => {
                const response = await fetch(`/api/medical-devices/${device.id}`, {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ ...device, type: 'DIAGNOSTIC_DEVICE' }),
                });
                if (!response.ok) throw new Error("Failed to update");
                await queryClient.invalidateQueries({ queryKey: ["medical-devices"] });
              }}
              onDeviceDelete={async (id) => {
                const response = await fetch(`/api/medical-devices/${id}`, {
                  method: "DELETE",
                });
                if (!response.ok) throw new Error("Failed to delete");
                await queryClient.invalidateQueries({ queryKey: ["medical-devices"] });
              }}
              importExportComponent={
                <DiagnosticDeviceImportExport
                  onImportSuccess={() => {
                    queryClient.invalidateQueries({ queryKey: ["medical-devices"] });
                  }}
                  stockLocations={stockLocations || []}
                />
              }
            />
          </div>
        )}
        {activeTab === "accessories" && (
          <div className="space-y-6">
            <div className="flex justify-end items-center">
              <AccessoryImportExport
                onImportSuccess={() => {
                  queryClient.invalidateQueries({ queryKey: ["medical-devices"] });
                }}
                stockLocations={stockLocations || []}
              />
            </div>
            <AccessoriesExcelTable
              accessories={products?.filter((p: any) => p.type === 'ACCESSORY') || []}
              stockLocations={stockLocations || []}
              onAccessoryCreate={async (accessory) => {
                const cleanData = {
                  name: accessory.name,
                  type: 'ACCESSORY',
                  brand: accessory.brand,
                  model: accessory.model,
                  description: accessory.description,
                  purchasePrice: accessory.purchasePrice,
                  sellingPrice: accessory.sellingPrice,
                  status: accessory.status,
                  stockLocationId: accessory.stockLocationId,
                  stockQuantity: accessory.stockQuantity || 0,
                  minQuantity: accessory.minQuantity
                };
                await addDeviceMutation.mutateAsync(cleanData as any);
              }}
              onAccessoryUpdate={async (accessory) => {
                // Table already sends clean data, just pass it through with type
                const response = await fetch(`/api/medical-devices/${accessory.id}`, {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ ...accessory, type: 'ACCESSORY' }),
                });
                if (!response.ok) {
                  const error = await response.json();
                  console.error('Update failed:', error);
                  throw new Error("Failed to update");
                }
                await queryClient.invalidateQueries({ queryKey: ["medical-devices"] });
              }}
              onAccessoryDelete={async (id) => {
                const response = await fetch(`/api/medical-devices/${id}`, {
                  method: "DELETE",
                });
                if (!response.ok) throw new Error("Failed to delete");
                await queryClient.invalidateQueries({ queryKey: ["medical-devices"] });
              }}
              onRefresh={() => {
                queryClient.invalidateQueries({ queryKey: ["medical-devices"] });
              }}
            />
          </div>
        )}
        {activeTab === "spare-parts" && (
          <div className="space-y-6">
            <div className="flex justify-end items-center">
              <SparePartImportExport
                onImportSuccess={() => {
                  queryClient.invalidateQueries({ queryKey: ["medical-devices"] });
                }}
                stockLocations={stockLocations || []}
              />
            </div>
            <SparePartsExcelTable
              spareParts={products?.filter((p: any) => p.type === 'SPARE_PART') || []}
              stockLocations={stockLocations || []}
              onSparePartCreate={async (sparePart) => {
                const cleanData = {
                  name: sparePart.name,
                  type: 'SPARE_PART',
                  brand: sparePart.brand,
                  model: sparePart.model,
                  partNumber: sparePart.partNumber,
                  compatibleWith: sparePart.compatibleWith,
                  description: sparePart.description,
                  purchasePrice: sparePart.purchasePrice,
                  sellingPrice: sparePart.sellingPrice,
                  status: sparePart.status,
                  stockLocationId: sparePart.stockLocationId,
                  stockQuantity: sparePart.stockQuantity || 0,
                  minQuantity: sparePart.minQuantity
                };
                await addDeviceMutation.mutateAsync(cleanData as any);
              }}
              onSparePartUpdate={async (sparePart) => {
                // Table already sends clean data, just pass it through with type
                const response = await fetch(`/api/medical-devices/${sparePart.id}`, {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ ...sparePart, type: 'SPARE_PART' }),
                });
                if (!response.ok) {
                  const error = await response.json();
                  console.error('Update failed:', error);
                  throw new Error("Failed to update");
                }
                await queryClient.invalidateQueries({ queryKey: ["medical-devices"] });
              }}
              onSparePartDelete={async (id) => {
                const response = await fetch(`/api/medical-devices/${id}`, {
                  method: "DELETE",
                });
                if (!response.ok) throw new Error("Failed to delete");
                await queryClient.invalidateQueries({ queryKey: ["medical-devices"] });
              }}
              onRefresh={() => {
                queryClient.invalidateQueries({ queryKey: ["medical-devices"] });
              }}
            />
          </div>
        )}
        {activeTab === "locations" && (
          <div className="space-y-6">
            <StockLocationsExcelTable />
          </div>
        )}
      </div>
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Êtes-vous sûr de vouloir supprimer cet appareil ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action ne peut pas être annulée. Cela supprimera définitivement l&apos;appareil
              {productToDelete && ` "${productToDelete.name}"`}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={isRepairDialogOpen} onOpenChange={setIsRepairDialogOpen}>
        <DialogContent className="max-w-[600px] max-h-[800px] rounded-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Enregistrer une réparation</DialogTitle>
            <DialogDescription>
              Remplissez les détails de la réparation pour cet appareil.
            </DialogDescription>
          </DialogHeader>
          {productToRepair && (
            <RepairForm
              medicalDeviceId={productToRepair.id}
              productName={productToRepair.name}
              onSuccess={() => {
                setIsRepairDialogOpen(false);
                setProductToRepair(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {productToViewHistory && (
        <RepairHistoryDialog
          isOpen={isHistoryDialogOpen}
          onClose={() => {
            setIsHistoryDialogOpen(false);
            setProductToViewHistory(null);
          }}
          medicalDeviceId={productToViewHistory.id}
        />
      )}

      <ParametersViewDialog
        isOpen={isParametersDialogOpen}
        onClose={() => {
          setIsParametersDialogOpen(false);
          setProductToViewParameters(null);
        }}
        product={productToViewParameters}
      />
    </div>
  );
}