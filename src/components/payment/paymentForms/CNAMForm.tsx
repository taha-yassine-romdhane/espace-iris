import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { AlertCircle, CheckCircle2, Clock, FileWarning, FileCheck, Banknote } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";

interface CNAMFormProps {
  onSubmit: (data: any) => void;
  initialValues?: any;
  className?: string;
  onCancel?: () => void;
  selectedProducts?: any[];
  isRental?: boolean;
}

type CNAMDossierStatus = 'en_attente' | 'en_cours' | 'complement_dossier' | 'accepte' | 'refuse';

// Bond types for sales (achat)
type CNAMBondTypeAchat = 'masque' | 'cpap' | 'autre';

// Bond types for rentals (location)
type CNAMBondTypeLocation = 'vni_3mois' | 'vni_6mois' | 'concentrateur_3mois' | 'concentrateur_1mois' | 'autre_location';

// Combined bond type
type CNAMBondType = CNAMBondTypeAchat | CNAMBondTypeLocation;

interface CNAMBondConfig {
  type: CNAMBondType;
  defaultAmount: number;
  description: string;
  icon: React.ReactNode;
}

// Configuration for bond types
const CNAM_BOND_TYPES_ACHAT: Record<CNAMBondTypeAchat, CNAMBondConfig> = {
  masque: {
    type: 'masque',
    defaultAmount: 200,
    description: 'Bond d\'achat pour masque (200 DT)',
    icon: <FileCheck className="h-5 w-5 text-green-500" />
  },
  cpap: {
    type: 'cpap',
    defaultAmount: 1475,
    description: 'Bond d\'achat pour appareil CPAP (1475 DT)',
    icon: <FileCheck className="h-5 w-5 text-blue-500" />
  },
  autre: {
    type: 'autre',
    defaultAmount: 0,
    description: 'Autre type de prise en charge',
    icon: <Banknote className="h-5 w-5 text-gray-500" />
  }
};

// Configuration for rental bond types
const CNAM_BOND_TYPES_LOCATION: Record<CNAMBondTypeLocation, CNAMBondConfig> = {
  vni_3mois: {
    type: 'vni_3mois',
    defaultAmount: 1290,
    description: 'Bond de location pour VNI - 3 mois (1290 DT)',
    icon: <FileCheck className="h-5 w-5 text-green-500" />
  },
  vni_6mois: {
    type: 'vni_6mois',
    defaultAmount: 2580,
    description: 'Bond de location pour VNI - 6 mois (2580 DT)',
    icon: <FileCheck className="h-5 w-5 text-blue-500" />
  },
  concentrateur_3mois: {
    type: 'concentrateur_3mois',
    defaultAmount: 570,
    description: 'Bond de location pour Concentrateur Oxygen - 3 mois (570 DT)',
    icon: <FileCheck className="h-5 w-5 text-purple-500" />
  },
  concentrateur_1mois: {
    type: 'concentrateur_1mois',
    defaultAmount: 190,
    description: 'Bond de location pour Concentrateur Oxygen - 1 mois (190 DT)',
    icon: <FileCheck className="h-5 w-5 text-indigo-500" />
  },
  autre_location: {
    type: 'autre_location',
    defaultAmount: 0,
    description: 'Autre type de prise en charge location',
    icon: <Banknote className="h-5 w-5 text-gray-500" />
  }
};

// Combined bond types
const CNAM_BOND_TYPES: Record<CNAMBondType, CNAMBondConfig> = {
  ...CNAM_BOND_TYPES_ACHAT,
  ...CNAM_BOND_TYPES_LOCATION
};

interface CNAMHistoryEntry {
  date: string;
  status: CNAMDossierStatus;
  note?: string;
  user: string;
}

