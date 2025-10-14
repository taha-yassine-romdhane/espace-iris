import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/components/ui/use-toast';
import { Upload, Download, FileSpreadsheet, AlertTriangle } from 'lucide-react';
import * as XLSX from 'xlsx';

interface MedicalDeviceImportExportProps {
  onImportSuccess: () => void;
  stockLocations: Array<{ id: string; name: string }>;
}

interface ValidationError {
  row: number;
  field: string;
  message: string;
}

interface MedicalDeviceRow {
  name: string;
  type: string;
  brand?: string;
  model?: string;
  serialNumber?: string;
  stockLocationName?: string;
  purchasePrice?: number;
  sellingPrice?: number;
  rentalPrice?: number;
  technicalSpecs?: string;
  availableForRent?: boolean;
  requiresMaintenance?: boolean;
  status?: string;
}

export function MedicalDeviceImportExport({ onImportSuccess, stockLocations }: MedicalDeviceImportExportProps) {
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [previewData, setPreviewData] = useState<MedicalDeviceRow[]>([]);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Template structure matching the MedicalDeviceForm fields
  const getTemplateData = () => {
    const firstLocationName = stockLocations.length > 0 ? stockLocations[0].name : 'Bureau Principal';
    return [
      {
        name: 'CPAP',
        type: 'MEDICAL_DEVICE',
        brand: 'Philips',
        model: 'DreamStation 2',
        serialNumber: 'DS2-2024-001',
        stockLocationName: firstLocationName,
        purchasePrice: 1500.0,
        sellingPrice: 2200.0,
        rentalPrice: 45.0,
        technicalSpecs: 'Auto-CPAP avec humidificateur intégré',
        availableForRent: true,
        requiresMaintenance: false,
        status: 'ACTIVE'
      },
      {
        name: 'VNI',
        type: 'MEDICAL_DEVICE',
        brand: 'ResMed',
        model: 'Stellar 150',
        serialNumber: 'ST150-2024-002',
        stockLocationName: firstLocationName,
        purchasePrice: 2800.0,
        sellingPrice: 3500.0,
        rentalPrice: 65.0,
        technicalSpecs: 'Ventilateur non invasif bi-level',
        availableForRent: true,
        requiresMaintenance: false,
        status: 'ACTIVE'
      }
    ];
  };

  const downloadTemplate = () => {
    const templateData = getTemplateData();
    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Appareils_Medicaux');
    
    // Add headers styling and instructions
    const locationNames = stockLocations.map(loc => loc.name).join(', ');
    const headers = [
      'Nom (CPAP, VNI, Concentrateur O², Vi, Bouteil O², Autre)',
      'Type (MEDICAL_DEVICE)',
      'Marque',
      'Modèle',
      'Numéro de Série (obligatoire)',
      `Lieu de Stockage (${locationNames})`,
      'Prix d\'Achat',
      'Prix de Vente',
      'Prix de Location par jour',
      'Spécifications Techniques',
      'Disponible Location (true/false)',
      'Nécessite Maintenance (true/false)',
      'Statut (ACTIVE, MAINTENANCE, RETIRED, RESERVED)'
    ];
    
    XLSX.utils.sheet_add_aoa(wb.Sheets['Appareils_Medicaux'], [headers], { origin: 'A1' });
    
    XLSX.writeFile(wb, 'template_appareils_medicaux.xlsx');
    
    toast({
      title: 'Succès',
      description: 'Template téléchargé avec succès',
    });
  };

  const validateRow = (row: MedicalDeviceRow, index: number): ValidationError[] => {
    const errors: ValidationError[] = [];
    
    // Required field validation
    if (!row.name || row.name.trim() === '') {
      errors.push({
        row: index + 2,
        field: 'name',
        message: 'Le nom est obligatoire'
      });
    }

    // Type validation
    if (!row.type || row.type !== 'MEDICAL_DEVICE') {
      errors.push({
        row: index + 2,
        field: 'type',
        message: 'Le type doit être "MEDICAL_DEVICE"'
      });
    }

    // Serial number validation (required for medical devices)
    if (!row.serialNumber || row.serialNumber.trim() === '') {
      errors.push({
        row: index + 2,
        field: 'serialNumber',
        message: 'Le numéro de série est obligatoire pour les appareils médicaux'
      });
    }

    // Stock location validation
    if (row.stockLocationName) {
      const locationExists = stockLocations.find(
        loc => loc.name.toLowerCase() === row.stockLocationName?.toLowerCase()
      );
      if (!locationExists) {
        errors.push({
          row: index + 2,
          field: 'stockLocationName',
          message: `Lieu de stockage "${row.stockLocationName}" n'existe pas. Lieux disponibles: ${stockLocations.map(l => l.name).join(', ')}`
        });
      }
    }

    // Price validation
    if (row.purchasePrice !== undefined && row.purchasePrice < 0) {
      errors.push({
        row: index + 2,
        field: 'purchasePrice',
        message: 'Le prix d\'achat doit être positif'
      });
    }

    if (row.sellingPrice !== undefined && row.sellingPrice < 0) {
      errors.push({
        row: index + 2,
        field: 'sellingPrice',
        message: 'Le prix de vente doit être positif'
      });
    }

    if (row.rentalPrice !== undefined && row.rentalPrice < 0) {
      errors.push({
        row: index + 2,
        field: 'rentalPrice',
        message: 'Le prix de location doit être positif'
      });
    }

    // Status validation
    const validStatuses = ['ACTIVE', 'MAINTENANCE', 'RETIRED', 'RESERVED'];
    if (row.status && !validStatuses.includes(row.status)) {
      errors.push({
        row: index + 2,
        field: 'status',
        message: `Statut invalide. Valeurs autorisées: ${validStatuses.join(', ')}`
      });
    }

    // Device name validation
    const validNames = ['CPAP', 'VNI', 'Concentrateur O²', 'Vi', 'Bouteil O²', 'Autre'];
    if (row.name && !validNames.includes(row.name)) {
      errors.push({
        row: index + 2,
        field: 'name',
        message: `Nom d'appareil invalide. Valeurs autorisées: ${validNames.join(', ')}`
      });
    }

    return errors;
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        if (jsonData.length < 2) {
          toast({
            title: 'Erreur',
            description: 'Le fichier Excel doit contenir au moins une ligne de données',
            variant: 'destructive',
          });
          return;
        }

        // Skip header row and convert to objects, filter out empty rows
        const rows = jsonData.slice(1)
          .filter((row: any) => row[0] && row[0].toString().trim() !== '') // Only rows with a name
          .map((row: any) => ({
            name: row[0]?.toString().trim() || '',
            type: row[1]?.toString().trim() || 'MEDICAL_DEVICE',
            brand: row[2]?.toString().trim() || '',
            model: row[3]?.toString().trim() || '',
            serialNumber: row[4]?.toString().trim() || '',
            stockLocationName: row[5]?.toString().trim() || '',
            purchasePrice: row[6] ? Number(row[6]) : undefined,
            sellingPrice: row[7] ? Number(row[7]) : undefined,
            rentalPrice: row[8] ? Number(row[8]) : undefined,
            technicalSpecs: row[9]?.toString().trim() || '',
            availableForRent: row[10] ? (row[10].toString().toLowerCase() === 'true') : false,
            requiresMaintenance: row[11] ? (row[11].toString().toLowerCase() === 'true') : false,
            status: row[12]?.toString().trim() || 'ACTIVE',
          })) as MedicalDeviceRow[];

        // Validate all rows
        const allErrors: ValidationError[] = [];
        rows.forEach((row, index) => {
          const errors = validateRow(row, index);
          allErrors.push(...errors);
        });

        if (allErrors.length > 0) {
          setValidationErrors(allErrors);
          setShowErrorDialog(true);
          return;
        }

        // Show preview if validation passes
        setPreviewData(rows);
        setShowPreviewDialog(true);
        
      } catch (error) {
        console.error('Error reading file:', error);
        toast({
          title: 'Erreur',
          description: 'Erreur lors de la lecture du fichier Excel',
          variant: 'destructive',
        });
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const processImport = async () => {
    setIsProcessing(true);
    try {
      const medicalDevicesToImport = previewData.map(row => {
        const stockLocation = stockLocations.find(
          loc => loc.name.toLowerCase() === row.stockLocationName?.toLowerCase()
        );

        return {
          name: row.name,
          type: row.type || 'MEDICAL_DEVICE',
          brand: row.brand || null,
          model: row.model || null,
          serialNumber: row.serialNumber,
          stockLocationId: stockLocation?.id || null,
          purchasePrice: row.purchasePrice || null,
          sellingPrice: row.sellingPrice || null,
          rentalPrice: row.rentalPrice || null,
          technicalSpecs: row.technicalSpecs || null,
          availableForRent: row.availableForRent || false,
          requiresMaintenance: row.requiresMaintenance || false,
          status: row.status || 'ACTIVE',
        };
      });

      const response = await fetch('/api/medical-devices/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ medicalDevices: medicalDevicesToImport }),
      });

      if (!response.ok) {
        throw new Error('Erreur lors de l\'importation');
      }

      const result = await response.json();
      
      toast({
        title: 'Succès',
        description: `${result.imported} appareils médicaux importés avec succès`,
      });

      setShowPreviewDialog(false);
      setIsImportOpen(false);
      setPreviewData([]);
      onImportSuccess();
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
    } catch (error) {
      console.error('Import error:', error);
      toast({
        title: 'Erreur',
        description: 'Erreur lors de l\'importation des appareils médicaux',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const exportMedicalDevices = async () => {
    try {
      const response = await fetch('/api/medical-devices');
      if (!response.ok) {
        throw new Error('Erreur lors du chargement des appareils médicaux');
      }

      const allDevices = await response.json();
      
      // Filter only medical devices (not products)
      const medicalDevices = allDevices.filter((device: any) => 
        device.type === 'MEDICAL_DEVICE' && device.serialNumber
      );
      
      const exportData = medicalDevices.map((device: any) => ({
        'Nom': device.name,
        'Type': device.type,
        'Marque': device.brand || '',
        'Modèle': device.model || '',
        'Numéro de Série': device.serialNumber || '',
        'Lieu de Stockage': device.stockLocation?.name || '',
        'Prix d\'Achat': device.purchasePrice || '',
        'Prix de Vente': device.sellingPrice || '',
        'Prix de Location': device.rentalPrice || '',
        'Spécifications Techniques': device.technicalSpecs || '',
        'Disponible Location': device.availableForRent ? 'true' : 'false',
        'Nécessite Maintenance': device.requiresMaintenance ? 'true' : 'false',
        'Statut': device.status || '',
        'Patient Assigné': device.patient?.firstName ? `${device.patient.firstName} ${device.patient.lastName}` : '',
        'Réservé Jusqu\'au': device.reservedUntil ? new Date(device.reservedUntil).toLocaleDateString('fr-FR') : '',
        'Date d\'Installation': device.installationDate ? new Date(device.installationDate).toLocaleDateString('fr-FR') : '',
        'Localisation Physique': device.location || '',
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Appareils_Medicaux');
      
      XLSX.writeFile(wb, `appareils_medicaux_export_${new Date().toISOString().split('T')[0]}.xlsx`);
      
      toast({
        title: 'Succès',
        description: 'Export terminé avec succès',
      });
      
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: 'Erreur',
        description: 'Erreur lors de l\'export des appareils médicaux',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="flex gap-2">
      {/* Template Download Button */}
      <Button
        variant="outline"
        onClick={downloadTemplate}
        className="flex items-center gap-2"
      >
        <FileSpreadsheet className="h-4 w-4" />
        Template
      </Button>

      {/* Import Button */}
      <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Importer
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Importer des appareils médicaux</DialogTitle>
            <DialogDescription>
              Sélectionnez un fichier Excel pour importer des appareils médicaux
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="file">Fichier Excel</Label>
              <Input
                ref={fileInputRef}
                id="file"
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileUpload}
                className="mt-1"
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Export Button */}
      <Button
        variant="outline"
        onClick={exportMedicalDevices}
        className="flex items-center gap-2"
      >
        <Download className="h-4 w-4" />
        Exporter
      </Button>

      {/* Validation Errors Dialog */}
      <AlertDialog open={showErrorDialog} onOpenChange={setShowErrorDialog}>
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Erreurs de validation
            </AlertDialogTitle>
            <AlertDialogDescription>
              Le fichier contient des erreurs qui doivent être corrigées:
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="max-h-60 overflow-y-auto">
            <ul className="space-y-2">
              {validationErrors.map((error, index) => (
                <li key={index} className="text-sm bg-red-50 p-2 rounded">
                  <strong>Ligne {error.row}:</strong> {error.message}
                </li>
              ))}
            </ul>
          </div>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowErrorDialog(false)}>
              OK
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Preview Dialog */}
      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Aperçu de l'importation</DialogTitle>
            <DialogDescription>
              {previewData.length} appareils médicaux seront importés
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-300 p-2 text-left">Nom</th>
                    <th className="border border-gray-300 p-2 text-left">Marque</th>
                    <th className="border border-gray-300 p-2 text-left">Modèle</th>
                    <th className="border border-gray-300 p-2 text-left">N° Série</th>
                    <th className="border border-gray-300 p-2 text-left">Lieu</th>
                    <th className="border border-gray-300 p-2 text-left">Prix Location</th>
                  </tr>
                </thead>
                <tbody>
                  {previewData.slice(0, 10).map((row, index) => (
                    <tr key={index}>
                      <td className="border border-gray-300 p-2">{row.name}</td>
                      <td className="border border-gray-300 p-2">{row.brand}</td>
                      <td className="border border-gray-300 p-2">{row.model}</td>
                      <td className="border border-gray-300 p-2">{row.serialNumber}</td>
                      <td className="border border-gray-300 p-2">{row.stockLocationName}</td>
                      <td className="border border-gray-300 p-2">{row.rentalPrice}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {previewData.length > 10 && (
                <p className="text-sm text-gray-500 mt-2">
                  ... et {previewData.length - 10} autres appareils médicaux
                </p>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowPreviewDialog(false)}
              >
                Annuler
              </Button>
              <Button
                onClick={processImport}
                disabled={isProcessing}
              >
                {isProcessing ? 'Importation...' : 'Confirmer l\'importation'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default MedicalDeviceImportExport;