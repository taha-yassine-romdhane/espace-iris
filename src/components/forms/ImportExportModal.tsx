import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Upload, FileSpreadsheet, AlertCircle, CheckCircle, X } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface ImportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'patients' | 'companies' | 'products' | 'medical-devices';
  onImportComplete?: () => void;
}

export default function ImportExportModal({ 
  isOpen, 
  onClose, 
  type,
  onImportComplete 
}: ImportExportModalProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importResults, setImportResults] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const getEntityNames = (type: string) => {
    switch (type) {
      case 'patients':
        return { plural: 'patients', singular: 'patient' };
      case 'companies':
        return { plural: 'sociétés', singular: 'société' };
      case 'products':
        return { plural: 'produits', singular: 'produit' };
      case 'medical-devices':
        return { plural: 'appareils médicaux', singular: 'appareil médical' };
      default:
        return { plural: 'éléments', singular: 'élément' };
    }
  };

  const { plural: entityName, singular: entityNameSingular } = getEntityNames(type);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const getExportEndpoint = (type: string) => {
        switch (type) {
          case 'patients':
            return '/api/renseignements/patients/export';
          case 'companies':
            return '/api/renseignements/companies/export';
          case 'products':
            return '/api/excel-import/products/export';
          case 'medical-devices':
            return '/api/excel-import/medical-devices/export';
          default:
            throw new Error('Type non supporté');
        }
      };

      const endpoint = getExportEndpoint(type);
      
      const response = await fetch(endpoint);
      
      if (!response.ok) {
        throw new Error('Erreur lors de l\'export');
      }

      // Create blob and download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${type}_export_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Export réussi",
        description: `Les ${entityName} ont été exportés avec succès`,
      });
      
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Erreur d'export",
        description: `Impossible d'exporter les ${entityName}`,
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const getTemplateEndpoint = (type: string) => {
        switch (type) {
          case 'patients':
            return '/api/renseignements/patients/template';
          case 'companies':
            return '/api/renseignements/companies/template';
          case 'products':
            return '/api/excel-import/products/template';
          case 'medical-devices':
            return '/api/excel-import/medical-devices/template';
          default:
            throw new Error('Type non supporté');
        }
      };

      const endpoint = getTemplateEndpoint(type);
      
      const response = await fetch(endpoint);
      
      if (!response.ok) {
        throw new Error('Erreur lors du téléchargement du template');
      }

      // Create blob and download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `template_${type}_import.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Template téléchargé",
        description: `Le template d'import pour les ${entityName} a été téléchargé`,
      });
      
    } catch (error) {
      console.error('Template download error:', error);
      toast({
        title: "Erreur de téléchargement",
        description: `Impossible de télécharger le template`,
        variant: "destructive",
      });
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.name.toLowerCase().endsWith('.xlsx') && !file.name.toLowerCase().endsWith('.xls')) {
      toast({
        title: "Type de fichier invalide",
        description: "Veuillez sélectionner un fichier Excel (.xlsx ou .xls)",
        variant: "destructive",
      });
      return;
    }

    setIsImporting(true);
    setImportResults(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const getImportEndpoint = (type: string) => {
        switch (type) {
          case 'patients':
            return '/api/renseignements/patients/import';
          case 'companies':
            return '/api/renseignements/companies/import';
          case 'products':
            return '/api/excel-import/products';
          case 'medical-devices':
            return '/api/excel-import/medical-devices';
          default:
            throw new Error('Type non supporté');
        }
      };

      const endpoint = getImportEndpoint(type);

      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erreur lors de l\'import');
      }

      setImportResults(result.results);
      
      toast({
        title: "Import terminé",
        description: result.message,
        variant: result.results.failed > 0 ? "destructive" : "default",
      });

      // Call callback if provided
      if (onImportComplete && result.results.success > 0) {
        onImportComplete();
      }
      
    } catch (error) {
      console.error('Import error:', error);
      toast({
        title: "Erreur d'import",
        description: error instanceof Error ? error.message : `Impossible d'importer les ${entityName}`,
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Import/Export {entityName}
          </DialogTitle>
          <DialogDescription>
            Exportez vos {entityName} actuels ou importez de nouveaux {entityName} depuis un fichier Excel.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 overflow-y-auto flex-1 pr-2">
          {/* Template Download Section */}
          <div className="border rounded-lg p-4 bg-green-50 border-green-200">
            <h3 className="text-lg font-medium mb-2 flex items-center gap-2 text-green-800">
              <FileSpreadsheet className="h-4 w-4" />
              Télécharger le template
            </h3>
            <p className="text-sm text-green-700 mb-4">
              Téléchargez le template Excel avec des exemples pour vous guider dans la création de votre fichier d'import.
            </p>
            <Button 
              onClick={handleDownloadTemplate}
              variant="outline"
              className="w-full border-green-600 text-green-600 hover:bg-green-100"
            >
              Télécharger le template avec exemples
            </Button>
          </div>

          {/* Export Section */}
          <div className="border rounded-lg p-4">
            <h3 className="text-lg font-medium mb-2 flex items-center gap-2">
              <Download className="h-4 w-4" />
              Exporter les {entityName}
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Téléchargez tous vos {entityName} dans un fichier Excel.
            </p>
            <Button 
              onClick={handleExport} 
              disabled={isExporting}
              className="w-full"
            >
              {isExporting ? 'Export en cours...' : `Exporter les ${entityName}`}
            </Button>
          </div>

          {/* Import Section */}
          <div className="border rounded-lg p-4">
            <h3 className="text-lg font-medium mb-2 flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Importer des {entityName}
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Importez des {entityName} depuis un fichier Excel. Le fichier doit utiliser le même format que l'export.
            </p>
            
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleImport}
              className="hidden"
            />
            
            <Button 
              onClick={openFileDialog}
              disabled={isImporting}
              variant="outline"
              className="w-full"
            >
              {isImporting ? 'Import en cours...' : 'Sélectionner un fichier Excel'}
            </Button>

            {/* Import Results */}
            {importResults && (
              <div className="mt-4 space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-green-600 font-medium">
                    {importResults.success} {entityName} importés avec succès
                  </span>
                </div>
                
                {importResults.failed > 0 && (
                  <div className="flex items-center gap-2 text-sm">
                    <AlertCircle className="h-4 w-4 text-red-600" />
                    <span className="text-red-600 font-medium">
                      {importResults.failed} {entityName} ont échoué
                    </span>
                  </div>
                )}

                {importResults.errors.length > 0 && (
                  <div className="mt-3">
                    <h4 className="text-sm font-medium text-red-600 mb-2">Erreurs détaillées:</h4>
                    <div className="bg-red-50 border border-red-200 rounded p-3 max-h-32 overflow-y-auto">
                      {importResults.errors.map((error: string, index: number) => (
                        <div key={index} className="text-xs text-red-700 mb-1">
                          {error}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-800 mb-2">Instructions importantes:</h4>
            <ul className="text-xs text-blue-700 space-y-1">
              <li>• <strong>Commencez par télécharger le template</strong> qui contient des exemples et instructions détaillées</li>
              <li>• Vous pouvez aussi utiliser l'export pour obtenir le format avec vos données existantes</li>
              <li>• Les fichiers ne sont pas inclus dans l'import/export</li>
              
              {type === 'patients' && (
                <>
                  <li>• Les médecins et techniciens doivent déjà exister dans la base de données</li>
                  <li>• Format téléphone: +216XXXXXXXX ou XXXXXXXX (8 chiffres)</li>
                  <li>• Format CIN: 8 chiffres</li>
                  <li>• Format date: JJ/MM/AAAA ou AAAA-MM-JJ</li>
                </>
              )}
              
              {type === 'companies' && (
                <>
                  <li>• Les noms de société doivent être uniques</li>
                  <li>• Format téléphone: +216XXXXXXXX ou XXXXXXXX (8 chiffres)</li>
                </>
              )}
              
              {type === 'products' && (
                <>
                  <li>• Types autorisés: ACCESSORY (Accessoire) ou SPARE_PART (Pièce détachée)</li>
                  <li>• Les numéros de série doivent être uniques s'ils sont fournis</li>
                  <li>• Format prix: utiliser des décimales (ex: 123.45)</li>
                  <li>• Format date: JJ/MM/AAAA ou AAAA-MM-JJ</li>
                </>
              )}
              
              {type === 'medical-devices' && (
                <>
                  <li>• Types d'appareils: CPAP, VNI, CONCENTRATEUR_OXYGENE, MASQUE, AUTRE</li>
                  <li>• Les numéros de série doivent être uniques s'ils sont fournis</li>
                  <li>• Format prix: utiliser des décimales (ex: 2500.00)</li>
                  <li>• Nécessite maintenance: true/false, oui/non, 1/0</li>
                  <li>• Format date: JJ/MM/AAAA ou AAAA-MM-JJ</li>
                </>
              )}
            </ul>
          </div>
        </div>

        <div className="flex justify-end flex-shrink-0 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Fermer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}