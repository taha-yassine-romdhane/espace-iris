import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/components/ui/use-toast';
import {
  Monitor,
  Upload,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  FileText,
  ArrowLeft,
  Eye,
  Filter
} from 'lucide-react';
import * as XLSX from 'xlsx';
import FieldMapper from './FieldMapper';

interface DiagnosticDeviceField {
  key: string;
  label: string;
  required: boolean;
  type: 'string' | 'number' | 'date' | 'boolean' | 'email' | 'phone' | 'select';
  description?: string;
  example?: string;
  options?: string[];
}

const diagnosticDeviceFields: DiagnosticDeviceField[] = [
  { 
    key: 'name', 
    label: 'Nom de l\'appareil', 
    required: true, 
    type: 'string',
    description: 'Nom de l\'appareil de diagnostic',
    example: 'Tensiomètre Omron M3'
  },
  { 
    key: 'type', 
    label: 'Type d\'appareil', 
    required: true, 
    type: 'select',
    description: 'Type d\'appareil de diagnostic',
    example: 'DIAGNOSTIC_DEVICE',
    options: ['DIAGNOSTIC_DEVICE']
  },
  { 
    key: 'brand', 
    label: 'Marque', 
    required: false, 
    type: 'string',
    description: 'Marque de l\'appareil',
    example: 'Omron'
  },
  { 
    key: 'model', 
    label: 'Modèle', 
    required: false, 
    type: 'string',
    description: 'Modèle de l\'appareil',
    example: 'M3 Comfort'
  },
  { 
    key: 'serialNumber', 
    label: 'Numéro de série', 
    required: true, 
    type: 'string',
    description: 'Numéro de série unique de l\'appareil',
    example: 'OM123456789'
  },
  { 
    key: 'purchasePrice', 
    label: 'Prix d\'achat', 
    required: false, 
    type: 'number',
    description: 'Prix d\'achat en dinars',
    example: '150.00'
  },
  { 
    key: 'sellingPrice', 
    label: 'Prix de vente', 
    required: false, 
    type: 'number',
    description: 'Prix de vente en dinars',
    example: '200.00'
  },
  { 
    key: 'technicalSpecs', 
    label: 'Spécifications techniques', 
    required: false, 
    type: 'string',
    description: 'Spécifications techniques de l\'appareil'
  },
  { 
    key: 'configuration', 
    label: 'Configuration', 
    required: false, 
    type: 'string',
    description: 'Configuration de l\'appareil'
  },
  { 
    key: 'status', 
    label: 'Statut', 
    required: false, 
    type: 'select',
    description: 'Statut de l\'appareil',
    example: 'ACTIVE',
    options: ['ACTIVE', 'MAINTENANCE', 'RETIRED', 'RESERVED']
  },
  { 
    key: 'stockQuantity', 
    label: 'Quantité en stock', 
    required: false, 
    type: 'number',
    description: 'Quantité disponible en stock',
    example: '5'
  },
  { 
    key: 'stockLocationName', 
    label: 'Emplacement de stock', 
    required: false, 
    type: 'string',
    description: 'Nom de l\'emplacement de stock',
    example: 'bureau pricipale'
  }
];

type Step = 'upload' | 'mapping' | 'preview' | 'importing' | 'complete';

interface ImportResult {
  success: number;
  failed: number;
  errors: Array<{ row: number; error: string }>;
  duplicates: Array<{ row: number; serialNumber: string }>;
}

