import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, RefreshCw } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ImportControlsProps {
  selectedFile: File | null;
  isImporting: boolean;
  importProgress: number;
  isRestoring: boolean;
  restoreProgress: number;
  historyModalOpen: boolean;
  onFileSelect: (file: File | null) => void;
  onRestoreFromFile: () => Promise<void>;
  onOpenHistoryModal: () => void;
}

export function ImportControls({ 
  selectedFile,
  isImporting, 
  importProgress,
  isRestoring,
  restoreProgress,
  historyModalOpen,
  onFileSelect,
  onRestoreFromFile,
  onOpenHistoryModal
}: ImportControlsProps) {
  return (
    <Card className="mt-6">
      <CardContent className="pt-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-medium">Restaurer depuis l&apos;historique</h3>
            <p className="text-sm text-gray-500">
              Restaurez la base de données à partir d&apos;une sauvegarde précédente.
            </p>
          </div>
          
          <div className="flex flex-col gap-2">
            <Button
              variant="outline"
              onClick={onOpenHistoryModal}
              className="w-full md:w-auto"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Voir l&apos;historique des sauvegardes
            </Button>
          </div>
        </div>
        
        <div className="border-t mt-6 pt-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-medium">Importer une sauvegarde</h3>
              <p className="text-sm text-gray-500">
                Importez un fichier de sauvegarde depuis votre ordinateur.
              </p>
            </div>
            
            <div className="flex flex-col gap-4 w-full md:w-auto">
              <div className="grid w-full max-w-sm items-center gap-1.5">
                <Label htmlFor="import-file">Fichier de sauvegarde</Label>
                <Input 
                  id="import-file" 
                  type="file" 
                  accept=".sql,.dump,.json" 
                  onChange={(e) => onFileSelect(e.target.files?.[0] || null)}
                  disabled={isImporting}
                />
                <p className="text-xs text-gray-500">
                  Formats acceptés: .sql, .dump, .json
                </p>
              </div>
              
              <Button
                onClick={onRestoreFromFile}
                disabled={!selectedFile || isImporting}
                className="w-full md:w-auto"
              >
                <Upload className="mr-2 h-4 w-4" />
                Importer et restaurer
              </Button>
              
              {isImporting && (
                <div className="w-full">
                  <Progress value={importProgress} className="h-2" />
                  <p className="text-xs text-gray-500 mt-1 text-center">{importProgress}% terminé</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