export default function CNAMForm({ onSubmit, initialValues, className, onCancel, selectedProducts = [], isRental = false }: CNAMFormProps) {
  // CNAM can only be a principal payment, not garantie or complement
  const [dossierStatus, setDossierStatus] = useState<CNAMDossierStatus>(initialValues?.etatDossier || 'en_attente');
  const [statusHistory, setStatusHistory] = useState<CNAMHistoryEntry[]>(initialValues?.statusHistory || []);
  
  // Set default bond type based on whether this is a rental or sale
  const defaultBondType = isRental ? 'autre_location' : 'autre';
  const [bondType, setBondType] = useState<CNAMBondType>(initialValues?.cnamBondType || defaultBondType);
  
  // Detect if we have masks or CPAP devices in the selected products
  const hasMask = selectedProducts.some(item => 
    (item.product?.type === 'ACCESSORY' && 
     (item.product?.name?.toLowerCase().includes('masque') || 
      item.product?.name?.toLowerCase().includes('mask'))) ||
    (item.type === 'ACCESSORY' && 
     (item.name?.toLowerCase().includes('masque') || 
      item.name?.toLowerCase().includes('mask')))
  );
  
  const hasCPAP = selectedProducts.some(item => 
    (item.medicalDevice?.type === 'CPAP') ||
    (item.type === 'MEDICAL_DEVICE' && 
     (item.name?.toLowerCase().includes('cpap') || 
      item.model?.toLowerCase().includes('cpap')))
  );
  
  // Detect if we have VNI or Concentrateur Oxygen devices for rental
  const hasVNI = selectedProducts.some(item => 
    (item.medicalDevice?.type === 'VNI') ||
    (item.type === 'MEDICAL_DEVICE' && 
     (item.name?.toLowerCase().includes('vni') || 
      item.model?.toLowerCase().includes('vni') ||
      item.name?.toLowerCase().includes('ventilation') ||
      item.model?.toLowerCase().includes('ventilation')))
  );
  
  const hasConcentrateur = selectedProducts.some(item => 
    (item.medicalDevice?.type === 'OXYGEN') ||
    (item.type === 'MEDICAL_DEVICE' && 
     (item.name?.toLowerCase().includes('oxygen') || 
      item.model?.toLowerCase().includes('oxygen') ||
      item.name?.toLowerCase().includes('concentrateur') || 
      item.model?.toLowerCase().includes('concentrateur')))
  );
  
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm({
    defaultValues: initialValues || {
      etatDossier: 'en_attente',
      dateDepose: null,
      dateRappel: null,
      dateAcceptation: null,
      dateExpiration: null,
      montantPriseEnCharge: '',
      note: '',
      cnamBondType: 'autre',
      statusHistory: []
    }
  });

  useEffect(() => {
    // Update form when dossier status changes
    setValue('etatDossier', dossierStatus);
  }, [dossierStatus, setValue]);

  useEffect(() => {
    // Update form when bond type changes
    setValue('cnamBondType', bondType);
    
    // Auto-set the amount based on bond type if it's not already set
    if (bondType !== 'autre' && bondType !== 'autre_location' && (!watch('montantPriseEnCharge') || initialValues?.cnamBondType !== bondType)) {
      // Safely get the default amount based on bond type
      let defaultAmount = 0;
      const bondTypeKey = bondType as string;
      
      if (bondTypeKey === 'masque' || bondTypeKey === 'cpap' || bondTypeKey === 'autre') {
        defaultAmount = CNAM_BOND_TYPES_ACHAT[bondTypeKey as CNAMBondTypeAchat]?.defaultAmount || 0;
      } else {
        defaultAmount = CNAM_BOND_TYPES_LOCATION[bondTypeKey as CNAMBondTypeLocation]?.defaultAmount || 0;
      }
      
      setValue('montantPriseEnCharge', defaultAmount.toString());
    }
  }, [bondType, setValue, watch, initialValues]);
  
  // Suggest appropriate bond type based on products in cart when component mounts
  useEffect(() => {
    if (!initialValues?.cnamBondType && selectedProducts.length > 0) {
      if (hasCPAP) {
        setBondType('cpap');
      } else if (hasMask) {
        setBondType('masque');
      }
    }
  }, [hasCPAP, hasMask, selectedProducts, initialValues]);

  const handleFormSubmit = (data: any) => {
    // Convert amount to number if it's a string
    const amount = typeof data.montantPriseEnCharge === 'string' ? 
      parseFloat(data.montantPriseEnCharge) : data.montantPriseEnCharge;
    
    // Create a new status history entry if the status has changed
    let updatedHistory = [...statusHistory];
    if (data.etatDossier && (!statusHistory.length || statusHistory[statusHistory.length - 1].status !== data.etatDossier)) {
      const newStatusEntry = {
        date: new Date().toISOString().split('T')[0],
        status: data.etatDossier,
        note: data.note || undefined,
        user: 'current_user' // This should be replaced with the actual logged-in user
      };
      
      // Update the status history
      updatedHistory = [...statusHistory, newStatusEntry];
      setStatusHistory(updatedHistory);
    }
    
    // Determine if the dossier is pending based on its status
    const isPending = !['accepte', 'refuse'].includes(data.etatDossier || 'en_attente');
    
    // Generate a unique dossier reference if not provided
    const dossierReference = data.reference || `CNAM-${new Date().getTime().toString(36).slice(-6).toUpperCase()}`;
    
    // Collect related product and medical device IDs
    const relatedProductIds = selectedProducts
      .filter(item => 
        (item.product?.type === 'ACCESSORY' && 
         (item.product?.name?.toLowerCase().includes('masque') || 
          item.product?.name?.toLowerCase().includes('mask'))) ||
        (item.type === 'ACCESSORY' && 
         (item.name?.toLowerCase().includes('masque') || 
          item.name?.toLowerCase().includes('mask')))
      )
      .map(item => item.id || item.product?.id);
    
    const relatedMedicalDeviceIds = selectedProducts
      .filter(item => 
        (item.medicalDevice?.type === 'CPAP') ||
        (item.type === 'MEDICAL_DEVICE' && 
         (item.name?.toLowerCase().includes('cpap') || 
          item.model?.toLowerCase().includes('cpap')))
      )
      .map(item => item.id || item.medicalDevice?.id);
    
    // Prepare the payment data
    const paymentData = {
      ...data,
      amount,
      type: 'cnam',
      classification: 'principale',
      timestamp: new Date().toISOString(),
      reference: dossierReference,
      dossierReference,
      isPending,
      requiresFollowUp: isPending,
      cnamBondType: bondType,
      relatedProductIds,
      relatedMedicalDeviceIds,
      statusHistory: updatedHistory,
      metadata: {
        bondType,
        originalAmount: amount,
        pendingStatus: isPending,
        lastUpdated: new Date().toISOString(),
        expectedCompletionDate: data.dateRappel || null
      }
    };
    
    // Submit the payment data
    onSubmit(paymentData);
    
    // Reset form state
    setDossierStatus('en_attente');
    
    // Reset bond type
    setBondType('autre');
  };
  
  const handleStatusChange = (value: string) => {
    setDossierStatus(value as CNAMDossierStatus);
  };
  
  const handleBondTypeChange = (value: string) => {
    setBondType(value as CNAMBondType);
  };
  
  // Get warning message if selected bond type doesn't match products
  const getBondTypeWarning = () => {
    if (!isRental) {
      // Warnings for sales (achat)
      if (bondType === 'masque' && !hasMask) {
        return {
          message: "Attention: Vous avez sélectionné un bond d'achat pour masque, mais aucun masque n'a été détecté dans les produits sélectionnés.",
          severity: "warning"
        };
      }
      
      if (bondType === 'cpap' && !hasCPAP) {
        return {
          message: "Attention: Vous avez sélectionné un bond d'achat pour CPAP, mais aucun appareil CPAP n'a été détecté dans les produits sélectionnés.",
          severity: "warning"
        };
      }
      
      if (bondType === 'autre' && (hasMask || hasCPAP)) {
        return {
          message: "Vous avez sélectionné 'Autre type de prise en charge' alors que des masques ou appareils CPAP ont été détectés. Veuillez vérifier si un bond spécifique serait plus approprié.",
          severity: "info"
        };
      }
    } else {
      // Warnings for rentals (location)
      if ((bondType === 'vni_3mois' || bondType === 'vni_6mois') && !hasVNI) {
        return {
          message: "Attention: Vous avez sélectionné un bond de location pour VNI, mais aucun appareil VNI n'a été détecté dans les produits sélectionnés.",
          severity: "warning"
        };
      }
      
      if ((bondType === 'concentrateur_3mois' || bondType === 'concentrateur_1mois') && !hasConcentrateur) {
        return {
          message: "Attention: Vous avez sélectionné un bond de location pour Concentrateur Oxygen, mais aucun concentrateur n'a été détecté dans les produits sélectionnés.",
          severity: "warning"
        };
      }
      
      if (bondType === 'autre_location' && (hasVNI || hasConcentrateur)) {
        return {
          message: "Vous avez sélectionné 'Autre type de prise en charge location' alors que des appareils VNI ou Concentrateurs ont été détectés. Veuillez vérifier si un bond spécifique serait plus approprié.",
          severity: "info"
        };
      }
    }
    
    return null;
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className={cn("space-y-6", className)}>
      
      <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 p-2 rounded-md">
        <span className="font-medium">Classification:</span> Principal (uniquement)
      </div>
      
      {/* getStatusAlert() */}
      
      {/* Form Fields */}
      <div className="space-y-4">
        {/* Bond Type Selection */}
        <div>
          <Label htmlFor="cnamBondType" className="font-medium">Type de bond</Label>
          <Select 
            value={bondType} 
            onValueChange={handleBondTypeChange}
          >
            <SelectTrigger>
              <SelectValue placeholder="Sélectionner le type de bond" />
            </SelectTrigger>
            <SelectContent>
              {!isRental ? (
                // Bond types for sales (achat)
                <>
                  <SelectItem value="masque">
                    <div className="flex items-center gap-2">
                      {CNAM_BOND_TYPES_ACHAT.masque?.icon || <FileCheck className="h-5 w-5 text-green-500" />}
                      <span>Bond d'achat masque (200 DT)</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="cpap">
                    <div className="flex items-center gap-2">
                      {CNAM_BOND_TYPES_ACHAT.cpap?.icon || <FileCheck className="h-5 w-5 text-blue-500" />}
                      <span>Bond d'achat CPAP (1475 DT)</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="autre">
                    <div className="flex items-center gap-2">
                      {CNAM_BOND_TYPES_ACHAT.autre?.icon || <Banknote className="h-5 w-5 text-gray-500" />}
                      <span>Autre type de prise en charge</span>
                    </div>
                  </SelectItem>
                </>
              ) : (
                // Bond types for rentals (location)
                <>
                  <SelectItem value="vni_3mois">
                    <div className="flex items-center gap-2">
                      {CNAM_BOND_TYPES_LOCATION.vni_3mois?.icon || <FileCheck className="h-5 w-5 text-green-500" />}
                      <span>Bond de location VNI - 3 mois (1290 DT)</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="vni_6mois">
                    <div className="flex items-center gap-2">
                      {CNAM_BOND_TYPES_LOCATION.vni_6mois?.icon || <FileCheck className="h-5 w-5 text-blue-500" />}
                      <span>Bond de location VNI - 6 mois (2580 DT)</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="concentrateur_3mois">
                    <div className="flex items-center gap-2">
                      {CNAM_BOND_TYPES_LOCATION.concentrateur_3mois?.icon || <FileCheck className="h-5 w-5 text-purple-500" />}
                      <span>Bond de location Concentrateur - 3 mois (570 DT)</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="concentrateur_1mois">
                    <div className="flex items-center gap-2">
                      {CNAM_BOND_TYPES_LOCATION.concentrateur_1mois?.icon || <FileCheck className="h-5 w-5 text-indigo-500" />}
                      <span>Bond de location Concentrateur - 1 mois (190 DT)</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="autre_location">
                    <div className="flex items-center gap-2">
                      {CNAM_BOND_TYPES_LOCATION.autre_location?.icon || <Banknote className="h-5 w-5 text-gray-500" />}
                      <span>Autre type de prise en charge location</span>
                    </div>
                  </SelectItem>
                </>
              )}
            </SelectContent>
          </Select>
          
          {/* Display bond type warning if applicable */}
          {(() => {
            const warning = getBondTypeWarning();
            if (warning) {
              const isWarning = warning.severity === 'warning';
              return (
                <Alert className={`bg-${isWarning ? 'amber' : 'blue'}-50 border-${isWarning ? 'amber' : 'blue'}-200 mt-2`}>
                  <AlertCircle className={`h-4 w-4 text-${isWarning ? 'amber' : 'blue'}-500`} />
                  <AlertTitle>{isWarning ? 'Attention' : 'Info'}</AlertTitle>
                  <AlertDescription>{warning.message}</AlertDescription>
                </Alert>
              );
            }
            return null;
          })()}
          
          {/* Bond type info card */}
          {bondType !== 'autre' && bondType !== 'autre_location' && (
            <Card className="mt-2 border-blue-100 bg-blue-50">
              <CardContent className="pt-4 pb-2">
                <div className="flex items-center gap-2">
                  {(() => {
                    // Safely get the icon based on bond type
                    const bondTypeKey = bondType as string;
                    if (bondTypeKey === 'masque' || bondTypeKey === 'cpap' || bondTypeKey === 'autre') {
                      return CNAM_BOND_TYPES_ACHAT[bondTypeKey as CNAMBondTypeAchat]?.icon || <FileCheck className="h-5 w-5" />;
                    } else {
                      return CNAM_BOND_TYPES_LOCATION[bondTypeKey as CNAMBondTypeLocation]?.icon || <FileCheck className="h-5 w-5" />;
                    }
                  })()}
                  <div>
                    <h4 className="font-medium">{(() => {
                      // Safely get the description based on bond type
                      const bondTypeKey = bondType as string;
                      if (bondTypeKey === 'masque' || bondTypeKey === 'cpap' || bondTypeKey === 'autre') {
                        return CNAM_BOND_TYPES_ACHAT[bondTypeKey as CNAMBondTypeAchat]?.description || 'Bond d\'achat';
                      } else {
                        return CNAM_BOND_TYPES_LOCATION[bondTypeKey as CNAMBondTypeLocation]?.description || 'Bond de location';
                      }
                    })()}</h4>
                    <p className="text-sm text-gray-600">
                      {bondType === 'masque' 
                        ? 'Ce bond est applicable pour les masques. Montant fixe de 200 DT.'
                        : bondType === 'cpap'
                          ? 'Ce bond est applicable pour les appareils CPAP. Montant fixe de 1475 DT.'
                          : bondType === 'vni_3mois'
                            ? 'Ce bond est applicable pour les appareils VNI. Montant fixe de 1290 DT.'
                            : bondType === 'vni_6mois'
                              ? 'Ce bond est applicable pour les appareils VNI. Montant fixe de 2580 DT.'
                              : bondType === 'concentrateur_3mois'
                                ? 'Ce bond est applicable pour les concentrateurs. Montant fixe de 570 DT.'
                                : 'Ce bond est applicable pour les concentrateurs. Montant fixe de 190 DT.'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Status Selection */}
        <div>
          <Label htmlFor="etatDossier" className="font-medium">État du dossier</Label>
          <Select 
            value={dossierStatus} 
            onValueChange={handleStatusChange}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Sélectionner l'état du dossier" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="en_attente">En attente</SelectItem>
              <SelectItem value="en_cours">En cours</SelectItem>
              <SelectItem value="complement_dossier">Complément de dossier</SelectItem>
              <SelectItem value="accepte">Accepté</SelectItem>
              <SelectItem value="refuse">Refusé</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Fields for En Attente */}
        {dossierStatus === 'en_attente' && (
          <>
            <div>
              <Label htmlFor="dateRappel" className="font-medium">Date rappel</Label>
              <DatePicker
                id="dateRappel"
                value={watch("dateRappel")}
                onChange={(date) => setValue("dateRappel", date)}
                placeholder="Choisir Date"
              />
            </div>
            <div>
              <Label htmlFor="note" className="font-medium">Note</Label>
              <Textarea 
                id="note"
                placeholder="Ajouter une note"
                {...register("note")}
              />
            </div>
          </>
        )}

        {/* Fields for En Cours */}
        {dossierStatus === 'en_cours' && (
          <>
            <div>
              <Label htmlFor="dateDepose" className="font-medium">Date dépôt</Label>
              <DatePicker
                id="dateDepose"
                value={watch("dateDepose")}
                onChange={(date) => setValue("dateDepose", date)}
                placeholder="Choisir Date"
              />
            </div>
            <div>
              <Label htmlFor="dateRappel" className="font-medium">Date rappel</Label>
              <DatePicker
                id="dateRappel"
                value={watch("dateRappel")}
                onChange={(date) => setValue("dateRappel", date)}
                placeholder="Choisir Date"
              />
            </div>
            <div>
              <Label htmlFor="note" className="font-medium">Note</Label>
              <Textarea 
                id="note"
                placeholder="Ajouter une note"
                {...register("note")}
              />
            </div>
          </>
        )}

        {/* Fields for Complément de dossier */}
        {dossierStatus === 'complement_dossier' && (
          <>
            <div>
              <Label htmlFor="dateRappel" className="font-medium">Date rappel</Label>
              <DatePicker
                id="dateRappel"
                value={watch("dateRappel")}
                onChange={(date) => setValue("dateRappel", date)}
                placeholder="Choisir Date"
              />
            </div>
            <div>
              <Label htmlFor="note" className="font-medium">Note</Label>
              <Textarea 
                id="note"
                placeholder="Ajouter une note"
                {...register("note")}
              />
            </div>
          </>
        )}

        {/* Fields for Accepté */}
        {dossierStatus === 'accepte' && (
          <>
            <div>
              <Label htmlFor="dateAcceptation" className="font-medium">Date acceptation</Label>
              <DatePicker
                id="dateAcceptation"
                value={watch("dateAcceptation")}
                onChange={(date) => setValue("dateAcceptation", date)}
                placeholder="Choisir Date"
              />
              {!watch("dateAcceptation") && (
                <p className="text-sm text-red-500 mt-1">Date d'acceptation requise</p>
              )}
            </div>
            <div>
              <Label htmlFor="dateExpiration" className="font-medium">Date expiration</Label>
              <DatePicker
                id="dateExpiration"
                value={watch("dateExpiration")}
                onChange={(date) => setValue("dateExpiration", date)}
                placeholder="Choisir Date"
              />
              {!watch("dateExpiration") && (
                <p className="text-sm text-red-500 mt-1">Date d'expiration requise</p>
              )}
            </div>
            <div>
              <Label htmlFor="montantPriseEnCharge" className="font-medium">Montant de prise en charge CNAM</Label>
              <Input 
                id="montantPriseEnCharge"
                placeholder="Valeur"
                {...register("montantPriseEnCharge", { required: "Montant de prise en charge est requis" })}
              />
              {errors.montantPriseEnCharge && (
                <p className="text-sm text-red-500 mt-1">{errors.montantPriseEnCharge.message as string}</p>
              )}
            </div>
          </>
        )}

        {/* Fields for Refusé */}
        {dossierStatus === 'refuse' && (
          <div>
            <Label htmlFor="note" className="font-medium">Motif de refus</Label>
            <Textarea 
              id="note"
              placeholder="Ajouter le motif de refus"
              {...register("note", { required: "Le motif de refus est requis" })}
            />
            {errors.note && (
              <p className="text-sm text-red-500 mt-1">{errors.note.message as string}</p>
            )}
          </div>
        )}

        {/* Status History */}
        {statusHistory.length > 0 && (
          <div className="mt-6">
            <h3 className="text-md font-medium mb-2">Historique du dossier</h3>
            <div className="border rounded-md overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left">Date</th>
                    <th className="px-4 py-2 text-left">Statut</th>
                    <th className="px-4 py-2 text-left">Note</th>
                    <th className="px-4 py-2 text-left">Utilisateur</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {statusHistory.map((entry, index) => (
                    <tr key={index}>
                      <td className="px-4 py-2">{new Date(entry.date).toLocaleDateString()}</td>
                      <td className="px-4 py-2">
                        {entry.status === 'en_attente' && 'En attente'}
                        {entry.status === 'en_cours' && 'En cours'}
                        {entry.status === 'complement_dossier' && 'Complément de dossier'}
                        {entry.status === 'accepte' && 'Accepté'}
                        {entry.status === 'refuse' && 'Refusé'}
                      </td>
                      <td className="px-4 py-2">{entry.note || '-'}</td>
                      <td className="px-4 py-2">{entry.user}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-3 justify-end">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Annuler
          </Button>
        )}
        <Button type="submit">
          {dossierStatus === 'refuse' ? 'Enregistrer le refus' : 'Sauvegarder'}
        </Button>
      </div>
    </form>
  );
}