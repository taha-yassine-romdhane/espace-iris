import React, { useState, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Upload, 
  Download, 
  FileSpreadsheet, 
  AlertTriangle, 
  CheckCircle, 
  X,
  Loader2,
  Info
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import * as XLSX from 'xlsx';

interface ExcelImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ValidationError {
  row: number;
  field: string;
  message: string;
  value?: string;
}

interface ImportPreview {
  validRows: any[];
  invalidRows: any[];
  errors: ValidationError[];
  totalRows: number;
}

export default function ExcelImportDialog({ open, onOpenChange }: ExcelImportDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [dragOver, setDragOver] = useState(false);
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Excel template generation
  const generateTemplate = () => {
    const template = [
      {
        'Nom Complet Patient': 'John Doe',
        'Numéro de Série Appareil': 'CPAP-001-2024',
        'Date de Début (YYYY-MM-DD)': '2024-01-15',
        'Date de Fin (YYYY-MM-DD)': '2024-02-15',
        'Statut': 'ACTIVE',
        'Prix par Jour (TND)': '25.00',
        'Mode de Tarification': 'DAILY',
        'Dépôt de Garantie (TND)': '500.00',
        'Méthode de Dépôt': 'CASH',
        'Location Urgente': 'NON',
        'Notes': 'Location standard'
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(template);
    
    // Set column widths
    const colWidths = [
      { wch: 25 }, // Nom Complet Patient
      { wch: 20 }, // Numéro de Série Appareil
      { wch: 20 }, // Date de Début
      { wch: 20 }, // Date de Fin
      { wch: 12 }, // Statut
      { wch: 18 }, // Prix par Jour
      { wch: 18 }, // Mode de Tarification
      { wch: 20 }, // Dépôt de Garantie
      { wch: 15 }, // Méthode de Dépôt
      { wch: 15 }, // Location Urgente
      { wch: 30 }  // Notes
    ];
    worksheet['!cols'] = colWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Template Locations');
    
    // Add instructions sheet
    const instructions = [
      { 'Instructions d\'Importation': 'Veuillez suivre ces directives:' },
      { 'Instructions d\'Importation': '' },
      { 'Instructions d\'Importation': '1. Nom Complet Patient: Prénom Nom (exactement comme dans la base)' },
      { 'Instructions d\'Importation': '2. Numéro de Série: Numéro de série exact de l\'appareil médical' },
      { 'Instructions d\'Importation': '3. Dates: Format YYYY-MM-DD (ex: 2024-01-15)' },
      { 'Instructions d\'Importation': '4. Statut: ACTIVE, PENDING, PAUSED, COMPLETED, CANCELLED' },
      { 'Instructions d\'Importation': '5. Mode de Tarification: DAILY ou MONTHLY' },
      { 'Instructions d\'Importation': '6. Méthode de Dépôt: CASH, CHECK, CREDIT_CARD, BANK_TRANSFER' },
      { 'Instructions d\'Importation': '7. Location Urgente: OUI ou NON' },
      { 'Instructions d\'Importation': '' },
      { 'Instructions d\'Importation': 'IMPORTANT:' },
      { 'Instructions d\'Importation': '- Le patient doit exister dans la base de données' },
      { 'Instructions d\'Importation': '- L\'appareil médical doit exister avec ce numéro de série' },
      { 'Instructions d\'Importation': '- Les dates doivent être valides et cohérentes' },
      { 'Instructions d\'Importation': '- Ne pas modifier les en-têtes de colonnes' }
    ];
    
    const instructionsSheet = XLSX.utils.json_to_sheet(instructions);
    instructionsSheet['!cols'] = [{ wch: 60 }];
    XLSX.utils.book_append_sheet(workbook, instructionsSheet, 'Instructions');
    
    XLSX.writeFile(workbook, `template_import_locations_${new Date().toISOString().split('T')[0]}.xlsx`);
    
    toast({
      title: "Template téléchargé",
      description: "Le template Excel a été téléchargé avec succès.",
    });
  };

  // File validation and processing
  const validateAndPreviewFile = async (file: File) => {
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      if (jsonData.length === 0) {
        throw new Error('Le fichier Excel est vide');
      }

      const validRows: any[] = [];
      const invalidRows: any[] = [];
      const errors: ValidationError[] = [];

      // Validate each row
      for (let i = 0; i < jsonData.length; i++) {
        const row = jsonData[i] as any;
        const rowNumber = i + 2; // Excel row number (accounting for header)
        const rowErrors: ValidationError[] = [];

        // Required field validation
        const requiredFields = [
          { key: 'Nom Complet Patient', name: 'Nom Complet Patient' },
          { key: 'Numéro de Série Appareil', name: 'Numéro de Série Appareil' },
          { key: 'Date de Début (YYYY-MM-DD)', name: 'Date de Début' },
          { key: 'Statut', name: 'Statut' },
          { key: 'Prix par Jour (TND)', name: 'Prix par Jour' }
        ];

        requiredFields.forEach(field => {
          if (!row[field.key] || String(row[field.key]).trim() === '') {
            rowErrors.push({
              row: rowNumber,
              field: field.name,
              message: 'Champ requis manquant',
              value: row[field.key]
            });
          }
        });

        // Date validation
        const startDate = row['Date de Début (YYYY-MM-DD)'];
        const endDate = row['Date de Fin (YYYY-MM-DD)'];

        if (startDate && !isValidDate(startDate)) {
          rowErrors.push({
            row: rowNumber,
            field: 'Date de Début',
            message: 'Format de date invalide (utilisez YYYY-MM-DD)',
            value: startDate
          });
        }

        if (endDate && !isValidDate(endDate)) {
          rowErrors.push({
            row: rowNumber,
            field: 'Date de Fin',
            message: 'Format de date invalide (utilisez YYYY-MM-DD)',
            value: endDate
          });
        }

        if (startDate && endDate && isValidDate(startDate) && isValidDate(endDate)) {
          if (new Date(endDate) <= new Date(startDate)) {
            rowErrors.push({
              row: rowNumber,
              field: 'Date de Fin',
              message: 'La date de fin doit être postérieure à la date de début',
              value: endDate
            });
          }
        }

        // Status validation
        const validStatuses = ['ACTIVE', 'PENDING', 'PAUSED', 'COMPLETED', 'CANCELLED'];
        if (row['Statut'] && !validStatuses.includes(row['Statut'])) {
          rowErrors.push({
            row: rowNumber,
            field: 'Statut',
            message: `Statut invalide. Valeurs autorisées: ${validStatuses.join(', ')}`,
            value: row['Statut']
          });
        }

        // Price validation
        const price = row['Prix par Jour (TND)'];
        if (price && (isNaN(Number(price)) || Number(price) <= 0)) {
          rowErrors.push({
            row: rowNumber,
            field: 'Prix par Jour',
            message: 'Le prix doit être un nombre positif',
            value: price
          });
        }

        // Pricing mode validation
        const pricingMode = row['Mode de Tarification'];
        if (pricingMode && !['DAILY', 'MONTHLY'].includes(pricingMode)) {
          rowErrors.push({
            row: rowNumber,
            field: 'Mode de Tarification',
            message: 'Mode invalide. Valeurs autorisées: DAILY, MONTHLY',
            value: pricingMode
          });
        }

        // Deposit method validation
        const depositMethod = row['Méthode de Dépôt'];
        if (depositMethod && !['CASH', 'CHECK', 'CREDIT_CARD', 'BANK_TRANSFER'].includes(depositMethod)) {
          rowErrors.push({
            row: rowNumber,
            field: 'Méthode de Dépôt',
            message: 'Méthode invalide. Valeurs autorisées: CASH, CHECK, CREDIT_CARD, BANK_TRANSFER',
            value: depositMethod
          });
        }

        // Urgent rental validation
        const urgentRental = row['Location Urgente'];
        if (urgentRental && !['OUI', 'NON'].includes(urgentRental)) {
          rowErrors.push({
            row: rowNumber,
            field: 'Location Urgente',
            message: 'Valeur invalide. Valeurs autorisées: OUI, NON',
            value: urgentRental
          });
        }

        if (rowErrors.length === 0) {
          validRows.push({ ...row, rowNumber });
        } else {
          invalidRows.push({ ...row, rowNumber });
          errors.push(...rowErrors);
        }
      }

      setImportPreview({
        validRows,
        invalidRows,
        errors,
        totalRows: jsonData.length
      });

    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erreur de fichier",
        description: "Impossible de lire le fichier Excel. Vérifiez le format.",
      });
      console.error('File validation error:', error);
    }
  };

  const isValidDate = (dateString: string): boolean => {
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(dateString)) return false;
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date.getTime());
  };

  // Import mutation
  const importMutation = useMutation({
    mutationFn: async (validRows: any[]) => {
      const response = await fetch('/api/rentals/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ rentals: validRows }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erreur lors de l\'importation');
      }

      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['rentals'] });
      queryClient.invalidateQueries({ queryKey: ['rentals-stats'] });
      
      toast({
        title: "Import réussi",
        description: `${data.imported} locations importées avec succès.`,
      });
      
      setImportPreview(null);
      setSelectedFile(null);
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Erreur d'importation",
        description: error.message || "Une erreur est survenue lors de l'importation.",
      });
    },
  });

  const handleFileSelect = (file: File) => {
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      toast({
        variant: "destructive",
        title: "Format invalide",
        description: "Veuillez sélectionner un fichier Excel (.xlsx ou .xls).",
      });
      return;
    }

    setSelectedFile(file);
    validateAndPreviewFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleImport = () => {
    if (importPreview && importPreview.validRows.length > 0) {
      importMutation.mutate(importPreview.validRows);
    }
  };

  const resetImport = () => {
    setImportPreview(null);
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Import de Locations Excel
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Template Download */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Download className="h-5 w-5" />
                Template Excel
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-2">
                    Téléchargez le template Excel avec les colonnes requises et les instructions.
                  </p>
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      Le template contient un exemple et des instructions détaillées pour l'importation.
                    </AlertDescription>
                  </Alert>
                </div>
                <Button onClick={generateTemplate} variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Télécharger Template
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* File Upload */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Importer le Fichier
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  dragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <FileSpreadsheet className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <p className="text-lg font-medium mb-2">
                  Glissez-déposez votre fichier Excel ici
                </p>
                <p className="text-gray-600 mb-4">ou</p>
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Sélectionner un fichier
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileSelect(file);
                  }}
                />
                {selectedFile && (
                  <p className="mt-2 text-sm text-gray-600">
                    Fichier sélectionné: {selectedFile.name}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Import Preview */}
          {importPreview && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" />
                  Aperçu de l'Import
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {importPreview.totalRows}
                    </div>
                    <div className="text-sm text-gray-600">Total lignes</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {importPreview.validRows.length}
                    </div>
                    <div className="text-sm text-gray-600">Lignes valides</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">
                      {importPreview.invalidRows.length}
                    </div>
                    <div className="text-sm text-gray-600">Lignes invalides</div>
                  </div>
                </div>

                {/* Errors Display */}
                {importPreview.errors.length > 0 && (
                  <Alert variant="destructive" className="mb-4">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <div className="font-medium mb-2">
                        {importPreview.errors.length} erreur(s) trouvée(s):
                      </div>
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {importPreview.errors.slice(0, 10).map((error, index) => (
                          <div key={index} className="text-sm">
                            <Badge variant="outline" className="mr-2">
                              Ligne {error.row}
                            </Badge>
                            {error.field}: {error.message}
                            {error.value && (
                              <span className="text-gray-600"> (Valeur: "{error.value}")</span>
                            )}
                          </div>
                        ))}
                        {importPreview.errors.length > 10 && (
                          <div className="text-sm text-gray-600">
                            ... et {importPreview.errors.length - 10} autres erreurs
                          </div>
                        )}
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

                {/* Action Buttons */}
                <div className="flex justify-between">
                  <Button variant="outline" onClick={resetImport}>
                    <X className="h-4 w-4 mr-2" />
                    Annuler
                  </Button>
                  <Button
                    onClick={handleImport}
                    disabled={importPreview.validRows.length === 0 || importMutation.isPending}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {importMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <CheckCircle className="h-4 w-4 mr-2" />
                    )}
                    Importer {importPreview.validRows.length} Location(s)
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}