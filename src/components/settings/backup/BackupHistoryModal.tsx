import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Trash2, CheckCircle2, Download } from "lucide-react";
import { BackupItem } from "../types/backup";
import { formatFileSize } from "@/lib/utils";

interface BackupHistoryModalProps {
  open: boolean;
  onClose: () => void;
  backups: BackupItem[];
  isLoading: boolean;
  onRestore: (backup: BackupItem) => Promise<void>;
}

export function BackupHistoryModal({
  open,
  onClose,
  backups,
  isLoading,
  onRestore
}: BackupHistoryModalProps) {
  const [selectedBackup, setSelectedBackup] = useState<BackupItem | null>(null);
  
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Historique des sauvegardes</DialogTitle>
          <DialogDescription>
            Historique des sauvegardes créées. Note: Les fichiers de sauvegarde ne sont pas stockés sur le serveur.
          </DialogDescription>
        </DialogHeader>
        
        <div className="mt-4">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2">Nom</th>
                <th className="text-left p-2">Date de création</th>
                <th className="text-left p-2">Taille</th>
                <th className="text-left p-2">Format</th>
                <th className="text-left p-2">Description</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="p-4 text-center">
                    <div className="flex justify-center items-center">
                      <Loader2 className="h-6 w-6 animate-spin" />
                      <span className="ml-2">Chargement des sauvegardes...</span>
                    </div>
                  </td>
                </tr>
              ) : backups && backups.length > 0 ? (
                backups.map((backup: BackupItem) => {
                  const createdDate = new Date(backup.createdAt).toLocaleString();
                  
                  return (
                    <tr 
                      key={backup.id} 
                      className={`border-b hover:bg-gray-50 cursor-pointer ${
                        selectedBackup?.id === backup.id ? "bg-blue-50" : ""
                      }`}
                      onClick={() => setSelectedBackup(backup)}
                    >
                      <td className="p-2">{backup.fileName}</td>
                      <td className="p-2">{createdDate}</td>
                      <td className="p-2">{typeof backup.fileSize === 'number' ? formatFileSize(backup.fileSize) : 'Taille inconnue'}</td>
                      <td className="p-2 uppercase">{backup.format || "JSON"}</td>
                      <td className="p-2 text-sm text-gray-600">{(backup as any).description || 'Aucune description'}</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="p-4 text-center">
                    Aucune sauvegarde créée. Les sauvegardes sont téléchargées directement et ne sont pas stockées sur le serveur.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        <DialogFooter className="mt-4">
          <Button 
            onClick={() => onClose()} 
            variant="outline"
          >
            Annuler
          </Button>
          <Button 
            onClick={() => selectedBackup && onRestore(selectedBackup)}
            disabled={!selectedBackup}
            variant="destructive"
          >
            Créer une nouvelle sauvegarde
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
