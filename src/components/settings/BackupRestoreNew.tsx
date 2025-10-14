import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/components/ui/use-toast";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";

// Import child components
import { BackupHistoryModal } from "./backup/BackupHistoryModal";
import { ExportControls, BackupFormat } from "./backup/ExportControls";
import { ImportControls } from "./backup/ImportControls";
import { WarningAlert } from "./backup/WarningAlert";
import { RestoreControls } from "./backup/RestoreControls";

// Import types
import { BackupItem } from "./types/backup";
import { UseQueryResult } from "@tanstack/react-query";

export function BackupRestore() {
  // State management
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [importProgress, setImportProgress] = useState(0);
  const [restoreProgress, setRestoreProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState<BackupItem | null>(null);
  
  // Get current user session
  const { data: session } = useSession();

  // Fetch backups from API
  const {
    data: backups,
    isLoading,
    refetch: refetchBackups,
    error,
  } = useQuery<BackupItem[]>({
    queryKey: ["backups"],
    queryFn: async () => {
      const response = await fetch("/api/settings/backup");
      if (!response.ok) {
        throw new Error("Failed to fetch backups");
      }
      const data = await response.json();
      
      // Return the data as is - it should already match our BackupItem interface
      return data as BackupItem[];
    },
  }) as UseQueryResult<BackupItem[], Error>;
  
  // Handle API errors
  if (error) {
    toast({
      title: "Error fetching backups",
      description: error instanceof Error ? error.message : "Unknown error",
      variant: "destructive",
    });
  }

  // Handle backup creation (always downloads)
  const handleCreateBackup = async (format: BackupFormat = 'json') => {
    try {
      setIsExporting(true);
      setExportProgress(0);
      
      // Get current user ID from session
      const userId = session?.user?.id || 'admin';
      
      // For direct download, use a different approach
      // Create a hidden form to submit as POST and trigger download
      const form = document.createElement('form');
      form.method = 'POST';
      form.action = '/api/settings/backup';
      form.target = '_blank'; // Open in new tab/trigger download
      
      // Add hidden fields
      const addHiddenField = (name: string, value: string) => {
        const field = document.createElement('input');
        field.type = 'hidden';
        field.name = name;
        field.value = value;
        form.appendChild(field);
      };
      
      addHiddenField('userId', userId);
      addHiddenField('format', format);
      addHiddenField('description', `${format.toUpperCase()} backup created on ${new Date().toLocaleString()}`);
      
      // Submit the form
      document.body.appendChild(form);
      form.submit();
      document.body.removeChild(form);
      
      // Simulate progress for better UX
      const interval = setInterval(() => {
        setExportProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval);
            return 100;
          }
          return prev + 10;
        });
      }, 300);
      
      // Reset after a delay
      setTimeout(() => {
        setIsExporting(false);
        setExportProgress(0);
        refetchBackups();
        
        toast({
          title: "Backup créé avec succès",
          description: `Le backup ${format.toUpperCase()} a été créé et téléchargé.`,
        });
      }, 3000);
      
    } catch (error) {
      setIsExporting(false);
      setExportProgress(0);
      
      toast({
        title: "Error creating backup",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  // Handle file selection for import
  const handleFileSelect = (file: File | null) => {
    setSelectedFile(file);
  };

  // Handle backup restore from file
  const handleRestoreFromFile = async () => {
    if (!selectedFile) return;
    
    try {
      setIsImporting(true);
      setImportProgress(0);
      
      const formData = new FormData();
      formData.append("file", selectedFile);
      
      // Simulate progress
      const interval = setInterval(() => {
        setImportProgress((prev) => {
          if (prev >= 90) {
            clearInterval(interval);
            return prev;
          }
          return prev + 10;
        });
      }, 300);
      
      // Call the actual restore API endpoint
      const response = await fetch("/api/settings/backup/restore-file", {
        method: "POST",
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to restore from file");
      }
      
      const result = await response.json();
      
      // Complete progress
      clearInterval(interval);
      setImportProgress(100);
      
      setTimeout(() => {
        setIsImporting(false);
        setImportProgress(0);
        setSelectedFile(null);
        refetchBackups();
        
        toast({
          title: "Restore completed",
          description: result.message || "Database has been restored from the uploaded file.",
        });
      }, 500);
    } catch (error) {
      setIsImporting(false);
      setImportProgress(0);
      
      toast({
        title: "Error restoring from file",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  // Handle backup restore from history
  const handleRestoreDatabase = async (backup: BackupItem) => {
    if (!backup || !backup.id) return;
    
    try {
      setIsRestoring(true);
      setRestoreProgress(0);
      setSelectedBackup(backup);
      
      // Simulate progress
      const interval = setInterval(() => {
        setRestoreProgress((prev) => {
          if (prev >= 90) {
            clearInterval(interval);
            return prev;
          }
          return prev + 10;
        });
      }, 300);
      
      // Determine if this is a JSON backup
      const isJsonBackup = backup.format === "json" || backup.fileName.endsWith(".json");
      
      // Call the appropriate restore endpoint
      const endpoint = isJsonBackup
        ? `/api/settings/backup/restore-json/${backup.id}`
        : `/api/settings/backup/restore/${backup.id}`;
      
      const response = await fetch(endpoint, {
        method: "POST",
      });
      
      if (!response.ok) {
        throw new Error(`Failed to restore backup: ${response.statusText}`);
      }
      
      // Complete progress
      clearInterval(interval);
      setRestoreProgress(100);
      
      setTimeout(() => {
        setIsRestoring(false);
        setRestoreProgress(0);
        setSelectedBackup(null);
        setHistoryModalOpen(false);
        
        toast({
          title: "Restore completed",
          description: `Database has been restored from backup: ${backup.fileName}`,
        });
      }, 500);
    } catch (error) {
      setIsRestoring(false);
      setRestoreProgress(0);
      
      toast({
        title: "Error restoring backup",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  };


  return (
    <Card>
      <CardHeader>
        <CardTitle>Backup & Restore</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Warning Alert */}
        <WarningAlert />
        
        {/* Export Controls */}
        <ExportControls 
          isExporting={isExporting}
          exportProgress={exportProgress}
          onCreateBackup={handleCreateBackup}
        />
        
        {/* Import Controls */}
        <ImportControls 
          selectedFile={selectedFile}
          isImporting={isImporting}
          importProgress={importProgress}
          isRestoring={isRestoring}
          restoreProgress={restoreProgress}
          historyModalOpen={historyModalOpen}
          onFileSelect={handleFileSelect}
          onRestoreFromFile={handleRestoreFromFile}
          onOpenHistoryModal={() => setHistoryModalOpen(true)}
        />
        
        {/* Restore Controls */}
        <RestoreControls
          isRestoring={isRestoring}
          restoreProgress={restoreProgress}
          selectedBackup={selectedBackup}
          onOpenHistoryModal={() => setHistoryModalOpen(true)}
        />
        
        {/* Backup History Modal */}
        <BackupHistoryModal 
          open={historyModalOpen}
          onClose={() => setHistoryModalOpen(false)}
          backups={(backups || []) as BackupItem[]}
          isLoading={isLoading}
          onRestore={handleRestoreDatabase}
        />
      </CardContent>
    </Card>
  );
}
