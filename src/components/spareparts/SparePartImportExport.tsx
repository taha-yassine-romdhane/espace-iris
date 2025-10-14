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

interface SparePartImportExportProps {
  onImportSuccess: () => void;
  stockLocations: Array<{ id: string; name: string }>;
}

interface ValidationError {
  row: number;
  field: string;
  message: string;
}

interface SparePartRow {
  name: string;
  brand?: string;
  model?: string;
  stockLocationName?: string;
  stockQuantity?: number;
  purchasePrice?: number;
  sellingPrice?: number;
  warranty?: string;
  status?: string;
}

export function SparePartImportExport({ onImportSuccess, stockLocations }: SparePartImportExportProps) {
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [previewData, setPreviewData] = useState<SparePartRow[]>([]);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Template structure matching the SparePartForm fields
  const getTemplateData = () => {
    const firstLocationName = stockLocations.length > 0 ? stockLocations[0].name : 'Bureau Principal';
    return [
      {
        name: 'Filtre HEPA',
        brand: 'Philips',
        model: 'DreamStation',
        stockLocationName: firstLocationName,
        stockQuantity: 25,
        purchasePrice: 12.5,
        sellingPrice: 18.0,
        warranty: '12 mois',
        status: 'FOR_SALE'
      },
      {
        name: 'Joint étanchéité',
        brand: 'ResMed',
        model: 'AirSense',
        stockLocationName: firstLocationName,
        stockQuantity: 100,
        purchasePrice: 5.0,
        sellingPrice: 8.0,
        warranty: '6 mois',
        status: 'FOR_SALE'
      }
    ];
  };

  const downloadTemplate = () => {
    const templateData = getTemplateData();
    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Pieces_Rechange');
    
    // Add headers styling and instructions
    const locationNames = stockLocations.map(loc => loc.name).join(', ');
    const headers = [
      'Nom (obligatoire)',
      'Marque',
      'Modèle', 
      `Lieu de Stockage (${locationNames})`,
      'Quantité en Stock',
      'Prix d\'Achat',
      'Prix de Vente',
      'Garantie',
      'Statut (EN_VENTE, EN_LOCATION, EN_REPARATION, HORS_SERVICE)'
    ];
    
    XLSX.utils.sheet_add_aoa(wb.Sheets['Pieces_Rechange'], [headers], { origin: 'A1' });
    
    XLSX.writeFile(wb, 'template_pieces_rechange.xlsx');
    
    toast({
      title: 'Succès',
      description: 'Template téléchargé avec succès',
    });
  };

  const validateRow = (row: SparePartRow, index: number): ValidationError[] => {
    const errors: ValidationError[] = [];
    
    // Required field validation
    if (!row.name || row.name.trim() === '') {
      errors.push({
        row: index + 2, // +2 because Excel rows start at 1 and we have headers
        field: 'name',
        message: 'Le nom est obligatoire'
      });
    }

    // Stock location validation
    if (row.stockLocationName) {
      const locationExists = stockLocations.find(
        loc => loc.name.toLowerCase() === row.stockLocationName!.toLowerCase()
      );
      if (!locationExists) {
        errors.push({
          row: index + 2,
          field: 'stockLocationName',
          message: `Lieu de stockage "${row.stockLocationName}" n'existe pas. Lieux disponibles: ${stockLocations.map(l => l.name).join(', ')}`
        });
      }
    }

    // Quantity validation
    if (row.stockQuantity !== undefined && row.stockQuantity < 0) {
      errors.push({
        row: index + 2,
        field: 'stockQuantity',
        message: 'La quantité doit être positive'
      });
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

    // Status validation
    const validStatuses = ['FOR_SALE', 'FOR_RENT', 'EN_REPARATION', 'HORS_SERVICE'];
    if (row.status && !validStatuses.includes(row.status)) {
      errors.push({
        row: index + 2,
        field: 'status',
        message: `Statut invalide. Valeurs autorisées: ${validStatuses.join(', ')}`
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
            brand: row[1]?.toString().trim() || '',
            model: row[2]?.toString().trim() || '',
            stockLocationName: row[3]?.toString().trim() || '',
            stockQuantity: row[4] ? Number(row[4]) : 0,
            purchasePrice: row[5] ? Number(row[5]) : undefined,
            sellingPrice: row[6] ? Number(row[6]) : undefined,
            warranty: row[7]?.toString().trim() || '',
            status: row[8]?.toString().trim() || 'FOR_SALE',
          })) as SparePartRow[];

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
      const sparePartsToImport = previewData.map(row => {
        const stockLocation = stockLocations.find(
          loc => loc.name.toLowerCase() === row.stockLocationName?.toLowerCase()
        );

        return {
          name: row.name,
          type: 'SPARE_PART',
          brand: row.brand || null,
          model: row.model || null,
          stockLocationId: stockLocation?.id || null,
          stockQuantity: row.stockQuantity || 0,
          purchasePrice: row.purchasePrice || null,
          sellingPrice: row.sellingPrice || null,
          warranty: row.warranty || null,
          status: row.status || 'FOR_SALE',
        };
      });

      const response = await fetch('/api/products/import-spareparts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ spareParts: sparePartsToImport }),
      });

      if (!response.ok) {
        throw new Error('Erreur lors de l\'importation');
      }

      const result = await response.json();
      
      toast({
        title: 'Succès',
        description: `${result.imported} pièces de rechange importées avec succès`,
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
        description: 'Erreur lors de l\'importation des pièces de rechange',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const exportSpareParts = async () => {
    try {
      const response = await fetch('/api/products?type=SPARE_PART');
      if (!response.ok) {
        throw new Error('Erreur lors du chargement des pièces de rechange');
      }

      const spareParts = await response.json();
      
      const exportData = spareParts.map((part: any) => ({
        'Nom': part.name,
        'Marque': part.brand || '',
        'Modèle': part.model || '',
        'Lieu de Stockage': part.stockLocation?.name || '',
        'Quantité en Stock': part.stockQuantity || 0,
        'Prix d\'Achat': part.purchasePrice || '',
        'Prix de Vente': part.sellingPrice || '',
        'Garantie': part.warranty || '',
        'Statut': part.status || '',
        'Date de Création': part.createdAt ? new Date(part.createdAt).toLocaleDateString('fr-FR') : '',
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Pieces_Rechange');
      
      XLSX.writeFile(wb, `pieces_rechange_export_${new Date().toISOString().split('T')[0]}.xlsx`);
      
      toast({
        title: 'Succès',
        description: 'Export terminé avec succès',
      });
      
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: 'Erreur',
        description: 'Erreur lors de l\'export des pièces de rechange',
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
            <DialogTitle>Importer des pièces de rechange</DialogTitle>
            <DialogDescription>
              Sélectionnez un fichier Excel pour importer des pièces de rechange
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
        onClick={exportSpareParts}
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
              {previewData.length} pièces de rechange seront importées
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
                    <th className="border border-gray-300 p-2 text-left">Lieu</th>
                    <th className="border border-gray-300 p-2 text-left">Quantité</th>
                    <th className="border border-gray-300 p-2 text-left">Garantie</th>
                  </tr>
                </thead>
                <tbody>
                  {previewData.slice(0, 10).map((row, index) => (
                    <tr key={index}>
                      <td className="border border-gray-300 p-2">{row.name}</td>
                      <td className="border border-gray-300 p-2">{row.brand}</td>
                      <td className="border border-gray-300 p-2">{row.model}</td>
                      <td className="border border-gray-300 p-2">{row.stockLocationName}</td>
                      <td className="border border-gray-300 p-2">{row.stockQuantity}</td>
                      <td className="border border-gray-300 p-2">{row.warranty}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {previewData.length > 10 && (
                <p className="text-sm text-gray-500 mt-2">
                  ... et {previewData.length - 10} autres pièces de rechange
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

export default SparePartImportExport;