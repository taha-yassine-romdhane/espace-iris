import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { RefreshCw } from "lucide-react";
import { BackupItem } from "../types/backup";

interface RestoreControlsProps {
  isRestoring: boolean;
  restoreProgress: number;
  selectedBackup: BackupItem | null;
  onOpenHistoryModal: () => void;
}

export function RestoreControls({
  isRestoring,
  restoreProgress,
  selectedBackup,
  onOpenHistoryModal,
}: RestoreControlsProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Restore Database</h3>
          <p className="text-sm text-muted-foreground">
            Restore your database from a previous backup
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            onClick={onOpenHistoryModal}
            disabled={isRestoring}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Restore from History
          </Button>
        </div>
      </div>

      {isRestoring && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>
              Restoring from backup: {selectedBackup?.fileName || "Selected backup"}
            </span>
            <span>{restoreProgress}%</span>
          </div>
          <Progress value={restoreProgress} className="h-2" />
        </div>
      )}
    </div>
  );
}