export default function DiagnosticDevicesImport() {
  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [excelData, setExcelData] = useState<any[]>([]);
  const [excelHeaders, setExcelHeaders] = useState<string[]>([]);
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({});
  const [mappedData, setMappedData] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = event.target.files?.[0];
    if (!uploadedFile) return;

    if (!uploadedFile.name.match(/\.(xlsx|xls)$/)) {
      toast({
        title: "Format invalide",
        description: "Veuillez sélectionner un fichier Excel (.xlsx ou .xls)",
        variant: "destructive",
      });
      return;
    }

    setFile(uploadedFile);
    setIsProcessing(true);

    try {
      const data = await uploadedFile.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      if (jsonData.length < 2) {
        throw new Error("Le fichier Excel est vide ou ne contient pas de données");
      }

      const rawHeaders = jsonData[0] as any[];
      const headers = rawHeaders
        .map((header, index) => {
          if (header === null || header === undefined || header === '') {
            return `Column ${index + 1}`;
          }
          return String(header).trim();
        })
        .filter((header, index) => {
          return jsonData.slice(1).some(row => {
            const cell = (row as any[])[index];
            return cell !== null && cell !== undefined && cell !== '';
          });
        });

      const rows = jsonData.slice(1).filter(row => 
        (row as any[]).some(cell => cell !== null && cell !== undefined && cell !== '')
      );

      if (headers.length === 0) {
        throw new Error("Aucune colonne valide trouvée dans le fichier");
      }

      if (rows.length === 0) {
        throw new Error("Aucune donnée trouvée dans le fichier");
      }

      setExcelHeaders(headers);
      setExcelData(rows);
      setStep('mapping');
    } catch (error) {
      console.error('Error reading file:', error);
      toast({
        title: "Erreur de lecture",
        description: "Impossible de lire le fichier Excel",
        variant: "destructive",
      });
      setFile(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMappingComplete = (mapping: Record<string, string>) => {
    setFieldMapping(mapping);
    
    const transformed = excelData.map((row, index) => {
      const device: any = { _rowIndex: index + 2 };
      
      Object.entries(mapping).forEach(([fieldKey, excelColumn]) => {
        if (fieldKey === '_splitColumns') return;
        
        const columnIndex = excelHeaders.indexOf(excelColumn);
        if (columnIndex !== -1) {
          const value = row[columnIndex];
          
          // Handle number fields
          if (['purchasePrice', 'sellingPrice', 'stockQuantity'].includes(fieldKey) && value) {
            device[fieldKey] = parseFloat(value) || 0;
          }
          // Handle other fields
          else {
            device[fieldKey] = value;
          }
        }
      });
      
      // Ensure type is always DIAGNOSTIC_DEVICE
      device.type = 'DIAGNOSTIC_DEVICE';
      
      return device;
    });
    
    setMappedData(transformed);
    setStep('preview');
  };

  const handleImport = async () => {
    setStep('importing');
    setIsProcessing(true);
    setImportProgress(0);

    const batchSize = 50;
    const totalBatches = Math.ceil(mappedData.length / batchSize);
    let processedCount = 0;
    
    const result: ImportResult = {
      success: 0,
      failed: 0,
      errors: [],
      duplicates: []
    };

    try {
      for (let i = 0; i < totalBatches; i++) {
        const batch = mappedData.slice(i * batchSize, (i + 1) * batchSize);
        
        const response = await fetch('/api/excel-import/diagnostic-devices', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            devices: batch,
            mapping: fieldMapping 
          })
        });

        const batchResult = await response.json();
        
        if (batchResult.results) {
          result.success += batchResult.results.success || 0;
          result.failed += batchResult.results.failed || 0;
          
          if (batchResult.results.errors) {
            result.errors.push(...batchResult.results.errors);
          }
          
          if (batchResult.results.duplicates) {
            result.duplicates.push(...batchResult.results.duplicates);
          }
        }

        processedCount += batch.length;
        setImportProgress((processedCount / mappedData.length) * 100);
      }

      setImportResult(result);
      setStep('complete');
      
      toast({
        title: "Import terminé",
        description: `${result.success} appareils de diagnostic importés avec succès`,
        variant: result.failed > 0 ? "destructive" : "default"
      });
    } catch (error) {
      console.error('Import error:', error);
      toast({
        title: "Erreur d'import",
        description: "Une erreur est survenue lors de l'import",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const response = await fetch('/api/excel-import/diagnostic-devices/template');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'template_diagnostic_devices_import.xlsx';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de télécharger le template",
        variant: "destructive"
      });
    }
  };

  const resetImport = () => {
    setStep('upload');
    setFile(null);
    setExcelData([]);
    setExcelHeaders([]);
    setFieldMapping({});
    setMappedData([]);
    setImportResult(null);
    setImportProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Monitor className="h-6 w-6 text-blue-600" />
            <CardTitle>Import d'Appareils de Diagnostic</CardTitle>
          </div>
          {step !== 'upload' && step !== 'complete' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (step === 'mapping') setStep('upload');
                else if (step === 'preview') setStep('mapping');
                else if (step === 'importing') return;
              }}
              disabled={isProcessing}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {/* Upload Step */}
        {step === 'upload' && (
          <div className="space-y-6">
            <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
              <FileSpreadsheet className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium mb-2">
                Sélectionnez votre fichier Excel d'appareils de diagnostic
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Formats acceptés: .xlsx, .xls
              </p>
              
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileUpload}
                className="hidden"
              />
              
              <div className="flex items-center justify-center gap-4">
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Traitement...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Choisir un fichier
                    </>
                  )}
                </Button>
                
                <Button
                  variant="outline"
                  onClick={handleDownloadTemplate}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Télécharger le template
                </Button>
              </div>
            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Types d'appareils supportés:</strong> Tensiomètres, Oxymètres, Glucomètres, Thermomètres, ECG et autres appareils de diagnostic.
                Téléchargez le template pour voir le format exact requis.
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* Mapping Step */}
        {step === 'mapping' && (
          <FieldMapper
            excelHeaders={excelHeaders}
            excelData={excelData}
            targetFields={diagnosticDeviceFields as any}
            onMappingComplete={handleMappingComplete}
            onCancel={resetImport}
            entityName="appareils de diagnostic"
          />
        )}

        {/* Preview Step */}
        {step === 'preview' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium mb-2">Aperçu des données</h3>
              <p className="text-sm text-gray-600">
                {mappedData.length} appareils de diagnostic prêts à être importés
              </p>
            </div>

            <div className="border rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Ligne
                      </th>
                      {Object.entries(fieldMapping).map(([fieldKey]) => {
                        const field = diagnosticDeviceFields.find(f => f.key === fieldKey);
                        return (
                          <th key={fieldKey} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            {field?.label || fieldKey}
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {mappedData.slice(0, 10).map((device, index) => (
                      <tr key={index}>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {device._rowIndex}
                        </td>
                        {Object.keys(fieldMapping).map(fieldKey => (
                          <td key={fieldKey} className="px-4 py-3 text-sm text-gray-900">
                            {typeof device[fieldKey] === 'boolean' ? (device[fieldKey] ? 'Oui' : 'Non') : (device[fieldKey] || '-')}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {mappedData.length > 10 && (
                <div className="bg-gray-50 px-4 py-3 text-center text-sm text-gray-600">
                  ... et {mappedData.length - 10} autres lignes
                </div>
              )}
            </div>

            <div className="flex items-center justify-between">
              <Button variant="outline" onClick={() => setStep('mapping')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Modifier le mapping
              </Button>
              <Button onClick={handleImport}>
                <Upload className="h-4 w-4 mr-2" />
                Lancer l'import
              </Button>
            </div>
          </div>
        )}

        {/* Importing Step */}
        {step === 'importing' && (
          <div className="space-y-6 py-12">
            <div className="text-center">
              <Loader2 className="h-12 w-12 mx-auto text-blue-600 animate-spin mb-4" />
              <h3 className="text-lg font-medium mb-2">Import en cours...</h3>
              <p className="text-sm text-gray-600">
                Veuillez patienter pendant l'import des appareils de diagnostic
              </p>
            </div>
            
            <div className="max-w-md mx-auto">
              <Progress value={importProgress} className="h-2" />
              <p className="text-center text-sm text-gray-600 mt-2">
                {Math.round(importProgress)}% complété
              </p>
            </div>
          </div>
        )}

        {/* Complete Step */}
        {step === 'complete' && importResult && (
          <div className="space-y-6">
            <div className="text-center py-8">
              {importResult.failed === 0 ? (
                <CheckCircle2 className="h-16 w-16 mx-auto text-green-600 mb-4" />
              ) : (
                <AlertCircle className="h-16 w-16 mx-auto text-yellow-600 mb-4" />
              )}
              
              <h3 className="text-xl font-medium mb-2">Import terminé</h3>
              <div className="space-y-2">
                <p className="text-green-600">
                  <strong>{importResult.success}</strong> appareils de diagnostic importés avec succès
                </p>
                {importResult.failed > 0 && (
                  <p className="text-red-600">
                    <strong>{importResult.failed}</strong> imports échoués
                  </p>
                )}
                {importResult.duplicates.length > 0 && (
                  <p className="text-yellow-600">
                    <strong>{importResult.duplicates.length}</strong> doublons détectés
                  </p>
                )}
              </div>
            </div>

            {(importResult.errors.length > 0 || importResult.duplicates.length > 0) && (
              <div className="space-y-4">
                {importResult.errors.length > 0 && (
                  <div>
                    <h4 className="font-medium text-red-600 mb-2">Erreurs d'import:</h4>
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-h-48 overflow-y-auto">
                      {importResult.errors.map((error, index) => (
                        <div key={index} className="text-sm text-red-700 mb-1">
                          Ligne {error.row}: {error.error}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {importResult.duplicates.length > 0 && (
                  <div>
                    <h4 className="font-medium text-yellow-600 mb-2">Doublons détectés:</h4>
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 max-h-48 overflow-y-auto">
                      {importResult.duplicates.map((dup, index) => (
                        <div key={index} className="text-sm text-yellow-700 mb-1">
                          Ligne {dup.row}: Numéro de série {dup.serialNumber} déjà existant
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center justify-center gap-4">
              <Button variant="outline" onClick={resetImport}>
                <Upload className="h-4 w-4 mr-2" />
                Nouvel import
              </Button>
              <Button onClick={() => window.location.href = '/roles/admin/appareils'}>
                <Eye className="h-4 w-4 mr-2" />
                Voir les appareils
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}