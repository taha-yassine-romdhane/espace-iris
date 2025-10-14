export interface BackupItem {
  id: string;
  fileName: string;
  path: string;
  fileSize: number;
  createdAt: string;
  restoredAt?: string;
  source?: string;
  format?: "sql" | "json";
}
